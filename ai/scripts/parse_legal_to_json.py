"""
Advanced Legal Document Processor for RAG/Vector DB
Features:
- Regex-based Semantic Chunking (Splits by 'Điều')
- Context Injection (Embeds Law Name + Article Title into chunks)
- Noise Cleaning (Removes VBHN footnotes)
- Integrates with existing LegalDocumentParser and LegalDocumentChunker
"""
import sys
import re
import json
import logging
import argparse
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.legal.parser import LegalDocumentParser
from services.legal.chunker import LegalDocumentChunker

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class VietnamLegalParser:
    """
    Parser chuyên dụng cho cấu trúc luật Việt Nam
    """
    def __init__(self):
        # Regex bắt đầu một điều luật: "Điều 1.", "Điều 12:", "Điều 10 (sửa đổi)"
        self.article_pattern = re.compile(r'^(Điều\s+\d+\.?\s*.*?)(\n|$)', re.MULTILINE | re.IGNORECASE)
        # Regex bắt Chương
        self.chapter_pattern = re.compile(r'^(Chương\s+[IVXLCDM]+\.?\s*.*?)(\n|$)', re.MULTILINE | re.IGNORECASE)

    def clean_text(self, text: str) -> str:
        """Làm sạch văn bản, đặc biệt là các file VBHN"""
        # Xóa các dòng số trang (ví dụ: --- PAGE 1 ---)
        text = re.sub(r'--- PAGE \d+ ---', '', text)
        
        # Xóa các chú thích thường gặp trong VBHN (Ví dụ: [1], [12])
        # Cẩn thận kẻo xóa nhầm số thứ tự khoản, nên chỉ xóa nếu nó nằm lơ lửng
        text = re.sub(r'\[\d+\]', '', text) 
        
        # Chuẩn hóa khoảng trắng
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def extract_structure(self, full_text: str, source_filename: str) -> List[Dict]:
        """
        Phân tách văn bản thành các chunks dựa trên "Điều"
        Giữ lại ngữ cảnh (Tên chương, Tên điều)
        """
        full_text = self.clean_text(full_text)
        
        chunks = []
        lines = full_text.split('\n')
        
        current_chapter = "Quy định chung"
        current_article_title = ""
        current_content = []
        
        # Giả lập tên luật dựa trên filename (Trong thực tế nên dùng AI để extract title chính xác)
        law_name = self._guess_law_name(source_filename)

        # Split text by logic
        # Lưu ý: Đây là logic simplified. Với PDF, bạn cần pdfplumber để lấy text tốt hơn.
        # Ở đây giả định input text đã được extract từ PDF/Docx.
        
        # Kỹ thuật split bằng Regex mạnh mẽ hơn
        articles = self.article_pattern.split(full_text)
        
        # Phần đầu tiên (Preamble) - trước Điều 1
        if len(articles) > 0:
            preamble = articles[0].strip()
            if preamble:
                chunks.append({
                    "id": f"{source_filename}_preamble",
                    "type": "preamble",
                    "content": preamble,
                    "metadata": {
                        "law_name": law_name,
                        "structure": "Lời nói đầu / Căn cứ pháp lý"
                    },
                    # Embedding text chứa ngữ cảnh
                    "text_for_embedding": f"Văn bản: {law_name}. Phần: Căn cứ pháp lý và lời nói đầu. Nội dung: {preamble}"
                })

        # Duyệt qua các Điều (Regex split trả về: [preamble, title1, break, content1, title2, break, content2...])
        # Do capture group trong regex, danh sách sẽ xen kẽ: Title, Newline, Content
        
        # Logic xử lý mảng sau split regex hơi phức tạp, ta dùng finditer để an toàn hơn
        matches = list(self.article_pattern.finditer(full_text))
        
        for i, match in enumerate(matches):
            article_title_raw = match.group(1).strip() # VD: Điều 5. Chính sách của Nhà nước
            
            # Xác định điểm bắt đầu và kết thúc của content
            start_idx = match.end()
            end_idx = matches[i+1].start() if i + 1 < len(matches) else len(full_text)
            
            article_content = full_text[start_idx:end_idx].strip()
            
            # Tách số hiệu điều và tên điều
            article_number = "Unknown"
            article_name = article_title_raw
            
            number_match = re.match(r'Điều\s+(\d+)', article_title_raw, re.IGNORECASE)
            if number_match:
                article_number = number_match.group(1)
            
            # --- CHUNKING STRATEGY ---
            # Nếu Điều quá dài (có nhiều Khoản), ta tách tiếp theo Khoản
            sub_chunks = self._split_article_to_clauses(article_content)
            
            for idx, sub in enumerate(sub_chunks):
                chunk_id = f"{source_filename}_art{article_number}_{idx}"
                
                # Context Injection: Đây là phần quan trọng nhất cho Chatbot
                # Format: [Tên Luật] - [Tên Điều] - [Nội dung]
                context_string = f"Luật: {law_name}. {article_title_raw}. Nội dung: {sub}"
                
                chunks.append({
                    "id": chunk_id,
                    "original_text": f"{article_title_raw}\n{sub}", # Text hiển thị cho user
                    "text_for_embedding": context_string,          # Text ném vào model embedding
                    "metadata": {
                        "source": source_filename,
                        "law_name": law_name,
                        "article_number": article_number,
                        "article_title": article_title_raw,
                        "type": "legal_article"
                    }
                })
                
        return chunks

    def _split_article_to_clauses(self, text: str) -> List[str]:
        """
        Tách một Điều thành các Khoản (1. abc, 2. xyz)
        Nếu không tách được hoặc ngắn quá thì giữ nguyên.
        """
        # Regex bắt dòng bắt đầu bằng số và dấu chấm: "1. ", "2."
        clause_pattern = re.compile(r'(^|\n)\s*(\d+\.)\s+')
        
        parts = clause_pattern.split(text)
        
        # Nếu không tìm thấy pattern khoản, trả về nguyên text
        if len(parts) < 2:
            return [text]
            
        results = []
        # Logic ghép lại số thứ tự với nội dung sau khi split
        # Parts thường là: ['', '1.', 'Nội dung khoản 1', '\n', '2.', 'Nội dung khoản 2']
        current_clause = ""
        for part in parts:
            if re.match(r'\d+\.', part):
                if current_clause:
                    results.append(current_clause.strip())
                current_clause = part # Bắt đầu khoản mới (VD: "1.")
            else:
                current_clause += " " + part
        
        if current_clause:
            results.append(current_clause.strip())
            
        # Lọc các chunk quá ngắn (rác)
        return [r for r in results if len(r) > 10]

    def _guess_law_name(self, filename: str) -> str:
        """
        Mapping filename sang tên luật chuẩn xác.
        QUAN TRỌNG: Vector DB cần tên luật chuẩn để tìm kiếm chính xác.
        Tuyệt đối không được fallback về filename vì sẽ làm nhiễu vector search.
        """
        # Chuẩn hóa filename để so sánh dễ hơn
        name_clean = filename.lower().replace(".pdf", "").replace(".docx", "").replace(".doc", "")
        
        # Mapping đầy đủ và chính xác - Manual mapping là an toàn nhất
        mapping = {
            # Luật Doanh Nghiệp
            "67": "Luật Doanh Nghiệp 2020",
            "doanh nghiep": "Luật Doanh Nghiệp 2020",
            "67-vbhn-vpqh": "Luật Doanh Nghiệp 2020",
            "67_vbhn_vpqh": "Luật Doanh Nghiệp 2020",
            
            # Luật Thuế Giá trị gia tăng (GTGT)
            "93": "Luật Thuế Giá trị gia tăng",
            "gia tri gia tang": "Luật Thuế Giá trị gia tăng",
            "gtgt": "Luật Thuế Giá trị gia tăng",
            "93-vbhn-vpqh1": "Luật Thuế Giá trị gia tăng",
            "93_vbhn_vpqh1": "Luật Thuế Giá trị gia tăng",
            "93-vbhn-vpqh": "Luật Thuế Giá trị gia tăng",
            
            # Luật Thuế Thu nhập cá nhân (TNCN)
            "103": "Luật Thuế Thu nhập cá nhân",
            "thu nhap ca nhan": "Luật Thuế Thu nhập cá nhân",
            "tncn": "Luật Thuế Thu nhập cá nhân",
            "103-vbhn-vpqh": "Luật Thuế Thu nhập cá nhân",
            "103_vbhn_vpqh": "Luật Thuế Thu nhập cá nhân",
            
            # Bộ luật Lao động
            "125": "Bộ luật Lao động",
            "lao dong": "Bộ luật Lao động",
            "125-vbhn-vpqh": "Bộ luật Lao động",
            "125_vbhn_vpqh": "Bộ luật Lao động",
            
            # Luật Đầu tư
            "134": "Luật Đầu tư",
            "dau tu": "Luật Đầu tư",
            "134-vbhn-vpqh": "Luật Đầu tư",
            "134_vbhn_vpqh": "Luật Đầu tư",
            
            # Luật Thuế Thu nhập doanh nghiệp (TNDN)
            "575": "Luật Thuế Thu nhập doanh nghiệp",
            "576": "Luật Thuế Thu nhập doanh nghiệp",
            "thu nhap doanh nghiep": "Luật Thuế Thu nhập doanh nghiệp",
            "tndn": "Luật Thuế Thu nhập doanh nghiệp",
            "2023_575": "Luật Thuế Thu nhập doanh nghiệp",
            "2023_576": "Luật Thuế Thu nhập doanh nghiệp",
            
            # Nghị định 123
            "123": "Nghị định 123/2020/NĐ-CP về Hóa đơn, chứng từ",
            "nghi dinh 123": "Nghị định 123/2020/NĐ-CP về Hóa đơn, chứng từ",
        }
        
        # 1. Check mapping cứng (Ưu tiên số hiệu văn bản và patterns cụ thể)
        for key, value in mapping.items():
            if key in name_clean:
                logger.debug(f"Matched '{key}' -> '{value}' for file '{filename}'")
                return value
        
        # 2. Nếu không map được, log warning và cố gắng làm đẹp tên file (Fallback cuối cùng)
        logger.warning(
            f"⚠️  Không tìm thấy mapping cho file '{filename}'. "
            f"Đang dùng fallback - CẦN THÊM MAPPING CHO FILE NÀY!"
        )
        
        # Bỏ đuôi file và các ký tự lạ
        clean_name = filename.replace(".pdf", "").replace(".docx", "").replace(".doc", "")
        clean_name = clean_name.replace("-vbhn-vpqh", "").replace("_vbhn_vpqh", "")
        clean_name = clean_name.replace("-", " ").replace("_", " ")
        clean_name = clean_name.strip()
        
        # Viết hoa chữ cái đầu mỗi từ
        words = clean_name.split()
        clean_name = " ".join(word.capitalize() for word in words)
        
        return clean_name if clean_name else "Văn bản không xác định"

# --- Tích hợp vào pipeline của bạn ---

def process_file_with_optimized_parser(file_path: Path) -> Optional[Dict[str, Any]]:
    """
    Process file sử dụng optimized VietnamLegalParser
    
    Returns:
        Dict với structure:
        {
            "file_info": {"filename": "...", "chunks_count": 0},
            "chunks": [...]
        }
    """
    try:
        # Sử dụng parser hiện có để đọc file
        existing_parser = LegalDocumentParser()
        text = existing_parser.parse_file(file_path)
        
        # Sử dụng optimized parser để extract structure
        optimized_parser = VietnamLegalParser()
        chunks = optimized_parser.extract_structure(text, file_path.name)
        
        return {
            "file_info": {"filename": file_path.name, "chunks_count": len(chunks)},
            "chunks": chunks
        }

    except ValueError as e:
        error_msg = str(e)
        if "PDF scan" in error_msg:
            logger.warning(f"  ⚠️  Skipping {file_path.name}: {error_msg}")
        else:
            logger.warning(f"  ⚠️  Skipping {file_path.name}: {error_msg}")
        return None
    except Exception as e:
        logger.error(f"Lỗi xử lý file {file_path}: {str(e)}", exc_info=True)
        return None


def process_file_with_existing_parser(file_path: Path, parser: LegalDocumentParser, chunker: LegalDocumentChunker) -> Optional[Dict[str, Any]]:
    """
    Process file sử dụng existing parser và chunker (với improvements đã có)
    """
    try:
        logger.info(f"Processing: {file_path.name}")
        
        # Parse file (đã có clean_vbhn_text tự động)
        text = parser.parse_file(file_path)
        logger.info(f"  ✓ Parsed {len(text)} characters")
        
        # Extract metadata từ filename
        file_metadata = parser.extract_metadata_from_filename(file_path)
        
        # Extract document info (đã có extract_doc_name mới)
        doc_info = chunker.extract_doc_info(text, file_path.name)
        
        # Chunk document (đã có enrich_text_for_embedding với context injection)
        chunks = chunker.chunk_document(
            text,
            filename=file_path.name,
            max_article_length=2000,
            max_clause_length=1000
        )
        logger.info(f"  ✓ Created {len(chunks)} chunks")
        
        # Build document info
        document_info = {
            "filename": file_path.name,
            "file_path": str(file_path),
            "doc_name": doc_info.get("doc_name", file_path.name),
            "doc_type": doc_info.get("doc_type", "Văn bản"),
            "source_id": doc_info.get("source_id") or file_metadata.get("source_id", ""),
            "effective_date": doc_info.get("effective_date"),
            "status": doc_info.get("status", "active"),
            "parsed_at": datetime.now().isoformat(),
            "total_chunks": len(chunks),
            "total_characters": len(text)
        }
        
        # Convert chunks to JSON-serializable format
        chunks_json = []
        for chunk in chunks:
            chunk_json = {
                "id": chunk.get("id", ""),
                "text_for_embedding": chunk.get("text_for_embedding", ""),
                "original_text": chunk.get("original_text", ""),
                "metadata": chunk.get("metadata", {})
            }
            chunks_json.append(chunk_json)
        
        return {
            "document_info": document_info,
            "chunks": chunks_json
        }
        
    except ValueError as e:
        error_msg = str(e)
        if "PDF scan" in error_msg:
            logger.warning(f"  ⚠️  Skipping {file_path.name}: {error_msg}")
        else:
            logger.warning(f"  ⚠️  Skipping {file_path.name}: {error_msg}")
        return None
    except Exception as e:
        logger.error(f"  ❌ Error parsing {file_path.name}: {e}", exc_info=True)
        return None

