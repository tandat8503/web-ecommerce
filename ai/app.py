#!/usr/bin/env python3
"""
Main Application for Web-ecommerce AI System
Simple structure following ai-native-todo-task-agent
"""

import sys
import os
from pathlib import Path

# Add parent directory to path to allow imports
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    # Load .env file from the ai directory
    env_path = current_dir / ".env"
    if env_path.exists():
        load_dotenv(env_path)
        print(f"✅ Loaded .env file from: {env_path}")
    else:
        # Try loading from current directory
        load_dotenv()
        print("✅ Loaded .env file from current directory")
except ImportError:
    print("⚠️  python-dotenv not installed, skipping .env file loading")
except Exception as e:
    print(f"⚠️  Error loading .env file: {e}")

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional, Union

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse, HTMLResponse
from pydantic import BaseModel, Field
import uuid
import json
from datetime import datetime

from core.config import get_llm_config, get_db_config, get_app_config
from core.db import init_pool, close_pool
from core.logging import setup_logging
from agents import orchestrator

# Setup logging
logger = setup_logging(level="INFO")


class ChatRequest(BaseModel):
    """Request model for chat endpoint"""
    message: str = Field(..., description="User message", max_length=2000)
    user_type: str = Field(default="user", description="User type: user or admin")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context")
    session_id: Optional[str] = Field(None, description="Session ID for conversation history")
    user_id: Optional[int] = Field(None, description="User ID for personalization (if logged in)")


class ChatResponse(BaseModel):
    """Response model for chat endpoint"""
    success: bool = Field(..., description="Whether the request was successful")
    response: Any = Field(..., description="Response message (string or structured dict)")
    agent_type: str = Field(..., description="Agent that processed the request")
    data: Optional[Dict[str, Any]] = Field(None, description="Response data")
    session_id: Optional[str] = Field(None, description="Session ID for conversation history")


class HealthResponse(BaseModel):
    """Response model for health check"""
    status: str = Field(..., description="Health status")
    timestamp: str = Field(..., description="Current timestamp")
    version: str = Field(..., description="Application version")


class ModerationRequest(BaseModel):
    """Request model for content moderation"""
    content: str = Field(..., description="Content to moderate", max_length=5000)
    content_type: str = Field(default="comment", description="Type: comment, review, chat")
    product_id: Optional[int] = Field(None, description="Associated product ID")
    user_id: Optional[int] = Field(None, description="User ID")


class ModerationResponse(BaseModel):
    """Response model for content moderation"""
    success: bool = Field(..., description="Whether moderation was successful")
    is_appropriate: bool = Field(..., description="Whether content is appropriate")
    violations: list = Field(default=[], description="List of violations detected")
    severity: str = Field(..., description="Severity: low, medium, high")
    confidence: float = Field(..., description="Confidence score 0.0 to 1.0")
    suggested_action: str = Field(..., description="Suggested action: approve, review, reject")
    explanation: str = Field(..., description="Vietnamese explanation")
    moderated_content: str = Field(..., description="Original or filtered content")


