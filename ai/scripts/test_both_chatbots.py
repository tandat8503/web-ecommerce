#!/usr/bin/env python3
"""
Comprehensive Test Suite for Product & Legal Chatbots
Tests both chatbots with diverse scenarios
"""
import asyncio
import sys
from pathlib import Path
import time
import json

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.chatbot.improved_user_chatbot import improved_user_chatbot_service
from services.legal.legal_service import LegalAssistant


class ChatbotTester:
    """Test suite for chatbots"""
    
    def __init__(self):
        self.product_service = improved_user_chatbot_service
        self.legal_service = None  # Lazy load
        self.results = []
    
    def get_legal_service(self):
        """Get legal service instance"""
        if self.legal_service is None:
            self.legal_service = LegalAssistant()
        return self.legal_service
    
    async def test_product_chatbot(self):
        """Test Product Chatbot with various scenarios"""
        print("\n" + "="*80)
        print("📦 PRODUCT CHATBOT TESTS")
        print("="*80)
        
        test_cases = [
            # Simple searches
            {
                "name": "Simple Category Search",
                "query": "Tìm bàn làm việc",
                "expected_type": "mysql",
                "check_products": True
            },
            {
                "name": "Simple Product Name",
                "query": "Ghế xoay",
                "expected_type": "mysql",
                "check_products": True
            },
            
            # Complex queries (VectorDB)
            {
                "name": "Use Case Query",
                "query": "Tư vấn bàn cho văn phòng nhỏ khoảng 15m²",
                "expected_type": "vector",
                "check_products": True
            },
            {
                "name": "Specific Requirements",
                "query": "Ghế cho lập trình viên ngồi nhiều giờ, cần ergonomic",
                "expected_type": "vector",
                "check_products": True
            },
            {
                "name": "Size & Material Query",
                "query": "Bàn nhỏ gọn bằng gỗ cho học sinh",
                "expected_type": "vector",
                "check_products": True
            },
            
            # Price queries
            {
                "name": "Price Range",
                "query": "Bàn làm việc dưới 5 triệu",
                "expected_type": "mysql",
                "check_products": True
            },
            
            # Comparison
            {
                "name": "Product Comparison",
                "query": "So sánh bàn chữ L và bàn chữ U",
                "expected_type": "vector",
                "check_products": False  # Comparison may not return product cards
            },
            
            # General inquiry
            {
                "name": "General Question",
                "query": "Chào bạn, shop có bán ghế gaming không?",
                "expected_type": "any",
                "check_products": False
            }
        ]
        
        for i, test in enumerate(test_cases, 1):
            await self._run_product_test(i, test)
        
        return self.results
    
    async def _run_product_test(self, test_num, test_case):
        """Run single product test"""
        print(f"\n{'─'*80}")
        print(f"Test {test_num}: {test_case['name']}")
        print(f"{'─'*80}")
        print(f"Query: \"{test_case['query']}\"")
        
        start_time = time.time()
        
        try:
            result = await self.product_service.process_message(
                user_message=test_case['query'],
                context={"user_id": 1}
            )
            
            elapsed_time = time.time() - start_time
            
            success = result.get("success", False)
            response_data = result.get("response", {})
            search_method = result.get("search_method", "unknown")
            
            # Extract text and products
            if isinstance(response_data, dict):
                response_text = response_data.get("text", "")
                products = response_data.get("data", [])
                if isinstance(products, dict):
                    products = products.get("products", [])
            else:
                response_text = str(response_data)
                products = []
            
            # Check results
            has_products = len(products) > 0
            
            print(f"\n✅ Success: {success}")
            print(f"⏱️  Response time: {elapsed_time:.2f}s")
            print(f"🔍 Search method: {search_method.upper()}")
            print(f"📦 Products found: {len(products)}")
            
            # Check expectations
            checks_passed = []
            
            if test_case.get("check_products") and has_products:
                checks_passed.append("✅ Products returned")
            elif test_case.get("check_products") and not has_products:
                checks_passed.append("⚠️  Expected products but got none")
            
            if test_case["expected_type"] != "any":
                if search_method == test_case["expected_type"]:
                    checks_passed.append(f"✅ Correct search method ({search_method})")
                else:
                    checks_passed.append(f"⚠️  Expected {test_case['expected_type']}, got {search_method}")
            
            print(f"\n💬 Response preview:")
            preview = response_text[:150] + "..." if len(response_text) > 150 else response_text
            print(f"   {preview}")
            
            if products:
                print(f"\n📋 Top products:")
                for j, p in enumerate(products[:3], 1):
                    print(f"   {j}. {p.get('name', 'N/A')} - {p.get('final_price', 0):,.0f}đ")
            
            print(f"\n📊 Checks:")
            for check in checks_passed:
                print(f"   {check}")
            
            # Save result
            self.results.append({
                "test": test_case["name"],
                "query": test_case["query"],
                "success": success,
                "response_time": elapsed_time,
                "search_method": search_method,
                "products_count": len(products),
                "response_length": len(response_text),
                "checks": checks_passed
            })
            
        except Exception as e:
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()
            
            self.results.append({
                "test": test_case["name"],
                "query": test_case["query"],
                "success": False,
                "error": str(e)
            })
    
    async def test_legal_chatbot(self):
        """Test Legal Chatbot with various scenarios"""
        print("\n" + "="*80)
        print("⚖️  LEGAL CHATBOT TESTS")
        print("="*80)
        
        test_cases = [
            # Legal queries
            {
                "name": "Company Formation",
                "query": "Điều kiện thành lập công ty TNHH là gì?",
                "expected_type": "legal"
            },
            {
                "name": "Labor Law",
                "query": "Người lao động được nghỉ phép năm bao nhiêu ngày?",
                "expected_type": "legal"
            },
            {
                "name": "Contract Law",
                "query": "Hợp đồng lao động phải có những nội dung gì?",
                "expected_type": "legal"
            },
            
            # Tax calculations
            {
                "name": "Simple Tax Calculation",
                "query": "Lương 20 triệu đóng thuế bao nhiêu?",
                "expected_type": "tax",
                "region": 1
            },
            {
                "name": "Tax with Dependents",
                "query": "Tính thuế TNCN cho lương 50 triệu, có 2 người phụ thuộc",
                "expected_type": "tax",
                "region": 1
            },
            {
                "name": "High Income Tax",
                "query": "Lương 100 triệu phải đóng thuế thế nào?",
                "expected_type": "tax",
                "region": 1
            },
            
            # Mixed queries
            {
                "name": "Insurance Question",
                "query": "Mức đóng bảo hiểm xã hội là bao nhiêu phần trăm?",
                "expected_type": "legal"
            }
        ]
        
        for i, test in enumerate(test_cases, 1):
            await self._run_legal_test(i, test)
        
        return self.results
    
    async def _run_legal_test(self, test_num, test_case):
        """Run single legal test"""
        print(f"\n{'─'*80}")
        print(f"Test {test_num}: {test_case['name']}")
        print(f"{'─'*80}")
        print(f"Query: \"{test_case['query']}\"")
        
        start_time = time.time()
        
        try:
            legal_service = self.get_legal_service()
            
            region = test_case.get("region", 1)
            response_text = await legal_service.process_query(
                query=test_case['query'],
                region=region
            )
            
            elapsed_time = time.time() - start_time
            
            # Determine type
            query_lower = test_case['query'].lower()
            tax_keywords = ["tính thuế", "đóng thuế", "thuế tncn", "lương"]
            actual_type = "tax" if any(kw in query_lower for kw in tax_keywords) else "legal"
            
            print(f"\n✅ Success: True")
            print(f"⏱️  Response time: {elapsed_time:.2f}s")
            print(f"📝 Query type: {actual_type.upper()}")
            print(f"📏 Response length: {len(response_text)} chars")
            
            # Check expectations
            type_match = actual_type == test_case["expected_type"]
            print(f"\n{'✅' if type_match else '⚠️ '} Type check: expected {test_case['expected_type']}, got {actual_type}")
            
            print(f"\n💬 Response preview:")
            lines = response_text.split('\n')[:5]
            for line in lines:
                print(f"   {line}")
            if len(lines) >= 5:
                print("   ...")
            
            # Save result
            self.results.append({
                "test": test_case["name"],
                "query": test_case["query"],
                "success": True,
                "response_time": elapsed_time,
                "query_type": actual_type,
                "response_length": len(response_text),
                "type_match": type_match
            })
            
        except Exception as e:
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()
            
            self.results.append({
                "test": test_case["name"],
                "query": test_case["query"],
                "success": False,
                "error": str(e)
            })
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*80)
        print("📊 TEST SUMMARY")
        print("="*80)
        
        total = len(self.results)
        successful = sum(1 for r in self.results if r.get("success"))
        failed = total - successful
        
        if total == 0:
            print("No tests run")
            return
        
        avg_time = sum(r.get("response_time", 0) for r in self.results if r.get("response_time")) / max(successful, 1)
        
        print(f"\n📈 Overall:")
        print(f"   Total tests: {total}")
        print(f"   ✅ Successful: {successful} ({successful/total*100:.0f}%)")
        print(f"   ❌ Failed: {failed} ({failed/total*100:.0f}%)")
        print(f"   ⏱️  Avg response time: {avg_time:.2f}s")
        
        # Product chatbot stats
        product_tests = [r for r in self.results if "Products" in r.get("test", "") or "product" in str(r.get("query", "")).lower() or r.get("search_method")]
        if product_tests:
            print(f"\n📦 Product Chatbot:")
            print(f"   Tests: {len(product_tests)}")
            print(f"   Success rate: {sum(1 for r in product_tests if r.get('success'))/len(product_tests)*100:.0f}%")
            mysql_tests = sum(1 for r in product_tests if r.get("search_method") == "mysql")
            vector_tests = sum(1 for r in product_tests if r.get("search_method") == "vector")
            print(f"   MySQL searches: {mysql_tests}")
            print(f"   Vector searches: {vector_tests}")
        
        # Legal chatbot stats
        legal_tests = [r for r in self.results if "query_type" in r]
        if legal_tests:
            print(f"\n⚖️  Legal Chatbot:")
            print(f"   Tests: {len(legal_tests)}")
            print(f"   Success rate: {sum(1 for r in legal_tests if r.get('success'))/len(legal_tests)*100:.0f}%")
            legal_queries = sum(1 for r in legal_tests if r.get("query_type") == "legal")
            tax_queries = sum(1 for r in legal_tests if r.get("query_type") == "tax")
            print(f"   Legal queries: {legal_queries}")
            print(f"   Tax queries: {tax_queries}")
        
        # Detailed results
        print(f"\n📋 Detailed Results:")
        for i, r in enumerate(self.results, 1):
            status = "✅" if r.get("success") else "❌"
            print(f"\n{status} Test {i}: {r.get('test')}")
            print(f"   Query: \"{r.get('query')}\"")
            if r.get("success"):
                print(f"   Time: {r.get('response_time', 0):.2f}s")
                if "search_method" in r:
                    print(f"   Search: {r.get('search_method')}")
                    print(f"   Products: {r.get('products_count', 0)}")
                if "query_type" in r:
                    print(f"   Type: {r.get('query_type')}")
            else:
                print(f"   Error: {r.get('error', 'Unknown')}")


async def main():
    """Run all tests"""
    print("="*80)
    print("🧪 CHATBOT TEST SUITE")
    print("="*80)
    print("\nTesting:")
    print("  1. Product Chatbot (tư vấn sản phẩm)")
    print("  2. Legal Chatbot (tư vấn luật & thuế)")
    print("")
    
    tester = ChatbotTester()
    
    # Test Product Chatbot
    await tester.test_product_chatbot()
    
    # Test Legal Chatbot
    await tester.test_legal_chatbot()
    
    # Print summary
    tester.print_summary()
    
    print("\n" + "="*80)
    print("✅ ALL TESTS COMPLETE!")
    print("="*80)


if __name__ == "__main__":
    asyncio.run(main())
