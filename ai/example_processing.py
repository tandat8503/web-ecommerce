#!/usr/bin/env python3
"""
Example of AI Processing Workflow
Demonstrates how AI processes information step by step
"""

import asyncio
import json
import logging
from typing import Dict, Any

from agents import orchestrator

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def demonstrate_ai_processing():
    """Demonstrate how AI processes different types of requests"""
    
    print("🤖 AI E-commerce System - Processing Examples\n")
    
    # Example 1: User tìm sản phẩm
    await process_user_product_search()
    
    # Example 2: Admin xem báo cáo
    await process_admin_revenue_report()
    
    # Example 3: Phân tích sentiment
    await process_sentiment_analysis()
    
    # Example 4: Business analytics
    await process_business_analytics()


async def process_user_product_search():
    """Example: User tìm sản phẩm"""
    print("=" * 60)
    print("📱 EXAMPLE 1: User Product Search")
    print("=" * 60)
    
    user_message = "Tìm laptop gaming giá dưới 10 triệu"
    print(f"👤 User Input: {user_message}")
    
    print("\n🔄 Processing Steps:")
    print("1. Orchestrator receives request")
    print("2. Analyzes user_type: 'user'")
    print("3. Selects agent: UserChatbotAgent")
    print("4. Agent classifies intent: 'product_search'")
    print("5. Agent calls MCP tool: search_products")
    print("6. MCP tool queries database")
    print("7. LLM generates response")
    print("8. Returns result to user")
    
    try:
        result = await orchestrator.process_request(
            user_message=user_message,
            user_type="user"
        )
        
        print(f"\n✅ Result:")
        print(f"   Success: {result.get('success', False)}")
        print(f"   Selected Agent: {result.get('selected_agent', 'unknown')}")
        print(f"   Response: {result.get('result', {}).get('response', 'No response')[:100]}...")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")


async def process_admin_revenue_report():
    """Example: Admin xem báo cáo doanh thu"""
    print("\n" + "=" * 60)
    print("👨‍💼 EXAMPLE 2: Admin Revenue Report")
    print("=" * 60)
    
    user_message = "Báo cáo doanh thu tháng 3"
    print(f"👤 Admin Input: {user_message}")
    
    print("\n🔄 Processing Steps:")
    print("1. Orchestrator receives request")
    print("2. Analyzes user_type: 'admin'")
    print("3. Selects agent: BusinessAnalystAgent")
    print("4. Agent classifies intent: 'revenue_analysis'")
    print("5. Agent calls MCP tool: get_revenue_analytics")
    print("6. MCP tool queries orders table")
    print("7. Calculates revenue metrics")
    print("8. LLM generates business report")
    print("9. Returns comprehensive analysis")
    
    try:
        result = await orchestrator.process_request(
            user_message=user_message,
            user_type="admin",
            context={"month": 3, "year": 2024}
        )
        
        print(f"\n✅ Result:")
        print(f"   Success: {result.get('success', False)}")
        print(f"   Selected Agent: {result.get('selected_agent', 'unknown')}")
        print(f"   Response: {result.get('result', {}).get('response', 'No response')[:100]}...")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")


async def process_sentiment_analysis():
    """Example: Phân tích sentiment"""
    print("\n" + "=" * 60)
    print("😊 EXAMPLE 3: Sentiment Analysis")
    print("=" * 60)
    
    user_message = "Phân tích sentiment khách hàng"
    print(f"👤 Admin Input: {user_message}")
    
    print("\n🔄 Processing Steps:")
    print("1. Orchestrator receives request")
    print("2. Analyzes user_type: 'admin'")
    print("3. Selects agent: SentimentAnalyzerAgent")
    print("4. Agent classifies intent: 'sentiment_analysis'")
    print("5. Agent calls MCP tool: summarize_sentiment_by_product")
    print("6. MCP tool queries comments table")
    print("7. Analyzes sentiment using AI model")
    print("8. Generates sentiment summary")
    print("9. Returns insights and recommendations")
    
    try:
        result = await orchestrator.process_request(
            user_message=user_message,
            user_type="admin"
        )
        
        print(f"\n✅ Result:")
        print(f"   Success: {result.get('success', False)}")
        print(f"   Selected Agent: {result.get('selected_agent', 'unknown')}")
        print(f"   Response: {result.get('result', {}).get('response', 'No response')[:100]}...")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")


async def process_business_analytics():
    """Example: Business analytics"""
    print("\n" + "=" * 60)
    print("📊 EXAMPLE 4: Business Analytics")
    print("=" * 60)
    
    user_message = "Hiệu suất bán hàng 30 ngày qua"
    print(f"👤 Admin Input: {user_message}")
    
    print("\n🔄 Processing Steps:")
    print("1. Orchestrator receives request")
    print("2. Analyzes user_type: 'admin'")
    print("3. Selects agent: BusinessAnalystAgent")
    print("4. Agent classifies intent: 'sales_performance'")
    print("5. Agent calls MCP tool: get_sales_performance")
    print("6. MCP tool queries orders and order_items tables")
    print("7. Calculates KPI metrics")
    print("8. Generates performance insights")
    print("9. Returns actionable recommendations")
    
    try:
        result = await orchestrator.process_request(
            user_message=user_message,
            user_type="admin",
            context={"days": 30}
        )
        
        print(f"\n✅ Result:")
        print(f"   Success: {result.get('success', False)}")
        print(f"   Selected Agent: {result.get('selected_agent', 'unknown')}")
        print(f"   Response: {result.get('result', {}).get('response', 'No response')[:100]}...")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")


async def demonstrate_mcp_tools():
    """Demonstrate MCP tools directly"""
    print("\n" + "=" * 60)
    print("🛠️ MCP TOOLS DEMONSTRATION")
    print("=" * 60)
    
    try:
        from mcps.main import search_products, analyze_sentiment, get_revenue_analytics
        
        print("1. Testing search_products...")
        result = await search_products("laptop gaming", limit=3)
        result_data = json.loads(result)
        print(f"   ✅ Found {len(result_data.get('products', []))} products")
        
        print("\n2. Testing analyze_sentiment...")
        result = await analyze_sentiment(["Sản phẩm tốt", "Chất lượng kém"])
        result_data = json.loads(result)
        print(f"   ✅ Analyzed {len(result_data.get('results', []))} texts")
        
        print("\n3. Testing get_revenue_analytics...")
        result = await get_revenue_analytics(month=3, year=2024)
        result_data = json.loads(result)
        print(f"   ✅ Revenue data: {result_data.get('success', False)}")
        
    except Exception as e:
        print(f"❌ Error testing MCP tools: {e}")


async def main():
    """Main demonstration function"""
    print("🚀 AI E-commerce System - Processing Demonstration")
    print("This demonstrates how AI processes different types of requests\n")
    
    # Demonstrate AI processing
    await demonstrate_ai_processing()
    
    # Demonstrate MCP tools
    await demonstrate_mcp_tools()
    
    print("\n" + "=" * 60)
    print("🎉 Demonstration completed!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
