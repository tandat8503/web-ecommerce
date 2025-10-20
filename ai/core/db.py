import aiomysql
from typing import Optional
from .config import db_config

_pool: Optional[aiomysql.Pool] = None


async def init_pool() -> aiomysql.Pool:
    global _pool
    if _pool is None:
        _pool = await aiomysql.create_pool(
            host=db_config.host,
            port=db_config.port,
            user=db_config.user,
            password=db_config.password,
            db=db_config.database,
            minsize=db_config.minsize,
            maxsize=db_config.maxsize,
            autocommit=True,
            charset="utf8mb4",
        )
    return _pool


async def get_conn():
    """Get database connection from pool"""
    pool = await init_pool()
    return await pool.acquire()


async def release_conn(conn):
    """Release database connection back to pool"""
    if conn:
        conn.close()


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        await _pool.wait_closed()
        _pool = None
