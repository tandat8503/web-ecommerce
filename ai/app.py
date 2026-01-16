#!/usr/bin/env python3
"""
Main Application - AI Service
Chỉ 2 chức năng chính:
1. Product Chatbot - Tư vấn sản phẩm
2. Legal Chatbot - Tư vấn luật và thuế
"""
import sys
import os
from pathlib import Path

# Setup paths
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Load environment
from dotenv import load_dotenv
load_dotenv(current_dir / ".env", override=True)

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from core.config import get_llm_config
from core.db import init_pool, close_pool
from core.logging import setup_logging

# Setup logging
logger = setup_logging(level="INFO")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle"""
    logger.info("🚀 Starting AI service...")
    
    # Init database
    await init_pool()
    logger.info("✅ Database ready")
    
    # Verify Gemini API
    llm_config = get_llm_config()
    if llm_config.gemini_api_key:
        logger.info("✅ Gemini API ready")
    else:
        logger.warning("⚠️  No Gemini API key")
    
    # PRELOAD ProductVectorService to avoid timeout on first request
    # Model SentenceTransformer takes ~10-15 seconds to load
    try:
        logger.info("⏳ Preloading ProductVectorService (this may take 10-15 seconds)...")
        from services.chatbot.product_vector_service import get_product_vector_service
        _vector_service = get_product_vector_service()
        if _vector_service:
            logger.info("✅ ProductVectorService preloaded successfully")
        else:
            logger.warning("⚠️  ProductVectorService not available")
    except Exception as e:
        logger.warning(f"⚠️  Failed to preload ProductVectorService: {e}")
    
    yield
    
    # Cleanup
    logger.info("🛑 Shutting down...")
    await close_pool()
    logger.info("✅ Shutdown complete")


# Create app
app = FastAPI(
    title="AI Service - Product & Legal Chatbot",
    description="2 chatbots: Product consultation & Legal assistant",
    version="2.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# MODELS
# ============================================================================

class ChatRequest(BaseModel):
    """Chat request"""
    message: str = Field(..., max_length=2000)
    user_type: str = Field(default="user")  # user or admin
    context: Optional[Dict[str, Any]] = None
    session_id: Optional[str] = None
    user_id: Optional[int] = None


class ChatResponse(BaseModel):
    """Chat response"""
    success: bool
    response: Any
    agent_type: str
    data: Optional[Dict[str, Any]] = None
    session_id: Optional[str] = None


class LegalRequest(BaseModel):
    """Legal consultation request"""
    query: str = Field(..., max_length=2000)
    region: int = Field(default=1, ge=1, le=4)


class LegalResponse(BaseModel):
    """Legal consultation response"""
    success: bool
    response: str
    query_type: str  # "legal" or "tax"


# ============================================================================
# ENDPOINTS
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check"""
    llm_config = get_llm_config()
    status = "healthy" if llm_config.gemini_api_key else "degraded"
    
    return {
        "status": status,
        "timestamp": asyncio.get_event_loop().time(),
        "version": "2.0.0",
        "services": {
            "product_chatbot": "active",
            "legal_chatbot": "active"
        }
    }


@app.post("/chat", response_model=ChatResponse)
async def product_chat(request: ChatRequest):
    """
    Product chatbot endpoint
    Uses UserChatbotService from agents.py with Hybrid Search flow
    Pattern: ai-native-todo-task-agent
    """
    try:
        logger.info(f"Product chat: {request.message[:100]}")
        
        # Prepare context
        context = request.context or {}
        if request.session_id:
            context["session_id"] = request.session_id
        elif not context.get("session_id"):
            import uuid
            context["session_id"] = str(uuid.uuid4())
        
        if request.user_id:
            context["user_id"] = request.user_id
        
        # Use UserChatbotService from agents.py (main pattern file)
        from agents import user_chatbot_service
        
        result = await user_chatbot_service.process_message(
            user_message=request.message,
            context=context
        )
        
        if result.get("success"):
            response_data = result.get("response", {})
            if isinstance(response_data, str):
                response_data = {"text": response_data, "type": "text"}
            
            data_value = response_data.get("data")
            if isinstance(data_value, list):
                data_value = {"products": data_value}
            
            return ChatResponse(
                success=True,
                response=response_data,
                agent_type=result.get("agent_type", "user_chatbot"),
                data=data_value,
                session_id=context.get("session_id")
            )
        else:
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
        
    except Exception as e:
        logger.error(f"Product chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


# Initialize Legal Assistant (lazy loading)
_legal_assistant = None

def get_legal_assistant():
    """Get Legal Assistant instance"""
    global _legal_assistant
    if _legal_assistant is None:
        try:
            from services.legal.legal_service import LegalAssistant
            _legal_assistant = LegalAssistant()
            logger.info("✅ Legal Assistant initialized")
        except Exception as e:
            logger.error(f"❌ Error initializing Legal Assistant: {e}")
            raise
    return _legal_assistant


@app.post("/api/legal/chat", response_model=LegalResponse)
async def legal_chat(request: LegalRequest):
    """
    Legal chatbot endpoint
    Tư vấn luật và tính thuế
    """
    try:
        logger.info(f"Legal chat: {request.query[:100]}")
        
        legal_assistant = get_legal_assistant()
        
        # Process query (auto-detect tax vs legal)
        response_text = await legal_assistant.process_query(
            query=request.query,
            region=request.region
        )
        
        # Determine query type
        query_lower = request.query.lower()
        tax_keywords = ["tính thuế", "đóng thuế", "thuế tncn", "lương gross", "lương net"]
        query_type = "tax" if any(kw in query_lower for kw in tax_keywords) else "legal"
        
        return LegalResponse(
            success=True,
            response=response_text,
            query_type=query_type
        )
        
    except Exception as e:
        logger.error(f"Legal chat error: {e}", exc_info=True)
        return LegalResponse(
            success=False,
            response=f"Xin lỗi, đã xảy ra lỗi: {str(e)}",
            query_type="error"
        )


# ============================================================================
# RUN
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("AI_SERVICE_PORT", "8000"))
    
    logger.info(f"🚀 Starting AI service on port {port}")
    logger.info(f"📦 Services: Product Chatbot + Legal Chatbot")
    
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )
