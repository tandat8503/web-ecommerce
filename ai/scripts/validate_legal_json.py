"""
Script để validate chất lượng JSON legal documents
Kiểm tra các vấn đề có thể làm giảm độ chính xác của Vector Search và RAG Chatbot
"""
import sys
import json
import logging
from pathlib import Path
from typing import Dict, Any, List

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def validate_json(file_path: Path) -> Dict[str, Any]:
    """
    Validate chất lượng JSON legal documents
    
    Checks:
    1. doc_name không được là filename hoặc chứa đuôi file
    2. text_for_embedding phải chứa tên luật chuẩn (không phải filename)
    3. Metadata phải đầy đủ
    4. text_for_embedding phải có context injection
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    documents = data.get('documents', [])
    summary = data.get('summary', {})
    
    logger.info("="*80)
    logger.info("VALIDATE LEGAL DOCUMENTS JSON")
    logger.info("="*80)
    logger.info(f"Total documents: {summary.get('total_documents', 0)}")
    logger.info(f"Total chunks: {summary.get('total_chunks', 0)}")
    logger.info("="*80 + "\n")
    
    issues = {
        "critical": [],  # Lỗi chí mạng - phải sửa ngay
        "warning": [],   # Cảnh báo - nên sửa
        "info": []       # Thông tin - có thể cải thiện
    }
    
    for doc_idx, doc in enumerate(documents):
        info = doc.get('document_info', {})
        filename = info.get('filename', 'Unknown')
        doc_name = info.get('doc_name', '')
        chunks = doc.get('chunks', [])
        
        logger.info(f"\n📄 Document {doc_idx + 1}: {filename}")
        logger.info(f"   Doc name: {doc_name}")
        logger.info(f"   Chunks: {len(chunks)}")
        
        # === CRITICAL CHECKS ===
        
        # Check 1: doc_name không được là filename hoặc chứa đuôi file
        if not doc_name:
            issues["critical"].append({
                "file": filename,
                "issue": "doc_name rỗng",
                "message": "doc_name không được để trống - sẽ làm nhiễu vector search"
            })
            logger.error(f"   ❌ CRITICAL: doc_name rỗng!")
        elif doc_name == filename:
            issues["critical"].append({
                "file": filename,
                "issue": "doc_name giống filename",
                "message": f"doc_name='{doc_name}' giống filename - cần mapping tên luật chuẩn"
            })
            logger.error(f"   ❌ CRITICAL: doc_name giống filename: '{doc_name}'")
        elif any(ext in doc_name.lower() for ext in ['.pdf', '.docx', '.doc']):
            issues["critical"].append({
                "file": filename,
                "issue": "doc_name chứa đuôi file",
                "message": f"doc_name='{doc_name}' chứa đuôi file - cần làm sạch"
            })
            logger.error(f"   ❌ CRITICAL: doc_name chứa đuôi file: '{doc_name}'")
        elif any(pattern in doc_name.lower() for pattern in ['vbhn', 'vpqh', '-vbhn-', '_vbhn_']):
            issues["warning"].append({
                "file": filename,
                "issue": "doc_name chứa pattern filename",
                "message": f"doc_name='{doc_name}' vẫn còn pattern filename - nên làm sạch hơn"
            })
            logger.warning(f"   ⚠️  WARNING: doc_name còn pattern filename: '{doc_name}'")
        else:
            logger.info(f"   ✅ doc_name OK: '{doc_name}'")
        
        # Check 2: text_for_embedding phải chứa tên luật chuẩn
        chunks_with_issues = 0
        for chunk_idx, chunk in enumerate(chunks):
            text_for_embedding = chunk.get('text_for_embedding', '')
            chunk_id = chunk.get('id', f'chunk_{chunk_idx}')
            
            if not text_for_embedding:
                issues["critical"].append({
                    "file": filename,
                    "chunk_id": chunk_id,
                    "issue": "text_for_embedding rỗng",
                    "message": "text_for_embedding không được để trống"
                })
                chunks_with_issues += 1
                continue
            
            # Check nếu text_for_embedding chứa filename thay vì tên luật
            if filename.lower().replace('.pdf', '').replace('.docx', '').replace('.doc', '') in text_for_embedding.lower():
                if doc_name and doc_name.lower() not in text_for_embedding.lower():
                    # text_for_embedding chứa filename nhưng không chứa doc_name chuẩn
                    issues["critical"].append({
                        "file": filename,
                        "chunk_id": chunk_id,
                        "issue": "text_for_embedding chứa filename",
                        "message": f"text_for_embedding có thể chứa filename pattern - cần kiểm tra",
                        "preview": text_for_embedding[:100] + "..."
                    })
                    chunks_with_issues += 1
            
            # Check context injection
            if "Luật:" not in text_for_embedding and "luật:" not in text_for_embedding:
                issues["warning"].append({
                    "file": filename,
                    "chunk_id": chunk_id,
                    "issue": "text_for_embedding thiếu context 'Luật:'",
                    "message": "text_for_embedding nên có format 'Luật: {doc_name}...' để context injection tốt hơn",
                    "preview": text_for_embedding[:100] + "..."
                })
            
            # Check nếu text_for_embedding quá ngắn (có thể thiếu context)
            if len(text_for_embedding) < 50:
                issues["warning"].append({
                    "file": filename,
                    "chunk_id": chunk_id,
                    "issue": "text_for_embedding quá ngắn",
                    "message": f"text_for_embedding chỉ có {len(text_for_embedding)} ký tự - có thể thiếu context"
                })
        
        if chunks_with_issues > 0:
            logger.error(f"   ❌ CRITICAL: {chunks_with_issues}/{len(chunks)} chunks có vấn đề với text_for_embedding")
        else:
            logger.info(f"   ✅ Tất cả chunks có text_for_embedding hợp lệ")
        
        # Check 3: Metadata đầy đủ
        missing_metadata = []
        required_fields = ["doc_name", "doc_type"]
        for field in required_fields:
            if not info.get(field):
                missing_metadata.append(field)
        
        if missing_metadata:
            issues["warning"].append({
                "file": filename,
                "issue": "metadata thiếu",
                "message": f"Metadata thiếu các trường: {', '.join(missing_metadata)}"
            })
            logger.warning(f"   ⚠️  WARNING: Metadata thiếu: {', '.join(missing_metadata)}")
        else:
            logger.info(f"   ✅ Metadata đầy đủ")
    
    # Print summary
    logger.info("\n" + "="*80)
    logger.info("VALIDATION SUMMARY")
    logger.info("="*80)
    
    total_critical = len(issues["critical"])
    total_warning = len(issues["warning"])
    total_info = len(issues["info"])
    
    logger.info(f"❌ Critical issues: {total_critical}")
    logger.info(f"⚠️  Warnings: {total_warning}")
    logger.info(f"ℹ️  Info: {total_info}")
    
    if total_critical > 0:
        logger.error("\n🚨 CRITICAL ISSUES (Phải sửa ngay):")
        for issue in issues["critical"][:10]:  # Hiển thị 10 đầu tiên
            logger.error(f"  • {issue['file']}: {issue['issue']}")
            logger.error(f"    → {issue['message']}")
            if 'preview' in issue:
                logger.error(f"    Preview: {issue['preview']}")
        if total_critical > 10:
            logger.error(f"  ... và {total_critical - 10} issues khác")
    
    if total_warning > 0:
        logger.warning("\n⚠️  WARNINGS (Nên sửa):")
        for issue in issues["warning"][:5]:  # Hiển thị 5 đầu tiên
            logger.warning(f"  • {issue['file']}: {issue['issue']}")
            if 'chunk_id' in issue:
                logger.warning(f"    Chunk: {issue['chunk_id']}")
    
    logger.info("="*80)
    
    # Return result
    return {
        "total_documents": len(documents),
        "total_chunks": sum(len(doc.get('chunks', [])) for doc in documents),
        "issues": issues,
        "status": "PASS" if total_critical == 0 else "FAIL"
    }


def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Validate chất lượng JSON legal documents"
    )
    parser.add_argument(
        "--input",
        type=str,
        default="legal_documents.json",
        help="File JSON cần validate (mặc định: legal_documents.json)"
    )
    
    args = parser.parse_args()
    
    # Get input file
    script_dir = Path(__file__).parent
    input_file = script_dir / args.input
    
    if not input_file.exists():
        logger.error(f"File not found: {input_file}")
        return
    
    # Validate
    result = validate_json(input_file)
    
    # Exit code
    if result["status"] == "FAIL":
        sys.exit(1)
    else:
        logger.info("\n✅ Validation passed!")
        sys.exit(0)


if __name__ == "__main__":
    main()





