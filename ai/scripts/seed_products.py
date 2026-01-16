#!/usr/bin/env python3
"""
Seed Products - Import 100 realistic office furniture products
"""
import asyncio
import sys
import random
from pathlib import Path
from datetime import datetime
from decimal import Decimal

sys.path.insert(0, str(Path(__file__).parent.parent))

from core.db import get_conn, release_conn
from shared.llm_client import LLMClientFactory

# Product data templates
PRODUCT_TEMPLATES = {
    "Bàn Chữ L": [
        {"base_name": "Bàn Làm Việc Chữ L", "width_range": (120, 160), "depth_range": (140, 180), "price_range": (3500000, 8000000)},
        {"base_name": "Bàn Giám Đốc Chữ L", "width_range": (160, 200), "depth_range": (160, 200), "price_range": (7000000, 15000000)},
    ],
    "Bàn Chữ U": [
        {"base_name": "Bàn Làm Việc Chữ U", "width_range": (180, 220), "depth_range": (180, 220), "price_range": (6000000, 12000000)},
        {"base_name": "Bàn Giám Đốc Chữ U", "width_range": (200, 240), "depth_range": (200, 240), "price_range": (10000000, 18000000)},
    ],
    "Bàn Họp": [
        {"base_name": "Bàn Họp Nhỏ", "width_range": (120, 160), "depth_range": (80, 100), "price_range": (4000000, 8000000)},
        {"base_name": "Bàn Họp Trung", "width_range": (180, 240), "depth_range": (100, 120), "price_range": (8000000, 15000000)},
        {"base_name": "Bàn Họp Lớn", "width_range": (280, 400), "depth_range": (120, 150), "price_range": (15000000, 30000000)},
    ],
    "Bàn Nâng Hạ": [
        {"base_name": "Bàn Nâng Hạ Điện", "width_range": (120, 160), "depth_range": (60, 80), "price_range": (5000000, 12000000)},
    ],
    "Ghế Xoay": [
        {"base_name": "Ghế Xoay Văn Phòng", "width_range": (50, 65), "depth_range": (50, 65), "price_range": (1500000, 4000000)},
        {"base_name": "Ghế Xoay Giám Đốc", "width_range": (60, 75), "depth_range": (60, 75), "price_range": (4000000, 10000000)},
    ],
    "Ghế Gaming": [
        {"base_name": "Ghế Gaming", "width_range": (55, 70), "depth_range": (55, 70), "price_range": (3000000, 8000000)},
    ],
    "Ghế Công Thái Học": [
        {"base_name": "Ghế Công Thái Học", "width_range": (55, 70), "depth_range": (55, 70), "price_range": (5000000, 15000000)},
    ],
    "Ghế Phòng Họp": [
        {"base_name": "Ghế Phòng Họp", "width_range": (50, 60), "depth_range": (50, 60), "price_range": (1000000, 3000000)},
    ],
    "Kệ Bàn": [
        {"base_name": "Kệ Để Bàn", "width_range": (40, 80), "depth_range": (20, 30), "price_range": (500000, 2000000)},
    ],
    "Arm Màn Hình": [
        {"base_name": "Arm Màn Hình", "width_range": (10, 20), "depth_range": (10, 20), "price_range": (800000, 3000000)},
    ],
    "Tay Vịn Ghế": [
        {"base_name": "Tay Vịn Ghế", "width_range": (5, 10), "depth_range": (20, 30), "price_range": (300000, 1000000)},
    ],
}

BRANDS = ["Govi Furniture", "IKEA", "Hòa Phát", "Fami", "Xuân Hòa"]

MATERIALS = {
    "bàn": ["Gỗ MDF phủ Melamine", "Gỗ công nghiệp", "Gỗ tự nhiên", "Thép sơn tĩnh điện"],
    "ghế": ["Da PU", "Vải lưới", "Da thật", "Nhựa ABS"],
    "phụ kiện": ["Thép", "Nhôm", "Nhựa", "Gỗ"]
}

COLORS = ["Nâu gỗ", "Trắng", "Đen", "Xám", "Be", "Xanh navy"]