class ReportGenerateRequest(BaseModel):
    """Request model for report generation"""
    report_type: str = Field(..., description="Report type: sentiment, revenue, product, customer, business")
    period: Optional[str] = Field(None, description="Time period description")
    title: Optional[str] = Field(None, description="Custom report title")
    month: Optional[int] = Field(None, description="Month for report")
    year: Optional[int] = Field(None, description="Year for report")
    start_date: Optional[str] = Field(None, description="Start date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="End date (YYYY-MM-DD)")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("Starting web-ecommerce AI system...")
    
    try:
        # Initialize database connection pool
        await init_pool()
        logger.info("Database connection pool initialized")
        
        # Verify LLM client
        llm_config = get_llm_config()
        if llm_config.gemini_api_key:
            logger.info("Gemini Pro client configured")
        else:
            logger.warning("No LLM API key configured - some features may not work")
        
        logger.info("AI system startup completed successfully")
        
        yield
        
    except Exception as e:
        logger.error(f"Error during startup: {e}")
        raise
    finally:
        # Cleanup
        logger.info("Shutting down AI system...")
        await close_pool()
        logger.info("AI system shutdown completed")


# Create FastAPI app
app = FastAPI(
    title="Web-ecommerce AI System",
    description="AI-powered e-commerce system with Gemini Pro integration",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    try:
        # Check database connection
        db_config = get_db_config()
        db_healthy = True  # Simplified check
        
        # Check LLM client
        llm_config = get_llm_config()
        llm_healthy = bool(llm_config.gemini_api_key)
        
        overall_status = "healthy" if (db_healthy and llm_healthy) else "degraded"
        
        return HealthResponse(
            status=overall_status,
            timestamp=str(asyncio.get_event_loop().time()),
            version="1.0.0"
        )
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return HealthResponse(
            status="unhealthy",
            timestamp=str(asyncio.get_event_loop().time()),
            version="1.0.0"
        )


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main chat endpoint for user and admin interactions
    
    Args:
        request: Chat request with message and context
        
    Returns:
        Chat response with AI-generated content
    """
    try:
        logger.info(f"Processing chat request: {request.user_type} - {request.message[:100]}...")
        
        # Prepare context with session_id and user_id
        context = request.context or {}
        if request.session_id:
            context["session_id"] = request.session_id
        elif not context.get("session_id"):
            # Generate default session_id if not provided
            import uuid
            context["session_id"] = str(uuid.uuid4())
        
        # Add user_id for personalization
        if request.user_id:
            context["user_id"] = request.user_id
        
        # TÁCH LUỒNG XỬ LÝ: User dùng Improved Service (với Conversation Memory), Admin dùng Orchestrator cũ
        if request.user_type == "user":
            # ✅ Dùng Improved Service (với Intent Detection + Conversation Memory) cho Khách hàng
            from services.chatbot.improved_user_chatbot import improved_user_chatbot_service
            
            result = await improved_user_chatbot_service.process_message(
                user_message=request.message,
                context=context
            )
            
            if result.get("success"):
                response_data = result.get("response", {})
                
                # Handle both old string format and new structured format
                if isinstance(response_data, str):
                    response_data = {"text": response_data, "type": "text"}
                
                # Handle data field: if it's a list, wrap it in a dict
                data_value = response_data.get("data")
                if isinstance(data_value, list):
                    data_value = {"products": data_value}
                
                return ChatResponse(
                    success=True,
                    response=response_data,  # Structured response with text, type, data
                    agent_type=result.get("agent_type", "user_chatbot_improved"),
                    data=data_value,  # Product cards data (wrapped in dict if list)
                    session_id=context.get("session_id")
                )
            else:
                # Xử lý lỗi
                error_response = result.get("response", {})
                if isinstance(error_response, str):
                    error_response = {"text": error_response, "type": "text"}
                
                return ChatResponse(
                    success=False,
                    response=error_response,
                    agent_type="error",
                    data={"error": result.get("error")},
                    session_id=context.get("session_id")
                )
        else:
            # Admin vẫn dùng Orchestrator cũ (vì cần nhiều tool phức tạp như RAG, Report)
            result = await orchestrator.process_request(
                user_message=request.message,
                user_type=request.user_type,
                context=context
            )
            
            if result.get("success"):
                agent_result = result.get("result", {})
                response_data = agent_result.get("response", {})
                
                # Handle both old string format and new structured format
                if isinstance(response_data, str):
                    response_data = {"text": response_data, "type": "text"}
                
                return ChatResponse(
                    success=True,
                    response=response_data,  # Now returns structured response
                    agent_type=agent_result.get("agent_type", "unknown"),
                    data=agent_result.get("tool_result"),
                    session_id=context.get("session_id")
                )
            else:
                return ChatResponse(
                    success=False,
                    response=result.get("response", "I apologize, but I encountered an error."),
                    agent_type="error",
                    data={"error": result.get("error")},
                    session_id=context.get("session_id")
                )
        
    except Exception as e:
        logger.error(f"Unexpected error in chat: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/moderate", response_model=ModerationResponse)
async def moderate_content_endpoint(request: ModerationRequest):
    try:
        logger.info(f"Moderating {request.content_type} content (length: {len(request.content)})")
        
        # Use ContentModerationAgent
        from agents import ContentModerationAgent
        agent = ContentModerationAgent()
        
        # Process moderation
        result = await agent.process_request(
            user_message="",  # Not used for moderation
            context={
                "content": request.content,
                "content_type": request.content_type,
                "product_id": request.product_id,
                "user_id": request.user_id
            }
        )
        
        if result.get("success"):
            tool_result = result.get("tool_result", {})
            
            return ModerationResponse(
                success=True,
                is_appropriate=tool_result.get("is_appropriate", True),
                violations=tool_result.get("violations", []),
                severity=tool_result.get("severity", "low"),
                confidence=tool_result.get("confidence", 0.0),
                suggested_action=tool_result.get("suggested_action", "approve"),
                explanation=tool_result.get("explanation", ""),
                moderated_content=tool_result.get("moderated_content", request.content)
            )
        else:
            return ModerationResponse(
                success=False,
                is_appropriate=True,  # Default to allow on error
                violations=[],
                severity="low",
                confidence=0.0,
                suggested_action="review",
                explanation=f"Lỗi kiểm duyệt: {result.get('error', 'Unknown error')}",
                moderated_content=request.content
            )
        
    except Exception as e:
        logger.error(f"Unexpected error in moderation: {e}")
        return ModerationResponse(
            success=False,
            is_appropriate=True,
            violations=[],
            severity="low",
            confidence=0.0,
            suggested_action="review",
            explanation=f"Lỗi hệ thống: {str(e)}",
            moderated_content=request.content
        )


@app.get("/agents")
async def list_agents():
    try:
        agents = {
            "user_chatbot": {
                "name": "User Chatbot",
                "description": "Product consultation and search for customers",
                "capabilities": ["product_search", "price_inquiry", "product_comparison"]
            },
            "admin_chatbot": {
                "name": "Admin Chatbot", 
                "description": "Business intelligence and analytics for administrators",
                "capabilities": ["revenue_analysis", "sentiment_analysis", "report_generation"]
            },
            "sentiment_analyzer": {
                "name": "Sentiment Analyzer",
                "description": "Customer feedback and sentiment analysis",
                "capabilities": ["sentiment_analysis", "sentiment_summary", "feedback_insights"]
            },
            "business_analyst": {
                "name": "Business Analyst",
                "description": "Revenue analysis, KPI calculation, and business metrics",
                "capabilities": ["revenue_analysis", "sales_performance", "product_metrics"]
            },
            "content_moderation": {
                "name": "Content Moderation",
                "description": "AI-powered content moderation for comments and reviews",
                "capabilities": ["profanity_detection", "spam_detection", "harassment_detection"]
            }
        }
        
        return {
            "agents": agents,
            "total": len(agents),
            "orchestrator_available": True
        }
        
    except Exception as e:
        logger.error(f"Error listing agents: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/tools")
async def list_tools():
    """List available MCP tools"""
    try:
        tools = {
            "search_products": {
                "description": "Search for products in the e-commerce database",
                "parameters": ["query", "limit", "min_price", "max_price", "category"]
            },
            "analyze_sentiment": {
                "description": "Analyze sentiment of customer feedback texts",
                "parameters": ["texts", "product_id"]
            },
            "summarize_sentiment_by_product": {
                "description": "Summarize sentiment analysis by product",
                "parameters": ["product_id"]
            },
            "get_revenue_analytics": {
                "description": "Get revenue analytics for specified period",
                "parameters": ["month", "year", "start_date", "end_date"]
            },
            "get_sales_performance": {
                "description": "Get sales performance metrics",
                "parameters": ["days"]
            },
            "get_product_metrics": {
                "description": "Get product performance metrics",
                "parameters": ["limit"]
            },
            "generate_report": {
                "description": "Generate comprehensive business report",
                "parameters": ["report_type", "month", "year", "include_sentiment", "include_revenue"]
            }
        }
        
        return {
            "tools": tools,
            "total": len(tools)
        }
        
    except Exception as e:
        logger.error(f"Error listing tools: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/ai/reports/generate")
async def generate_report_stream(request: ReportGenerateRequest):
    """
    Generate report với detailed progress tracking qua SSE
    """
    from asyncio import Queue
    from services.report.service import ReportGeneratorService
    from services.report.progress_tracker import ReportProgressTracker
    from services.report.storage import report_storage
    from agents import ReportGeneratorAgent
    
    # Queue để collect progress events
    progress_queue = Queue()
    
    async def generate_and_stream():
        report_id = str(uuid.uuid4())
        progress_tracker = ReportProgressTracker(session_id=report_id)
        
        # Progress callback để queue events
        async def progress_callback(event: Dict[str, Any]):
            await progress_queue.put(event)
        
        progress_tracker.set_callback(progress_callback)
        
        # Start generation task
        async def generate_task():
            try:
                # Fetch data based on report_type
                agent = ReportGeneratorAgent()
                context = {
                    "report_type": request.report_type,
                    "month": request.month,
                    "year": request.year,
                    "start_date": request.start_date,
                    "end_date": request.end_date
                }
                data_result = await agent._fetch_report_data(
                    report_type=request.report_type,
                    context=context
                )
                
                if not data_result.get("success"):
                    error_event = {
                        "step": 0,
                        "step_name": "ERROR",
                        "message": f"Lỗi thu thập dữ liệu: {data_result.get('error', 'Unknown error')}",
                        "percentage": 0,
                        "details": {},
                        "timestamp": datetime.now().isoformat()
                    }
                    await progress_queue.put(error_event)
                    await progress_queue.put(None)  # Signal end
                    return
                
                # Generate report với progress tracking
                report_service = ReportGeneratorService()
                report_result = await report_service.generate_html_report(
                    report_type=request.report_type,
                    data=data_result.get("data", {}),
                    title=request.title,
                    period=request.period,
                    progress_tracker=progress_tracker
                )
                
                if not report_result.get("success"):
                    error_event = {
                        "step": 0,
                        "step_name": "ERROR",
                        "message": f"Lỗi tạo báo cáo: {report_result.get('error', 'Unknown error')}",
                        "percentage": 0,
                        "details": {},
                        "timestamp": datetime.now().isoformat()
                    }
                    await progress_queue.put(error_event)
                    await progress_queue.put(None)  # Signal end
                    return
                
                # Save report
                saved_info = await report_storage.save_report(
                    report_id=report_id,
                    html_content=report_result["html"],
                    metadata={
                        "report_type": request.report_type,
                        "period": request.period,
                        "title": report_result.get("title"),
                        "processing_time": report_result.get("processing_time", 0)
                    }
                )
                
                # Emit completion
                await progress_tracker.step_completed(
                    report_id=report_id,
                    report_url=saved_info["report_url"],
                    file_size=saved_info["file_size"],
                    total_time=report_result.get("processing_time", 0)
                )
                
                await progress_queue.put(None)  # Signal end
                
            except Exception as e:
                logger.error(f"Error generating report: {e}")
                error_event = {
                    "step": 0,
                    "step_name": "ERROR",
                    "message": f"Lỗi hệ thống: {str(e)}",
                    "percentage": 0,
                    "details": {},
                    "timestamp": datetime.now().isoformat()
                }
                await progress_queue.put(error_event)
                await progress_queue.put(None)  # Signal end
        
        # Start generation
        asyncio.create_task(generate_task())
        
        # Stream events from queue
        while True:
            event = await progress_queue.get()
            if event is None:
                break
            
            event_json = json.dumps(event, ensure_ascii=False)
            yield f"data: {event_json}\n\n"
    
    return StreamingResponse(
        generate_and_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@app.get("/api/ai/reports/{report_id}")
async def get_report(report_id: str):
    """Get report HTML by ID"""
    from services.report.storage import report_storage
    
    report = await report_storage.get_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=report["html"])


@app.get("/api/ai/reports/{report_id}/download")
async def download_report(report_id: str):
    """Download report as HTML file"""
    from services.report.storage import report_storage
    from pathlib import Path
    
    report = await report_storage.get_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    metadata = report["metadata"]
    html_file = Path(metadata["html_file"])
    
    if not html_file.exists():
        raise HTTPException(status_code=404, detail="Report file not found")
    
    return FileResponse(
        path=str(html_file),
        filename=f"report_{report_id}.html",
        media_type="text/html"
    )


@app.get("/api/ai/reports")
async def list_reports(report_type: Optional[str] = None, limit: int = 50):
    """List all reports"""
    from services.report.storage import report_storage
    
    reports = await report_storage.list_reports(report_type=report_type, limit=limit)
    return {"reports": reports, "total": len(reports)}


# =============================================================================
# LEGAL ASSISTANT ENDPOINTS
# =============================================================================

class LegalChatRequest(BaseModel):
    """Request model for legal consultation"""
    query: str = Field(..., description="Legal question or tax calculation query", max_length=2000)
    region: int = Field(default=1, description="Region code (1-4) for minimum wage calculation", ge=1, le=4)


class LegalChatResponse(BaseModel):
    """Response model for legal consultation"""
    success: bool = Field(..., description="Whether the request was successful")
    response: str = Field(..., description="Legal consultation answer or tax calculation result")
    query_type: str = Field(..., description="Type of query: legal or tax")


# Initialize Legal Assistant (lazy loading)
_legal_assistant = None

def get_legal_assistant():
    """Get or create Legal Assistant instance"""
    global _legal_assistant
    if _legal_assistant is None:
        try:
            from services.legal.legal_service import LegalAssistant
            _legal_assistant = LegalAssistant()
            logger.info("✅ Legal Assistant initialized")
        except Exception as e:
            logger.error(f"❌ Error initializing Legal Assistant: {e}", exc_info=True)
            raise
    return _legal_assistant


@app.post("/api/legal/chat", response_model=LegalChatResponse)
async def legal_chat(request: LegalChatRequest):
    """
    Legal consultation endpoint - Handles both legal queries and tax calculations
    
    This endpoint intelligently determines if the query is:
    - A tax calculation (e.g., "Lương 50 triệu đóng thuế bao nhiêu?")
    - A legal document query (e.g., "Điều kiện thành lập công ty là gì?")
    
    Args:
        request: Legal chat request with query and optional region
    
    Returns:
        Legal consultation response
    """
    try:
        logger.info(f"Processing legal query: {request.query[:100]}...")
        
        legal_assistant = get_legal_assistant()
        
        # Process query (automatically detects tax vs legal)
        response_text = await legal_assistant.process_query(
            query=request.query,
            region=request.region
        )
        
        # Determine query type
        query_lower = request.query.lower()
        tax_keywords = ["tính thuế", "đóng thuế", "thuế tncn", "lương gross", "lương net"]
        query_type = "tax" if any(keyword in query_lower for keyword in tax_keywords) else "legal"
        
        return LegalChatResponse(
            success=True,
            response=response_text,
            query_type=query_type
        )
        
    except Exception as e:
        logger.error(f"Error in legal chat: {e}", exc_info=True)
        return LegalChatResponse(
            success=False,
            response=f"Xin lỗi, đã xảy ra lỗi: {str(e)}",
            query_type="error"
        )


@app.post("/api/legal/calculate-tax")
async def calculate_tax_endpoint(request: LegalChatRequest):
    """
    Direct tax calculation endpoint
    
    Args:
        request: Request with query containing salary information
    
    Returns:
        Tax calculation result
    """
    try:
        logger.info(f"Processing tax calculation: {request.query[:100]}...")
        
        legal_assistant = get_legal_assistant()
        
        # Extract salary and dependents from query
        import re
        query_lower = request.query.lower()
        
        salary_match = re.search(r'(\d+)\s*(?:triệu|tr|million|m)', query_lower)
        dependents_match = re.search(r'(\d+)\s*(?:con|người phụ thuộc)', query_lower)
        
        if not salary_match:
            return {
                "success": False,
                "error": "Không tìm thấy mức lương trong câu hỏi. Vui lòng cung cấp rõ ràng, ví dụ: 'Lương 50 triệu đóng thuế bao nhiêu?'"
            }
        
        gross_salary = float(salary_match.group(1)) * 1_000_000
        dependents = int(dependents_match.group(1)) if dependents_match else 0
        
        # Calculate tax
        result = legal_assistant.calculate_tax(
            gross_salary=gross_salary,
            dependents=dependents,
            region=request.region
        )
        
        from services.legal.tax_calculator import format_tax_result
        formatted_result = format_tax_result(result, result_type="personal_income")
        
        return {
            "success": True,
            "result": result,
            "formatted": formatted_result
        }
        
    except Exception as e:
        logger.error(f"Error in tax calculation: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }


# =============================================================================
# BUSINESS ANALYST ENDPOINTS
# =============================================================================

class AnalystReportRequest(BaseModel):
    """Request model for business analyst report"""
    report_type: str = Field(default="daily", description="Report type: daily, monthly, weekly")
    month: Optional[int] = Field(None, description="Month for report (1-12)", ge=1, le=12)
    year: Optional[int] = Field(None, description="Year for report")
    start_date: Optional[str] = Field(None, description="Start date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="End date (YYYY-MM-DD)")


@app.get("/api/analyst/report")
async def get_business_report(
    report_type: str = "daily",
    month: Optional[int] = None,
    year: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """
    Generate business analyst report
    
    Args:
        report_type: Type of report (daily, monthly, weekly)
        month: Month for report (1-12)
        year: Year for report
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)
    
    Returns:
        Business report data
    """
    try:
        logger.info(f"Generating {report_type} report...")
        
        from services.analyst.service import AnalystService
        from agents import BusinessAnalystAgent
        
        # Use BusinessAnalystAgent to generate report
        agent = BusinessAnalystAgent()
        
        context = {
            "report_type": report_type,
            "month": month,
            "year": year,
            "start_date": start_date,
            "end_date": end_date
        }
        
        # Process request through agent
        result = await agent.process_request(
            user_message=f"Tạo báo cáo {report_type}",
            context=context
        )
        
        if result.get("success"):
            return {
                "success": True,
                "report_type": report_type,
                "data": result.get("tool_result", {}),
                "agent_response": result.get("result", {}).get("response", "")
            }
        else:
            return {
                "success": False,
                "error": result.get("error", "Unknown error")
            }
        
    except Exception as e:
        logger.error(f"Error generating business report: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }


@app.get("/api/analyst/revenue")
async def get_revenue_analytics(
    month: Optional[int] = None,
    year: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """
    Get revenue analytics for specified period
    
    Args:
        month: Month for analysis (1-12)
        year: Year for analysis
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)
    
    Returns:
        Revenue analytics data
    """
    try:
        from agents import BusinessAnalystAgent
        
        agent = BusinessAnalystAgent()
        context = {
            "month": month,
            "year": year,
            "start_date": start_date,
            "end_date": end_date
        }
        
        result = await agent.process_request(
            user_message="Phân tích doanh thu",
            context=context
        )
        
        if result.get("success"):
            return {
                "success": True,
                "data": result.get("tool_result", {})
            }
        else:
            return {
                "success": False,
                "error": result.get("error", "Unknown error")
            }
        
    except Exception as e:
        logger.error(f"Error getting revenue analytics: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }


if __name__ == "__main__":
    import uvicorn
    
    # Get port from environment variable
    port = int(os.environ.get("AI_SERVICE_PORT", 8000))
    
    # Run the application
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )