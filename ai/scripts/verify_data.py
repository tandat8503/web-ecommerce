#!/usr/bin/env python3
"""
Verify all seeded data
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from core.db import get_conn, release_conn


async def verify_data():
    """Verify all seeded data"""
    print("="*80)
    print("🔍 VERIFYING SEEDED DATA")
    print("="*80)
    
    conn = await get_conn()
    
    try:
        async with conn.cursor() as cur:
            # Products
            await cur.execute("SELECT COUNT(*) FROM products WHERE status = 'ACTIVE'")
            products = (await cur.fetchone())[0]
            
            # Users
            await cur.execute("SELECT COUNT(*) FROM users WHERE role = 'ADMIN'")
            admins = (await cur.fetchone())[0]
            
            await cur.execute("SELECT COUNT(*) FROM users WHERE role = 'CUSTOMER'")
            customers = (await cur.fetchone())[0]
            
            # Addresses
            await cur.execute("SELECT COUNT(*) FROM addresses")
            addresses = (await cur.fetchone())[0]
            
            # Orders
            await cur.execute("SELECT COUNT(*) FROM orders")
            orders = (await cur.fetchone())[0]
            
            await cur.execute("SELECT COUNT(*) FROM orders WHERE payment_method = 'COD'")
            cod_orders = (await cur.fetchone())[0]
            
            await cur.execute("SELECT COUNT(*) FROM orders WHERE payment_method = 'VNPAY'")
            vnpay_orders = (await cur.fetchone())[0]
            
            # Reviews
            await cur.execute("SELECT COUNT(*) FROM product_reviews")
            reviews = (await cur.fetchone())[0]
            
            # Comments
            await cur.execute("SELECT COUNT(*) FROM product_comments")
            comments = (await cur.fetchone())[0]
            
            # Revenue
            await cur.execute("SELECT SUM(total_amount) FROM orders WHERE status = 'DELIVERED'")
            revenue = (await cur.fetchone())[0] or 0
        
        print(f"\n📊 DATA SUMMARY:")
        print(f"\n👥 Users:")
        print(f"  - Admins: {admins}")
        print(f"  - Customers: {customers}")
        print(f"  - Total: {admins + customers}")
        
        print(f"\n🏠 Addresses: {addresses}")
        
        print(f"\n📦 Products: {products}")
        
        print(f"\n🛒 Orders: {orders}")
        print(f"  - COD: {cod_orders} ({cod_orders/orders*100:.1f}%)")
        print(f"  - VNPAY: {vnpay_orders} ({vnpay_orders/orders*100:.1f}%)")
        
        print(f"\n⭐ Reviews: {reviews}")
        print(f"\n💬 Comments: {comments}")
        
        print(f"\n💰 Revenue (Delivered): {revenue:,.0f} VNĐ")
        
        print(f"\n" + "="*80)
        print(f"✅ DATA VERIFICATION COMPLETE!")
        print(f"="*80)
        
        # Check if ready
        ready = True
        issues = []
        
        if products < 100:
            issues.append(f"Products: {products} (expected: 100+)")
            ready = False
        
        if admins + customers < 50:
            issues.append(f"Users: {admins + customers} (expected: 50+)")
            ready = False
        
        if orders < 100:
            issues.append(f"Orders: {orders} (expected: 100+)")
            ready = False
        
        if ready:
            print(f"\n🎉 ALL DATA READY FOR:")
            print(f"  ✅ Dashboard testing")
            print(f"  ✅ AI Chatbot")
            print(f"  ✅ Demo presentation")
        else:
            print(f"\n⚠️  Issues found:")
            for issue in issues:
                print(f"  - {issue}")
        
    finally:
        await release_conn(conn)


async def main():
    await verify_data()


if __name__ == "__main__":
    asyncio.run(main())