async def generate_product_description(product_info: dict) -> str:
    """Generate product description using AI"""
    llm_client = LLMClientFactory.create_client()
    
    prompt = f"""Viết mô tả sản phẩm nội thất văn phòng bằng tiếng Việt.

Thông tin sản phẩm:
- Tên: {product_info['name']}
- Danh mục: {product_info['category']}
- Thương hiệu: {product_info['brand']}
- Kích thước: {product_info['width']}x{product_info['depth']}x{product_info['height']}cm
- Chất liệu: {product_info['material']}
- Giá: {product_info['price']:,.0f}đ

Yêu cầu:
- Độ dài: 150-200 từ
- Nội dung: Mô tả đặc điểm, ưu điểm, phù hợp với ai/không gian nào
- Tone: Chuyên nghiệp, thuyết phục
- Không dùng emoji
- Tập trung vào lợi ích thực tế

Chỉ trả về mô tả, không thêm tiêu đề hay phần khác."""

    try:
        response = await llm_client.generate_simple(
            prompt=prompt,
            system_instruction="Bạn là chuyên gia viết content cho sản phẩm nội thất.",
            temperature=0.7
        )
        return response.get("content", "").strip()
    except Exception as e:
        print(f"⚠️  AI generation failed: {e}")
        # Fallback description
        return f"{product_info['name']} với thiết kế hiện đại, chất liệu {product_info['material']} bền đẹp. Kích thước {product_info['width']}x{product_info['depth']}x{product_info['height']}cm phù hợp cho không gian văn phòng. Sản phẩm của thương hiệu {product_info['brand']} đảm bảo chất lượng cao."


async def get_category_id(conn, category_name: str) -> int:
    """Get category ID by name"""
    async with conn.cursor() as cur:
        await cur.execute("SELECT id FROM categories WHERE name = %s", (category_name,))
        result = await cur.fetchone()
        return result[0] if result else None


async def get_or_create_brand(conn, brand_name: str) -> int:
    """Get or create brand"""
    async with conn.cursor() as cur:
        # Check if exists
        await cur.execute("SELECT id FROM brands WHERE name = %s", (brand_name,))
        result = await cur.fetchone()
        
        if result:
            return result[0]
        
        # Create new
        await cur.execute("""
            INSERT INTO brands (name, country, is_active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s)
        """, (brand_name, "Việt Nam", True, datetime.now(), datetime.now()))
        
        return cur.lastrowid


def create_slug(name: str) -> str:
    """Create URL-friendly slug"""
    import unicodedata
    import re
    
    # Normalize unicode
    name = unicodedata.normalize('NFKD', name)
    name = name.encode('ascii', 'ignore').decode('ascii')
    
    # Lowercase and replace spaces
    name = name.lower()
    name = re.sub(r'[^a-z0-9]+', '-', name)
    name = name.strip('-')
    
    # Add random suffix to ensure uniqueness
    suffix = random.randint(1000, 9999)
    return f"{name}-{suffix}"


