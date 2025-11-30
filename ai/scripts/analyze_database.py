#!/usr/bin/env python3
"""
Comprehensive Database Analysis Script
Analyzes products, categories, brands, and product_variants
to understand data structure and improve AI chatbot query logic
"""

import asyncio
import sys
import json
from pathlib import Path
from typing import Dict, List, Any

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.db import get_conn, release_conn, init_pool, close_pool
from core.config import db_config


async def analyze_categories(conn) -> Dict[str, Any]:
    """Analyze categories table"""
    print("\n" + "=" * 80)
    print("📁 CATEGORIES ANALYSIS")
    print("=" * 80)
    
    async with conn.cursor() as cur:
        # Get all categories with product counts
        await cur.execute("""
            SELECT 
                c.id,
                c.name,
                c.slug,
                c.is_active,
                COUNT(p.id) as product_count,
                COUNT(CASE WHEN p.status = 'ACTIVE' THEN 1 END) as active_products
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id
            GROUP BY c.id, c.name, c.slug, c.is_active
            ORDER BY active_products DESC, c.name
        """)
        categories = await cur.fetchall()
        
        print(f"\nTotal Categories: {len(categories)}")
        print("\nCategory Details:")
        print("-" * 80)
        
        category_data = []
        for cat in categories:
            cat_id, name, slug, is_active, total_products, active_products = cat
            status = "✅ Active" if is_active else "❌ Inactive"
            print(f"\n  [{cat_id}] {name}")
            print(f"      Slug: {slug}")
            print(f"      Status: {status}")
            print(f"      Products: {active_products} active / {total_products} total")
            
            category_data.append({
                "id": cat_id,
                "name": name,
                "slug": slug,
                "is_active": is_active,
                "total_products": total_products,
                "active_products": active_products
            })
        
        return {"categories": category_data}


async def analyze_brands(conn) -> Dict[str, Any]:
    """Analyze brands table"""
    print("\n" + "=" * 80)
    print("🏷️  BRANDS ANALYSIS")
    print("=" * 80)
    
    async with conn.cursor() as cur:
        # Get all brands with product counts
        await cur.execute("""
            SELECT 
                b.id,
                b.name,
                b.country,
                b.is_active,
                COUNT(p.id) as product_count,
                COUNT(CASE WHEN p.status = 'ACTIVE' THEN 1 END) as active_products
            FROM brands b
            LEFT JOIN products p ON b.id = p.brand_id
            GROUP BY b.id, b.name, b.country, b.is_active
            ORDER BY active_products DESC, b.name
        """)
        brands = await cur.fetchall()
        
        print(f"\nTotal Brands: {len(brands)}")
        print("\nBrand Details:")
        print("-" * 80)
        
        brand_data = []
        for brand in brands:
            brand_id, name, country, is_active, total_products, active_products = brand
            status = "✅ Active" if is_active else "❌ Inactive"
            country_str = f" ({country})" if country else ""
            print(f"\n  [{brand_id}] {name}{country_str}")
            print(f"      Status: {status}")
            print(f"      Products: {active_products} active / {total_products} total")
            
            brand_data.append({
                "id": brand_id,
                "name": name,
                "country": country,
                "is_active": is_active,
                "total_products": total_products,
                "active_products": active_products
            })
        
        return {"brands": brand_data}


