#!/usr/bin/env python3
"""
Test upgraded chatbot with hybrid search
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.chatbot.improved_user_chatbot import improved_user_chatbot_service


async def test_chatbot():
    """Test chatbot with various queries"""
    print("="*80)
    print("🧪 TESTING UPGRADED CHATBOT")
    print("="*80)
    
    test_queries = [
        # SIMPLE queries (should use MySQL)
        {
            "query": "Bàn F42",
            "expected_method": "mysql",
            "description": "Simple product name search"
        },
        {
            "query": "Ghế xoay",
            "expected_method": "mysql",
            "description": "Simple category search"
        },
        
        # COMPLEX queries (should use VectorDB)
        {
            "query": "Bàn cho văn phòng nhỏ, diện tích khoảng 10m²",
            "expected_method": "vector",
            "description": "Use case + size requirement"
        },
        {
            "query": "Ghế cho lập trình viên ngồi nhiều giờ",
            "expected_method": "vector",
            "description": "Use case specific"
        },
        {
            "query": "Tìm bàn nhỏ gọn, tiết kiệm không gian",
            "expected_method": "vector",
            "description": "Specs requirement"
        },
        {
            "query": "So sánh bàn chữ L và bàn chữ U",
            "expected_method": "vector",
            "description": "Comparison query"
        }
    ]
    
    results = []
    
    for i, test in enumerate(test_queries, 1):
        print(f"\n{'='*80}")
        print(f"Test {i}/{len(test_queries)}: {test['description']}")
        print(f"{'='*80}")
        print(f"Query: \"{test['query']}\"")
        print(f"Expected method: {test['expected_method'].upper()}")
        print(f"\n{'─'*80}")
        
        try:
            # Process message
            response = await improved_user_chatbot_service.process_message(
                user_message=test['query'],
                context={"user_id": 1}
            )
            
            # Extract results
            success = response.get("success", False)
            search_method = response.get("search_method", "unknown")
            response_text = response.get("response", {}).get("text", "")
            products = response.get("response", {}).get("data", [])
            
            # Check method
            method_match = search_method == test['expected_method']
            
            print(f"\n✅ Success: {success}")
            print(f"{'✅' if method_match else '❌'} Search method: {search_method.upper()} (expected: {test['expected_method'].upper()})")
            print(f"📦 Products found: {len(products)}")
            print(f"\n💬 Response:")
            print(f"{response_text[:200]}..." if len(response_text) > 200 else response_text)
            
            if products:
                print(f"\n📋 Top products:")
                for j, p in enumerate(products[:3], 1):
                    print(f"  {j}. {p.get('name')} - {p.get('final_price'):,.0f}đ")
            
            results.append({
                "test": test['description'],
                "query": test['query'],
                "expected_method": test['expected_method'],
                "actual_method": search_method,
                "method_match": method_match,
                "success": success,
                "products_count": len(products)
            })
            
        except Exception as e:
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()
            
            results.append({
                "test": test['description'],
                "query": test['query'],
                "expected_method": test['expected_method'],
                "actual_method": "error",
                "method_match": False,
                "success": False,
                "products_count": 0
            })
    
    # Summary
    print(f"\n{'='*80}")
    print(f"📊 TEST SUMMARY")
    print(f"{'='*80}")
    
    total = len(results)
    method_matches = sum(1 for r in results if r['method_match'])
    successes = sum(1 for r in results if r['success'])
    
    print(f"\nTotal tests: {total}")
    print(f"✅ Successful: {successes}/{total} ({successes/total*100:.0f}%)")
    print(f"✅ Correct method: {method_matches}/{total} ({method_matches/total*100:.0f}%)")
    
    print(f"\n📋 Detailed results:")
    for r in results:
        status = "✅" if r['method_match'] and r['success'] else "❌"
        print(f"{status} {r['test']}")
        print(f"   Query: \"{r['query']}\"")
        print(f"   Method: {r['actual_method']} (expected: {r['expected_method']})")
        print(f"   Products: {r['products_count']}")
        print()
    
    if method_matches == total and successes == total:
        print(f"🎉 ALL TESTS PASSED!")
    else:
        print(f"⚠️  Some tests failed. Check logs above.")


async def main():
    await test_chatbot()


if __name__ == "__main__":
    asyncio.run(main())
