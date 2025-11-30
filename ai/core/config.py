import os
from pydantic import BaseModel, Field, ValidationError


def _getenv_int(key: str, default: int) -> int:
    val = os.getenv(key)
    if val is None:
        return default
    try:
        return int(val)
    except ValueError:
        return default


def _getenv_float(key: str, default: float) -> float:
    val = os.getenv(key)
    if val is None:
        return default
    try:
        return float(val)
    except ValueError:
        return default


class DBConfig(BaseModel):
    host: str = Field(default_factory=lambda: os.getenv("DB_MYSQL_HOST", "localhost"))
    port: int = Field(default_factory=lambda: _getenv_int("DB_MYSQL_PORT", 3306))
    user: str = Field(default_factory=lambda: os.getenv("DB_MYSQL_USER", "root"))
    password: str = Field(default_factory=lambda: os.getenv("DB_MYSQL_PASSWORD", ""))
    database: str = Field(default_factory=lambda: os.getenv("DB_MYSQL_DATABASE", "ecommerce_db"))
    minsize: int = Field(default_factory=lambda: _getenv_int("DB_POOL_MIN", 1))
    maxsize: int = Field(default_factory=lambda: _getenv_int("DB_POOL_MAX", 10))

    @classmethod
    def from_env(cls) -> "DBConfig":
        return cls()


class LLMConfig(BaseModel):
    provider: str = Field(default_factory=lambda: os.getenv("LLM_PROVIDER", "openai"))
    model: str = Field(default_factory=lambda: os.getenv("LLM_MODEL", "gpt-3.5-turbo"))
    api_key: str = Field(default_factory=lambda: os.getenv("OPENAI_API_KEY", ""))
    gemini_api_key: str = Field(default_factory=lambda: os.getenv("GEMINI_API_KEY", ""))
    gemini_model: str = Field(default_factory=lambda: os.getenv("GEMINI_MODEL", "gemini-2.5-flash"))  # Use gemini-2.5-flash
    max_tokens: int = Field(default_factory=lambda: _getenv_int("LLM_MAX_TOKENS", 800))
    temperature: float = Field(default_factory=lambda: _getenv_float("LLM_TEMPERATURE", 0.6))
    base_url: str = Field(default_factory=lambda: os.getenv("LLM_BASE_URL", ""))  # e.g., Ollama http://localhost:11434

    @classmethod
    def from_env(cls) -> "LLMConfig":
        return cls()


class AppConfig(BaseModel):
    environment: str = Field(default_factory=lambda: os.getenv("APP_ENV", "local"))
    base_url: str = Field(default_factory=lambda: os.getenv("APP_BASE_URL", "http://localhost:8000"))
    admin_api_key: str = Field(default_factory=lambda: os.getenv("ADMIN_API_KEY", ""))
    chroma_dir: str = Field(default_factory=lambda: os.getenv("CHROMA_DIR", "./.chroma"))
    embedding_model: str = Field(default_factory=lambda: os.getenv("EMBEDDING_MODEL", "intfloat/multilingual-e5-small"))

    @classmethod
    def from_env(cls) -> "AppConfig":
        return cls()


def get_db_config() -> DBConfig:
    """Always read the latest values from environment variables."""
    try:
        return DBConfig.from_env()
    except ValidationError:
        # Fallback to safe defaults
        return DBConfig()


def get_llm_config() -> LLMConfig:
    """Always read the latest values from environment variables."""
    try:
        return LLMConfig.from_env()
    except ValidationError:
        return LLMConfig()


def get_app_config() -> AppConfig:
    """Always read the latest values from environment variables."""
    try:
        return AppConfig.from_env()
    except ValidationError:
        return AppConfig()


# Backwards-compatible singletons (evaluated at import time)
db_config = get_db_config()
llm_config = get_llm_config()
app_config = get_app_config()