async def analyze_products(conn) -> Dict[str, Any]:
    """Analyze products table in detail"""
    print("\n" + "=" * 80)
    print("🛍️  PRODUCTS ANALYSIS")
    print("=" * 80)
    
    async with conn.cursor() as cur:
        # Get product statistics
        await cur.execute("""
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active,
                COUNT(CASE WHEN status = 'INACTIVE' THEN 1 END) as inactive,
                COUNT(CASE WHEN status = 'OUT_OF_STOCK' THEN 1 END) as out_of_stock,
                COUNT(CASE WHEN is_featured = 1 THEN 1 END) as featured,
                AVG(price) as avg_price,
                MIN(price) as min_price,
                MAX(price) as max_price
            FROM products
        """)
        stats = await cur.fetchone()
        
        total, active, inactive, out_of_stock, featured, avg_price, min_price, max_price = stats
        
        print(f"\nProduct Statistics:")
        print(f"  Total Products: {total}")
        print(f"  Active: {active}")
        print(f"  Inactive: {inactive}")
        print(f"  Out of Stock: {out_of_stock}")
        print(f"  Featured: {featured}")
        if avg_price:
            print(f"  Price Range: {float(min_price):,.0f}₫ - {float(max_price):,.0f}₫")
            print(f"  Average Price: {float(avg_price):,.0f}₫")
        
        # Get detailed product information
        await cur.execute("""
            SELECT 
                p.id,
                p.name,
                p.slug,
                p.description,
                p.price,
                p.sale_price,
                p.status,
                p.is_featured,
                p.view_count,
                c.name as category_name,
                c.slug as category_slug,
                b.name as brand_name,
                b.country as brand_country
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN brands b ON p.brand_id = b.id
            WHERE p.status = 'ACTIVE'
            ORDER BY p.view_count DESC, p.created_at DESC
            LIMIT 50
        """)
        products = await cur.fetchall()
        
        print(f"\nTop 50 Products (by views):")
        print("-" * 80)
        
        product_data = []
        keyword_analysis = {
            "học tập": [],
            "họp": [],
            "làm việc": [],
            "gaming": [],
            "gỗ": [],
            "nhôm": [],
            "sắt": [],
            "ghế": [],
            "bàn": [],
            "tủ": [],
            "kệ": []
        }
        
        for idx, p in enumerate(products, 1):
            (p_id, name, slug, desc, price, sale_price, status, is_featured, 
             views, cat_name, cat_slug, brand_name, brand_country) = p
            
            final_price = float(sale_price) if sale_price else float(price)
            original_price = float(price)
            
            # Analyze keywords
            name_lower = name.lower()
            desc_lower = (desc or "").lower()
            combined = f"{name_lower} {desc_lower}"
            
            found_keywords = []
            for keyword in keyword_analysis.keys():
                if keyword in combined:
                    keyword_analysis[keyword].append({
                        "id": p_id,
                        "name": name,
                        "category": cat_name
                    })
                    found_keywords.append(keyword)
            
            print(f"\n  {idx}. [{p_id}] {name}")
            print(f"      Slug: {slug}")
            print(f"      Category: {cat_name} ({cat_slug})")
            print(f"      Brand: {brand_name}" + (f" ({brand_country})" if brand_country else ""))
            print(f"      Price: {original_price:,.0f}₫", end="")
            if sale_price:
                print(f" → Sale: {final_price:,.0f}₫", end="")
            print()
            print(f"      Views: {views} | Featured: {'Yes' if is_featured else 'No'}")
            
            if found_keywords:
                print(f"      Keywords: {', '.join(found_keywords)}")
            
            if desc:
                desc_preview = desc[:100] + "..." if len(desc) > 100 else desc
                print(f"      Description: {desc_preview}")
            
            product_data.append({
                "id": p_id,
                "name": name,
                "slug": slug,
                "description": desc,
                "price": float(price),
                "sale_price": float(sale_price) if sale_price else None,
                "status": status,
                "is_featured": bool(is_featured),
                "view_count": views,
                "category": cat_name,
                "category_slug": cat_slug,
                "brand": brand_name,
                "brand_country": brand_country,
                "keywords": found_keywords
            })
        
        # Print keyword analysis
        print("\n" + "-" * 80)
        print("\nKeyword Analysis in Product Names/Descriptions:")
        for keyword, products_list in keyword_analysis.items():
            if products_list:
                print(f"\n  '{keyword}': {len(products_list)} products")
                for item in products_list[:5]:  # Show first 5
                    print(f"    - [{item['id']}] {item['name']} ({item['category']})")
                if len(products_list) > 5:
                    print(f"    ... and {len(products_list) - 5} more")
        
        return {
            "statistics": {
                "total": total,
                "active": active,
                "inactive": inactive,
                "out_of_stock": out_of_stock,
                "featured": featured,
                "avg_price": float(avg_price) if avg_price else None,
                "min_price": float(min_price) if min_price else None,
                "max_price": float(max_price) if max_price else None
            },
            "products": product_data,
            "keyword_analysis": {k: len(v) for k, v in keyword_analysis.items()}
        }


