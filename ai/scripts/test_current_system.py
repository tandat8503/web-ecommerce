"""
Script để test và đánh giá chất lượng hệ thống RAG hiện tại
"""
import sys
import asyncio
import logging
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.legal.vector_service import LegalVectorService
from services.legal.legal_service import LegalAssistant

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def analyze_vectordb():
    """Phân tích VectorDB hiện tại"""
    logger.info("="*80)
    logger.info("PHÂN TÍCH VECTORDB HIỆN TẠI")
    logger.info("="*80)
    
    vector_service = LegalVectorService()
    
    # 1. Thống kê tổng quan
    stats = vector_service.get_collection_stats()
    logger.info(f"\n📊 Thống kê tổng quan:")
    logger.info(f"  - Tổng số chunks: {stats['total_chunks']}")
    logger.info(f"  - Collection: {stats['collection_name']}")
    
    # 2. Lấy sample chunks để phân tích
    logger.info(f"\n🔍 Phân tích sample chunks...")
    
    # Get all chunks (limited to first 100 for analysis)
    all_results = vector_service._collection.get(limit=100)
    
    if all_results["ids"]:
        logger.info(f"\n📝 Sample {min(10, len(all_results['ids']))} chunks đầu tiên:")
        
        doc_names = {}
        chunk_sizes = []
        articles = {}
        
        for i in range(min(10, len(all_results["ids"]))):
            chunk_id = all_results["ids"][i]
            metadata = all_results["metadatas"][i]
            document = all_results["documents"][i]
            
            # Collect stats
            doc_name = metadata.get("doc_name", "Unknown")
            article = metadata.get("article", "")
            clause = metadata.get("clause", "")
            
            doc_names[doc_name] = doc_names.get(doc_name, 0) + 1
            chunk_sizes.append(len(document))
            
            if article:
                articles[article] = articles.get(article, 0) + 1
            
            logger.info(f"\n  Chunk {i+1}:")
            logger.info(f"    ID: {chunk_id}")
            logger.info(f"    Doc: {doc_name}")
            logger.info(f"    Article: {article}")
            logger.info(f"    Clause: {clause}")
            logger.info(f"    Text length: {len(document)} chars")
            logger.info(f"    Text preview: {document[:200]}...")
        
        # Statistics
        logger.info(f"\n📈 Thống kê chi tiết:")
        logger.info(f"  - Số văn bản khác nhau: {len(doc_names)}")
        logger.info(f"  - Văn bản: {list(doc_names.keys())[:5]}")
        logger.info(f"  - Kích thước chunk trung bình: {sum(chunk_sizes)/len(chunk_sizes):.0f} chars")
        logger.info(f"  - Kích thước chunk min/max: {min(chunk_sizes)}/{max(chunk_sizes)} chars")
    
    return vector_service


