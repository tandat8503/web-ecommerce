"""
Script để re-process lại văn bản pháp luật với method extract_doc_name mới
Có option để xóa dữ liệu cũ trước khi process
"""
import sys
import logging
import argparse
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.legal.parser import LegalDocumentParser
from services.legal.chunker import LegalDocumentChunker
from services.legal.vector_service import LegalVectorService

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def clear_collection(vector_service: LegalVectorService):
    """Xóa toàn bộ collection"""
    try:
        # Get all IDs
        all_results = vector_service._collection.get()
        if all_results["ids"]:
            total = len(all_results["ids"])
            vector_service._collection.delete(ids=all_results["ids"])
            logger.info(f"✓ Đã xóa {total} chunks khỏi collection")
        else:
            logger.info("Collection đã rỗng")
    except Exception as e:
        logger.error(f"Lỗi khi xóa collection: {e}")
        raise


def process_legal_documents(
    input_dir: Path,
    clear_existing: bool = False,
    batch_size: int = 100,
    embedding_batch_size: int = 20,
    max_article_length: int = 2000,
    max_clause_length: int = 1000
):
    """
    Process tất cả văn bản pháp luật trong folder
    
    Args:
        input_dir: Folder chứa PDF/DOC files
        clear_existing: Nếu True, xóa toàn bộ dữ liệu cũ trước khi process
        batch_size: Batch size cho ChromaDB upsert
        embedding_batch_size: Batch size cho embedding (nhỏ hơn để tránh OOM)
        max_article_length: Max length trước khi chunk theo khoản
        max_clause_length: Max length trước khi chunk theo điểm
    """
    parser = LegalDocumentParser()
    chunker = LegalDocumentChunker()
    vector_service = LegalVectorService()
    
    # Clear existing data nếu cần
    if clear_existing:
        logger.info("⚠️  XÓA DỮ LIỆU CŨ TRƯỚC KHI PROCESS...")
        clear_collection(vector_service)
        logger.info("✓ Đã xóa xong, bắt đầu process documents mới...\n")
    
    # Get all PDF and DOC files
    pdf_files = list(input_dir.glob("*.pdf"))
    doc_files = list(input_dir.glob("*.doc")) + list(input_dir.glob("*.docx"))
    all_files = pdf_files + doc_files
    
    if not all_files:
        logger.warning(f"No PDF or DOC files found in {input_dir}")
        return
    
    logger.info(f"Found {len(all_files)} files to process")
    
    all_chunks = []
    doc_names_found = {}  # Để track doc_name được extract
    
    for file_path in all_files:
        try:
            logger.info(f"\n{'='*60}")
            logger.info(f"Processing: {file_path.name}")
            
            # Parse file
            text = parser.parse_file(file_path)
            logger.info(f"Parsed {len(text)} characters from {file_path.name}")
            
            # Test extract_doc_name
            extracted_doc_name = parser.extract_doc_name(text)
            if extracted_doc_name:
                logger.info(f"✓ Extracted doc_name: {extracted_doc_name}")
                doc_names_found[file_path.name] = extracted_doc_name
            else:
                logger.warning(f"⚠️  Không extract được doc_name từ {file_path.name}")
            
            # Extract metadata from filename
            file_metadata = parser.extract_metadata_from_filename(file_path)
            
            # Chunk document
            chunks = chunker.chunk_document(
                text,
                filename=file_path.name,
                max_article_length=max_article_length,
                max_clause_length=max_clause_length
            )
            
            logger.info(f"Created {len(chunks)} chunks from {file_path.name}")
            
            # Log một vài doc_name từ chunks để verify
            if chunks:
                sample_doc_name = chunks[0]["metadata"].get("doc_name", "N/A")
                logger.info(f"Sample doc_name in chunk metadata: {sample_doc_name}")
            
            # Update metadata with file info
            for chunk in chunks:
                if "source_id" not in chunk["metadata"] or not chunk["metadata"]["source_id"]:
                    chunk["metadata"]["source_id"] = file_metadata.get("source_id", "")
            
            all_chunks.extend(chunks)
            
        except ValueError as e:
            # File is corrupted, invalid, or PDF scan - skip it
            error_msg = str(e)
            if "PDF scan" in error_msg:
                logger.warning(f"⚠️  Skipping {file_path.name}: {error_msg}")
            else:
                logger.warning(f"Skipping {file_path.name}: {error_msg}")
            continue
        except Exception as e:
            logger.error(f"Error processing {file_path.name}: {e}", exc_info=True)
            continue
    
    if not all_chunks:
        logger.warning("No chunks created")
        return
    
    logger.info(f"\n{'='*60}")
    logger.info(f"Total chunks created: {len(all_chunks)}")
    
    # Log tất cả doc_names được tìm thấy
    logger.info("\n📋 DOC_NAMES ĐƯỢC EXTRACT:")
    for filename, doc_name in doc_names_found.items():
        logger.info(f"  • {filename}: {doc_name}")
    
    # Embed chunks
    logger.info("\nEmbedding chunks...")
    embedded_chunks = vector_service.embed_chunks(all_chunks, batch_size=embedding_batch_size)
    
    # Upsert to ChromaDB
    logger.info("Upserting to ChromaDB...")
    vector_service.upsert_chunks(embedded_chunks, batch_size=batch_size)
    
    # Print stats
    stats = vector_service.get_collection_stats()
    logger.info(f"\n✅ Processing complete! Total chunks in DB: {stats['total_chunks']}")


def main():
    """Main function"""
    parser = argparse.ArgumentParser(
        description="Re-process legal documents với method extract_doc_name mới"
    )
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Xóa toàn bộ dữ liệu cũ trong DB trước khi process"
    )
    parser.add_argument(
        "--input-dir",
        type=str,
        help="Đường dẫn folder chứa PDF/DOC files (mặc định: ai/luat_VN)"
    )
    
    args = parser.parse_args()
    
    # Get input directory
    if args.input_dir:
        input_dir = Path(args.input_dir)
    else:
        script_dir = Path(__file__).parent
        ai_dir = script_dir.parent
        input_dir = ai_dir / "luat_VN"
    
    if not input_dir.exists():
        logger.error(f"Input directory not found: {input_dir}")
        return
    
    logger.info("="*80)
    logger.info("RE-PROCESS LEGAL DOCUMENTS VỚI METHOD EXTRACT_DOC_NAME MỚI")
    logger.info("="*80)
    logger.info(f"Input directory: {input_dir}")
    logger.info(f"Clear existing: {args.clear}")
    logger.info("="*80 + "\n")
    
    if args.clear:
        confirm = input("⚠️  Bạn có chắc chắn muốn XÓA TẤT CẢ dữ liệu cũ? (yes/y để tiếp tục, no/n để hủy): ")
        if confirm.lower() not in ["yes", "y"]:
            logger.info("Đã hủy.")
            return
    
    # Process documents
    process_legal_documents(
        input_dir=input_dir,
        clear_existing=args.clear,
        batch_size=100,
        embedding_batch_size=20,
        max_article_length=2000,
        max_clause_length=1000
    )


if __name__ == "__main__":
    main()




