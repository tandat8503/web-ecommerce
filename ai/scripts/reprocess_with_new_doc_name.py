"""
Script để re-process lại documents với method extract_doc_name mới
Script này sẽ:
1. Backup collection hiện tại (optional)
2. Xóa chunks cũ
3. Re-process lại từ file gốc với method extract_doc_name mới
"""
import sys
import logging
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.legal.vector_service import LegalVectorService
from services.legal.parser import LegalDocumentParser
from services.legal.chunker import LegalDocumentChunker

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def reprocess_documents():
    """
    Re-process lại tất cả documents từ file gốc với method extract_doc_name mới
    """
    script_dir = Path(__file__).parent
    ai_dir = script_dir.parent
    input_dir = ai_dir / "luat_VN"
    
    if not input_dir.exists():
        logger.error(f"Input directory not found: {input_dir}")
        return
    
    vector_service = LegalVectorService()
    parser = LegalDocumentParser()
    chunker = LegalDocumentChunker()
    
    logger.info("=" * 80)
    logger.info("RE-PROCESS DOCUMENTS VỚI METHOD EXTRACT_DOC_NAME MỚI")
    logger.info("=" * 80)
    
    # Get stats hiện tại
    old_stats = vector_service.get_collection_stats()
    logger.info(f"Chunks hiện tại trong DB: {old_stats['total_chunks']}")
    
    # Confirm
    logger.warning("⚠️  Script này sẽ XÓA TẤT CẢ chunks hiện có và re-process lại!")
    logger.warning("⚠️  Đảm bảo bạn đã backup nếu cần!")
    
    # Get all files
    pdf_files = list(input_dir.glob("*.pdf"))
    doc_files = list(input_dir.glob("*.doc")) + list(input_dir.glob("*.docx"))
    all_files = pdf_files + doc_files
    
    if not all_files:
        logger.warning(f"No PDF or DOC files found in {input_dir}")
        return
    
    logger.info(f"Tìm thấy {len(all_files)} files để process")
    
    # Xóa tất cả chunks cũ (hoặc có thể xóa từng doc_name một)
    logger.info("\nĐang xóa chunks cũ...")
    try:
        # Get all doc_names
        all_results = vector_service._collection.get()
        if all_results["ids"]:
            # Xóa tất cả
            vector_service._collection.delete(ids=all_results["ids"])
            logger.info(f"Đã xóa {len(all_results['ids'])} chunks cũ")
    except Exception as e:
        logger.error(f"Lỗi khi xóa chunks cũ: {e}")
        return
    
    # Process lại từng file
    all_chunks = []
    
    for file_path in all_files:
        try:
            logger.info(f"\nProcessing: {file_path.name}")
            
            # Parse file
            text = parser.parse_file(file_path)
            logger.info(f"  ✓ Parsed {len(text)} characters")
            
            # Extract metadata from filename
            file_metadata = parser.extract_metadata_from_filename(file_path)
            
            # Chunk document (sẽ tự động dùng extract_doc_name mới)
            chunks = chunker.chunk_document(
                text,
                filename=file_path.name,
                max_article_length=2000,
                max_clause_length=1000
            )
            
            logger.info(f"  ✓ Created {len(chunks)} chunks")
            
            # Show sample doc_name
            if chunks:
                sample_doc_name = chunks[0]["metadata"].get("doc_name", "")
                logger.info(f"  📝 Doc name: '{sample_doc_name}'")
            
            # Update metadata with file info
            for chunk in chunks:
                if "source_id" not in chunk["metadata"] or not chunk["metadata"]["source_id"]:
                    chunk["metadata"]["source_id"] = file_metadata.get("source_id", "")
            
            all_chunks.extend(chunks)
            
        except ValueError as e:
            error_msg = str(e)
            if "PDF scan" in error_msg:
                logger.warning(f"  ⚠️  Skipping {file_path.name}: {error_msg}")
            else:
                logger.warning(f"  ⚠️  Skipping {file_path.name}: {error_msg}")
            continue
        except Exception as e:
            logger.error(f"  ❌ Error processing {file_path.name}: {e}", exc_info=True)
            continue
    
    if not all_chunks:
        logger.warning("No chunks created")
        return
    
    logger.info(f"\nTổng số chunks: {len(all_chunks)}")
    
    # Embed chunks
    logger.info("Embedding chunks...")
    embedded_chunks = vector_service.embed_chunks(all_chunks, batch_size=20)
    
    # Upsert to ChromaDB
    logger.info("Upserting to ChromaDB...")
    vector_service.upsert_chunks(embedded_chunks, batch_size=100)
    
    # Print stats
    new_stats = vector_service.get_collection_stats()
    logger.info("\n" + "=" * 80)
    logger.info("✅ RE-PROCESS HOÀN THÀNH!")
    logger.info(f"  Chunks cũ: {old_stats['total_chunks']}")
    logger.info(f"  Chunks mới: {new_stats['total_chunks']}")
    logger.info("=" * 80)


if __name__ == "__main__":
    reprocess_documents()
