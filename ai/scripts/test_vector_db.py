"""
Script test để đánh giá chất lượng Vector DB cho văn bản luật
Kiểm tra xem có cần embed và chunk lại không
"""
import sys
import logging
from pathlib import Path
from typing import List, Dict, Any
from collections import defaultdict
import json

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.legal.vector_service import LegalVectorService

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class VectorDBTester:
    """Class để test và đánh giá chất lượng Vector DB"""
    
    def __init__(self):
        self.vector_service = LegalVectorService()
        self.test_queries = [
            "Người đại diện theo pháp luật của doanh nghiệp",
            "Thủ tục đăng ký thành lập công ty",
            "Vốn điều lệ tối thiểu",
            "Nghĩa vụ nộp thuế",
            "Quyền và nghĩa vụ của cổ đông",
            "Giải thể doanh nghiệp",
            "Chuyển đổi loại hình doanh nghiệp",
            "Quy định về lao động",
            "Hợp đồng lao động",
            "Điều kiện kinh doanh"
        ]
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """Lấy thống kê tổng quan về collection"""
        stats = self.vector_service.get_collection_stats()
        total_chunks = stats["total_chunks"]
        
        if total_chunks == 0:
            logger.warning("⚠️ Collection rỗng! Chưa có dữ liệu nào được embed.")
            return stats
        
        # Get sample để phân tích metadata
        try:
            sample_results = self.vector_service._collection.get(limit=min(100, total_chunks))
            
            # Phân tích metadata
            doc_types = defaultdict(int)
            statuses = defaultdict(int)
            doc_names = defaultdict(int)
            metadata_completeness = {
                "has_doc_name": 0,
                "has_doc_type": 0,
                "has_article": 0,
                "has_chapter": 0,
                "has_source_id": 0,
                "has_keywords": 0,
                "has_effective_date": 0
            }
            
            if sample_results["ids"]:
                for metadata in sample_results["metadatas"]:
                    if metadata.get("doc_type"):
                        doc_types[metadata["doc_type"]] += 1
                    if metadata.get("status"):
                        statuses[metadata["status"]] += 1
                    if metadata.get("doc_name"):
                        doc_names[metadata["doc_name"]] += 1
                    
                    # Kiểm tra độ đầy đủ metadata
                    if metadata.get("doc_name"):
                        metadata_completeness["has_doc_name"] += 1
                    if metadata.get("doc_type"):
                        metadata_completeness["has_doc_type"] += 1
                    if metadata.get("article"):
                        metadata_completeness["has_article"] += 1
                    if metadata.get("chapter"):
                        metadata_completeness["has_chapter"] += 1
                    if metadata.get("source_id"):
                        metadata_completeness["has_source_id"] += 1
                    if metadata.get("keywords"):
                        metadata_completeness["has_keywords"] += 1
                    if metadata.get("effective_date"):
                        metadata_completeness["has_effective_date"] += 1
                
                sample_size = len(sample_results["metadatas"])
                for key in metadata_completeness:
                    metadata_completeness[key] = {
                        "count": metadata_completeness[key],
                        "percentage": round(metadata_completeness[key] / sample_size * 100, 2) if sample_size > 0 else 0
                    }
            
            stats.update({
                "doc_types": dict(doc_types),
                "statuses": dict(statuses),
                "unique_doc_names": len(doc_names),
                "sample_doc_names": list(doc_names.keys())[:10],
                "metadata_completeness": metadata_completeness,
                "sample_size": len(sample_results["metadatas"]) if sample_results["metadatas"] else 0
            })
        except Exception as e:
            logger.error(f"Lỗi khi phân tích metadata: {e}")
        
        return stats
    
    def test_search_quality(self, top_k: int = 5) -> Dict[str, Any]:
        """Test chất lượng search với các query mẫu"""
        results = {
            "total_queries": len(self.test_queries),
            "successful_searches": 0,
            "failed_searches": 0,
            "avg_results_per_query": 0,
            "avg_distance_score": 0.0,
            "query_results": [],
            "recommendations": []
        }
        
        total_results = 0
        total_distance = 0.0
        distance_count = 0
        low_quality_searches = []
        
        for query in self.test_queries:
            try:
                search_results = self.vector_service.search(
                    query=query,
                    top_k=top_k,
                    status="active"
                )
                
                if search_results:
                    results["successful_searches"] += 1
                    total_results += len(search_results)
                    
                    # Tính distance trung bình (càng thấp càng tốt)
                    query_distances = []
                    for result in search_results:
                        if result.get("distance") is not None:
                            query_distances.append(result["distance"])
                            total_distance += result["distance"]
                            distance_count += 1
                    
                    avg_distance = sum(query_distances) / len(query_distances) if query_distances else None
                    
                    # Đánh giá chất lượng (distance < 0.3 là tốt, > 0.5 là kém)
                    quality = "Tốt"
                    if avg_distance:
                        if avg_distance > 0.5:
                            quality = "Kém"
                            low_quality_searches.append({
                                "query": query,
                                "avg_distance": avg_distance,
                                "results_count": len(search_results)
                            })
                        elif avg_distance > 0.3:
                            quality = "Trung bình"
                    
                    results["query_results"].append({
                        "query": query,
                        "results_count": len(search_results),
                        "avg_distance": round(avg_distance, 4) if avg_distance else None,
                        "quality": quality,
                        "top_result": {
                            "id": search_results[0]["id"],
                            "article": search_results[0]["metadata"].get("article", ""),
                            "doc_name": search_results[0]["metadata"].get("doc_name", ""),
                            "distance": search_results[0].get("distance")
                        } if search_results else None
                    })
                else:
                    results["failed_searches"] += 1
                    results["query_results"].append({
                        "query": query,
                        "results_count": 0,
                        "avg_distance": None,
                        "quality": "Không có kết quả",
                        "top_result": None
                    })
                    
            except Exception as e:
                logger.error(f"Lỗi khi search query '{query}': {e}")
                results["failed_searches"] += 1
        
        # Tính trung bình
        if results["successful_searches"] > 0:
            results["avg_results_per_query"] = round(total_results / results["successful_searches"], 2)
        
        if distance_count > 0:
            results["avg_distance_score"] = round(total_distance / distance_count, 4)
        
        # Đưa ra recommendations
        if results["failed_searches"] > len(self.test_queries) * 0.3:
            results["recommendations"].append(
                "⚠️ Có > 30% queries không tìm thấy kết quả. Cần kiểm tra lại việc embed hoặc thêm dữ liệu."
            )
        
        if results["avg_distance_score"] > 0.5:
            results["recommendations"].append(
                f"⚠️ Distance score trung bình cao ({results['avg_distance_score']:.4f}). "
                "Chất lượng embedding có thể không tốt. Cân nhắc re-embed với model tốt hơn."
            )
        
        if len(low_quality_searches) > len(self.test_queries) * 0.4:
            results["recommendations"].append(
                f"⚠️ Có {len(low_quality_searches)}/{len(self.test_queries)} queries có chất lượng kém. "
                "Cần review lại cách chunk và embed."
            )
        
        return results
    
    def test_chunk_quality(self, sample_size: int = 50) -> Dict[str, Any]:
        """Kiểm tra chất lượng chunks (kích thước, metadata, etc.)"""
        try:
            sample_results = self.vector_service._collection.get(limit=sample_size)
            
            if not sample_results["ids"] or len(sample_results["ids"]) == 0:
                return {
                    "error": "Không có dữ liệu trong collection"
                }
            
            chunk_lengths = []
            chunks_without_text = 0
            chunks_with_missing_metadata = 0
            required_metadata_fields = ["doc_name", "doc_type", "article"]
            
            for i, doc in enumerate(sample_results["documents"]):
                # Kiểm tra độ dài text
                if doc:
                    chunk_lengths.append(len(doc))
                else:
                    chunks_without_text += 1
                
                # Kiểm tra metadata
                metadata = sample_results["metadatas"][i]
                missing_fields = [field for field in required_metadata_fields if not metadata.get(field)]
                if missing_fields:
                    chunks_with_missing_metadata += 1
            
            avg_length = sum(chunk_lengths) / len(chunk_lengths) if chunk_lengths else 0
            max_length = max(chunk_lengths) if chunk_lengths else 0
            min_length = min(chunk_lengths) if chunk_lengths else 0
            
            # Phân tích độ dài
            # Chunks quá ngắn (< 50 chars) hoặc quá dài (> 3000 chars) có thể có vấn đề
            too_short = sum(1 for length in chunk_lengths if length < 50)
            too_long = sum(1 for length in chunk_lengths if length > 3000)
            
            recommendations = []
            
            if too_short > len(chunk_lengths) * 0.1:
                recommendations.append(
                    f"⚠️ Có {too_short} chunks quá ngắn (< 50 ký tự). "
                    "Có thể cần merge các chunks nhỏ lại."
                )
            
            if too_long > len(chunk_lengths) * 0.1:
                recommendations.append(
                    f"⚠️ Có {too_long} chunks quá dài (> 3000 ký tự). "
                    "Có thể cần chunk nhỏ hơn để tăng độ chính xác search."
                )
            
            if chunks_without_text > 0:
                recommendations.append(
                    f"⚠️ Có {chunks_without_text} chunks không có text. Cần kiểm tra lại quá trình embed."
                )
            
            return {
                "sample_size": len(sample_results["ids"]),
                "avg_chunk_length": round(avg_length, 2),
                "max_chunk_length": max_length,
                "min_chunk_length": min_length,
                "too_short_chunks": too_short,
                "too_long_chunks": too_long,
                "chunks_without_text": chunks_without_text,
                "chunks_with_missing_metadata": chunks_with_missing_metadata,
                "recommendations": recommendations
            }
            
        except Exception as e:
            logger.error(f"Lỗi khi kiểm tra chunk quality: {e}")
            return {
                "error": str(e)
            }
    
    def test_metadata_consistency(self) -> Dict[str, Any]:
        """Kiểm tra tính nhất quán của metadata"""
        try:
            # Lấy tất cả documents (có thể tốn thời gian nếu DB lớn)
            all_results = self.vector_service._collection.get()
            
            if not all_results["ids"] or len(all_results["ids"]) == 0:
                return {
                    "error": "Không có dữ liệu trong collection"
                }
            
            # Nhóm theo doc_name và kiểm tra
            docs_by_name = defaultdict(list)
            for i, metadata in enumerate(all_results["metadatas"]):
                doc_name = metadata.get("doc_name", "Unknown")
                docs_by_name[doc_name].append({
                    "id": all_results["ids"][i],
                    "metadata": metadata
                })
            
            # Kiểm tra consistency
            inconsistent_docs = []
            for doc_name, chunks in docs_by_name.items():
                # Kiểm tra xem tất cả chunks có cùng doc_type không
                doc_types = set(chunk["metadata"].get("doc_type") for chunk in chunks)
                source_ids = set(chunk["metadata"].get("source_id") for chunk in chunks if chunk["metadata"].get("source_id"))
                
                if len(doc_types) > 1:
                    inconsistent_docs.append({
                        "doc_name": doc_name,
                        "issue": f"Có {len(doc_types)} loại doc_type khác nhau: {list(doc_types)}",
                        "chunks_count": len(chunks)
                    })
                
                if len(source_ids) > 1:
                    inconsistent_docs.append({
                        "doc_name": doc_name,
                        "issue": f"Có {len(source_ids)} source_id khác nhau: {list(source_ids)}",
                        "chunks_count": len(chunks)
                    })
            
            recommendations = []
            if inconsistent_docs:
                recommendations.append(
                    f"⚠️ Tìm thấy {len(inconsistent_docs)} văn bản có metadata không nhất quán. "
                    "Cần review và fix."
                )
            
            return {
                "total_documents": len(docs_by_name),
                "total_chunks": len(all_results["ids"]),
                "inconsistent_documents": inconsistent_docs[:10],  # Chỉ hiển thị 10 đầu tiên
                "recommendations": recommendations
            }
            
        except Exception as e:
            logger.error(f"Lỗi khi kiểm tra metadata consistency: {e}")
            return {
                "error": str(e)
            }
    
    def generate_report(self) -> Dict[str, Any]:
        """Tạo báo cáo tổng hợp"""
        logger.info("=" * 80)
        logger.info("BẮT ĐẦU TEST VECTOR DB CHO VĂN BẢN LUẬT")
        logger.info("=" * 80)
        
        report = {
            "collection_stats": {},
            "search_quality": {},
            "chunk_quality": {},
            "metadata_consistency": {},
            "overall_recommendations": []
        }
        
        # 1. Kiểm tra thống kê collection
        logger.info("\n[1/4] Kiểm tra thống kê collection...")
        report["collection_stats"] = self.get_collection_stats()
        logger.info(f"✓ Tổng số chunks: {report['collection_stats'].get('total_chunks', 0)}")
        
        if report["collection_stats"].get("total_chunks", 0) == 0:
            report["overall_recommendations"].append(
                "🚨 KHẨN CẤP: Collection rỗng! Cần chạy script process_legal_documents.py để embed dữ liệu."
            )
            return report
        
        # 2. Test chất lượng search
        logger.info("\n[2/4] Test chất lượng search...")
        report["search_quality"] = self.test_search_quality()
        logger.info(f"✓ Successful searches: {report['search_quality']['successful_searches']}/{report['search_quality']['total_queries']}")
        logger.info(f"✓ Avg distance score: {report['search_quality']['avg_distance_score']}")
        
        # 3. Kiểm tra chất lượng chunks
        logger.info("\n[3/4] Kiểm tra chất lượng chunks...")
        report["chunk_quality"] = self.test_chunk_quality()
        if "error" not in report["chunk_quality"]:
            logger.info(f"✓ Avg chunk length: {report['chunk_quality'].get('avg_chunk_length', 0)} chars")
        
        # 4. Kiểm tra metadata consistency
        logger.info("\n[4/4] Kiểm tra tính nhất quán metadata...")
        report["metadata_consistency"] = self.test_metadata_consistency()
        if "error" not in report["metadata_consistency"]:
            logger.info(f"✓ Total documents: {report['metadata_consistency'].get('total_documents', 0)}")
        
        # Tổng hợp recommendations
        all_recommendations = []
        
        if report.get("collection_stats", {}).get("metadata_completeness"):
            completeness = report["collection_stats"]["metadata_completeness"]
            low_completeness = [k for k, v in completeness.items() 
                              if isinstance(v, dict) and v.get("percentage", 100) < 70]
            if low_completeness:
                all_recommendations.append(
                    f"⚠️ Metadata thiếu thông tin: {', '.join(low_completeness)}. "
                    "Cần cải thiện quá trình extract metadata."
                )
        
        all_recommendations.extend(report["search_quality"].get("recommendations", []))
        all_recommendations.extend(report["chunk_quality"].get("recommendations", []))
        all_recommendations.extend(report["metadata_consistency"].get("recommendations", []))
        
        # Đưa ra kết luận cuối cùng
        if not all_recommendations:
            all_recommendations.append("✅ Vector DB có chất lượng tốt! Không cần re-embed hoặc re-chunk.")
        else:
            # Kiểm tra xem có cần re-embed không
            needs_reembed = False
            needs_rechunk = False
            
            if report["search_quality"].get("avg_distance_score", 0) > 0.5:
                needs_reembed = True
                all_recommendations.append("🔴 KHUYẾN NGHỊ: Cần RE-EMBED với model tốt hơn hoặc tối ưu hóa embedding process.")
            
            chunk_issues = report["chunk_quality"].get("too_short_chunks", 0) + report["chunk_quality"].get("too_long_chunks", 0)
            if chunk_issues > report["chunk_quality"].get("sample_size", 0) * 0.2:
                needs_rechunk = True
                all_recommendations.append("🔴 KHUYẾN NGHỊ: Cần RE-CHUNK để cải thiện kích thước chunks.")
            
            if needs_reembed or needs_rechunk:
                all_recommendations.append(
                    f"\n📋 ACTION ITEMS:\n"
                    f"  - Re-embed: {'CÓ' if needs_reembed else 'KHÔNG'}\n"
                    f"  - Re-chunk: {'CÓ' if needs_rechunk else 'KHÔNG'}\n"
                    f"  - Command: cd ai && python scripts/process_legal_documents.py"
                )
        
        report["overall_recommendations"] = all_recommendations
        
        return report
    
    def print_report(self, report: Dict[str, Any]):
        """In báo cáo ra console với format đẹp"""
        print("\n" + "=" * 80)
        print("BÁO CÁO ĐÁNH GIÁ VECTOR DB CHO VĂN BẢN LUẬT")
        print("=" * 80)
        
        # Collection Stats
        print("\n📊 THỐNG KÊ COLLECTION:")
        stats = report.get("collection_stats", {})
        print(f"  • Tổng số chunks: {stats.get('total_chunks', 0)}")
        if stats.get("unique_doc_names"):
            print(f"  • Số văn bản: {stats.get('unique_doc_names', 0)}")
        if stats.get("doc_types"):
            print(f"  • Loại văn bản: {', '.join(stats['doc_types'].keys())}")
        
        if stats.get("metadata_completeness"):
            print("\n  📋 Độ đầy đủ Metadata:")
            for field, info in stats["metadata_completeness"].items():
                if isinstance(info, dict):
                    print(f"    - {field}: {info['percentage']}% ({info['count']}/{stats.get('sample_size', 0)})")
        
        # Search Quality
        print("\n🔍 CHẤT LƯỢNG SEARCH:")
        search_quality = report.get("search_quality", {})
        print(f"  • Queries thành công: {search_quality.get('successful_searches', 0)}/{search_quality.get('total_queries', 0)}")
        print(f"  • Avg distance score: {search_quality.get('avg_distance_score', 0):.4f} "
              f"(< 0.3: Tốt, 0.3-0.5: TB, > 0.5: Kém)")
        
        if search_quality.get("query_results"):
            print("\n  📝 Kết quả test queries:")
            for qr in search_quality["query_results"][:5]:  # Chỉ hiển thị 5 đầu tiên
                print(f"    • '{qr['query'][:50]}...': {qr['results_count']} kết quả, "
                      f"distance: {qr.get('avg_distance', 'N/A')}, {qr.get('quality', 'N/A')}")
        
        # Chunk Quality
        print("\n📦 CHẤT LƯỢNG CHUNKS:")
        chunk_quality = report.get("chunk_quality", {})
        if "error" not in chunk_quality:
            print(f"  • Avg length: {chunk_quality.get('avg_chunk_length', 0):.0f} ký tự")
            print(f"  • Min/Max: {chunk_quality.get('min_chunk_length', 0)}/{chunk_quality.get('max_chunk_length', 0)} ký tự")
            print(f"  • Quá ngắn (< 50): {chunk_quality.get('too_short_chunks', 0)} chunks")
            print(f"  • Quá dài (> 3000): {chunk_quality.get('too_long_chunks', 0)} chunks")
        
        # Recommendations
        print("\n💡 KHUYẾN NGHỊ:")
        recommendations = report.get("overall_recommendations", [])
        if recommendations:
            for i, rec in enumerate(recommendations, 1):
                print(f"  {i}. {rec}")
        else:
            print("  ✅ Không có vấn đề gì!")
        
        print("\n" + "=" * 80)
    
    def save_report_json(self, report: Dict[str, Any], output_file: str = "vector_db_test_report.json"):
        """Lưu báo cáo dưới dạng JSON"""
        output_path = Path(__file__).parent / output_file
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        logger.info(f"✓ Đã lưu báo cáo vào: {output_path}")


def main():
    """Main function"""
    tester = VectorDBTester()
    
    # Tạo báo cáo
    report = tester.generate_report()
    
    # In ra console
    tester.print_report(report)
    
    # Lưu file JSON
    tester.save_report_json(report)
    
    logger.info("\n✅ Hoàn thành test!")


if __name__ == "__main__":
    main()




