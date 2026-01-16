#!/usr/bin/env python3
"""
Script to check current product data in database
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.db import get_conn, release_conn


async def check_product_data():
    """Check current product data"""
    print("="*80)
    print("📊 CHECKING PRODUCT DATA IN DATABASE")
    print("="*80)
    
    conn = await get_conn()
    
    try:
        async with conn.cursor() as cur:
            # 1. Count total products
            await cur.execute("SELECT COUNT(*) FROM products WHERE status = 'ACTIVE'")
            total_products = (await cur.fetchone())[0]
            print(f"\n✅ Total ACTIVE products: {total_products}")
            
            # 2. Count by category
            await cur.execute("""
                SELECT c.name, COUNT(p.id) as count
                FROM categories c
                LEFT JOIN products p ON c.id = p.category_id AND p.status = 'ACTIVE'
                GROUP BY c.id, c.name
                ORDER BY count DESC
            """)
            categories = await cur.fetchall()
            
            print(f"\n📁 Products by Category:")
            for cat_name, count in categories:
                print(f"  - {cat_name}: {count} products")
            
            # 3. Count by brand
            await cur.execute("""
                SELECT b.name, COUNT(p.id) as count
                FROM brands b
                LEFT JOIN products p ON b.id = p.brand_id AND p.status = 'ACTIVE'
                GROUP BY b.id, b.name
                ORDER BY count DESC
                LIMIT 10
            """)
            brands = await cur.fetchall()
            
            print(f"\n🏷️  Products by Brand (top 10):")
            for brand_name, count in brands:
                print(f"  - {brand_name}: {count} products")
            
            # 4. Check products with variants
            await cur.execute("""
                SELECT COUNT(DISTINCT p.id)
                FROM products p
                INNER JOIN product_variants pv ON p.id = pv.product_id
                WHERE p.status = 'ACTIVE'
            """)
            products_with_variants = (await cur.fetchone())[0]
            print(f"\n📦 Products with variants: {products_with_variants}/{total_products}")
            
            # 5. Check products with complete specs
            await cur.execute("""
                SELECT COUNT(DISTINCT p.id)
                FROM products p
                INNER JOIN product_variants pv ON p.id = pv.product_id
                WHERE p.status = 'ACTIVE'
                  AND pv.width IS NOT NULL
                  AND pv.depth IS NOT NULL
                  AND pv.height IS NOT NULL
                  AND pv.material IS NOT NULL
            """)
            products_with_specs = (await cur.fetchone())[0]
            print(f"📏 Products with complete specs: {products_with_specs}/{total_products}")
            
            # 6. Check products with description
            await cur.execute("""
                SELECT COUNT(*)
                FROM products
                WHERE status = 'ACTIVE'
                  AND description IS NOT NULL
                  AND LENGTH(description) > 50
            """)
            products_with_desc = (await cur.fetchone())[0]
            print(f"📝 Products with description (>50 chars): {products_with_desc}/{total_products}")
            
            # 7. Sample 3 products
            await cur.execute("""
                SELECT 
                    p.id,
                    p.name,
                    p.description,
                    c.name as category,
                    b.name as brand,
                    p.price,
                    p.sale_price,
                    pv.width,
                    pv.depth,
                    pv.height,
                    pv.material,
                    pv.color
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN brands b ON p.brand_id = b.id
                LEFT JOIN product_variants pv ON p.id = pv.product_id
                WHERE p.status = 'ACTIVE'
                LIMIT 3
            """)
            samples = await cur.fetchall()
            
            print(f"\n📋 Sample Products:")
            for row in samples:
                (pid, name, desc, cat, brand, price, sale_price, 
                 width, depth, height, material, color) = row
                
                print(f"\n  Product #{pid}: {name}")
                print(f"    Category: {cat}")
                print(f"    Brand: {brand}")
                print(f"    Price: {price:,.0f}đ" + (f" (Sale: {sale_price:,.0f}đ)" if sale_price else ""))
                
                if width or depth or height:
                    print(f"    Dimensions: {width}x{depth}x{height}cm")
                else:
                    print(f"    Dimensions: ❌ Missing")
                
                if material:
                    print(f"    Material: {material}")
                else:
                    print(f"    Material: ❌ Missing")
                
                if color:
                    print(f"    Color: {color}")
                
                if desc:
                    desc_preview = desc[:100] + "..." if len(desc) > 100 else desc
                    print(f"    Description: {desc_preview}")
                else:
                    print(f"    Description: ❌ Missing")
            
            # 8. Data quality summary
            print(f"\n" + "="*80)
            print("📊 DATA QUALITY SUMMARY")
            print("="*80)
            
            completeness_score = 0
            total_checks = 3
            
            # Check 1: Variants
            if products_with_variants > 0:
                variant_ratio = products_with_variants / total_products * 100
                print(f"\n✅ Variants: {variant_ratio:.1f}% products have variants")
                if variant_ratio >= 80:
                    completeness_score += 1
            else:
                print(f"\n❌ Variants: No products have variants")
            
            # Check 2: Specs
            if products_with_specs > 0:
                specs_ratio = products_with_specs / total_products * 100
                print(f"✅ Specs: {specs_ratio:.1f}% products have complete specs")
                if specs_ratio >= 80:
                    completeness_score += 1
            else:
                print(f"❌ Specs: No products have complete specs")
            
            # Check 3: Description
            if products_with_desc > 0:
                desc_ratio = products_with_desc / total_products * 100
                print(f"✅ Description: {desc_ratio:.1f}% products have description")
                if desc_ratio >= 80:
                    completeness_score += 1
            else:
                print(f"❌ Description: No products have description")
            
            # Overall score
            overall_score = completeness_score / total_checks * 100
            
            print(f"\n📈 Overall Data Quality: {overall_score:.0f}%")
            
            if overall_score >= 80:
                print(f"✅ EXCELLENT - Ready for embedding!")
            elif overall_score >= 50:
                print(f"⚠️  GOOD - Can embed but should improve data quality")
            else:
                print(f"❌ POOR - Need to add more data before embedding")
            
            # 9. Recommendations
            print(f"\n" + "="*80)
            print("💡 RECOMMENDATIONS")
            print("="*80)
            
            if total_products < 50:
                print(f"\n⚠️  Only {total_products} products - Consider adding more products")
                print(f"   Recommended: At least 50-100 products for good chatbot performance")
            
            if products_with_variants < total_products * 0.8:
                print(f"\n⚠️  {total_products - products_with_variants} products missing variants")
                print(f"   Action: Add product_variants for each product")
            
            if products_with_specs < total_products * 0.8:
                print(f"\n⚠️  {total_products - products_with_specs} products missing specs")
                print(f"   Action: Fill in width, depth, height, material for variants")
            
            if products_with_desc < total_products * 0.8:
                print(f"\n⚠️  {total_products - products_with_desc} products missing description")
                print(f"   Action: Add detailed descriptions for products")
            
            if overall_score >= 80:
                print(f"\n✅ Data quality is good! You can proceed with embedding.")
            else:
                print(f"\n❌ Please improve data quality before embedding:")
                print(f"   1. Add product variants")
                print(f"   2. Fill in specs (dimensions, material)")
                print(f"   3. Add detailed descriptions")
            
    finally:
        await release_conn(conn)


async def main():
    await check_product_data()


if __name__ == "__main__":
    asyncio.run(main())
