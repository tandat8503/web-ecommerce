#!/usr/bin/env python3
"""
Test script for Improved User Chatbot
Test conversation memory and intent detection
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from services.chatbot.improved_user_chatbot import improved_user_chatbot_service
from core.conversation import conversation_history


async def test_conversation_flow():
    """Test conversation flow with memory"""
    print("=" * 80)
    print("🧪 TESTING IMPROVED USER CHATBOT - CONVERSATION MEMORY")
    print("=" * 80)
    
    session_id = "test_session_123"
    
    # Test scenarios
    scenarios = [
        {
            "name": "Scenario 1: Greeting",
            "messages": [
                "Xin chào",
            ]
        },
        {
            "name": "Scenario 2: Product Search + Follow-up",
            "messages": [
                "Tìm bàn làm việc",
                "Con đầu tiên giá bao nhiêu?",  # Follow-up without product name
                "Có màu gì?",  # Follow-up
            ]
        },
        {
            "name": "Scenario 3: Price Inquiry",
            "messages": [
                "Bàn F42 giá bao nhiêu?",
            ]
        },
        {
            "name": "Scenario 4: Product Detail",
            "messages": [
                "Chi tiết F42",
            ]
        },
        {
            "name": "Scenario 5: Comparison",
            "messages": [
                "So sánh F42 và G100",
            ]
        },
    ]
    
    for scenario in scenarios:
        print(f"\n{'=' * 80}")
        print(f"📋 {scenario['name']}")
        print(f"{'=' * 80}\n")
        
        for i, message in enumerate(scenario['messages'], 1):
            print(f"👤 User [{i}]: {message}")
            
            # Process message
            context = {"session_id": session_id}
            result = await improved_user_chatbot_service.process_message(
                user_message=message,
                context=context
            )
            
            # Print response
            if result.get("success"):
                response = result.get("response", {})
                text = response.get("text", "")
                response_type = response.get("type", "")
                data = response.get("data", [])
                
                print(f"🤖 Bot [{i}]: {text}")
                print(f"   Type: {response_type}")
                
                if data:
                    print(f"   Products: {len(data)} items")
                    for j, product in enumerate(data[:3], 1):
                        print(f"      {j}. {product.get('name')} - {product.get('final_price'):,.0f}₫")
            else:
                print(f"❌ Error: {result.get('error')}")
            
            print()
            
            # Small delay between messages
            await asyncio.sleep(0.5)
        
        # Show conversation history
        history = conversation_history.get_history(session_id, limit=10)
        print(f"\n📚 Conversation History ({len(history)} messages):")
        for msg in history[-5:]:  # Show last 5
            role = msg.get("role", "unknown")
            content = msg.get("content", "")[:100]
            print(f"   {role}: {content}")
        
        # Clear session for next scenario
        conversation_history.clear_session(session_id)
        print(f"\n🧹 Cleared session for next scenario\n")


async def test_intent_detection():
    """Test intent detection"""
    print("\n" + "=" * 80)
    print("🎯 TESTING INTENT DETECTION")
    print("=" * 80 + "\n")
    
    test_messages = [
        ("Xin chào", "greeting"),
        ("Bàn F42 giá bao nhiêu?", "price_inquiry"),
        ("Chi tiết F42", "product_detail"),
        ("So sánh F42 và G100", "comparison"),
        ("Tìm bàn giá dưới 5tr", "product_search"),
    ]
    
    for message, expected_intent in test_messages:
        print(f"📝 Message: {message}")
        print(f"   Expected Intent: {expected_intent}")
        
        # Detect intent
        from services.chatbot.improved_user_chatbot import ImprovedUserChatbotService
        service = ImprovedUserChatbotService()
        
        intent, intent_data = await service._detect_intent(message, [], {})
        
        print(f"   Detected Intent: {intent}")
        print(f"   Intent Data: {intent_data}")
        
        if intent == expected_intent:
            print("   ✅ PASS")
        else:
            print("   ❌ FAIL")
        
        print()


async def main():
    """Main test function"""
    try:
        # Test 1: Intent Detection
        await test_intent_detection()
        
        # Test 2: Conversation Flow
        await test_conversation_flow()
        
        print("\n" + "=" * 80)
        print("✅ ALL TESTS COMPLETED")
        print("=" * 80)
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
