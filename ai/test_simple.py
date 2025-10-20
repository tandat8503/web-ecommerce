#!/usr/bin/env python3
"""
Simple Test for Web-ecommerce AI System
"""

import asyncio
import json
import logging
from agents import orchestrator

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_agents():
    """Test all agents"""
    print("🧪 Testing Web-ecommerce AI System\n")
    
    # Test cases
    test_cases = [
        {
            "message": "Tìm laptop gaming giá dưới 10 triệu",
            "user_type": "user",
            "expected_agent": "user_chatbot"
        },
        {
            "message": "Báo cáo doanh thu tháng 3",
            "user_type": "admin",
            "expected_agent": "business_analyst"
        },
        {
            "message": "Phân tích sentiment khách hàng",
            "user_type": "admin",
            "expected_agent": "sentiment_analyzer"
        },
        {
            "message": "Hiệu suất bán hàng 30 ngày qua",
            "user_type": "admin",
            "expected_agent": "business_analyst"
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"Test {i}: {test_case['message']}")
        
        try:
            result = await orchestrator.process_request(
                user_message=test_case["message"],
                user_type=test_case["user_type"]
            )
            
            if result.get("success"):
                selected_agent = result.get("selected_agent", "unknown")
                response = result.get("result", {}).get("response", "No response")
                
                print(f"✅ Success - Agent: {selected_agent}")
                print(f"   Response: {response[:100]}...")
                
                # Check if correct agent was selected
                if selected_agent == test_case["expected_agent"]:
                    print(f"✅ Correct agent selected")
                else:
                    print(f"⚠️  Expected {test_case['expected_agent']}, got {selected_agent}")
            else:
                print(f"❌ Failed - {result.get('error', 'Unknown error')}")
                
        except Exception as e:
            print(f"❌ Error - {e}")
        
        print()


async def test_mcp_tools():
    """Test MCP tools directly"""
    print("🔧 Testing MCP Tools Directly\n")
    
    try:
        from mcps.main import search_products, analyze_sentiment, get_revenue_analytics
        
        # Test search_products
        print("🔍 Testing search_products...")
        result = await search_products("laptop gaming", limit=3)
        result_data = json.loads(result)
        print(f"   Success: {result_data.get('success', False)}")
        print(f"   Products: {len(result_data.get('products', []))}")
        
        # Test analyze_sentiment
        print("\n😊 Testing analyze_sentiment...")
        result = await analyze_sentiment(["Sản phẩm tốt", "Chất lượng kém"])
        result_data = json.loads(result)
        print(f"   Success: {result_data.get('success', False)}")
        print(f"   Summary: {result_data.get('summary', {})}")
        
        # Test get_revenue_analytics
        print("\n💰 Testing get_revenue_analytics...")
        result = await get_revenue_analytics(month=3, year=2024)
        result_data = json.loads(result)
        print(f"   Success: {result_data.get('success', False)}")
        print(f"   Revenue data keys: {list(result_data.get('revenue_data', {}).keys())}")
        
        print("\n✅ MCP Tools test completed!")
        
    except Exception as e:
        print(f"❌ Error testing MCP tools: {e}")


async def test_database_connection():
    """Test database connection"""
    print("🗄️ Testing Database Connection\n")
    
    try:
        from core.db import get_conn, release_conn
        
        conn = await get_conn()
        print("✅ Database connection successful")
        
        # Test a simple query
        async with conn.cursor() as cur:
            await cur.execute("SELECT 1 as test")
            result = await cur.fetchone()
            if result and result[0] == 1:
                print("✅ Database query successful")
            else:
                print("❌ Database query failed")
        
        await release_conn(conn)
        print("✅ Database connection released")
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")


async def main():
    """Main test function"""
    print("🚀 Starting Simple Test Suite\n")
    
    # Test database connection first
    await test_database_connection()
    
    # Test MCP tools
    await test_mcp_tools()
    
    # Test agents
    await test_agents()
    
    print("\n🎉 All tests completed!")


if __name__ == "__main__":
    asyncio.run(main())