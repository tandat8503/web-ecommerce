#!/usr/bin/env python3
"""
Configuration for AI Service
Primarily uses Google Gemini API
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)


class DBConfig:
    """Database configuration"""
    def __init__(self):
        self.host = os.getenv("DB_MYSQL_HOST", "localhost")
        self.port = int(os.getenv("DB_MYSQL_PORT", "3306"))
        self.user = os.getenv("DB_MYSQL_USER", "root")
        self.password = os.getenv("DB_MYSQL_PASSWORD", "")
        self.database = os.getenv("DB_MYSQL_DATABASE", "ecommerce_db")
        self.minsize = int(os.getenv("DB_POOL_MIN", "1"))
        self.maxsize = int(os.getenv("DB_POOL_MAX", "10"))


class LLMConfig:
    """LLM configuration - Gemini API"""
    def __init__(self):
        # Gemini settings (primary)
        self.gemini_api_key = os.getenv("GEMINI_API_KEY", "")
        self.gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp")
        
        # General LLM settings
        self.max_tokens = int(os.getenv("LLM_MAX_TOKENS", "2000"))  # Increased for detailed responses
        self.temperature = float(os.getenv("LLM_TEMPERATURE", "0.6"))
        
        # Legacy OpenAI (backup)
        self.api_key = os.getenv("OPENAI_API_KEY", "")
        self.model = os.getenv("LLM_MODEL", "gpt-3.5-turbo")
        self.provider = os.getenv("LLM_PROVIDER", "gemini")


class AppConfig:
    """Application configuration"""
    def __init__(self):
        self.environment = os.getenv("APP_ENV", "local")
        self.base_url = os.getenv("APP_BASE_URL", "http://localhost:8000")
        self.admin_api_key = os.getenv("ADMIN_API_KEY", "")
        self.chroma_dir = os.getenv("CHROMA_DIR", "./chroma_db")
        self.embedding_model = os.getenv("EMBEDDING_MODEL", "intfloat/multilingual-e5-small")


# Global config instances
db_config = DBConfig()
llm_config = LLMConfig()
app_config = AppConfig()


# Getter functions (for consistency)
def get_db_config() -> DBConfig:
    """Get database config"""
    return db_config


def get_llm_config() -> LLMConfig:
    """Get LLM config (Gemini)"""
    return llm_config


def get_app_config() -> AppConfig:
    """Get app config"""
    return app_config
