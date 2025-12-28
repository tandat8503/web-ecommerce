#!/usr/bin/env python3
"""
Get database schema first
"""

import sys
from pathlib import Path
import asyncio

sys.path.insert(0, str(Path(__file__).parent))

from core.db import get_conn, release_conn


async def get_schema():
    """Get database schema"""
    conn = await get_conn()
    try:
        async with conn.cursor() as cur:
            # Get products table schema
            await cur.execute("DESCRIBE products")
            columns = await cur.fetchall()
            
            print("=" * 80)
            print("📋 PRODUCTS TABLE SCHEMA")
            print("=" * 80)
            for col in columns:
                print(f"   - {col[0]} ({col[1]})")
            
            # Get categories schema
            await cur.execute("DESCRIBE categories")
            cat_columns = await cur.fetchall()
            
            print("\n" + "=" * 80)
            print("📋 CATEGORIES TABLE SCHEMA")
            print("=" * 80)
            for col in cat_columns:
                print(f"   - {col[0]} ({col[1]})")
            
            # Get product_variants schema
            await cur.execute("DESCRIBE product_variants")
            var_columns = await cur.fetchall()
            
            print("\n" + "=" * 80)
            print("📋 PRODUCT_VARIANTS TABLE SCHEMA")
            print("=" * 80)
            for col in var_columns:
                print(f"   - {col[0]} ({col[1]})")
    
    finally:
        await release_conn(conn)


if __name__ == "__main__":
    asyncio.run(get_schema())
