#!/usr/bin/env python3
"""
Script to analyze products in the database
Helps understand product structure and improve chatbot logic
"""

import asyncio
import sys
import json
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.db import get_conn, release_conn, init_pool, close_pool
from core.config import db_config


async def analyze_products():
    """Analyze products in the database"""
    conn = None
    try:
        print("=" * 80)
        print("📊 PRODUCT DATABASE ANALYSIS")
        print("=" * 80)
        print(f"Database: {db_config.database}")
        print(f"Host: {db_config.host}:{db_config.port}")
        print("=" * 80)
        print()
        
        # Initialize connection pool
        await init_pool()
        conn = await get_conn()
        
        async with conn.cursor() as cur:
            # 1. Get total products count
            await cur.execute("SELECT COUNT(*) FROM products WHERE status = 'ACTIVE'")
            total_active = (await cur.fetchone())[0]
            
            await cur.execute("SELECT COUNT(*) FROM products")
            total_all = (await cur.fetchone())[0]
            
            print(f"📦 PRODUCT STATISTICS:")
            print(f"   - Total products: {total_all}")
            print(f"   - Active products: {total_active}")
            print()
            
            # 2. Get categories
            await cur.execute("""
                SELECT c.id, c.name, c.slug, COUNT(p.id) as product_count
                FROM categories c
                LEFT JOIN products p ON c.id = p.category_id AND p.status = 'ACTIVE'
                GROUP BY c.id, c.name, c.slug
                ORDER BY product_count DESC
            """)
            categories = await cur.fetchall()
            
            print("📁 CATEGORIES:")
            for cat in categories:
                print(f"   - {cat[1]} (slug: {cat[2]}) - {cat[3]} products")
            print()
            
            # 3. Get brands
            await cur.execute("""
                SELECT b.id, b.name, b.country, COUNT(p.id) as product_count
                FROM brands b
                LEFT JOIN products p ON b.id = p.brand_id AND p.status = 'ACTIVE'
                GROUP BY b.id, b.name, b.country
                ORDER BY product_count DESC
                LIMIT 20
            """)
            brands = await cur.fetchall()
            
            print("🏷️  TOP BRANDS:")
            for brand in brands:
                country = f" ({brand[2]})" if brand[2] else ""
                print(f"   - {brand[1]}{country} - {brand[3]} products")
            print()
            
            # 4. Get sample products with details
            await cur.execute("""
                SELECT 
                    p.id,
                    p.name,
                    p.slug,
                    p.description,
                    p.price,
                    p.sale_price,
                    p.status,
                    c.name as category_name,
                    b.name as brand_name,
                    p.view_count
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN brands b ON p.brand_id = b.id
                WHERE p.status = 'ACTIVE'
                ORDER BY p.view_count DESC, p.created_at DESC
                LIMIT 30
            """)
            products = await cur.fetchall()
            
            print("🛍️  SAMPLE PRODUCTS (Top 30 by views):")
            print("-" * 80)
            
            for idx, p in enumerate(products, 1):
                product_id, name, slug, desc, price, sale_price, status, cat, brand, views = p
                final_price = float(sale_price) if sale_price else float(price)
                original_price = float(price)
                
                print(f"\n{idx}. {name}")
                print(f"   ID: {product_id} | Slug: {slug}")
                print(f"   Category: {cat} | Brand: {brand}")
                print(f"   Price: {original_price:,.0f}₫", end="")
                if sale_price:
                    print(f" → Sale: {final_price:,.0f}₫", end="")
                print()
                print(f"   Views: {views}")
                
                # Show description preview
                if desc:
                    desc_preview = desc[:150] + "..." if len(desc) > 150 else desc
                    print(f"   Description: {desc_preview}")
                
                # Analyze keywords in name and description
                name_lower = name.lower()
                desc_lower = (desc or "").lower()
                combined = f"{name_lower} {desc_lower}"
                
                keywords_found = []
                if "học tập" in combined or "study" in combined or ("học" in combined and "họp" not in combined):
                    keywords_found.append("📚 học tập")
                if "họp" in combined or "meeting" in combined:
                    keywords_found.append("🤝 họp")
                if "làm việc" in combined or "work" in combined or "văn phòng" in combined:
                    keywords_found.append("💼 làm việc")
                if "gaming" in combined or "chơi game" in combined:
                    keywords_found.append("🎮 gaming")
                if "gỗ" in combined or "wood" in combined:
                    keywords_found.append("🪵 gỗ")
                
                if keywords_found:
                    print(f"   Keywords: {', '.join(keywords_found)}")
            
            print("\n" + "-" * 80)
            print()
            
            # 5. Analyze product names for common patterns
            await cur.execute("""
                SELECT name
                FROM products
                WHERE status = 'ACTIVE'
            """)
            all_names = await cur.fetchall()
            
            # Count keyword occurrences
            keyword_counts = {
                "học tập": 0,
                "họp": 0,
                "làm việc": 0,
                "gaming": 0,
                "gỗ": 0,
                "nhôm": 0,
                "sắt": 0,
            }
            
            for (name,) in all_names:
                name_lower = name.lower()
                for keyword in keyword_counts.keys():
                    if keyword in name_lower:
                        keyword_counts[keyword] += 1
            
            print("🔍 KEYWORD ANALYSIS IN PRODUCT NAMES:")
            for keyword, count in sorted(keyword_counts.items(), key=lambda x: x[1], reverse=True):
                if count > 0:
                    print(f"   - '{keyword}': {count} products")
            print()
            
            # 6. Find products that might be confused
            print("⚠️  POTENTIAL CONFUSION ANALYSIS:")
            await cur.execute("""
                SELECT 
                    p.id,
                    p.name,
                    c.name as category
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.status = 'ACTIVE'
                AND (
                    p.name LIKE '%họp%' OR 
                    p.name LIKE '%học%' OR
                    p.name LIKE '%meeting%' OR
                    p.name LIKE '%study%'
                )
                ORDER BY p.name
            """)
            confusing_products = await cur.fetchall()
            
            if confusing_products:
                print("   Products with 'họp' or 'học' in name:")
                for p_id, p_name, cat in confusing_products:
                    print(f"   - [{p_id}] {p_name} ({cat})")
            else:
                print("   No products found with 'họp' or 'học' keywords")
            print()
            
            # 7. Search test queries
            print("🔎 TEST SEARCH QUERIES:")
            test_queries = [
                "bàn gỗ",
                "bàn học tập",
                "bàn họp",
                "bàn làm việc",
                "ghế văn phòng"
            ]
            
            for query in test_queries:
                await cur.execute("""
                    SELECT 
                        p.id,
                        p.name,
                        p.description,
                        c.name as category
                    FROM products p
                    LEFT JOIN categories c ON p.category_id = c.id
                    WHERE p.status = 'ACTIVE'
                    AND (
                        MATCH(p.name, p.description) AGAINST(%s IN BOOLEAN MODE)
                        OR p.name LIKE %s
                        OR p.description LIKE %s
                    )
                    ORDER BY 
                        CASE WHEN p.name LIKE %s THEN 1 ELSE 2 END,
                        p.view_count DESC
                    LIMIT 5
                """, [f"+{query}*", f"%{query}%", f"%{query}%", f"{query}%"])
                
                results = await cur.fetchall()
                print(f"\n   Query: '{query}' → Found {len(results)} products")
                for r in results:
                    print(f"      - {r[1]} ({r[3]})")
            
            print("\n" + "=" * 80)
            print("✅ Analysis complete!")
            print("=" * 80)
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if conn:
            await release_conn(conn)
        await close_pool()


if __name__ == "__main__":
    asyncio.run(analyze_products())

