#!/usr/bin/env python3
"""
Script to check MySQL database for AI Chatbot data quality
Kiểm tra dữ liệu trong MySQL để đảm bảo AI trả lời đúng
"""

import sys
from pathlib import Path
import asyncio

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from core.db import get_conn, release_conn


async def check_products_data():
    """Check products table data quality"""
    print("=" * 80)
    print("🔍 CHECKING PRODUCTS DATA FOR AI CHATBOT")
    print("=" * 80)
    
    conn = await get_conn()
    try:
        async with conn.cursor() as cur:
            # 1. Count total products
            await cur.execute("SELECT COUNT(*) FROM products WHERE status = 'ACTIVE'")
            total = (await cur.fetchone())[0]
            print(f"\n📊 Total Active Products: {total}")
            
            # 2. Check required fields for AI
            print(f"\n{'=' * 80}")
            print(f"📋 REQUIRED FIELDS CHECK")
            print(f"{'=' * 80}")
            
            required_checks = [
                ("name", "SELECT COUNT(*) FROM products WHERE status = 'ACTIVE' AND (name IS NULL OR name = '')"),
                ("description", "SELECT COUNT(*) FROM products WHERE status = 'ACTIVE' AND (description IS NULL OR description = '')"),
                ("price", "SELECT COUNT(*) FROM products WHERE status = 'ACTIVE' AND (price IS NULL OR price <= 0)"),
                ("category", "SELECT COUNT(*) FROM products WHERE status = 'ACTIVE' AND (category_id IS NULL)"),
                ("image", "SELECT COUNT(*) FROM products WHERE status = 'ACTIVE' AND (image_url IS NULL OR image_url = '')"),
                ("slug", "SELECT COUNT(*) FROM products WHERE status = 'ACTIVE' AND (slug IS NULL OR slug = '')"),
            ]
            
            issues = []
            for field_name, query in required_checks:
                await cur.execute(query)
                missing_count = (await cur.fetchone())[0]
                
                if missing_count > 0:
                    print(f"   ⚠️  {field_name}: {missing_count} products missing/invalid")
                    issues.append((field_name, missing_count))
                else:
                    print(f"   ✅ {field_name}: All products have valid data")
            
            # 3. Check product variants
            print(f"\n{'=' * 80}")
            print(f"📦 PRODUCT VARIANTS CHECK")
            print(f"{'=' * 80}")
            
            await cur.execute("""
                SELECT COUNT(DISTINCT p.id) 
                FROM products p
                WHERE p.status = 'ACTIVE'
                AND NOT EXISTS (
                    SELECT 1 FROM product_variants pv 
                    WHERE pv.product_id = p.id AND pv.is_active = 1
                )
            """)
            no_variants = (await cur.fetchone())[0]
            
            if no_variants > 0:
                print(f"   ⚠️  {no_variants} products have NO active variants")
                print(f"   💡 AI may not be able to show price/stock for these products")
                issues.append(("variants", no_variants))
            else:
                print(f"   ✅ All products have variants")
            
            # 4. Check categories
            print(f"\n{'=' * 80}")
            print(f"🏷️  CATEGORIES CHECK")
            print(f"{'=' * 80}")
            
            await cur.execute("SELECT COUNT(*) FROM categories WHERE is_active = 1")
            total_categories = (await cur.fetchone())[0]
            print(f"   Total Active Categories: {total_categories}")
            
            await cur.execute("""
                SELECT c.name, COUNT(p.id) as product_count
                FROM categories c
                LEFT JOIN products p ON c.id = p.category_id AND p.status = 'ACTIVE'
                WHERE c.is_active = 1
                GROUP BY c.id, c.name
                ORDER BY product_count DESC
            """)
            categories = await cur.fetchall()
            
            print(f"\n   📊 Products per Category:")
            for cat_name, count in categories[:10]:
                print(f"      - {cat_name}: {count} products")
            
            # Check categories with no products
            empty_categories = [cat for cat, count in categories if count == 0]
            if empty_categories:
                print(f"\n   ⚠️  {len(empty_categories)} categories have NO products:")
                for cat in empty_categories[:5]:
                    print(f"      - {cat}")
            
            # 5. Sample products for AI
            print(f"\n{'=' * 80}")
            print(f"📄 SAMPLE PRODUCTS (for AI testing)")
            print(f"{'=' * 80}")
            
            await cur.execute("""
                SELECT 
                    p.id,
                    p.name,
                    p.description,
                    p.price,
                    c.name as category,
                    b.name as brand,
                    p.slug,
                    (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = 1) as variant_count
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN brands b ON p.brand_id = b.id
                WHERE p.status = 'ACTIVE'
                ORDER BY p.created_at DESC
                LIMIT 5
            """)
            samples = await cur.fetchall()
            
            for i, (pid, name, desc, price, category, brand, slug, variant_count) in enumerate(samples, 1):
                print(f"\n   [{i}] {name}")
                print(f"       ID: {pid}")
                print(f"       Category: {category or '❌ Missing'}")
                print(f"       Brand: {brand or '❌ Missing'}")
                print(f"       Price: {price:,.0f}₫" if price else "       Price: ❌ Missing")
                print(f"       Variants: {variant_count}")
                print(f"       Slug: {slug or '❌ Missing'}")
                
                desc_preview = desc[:80] + "..." if desc and len(desc) > 80 else desc
                print(f"       Description: {desc_preview or '❌ Missing'}")
            
            # 6. Check for AI-critical fields
            print(f"\n{'=' * 80}")
            print(f"🤖 AI-CRITICAL FIELDS CHECK")
            print(f"{'=' * 80}")
            
            # Check products with good data for AI
            await cur.execute("""
                SELECT COUNT(*) FROM products p
                WHERE p.status = 'ACTIVE'
                AND p.name IS NOT NULL AND p.name != ''
                AND p.description IS NOT NULL AND p.description != ''
                AND p.price IS NOT NULL AND p.price > 0
                AND p.category_id IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM product_variants pv 
                    WHERE pv.product_id = p.id AND pv.is_active = 1
                )
            """)
            good_products = (await cur.fetchone())[0]
            
            print(f"\n   ✅ Products with COMPLETE data: {good_products}/{total}")
            print(f"   📊 Percentage: {(good_products/total*100):.1f}%")
            
            if good_products < total:
                incomplete = total - good_products
                print(f"\n   ⚠️  {incomplete} products have INCOMPLETE data")
                print(f"   💡 AI may give incorrect answers for these products")
            
            # 7. Summary
            print(f"\n{'=' * 80}")
            print(f"📊 SUMMARY")
            print(f"{'=' * 80}")
            
            if not issues:
                print(f"\n✅ ALL DATA IS GOOD!")
                print(f"   - All products have required fields")
                print(f"   - All products have variants")
                print(f"   - AI can answer correctly")
            else:
                print(f"\n⚠️  FOUND {len(issues)} ISSUES:")
                for field, count in issues:
                    print(f"   - {field}: {count} products affected")
                
                print(f"\n🔧 RECOMMENDATIONS:")
                print(f"   1. Fix missing/invalid data in products table")
                print(f"   2. Ensure all products have:")
                print(f"      - name (clear, descriptive)")
                print(f"      - description (detailed)")
                print(f"      - price (> 0)")
                print(f"      - category")
                print(f"      - at least 1 active variant")
                print(f"      - image_url")
                print(f"      - slug")
    
    finally:
        await release_conn(conn)


