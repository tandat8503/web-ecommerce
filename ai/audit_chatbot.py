#!/usr/bin/env python3
"""
Comprehensive AI Chatbot Security & Quality Audit
Kiểm tra toàn diện các lỗ hổng của AI Chatbot
"""

import sys
from pathlib import Path
import asyncio
import json

sys.path.insert(0, str(Path(__file__).parent))

from core.db import get_conn, release_conn


async def check_security_vulnerabilities():
    """Check security vulnerabilities"""
    print("=" * 80)
    print("🔒 SECURITY VULNERABILITIES CHECK")
    print("=" * 80)
    
    issues = []
    
    # 1. SQL Injection
    print("\n1️⃣  SQL Injection Protection")
    print("   Checking if queries use parameterized statements...")
    
    # Check mcps/helpers.py for SQL injection
    helpers_file = Path(__file__).parent / "mcps" / "helpers.py"
    if helpers_file.exists():
        content = helpers_file.read_text()
        
        # Look for string formatting in SQL
        dangerous_patterns = [
            'f"SELECT',
            'f"INSERT',
            'f"UPDATE',
            'f"DELETE',
            '% "SELECT',
            '% "INSERT',
        ]
        
        found_issues = []
        for pattern in dangerous_patterns:
            if pattern in content:
                found_issues.append(pattern)
        
        if found_issues:
            print(f"   ⚠️  Found potential SQL injection risks:")
            for issue in found_issues[:3]:
                print(f"      - {issue}")
            issues.append(("SQL Injection", "HIGH", "Use parameterized queries"))
        else:
            print(f"   ✅ No obvious SQL injection patterns found")
    
    # 2. Input Validation
    print("\n2️⃣  Input Validation")
    print("   Checking if user input is validated...")
    
    app_file = Path(__file__).parent / "app.py"
    if app_file.exists():
        content = app_file.read_text()
        
        # Check for input sanitization
        if "sanitize" not in content.lower() and "validate" not in content.lower():
            print(f"   ⚠️  No input sanitization/validation found")
            issues.append(("Input Validation", "MEDIUM", "Add input sanitization"))
        else:
            print(f"   ✅ Input validation present")
    
    # 3. Rate Limiting
    print("\n3️⃣  Rate Limiting")
    print("   Checking if API has rate limiting...")
    
    if app_file.exists():
        content = app_file.read_text()
        
        if "rate_limit" not in content.lower() and "ratelimit" not in content.lower():
            print(f"   ❌ No rate limiting found")
            issues.append(("Rate Limiting", "HIGH", "Add rate limiting to prevent abuse"))
        else:
            print(f"   ✅ Rate limiting present")
    
    # 4. API Key Exposure
    print("\n4️⃣  API Key Security")
    print("   Checking if API keys are properly secured...")
    
    env_file = Path(__file__).parent / ".env"
    if env_file.exists():
        print(f"   ✅ Using .env file for secrets")
        
        # Check if .env is in .gitignore
        gitignore = Path(__file__).parent / ".gitignore"
        if gitignore.exists():
            if ".env" in gitignore.read_text():
                print(f"   ✅ .env is in .gitignore")
            else:
                print(f"   ⚠️  .env not in .gitignore")
                issues.append(("API Key Exposure", "CRITICAL", "Add .env to .gitignore"))
        else:
            print(f"   ⚠️  No .gitignore found")
            issues.append(("API Key Exposure", "HIGH", "Create .gitignore"))
    
    # 5. CORS Configuration
    print("\n5️⃣  CORS Configuration")
    if app_file.exists():
        content = app_file.read_text()
        
        if 'allow_origins=["*"]' in content or "allow_origins=['*']" in content:
            print(f"   ⚠️  CORS allows all origins (allow_origins=['*'])")
            issues.append(("CORS", "MEDIUM", "Restrict CORS to specific origins"))
        else:
            print(f"   ✅ CORS properly configured")
    
    # 6. Error Handling
    print("\n6️⃣  Error Handling")
    print("   Checking if errors are properly handled...")
    
    if app_file.exists():
        content = app_file.read_text()
        
        # Count try-except blocks
        try_count = content.count("try:")
        except_count = content.count("except")
        
        if try_count > 0 and except_count > 0:
            print(f"   ✅ Error handling present ({try_count} try blocks)")
        else:
            print(f"   ⚠️  Limited error handling")
            issues.append(("Error Handling", "MEDIUM", "Add comprehensive error handling"))
    
    return issues


