"""
Parser cho văn bản pháp luật Việt Nam
Hỗ trợ PDF và DOC files
"""
import re
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path

try:
    import fitz  # PyMuPDF
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False
    logging.warning("PyMuPDF not installed. PDF parsing will not work.")

try:
    from docx import Document
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False
    logging.warning("python-docx not installed. DOC parsing will not work.")

logger = logging.getLogger(__name__)


class LegalDocumentParser:
    """Parser cho văn bản pháp luật Việt Nam"""
    
    def __init__(self):
        # FIX 2: Cải thiện regex patterns để linh hoạt hơn
        self.chapter_pattern = re.compile(
            r'^(CHƯƠNG\s+[IVXLC]+|Chương\s+[IVXLC]+|CHƯƠNG\s+\d+|Chương\s+\d+)[:\.]?\s*(.+?)$',
            re.IGNORECASE | re.MULTILINE
        )
        # Cho phép whitespace linh hoạt, tiêu đề có thể ở dòng tiếp theo
        self.article_pattern = re.compile(
            r'^\s*(Điều\s+(\d+)\.?\s*[:\.]?)\s*(.*?)$',
            re.IGNORECASE | re.MULTILINE
        )
        # Regex cho Khoản: Bắt đầu bằng số + dấu chấm hoặc đóng ngoặc
        # Cẩn thận không bắt nhầm ngày tháng năm (01.01.2020)
        self.clause_pattern = re.compile(
            r'^\s*(\d+)[\.\)]\s+(.*)$',
            re.MULTILINE
        )
        # FIX 4: Regex cho Điểm (a, b, c, d, đ, e...)
        # FIX 2: Thêm 'đ' vào regex để bắt được điểm đ) trong tiếng Việt
        self.point_pattern = re.compile(
            r'^\s*([a-zđ])[\.\)]\s+(.*)$',
            re.IGNORECASE | re.MULTILINE
        )
    
    def clean_vbhn_text(self, text: str) -> str:
        """
        Làm sạch văn bản VBHN (Văn bản hợp nhất)
        Loại bỏ các yếu tố gây nhiễu cho vector search:
        - Footnotes: [1], [12], [a], [b]
        - Page markers: --- PAGE 1 ---, Trang 1/50
        - Header/Footer thường gặp
        """
        # Xóa các dòng số trang và page markers
        text = re.sub(r'---\s*PAGE\s+\d+\s*---', '', text, flags=re.IGNORECASE)
        text = re.sub(r'Trang\s+\d+\s*/\s*\d+', '', text, flags=re.IGNORECASE)
        text = re.sub(r'Page\s+\d+', '', text, flags=re.IGNORECASE)
        
        # Xóa các footnote references: [1], [12], [a], [b]
        # Chỉ xóa nếu chúng đứng độc lập hoặc ở cuối dòng (không phải số khoản)
        # Pattern: [số hoặc chữ] không theo sau bởi chữ cái tiếng Việt
        text = re.sub(r'\[\d+\](?![a-zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ])', '', text)
        text = re.sub(r'\[[a-z]\](?![a-zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ])', '', text, flags=re.IGNORECASE)
        
        # Xóa các dòng chỉ chứa số hoặc ký tự đặc biệt (header/footer noise)
        lines = text.split('\n')
        cleaned_lines = []
        for line in lines:
            line = line.strip()
            # Bỏ qua dòng chỉ chứa số, dấu cách, hoặc ký tự đặc biệt
            if not line:
                cleaned_lines.append('')
                continue
            # Giữ lại dòng có chữ cái tiếng Việt hoặc tiếng Anh
            if re.search(r'[a-zA-ZàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ]', line):
                cleaned_lines.append(line)
        
        text = '\n'.join(cleaned_lines)
        
        # Chuẩn hóa khoảng trắng (giữ nguyên newlines nhưng normalize spaces)
        text = re.sub(r'[ \t]+', ' ', text)  # Multiple spaces -> single space
        text = re.sub(r'\n{3,}', '\n\n', text)  # Multiple newlines -> max 2
        
        return text.strip()
    
    def parse_pdf(self, file_path: Path) -> str:
        """
        Parse PDF file và trả về text
        Phát hiện PDF scan (image-based) và cảnh báo
        Tự động clean VBHN text
        """
        if not PDF_AVAILABLE:
            raise ImportError("PyMuPDF not installed. Install with: pip install PyMuPDF")
        
        try:
            doc = fitz.open(str(file_path))
            text_parts = []
            empty_pages = 0  # Đếm số trang trắng
            total_chars = 0
            
            for page in doc:
                page_text = page.get_text()
                if not page_text.strip():
                    empty_pages += 1
                else:
                    total_chars += len(page_text.strip())
                text_parts.append(page_text)
            
            result = "\n".join(text_parts)
            
            # Clean VBHN text (loại bỏ footnotes, page markers, etc.)
            result = self.clean_vbhn_text(result)
            total_pages = len(doc)
            doc.close()
            
            # Cảnh báo nếu file có quá nhiều trang không đọc được text (dấu hiệu file scan)
            if total_pages > 0:
                if empty_pages == total_pages:
                    # Tất cả trang đều trống - file scan hoàn toàn
                    logger.warning(
                        f"⚠️  CẢNH BÁO: File {file_path.name} có vẻ là file Scan ảnh "
                        f"(không có text lớp trên). Tất cả {total_pages} trang đều không có text. "
                        f"Parser sẽ không lấy được nội dung. Nên dùng bản PDF text-based hoặc OCR."
                    )
                    raise ValueError(
                        f"PDF scan detected: File {file_path.name} appears to be image-based PDF. "
                        f"All {total_pages} pages are empty. No text extracted. "
                        f"Please use text-based PDF or OCR."
                    )
                elif empty_pages > total_pages * 0.8:
                    # > 80% trang trống - có thể là file scan một phần
                    logger.warning(
                        f"⚠️  CẢNH BÁO: File {file_path.name} có vẻ là file Scan ảnh một phần. "
                        f"{empty_pages}/{total_pages} trang không có text, chỉ có {total_chars} ký tự. "
                        f"Kết quả parse có thể không đầy đủ."
                    )
            
            return result
        except ValueError:
            # Re-raise ValueError (PDF scan)
            raise
        except Exception as e:
            logger.error(f"Error parsing PDF {file_path}: {e}")
            raise
    
    def parse_doc(self, file_path: Path) -> str:
        """
        Parse DOC/DOCX file và trả về text
        Tự động clean VBHN text
        """
        if not DOCX_AVAILABLE:
            raise ImportError("python-docx not installed. Install with: pip install python-docx")
        
        try:
            # Try to open as DOCX first
            doc = Document(str(file_path))
            text_parts = []
            
            for paragraph in doc.paragraphs:
                text = paragraph.text.strip()
                if text:
                    text_parts.append(text)
            
            result = "\n".join(text_parts)
            
            # If result is empty or too short, file might be corrupted
            if len(result.strip()) < 10:
                raise ValueError(f"File appears to be empty or corrupted: {file_path}")
            
            # Clean VBHN text (loại bỏ footnotes, page markers, etc.)
            result = self.clean_vbhn_text(result)
            
            return result
        except ValueError as e:
            # Re-raise ValueError (empty/corrupted)
            logger.error(f"Error parsing DOC {file_path}: {e}")
            raise
        except Exception as e:
            # For other errors (not a Word file, package not found, etc.)
            error_msg = str(e)
            if "not a Word file" in error_msg or "Package not found" in error_msg:
                logger.warning(f"File {file_path} is not a valid Word file or is corrupted. Skipping...")
                raise ValueError(f"Invalid or corrupted Word file: {file_path}")
            else:
                logger.error(f"Error parsing DOC {file_path}: {e}")
                raise
    
    def parse_file(self, file_path: Path) -> str:
        """Parse file dựa trên extension"""
        suffix = file_path.suffix.lower()
        
        if suffix == '.pdf':
            return self.parse_pdf(file_path)
        elif suffix in ['.doc', '.docx']:
            return self.parse_doc(file_path)
        else:
            raise ValueError(f"Unsupported file type: {suffix}")
    
    def extract_doc_name(self, text: str) -> Optional[str]:
        """
        Extract tên văn bản luật chính xác từ phần đầu của text
        Xử lý cả trường hợp có xuống dòng
        
        Ví dụ:
        - "LUẬT\nDOANH NGHIỆP\n2020" -> "Luật Doanh nghiệp 2020"
        - "Luật\nĐầu tư\n2020" -> "Luật Đầu tư 2020"
        - "LUẬT \nT" -> "Luật Thuế..." (cần normalize trước)
        """
        # CRITICAL FIX: Normalize text trước khi parse
        # Loại bỏ xuống dòng thừa trong phần header (1000 ký tự đầu)
        header = text[:1500]  # Tăng lên 1500 để đảm bảo đủ
        
        # Replace multiple newlines with single space trong header
        # Nhưng giữ lại structure nếu có dòng trống rõ ràng
        header_normalized = re.sub(r'\n\s*\n', '\n\n', header)  # Giữ paragraph breaks
        header_normalized = re.sub(r'(?<=[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ])\n(?=[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ])', ' ', header_normalized)
        
        lines = header_normalized.split('\n')
        
        # Tìm dòng bắt đầu bằng "LUẬT" hoặc "Luật"
        law_start_idx = None
        for i, line in enumerate(lines):
            line_clean = line.strip().upper()
            if line_clean.startswith('LUẬT') or line_clean.startswith('BỘ LUẬT'):
                law_start_idx = i
                break
        
        if law_start_idx is None:
            return None
        
        # Bắt đầu từ dòng có "LUẬT", lấy các dòng tiếp theo cho đến khi gặp:
        # - Số hiệu văn bản (VD: 59/2020/QH14)
        # - Ngày tháng (VD: 17/06/2020)
        # - CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
        # - Quốc hội, Chính phủ, etc.
        # - Hoặc đã đủ 8 dòng (tăng từ 5 lên 8 để đảm bảo đủ)
        doc_name_parts = []
        max_lines = min(law_start_idx + 8, len(lines))
        
        for i in range(law_start_idx, max_lines):
            line = lines[i].strip()
            if not line:
                continue
            
            # Dừng nếu gặp số hiệu văn bản
            if re.search(r'\d{1,3}/\d{4}/(QH|NĐ|TT)|CỘNG HÒA|QUỐC HỘI|CHÍNH PHỦ|ỦY BAN|CHỦ TỊCH', line, re.IGNORECASE):
                break
            
            # Dừng nếu gặp ngày tháng năm (VD: 17/06/2020)
            if re.search(r'\d{1,2}/\d{1,2}/\d{4}', line):
                break
            
            # Dừng nếu gặp "Số:" hoặc "Number:"
            if re.search(r'^(Số|Number):', line, re.IGNORECASE):
                break
            
            # Thêm dòng vào doc_name
            doc_name_parts.append(line)
            
            # Nếu dòng này có chứa năm 4 chữ số (2020, 2021, etc), có thể là kết thúc tên
            # Nhưng vẫn include năm vào tên luật
            if re.search(r'\b(19|20)\d{2}\b', line):
                # Nếu năm ở cuối dòng hoặc là toàn bộ dòng, có thể dừng
                year_match = re.search(r'\b(19|20)\d{2}\b', line)
                if year_match:
                    year_pos = line.find(year_match.group(0))
                    # Nếu năm ở cuối và phần trước đã có nội dung đủ, có thể dừng
                    if year_pos > len(line) - 5 and len(doc_name_parts) >= 2:
                        break
        
        if not doc_name_parts:
            return None
        
        # Gộp các phần lại, loại bỏ khoảng trắng thừa
        doc_name = ' '.join(doc_name_parts)
        doc_name = re.sub(r'\s+', ' ', doc_name).strip()
        
        # CRITICAL FIX: Loại bỏ các ký tự đặc biệt, số thứ tự không cần thiết
        # VD: "LUẬT 1. DOANH NGHIỆP" -> "LUẬT DOANH NGHIỆP"
        doc_name = re.sub(r'\s+\d+\.\s+', ' ', doc_name)
        
        # Chuẩn hóa: Chữ cái đầu viết hoa cho mỗi từ
        # Ví dụ: "LUẬT DOANH NGHIỆP 2020" -> "Luật Doanh Nghiệp 2020"
        words = doc_name.split()
        normalized_words = []
        for word in words:
            # Giữ nguyên số năm
            if re.match(r'^\d{4}$', word):
                normalized_words.append(word)
            else:
                normalized_words.append(word.capitalize())
        doc_name = ' '.join(normalized_words)
        
        # CRITICAL FIX: Validate kết quả
        # Nếu tên quá ngắn (< 10 ký tự) hoặc chỉ có "Luật", có thể là lỗi
        if len(doc_name) < 10 or doc_name.strip().upper() == 'LUẬT':
            logger.warning(f"⚠️ Extracted doc_name quá ngắn hoặc không hợp lệ: '{doc_name}'")
            return None
        
        return doc_name
    
    def guess_law_name_from_filename(self, filename: str) -> str:
        """
        Guess tên luật từ filename nếu extract_doc_name() không hoạt động
        Mapping dựa trên số hiệu văn bản và patterns trong filename
        
        QUAN TRỌNG: Đảm bảo luôn trả về tên luật tiếng Việt chuẩn,
        không bao giờ trả về filename thô vì sẽ làm nhiễu vector search.
        """
        # Chuẩn hóa filename
        name_clean = filename.lower().replace(".pdf", "").replace(".docx", "").replace(".doc", "")
        
        # CRITICAL FIX: Mapping đầy đủ cho TẤT CẢ các file trong luat_VN
        # Dựa trên danh sách file thực tế:
        # - 103-vbhn-vpqh.pdf
        # - 123.signed_01.pdf
        # - 125-vbhn-vpqh.pdf
        # - 134-vbhn-vpqh.pdf
        # - 2023_575 + 576_22-VBHN-VPQH.pdf
        # - 67-VBHN-VPQH.docx
        # - 93-vbhn-vpqh1.pdf
        
        mapping = {
            # File: 67-VBHN-VPQH.docx
            "67-vbhn": "Luật Doanh Nghiệp 2020",
            "67": "Luật Doanh Nghiệp 2020",
            
            # File: 93-vbhn-vpqh1.pdf (scan - skip)
            "93-vbhn": "Luật Thuế Giá Trị Gia Tăng 2008",
            "93": "Luật Thuế Giá Trị Gia Tăng 2008",
            
            # File: thue_gtgt.pdf (NEW - Luật Thuế GTGT 2024)
            "thue_gtgt": "Luật Thuế Giá Trị Gia Tăng 2024",
            "thue gtgt": "Luật Thuế Giá Trị Gia Tăng 2024",
            
            # File: 103-vbhn-vpqh.pdf
            "103-vbhn": "Luật Thuế Thu Nhập Cá Nhân 2007",
            "103": "Luật Thuế Thu Nhập Cá Nhân 2007",
            
            # File: 123.signed_01.pdf
            "123.signed": "Nghị Định 123/2020/NĐ-CP",
            "123": "Nghị Định 123/2020/NĐ-CP",
            
            # File: 125-vbhn-vpqh.pdf
            "125-vbhn": "Bộ Luật Lao Động 2019",
            "125": "Bộ Luật Lao Động 2019",
            
            # File: 134-vbhn-vpqh.pdf
            "134-vbhn": "Luật Đầu Tư 2020",
            "134": "Luật Đầu Tư 2020",
            
            # File: 2023_575 + 576_22-VBHN-VPQH.pdf
            "575": "Luật Thuế Thu Nhập Doanh Nghiệp 2008",
            "576": "Luật Thuế Thu Nhập Doanh Nghiệp 2008",
            "22-vbhn": "Luật Thuế Thu Nhập Doanh Nghiệp 2008",
            
            # Additional common patterns
            "doanh nghiep": "Luật Doanh Nghiệp 2020",
            "gia tri gia tang": "Luật Thuế Giá Trị Gia Tăng 2024",
            "gtgt": "Luật Thuế Giá Trị Gia Tăng 2024",
            "thu nhap ca nhan": "Luật Thuế Thu Nhập Cá Nhân 2007",
            "tncn": "Luật Thuế Thu Nhập Cá Nhân 2007",
            "lao dong": "Bộ Luật Lao Động 2019",
            "dau tu": "Luật Đầu Tư 2020",
            "thu nhap doanh nghiep": "Luật Thuế Thu Nhập Doanh Nghiệp 2008",
            "tndn": "Luật Thuế Thu Nhập Doanh Nghiệp 2008",
        }
        
        # Check mapping với priority cao nhất cho exact match
        # Ưu tiên match dài hơn trước (VD: "67-vbhn" trước "67")
        sorted_keys = sorted(mapping.keys(), key=len, reverse=True)
        for key in sorted_keys:
            if key in name_clean:
                logger.debug(f"Matched '{key}' -> '{mapping[key]}' for file '{filename}'")
                return mapping[key]
        
        # Nếu không map được, log warning và return tên generic
        logger.warning(
            f"⚠️ Không tìm thấy mapping cho file '{filename}'. "
            f"Đang dùng tên generic - CẦN THÊM MAPPING CHO FILE NÀY!"
        )
        return "Văn Bản Pháp Luật"
    
    def extract_metadata_from_filename(self, file_path: Path) -> Dict[str, Any]:
        """
        Extract metadata từ tên file
        Hỗ trợ nhiều format:
        - 67-VBHN-VPQH.pdf -> source_id: 67
        - 2023_575 + 576_22-VBHN-VPQH.pdf -> source_id: 22 (ưu tiên số sau dấu gạch ngang cuối)
        - 123-ND-CP.pdf -> source_id: 123
        """
        filename = file_path.stem
        
        # Pattern 1: số-vbhn-vpqh hoặc số-VBHN-VPQH (format chuẩn)
        match = re.match(r'^(\d+)[-_]?vbhn[-_]?vpqh', filename, re.IGNORECASE)
        if match:
            return {
                "source_id": match.group(1),
                "filename": filename
            }
        
        # Pattern 2: Tìm số hiệu ở cuối trước VBHN (VD: 2023_575 + 576_22-VBHN -> lấy 22)
        match = re.search(r'[-_](\d+)[-_]?vbhn[-_]?vpqh', filename, re.IGNORECASE)
        if match:
            return {
                "source_id": match.group(1),
                "filename": filename
            }
        
        # Pattern 3: Format Nghị định/Thông tư (VD: 123-ND-CP, 456-TT-BTC)
        match = re.match(r'^(\d+)[-_](ND|TT|QĐ)[-_]', filename, re.IGNORECASE)
        if match:
            return {
                "source_id": match.group(1),
                "filename": filename
            }
        
        # Pattern 4: Chỉ có số ở đầu (fallback)
        match = re.match(r'^(\d+)', filename)
        if match:
            # Kiểm tra xem có phải năm không (4 chữ số và > 2000)
            potential_year = int(match.group(1))
            if len(match.group(1)) == 4 and potential_year > 2000:
                # Có thể là năm, không dùng làm source_id
                pass
            else:
                return {
                    "source_id": match.group(1),
                    "filename": filename
                }
        
        # Không tìm thấy pattern, dùng tên file làm ID (sanitize)
        sanitized_id = re.sub(r'[^a-zA-Z0-9]', '_', filename)[:50]  # Giới hạn 50 ký tự
        return {
            "source_id": sanitized_id,
            "filename": filename
        }
    
    def split_by_chapters(self, text: str) -> List[Dict[str, Any]]:
        """Tách text thành các chương"""
        chapters = []
        lines = text.split('\n')
        
        current_chapter = None
        current_content = []
        
        for line in lines:
            line = line.strip()
            if not line:
                if current_content:
                    current_content.append("")
                continue
            
            # Check if this line is a chapter header
            chapter_match = self.chapter_pattern.match(line)
            if chapter_match:
                # FIX 1: Save previous chapter if exists
                if current_chapter:
                    chapters.append({
                        "chapter": current_chapter,
                        "content": "\n".join(current_content)
                    })
                # FIX 1: Lưu nội dung preamble (nếu có) trước Chương đầu tiên
                elif current_content:
                    chapters.append({
                        "chapter": "Phần mở đầu",
                        "content": "\n".join(current_content)
                    })
                
                # Start new chapter
                chapter_num = chapter_match.group(1)
                chapter_title = chapter_match.group(2) if len(chapter_match.groups()) > 1 else ""
                current_chapter = f"{chapter_num}: {chapter_title}".strip()
                current_content = []
            else:
                current_content.append(line)
        
        # Add last chapter
        if current_chapter:
            chapters.append({
                "chapter": current_chapter,
                "content": "\n".join(current_content)
            })
        # FIX 1: Nếu không có chapter nào, lưu toàn bộ content
        elif current_content:
            chapters.append({
                "chapter": "",
                "content": "\n".join(current_content)
            })
        
        return chapters
    
    def split_by_articles(self, text: str, chapter: str = "") -> List[Dict[str, Any]]:
        """Tách text thành các điều"""
        articles = []
        lines = text.split('\n')
        
        current_article = None
        current_title = ""
        current_content = []
        
        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                if current_content:
                    current_content.append("")
                continue
            
            # Check if this line is an article header
            article_match = self.article_pattern.match(line)
            if article_match:
                # Save previous article if exists
                if current_article:
                    articles.append({
                        "article": current_article,
                        "article_title": current_title,
                        "content": "\n".join(current_content),
                        "chapter": chapter
                    })
                # FIX 1: Lưu nội dung dẫn nhập (nếu có) trước Điều 1
                elif current_content:
                    articles.append({
                        "article": "Dẫn nhập",
                        "article_title": "",
                        "content": "\n".join(current_content),
                        "chapter": chapter
                    })
                
                # Start new article
                full_match = article_match.group(1)
                article_num = article_match.group(2)
                article_title = article_match.group(3) if len(article_match.groups()) > 2 else ""
                
                # FIX 2: Nếu tiêu đề rỗng, check dòng tiếp theo
                if not article_title.strip() and i + 1 < len(lines):
                    next_line = lines[i + 1].strip()
                    # Heuristic: Nếu dòng tiếp theo ngắn (< 100 ký tự) và không phải số khoản
                    if next_line and len(next_line) < 100 and not self.clause_pattern.match(next_line):
                        article_title = next_line
                        # Skip next line khi add vào content
                        current_content = [full_match]
                        # Skip next line
                        continue
                
                current_article = f"Điều {article_num}"
                current_title = article_title.strip()
                current_content = [full_match]
            else:
                current_content.append(line)
        
        # Add last article
        if current_article:
            articles.append({
                "article": current_article,
                "article_title": current_title,
                "content": "\n".join(current_content),
                "chapter": chapter
            })
        
        return articles
    
    def split_by_clauses(self, text: str, article: str = "", article_title: str = "") -> List[Dict[str, Any]]:
        """Tách text thành các khoản (nếu điều quá dài)"""
        clauses = []
        lines = text.split('\n')
        
        current_clause = None
        current_content = []
        
        for line in lines:
            line = line.strip()
            if not line:
                if current_content:
                    current_content.append("")
                continue
            
            # Check if this line is a clause header (số. hoặc số))
            clause_match = self.clause_pattern.match(line)
            if clause_match:
                # Save previous clause if exists
                if current_clause:
                    clauses.append({
                        "clause": current_clause,
                        "content": "\n".join(current_content),
                        "article": article,
                        "article_title": article_title
                    })
                # FIX 1: Lưu nội dung dẫn nhập (nếu có) trước Khoản 1
                elif current_content:
                    clauses.append({
                        "clause": None,
                        "content": "\n".join(current_content),
                        "article": article,
                        "article_title": article_title
                    })
                
                # Start new clause
                clause_num = clause_match.group(1)
                clause_text = clause_match.group(2)
                current_clause = f"Khoản {clause_num}"
                current_content = [line]
            else:
                current_content.append(line)
        
        # Add last clause
        if current_clause:
            clauses.append({
                "clause": current_clause,
                "content": "\n".join(current_content),
                "article": article,
                "article_title": article_title
            })
        
        # If no clauses found, return the whole text as one chunk
        if not clauses:
            clauses.append({
                "clause": None,
                "content": text,
                "article": article,
                "article_title": article_title
            })
        
        return clauses
    
    def split_by_points(self, text: str, article: str = "", article_title: str = "", clause: str = "") -> List[Dict[str, Any]]:
        """Tách text thành các điểm (a, b, c, d...) nếu khoản quá dài"""
        points = []
        lines = text.split('\n')
        
        current_point = None
        current_content = []
        
        for line in lines:
            line = line.strip()
            if not line:
                if current_content:
                    current_content.append("")
                continue
            
            # Check if this line is a point header (a), b), c)...)
            point_match = self.point_pattern.match(line)
            if point_match:
                # Save previous point if exists
                if current_point:
                    points.append({
                        "point": current_point,
                        "content": "\n".join(current_content),
                        "article": article,
                        "article_title": article_title,
                        "clause": clause
                    })
                
                # Start new point
                point_letter = point_match.group(1).lower()
                point_text = point_match.group(2)
                current_point = point_letter
                current_content = [line]
            else:
                current_content.append(line)
        
        # Add last point
        if current_point:
            points.append({
                "point": current_point,
                "content": "\n".join(current_content),
                "article": article,
                "article_title": article_title,
                "clause": clause
            })
        
        # If no points found, return the whole text as one chunk
        if not points:
            points.append({
                "point": None,
                "content": text,
                "article": article,
                "article_title": article_title,
                "clause": clause
            })
        
        return points