async def seed_products():
    """Seed 100 products"""
    print("="*80)
    print("🌱 SEEDING PRODUCTS")
    print("="*80)
    
    conn = await get_conn()
    
    try:
        # Get existing categories
        async with conn.cursor() as cur:
            await cur.execute("SELECT id, name FROM categories")
            categories = {name: id for id, name in await cur.fetchall()}
        
        print(f"\n📁 Found {len(categories)} categories:")
        for cat_name in categories.keys():
            print(f"  - {cat_name}")
        
        total_products = 0
        
        # Generate products for each category
        for category_name, templates in PRODUCT_TEMPLATES.items():
            if category_name not in categories:
                print(f"\n⚠️  Category '{category_name}' not found, skipping...")
                continue
            
            category_id = categories[category_name]
            
            # Determine how many products for this category
            if "Bàn" in category_name:
                num_products = 10
            elif "Ghế" in category_name:
                num_products = 10
            else:
                num_products = 8
            
            print(f"\n📦 Generating {num_products} products for '{category_name}'...")
            
            for i in range(num_products):
                # Select random template
                template = random.choice(templates)
                
                # Generate product details
                brand_name = random.choice(BRANDS)
                brand_id = await get_or_create_brand(conn, brand_name)
                
                # Product name with model number
                model_num = f"{random.choice(['GL', 'GV', 'HF', 'FM', 'XH'])}-{random.randint(100, 999)}"
                product_name = f"{template['base_name']} {brand_name} {model_num}"
                
                # Dimensions
                width = random.randint(*template['width_range'])
                depth = random.randint(*template['depth_range'])
                height = random.randint(70, 120) if "Bàn" in category_name else random.randint(80, 130)
                
                # Material
                if "Bàn" in category_name:
                    material = random.choice(MATERIALS["bàn"])
                elif "Ghế" in category_name:
                    material = random.choice(MATERIALS["ghế"])
                else:
                    material = random.choice(MATERIALS["phụ kiện"])
                
                # Price
                base_price = random.randint(*template['price_range'])
                # Round to nearest 10,000
                base_price = round(base_price / 10000) * 10000
                
                # Sale price (30% products on sale)
                sale_price = None
                if random.random() < 0.3:
                    discount = random.choice([0.1, 0.15, 0.2, 0.25])
                    sale_price = int(base_price * (1 - discount))
                    sale_price = round(sale_price / 10000) * 10000
                
                # Generate description
                product_info = {
                    "name": product_name,
                    "category": category_name,
                    "brand": brand_name,
                    "width": width,
                    "depth": depth,
                    "height": height,
                    "material": material,
                    "price": base_price
                }
                
                print(f"  Generating description for: {product_name}...")
                description = await generate_product_description(product_info)
                
                # Create slug
                slug = create_slug(product_name)
                
                # Insert product
                async with conn.cursor() as cur:
                    await cur.execute("""
                        INSERT INTO products (
                            name, slug, description, category_id, brand_id,
                            status, is_featured, price, sale_price,
                            image_url, meta_title, meta_description,
                            view_count, created_at, updated_at
                        ) VALUES (
                            %s, %s, %s, %s, %s,
                            %s, %s, %s, %s,
                            %s, %s, %s,
                            %s, %s, %s
                        )
                    """, (
                        product_name, slug, description, category_id, brand_id,
                        'ACTIVE', random.random() < 0.2,  # 20% featured
                        Decimal(str(base_price)), Decimal(str(sale_price)) if sale_price else None,
                        f"https://via.placeholder.com/400x400?text={product_name[:20]}",
                        product_name, description[:160],
                        random.randint(0, 500), datetime.now(), datetime.now()
                    ))
                    
                    product_id = cur.lastrowid
                    
                    # Create 1-3 variants for this product
                    num_variants = random.randint(1, 3)
                    colors = random.sample(COLORS, min(num_variants, len(COLORS)))
                    
                    for color in colors:
                        # Slight variation in dimensions
                        var_width = width + random.randint(-5, 5)
                        var_depth = depth + random.randint(-5, 5)
                        var_height = height + random.randint(-3, 3)
                        
                        await cur.execute("""
                            INSERT INTO product_variants (
                                product_id, stock_quantity, min_stock_level, is_active,
                                width, depth, height, warranty, material,
                                weight_capacity, color, created_at, updated_at
                            ) VALUES (
                                %s, %s, %s, %s,
                                %s, %s, %s, %s, %s,
                                %s, %s, %s, %s
                            )
                        """, (
                            product_id, random.randint(5, 50), 5, True,
                            var_width, var_depth, var_height, "12 tháng", material,
                            Decimal(str(random.randint(50, 150))), color,
                            datetime.now(), datetime.now()
                        ))
                
                total_products += 1
                print(f"  ✅ Created: {product_name} ({num_variants} variants)")
        
        print(f"\n" + "="*80)
        print(f"✅ SEEDING COMPLETE!")
        print(f"="*80)
        print(f"\n📊 Summary:")
        print(f"  - Total products created: {total_products}")
        print(f"  - Brands: {len(BRANDS)}")
        print(f"  - Categories: {len(categories)}")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await release_conn(conn)


async def main():
    await seed_products()


if __name__ == "__main__":
    asyncio.run(main())
