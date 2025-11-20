#!/usr/bin/env python3
"""
Main Application for Web-ecommerce AI System
Simple structure following ai-native-todo-task-agent
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional

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


class ChatResponse(BaseModel):
    """Response model for chat endpoint"""
    success: bool = Field(..., description="Whether the request was successful")
    response: str = Field(..., description="Response message")
    agent_type: str = Field(..., description="Agent that processed the request")
    data: Optional[Dict[str, Any]] = Field(None, description="Response data")


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
        
        # Process request through orchestrator
        result = await orchestrator.process_request(
            user_message=request.message,
            user_type=request.user_type,
            context=request.context or {}
        )
        
        if result.get("success"):
            agent_result = result.get("result", {})
            return ChatResponse(
                success=True,
                response=agent_result.get("response", "I apologize, but I couldn't process your request."),
                agent_type=agent_result.get("agent_type", "unknown"),
                data=agent_result.get("tool_result")
            )
        else:
            return ChatResponse(
                success=False,
                response=result.get("response", "I apologize, but I encountered an error."),
                agent_type="error",
                data={"error": result.get("error")}
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


if __name__ == "__main__":
    import uvicorn
    
    # Run the application
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )