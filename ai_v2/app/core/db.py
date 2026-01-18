
import aiomysql
from typing import Optional
from app.core.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)

_pool: Optional[aiomysql.Pool] = None

async def init_db_pool() -> aiomysql.Pool:
    global _pool
    if _pool is None:
        try:
            logger.info(f"Initializing DB pool to {settings.DB_MYSQL_HOST}:{settings.DB_MYSQL_PORT}")
            _pool = await aiomysql.create_pool(
                host=settings.DB_MYSQL_HOST,
                port=settings.DB_MYSQL_PORT,
                user=settings.DB_MYSQL_USER,
                password=settings.DB_MYSQL_PASSWORD,
                db=settings.DB_MYSQL_DATABASE,
                minsize=settings.DB_POOL_MIN,
                maxsize=settings.DB_POOL_MAX,
                autocommit=True,
                charset="utf8mb4",
            )
            logger.info("DB pool initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize DB pool: {e}")
            raise
    return _pool

async def get_db_conn():
    pool = await init_db_pool()
    return await pool.acquire()

async def release_conn(conn):
    """Release method specifically for aiomysql pool connection"""
    global _pool
    if _pool and conn:
        try:
            _pool.release(conn)
        except Exception as e:
            logger.error(f"Error releasing connection: {e}")

import asyncio

async def close_db_pool():
    global _pool
    if _pool:
        try:
            logger.info("Closing DB pool...")
            _pool.close()
            # Wait for up to 5 seconds
            await asyncio.wait_for(_pool.wait_closed(), timeout=5.0)
            logger.info("DB pool closed successfully")
        except asyncio.TimeoutError:
            logger.warning("DB pool close timed out - forcing exit")
        except Exception as e:
            logger.error(f"Error closing DB pool: {e}")
        finally:
            _pool = None
