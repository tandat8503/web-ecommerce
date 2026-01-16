"""
Script để embed chunks từ JSON vào VectorDB
Đọc từ legal_documents.json và upsert vào ChromaDB
"""
import sys
import json
import logging
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.legal.vector_service import LegalVectorService

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def embed_from_json(
    json_file: Path,
    clear_existing: bool = False,
    batch_size: int = 100,
    embedding_batch_size: int = 20
):
    """
    Embed chunks từ JSON vào VectorDB
    
    Args:
        json_file: Path to JSON file
        clear_existing: If True, clear existing data before embedding
        batch_size: Batch size for ChromaDB upsert
        embedding_batch_size: Batch size for embedding
    """
    # Load JSON
    logger.info(f"Loading JSON from {json_file}...")
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    metadata = data.get("metadata", {})
    chunks = data.get("chunks", [])
    
    logger.info(f"Loaded {len(chunks)} chunks from JSON")
    logger.info(f"Metadata:")
    logger.info(f"  - Created at: {metadata.get('created_at')}")
    logger.info(f"  - Total files: {metadata.get('total_files')}")
    logger.info(f"  - Processed files: {metadata.get('processed_files')}")
    
    if not chunks:
        logger.error("No chunks found in JSON!")
        return
    
    # Initialize vector service
    vector_service = LegalVectorService()
    
    # Clear existing data if requested
    if clear_existing:
        logger.info("⚠️  CLEARING EXISTING DATA...")
        try:
            all_results = vector_service._collection.get()
            if all_results["ids"]:
                total = len(all_results["ids"])
                vector_service._collection.delete(ids=all_results["ids"])
                logger.info(f"✓ Deleted {total} existing chunks")
            else:
                logger.info("Collection is already empty")
        except Exception as e:
            logger.error(f"Error clearing collection: {e}")
            raise
    
    # Embed chunks
    logger.info(f"\nEmbedding {len(chunks)} chunks...")
    embedded_chunks = vector_service.embed_chunks(chunks, batch_size=embedding_batch_size)
    
    # Upsert to ChromaDB
    logger.info(f"\nUpserting to ChromaDB...")
    vector_service.upsert_chunks(embedded_chunks, batch_size=batch_size)
    
    # Print stats
    stats = vector_service.get_collection_stats()
    logger.info(f"\n✅ Embedding complete!")
    logger.info(f"Total chunks in DB: {stats['total_chunks']}")
    
    # Verify by sampling
    logger.info(f"\n🔍 Verifying by sampling...")
    sample_queries = [
        "Người đại diện theo pháp luật",
        "Điều kiện thành lập doanh nghiệp",
        "Thuế thu nhập cá nhân"
    ]
    
    for query in sample_queries:
        results = vector_service.search(query=query, top_k=3)
        logger.info(f"\nQuery: '{query}'")
        if results:
            top_result = results[0]
            metadata = top_result.get("metadata", {})
            logger.info(f"  Top result:")
            logger.info(f"    Doc: {metadata.get('doc_name')}")
            logger.info(f"    Article: {metadata.get('article')}")
            logger.info(f"    Distance: {top_result.get('distance', 0):.4f}")
        else:
            logger.warning(f"  No results found!")


def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Embed chunks from JSON into VectorDB"
    )
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear existing data before embedding"
    )
    parser.add_argument(
        "--json-file",
        type=str,
        default="scripts/legal_documents.json",
        help="Path to JSON file (default: scripts/legal_documents.json)"
    )
    
    args = parser.parse_args()
    
    # Get JSON file path
    script_dir = Path(__file__).parent
    ai_dir = script_dir.parent
    
    if args.json_file.startswith("scripts/"):
        json_file = ai_dir / args.json_file
    else:
        json_file = Path(args.json_file)
    
    if not json_file.exists():
        logger.error(f"JSON file not found: {json_file}")
        return
    
    logger.info("="*80)
    logger.info("EMBED FROM JSON TO VECTORDB")
    logger.info("="*80)
    logger.info(f"JSON file: {json_file}")
    logger.info(f"Clear existing: {args.clear}")
    logger.info("="*80 + "\n")
    
    if args.clear:
        confirm = input("⚠️  Are you sure you want to CLEAR ALL existing data? (yes/y to continue): ")
        if confirm.lower() not in ["yes", "y"]:
            logger.info("Cancelled.")
            return
    
    # Embed from JSON
    embed_from_json(
        json_file=json_file,
        clear_existing=args.clear,
        batch_size=100,
        embedding_batch_size=20
    )
    
    logger.info("\n" + "="*80)
    logger.info("✅ DONE!")
    logger.info("="*80)


if __name__ == "__main__":
    main()
