#!/usr/bin/env python3
"""
AI Chatbot Test Suite
Comprehensive test cases for Product Chatbot and Admin features

Tests include:
- Greeting & small talk
- Product search (basic & complex)
- Price filtering (with special characters: 10m2, 5tr, dưới 3 triệu)
- Product details
- Out-of-scope handling
- Edge cases (empty, special chars, unicode)
- Response quality validation

Run: python scripts/test_ai_chatbot.py
"""

import asyncio
import httpx
import json
import time
from typing import Dict, Any, List, Tuple
from dataclasses import dataclass
from datetime import datetime

# Configuration
AI_BASE_URL = "http://localhost:8000"
CHAT_ENDPOINT = f"{AI_BASE_URL}/chat"
LEGAL_ENDPOINT = f"{AI_BASE_URL}/api/legal/chat"


@dataclass
class TestCase:
    """Test case definition"""
    id: int
    name: str
    message: str
    expected_type: str  # greeting, product_recommendation, text
    expected_keywords: List[str]  # Keywords expected in response
    should_have_products: bool  # Should return product cards
    category: str  # greeting, search, detail, price, edge_case, out_of_scope
    special_chars: bool = False  # Contains special characters


@dataclass
class TestResult:
    """Test result"""
    test_case: TestCase
    passed: bool
    response_text: str
    has_products: bool
    product_count: int
    response_time_ms: float
    error: str = ""
    score: float = 0.0  # 0-100


# ============================================================================
# TEST CASES
# ============================================================================

TEST_CASES = [
    # 1. GREETING TESTS
    TestCase(
        id=1, name="Simple Greeting",
        message="Xin chào",
        expected_type="text", expected_keywords=["xin chào", "chào", "em"],
        should_have_products=False, category="greeting"
    ),
    TestCase(
        id=2, name="Greeting with Shop",
        message="Shop ơi",
        expected_type="text", expected_keywords=["chào", "em", "giúp"],
        should_have_products=False, category="greeting"
    ),
    
    # 3-6. PRODUCT SEARCH TESTS
    TestCase(
        id=3, name="Search Desk Basic",
        message="Tôi cần mua bàn làm việc",
        expected_type="product_recommendation", expected_keywords=["bàn"],
        should_have_products=True, category="search"
    ),
    TestCase(
        id=4, name="Search Chair Basic",
        message="Có ghế xoay nào không?",
        expected_type="product_recommendation", expected_keywords=["ghế"],
        should_have_products=True, category="search"
    ),
    TestCase(
        id=5, name="Search with Intent",
        message="Tư vấn giúp em bàn cho lập trình viên",
        expected_type="product_recommendation", expected_keywords=["bàn", "làm việc"],
        should_have_products=True, category="search"
    ),
    TestCase(
        id=6, name="Search L-shaped Desk",
        message="Bàn chữ L có mẫu nào?",
        expected_type="product_recommendation", expected_keywords=["bàn", "chữ l"],
        should_have_products=True, category="search"
    ),
    
    # 7-10. PRICE FILTER TESTS (Special Characters)
    TestCase(
        id=7, name="Price Under 5 Million",
        message="Bàn giá dưới 5tr",
        expected_type="product_recommendation", expected_keywords=["bàn"],
        should_have_products=True, category="price", special_chars=True
    ),
    TestCase(
        id=8, name="Price Under 3 Triệu",
        message="Ghế giá dưới 3 triệu",
        expected_type="product_recommendation", expected_keywords=["ghế"],
        should_have_products=True, category="price", special_chars=True
    ),
    TestCase(
        id=9, name="Price Range",
        message="Có bàn từ 2tr đến 5tr không?",
        expected_type="product_recommendation", expected_keywords=["bàn"],
        should_have_products=True, category="price", special_chars=True
    ),
    TestCase(
        id=10, name="Price with K notation",
        message="Ghế giá khoảng 500k đến 2tr",
        expected_type="product_recommendation", expected_keywords=["ghế"],
        should_have_products=True, category="price", special_chars=True
    ),
    
    # 11-13. PRODUCT DETAIL TESTS
    TestCase(
        id=11, name="Detail by Model Code",
        message="Chi tiết bàn F42",
        expected_type="product_recommendation", expected_keywords=["F42", "bàn"],
        should_have_products=True, category="detail", special_chars=True
    ),
    TestCase(
        id=12, name="Detail by Name",
        message="Thông tin về Bàn Nâng Hạ",
        expected_type="product_recommendation", expected_keywords=["nâng hạ", "bàn"],
        should_have_products=True, category="detail"
    ),
    TestCase(
        id=13, name="Detail with Specs Request",
        message="Kích thước bàn EU01 là bao nhiêu?",
        expected_type="product_recommendation", expected_keywords=["EU01", "kích thước"],
        should_have_products=True, category="detail", special_chars=True
    ),
    
    # 14-16. SPECIAL CHARACTER/DIMENSION TESTS
    TestCase(
        id=14, name="Dimension 1m2",
        message="Có bàn kích thước 1m2 không?",
        expected_type="product_recommendation", expected_keywords=["bàn"],
        should_have_products=True, category="edge_case", special_chars=True
    ),
    TestCase(
        id=15, name="Dimension 120cm",
        message="Bàn rộng 120cm",
        expected_type="product_recommendation", expected_keywords=["bàn"],
        should_have_products=True, category="edge_case", special_chars=True
    ),
    TestCase(
        id=16, name="Complex Query with Numbers",
        message="Bàn làm việc 1m4 giá dưới 5 triệu màu trắng",
        expected_type="product_recommendation", expected_keywords=["bàn"],
        should_have_products=True, category="edge_case", special_chars=True
    ),
    
    # 17-18. OUT OF SCOPE TESTS
    TestCase(
        id=17, name="Out of Scope - Phone",
        message="iPhone 15 giá bao nhiêu?",
        expected_type="text", expected_keywords=["nội thất", "văn phòng", "không"],
        should_have_products=False, category="out_of_scope"
    ),
    TestCase(
        id=18, name="Out of Scope - Food",
        message="Cho tôi xem menu đồ ăn",
        expected_type="text", expected_keywords=["nội thất", "văn phòng", "không"],
        should_have_products=False, category="out_of_scope"
    ),
    
    # 19-20. EDGE CASES
    TestCase(
        id=19, name="Empty-like Message",
        message="???",
        expected_type="text", expected_keywords=[],
        should_have_products=False, category="edge_case", special_chars=True
    ),
    TestCase(
        id=20, name="Unicode Vietnamese",
        message="Bàn làm việc đẹp cho văn phòng",
        expected_type="product_recommendation", expected_keywords=["bàn", "văn phòng"],
        should_have_products=True, category="search"
    ),
]


