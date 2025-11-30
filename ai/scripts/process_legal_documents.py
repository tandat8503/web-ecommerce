"""
Script để xử lý văn bản pháp luật và embed vào Vector DB
"""
import asyncio
import logging
import sys
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


def process_legal_documents(
    input_dir: Path,
    batch_size: int = 100,
    embedding_batch_size: int = 20,
    max_article_length: int = 2000,
    max_clause_length: int = 1000
):
    """
    Process tất cả văn bản pháp luật trong folder
    
    Args:
        input_dir: Folder chứa PDF/DOC files
        batch_size: Batch size cho ChromaDB upsert
        embedding_batch_size: Batch size cho embedding (nhỏ hơn để tránh OOM)
        max_article_length: Max length trước khi chunk theo khoản
        max_clause_length: Max length trước khi chunk theo điểm
    """
    parser = LegalDocumentParser()
    chunker = LegalDocumentChunker()
    vector_service = LegalVectorService()
    
    # Get all PDF and DOC files
    pdf_files = list(input_dir.glob("*.pdf"))
    doc_files = list(input_dir.glob("*.doc")) + list(input_dir.glob("*.docx"))
    all_files = pdf_files + doc_files
    
    if not all_files:
        logger.warning(f"No PDF or DOC files found in {input_dir}")
        return
    
    logger.info(f"Found {len(all_files)} files to process")
    
    all_chunks = []
    
    for file_path in all_files:
        try:
            logger.info(f"Processing: {file_path.name}")
            
            # Parse file
            text = parser.parse_file(file_path)
            logger.info(f"Parsed {len(text)} characters from {file_path.name}")
            
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
    
    logger.info(f"Total chunks created: {len(all_chunks)}")
    
    # Embed chunks
    logger.info("Embedding chunks...")
    embedded_chunks = vector_service.embed_chunks(all_chunks, batch_size=embedding_batch_size)
    
    # Upsert to ChromaDB
    logger.info("Upserting to ChromaDB...")
    vector_service.upsert_chunks(embedded_chunks, batch_size=batch_size)
    
    # Print stats
    stats = vector_service.get_collection_stats()
    logger.info(f"✅ Processing complete! Total chunks in DB: {stats['total_chunks']}")


def main():
    """Main function"""
    # Get input directory
    script_dir = Path(__file__).parent
    ai_dir = script_dir.parent
    input_dir = ai_dir / "luat_VN"
    
    if not input_dir.exists():
        logger.error(f"Input directory not found: {input_dir}")
        return
    
    logger.info(f"Processing legal documents from: {input_dir}")
    
    # Process documents
    # Note: embedding_batch_size=20 is safer for MPS (Metal Performance Shaders on macOS)
    # If still OOM, reduce to 10 or 5
    process_legal_documents(
        input_dir=input_dir,
        batch_size=100,
        embedding_batch_size=20,  # Reduced from 50 to 20 for MPS compatibility
        max_article_length=2000,
        max_clause_length=1000
    )


if __name__ == "__main__":
    main()

