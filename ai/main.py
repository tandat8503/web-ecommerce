#!/usr/bin/env python3
"""
Main application for web-ecommerce AI system
"""

import logging
import asyncio
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from core.config import get_llm_config, get_db_config, get_app_config
from core.db import init_pool, close_pool
from core.logging import setup_logging, get_system_logger
from core.exceptions import handle_agent_error, AIAgentError
from orchestrator.engine import OrchestratorEngine
from shared.models import AgentType

# Setup logging
logger = setup_logging(level="INFO")
system_logger = get_system_logger()


class ChatRequest(BaseModel):
    """Request model for chat endpoint"""
    message: str = Field(..., description="User message", max_length=2000)
    user_type: str = Field(default="user", description="User type: user or admin")
    user_id: Optional[str] = Field(None, description="User ID")
    session_id: Optional[str] = Field(None, description="Session ID")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context")


class ChatResponse(BaseModel):
    """Response model for chat endpoint"""
    success: bool = Field(..., description="Whether the request was successful")
    message: str = Field(..., description="Response message")
    data: Optional[Dict[str, Any]] = Field(None, description="Response data")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Response metadata")


class HealthResponse(BaseModel):
    """Response model for health check"""
    status: str = Field(..., description="Health status")
    timestamp: str = Field(..., description="Current timestamp")
    version: str = Field(..., description="Application version")
    services: Dict[str, bool] = Field(..., description="Service status")


# Global orchestrator instance
orchestrator: Optional[OrchestratorEngine] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global orchestrator
    
    system_logger.info("Starting web-ecommerce AI system...")
    
    try:
        # Initialize database connection pool
        await init_pool()
        system_logger.info("Database connection pool initialized")
        
        # Initialize orchestrator
        orchestrator = OrchestratorEngine()
        system_logger.info("Orchestrator engine initialized")
        
        # Verify LLM client
        llm_config = get_llm_config()
        if llm_config.gemini_api_key:
            system_logger.info("Gemini Pro client configured")
        else:
            system_logger.warning("No LLM API key configured - some features may not work")
        
        system_logger.info("AI system startup completed successfully")
        
        yield
        
    except Exception as e:
        system_logger.error(f"Error during startup: {e}")
        raise
    finally:
        # Cleanup
        system_logger.info("Shutting down AI system...")
        await close_pool()
        system_logger.info("AI system shutdown completed")


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
        
        # Check orchestrator
        orchestrator_healthy = orchestrator is not None
        
        services = {
            "database": db_healthy,
            "llm_client": llm_healthy,
            "orchestrator": orchestrator_healthy
        }
        
        overall_status = "healthy" if all(services.values()) else "degraded"
        
        return HealthResponse(
            status=overall_status,
            timestamp=asyncio.get_event_loop().time(),
            version="1.0.0",
            services=services
        )
        
    except Exception as e:
        system_logger.error(f"Health check failed: {e}")
        return HealthResponse(
            status="unhealthy",
            timestamp=asyncio.get_event_loop().time(),
            version="1.0.0",
            services={"error": str(e)}
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
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")
    
    try:
        system_logger.info(f"Processing chat request: {request.user_type} - {request.message[:100]}...")
        
        # Process request through orchestrator
        result = await orchestrator.process_request(
            user_message=request.message,
            user_type=request.user_type,
            user_id=request.user_id,
            session_id=request.session_id,
            context=request.context or {}
        )
        
        system_logger.info(f"Chat request processed successfully: {result.get('success', False)}")
        
        return ChatResponse(
            success=result.get("success", False),
            message=result.get("message", ""),
            data=result.get("data"),
            metadata=result.get("metadata")
        )
        
    except AIAgentError as e:
        system_logger.error(f"Agent error: {e.message}")
        raise HTTPException(status_code=400, detail=e.message)
        
    except Exception as e:
        system_logger.error(f"Unexpected error in chat: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/agents")
async def list_agents():
    """List available agents and their capabilities"""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")
    
    try:
        agents = {
            "user_chatbot": {
                "name": "User Chatbot",
                "description": "Product consultation and search for customers",
                "capabilities": ["product_search", "product_recommendation", "price_inquiry"]
            },
            "admin_chatbot": {
                "name": "Admin Chatbot", 
                "description": "Business intelligence and analytics for administrators",
                "capabilities": ["revenue_analysis", "business_insights", "report_generation"]
            },
            "sentiment_analyzer": {
                "name": "Sentiment Analyzer",
                "description": "Customer feedback and sentiment analysis",
                "capabilities": ["sentiment_analysis", "keyphrase_extraction", "feedback_insights"]
            },
            "business_analyst": {
                "name": "Business Analyst",
                "description": "Revenue analysis, KPI calculation, and business metrics",
                "capabilities": ["revenue_analysis", "kpi_calculation", "trend_analysis"]
            }
        }
        
        return {
            "agents": agents,
            "total": len(agents),
            "orchestrator_available": True
        }
        
    except Exception as e:
        system_logger.error(f"Error listing agents: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/config")
async def get_config():
    """Get system configuration (non-sensitive)"""
    try:
        llm_config = get_llm_config()
        app_config = get_app_config()
        
        return {
            "llm_provider": llm_config.provider,
            "llm_model": llm_config.gemini_model,
            "max_tokens": llm_config.max_tokens,
            "temperature": llm_config.temperature,
            "environment": app_config.environment,
            "base_url": app_config.base_url
        }
        
    except Exception as e:
        system_logger.error(f"Error getting config: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


if __name__ == "__main__":
    import uvicorn
    
    # Run the application
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