async def test_search_quality(vector_service):
    """Test chất lượng search với các câu hỏi mẫu"""
    logger.info("\n" + "="*80)
    logger.info("TEST CHẤT LƯỢNG SEARCH")
    logger.info("="*80)
    
    # Các câu hỏi test case
    test_queries = [
        {
            "query": "Điều kiện thành lập doanh nghiệp là gì?",
            "expected_doc": "Luật Doanh nghiệp",
            "expected_article": "Điều 13"
        },
        {
            "query": "Người đại diện theo pháp luật có quyền gì?",
            "expected_doc": "Luật Doanh nghiệp",
            "expected_article": "Điều 13"
        },
        {
            "query": "Quy định về thuế thu nhập doanh nghiệp",
            "expected_doc": "Luật Thuế",
            "expected_article": None
        },
        {
            "query": "Nghĩa vụ của người đại diện pháp luật",
            "expected_doc": "Luật Doanh nghiệp",
            "expected_article": "Điều 13"
        },
        {
            "query": "Thủ tục đăng ký kinh doanh",
            "expected_doc": "Luật Doanh nghiệp",
            "expected_article": None
        }
    ]
    
    results_summary = []
    
    for i, test_case in enumerate(test_queries, 1):
        query = test_case["query"]
        logger.info(f"\n{'='*60}")
        logger.info(f"Test Case {i}: {query}")
        logger.info(f"{'='*60}")
        
        # Search với top_k=10
        search_results = vector_service.search(
            query=query,
            top_k=10,
            status="active"
        )
        
        if not search_results:
            logger.warning(f"  ❌ Không tìm thấy kết quả nào!")
            results_summary.append({
                "query": query,
                "found": False,
                "top_doc": None,
                "top_article": None
            })
            continue
        
        # Phân tích kết quả
        logger.info(f"\n  📊 Tìm thấy {len(search_results)} kết quả:")
        
        for j, result in enumerate(search_results[:5], 1):
            metadata = result.get("metadata", {})
            doc_name = metadata.get("doc_name", "Unknown")
            article = metadata.get("article", "")
            clause = metadata.get("clause", "")
            point = metadata.get("point", "")
            distance = result.get("distance", 0)
            text = result.get("text", "")
            
            # Build reference
            ref_parts = []
            if article:
                ref_parts.append(article)
            if clause:
                ref_parts.append(f"Khoản {clause}")
            if point:
                ref_parts.append(f"Điểm {point}")
            reference = ", ".join(ref_parts) if ref_parts else "N/A"
            
            logger.info(f"\n    Kết quả {j}:")
            logger.info(f"      Văn bản: {doc_name}")
            logger.info(f"      Tham chiếu: {reference}")
            logger.info(f"      Distance: {distance:.4f}")
            logger.info(f"      Text preview: {text[:150]}...")
        
        # Check if expected results are in top results
        top_result = search_results[0]
        top_metadata = top_result.get("metadata", {})
        top_doc = top_metadata.get("doc_name", "")
        top_article = top_metadata.get("article", "")
        
        expected_doc = test_case.get("expected_doc", "")
        expected_article = test_case.get("expected_article", "")
        
        # Evaluation
        doc_match = expected_doc.lower() in top_doc.lower() if expected_doc else True
        article_match = expected_article in top_article if expected_article else True
        
        if doc_match and article_match:
            logger.info(f"\n  ✅ PASS: Kết quả đúng!")
        elif doc_match:
            logger.info(f"\n  ⚠️  PARTIAL: Đúng văn bản nhưng sai Điều")
            logger.info(f"      Expected: {expected_article}, Got: {top_article}")
        else:
            logger.info(f"\n  ❌ FAIL: Sai văn bản")
            logger.info(f"      Expected: {expected_doc}, Got: {top_doc}")
        
        results_summary.append({
            "query": query,
            "found": True,
            "top_doc": top_doc,
            "top_article": top_article,
            "expected_doc": expected_doc,
            "expected_article": expected_article,
            "doc_match": doc_match,
            "article_match": article_match
        })
    
    # Summary
    logger.info("\n" + "="*80)
    logger.info("📊 TỔNG KẾT TEST")
    logger.info("="*80)
    
    total = len(results_summary)
    found = sum(1 for r in results_summary if r["found"])
    doc_correct = sum(1 for r in results_summary if r.get("doc_match", False))
    article_correct = sum(1 for r in results_summary if r.get("article_match", False))
    fully_correct = sum(1 for r in results_summary if r.get("doc_match", False) and r.get("article_match", False))
    
    logger.info(f"\nKết quả:")
    logger.info(f"  - Tổng số test: {total}")
    logger.info(f"  - Tìm thấy kết quả: {found}/{total} ({found/total*100:.1f}%)")
    logger.info(f"  - Đúng văn bản: {doc_correct}/{total} ({doc_correct/total*100:.1f}%)")
    logger.info(f"  - Đúng điều: {article_correct}/{total} ({article_correct/total*100:.1f}%)")
    logger.info(f"  - Hoàn toàn chính xác: {fully_correct}/{total} ({fully_correct/total*100:.1f}%)")
    
    return results_summary


async def test_end_to_end():
    """Test end-to-end với Legal Assistant"""
    logger.info("\n" + "="*80)
    logger.info("TEST END-TO-END VỚI LEGAL ASSISTANT")
    logger.info("="*80)
    
    assistant = LegalAssistant()
    
    test_queries = [
        "Người đại diện theo pháp luật có những quyền gì?",
        "Điều kiện để thành lập công ty là gì?",
        "Lương 50 triệu đóng thuế bao nhiêu?"
    ]
    
    for i, query in enumerate(test_queries, 1):
        logger.info(f"\n{'='*60}")
        logger.info(f"Query {i}: {query}")
        logger.info(f"{'='*60}")
        
        try:
            response = await assistant.process_query(query, region=1)
            logger.info(f"\n📝 Response:")
            logger.info(f"{response[:500]}...")
            logger.info(f"\n(Total length: {len(response)} chars)")
        except Exception as e:
            logger.error(f"❌ Error: {e}", exc_info=True)


async def main():
    """Main test function"""
    logger.info("\n" + "="*80)
    logger.info("🧪 BẮT ĐẦU KIỂM TRA HỆ THỐNG")
    logger.info("="*80)
    
    # Step 1: Analyze VectorDB
    vector_service = analyze_vectordb()
    
    # Step 2: Test search quality
    await test_search_quality(vector_service)
    
    # Step 3: Test end-to-end
    await test_end_to_end()
    
    logger.info("\n" + "="*80)
    logger.info("✅ HOÀN THÀNH KIỂM TRA")
    logger.info("="*80)
    
    # Recommendations
    logger.info("\n" + "="*80)
    logger.info("💡 KHUYẾN NGHỊ")
    logger.info("="*80)
    logger.info("""
Dựa trên kết quả test, các khuyến nghị:

1. Nếu accuracy < 70%:
   → Cần implement OPTION A (Context Injection Enhancement)
   → Thời gian: ~30 phút
   → Rủi ro: Thấp

2. Nếu accuracy 70-85%:
   → Có thể implement OPTION C (Hybrid: Context + Re-ranking)
   → Thời gian: ~1 giờ
   → Rủi ro: Trung bình

3. Nếu accuracy > 85%:
   → Hệ thống đã tốt, chỉ cần fine-tune
   → Tăng top_k hoặc điều chỉnh prompt
   → Thời gian: ~15 phút
   → Rủi ro: Rất thấp

4. Nếu có vấn đề về dẫn chứng sai Điều/Khoản:
   → Implement OPTION B (Full Overlap Chunking)
   → Thời gian: ~2-3 giờ
   → Rủi ro: Cao (cần re-chunk toàn bộ)
""")


if __name__ == "__main__":
    asyncio.run(main())