# ============================================================================
# TEST RUNNER
# ============================================================================

async def run_test(client: httpx.AsyncClient, test: TestCase) -> TestResult:
    """Run a single test case"""
    start_time = time.time()
    
    try:
        response = await client.post(
            CHAT_ENDPOINT,
            json={
                "message": test.message,
                "session_id": f"test_session_{test.id}_{int(time.time())}"
            },
            timeout=30.0
        )
        
        response_time_ms = (time.time() - start_time) * 1000
        
        if response.status_code != 200:
            return TestResult(
                test_case=test,
                passed=False,
                response_text="",
                has_products=False,
                product_count=0,
                response_time_ms=response_time_ms,
                error=f"HTTP {response.status_code}: {response.text[:200]}"
            )
        
        data = response.json()
        
        # Extract response info
        response_obj = data.get("response", {})
        response_text = response_obj.get("text", "") if isinstance(response_obj, dict) else str(response_obj)
        response_type = response_obj.get("type", "text") if isinstance(response_obj, dict) else "text"
        
        # Check products
        products_data = response_obj.get("data", []) if isinstance(response_obj, dict) else []
        data_field = data.get("data", {})
        if isinstance(data_field, dict) and "products" in data_field:
            products_data = data_field["products"]
        elif isinstance(products_data, list):
            pass
        else:
            products_data = []
        
        has_products = len(products_data) > 0
        product_count = len(products_data)
        
        # Calculate score
        score = calculate_score(test, response_text, has_products, product_count, response_type)
        
        # Determine if passed
        passed = score >= 60  # 60% threshold
        
        return TestResult(
            test_case=test,
            passed=passed,
            response_text=response_text[:500],  # Truncate for display
            has_products=has_products,
            product_count=product_count,
            response_time_ms=response_time_ms,
            score=score
        )
        
    except Exception as e:
        return TestResult(
            test_case=test,
            passed=False,
            response_text="",
            has_products=False,
            product_count=0,
            response_time_ms=(time.time() - start_time) * 1000,
            error=str(e)
        )


