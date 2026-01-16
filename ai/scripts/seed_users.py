#!/usr/bin/env python3
"""
Seed Users - Create 50 realistic users with addresses
"""
import asyncio
import sys
import random
import bcrypt
from pathlib import Path
from datetime import datetime, timedelta

sys.path.insert(0, str(Path(__file__).parent.parent))

from core.db import get_conn, release_conn

# Vietnamese names
FIRST_NAMES = [
    "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Phan", "Vũ", "Võ", "Đặng", "Bùi",
    "Đỗ", "Hồ", "Ngô", "Dương", "Lý", "Đinh", "Trương", "Huỳnh", "Lương", "Tô"
]

MIDDLE_NAMES = ["Văn", "Thị", "Hữu", "Đức", "Minh", "Thanh", "Quốc", "Công", "Anh", ""]

LAST_NAMES_MALE = [
    "Hùng", "Dũng", "Tùng", "Kiên", "Khoa", "Long", "Nam", "Phong", "Quân", "Thành",
    "Tuấn", "Việt", "Hoàng", "Hải", "Minh", "Đạt", "Thắng", "Cường", "Bình", "Tân"
]

LAST_NAMES_FEMALE = [
    "Hoa", "Lan", "Mai", "Hương", "Linh", "Nga", "Trang", "Thảo", "Phương", "Hà",
    "Nhung", "Dung", "Hằng", "Vân", "Châu", "Yến", "Ngọc", "Anh", "Thu", "Huyền"
]

CITIES = [
    {"name": "Hà Nội", "districts": ["Hoàn Kiếm", "Ba Đình", "Đống Đa", "Hai Bà Trưng", "Cầu Giấy"]},
    {"name": "TP. Hồ Chí Minh", "districts": ["Quận 1", "Quận 3", "Quận 5", "Quận 7", "Bình Thạnh"]},
    {"name": "Đà Nẵng", "districts": ["Hải Châu", "Thanh Khê", "Sơn Trà", "Ngũ Hành Sơn", "Liên Chiểu"]},
]

STREETS = [
    "Nguyễn Trãi", "Lê Lợi", "Trần Hưng Đạo", "Hai Bà Trưng", "Lý Thường Kiệt",
    "Hoàng Diệu", "Phan Đình Phùng", "Nguyễn Huệ", "Điện Biên Phủ", "Võ Văn Tần"
]


def generate_vietnamese_name(is_male=True):
    """Generate realistic Vietnamese name"""
    first = random.choice(FIRST_NAMES)
    middle = random.choice(MIDDLE_NAMES)
    last = random.choice(LAST_NAMES_MALE if is_male else LAST_NAMES_FEMALE)
    
    if middle:
        return first, f"{middle} {last}"
    return first, last


def generate_email(first_name, last_name):
    """Generate email from name"""
    # Remove Vietnamese accents for email
    import unicodedata
    
    def remove_accents(text):
        nfkd = unicodedata.normalize('NFKD', text)
        return ''.join([c for c in nfkd if not unicodedata.combining(c)])
    
    first_clean = remove_accents(first_name).lower().replace(" ", "")
    last_clean = remove_accents(last_name).lower().replace(" ", "")
    
    domains = ["gmail.com", "yahoo.com", "outlook.com", "email.com"]
    
    patterns = [
        f"{last_clean}.{first_clean}",
        f"{first_clean}{last_clean}",
        f"{last_clean}{random.randint(1990, 2005)}",
    ]
    
    email = random.choice(patterns) + "@" + random.choice(domains)
    return email


def generate_phone():
    """Generate Vietnamese phone number"""
    prefixes = ["09", "08", "07", "03"]
    return random.choice(prefixes) + "".join([str(random.randint(0, 9)) for _ in range(8)])


def generate_address():
    """Generate Vietnamese address"""
    city_data = random.choice(CITIES)
    district = random.choice(city_data["districts"])
    street = random.choice(STREETS)
    number = random.randint(1, 500)
    
    return {
        "street_address": f"{number} {street}",
        "ward": f"Phường {random.randint(1, 20)}",
        "district": district,
        "city": city_data["name"]
    }