def parse_all_documents(
    input_dir: Path,
    output_file: Optional[Path] = None,
    output_dir: Optional[Path] = None,
    export_individual: bool = False,
    use_optimized_parser: bool = False
) -> Dict[str, Any]:
    """
    Parse tất cả documents trong folder và xuất JSON
    
    Args:
        input_dir: Folder chứa PDF/DOC files
        output_file: File JSON output tổng hợp
        output_dir: Folder để lưu các file JSON riêng lẻ
        export_individual: Nếu True, sẽ export mỗi document thành 1 file JSON riêng
        use_optimized_parser: Nếu True, sử dụng VietnamLegalParser (simplified), 
                              nếu False, sử dụng existing parser với improvements
    """
    # Get all PDF and DOC files
    pdf_files = list(input_dir.glob("*.pdf"))
    doc_files = list(input_dir.glob("*.doc")) + list(input_dir.glob("*.docx"))
    all_files = sorted(pdf_files + doc_files)
    
    if not all_files:
        logger.warning(f"No PDF or DOC files found in {input_dir}")
        return {"documents": [], "summary": {}}
    
    logger.info(f"Found {len(all_files)} files to parse")
    
    # Initialize parsers
    if use_optimized_parser:
        logger.info("Using optimized VietnamLegalParser (simplified version)")
    else:
        logger.info("Using existing LegalDocumentParser with improvements (recommended)")
        existing_parser = LegalDocumentParser()
        chunker = LegalDocumentChunker()
    
    # Parse all documents
    all_documents = []
    failed_files = []
    
    for file_path in all_files:
        if use_optimized_parser:
            doc_json = process_file_with_optimized_parser(file_path)
        else:
            doc_json = process_file_with_existing_parser(file_path, existing_parser, chunker)
        
        if doc_json:
            # Normalize structure
            if "document_info" in doc_json:
                # Existing parser format
                all_documents.append(doc_json)
            else:
                # Optimized parser format - convert to standard format
                file_info = doc_json.get("file_info", {})
                all_documents.append({
                    "document_info": {
                        "filename": file_info.get("filename", file_path.name),
                        "file_path": str(file_path),
                        "doc_name": doc_json["chunks"][0]["metadata"].get("law_name", "") if doc_json.get("chunks") else file_path.name,
                        "doc_type": "Luật",
                        "source_id": "",
                        "effective_date": None,
                        "status": "active",
                        "parsed_at": datetime.now().isoformat(),
                        "total_chunks": len(doc_json.get("chunks", [])),
                        "total_characters": 0
                    },
                    "chunks": doc_json.get("chunks", [])
                })
            
            # Export individual file nếu được yêu cầu
            if export_individual and output_dir:
                output_dir.mkdir(parents=True, exist_ok=True)
                individual_file = output_dir / f"{file_path.stem}.json"
                with open(individual_file, "w", encoding="utf-8") as f:
                    json.dump(all_documents[-1], f, ensure_ascii=False, indent=2)
                logger.info(f"  ✓ Exported to {individual_file.name}")
        else:
            failed_files.append(file_path.name)
    
    # Create summary
    total_chunks = sum(doc["document_info"]["total_chunks"] for doc in all_documents)
    doc_types = {}
    for doc in all_documents:
        doc_type = doc["document_info"]["doc_type"]
        doc_types[doc_type] = doc_types.get(doc_type, 0) + 1
    
    summary = {
        "total_documents": len(all_documents),
        "total_chunks": total_chunks,
        "failed_files": failed_files,
        "document_types": doc_types,
        "parsed_at": datetime.now().isoformat()
    }
    
    result = {
        "summary": summary,
        "documents": all_documents
    }
    
    # Save to output file
    if output_file:
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        logger.info(f"\n✅ Exported to: {output_file}")
        logger.info(f"   Total documents: {len(all_documents)}")
        logger.info(f"   Total chunks: {total_chunks}")
    
    return result