async def check_data_quality_issues():
    """Check data quality issues"""
    print("\n" + "=" * 80)
    print("📊 DATA QUALITY ISSUES")
    print("=" * 80)
    
    issues = []
    conn = await get_conn()
    
    try:
        async with conn.cursor() as cur:
            # 1. Missing descriptions
            await cur.execute("""
                SELECT COUNT(*) FROM products 
                WHERE status = 'ACTIVE' 
                AND (description IS NULL OR description = '')
            """)
            missing_desc = (await cur.fetchone())[0]
            
            if missing_desc > 0:
                print(f"\n1️⃣  Missing Product Descriptions")
                print(f"   ❌ {missing_desc} products missing descriptions")
                issues.append(("Missing Descriptions", "CRITICAL", f"Add descriptions for {missing_desc} products"))
            else:
                print(f"\n1️⃣  Product Descriptions")
                print(f"   ✅ All products have descriptions")
            
            # 2. Price inconsistencies
            await cur.execute("""
                SELECT COUNT(*) FROM products 
                WHERE status = 'ACTIVE' 
                AND sale_price IS NOT NULL 
                AND sale_price >= price
            """)
            bad_prices = (await cur.fetchone())[0]
            
            print(f"\n2️⃣  Price Consistency")
            if bad_prices > 0:
                print(f"   ⚠️  {bad_prices} products have sale_price >= price")
                issues.append(("Price Inconsistency", "MEDIUM", f"Fix {bad_prices} products with invalid sale prices"))
            else:
                print(f"   ✅ All prices are consistent")
            
            # 3. Products without variants
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
            
            print(f"\n3️⃣  Product Variants")
            if no_variants > 0:
                print(f"   ⚠️  {no_variants} products have no active variants")
                issues.append(("Missing Variants", "HIGH", f"Add variants for {no_variants} products"))
            else:
                print(f"   ✅ All products have variants")
            
            # 4. Out of stock products
            await cur.execute("""
                SELECT COUNT(DISTINCT p.id)
                FROM products p
                JOIN product_variants pv ON p.id = pv.product_id
                WHERE p.status = 'ACTIVE'
                AND pv.is_active = 1
                GROUP BY p.id
                HAVING SUM(pv.stock_quantity) = 0
            """)
            out_of_stock = (await cur.fetchone())[0] if cur.rowcount > 0 else 0
            
            print(f"\n4️⃣  Stock Status")
            if out_of_stock > 0:
                print(f"   ⚠️  {out_of_stock} products are out of stock")
                print(f"   💡 AI should warn users about stock availability")
                issues.append(("Out of Stock", "LOW", "Update stock or mark as OUT_OF_STOCK"))
            else:
                print(f"   ✅ All products have stock")
    
    finally:
        await release_conn(conn)
    
    return issues


async def check_performance_issues():
    """Check performance issues"""
    print("\n" + "=" * 80)
    print("⚡ PERFORMANCE ISSUES")
    print("=" * 80)
    
    issues = []
    
    # 1. Caching
    print("\n1️⃣  Response Caching")
    app_file = Path(__file__).parent / "app.py"
    if app_file.exists():
        content = app_file.read_text()
        
        if "cache" not in content.lower() and "redis" not in content.lower():
            print(f"   ❌ No caching mechanism found")
            issues.append(("No Caching", "MEDIUM", "Add Redis caching for frequent queries"))
        else:
            print(f"   ✅ Caching present")
    
    # 2. Database connection pooling
    print("\n2️⃣  Database Connection Pooling")
    db_file = Path(__file__).parent / "core" / "db.py"
    if db_file.exists():
        content = db_file.read_text()
        
        if "pool" in content.lower():
            print(f"   ✅ Connection pooling present")
        else:
            print(f"   ⚠️  No connection pooling detected")
            issues.append(("No Connection Pool", "MEDIUM", "Add connection pooling"))
    
    # 3. Query optimization
    print("\n3️⃣  Query Optimization")
    helpers_file = Path(__file__).parent / "mcps" / "helpers.py"
    if helpers_file.exists():
        content = helpers_file.read_text()
        
        # Check for N+1 queries
        if "for" in content and "await cur.execute" in content:
            print(f"   ⚠️  Potential N+1 query issues")
            issues.append(("N+1 Queries", "MEDIUM", "Optimize queries to avoid N+1 problem"))
        else:
            print(f"   ✅ No obvious N+1 query patterns")
    
    # 4. VectorDB index
    print("\n4️⃣  VectorDB Indexing")
    chroma_db = Path(__file__).parent / ".chroma" / "chroma.sqlite3"
    if chroma_db.exists():
        size_mb = chroma_db.stat().st_size / 1024 / 1024
        print(f"   ✅ VectorDB exists ({size_mb:.2f} MB)")
        
        if size_mb > 100:
            print(f"   ⚠️  VectorDB is large, consider optimization")
            issues.append(("Large VectorDB", "LOW", "Consider pruning old embeddings"))
    else:
        print(f"   ❌ VectorDB not found")
        issues.append(("No VectorDB", "CRITICAL", "Run embedding script"))
    
    return issues


