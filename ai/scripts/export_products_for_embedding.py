#!/usr/bin/env python3
"""
Export products from MySQL for embedding
"""
import asyncio
import sys
import json
from pathlib import Path
from decimal import Decimal

sys.path.insert(0, str(Path(__file__).parent.parent))

from core.db import get_conn, release_conn


class DecimalEncoder(json.JSONEncoder):
    """JSON encoder for Decimal"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


async def export_products():
    """Export products with full details"""
    print("="*80)
    print("📤 EXPORTING PRODUCTS FOR EMBEDDING")
    print("="*80)
    
    conn = await get_conn()
    
    try:
        async with conn.cursor() as cur:
            # Get all active products with details
            await cur.execute("""
                SELECT 
                    p.id, p.name, p.slug, p.description,
                    p.price, p.sale_price,
                    c.name as category_name,
                    b.name as brand_name,
                    p.is_featured
                FROM products p
                INNER JOIN categories c ON p.category_id = c.id
                INNER JOIN brands b ON p.brand_id = b.id
                WHERE p.status = 'ACTIVE'
                ORDER BY p.id
            """)
            
            products_data = await cur.fetchall()
            
            print(f"\n📊 Found {len(products_data)} products")
            print(f"\n🔄 Processing products...")
            
            products = []
            
            for row in products_data:
                (prod_id, name, slug, description, price, sale_price,
                 category, brand, is_featured) = row
                
                # Get variants for this product
                await cur.execute("""
                    SELECT 
                        width, depth, height, height_max,
                        material, color, weight_capacity, warranty,
                        stock_quantity
                    FROM product_variants
                    WHERE product_id = %s AND is_active = 1
                """, (prod_id,))
                
                variants = await cur.fetchall()
                
                # Get average rating
                await cur.execute("""
                    SELECT AVG(rating), COUNT(*)
                    FROM product_reviews
                    WHERE product_id = %s AND is_approved = 1
                """, (prod_id,))
                
                rating_data = await cur.fetchone()
                avg_rating = float(rating_data[0]) if rating_data[0] else 0
                review_count = rating_data[1]
                
                # Calculate final price
                final_price = float(sale_price) if sale_price else float(price)
                
                # Build product object
                product = {
                    "id": prod_id,
                    "name": name,
                    "slug": slug,
                    "description": description or "",
                    "category": category,
                    "brand": brand,
                    "price": float(price),
                    "sale_price": float(sale_price) if sale_price else None,
                    "final_price": final_price,
                    "is_featured": bool(is_featured),
                    "rating": round(avg_rating, 1),
                    "review_count": review_count,
                    "variants": []
                }
                
                # Add variants
                for variant in variants:
                    (width, depth, height, height_max, material, color,
                     weight_capacity, warranty, stock) = variant
                    
                    product["variants"].append({
                        "dimensions": {
                            "width": width,
                            "depth": depth,
                            "height": height,
                            "height_max": height_max
                        },
                        "material": material,
                        "color": color,
                        "weight_capacity": float(weight_capacity) if weight_capacity else None,
                        "warranty": warranty,
                        "stock": stock
                    })
                
                products.append(product)
                
                if len(products) % 20 == 0:
                    print(f"  ✅ Processed {len(products)}/{len(products_data)} products...")
            
            # Save to JSON
            output_file = Path(__file__).parent / "products_for_embedding.json"
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump({
                    "total": len(products),
                    "exported_at": str(asyncio.get_event_loop().time()),
                    "products": products
                }, f, ensure_ascii=False, indent=2, cls=DecimalEncoder)
            
            print(f"\n" + "="*80)
            print(f"✅ EXPORT COMPLETE!")
            print(f"="*80)
            print(f"\n📊 Summary:")
            print(f"  - Total products: {len(products)}")
            print(f"  - Output file: {output_file}")
            print(f"  - File size: {output_file.stat().st_size / 1024:.1f} KB")
            
            # Sample product
            if products:
                print(f"\n📋 Sample product:")
                sample = products[0]
                print(f"  - Name: {sample['name']}")
                print(f"  - Category: {sample['category']}")
                print(f"  - Price: {sample['final_price']:,.0f}đ")
                print(f"  - Variants: {len(sample['variants'])}")
                print(f"  - Rating: {sample['rating']}/5 ({sample['review_count']} reviews)")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await release_conn(conn)


async def main():
    await export_products()


if __name__ == "__main__":
    asyncio.run(main())