def main():
    """Main function"""
    parser = argparse.ArgumentParser(
        description="Parse các file luật và xuất ra JSON với metadata có cấu trúc"
    )
    parser.add_argument(
        "--input-dir",
        type=str,
        help="Đường dẫn folder chứa PDF/DOC files (mặc định: ai/luat_VN)"
    )
    parser.add_argument(
        "--output",
        type=str,
        help="File JSON output tổng hợp (mặc định: legal_documents.json)"
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        help="Folder để lưu các file JSON riêng lẻ (nếu --export-individual)"
    )
    parser.add_argument(
        "--export-individual",
        action="store_true",
        help="Export mỗi document thành 1 file JSON riêng"
    )
    parser.add_argument(
        "--use-optimized",
        action="store_true",
        help="Sử dụng optimized VietnamLegalParser (simplified, không tích hợp đầy đủ features)"
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
    
    # Get output file
    if args.output:
        output_file = Path(args.output)
    else:
        script_dir = Path(__file__).parent
        output_file = script_dir / "legal_documents.json"
    
    # Get output dir for individual files
    output_dir = None
    if args.export_individual:
        if args.output_dir:
            output_dir = Path(args.output_dir)
        else:
            script_dir = Path(__file__).parent
            output_dir = script_dir / "legal_documents_individual"
    
    logger.info("="*80)
    logger.info("PARSE LEGAL DOCUMENTS TO JSON")
    logger.info("="*80)
    logger.info(f"Input directory: {input_dir}")
    logger.info(f"Output file: {output_file}")
    if args.export_individual:
        logger.info(f"Individual output directory: {output_dir}")
    logger.info(f"Parser mode: {'Optimized (simplified)' if args.use_optimized else 'Existing (recommended - with improvements)'}")
    logger.info("="*80 + "\n")
    
    # Parse documents
    result = parse_all_documents(
        input_dir=input_dir,
        output_file=output_file,
        output_dir=output_dir,
        export_individual=args.export_individual,
        use_optimized_parser=args.use_optimized
    )
    
    # Print summary
    logger.info("\n" + "="*80)
    logger.info("SUMMARY")
    logger.info("="*80)
    summary = result["summary"]
    logger.info(f"Total documents: {summary['total_documents']}")
    logger.info(f"Total chunks: {summary['total_chunks']}")
    logger.info(f"Document types: {summary['document_types']}")
    if summary["failed_files"]:
        logger.warning(f"Failed files: {summary['failed_files']}")
    logger.info("="*80)


if __name__ == "__main__":
    main()