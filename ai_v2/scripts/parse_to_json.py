"""
Script để parse tất cả văn bản pháp luật ra JSON
Bước 1: Parse và chunk
Bước 2: Validate JSON
Bước 3: Export ra file JSON để review
"""
import sys
import json
import logging
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.legal.parser import LegalDocumentParser
from services.legal.chunker import LegalDocumentChunker

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def parse_to_json(
    input_dir: Path,
    output_file: Path,
    max_article_length: int = 2000,
    max_clause_length: int = 1000
) -> Dict[str, Any]:
    """
    Parse tất cả văn bản pháp luật và export ra JSON
    
    Returns:
        Dictionary chứa metadata và chunks
    """
    parser = LegalDocumentParser()
    chunker = LegalDocumentChunker()
    
    # Get all PDF and DOC files
    pdf_files = list(input_dir.glob("*.pdf"))
    doc_files = list(input_dir.glob("*.doc")) + list(input_dir.glob("*.docx"))
    all_files = pdf_files + doc_files
    
    if not all_files:
        logger.warning(f"No PDF or DOC files found in {input_dir}")
        return {"documents": [], "chunks": [], "stats": {}}
    
    logger.info(f"Found {len(all_files)} files to process")
    
    all_chunks = []
    documents_info = []
    skipped_files = []
    
    for file_path in all_files:
        try:
            logger.info(f"\n{'='*60}")
            logger.info(f"Processing: {file_path.name}")
            logger.info(f"{'='*60}")
            
            # Parse file
            text = parser.parse_file(file_path)
            logger.info(f"Parsed {len(text)} characters from {file_path.name}")
            
            # Skip if text is too short (likely scan or corrupted)
            if len(text) < 100:
                logger.warning(f"⚠️  Skipping {file_path.name}: Text too short ({len(text)} chars)")
                skipped_files.append({
                    "filename": file_path.name,
                    "reason": f"Text too short ({len(text)} chars)",
                    "text_length": len(text)
                })
                continue
            
            # Extract doc name
            doc_name = parser.extract_doc_name(text)
            if not doc_name:
                # Fallback to guess from filename
                doc_name = parser.guess_law_name_from_filename(file_path.name)
                logger.warning(f"⚠️  Could not extract doc_name, using guess: '{doc_name}'")
            else:
                logger.info(f"✓ Extracted doc_name: '{doc_name}'")
            
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
                # Add filename for traceability
                chunk["metadata"]["filename"] = file_path.name
            
            all_chunks.extend(chunks)
            
            # Document info
            documents_info.append({
                "filename": file_path.name,
                "doc_name": doc_name,
                "source_id": file_metadata.get("source_id", ""),
                "text_length": len(text),
                "num_chunks": len(chunks),
                "status": "success"
            })
            
        except ValueError as e:
            # File is corrupted, invalid, or PDF scan - skip it
            error_msg = str(e)
            logger.warning(f"⚠️  Skipping {file_path.name}: {error_msg}")
            skipped_files.append({
                "filename": file_path.name,
                "reason": error_msg,
                "status": "skipped"
            })
            continue
        except Exception as e:
            logger.error(f"Error processing {file_path.name}: {e}", exc_info=True)
            skipped_files.append({
                "filename": file_path.name,
                "reason": str(e),
                "status": "error"
            })
            continue
    
    if not all_chunks:
        logger.warning("No chunks created")
        return {"documents": [], "chunks": [], "stats": {}}
    
    logger.info(f"\n{'='*60}")
    logger.info(f"Total chunks created: {len(all_chunks)}")
    logger.info(f"{'='*60}")
    
    # Create output structure
    output_data = {
        "metadata": {
            "created_at": datetime.now().isoformat(),
            "total_files": len(all_files),
            "processed_files": len(documents_info),
            "skipped_files": len(skipped_files),
            "total_chunks": len(all_chunks),
            "max_article_length": max_article_length,
            "max_clause_length": max_clause_length
        },
        "documents": documents_info,
        "skipped_files": skipped_files,
        "chunks": all_chunks
    }
    
    # Save to JSON
    logger.info(f"\nSaving to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    logger.info(f"✅ Saved {len(all_chunks)} chunks to {output_file}")
    
    return output_data


def validate_json(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate JSON data
    
    Returns:
        Validation report
    """
    logger.info("\n" + "="*80)
    logger.info("VALIDATING JSON DATA")
    logger.info("="*80)
    
    issues = []
    warnings = []
    
    # Check metadata
    metadata = data.get("metadata", {})
    total_chunks = metadata.get("total_chunks", 0)
    
    logger.info(f"\n📊 Metadata:")
    logger.info(f"  - Created at: {metadata.get('created_at')}")
    logger.info(f"  - Total files: {metadata.get('total_files')}")
    logger.info(f"  - Processed files: {metadata.get('processed_files')}")
    logger.info(f"  - Skipped files: {metadata.get('skipped_files')}")
    logger.info(f"  - Total chunks: {total_chunks}")
    
    # Check documents
    documents = data.get("documents", [])
    logger.info(f"\n📄 Documents ({len(documents)}):")
    
    doc_names = {}
    for doc in documents:
        doc_name = doc.get("doc_name", "")
        filename = doc.get("filename", "")
        num_chunks = doc.get("num_chunks", 0)
        
        logger.info(f"  - {filename}")
        logger.info(f"    Doc name: {doc_name}")
        logger.info(f"    Chunks: {num_chunks}")
        
        # Check for issues
        if not doc_name or doc_name == "Văn Bản Pháp Luật":
            issues.append(f"Document '{filename}' has generic or missing doc_name: '{doc_name}'")
        
        if num_chunks == 0:
            issues.append(f"Document '{filename}' has 0 chunks")
        
        # Track doc names
        if doc_name in doc_names:
            doc_names[doc_name].append(filename)
        else:
            doc_names[doc_name] = [filename]
    
    # Check for duplicate doc names
    for doc_name, filenames in doc_names.items():
        if len(filenames) > 1:
            warnings.append(f"Duplicate doc_name '{doc_name}' in files: {filenames}")
    
    # Check chunks
    chunks = data.get("chunks", [])
    logger.info(f"\n📦 Chunks ({len(chunks)}):")
    
    chunk_ids = set()
    doc_name_distribution = {}
    
    # Sample first 5 chunks
    logger.info(f"\n  Sample first 5 chunks:")
    for i, chunk in enumerate(chunks[:5], 1):
        chunk_id = chunk.get("id", "")
        metadata = chunk.get("metadata", {})
        doc_name = metadata.get("doc_name", "")
        article = metadata.get("article", "")
        text_preview = chunk.get("text_for_embedding", "")[:100]
        
        logger.info(f"\n    Chunk {i}:")
        logger.info(f"      ID: {chunk_id}")
        logger.info(f"      Doc: {doc_name}")
        logger.info(f"      Article: {article}")
        logger.info(f"      Text: {text_preview}...")
        
        # Check for duplicate IDs
        if chunk_id in chunk_ids:
            issues.append(f"Duplicate chunk ID: {chunk_id}")
        chunk_ids.add(chunk_id)
        
        # Check for missing fields
        if not chunk_id:
            issues.append(f"Chunk {i} has missing ID")
        if not doc_name:
            issues.append(f"Chunk {i} (ID: {chunk_id}) has missing doc_name")
        if not text_preview:
            issues.append(f"Chunk {i} (ID: {chunk_id}) has empty text")
        
        # Track doc name distribution
        if doc_name in doc_name_distribution:
            doc_name_distribution[doc_name] += 1
        else:
            doc_name_distribution[doc_name] = 1
    
    # Check all chunks for critical issues
    logger.info(f"\n  Checking all {len(chunks)} chunks for critical issues...")
    for i, chunk in enumerate(chunks):
        chunk_id = chunk.get("id", "")
        metadata = chunk.get("metadata", {})
        doc_name = metadata.get("doc_name", "")
        
        # Check for corrupt doc names (like "LUẬT\nD")
        if doc_name and ("\n" in doc_name or len(doc_name) < 5):
            issues.append(f"Chunk {chunk_id} has corrupt doc_name: '{doc_name}'")
    
    # Doc name distribution
    logger.info(f"\n📈 Doc name distribution:")
    for doc_name, count in sorted(doc_name_distribution.items(), key=lambda x: x[1], reverse=True):
        logger.info(f"  - {doc_name}: {count} chunks")
    
    # Skipped files
    skipped = data.get("skipped_files", [])
    if skipped:
        logger.info(f"\n⚠️  Skipped files ({len(skipped)}):")
        for skip in skipped:
            logger.info(f"  - {skip.get('filename')}: {skip.get('reason')}")
    
    # Summary
    logger.info("\n" + "="*80)
    logger.info("VALIDATION SUMMARY")
    logger.info("="*80)
    
    if issues:
        logger.error(f"\n❌ Found {len(issues)} CRITICAL ISSUES:")
        for issue in issues:
            logger.error(f"  - {issue}")
    else:
        logger.info(f"\n✅ No critical issues found!")
    
    if warnings:
        logger.warning(f"\n⚠️  Found {len(warnings)} WARNINGS:")
        for warning in warnings:
            logger.warning(f"  - {warning}")
    
    return {
        "valid": len(issues) == 0,
        "issues": issues,
        "warnings": warnings,
        "stats": {
            "total_chunks": len(chunks),
            "unique_chunk_ids": len(chunk_ids),
            "unique_doc_names": len(doc_name_distribution),
            "doc_name_distribution": doc_name_distribution
        }
    }


def main():
    """Main function"""
    # Get input directory
    script_dir = Path(__file__).parent
    ai_dir = script_dir.parent
    input_dir = ai_dir / "luat_VN"
    output_file = script_dir / "legal_documents.json"
    
    if not input_dir.exists():
        logger.error(f"Input directory not found: {input_dir}")
        return
    
    logger.info("="*80)
    logger.info("PARSE LEGAL DOCUMENTS TO JSON")
    logger.info("="*80)
    logger.info(f"Input directory: {input_dir}")
    logger.info(f"Output file: {output_file}")
    logger.info("="*80 + "\n")
    
    # Step 1: Parse to JSON
    data = parse_to_json(
        input_dir=input_dir,
        output_file=output_file,
        max_article_length=2000,
        max_clause_length=1000
    )
    
    # Step 2: Validate JSON
    validation_report = validate_json(data)
    
    # Save validation report
    report_file = script_dir / "validation_report.json"
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(validation_report, f, ensure_ascii=False, indent=2)
    logger.info(f"\n✅ Validation report saved to {report_file}")
    
    # Final recommendation
    logger.info("\n" + "="*80)
    logger.info("RECOMMENDATION")
    logger.info("="*80)
    
    if validation_report["valid"]:
        logger.info("""
✅ JSON data is VALID and ready for embedding!

Next steps:
1. Review the JSON file: scripts/legal_documents.json
2. If everything looks good, run embedding script:
   python scripts/embed_from_json.py
""")
    else:
        logger.error("""
❌ JSON data has CRITICAL ISSUES!

Please fix the issues before embedding:
1. Review the validation report: scripts/validation_report.json
2. Fix the parser or chunker
3. Re-run this script
""")


if __name__ == "__main__":
    main()
