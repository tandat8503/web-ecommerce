# Production Configuration
"""
Production configuration for AI System
Loads configuration from environment variables
"""

import os
from pathlib import Path

# Load environment variables from .env file if exists
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv not installed, use system env vars

# Base directory
BASE_DIR = Path(__file__).parent.parent

# Database configuration
DATABASE_CONFIG = {
    'mysql': {
        'host': os.getenv('MYSQL_HOST', 'localhost'),
        'port': int(os.getenv('MYSQL_PORT', 3306)),
        'user': os.getenv('MYSQL_USER', 'root'),
        'password': os.getenv('MYSQL_PASSWORD', ''),
        'database': os.getenv('MYSQL_DATABASE', 'ecommerce_db'),
        'charset': 'utf8mb4',
        'autocommit': True,
        'pool_size': int(os.getenv('MYSQL_POOL_SIZE', 5)),
        'pool_reset_session': True
    },
    'sqlite': {
        'path': os.getenv('SQLITE_PATH', str(BASE_DIR / 'data' / 'ai_system.db')),
        'timeout': 30
    }
}

# Server configuration
SERVER_CONFIG = {
    'host': os.getenv('SERVER_HOST', '0.0.0.0'),
    'port': int(os.getenv('SERVER_PORT', 5002)),
    'debug': os.getenv('DEBUG', 'false').lower() == 'true',
    'workers': int(os.getenv('WORKERS', 1)),
    'timeout': int(os.getenv('REQUEST_TIMEOUT', 30))
}

# AI Model configuration
AI_CONFIG = {
    'cache_ttl': int(os.getenv('CACHE_TTL', 300)),  # 5 minutes
    'max_conversation_length': int(os.getenv('MAX_CONVERSATION_LENGTH', 10)),
    'analytics_buffer_size': int(os.getenv('ANALYTICS_BUFFER_SIZE', 1000)),
    'embedding_model': os.getenv('EMBEDDING_MODEL', 'all-MiniLM-L6-v2')
}

# Logging configuration
LOGGING_CONFIG = {
    'level': os.getenv('LOG_LEVEL', 'INFO'),
    'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    'file': os.getenv('LOG_FILE', str(BASE_DIR / 'logs' / 'ai_system.log')),
    'max_size': int(os.getenv('LOG_MAX_SIZE', 10 * 1024 * 1024)),  # 10MB
    'backup_count': int(os.getenv('LOG_BACKUP_COUNT', 5))
}

# Feature flags
FEATURES = {
    'sentiment_analysis': os.getenv('ENABLE_SENTIMENT', 'true').lower() == 'true',
    'business_analytics': os.getenv('ENABLE_BUSINESS_ANALYTICS', 'false').lower() == 'true',
    'analytics': os.getenv('ENABLE_ANALYTICS', 'true').lower() == 'true'
}