def calculate_score(test: TestCase, response_text: str, has_products: bool, 
                   product_count: int, response_type: str) -> float:
    """Calculate test score (0-100)"""
    score = 0.0
    response_lower = response_text.lower()
    
    # 1. Response exists (20 points)
    if response_text and len(response_text) > 10:
        score += 20
    
    # 2. Expected keywords found (30 points)
    if test.expected_keywords:
        keywords_found = sum(1 for kw in test.expected_keywords if kw.lower() in response_lower)
        keyword_score = (keywords_found / len(test.expected_keywords)) * 30
        score += keyword_score
    else:
        score += 30  # No keywords expected = full score
    
    # 3. Product expectation met (25 points)
    if test.should_have_products:
        if has_products:
            score += 25
        elif product_count == 0 and "tìm" in response_lower and ("không" in response_lower or "hết" in response_lower):
            # Acceptable: No products but explains why
            score += 15
    else:
        if not has_products:
            score += 25
        else:
            # Products returned when not expected - partial score
            score += 10
    
    # 4. Response type correct (15 points)
    if response_type == test.expected_type:
        score += 15
    elif response_type == "product_recommendation" and test.expected_type == "text":
        score += 8  # Partial credit
    
    # 5. Vietnamese & professional tone (10 points)
    vietnamese_markers = ["ạ", "em", "anh/chị", "bạn", "😊", "👋", "🚀"]
    if any(marker in response_text for marker in vietnamese_markers):
        score += 10
    elif "xin" in response_lower or "chào" in response_lower:
        score += 5
    
    return min(score, 100.0)


async def run_all_tests() -> Tuple[List[TestResult], Dict[str, Any]]:
    """Run all test cases and return results with summary"""
    results = []
    
    print("=" * 80)
    print("🧪 AI CHATBOT TEST SUITE")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🔗 Endpoint: {CHAT_ENDPOINT}")
    print("=" * 80)
    print()
    
    async with httpx.AsyncClient() as client:
        # Check if server is running
        try:
            health = await client.get(f"{AI_BASE_URL}/health", timeout=5.0)
            if health.status_code != 200:
                print("❌ AI Server is not responding!")
                return [], {"error": "Server not responding"}
            print("✅ AI Server is running\n")
        except Exception as e:
            print(f"❌ Cannot connect to AI Server: {e}")
            return [], {"error": str(e)}
        
        # Run each test
        for test in TEST_CASES:
            print(f"[{test.id:02d}/{len(TEST_CASES)}] Testing: {test.name}")
            print(f"    📝 Message: \"{test.message}\"")
            
            result = await run_test(client, test)
            results.append(result)
            
            if result.passed:
                print(f"    ✅ PASSED (Score: {result.score:.1f}%, Time: {result.response_time_ms:.0f}ms)")
            else:
                print(f"    ❌ FAILED (Score: {result.score:.1f}%, Time: {result.response_time_ms:.0f}ms)")
                if result.error:
                    print(f"    ⚠️  Error: {result.error}")
            
            print(f"    📦 Products: {result.product_count}")
            if result.response_text:
                preview = result.response_text[:100].replace('\n', ' ')
                print(f"    💬 Response: \"{preview}...\"")
            print()
            
            # Small delay between tests
            await asyncio.sleep(0.5)
    
    # Generate summary
    summary = generate_summary(results)
    
    return results, summary


