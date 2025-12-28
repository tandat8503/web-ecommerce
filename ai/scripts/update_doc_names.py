"""
Script để update lại doc_name cho các chunks trong Vector DB
Có 2 options:
1. Update trực tiếp từ document text trong DB (nhanh nhưng có thể không chính xác 100%)
2. Re-process lại từ file gốc (chính xác nhất, khuyến nghị)
"""
import sys
import logging
from pathlib import Path
from typing import Dict, Any, List
from collections import defaultdict
import re

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.legal.vector_service import LegalVectorService
from services.legal.parser import LegalDocumentParser

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def update_doc_names():
    """
    Update doc_name cho tất cả chunks trong Vector DB
    Sử dụng method extract_doc_name mới
    """
    vector_service = LegalVectorService()
    parser = LegalDocumentParser()
    
    logger.info("=" * 80)
    logger.info("BẮT ĐẦU UPDATE DOC_NAMES TRONG VECTOR DB")
    logger.info("=" * 80)
    
    # Get tất cả documents từ collection
    logger.info("Đang lấy tất cả chunks từ Vector DB...")
    all_results = vector_service._collection.get()
    
    if not all_results["ids"] or len(all_results["ids"]) == 0:
        logger.warning("Không có dữ liệu trong collection!")
        return
    
    total_chunks = len(all_results["ids"])
    logger.info(f"Tìm thấy {total_chunks} chunks")
    
    # Nhóm chunks theo doc_name hiện tại
    chunks_by_doc_name = defaultdict(list)
    for i, metadata in enumerate(all_results["metadatas"]):
        old_doc_name = metadata.get("doc_name", "Unknown")
        chunks_by_doc_name[old_doc_name].append({
            "id": all_results["ids"][i],
            "document": all_results["documents"][i],
            "metadata": metadata,
            "embedding": all_results["embeddings"][i] if all_results.get("embeddings") else None
        })
    
    logger.info(f"Tìm thấy {len(chunks_by_doc_name)} văn bản khác nhau")
    
    # Để update metadata, cần lấy embeddings từ collection
    # ChromaDB không lưu embeddings khi get, cần query lại hoặc get với include=['embeddings']
    logger.info("Đang lấy embeddings...")
    all_results_with_embeddings = vector_service._collection.get(include=['embeddings'])
    
    # Tạo mapping id -> embedding
    id_to_embedding = {}
    if all_results_with_embeddings.get("embeddings"):
        for i, chunk_id in enumerate(all_results_with_embeddings["ids"]):
            id_to_embedding[chunk_id] = all_results_with_embeddings["embeddings"][i]
    
    updated_count = 0
    unchanged_count = 0
    error_count = 0
    
    # Process từng nhóm doc_name
    for old_doc_name, chunks in chunks_by_doc_name.items():
        logger.info(f"\nĐang xử lý: '{old_doc_name}' ({len(chunks)} chunks)")
        
        # Lấy sample document để extract doc_name mới
        # Tìm chunk có document text đầy đủ nhất (không phải text_for_embedding đã enrich)
        sample_chunk = None
        for chunk in chunks:
            doc_text = chunk["document"]
            # Tìm chunk có vẻ là original text (có chứa "Điều" hoặc các từ khóa pháp lý)
            if doc_text and ("Điều" in doc_text or "Luật" in doc_text[:100]):
                sample_chunk = chunk
                break
        
        if not sample_chunk:
            sample_chunk = chunks[0]
        
        # Extract doc_name mới từ document text
        # Document text trong DB là text_for_embedding, có format:
        # "Luật Doanh nghiệp 2020. Chương 1: ... Điều 13: ..."
        # Hoặc có thể là: "Luật. Doanh nghiệp. 2020. Chương..."
        doc_text = sample_chunk["document"]
        
        # Extract từ đầu text_for_embedding
        # Format thường là: "DocName. Loại: ... Chương ... Điều ..."
        # Tìm phần đầu trước "Loại:", "Chương", hoặc "Điều"
        new_doc_name = None
        
        # Pattern 1: Tìm từ đầu đến dấu chấm đầu tiên hoặc "Loại:"
        match = re.match(r'^([^.]*?)(?:\s*\.\s*Loại:|\s*\.\s*Chương|\s*\.\s*Điều|$)', doc_text, re.IGNORECASE)
        if match:
            potential_name = match.group(1).strip()
            # Nếu có chứa "Luật" và có độ dài hợp lý (> 5 ký tự)
            if 'luật' in potential_name.lower() and len(potential_name) > 5:
                # Chuẩn hóa: split by "." và join lại
                parts = [p.strip() for p in potential_name.split('.') if p.strip()]
                if parts:
                    # Lọc ra các phần có vẻ là tên luật (không phải chỉ số hoặc từ ngắn)
                    name_parts = []
                    for part in parts:
                        if len(part) > 2 and not part.isdigit():
                            name_parts.append(part)
                        elif part.isdigit() and len(part) == 4:  # Năm
                            name_parts.append(part)
                            break  # Dừng sau năm
                    if name_parts:
                        new_doc_name = ' '.join(w.capitalize() for w in ' '.join(name_parts).split())
        
        # Pattern 2: Nếu không tìm được, thử extract_doc_name (cho original text)
        if not new_doc_name or len(new_doc_name) < 5:
            # Thử với text như thể là original (thay "." thành "\n")
            text_for_extract = doc_text.replace('. ', '\n').replace('.', '\n')
            new_doc_name = parser.extract_doc_name(text_for_extract)
        
        # Nếu vẫn không có, giữ nguyên
        if not new_doc_name or len(new_doc_name) < 5:
            logger.warning(f"  ⚠️  Không thể extract doc_name mới, giữ nguyên: '{old_doc_name}'")
            unchanged_count += len(chunks)
            continue
        
        if new_doc_name == old_doc_name:
            logger.info(f"  ✓ Doc_name không thay đổi: '{new_doc_name}'")
            unchanged_count += len(chunks)
            continue
        
        logger.info(f"  📝 Cập nhật: '{old_doc_name}' -> '{new_doc_name}'")
        
        # Update metadata cho tất cả chunks của văn bản này
        try:
            # Prepare data for upsert
            ids_to_update = []
            documents_to_update = []
            metadatas_to_update = []
            embeddings_to_update = []
            
            for chunk in chunks:
                chunk_id = chunk["id"]
                chunk_metadata = chunk["metadata"].copy()
                chunk_metadata["doc_name"] = new_doc_name
                
                ids_to_update.append(chunk_id)
                documents_to_update.append(chunk["document"])
                metadatas_to_update.append(chunk_metadata)
                
                # Get embedding nếu có
                if chunk_id in id_to_embedding:
                    embeddings_to_update.append(id_to_embedding[chunk_id])
                else:
                    logger.warning(f"  ⚠️  Không tìm thấy embedding cho chunk {chunk_id}")
                    # Không thể update nếu không có embedding
                    error_count += 1
                    continue
            
            # Upsert lại với metadata mới (batch size 100)
            batch_size = 100
            for i in range(0, len(ids_to_update), batch_size):
                batch_ids = ids_to_update[i:i+batch_size]
                batch_docs = documents_to_update[i:i+batch_size]
                batch_metas = metadatas_to_update[i:i+batch_size]
                batch_embeddings = embeddings_to_update[i:i+batch_size]
                
                if len(batch_embeddings) == len(batch_ids):
                    vector_service._collection.upsert(
                        ids=batch_ids,
                        documents=batch_docs,
                        metadatas=batch_metas,
                        embeddings=batch_embeddings
                    )
                else:
                    logger.error(f"  ❌ Số lượng embeddings không khớp với số chunks")
                    error_count += len(batch_ids)
                    continue
            
            updated_count += len(ids_to_update)
            logger.info(f"  ✅ Đã update {len(ids_to_update)} chunks")
            
        except Exception as e:
            logger.error(f"  ❌ Lỗi khi update: {e}", exc_info=True)
            error_count += len(chunks)
    
    logger.info("\n" + "=" * 80)
    logger.info("KẾT QUẢ UPDATE:")
    logger.info(f"  ✅ Đã update: {updated_count} chunks")
    logger.info(f"  ➖ Không thay đổi: {unchanged_count} chunks")
    logger.info(f"  ❌ Lỗi: {error_count} chunks")
    logger.info("=" * 80)


if __name__ == "__main__":
    update_doc_names()
