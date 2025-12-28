#!/usr/bin/env python3
"""
Comprehensive System Integration Check
Kiểm tra đồng bộ giữa AI, Frontend, Backend và Database
"""

import sys
from pathlib import Path
import asyncio
import json
import requests
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent))

from core.db import get_conn, release_conn


async def check_backend_api():
    """Check Backend API endpoints"""
    print("=" * 80)
    print("🔍 BACKEND API CHECK")
    print("=" * 80)
    
    issues = []
    backend_url = "http://localhost:5000"
    
    # Test endpoints
    endpoints = [
        ("GET", "/api/products", "Products list"),
        ("GET", "/api/categories", "Categories list"),
        ("GET", "/api/brands", "Brands list"),
    ]
    
    for method, endpoint, description in endpoints:
        try:
            url = f"{backend_url}{endpoint}"
            print(f"\n📡 Testing: {method} {endpoint}")
            
            response = requests.get(url, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    print(f"   ✅ {description}: {len(data)} items")
                elif isinstance(data, dict):
                    print(f"   ✅ {description}: Response OK")
                else:
                    print(f"   ⚠️  {description}: Unexpected format")
            else:
                print(f"   ❌ {description}: Status {response.status_code}")
                issues.append((f"Backend {endpoint}", "HIGH", f"Status {response.status_code}"))
        
        except requests.exceptions.ConnectionError:
            print(f"   ❌ Backend not running on {backend_url}")
            issues.append(("Backend Connection", "CRITICAL", "Backend server not running"))
            break
        except Exception as e:
            print(f"   ❌ Error: {e}")
            issues.append((f"Backend {endpoint}", "MEDIUM", str(e)))
    
    return issues


async def check_ai_api():
    """Check AI API endpoints"""
    print("\n" + "=" * 80)
    print("🤖 AI API CHECK")
    print("=" * 80)
    
    issues = []
    ai_url = "http://localhost:8000"
    
    # Test health endpoint
    try:
        print(f"\n📡 Testing: GET /health")
        response = requests.get(f"{ai_url}/health", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Health check: {data.get('status')}")
        else:
            print(f"   ❌ Health check failed: {response.status_code}")
            issues.append(("AI Health", "HIGH", f"Status {response.status_code}"))
    
    except requests.exceptions.ConnectionError:
        print(f"   ❌ AI server not running on {ai_url}")
        issues.append(("AI Connection", "CRITICAL", "AI server not running"))
        return issues
    except Exception as e:
        print(f"   ❌ Error: {e}")
        issues.append(("AI Health", "MEDIUM", str(e)))
    
    # Test chat endpoint
    try:
        print(f"\n📡 Testing: POST /chat")
        response = requests.post(
            f"{ai_url}/chat",
            json={
                "message": "Bàn làm việc",
                "user_type": "user"
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print(f"   ✅ Chat endpoint: Working")
                print(f"   Agent: {data.get('agent_type')}")
            else:
                print(f"   ⚠️  Chat endpoint: Success=False")
                issues.append(("AI Chat", "MEDIUM", "Chat returned success=false"))
        else:
            print(f"   ❌ Chat endpoint failed: {response.status_code}")
            issues.append(("AI Chat", "HIGH", f"Status {response.status_code}"))
    
    except Exception as e:
        print(f"   ❌ Error: {e}")
        issues.append(("AI Chat", "MEDIUM", str(e)))
    
    return issues


async def check_data_consistency():
    """Check data consistency between DB and AI"""
    print("\n" + "=" * 80)
    print("🔄 DATA CONSISTENCY CHECK")
    print("=" * 80)
    
    issues = []
    conn = await get_conn()
    
    try:
        async with conn.cursor() as cur:
            # 1. Check products count
            print(f"\n1️⃣  Products Count")
            await cur.execute("SELECT COUNT(*) FROM products WHERE status = 'ACTIVE'")
            db_products = (await cur.fetchone())[0]
            print(f"   Database: {db_products} active products")
            
            # Check VectorDB
            import sqlite3
            chroma_db = Path(__file__).parent / ".chroma" / "chroma.sqlite3"
            if chroma_db.exists():
                vdb_conn = sqlite3.connect(str(chroma_db))
                cursor = vdb_conn.cursor()
                cursor.execute("""
                    SELECT COUNT(e.id)
                    FROM embeddings e
                    JOIN segments s ON e.segment_id = s.id
                    JOIN collections c ON s.collection = c.id
                    WHERE c.name = 'products'
                """)
                vdb_products = cursor.fetchone()[0]
                vdb_conn.close()
                
                print(f"   VectorDB: {vdb_products} products")
                
                if db_products != vdb_products:
                    print(f"   ⚠️  MISMATCH: DB ({db_products}) != VectorDB ({vdb_products})")
                    issues.append(("Product Sync", "HIGH", f"DB has {db_products}, VectorDB has {vdb_products}"))
                else:
                    print(f"   ✅ SYNCED")
            
            # 2. Check categories
            print(f"\n2️⃣  Categories")
            await cur.execute("SELECT COUNT(*) FROM categories WHERE is_active = 1")
            db_categories = (await cur.fetchone())[0]
            print(f"   Database: {db_categories} active categories")
            
            # Check categories with products
            await cur.execute("""
                SELECT COUNT(DISTINCT c.id)
                FROM categories c
                JOIN products p ON c.id = p.category_id
                WHERE c.is_active = 1 AND p.status = 'ACTIVE'
            """)
            categories_with_products = (await cur.fetchone())[0]
            print(f"   With products: {categories_with_products}")
            
            empty_categories = db_categories - categories_with_products
            if empty_categories > 0:
                print(f"   ⚠️  {empty_categories} categories have NO products")
                issues.append(("Empty Categories", "MEDIUM", f"{empty_categories} categories without products"))
            
            # 3. Check product data quality
            print(f"\n3️⃣  Product Data Quality")
            
            # Missing descriptions
            await cur.execute("""
                SELECT COUNT(*) FROM products 
                WHERE status = 'ACTIVE' 
                AND (description IS NULL OR description = '')
            """)
            missing_desc = (await cur.fetchone())[0]
            
            if missing_desc > 0:
                print(f"   ❌ {missing_desc} products missing descriptions")
                issues.append(("Missing Descriptions", "CRITICAL", f"{missing_desc} products need descriptions"))
            else:
                print(f"   ✅ All products have descriptions")
            
            # Missing prices
            await cur.execute("""
                SELECT COUNT(*) FROM products 
                WHERE status = 'ACTIVE' 
                AND (price IS NULL OR price <= 0)
            """)
            missing_price = (await cur.fetchone())[0]
            
            if missing_price > 0:
                print(f"   ❌ {missing_price} products missing prices")
                issues.append(("Missing Prices", "CRITICAL", f"{missing_price} products need prices"))
            else:
                print(f"   ✅ All products have prices")
            
            # Missing images
            await cur.execute("""
                SELECT COUNT(*) FROM products 
                WHERE status = 'ACTIVE' 
                AND (image_url IS NULL OR image_url = '')
            """)
            missing_image = (await cur.fetchone())[0]
            
            if missing_image > 0:
                print(f"   ⚠️  {missing_image} products missing images")
                issues.append(("Missing Images", "MEDIUM", f"{missing_image} products need images"))
            else:
                print(f"   ✅ All products have images")
            
            # 4. Check variants
            print(f"\n4️⃣  Product Variants")
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
                print(f"   ⚠️  {no_variants} products have NO variants")
                issues.append(("Missing Variants", "HIGH", f"{no_variants} products need variants"))
            else:
                print(f"   ✅ All products have variants")
    
    finally:
        await release_conn(conn)
    
    return issues


async def check_frontend_integration():
    """Check Frontend integration"""
    print("\n" + "=" * 80)
    print("🎨 FRONTEND INTEGRATION CHECK")
    print("=" * 80)
    
    issues = []
    frontend_url = "http://localhost:3000"
    
    try:
        print(f"\n📡 Testing: GET {frontend_url}")
        response = requests.get(frontend_url, timeout=5)
        
        if response.status_code == 200:
            print(f"   ✅ Frontend running")
            
            # Check if it's loading React
            if "react" in response.text.lower() or "root" in response.text:
                print(f"   ✅ React app detected")
            else:
                print(f"   ⚠️  React app not detected")
        else:
            print(f"   ❌ Frontend returned {response.status_code}")
            issues.append(("Frontend", "HIGH", f"Status {response.status_code}"))
    
    except requests.exceptions.ConnectionError:
        print(f"   ❌ Frontend not running on {frontend_url}")
        issues.append(("Frontend Connection", "CRITICAL", "Frontend server not running"))
    except Exception as e:
        print(f"   ❌ Error: {e}")
        issues.append(("Frontend", "MEDIUM", str(e)))
    
    # Check for chatbot component
    frontend_path = Path(__file__).parent.parent / "frontend" / "src"
    if frontend_path.exists():
        print(f"\n📁 Checking Frontend files...")
        
        # Look for chatbot components
        chatbot_files = list(frontend_path.rglob("*[Cc]hatbot*.jsx")) + \
                       list(frontend_path.rglob("*[Cc]hatbot*.js"))
        
        if chatbot_files:
            print(f"   ✅ Found {len(chatbot_files)} chatbot component(s)")
            for f in chatbot_files[:3]:
                print(f"      - {f.relative_to(frontend_path)}")
        else:
            print(f"   ⚠️  No chatbot components found")
            issues.append(("Frontend Chatbot", "MEDIUM", "No chatbot UI components found"))
    
    return issues


async def check_api_contracts():
    """Check API contracts between FE, BE, AI"""
    print("\n" + "=" * 80)
    print("📋 API CONTRACT CHECK")
    print("=" * 80)
    
    issues = []
    
    # Check if Backend returns data in expected format
    try:
        print(f"\n1️⃣  Backend Product Format")
        response = requests.get("http://localhost:5000/api/products", timeout=5)
        
        if response.status_code == 200:
            products = response.json()
            if products and len(products) > 0:
                sample = products[0]
                required_fields = ["id", "name", "price", "slug"]
                
                missing = [f for f in required_fields if f not in sample]
                if missing:
                    print(f"   ⚠️  Missing fields: {missing}")
                    issues.append(("Backend Product Format", "MEDIUM", f"Missing: {missing}"))
                else:
                    print(f"   ✅ Product format OK")
                    print(f"   Fields: {list(sample.keys())[:10]}")
        else:
            print(f"   ⚠️  Cannot check (status {response.status_code})")
    except Exception as e:
        print(f"   ⚠️  Cannot check: {e}")
    
    # Check AI response format
    try:
        print(f"\n2️⃣  AI Response Format")
        response = requests.post(
            "http://localhost:8000/chat",
            json={"message": "test", "user_type": "user"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ["success", "response", "agent_type"]
            
            missing = [f for f in required_fields if f not in data]
            if missing:
                print(f"   ⚠️  Missing fields: {missing}")
                issues.append(("AI Response Format", "MEDIUM", f"Missing: {missing}"))
            else:
                print(f"   ✅ AI response format OK")
                print(f"   Fields: {list(data.keys())}")
        else:
            print(f"   ⚠️  Cannot check (status {response.status_code})")
    except Exception as e:
        print(f"   ⚠️  Cannot check: {e}")
    
    return issues


async def main():
    """Main check function"""
    print("\n" + "=" * 80)
    print("🔍 COMPREHENSIVE SYSTEM INTEGRATION CHECK")
    print("=" * 80)
    print(f"\nChecking AI ↔ Frontend ↔ Backend ↔ Database integration...")
    print(f"Timestamp: {datetime.now().isoformat()}\n")
    
    all_issues = []
    
    # Run all checks
    backend_issues = await check_backend_api()
    all_issues.extend(backend_issues)
    
    ai_issues = await check_ai_api()
    all_issues.extend(ai_issues)
    
    data_issues = await check_data_consistency()
    all_issues.extend(data_issues)
    
    frontend_issues = await check_frontend_integration()
    all_issues.extend(frontend_issues)
    
    contract_issues = await check_api_contracts()
    all_issues.extend(contract_issues)
    
    # Summary
    print("\n" + "=" * 80)
    print("📊 INTEGRATION SUMMARY")
    print("=" * 80)
    
    critical = [i for i in all_issues if i[1] == "CRITICAL"]
    high = [i for i in all_issues if i[1] == "HIGH"]
    medium = [i for i in all_issues if i[1] == "MEDIUM"]
    low = [i for i in all_issues if i[1] == "LOW"]
    
    print(f"\n🔴 CRITICAL Issues: {len(critical)}")
    for issue, severity, fix in critical:
        print(f"   - {issue}: {fix}")
    
    print(f"\n🟠 HIGH Issues: {len(high)}")
    for issue, severity, fix in high:
        print(f"   - {issue}: {fix}")
    
    print(f"\n🟡 MEDIUM Issues: {len(medium)}")
    for issue, severity, fix in medium[:5]:
        print(f"   - {issue}: {fix}")
    if len(medium) > 5:
        print(f"   ... and {len(medium) - 5} more")
    
    # Overall score
    total_issues = len(all_issues)
    critical_weight = len(critical) * 10
    high_weight = len(high) * 5
    medium_weight = len(medium) * 2
    low_weight = len(low) * 1
    
    total_weight = critical_weight + high_weight + medium_weight + low_weight
    max_weight = 100
    
    score = max(0, 100 - total_weight)
    
    print(f"\n{'=' * 80}")
    print(f"🎯 OVERALL INTEGRATION SCORE: {score}/100")
    print(f"{'=' * 80}")
    
    if score >= 90:
        print(f"\n✅ EXCELLENT - System is well integrated")
    elif score >= 70:
        print(f"\n✅ GOOD - Minor issues to fix")
    elif score >= 50:
        print(f"\n⚠️  FAIR - Several issues need attention")
    else:
        print(f"\n❌ POOR - Critical issues must be fixed")
    
    print(f"\n📝 Total Issues Found: {total_issues}")
    print(f"   - CRITICAL: {len(critical)}")
    print(f"   - HIGH: {len(high)}")
    print(f"   - MEDIUM: {len(medium)}")
    print(f"   - LOW: {len(low)}")
    
    print("\n" + "=" * 80)
    print("✅ CHECK COMPLETED")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
