#!/usr/bin/env python3
"""
Master script to run all seeding scripts in order
"""
import asyncio
import subprocess
import sys
from pathlib import Path

SCRIPTS = [
    ("seed_users.py", "👥 Users & Addresses"),
    ("seed_orders.py", "🛒 Orders & Payments"),
    ("seed_reviews.py", "⭐ Reviews & Comments"),
]


async def run_script(script_name, description):
    """Run a seeding script"""
    print(f"\n{'='*80}")
    print(f"🚀 Running: {description}")
    print(f"{'='*80}\n")
    
    script_path = Path(__file__).parent / script_name
    
    result = subprocess.run(
        [sys.executable, str(script_path)],
        capture_output=False,
        text=True
    )
    
    if result.returncode != 0:
        print(f"\n❌ Failed to run {script_name}")
        return False
    
    return True


async def main():
    print("="*80)
    print("🌱 MASTER SEEDING SCRIPT")
    print("="*80)
    print(f"\nThis will seed:")
    print(f"  - 50 users (2 admins + 48 customers)")
    print(f"  - 100 orders (COD 60% + VNPAY 40%)")
    print(f"  - 200 reviews with admin replies")
    print(f"\n⚠️  Note: Products already seeded (130 products)")
    print(f"\n{'='*80}\n")
    
    input("Press Enter to continue...")
    
    for script_name, description in SCRIPTS:
        success = await run_script(script_name, description)
        if not success:
            print(f"\n❌ Seeding failed at: {script_name}")
            return
    
    print(f"\n{'='*80}")
    print(f"🎉 ALL SEEDING COMPLETE!")
    print(f"{'='*80}")
    print(f"\n📊 Final Summary:")
    print(f"  ✅ Products: 130")
    print(f"  ✅ Users: 50 (2 admins + 48 customers)")
    print(f"  ✅ Orders: 100 (COD 60% + VNPAY 40%)")
    print(f"  ✅ Reviews: ~200")
    print(f"\n🔑 Admin Login:")
    print(f"  - Email: admin@noithatvp.com")
    print(f"  - Password: Admin@123")
    print(f"\n🎯 Ready for:")
    print(f"  - Dashboard testing")
    print(f"  - AI Chatbot")
    print(f"  - Demo presentation")


if __name__ == "__main__":
    asyncio.run(main())