async def seed_users():
    """Seed 50 users"""
    print("="*80)
    print("👥 SEEDING USERS")
    print("="*80)
    
    conn = await get_conn()
    
    try:
        # Create 2 admin users first
        print("\n👨‍💼 Creating admin users...")
        
        admins = [
            {
                "email": "admin@noithatvp.com",
                "password": "Admin@123",
                "first_name": "Admin",
                "last_name": "System",
                "phone": "0901234567",
                "role": "ADMIN"
            },
            {
                "email": "tandat@noithatvp.com",
                "password": "Admin@123",
                "first_name": "Tân",
                "last_name": "Đạt",
                "phone": "0901234568",
                "role": "ADMIN"
            }
        ]
        
        for admin in admins:
            # Hash password
            hashed = bcrypt.hashpw(admin["password"].encode(), bcrypt.gensalt())
            
            async with conn.cursor() as cur:
                await cur.execute("""
                    INSERT INTO users (
                        email, password, first_name, last_name, phone,
                        role, is_active, is_verified, email_verified_at,
                        created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    admin["email"], hashed.decode(), admin["first_name"], admin["last_name"],
                    admin["phone"], admin["role"], True, True, datetime.now(),
                    datetime.now(), datetime.now()
                ))
                
                print(f"  ✅ Created admin: {admin['email']}")
        
        # Create 48 customer users
        print(f"\n👨‍👩‍👧‍👦 Creating 48 customer users...")
        
        created_users = []
        
        for i in range(48):
            is_male = random.choice([True, False])
            first_name, last_name = generate_vietnamese_name(is_male)
            email = generate_email(first_name, last_name)
            phone = generate_phone()
            
            # 80% verified, 20% unverified
            is_verified = random.random() < 0.8
            email_verified_at = datetime.now() - timedelta(days=random.randint(1, 180)) if is_verified else None
            
            # Hash password (default: User@123)
            hashed = bcrypt.hashpw("User@123".encode(), bcrypt.gensalt())
            
            async with conn.cursor() as cur:
                await cur.execute("""
                    INSERT INTO users (
                        email, password, first_name, last_name, phone,
                        role, is_active, is_verified, email_verified_at,
                        last_login_at, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    email, hashed.decode(), first_name, last_name, phone,
                    'CUSTOMER', True, is_verified, email_verified_at,
                    datetime.now() - timedelta(days=random.randint(0, 30)) if is_verified else None,
                    datetime.now() - timedelta(days=random.randint(30, 180)),
                    datetime.now()
                ))
                
                user_id = cur.lastrowid
                created_users.append({
                    "id": user_id,
                    "email": email,
                    "first_name": first_name,
                    "last_name": last_name,
                    "phone": phone
                })
                
                if (i + 1) % 10 == 0:
                    print(f"  ✅ Created {i + 1}/48 users...")
        
        print(f"  ✅ Created all 48 customer users!")
        
        # Create addresses for 70% of users
        print(f"\n🏠 Creating addresses...")
        
        users_with_addresses = random.sample(created_users, int(len(created_users) * 0.7))
        total_addresses = 0
        
        for user in users_with_addresses:
            # Each user has 1-2 addresses
            num_addresses = random.randint(1, 2)
            
            for j in range(num_addresses):
                addr = generate_address()
                is_default = (j == 0)  # First address is default
                
                async with conn.cursor() as cur:
                    await cur.execute("""
                        INSERT INTO addresses (
                            user_id, full_name, phone, street_address,
                            ward, district, city, address_type, is_default,
                            created_at, updated_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        user["id"], f"{user['first_name']} {user['last_name']}",
                        user["phone"], addr["street_address"], addr["ward"],
                        addr["district"], addr["city"],
                        random.choice(['HOME', 'OFFICE']), is_default,
                        datetime.now(), datetime.now()
                    ))
                    
                    total_addresses += 1
        
        print(f"  ✅ Created {total_addresses} addresses for {len(users_with_addresses)} users")
        
        # Summary
        print(f"\n" + "="*80)
        print(f"✅ SEEDING COMPLETE!")
        print(f"="*80)
        print(f"\n📊 Summary:")
        print(f"  - Admin users: 2")
        print(f"  - Customer users: 48")
        print(f"  - Total users: 50")
        print(f"  - Users with addresses: {len(users_with_addresses)}")
        print(f"  - Total addresses: {total_addresses}")
        print(f"\n🔑 Login credentials:")
        print(f"  - Admin: admin@noithatvp.com / Admin@123")
        print(f"  - Admin: tandat@noithatvp.com / Admin@123")
        print(f"  - Customers: [any email] / User@123")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await release_conn(conn)


async def main():
    await seed_users()


if __name__ == "__main__":
    asyncio.run(main())
