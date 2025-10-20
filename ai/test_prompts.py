#!/usr/bin/env python3
"""
Test Prompts for Web-ecommerce AI System
Test English prompts with Vietnamese responses
"""

import asyncio
import logging
from agents import orchestrator

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_vietnamese_responses():
    """Test that AI responds in Vietnamese"""
    print("🇻🇳 Testing Vietnamese Responses\n")
    
    # Test cases
    test_cases = [
        {
            "message": "Tìm laptop gaming giá dưới 10 triệu",
            "user_type": "user",
            "expected_language": "Vietnamese"
        },
        {
            "message": "Báo cáo doanh thu tháng 3",
            "user_type": "admin",
            "expected_language": "Vietnamese"
        },
        {
            "message": "Phân tích sentiment khách hàng",
            "user_type": "admin",
            "expected_language": "Vietnamese"
        },
        {
            "message": "Hiệu suất bán hàng 30 ngày qua",
            "user_type": "admin",
            "expected_language": "Vietnamese"
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
                response = result.get("result", {}).get("response", "")
                
                # Check if response contains Vietnamese characters
                vietnamese_chars = any(ord(char) > 127 for char in response)
                
                if vietnamese_chars:
                    print(f"✅ Vietnamese response detected")
                    print(f"   Response: {response[:100]}...")
                else:
                    print(f"⚠️  Response may not be in Vietnamese")
                    print(f"   Response: {response[:100]}...")
            else:
                print(f"❌ Failed - {result.get('error', 'Unknown error')}")
                
        except Exception as e:
            print(f"❌ Error - {e}")
        
        print()


async def test_english_prompts():
    """Test that prompts are in English"""
    print("🇺🇸 Testing English Prompts\n")
    
    from prompts import (
        USER_CHATBOT_SYSTEM_PROMPT,
        ADMIN_CHATBOT_SYSTEM_PROMPT,
        SENTIMENT_ANALYZER_SYSTEM_PROMPT,
        BUSINESS_ANALYST_SYSTEM_PROMPT
    )
    
    prompts = [
        ("User Chatbot", USER_CHATBOT_SYSTEM_PROMPT),
        ("Admin Chatbot", ADMIN_CHATBOT_SYSTEM_PROMPT),
        ("Sentiment Analyzer", SENTIMENT_ANALYZER_SYSTEM_PROMPT),
        ("Business Analyst", BUSINESS_ANALYST_SYSTEM_PROMPT)
    ]
    
    for name, prompt in prompts:
        print(f"Testing {name} prompt:")
        
        # Check if prompt contains English keywords
        english_keywords = [
            "You are", "Your goal", "Core Capabilities", "Operating Rules",
            "Expected Output", "Always respond", "Vietnamese"
        ]
        
        found_keywords = [keyword for keyword in english_keywords if keyword in prompt]
        
        if len(found_keywords) >= 3:
            print(f"✅ English prompt detected ({len(found_keywords)} keywords found)")
        else:
            print(f"⚠️  Prompt may not be in English ({len(found_keywords)} keywords found)")
        
        # Check if prompt mentions Vietnamese response
        if "Vietnamese" in prompt:
            print(f"✅ Vietnamese response instruction found")
        else:
            print(f"⚠️  No Vietnamese response instruction found")
        
        print()


async def test_specific_scenarios():
    """Test specific scenarios with expected Vietnamese responses"""
    print("🎯 Testing Specific Scenarios\n")
    
    scenarios = [
        {
            "name": "Product Search",
            "message": "Tìm laptop gaming",
            "user_type": "user",
            "expected_keywords": ["laptop", "gaming", "sản phẩm", "tìm thấy"]
        },
        {
            "name": "Revenue Analysis",
            "message": "Báo cáo doanh thu",
            "user_type": "admin",
            "expected_keywords": ["doanh thu", "báo cáo", "phân tích", "VND"]
        },
        {
            "name": "Sentiment Analysis",
            "message": "Phân tích cảm xúc",
            "user_type": "admin",
            "expected_keywords": ["cảm xúc", "phân tích", "khách hàng", "feedback"]
        },
        {
            "name": "Business Metrics",
            "message": "Hiệu suất bán hàng",
            "user_type": "admin",
            "expected_keywords": ["hiệu suất", "bán hàng", "metrics", "KPI"]
        }
    ]
    
    for scenario in scenarios:
        print(f"Testing {scenario['name']}:")
        
        try:
            result = await orchestrator.process_request(
                user_message=scenario["message"],
                user_type=scenario["user_type"]
            )
            
            if result.get("success"):
                response = result.get("result", {}).get("response", "").lower()
                
                # Check for expected keywords
                found_keywords = [kw for kw in scenario["expected_keywords"] if kw.lower() in response]
                
                if found_keywords:
                    print(f"✅ Found expected keywords: {found_keywords}")
                else:
                    print(f"⚠️  Expected keywords not found: {scenario['expected_keywords']}")
                
                print(f"   Response: {result.get('result', {}).get('response', '')[:100]}...")
            else:
                print(f"❌ Failed - {result.get('error', 'Unknown error')}")
                
        except Exception as e:
            print(f"❌ Error - {e}")
        
        print()


async def main():
    """Main test function"""
    print("🧪 Testing English Prompts with Vietnamese Responses\n")
    
    # Test English prompts
    await test_english_prompts()
    
    # Test Vietnamese responses
    await test_vietnamese_responses()
    
    # Test specific scenarios
    await test_specific_scenarios()
    
    print("\n🎉 All tests completed!")


if __name__ == "__main__":
    asyncio.run(main())