async def check_functionality_gaps():
    """Check functionality gaps"""
    print("\n" + "=" * 80)
    print("🔧 FUNCTIONALITY GAPS")
    print("=" * 80)
    
    issues = []
    
    # 1. Conversation history persistence
    print("\n1️⃣  Conversation History Persistence")
    conv_file = Path(__file__).parent / "core" / "conversation.py"
    if conv_file.exists():
        content = conv_file.read_text()
        
        if "redis" not in content.lower() and "database" not in content.lower():
            print(f"   ⚠️  Conversation history stored in memory (lost on restart)")
            issues.append(("No Persistent History", "MEDIUM", "Store conversation in Redis/DB"))
        else:
            print(f"   ✅ Persistent conversation storage")
    
    # 2. Multi-language support
    print("\n2️⃣  Multi-language Support")
    prompts_file = Path(__file__).parent / "prompts.py"
    if prompts_file.exists():
        content = prompts_file.read_text()
        
        if "english" not in content.lower() and "en" not in content.lower():
            print(f"   ⚠️  Only Vietnamese language supported")
            issues.append(("Single Language", "LOW", "Add English support if needed"))
        else:
            print(f"   ✅ Multi-language support present")
    
    # 3. Analytics & Logging
    print("\n3️⃣  Analytics & Logging")
    app_file = Path(__file__).parent / "app.py"
    if app_file.exists():
        content = app_file.read_text()
        
        has_logging = "logger" in content or "logging" in content
        has_analytics = "analytics" in content.lower() or "track" in content.lower()
        
        if has_logging:
            print(f"   ✅ Logging present")
        else:
            print(f"   ⚠️  No logging found")
            issues.append(("No Logging", "MEDIUM", "Add comprehensive logging"))
        
        if not has_analytics:
            print(f"   ⚠️  No analytics tracking")
            issues.append(("No Analytics", "LOW", "Add analytics for user interactions"))
    
    # 4. Fallback handling
    print("\n4️⃣  Fallback Handling")
    chatbot_file = Path(__file__).parent / "services" / "chatbot" / "improved_user_chatbot.py"
    if chatbot_file.exists():
        content = chatbot_file.read_text()
        
        if "fallback" in content.lower() or "default" in content.lower():
            print(f"   ✅ Fallback handling present")
        else:
            print(f"   ⚠️  No fallback for unknown queries")
            issues.append(("No Fallback", "MEDIUM", "Add fallback for unknown queries"))
    
    # 5. Product recommendation engine
    print("\n5️⃣  Product Recommendation")
    if chatbot_file.exists():
        content = chatbot_file.read_text()
        
        if "recommend" in content.lower() or "suggest" in content.lower():
            print(f"   ✅ Recommendation logic present")
        else:
            print(f"   ⚠️  Basic recommendation only")
            issues.append(("Basic Recommendations", "LOW", "Add ML-based recommendations"))
    
    # 6. Order tracking integration
    print("\n6️⃣  Order Tracking")
    if chatbot_file.exists():
        content = chatbot_file.read_text()
        
        if "order" in content.lower() and "track" in content.lower():
            print(f"   ✅ Order tracking present")
        else:
            print(f"   ❌ No order tracking")
            issues.append(("No Order Tracking", "MEDIUM", "Add order status checking"))
    
    return issues