async def analyze_product_variants(conn) -> Dict[str, Any]:
    """Analyze product_variants table"""
    print("\n" + "=" * 80)
    print("🔧 PRODUCT VARIANTS ANALYSIS")
    print("=" * 80)
    
    async with conn.cursor() as cur:
        # Get variant statistics
        await cur.execute("""
            SELECT 
                COUNT(*) as total_variants,
                COUNT(DISTINCT product_id) as products_with_variants,
                COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_variants,
                COUNT(CASE WHEN stock_quantity > 0 THEN 1 END) as in_stock,
                COUNT(CASE WHEN material IS NOT NULL THEN 1 END) as with_material,
                COUNT(CASE WHEN color IS NOT NULL THEN 1 END) as with_color,
                COUNT(CASE WHEN width IS NOT NULL THEN 1 END) as with_dimensions
            FROM product_variants
        """)
        stats = await cur.fetchone()
        
        (total_variants, products_with_variants, active_variants, in_stock,
         with_material, with_color, with_dimensions) = stats
        
        print(f"\nVariant Statistics:")
        print(f"  Total Variants: {total_variants}")
        print(f"  Products with Variants: {products_with_variants}")
        print(f"  Active Variants: {active_variants}")
        print(f"  In Stock: {in_stock}")
        print(f"  With Material Info: {with_material}")
        print(f"  With Color Info: {with_color}")
        print(f"  With Dimensions: {with_dimensions}")
        
        # Get sample variants with product info
        await cur.execute("""
            SELECT 
                pv.id,
                pv.product_id,
                p.name as product_name,
                pv.stock_quantity,
                pv.material,
                pv.color,
                pv.width,
                pv.depth,
                pv.height,
                pv.weight_capacity,
                pv.warranty,
                pv.is_active
            FROM product_variants pv
            LEFT JOIN products p ON pv.product_id = p.id
            WHERE p.status = 'ACTIVE'
            ORDER BY pv.product_id, pv.id
            LIMIT 30
        """)
        variants = await cur.fetchall()
        
        print(f"\nSample Variants (first 30):")
        print("-" * 80)
        
        variant_data = []
        current_product_id = None
        
        for v in variants:
            (v_id, p_id, p_name, stock, material, color, width, depth, 
             height, weight_capacity, warranty, is_active) = v
            
            if current_product_id != p_id:
                print(f"\n  Product: [{p_id}] {p_name}")
                current_product_id = p_id
            
            variant_info = f"    Variant [{v_id}]:"
            if material:
                variant_info += f" Material: {material}"
            if color:
                variant_info += f" | Color: {color}"
            if width and depth and height:
                variant_info += f" | Size: {width}x{depth}x{height}cm"
            if weight_capacity:
                variant_info += f" | Capacity: {float(weight_capacity)}kg"
            if warranty:
                variant_info += f" | Warranty: {warranty}"
            variant_info += f" | Stock: {stock} | Active: {'Yes' if is_active else 'No'}"
            
            print(variant_info)
            
            variant_data.append({
                "id": v_id,
                "product_id": p_id,
                "product_name": p_name,
                "stock_quantity": stock,
                "material": material,
                "color": color,
                "dimensions": {
                    "width": width,
                    "depth": depth,
                    "height": height
                } if width and depth and height else None,
                "weight_capacity": float(weight_capacity) if weight_capacity else None,
                "warranty": warranty,
                "is_active": bool(is_active)
            })
        
        return {
            "statistics": {
                "total_variants": total_variants,
                "products_with_variants": products_with_variants,
                "active_variants": active_variants,
                "in_stock": in_stock,
                "with_material": with_material,
                "with_color": with_color,
                "with_dimensions": with_dimensions
            },
            "variants": variant_data
        }


