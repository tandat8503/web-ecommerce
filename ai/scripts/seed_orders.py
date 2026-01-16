#!/usr/bin/env python3
"""
Seed Orders - 100 orders with COD 60% + VNPAY 40%
"""
import asyncio
import sys
import random
from pathlib import Path
from datetime import datetime, timedelta
from decimal import Decimal
import json

sys.path.insert(0, str(Path(__file__).parent.parent))

from core.db import get_conn, release_conn

ORDER_STATUSES = {
    'PENDING': 0.10,
    'CONFIRMED': 0.15,
    'PROCESSING': 0.20,
    'DELIVERED': 0.50,
    'CANCELLED': 0.05
}

PAYMENT_METHODS = {
    'COD': 0.60,
    'VNPAY': 0.40
}


async def seed_orders():
    """Seed 100 orders"""
    print("="*80)
    print("🛒 SEEDING ORDERS")
    print("="*80)
    
    conn = await get_conn()
    
    try:
        # Get users (customers only)
        async with conn.cursor() as cur:
            await cur.execute("SELECT id FROM users WHERE role = 'CUSTOMER' LIMIT 30")
            user_ids = [row[0] for row in await cur.fetchall()]
            
            # Get products with variants
            await cur.execute("""
                SELECT p.id, p.name, p.price, p.sale_price, pv.id as variant_id
                FROM products p
                INNER JOIN product_variants pv ON p.id = pv.product_id
                WHERE p.status = 'ACTIVE' AND pv.stock_quantity > 0
                LIMIT 100
            """)
            products = await cur.fetchall()
        
        print(f"\n📊 Found {len(user_ids)} users and {len(products)} products")
        print(f"\n📦 Creating 100 orders...")
        
        # Generate orders over last 6 months
        end_date = datetime.now()
        start_date = end_date - timedelta(days=180)
        
        order_count = {'COD': 0, 'VNPAY': 0}
        status_count = {status: 0 for status in ORDER_STATUSES.keys()}
        
        for i in range(100):
            # Random user
            user_id = random.choice(user_ids)
            
            # Random date in last 6 months
            days_ago = random.randint(0, 180)
            order_date = end_date - timedelta(days=days_ago)
            
            # Payment method (60% COD, 40% VNPAY)
            payment_method = 'COD' if random.random() < 0.60 else 'VNPAY'
            order_count[payment_method] += 1
            
            # Order status (weighted random)
            status = random.choices(
                list(ORDER_STATUSES.keys()),
                weights=list(ORDER_STATUSES.values())
            )[0]
            status_count[status] += 1
            
            # Payment status
            if status == 'DELIVERED':
                payment_status = 'PAID'
            elif status == 'CANCELLED':
                payment_status = 'FAILED' if payment_method == 'VNPAY' else 'PENDING'
            else:
                payment_status = 'PAID' if payment_method == 'VNPAY' and status != 'PENDING' else 'PENDING'
            
            # Order items (1-3 products)
            num_items = random.randint(1, 3)
            selected_products = random.sample(products, min(num_items, len(products)))
            
            subtotal = Decimal('0')
            order_items = []
            
            for prod in selected_products:
                prod_id, prod_name, price, sale_price, variant_id = prod
                final_price = sale_price if sale_price else price
                quantity = random.randint(1, 2)
                item_total = Decimal(str(final_price)) * quantity
                
                subtotal += item_total
                order_items.append({
                    'product_id': prod_id,
                    'variant_id': variant_id,
                    'product_name': prod_name,
                    'quantity': quantity,
                    'unit_price': Decimal(str(final_price)),
                    'total_price': item_total
                })
            
            # Shipping fee
            shipping_fee = Decimal('30000') if subtotal < 1000000 else Decimal('0')
            
            # Total
            total_amount = subtotal + shipping_fee
            
            # Order number
            order_number = f"ORD{order_date.strftime('%Y%m%d')}{random.randint(1000, 9999)}"
            
            # Shipping address (mock)
            shipping_address = json.dumps({
                "fullName": "Nguyễn Văn A",
                "phone": "0901234567",
                "address": "123 Nguyễn Trãi, P.1, Q.5, TP.HCM"
            })
            
            # Insert order
            async with conn.cursor() as cur:
                await cur.execute("""
                    INSERT INTO orders (
                        order_number, user_id, status, payment_status,
                        subtotal, shipping_fee, discount_amount, total_amount,
                        shipping_address, payment_method,
                        created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    order_number, user_id, status, payment_status,
                    subtotal, shipping_fee, Decimal('0'), total_amount,
                    shipping_address, payment_method,
                    order_date, order_date
                ))
                
                order_id = cur.lastrowid
                
                # Insert order items
                for item in order_items:
                    await cur.execute("""
                        INSERT INTO order_items (
                            order_id, product_id, variant_id, product_name,
                            product_sku, quantity, unit_price, total_price,
                            created_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        order_id, item['product_id'], item['variant_id'],
                        item['product_name'], f"SKU{item['product_id']}",
                        item['quantity'], item['unit_price'], item['total_price'],
                        order_date
                    ))
                
                # Insert payment record for VNPAY
                if payment_method == 'VNPAY':
                    transaction_id = f"VNP{order_date.strftime('%Y%m%d%H%M%S')}{random.randint(1000, 9999)}"
                    
                    await cur.execute("""
                        INSERT INTO payments (
                            order_id, payment_method, payment_status, amount,
                            transaction_id, paid_at, created_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (
                        order_id, 'VNPAY', payment_status, total_amount,
                        transaction_id,
                        order_date if payment_status == 'PAID' else None,
                        order_date
                    ))
            
            if (i + 1) % 20 == 0:
                print(f"  ✅ Created {i + 1}/100 orders...")
        
        print(f"\n" + "="*80)
        print(f"✅ SEEDING COMPLETE!")
        print(f"="*80)
        print(f"\n📊 Summary:")
        print(f"  - Total orders: 100")
        print(f"  - COD orders: {order_count['COD']} (60%)")
        print(f"  - VNPAY orders: {order_count['VNPAY']} (40%)")
        print(f"\n📈 Status distribution:")
        for status, count in status_count.items():
            print(f"  - {status}: {count}")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await release_conn(conn)


async def main():
    await seed_orders()


if __name__ == "__main__":
    asyncio.run(main())
