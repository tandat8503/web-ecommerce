
from typing import Optional
from pydantic_settings import BaseSettings
import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent.parent.parent / "ai" / ".env"
load_dotenv(dotenv_path=env_path)

class Settings(BaseSettings):
    # App
    APP_ENV: str = "local"
    APP_BASE_URL: str = "http://localhost:8000"
    
    # Database
    DB_MYSQL_HOST: str = "localhost"
    DB_MYSQL_PORT: int = 3306
    DB_MYSQL_USER: str = "root"
    DB_MYSQL_PASSWORD: str = ""
    DB_MYSQL_DATABASE: str = "ecommerce_db"
    DB_POOL_MIN: int = 1
    DB_POOL_MAX: int = 10
    
    # LLM (Gemini)
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.5-flash"
    LLM_TEMPERATURE: float = 0.6
    LLM_MAX_TOKENS: int = 5000
    
    # Vector DB
    # Vector DB
    CHROMA_PRODUCT_DIR: str = str(Path(__file__).parent.parent.parent / "chroma_db_product")
    CHROMA_LEGAL_DIR: str = str(Path(__file__).parent.parent.parent / "chroma_db_legal")
    EMBEDDING_MODEL: str = "intfloat/multilingual-e5-small"
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