async def test_search_queries(conn):
    """Test various search queries to understand search behavior"""
    print("\n" + "=" * 80)
    print("🔎 SEARCH QUERY TESTING")
    print("=" * 80)
    
    test_queries = [
        "bàn gỗ",
        "bàn học tập",
        "bàn họp",
        "bàn làm việc",
        "ghế văn phòng",
        "ghế xoay",
        "tủ hồ sơ",
        "kệ sách"
    ]
    
    async with conn.cursor() as cur:
        for query in test_queries:
            print(f"\n  Testing Query: '{query}'")
            print("  " + "-" * 76)
            
            # Test 1: Fulltext search
            try:
                await cur.execute("""
                    SELECT 
                        p.id,
                        p.name,
                        p.description,
                        c.name as category,
                        b.name as brand
                    FROM products p
                    LEFT JOIN categories c ON p.category_id = c.id
                    LEFT JOIN brands b ON p.brand_id = b.id
                    WHERE p.status = 'ACTIVE'
                    AND MATCH(p.name, p.description) AGAINST(%s IN BOOLEAN MODE)
                    ORDER BY 
                        CASE WHEN p.name LIKE %s THEN 1 ELSE 2 END,
                        p.view_count DESC
                    LIMIT 5
                """, [f"+{query}*", f"{query}%"])
                
                results = await cur.fetchall()
                print(f"    Fulltext Search: {len(results)} results")
                for r in results[:3]:
                    print(f"      - [{r[0]}] {r[1]} ({r[3]})")
            except Exception as e:
                print(f"    Fulltext Search: Error - {e}")
            
            # Test 2: LIKE search
            await cur.execute("""
                SELECT 
                    p.id,
                    p.name,
                    p.description,
                    c.name as category,
                    b.name as brand
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN brands b ON p.brand_id = b.id
                WHERE p.status = 'ACTIVE'
                AND (p.name LIKE %s OR p.description LIKE %s)
                ORDER BY 
                    CASE WHEN p.name LIKE %s THEN 1 ELSE 2 END,
                    p.view_count DESC
                LIMIT 5
            """, [f"%{query}%", f"%{query}%", f"{query}%"])
            
            results = await cur.fetchall()
            print(f"    LIKE Search: {len(results)} results")
            for r in results[:3]:
                print(f"      - [{r[0]}] {r[1]} ({r[3]})")


async def main():
    """Main analysis function"""
    conn = None
    try:
        print("=" * 80)
        print("📊 COMPREHENSIVE DATABASE ANALYSIS")
        print("=" * 80)
        print(f"Database: {db_config.database}")
        print(f"Host: {db_config.host}:{db_config.port}")
        print(f"User: {db_config.user}")
        
        # Initialize connection pool
        await init_pool()
        conn = await get_conn()
        
        # Run all analyses
        category_data = await analyze_categories(conn)
        brand_data = await analyze_brands(conn)
        product_data = await analyze_products(conn)
        variant_data = await analyze_product_variants(conn)
        await test_search_queries(conn)
        
        # Save results to JSON file
        output_file = Path(__file__).parent.parent / "database_analysis.json"
        analysis_result = {
            "categories": category_data,
            "brands": brand_data,
            "products": product_data,
            "variants": variant_data
        }
        
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(analysis_result, f, ensure_ascii=False, indent=2, default=str)
        
        print("\n" + "=" * 80)
        print("✅ Analysis Complete!")
        print(f"📄 Results saved to: {output_file}")
        print("=" * 80)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if conn:
            await release_conn(conn)
        await close_pool()


if __name__ == "__main__":
    asyncio.run(main())