async def check_vector_sync():
    """Check if products are synced with VectorDB"""
    print(f"\n{'=' * 80}")
    print(f"🔄 VECTORDB SYNC CHECK")
    print(f"{'=' * 80}")
    
    conn = await get_conn()
    try:
        async with conn.cursor() as cur:
            # Count products in MySQL
            await cur.execute("SELECT COUNT(*) FROM products WHERE status = 'ACTIVE'")
            mysql_count = (await cur.fetchone())[0]
            
            print(f"\n   MySQL Products: {mysql_count}")
            
            # Count products in VectorDB
            import sqlite3
            chroma_db = Path(__file__).parent / ".chroma" / "chroma.sqlite3"
            
            if chroma_db.exists():
                vdb_conn = sqlite3.connect(str(chroma_db))
                cursor = vdb_conn.cursor()
                
                # Get products collection
                cursor.execute("""
                    SELECT COUNT(e.id)
                    FROM embeddings e
                    JOIN segments s ON e.segment_id = s.id
                    JOIN collections c ON s.collection = c.id
                    WHERE c.name = 'products'
                """)
                vector_count = cursor.fetchone()[0]
                vdb_conn.close()
                
                print(f"   VectorDB Products: {vector_count}")
                
                if mysql_count != vector_count:
                    print(f"\n   ⚠️  SYNC ISSUE: MySQL ({mysql_count}) != VectorDB ({vector_count})")
                    print(f"   🔧 Action: Re-embed products")
                    print(f"      Run: cd ai && python3 scripts/embed_products.py")
                else:
                    print(f"\n   ✅ SYNCED: MySQL and VectorDB have same count")
            else:
                print(f"\n   ❌ VectorDB not found")
                print(f"   🔧 Action: Run embedding script")
    
    finally:
        await release_conn(conn)


async def check_user_data():
    """Check user data for personalization"""
    print(f"\n{'=' * 80}")
    print(f"👤 USER DATA CHECK (for personalization)")
    print(f"{'=' * 80}")
    
    conn = await get_conn()
    try:
        async with conn.cursor() as cur:
            # Count users
            await cur.execute("SELECT COUNT(*) FROM users WHERE is_active = 1")
            total_users = (await cur.fetchone())[0]
            print(f"\n   Total Active Users: {total_users}")
            
            # Check users with orders
            await cur.execute("""
                SELECT COUNT(DISTINCT user_id) 
                FROM orders 
                WHERE user_id IS NOT NULL
            """)
            users_with_orders = (await cur.fetchone())[0]
            print(f"   Users with Orders: {users_with_orders}")
            
            # Check user fields
            await cur.execute("""
                SELECT COUNT(*) FROM users 
                WHERE is_active = 1 
                AND (first_name IS NULL OR first_name = '')
            """)
            no_name = (await cur.fetchone())[0]
            
            if no_name > 0:
                print(f"\n   ⚠️  {no_name} users have no name")
                print(f"   💡 AI cannot personalize greetings for these users")
            else:
                print(f"\n   ✅ All users have names")
    
    finally:
        await release_conn(conn)


async def main():
    """Main check function"""
    try:
        print("\n" + "=" * 80)
        print("🔍 AI CHATBOT DATA QUALITY CHECK")
        print("=" * 80)
        print("\nChecking MySQL database for AI Chatbot requirements...")
        
        # Check products
        await check_products_data()
        
        # Check vector sync
        await check_vector_sync()
        
        # Check user data
        await check_user_data()
        
        print("\n" + "=" * 80)
        print("✅ CHECK COMPLETED")
        print("=" * 80)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
