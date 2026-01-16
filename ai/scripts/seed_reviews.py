#!/usr/bin/env python3
"""
Seed Reviews & Comments - 200 reviews with admin replies
"""
import asyncio
import sys
import random
from pathlib import Path
from datetime import datetime, timedelta

sys.path.insert(0, str(Path(__file__).parent.parent))

from core.db import get_conn, release_conn

REVIEW_TEMPLATES = {
    5: [
        "Sản phẩm rất tốt, chất lượng vượt mong đợi!",
        "Giao hàng nhanh, đóng gói cẩn thận. Sản phẩm đẹp như hình!",
        "Chất liệu tốt, lắp ráp dễ dàng. Rất hài lòng!",
        "Thiết kế đẹp, chắc chắn. Đáng đồng tiền bát gạo!",
    ],
    4: [
        "Sản phẩm tốt nhưng giao hơi lâu.",
        "Chất lượng ok, giá hơi cao một chút.",
        "Đẹp nhưng lắp ráp hơi khó.",
    ],
    3: [
        "Tạm được, giá hơi cao so với chất lượng.",
        "Sản phẩm bình thường, không có gì đặc biệt.",
    ],
}

ADMIN_REPLIES = [
    "Cảm ơn anh/chị đã tin tưởng sử dụng sản phẩm của shop! ❤️",
    "Shop rất vui khi anh/chị hài lòng với sản phẩm. Cảm ơn anh/chị!",
    "Cảm ơn anh/chị đã đánh giá! Shop sẽ cải thiện để phục vụ tốt hơn.",
]


async def seed_reviews():
    """Seed 200 reviews"""
    print("="*80)
    print("⭐ SEEDING REVIEWS & COMMENTS")
    print("="*80)
    
    conn = await get_conn()
    
    try:
        # Get delivered orders
        async with conn.cursor() as cur:
            await cur.execute("""
                SELECT o.id, o.user_id, oi.product_id
                FROM orders o
                INNER JOIN order_items oi ON o.id = oi.order_id
                WHERE o.status = 'DELIVERED'
                LIMIT 200
            """)
            orders = await cur.fetchall()
            
            # Get admin user
            await cur.execute("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1")
            admin_id = (await cur.fetchone())[0]
        
        print(f"\n📊 Found {len(orders)} delivered orders")
        print(f"\n⭐ Creating reviews...")
        
        review_count = 0
        comment_count = 0
        
        for order_id, user_id, product_id in orders:
            # Rating distribution (50% 5-star, 30% 4-star, 15% 3-star, 5% 1-2 star)
            rating = random.choices([5, 4, 3, 2, 1], weights=[50, 30, 15, 4, 1])[0]
            
            # Review content
            if rating in REVIEW_TEMPLATES:
                comment = random.choice(REVIEW_TEMPLATES[rating])
            else:
                comment = "Sản phẩm không như mong đợi."
            
            # Insert review
            async with conn.cursor() as cur:
                await cur.execute("""
                    INSERT INTO product_reviews (
                        product_id, user_id, order_id, rating,
                        comment, is_approved, is_verified,
                        created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    product_id, user_id, order_id, rating,
                    comment, True, True,
                    datetime.now() - timedelta(days=random.randint(0, 60)),
                    datetime.now()
                ))
                
                review_count += 1
                
                # 50% chance admin replies to 5-star reviews
                if rating == 5 and random.random() < 0.5:
                    await cur.execute("""
                        INSERT INTO product_comments (
                            user_id, product_id, content, is_approved,
                            created_at, updated_at
                        ) VALUES (%s, %s, %s, %s, %s, %s)
                    """, (
                        admin_id, product_id, random.choice(ADMIN_REPLIES), True,
                        datetime.now() - timedelta(days=random.randint(0, 30)),
                        datetime.now()
                    ))
                    comment_count += 1
            
            if review_count % 50 == 0:
                print(f"  ✅ Created {review_count} reviews...")
        
        print(f"\n" + "="*80)
        print(f"✅ SEEDING COMPLETE!")
        print(f"="*80)
        print(f"\n📊 Summary:")
        print(f"  - Total reviews: {review_count}")
        print(f"  - Admin replies: {comment_count}")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await release_conn(conn)


async def main():
    await seed_reviews()


if __name__ == "__main__":
    asyncio.run(main())