async def check_ai_specific_issues():
    """Check AI-specific issues"""
    print("\n" + "=" * 80)
    print("🤖 AI-SPECIFIC ISSUES")
    print("=" * 80)
    
    issues = []
    
    # 1. Prompt injection protection
    print("\n1️⃣  Prompt Injection Protection")
    chatbot_file = Path(__file__).parent / "services" / "chatbot" / "improved_user_chatbot.py"
    if chatbot_file.exists():
        content = chatbot_file.read_text()
        
        if "sanitize" not in content.lower():
            print(f"   ⚠️  No prompt injection protection")
            issues.append(("Prompt Injection", "HIGH", "Add prompt sanitization"))
        else:
            print(f"   ✅ Input sanitization present")
    
    # 2. Hallucination prevention
    print("\n2️⃣  Hallucination Prevention")
    if chatbot_file.exists():
        content = chatbot_file.read_text()
        
        # Check if AI is instructed to only use provided data
        if "only use" in content.lower() or "không bịa" in content.lower():
            print(f"   ✅ Hallucination prevention in prompts")
        else:
            print(f"   ⚠️  No explicit hallucination prevention")
            issues.append(("Hallucination Risk", "MEDIUM", "Add strict data-only instructions"))
    
    # 3. Token cost optimization
    print("\n3️⃣  Token Cost Optimization")
    if chatbot_file.exists():
        content = chatbot_file.read_text()
        
        # Check if prompts are optimized
        if "temperature" in content:
            print(f"   ✅ Temperature control present")
        else:
            print(f"   ⚠️  No temperature control")
        
        # Check for prompt caching
        if "cache" not in content.lower():
            print(f"   ⚠️  No prompt caching")
            issues.append(("High Token Cost", "MEDIUM", "Add prompt caching"))
    
    # 4. Response time
    print("\n4️⃣  Response Time Optimization")
    print(f"   💡 Check if responses are < 3 seconds")
    issues.append(("Response Time", "INFO", "Monitor and optimize if > 3s"))
    
    # 5. Context window management
    print("\n5️⃣  Context Window Management")
    conv_file = Path(__file__).parent / "core" / "conversation.py"
    if conv_file.exists():
        content = conv_file.read_text()
        
        if "max_history" in content or "maxlen" in content:
            print(f"   ✅ Context window limit present")
        else:
            print(f"   ⚠️  No context window limit")
            issues.append(("Unlimited Context", "MEDIUM", "Add context window limit"))
    
    return issues


async def main():
    """Main audit function"""
    print("\n" + "=" * 80)
    print("🔍 AI CHATBOT COMPREHENSIVE SECURITY & QUALITY AUDIT")
    print("=" * 80)
    print("\nScanning for vulnerabilities and issues...\n")
    
    all_issues = []
    
    # Run all checks
    security_issues = await check_security_vulnerabilities()
    all_issues.extend(security_issues)
    
    data_issues = await check_data_quality_issues()
    all_issues.extend(data_issues)
    
    performance_issues = await check_performance_issues()
    all_issues.extend(performance_issues)
    
    functionality_issues = await check_functionality_gaps()
    all_issues.extend(functionality_issues)
    
    ai_issues = await check_ai_specific_issues()
    all_issues.extend(ai_issues)
    
    # Summary
    print("\n" + "=" * 80)
    print("📊 AUDIT SUMMARY")
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
    
    print(f"\n🟢 LOW Issues: {len(low)}")
    for issue, severity, fix in low[:3]:
        print(f"   - {issue}: {fix}")
    if len(low) > 3:
        print(f"   ... and {len(low) - 3} more")
    
    # Overall score
    total_issues = len(all_issues)
    critical_weight = len(critical) * 10
    high_weight = len(high) * 5
    medium_weight = len(medium) * 2
    low_weight = len(low) * 1
    
    total_weight = critical_weight + high_weight + medium_weight + low_weight
    max_weight = 100  # Assume max 100 points of issues
    
    score = max(0, 100 - total_weight)
    
    print(f"\n{'=' * 80}")
    print(f"🎯 OVERALL SECURITY SCORE: {score}/100")
    print(f"{'=' * 80}")
    
    if score >= 80:
        print(f"\n✅ GOOD - AI Chatbot is relatively secure")
    elif score >= 60:
        print(f"\n⚠️  FAIR - Some issues need attention")
    else:
        print(f"\n❌ POOR - Critical issues must be fixed")
    
    print(f"\n📝 Total Issues Found: {total_issues}")
    print(f"   - CRITICAL: {len(critical)}")
    print(f"   - HIGH: {len(high)}")
    print(f"   - MEDIUM: {len(medium)}")
    print(f"   - LOW: {len(low)}")
    
    print("\n" + "=" * 80)
    print("✅ AUDIT COMPLETED")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
