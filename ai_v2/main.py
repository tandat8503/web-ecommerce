
import uvicorn
from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.logger import get_logger
from app.core.db import init_db_pool, close_db_pool
from app.routers import chat
from app.services.product_vector_service import get_product_vector_service

logger = get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting AI Service v2...")
    await init_db_pool()
    
    # Preload Vector Service (optional but good for performance)
    try:
        get_product_vector_service()
        logger.info("Vector Service preloaded")
    except Exception as e:
        logger.warning(f"Vector Service preload failed: {e}")
        
    yield
    
    # Shutdown
    logger.info("Shutting down...")
    await close_db_pool()

app = FastAPI(title="E-commerce AI Service v2", lifespan=lifespan)

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api/v2")

@app.get("/health")
def health_check():
    return {"status": "ok", "version": "2.0.0"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