def generate_summary(results: List[TestResult]) -> Dict[str, Any]:
    """Generate test summary statistics"""
    total = len(results)
    passed = sum(1 for r in results if r.passed)
    failed = total - passed
    
    # Category breakdown
    categories = {}
    for r in results:
        cat = r.test_case.category
        if cat not in categories:
            categories[cat] = {"total": 0, "passed": 0, "failed": 0}
        categories[cat]["total"] += 1
        if r.passed:
            categories[cat]["passed"] += 1
        else:
            categories[cat]["failed"] += 1
    
    # Special chars handling
    special_chars_tests = [r for r in results if r.test_case.special_chars]
    special_chars_passed = sum(1 for r in special_chars_tests if r.passed)
    
    # Average scores
    avg_score = sum(r.score for r in results) / total if total > 0 else 0
    avg_response_time = sum(r.response_time_ms for r in results) / total if total > 0 else 0
    
    # Products accuracy
    product_tests = [r for r in results if r.test_case.should_have_products]
    products_correct = sum(1 for r in product_tests if r.has_products)
    
    summary = {
        "total_tests": total,
        "passed": passed,
        "failed": failed,
        "pass_rate": (passed / total * 100) if total > 0 else 0,
        "average_score": avg_score,
        "average_response_time_ms": avg_response_time,
        "categories": categories,
        "special_chars_handling": {
            "total": len(special_chars_tests),
            "passed": special_chars_passed,
            "rate": (special_chars_passed / len(special_chars_tests) * 100) if special_chars_tests else 0
        },
        "product_accuracy": {
            "expected_with_products": len(product_tests),
            "actually_has_products": products_correct,
            "rate": (products_correct / len(product_tests) * 100) if product_tests else 0
        }
    }
    
    return summary


def print_summary(summary: Dict[str, Any]):
    """Print formatted summary"""
    print("\n" + "=" * 80)
    print("📊 TEST SUMMARY")
    print("=" * 80)
    
    print(f"\n🎯 Overall Results:")
    print(f"   Total Tests: {summary['total_tests']}")
    print(f"   ✅ Passed: {summary['passed']}")
    print(f"   ❌ Failed: {summary['failed']}")
    print(f"   📈 Pass Rate: {summary['pass_rate']:.1f}%")
    print(f"   📊 Average Score: {summary['average_score']:.1f}%")
    print(f"   ⏱️  Avg Response Time: {summary['average_response_time_ms']:.0f}ms")
    
    print(f"\n📁 By Category:")
    for cat, stats in summary['categories'].items():
        rate = (stats['passed'] / stats['total'] * 100) if stats['total'] > 0 else 0
        print(f"   {cat}: {stats['passed']}/{stats['total']} ({rate:.0f}%)")
    
    print(f"\n🔤 Special Characters (10m2, 5tr, etc.):")
    sc = summary['special_chars_handling']
    print(f"   Handled correctly: {sc['passed']}/{sc['total']} ({sc['rate']:.0f}%)")
    
    print(f"\n📦 Product Data Accuracy:")
    pa = summary['product_accuracy']
    print(f"   Expected products returned: {pa['actually_has_products']}/{pa['expected_with_products']} ({pa['rate']:.0f}%)")
    
    # Final verdict
    print("\n" + "=" * 80)
    if summary['pass_rate'] >= 80:
        print("✅ OVERALL: EXCELLENT - AI Chatbot is performing well!")
    elif summary['pass_rate'] >= 60:
        print("⚠️  OVERALL: ACCEPTABLE - Some improvements needed")
    else:
        print("❌ OVERALL: NEEDS WORK - Significant issues detected")
    print("=" * 80)


def save_results_to_file(results: List[TestResult], summary: Dict[str, Any]):
    """Save results to JSON file"""
    output = {
        "timestamp": datetime.now().isoformat(),
        "summary": summary,
        "results": [
            {
                "id": r.test_case.id,
                "name": r.test_case.name,
                "message": r.test_case.message,
                "category": r.test_case.category,
                "passed": r.passed,
                "score": r.score,
                "response_time_ms": r.response_time_ms,
                "has_products": r.has_products,
                "product_count": r.product_count,
                "response_preview": r.response_text[:200] if r.response_text else "",
                "error": r.error
            }
            for r in results
        ]
    }
    
    filename = f"test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"\n📄 Results saved to: {filename}")


async def main():
    """Main entry point"""
    results, summary = await run_all_tests()
    
    if "error" in summary:
        print(f"\n❌ Tests could not run: {summary['error']}")
        return
    
    print_summary(summary)
    save_results_to_file(results, summary)


if __name__ == "__main__":
    asyncio.run(main())
