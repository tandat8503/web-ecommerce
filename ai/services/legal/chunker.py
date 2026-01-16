"""
Chunking logic cho văn bản pháp luật theo cấu trúc logic (Điều/Khoản)
"""
import re
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class LegalDocumentChunker:
    """Chunker cho văn bản pháp luật theo đơn vị logic"""
    
    def __init__(self):
        self.doc_type_patterns = {
            "Luật": re.compile(r'Luật\s+([^0-9]+?)(?:\s+\d{4})?', re.IGNORECASE),
            "Nghị định": re.compile(r'Nghị\s+định\s+số\s+(\d+/\d+/\d+/\w+)', re.IGNORECASE),
            "Thông tư": re.compile(r'Thông\s+tư\s+số\s+(\d+/\d+/\d+/\w+)', re.IGNORECASE),
        }
    
    def extract_doc_info(self, text: str, filename: str = "") -> Dict[str, Any]:
        """Extract thông tin văn bản từ text"""
        from .parser import LegalDocumentParser
        
        parser = LegalDocumentParser()
        
        # CRITICAL: Không bao giờ fallback về filename vì sẽ làm nhiễu vector search
        # Phải luôn có tên luật chuẩn tiếng Việt
        doc_info = {
            "doc_name": "",  # Sẽ được set sau khi extract hoặc guess
            "doc_type": "Văn bản",
            "source_id": "",
            "effective_date": None,
            "status": "active"
        }
        
        # Try to extract doc name using improved method
        extracted_doc_name = parser.extract_doc_name(text)
        if extracted_doc_name:
            doc_info["doc_name"] = extracted_doc_name
        else:
            # Fallback: Dùng filename-based mapping để đảm bảo luôn có tên luật
            doc_info["doc_name"] = parser.guess_law_name_from_filename(filename)
        
        # Try to extract doc type
        # Check if it's a Law (Luật)
        if re.search(r'^LUẬT\s+', text[:200], re.IGNORECASE | re.MULTILINE):
            doc_info["doc_type"] = "Luật"
        elif re.search(r'Nghị\s+định\s+số', text[:200], re.IGNORECASE):
            doc_info["doc_type"] = "Nghị định"
            # Try to extract source_id for Nghị định
            match = self.doc_type_patterns["Nghị định"].search(text[:500])
            if match:
                doc_info["source_id"] = match.group(1)
        elif re.search(r'Thông\s+tư\s+số', text[:200], re.IGNORECASE):
            doc_info["doc_type"] = "Thông tư"
            # Try to extract source_id for Thông tư
            match = self.doc_type_patterns["Thông tư"].search(text[:500])
            if match:
                    doc_info["source_id"] = match.group(1)
        
        # Try to extract year and date
        year_match = re.search(r'(\d{4})', text[:200])
        if year_match:
            year = year_match.group(1)
            # Try to extract full date
            date_match = re.search(r'(\d{1,2}/\d{1,2}/\d{4})', text[:500])
            if date_match:
                try:
                    date_str = date_match.group(1)
                    doc_info["effective_date"] = datetime.strptime(date_str, "%d/%m/%Y").strftime("%Y-%m-%d")
                except:
                    pass
        
        return doc_info
    
    def create_chunk_id(
        self,
        doc_type: str,
        doc_name: str,
        year: str,
        article: str,
        clause: Optional[str] = None,
        source_id: str = "",
        point: Optional[str] = None
    ) -> str:
        """
        Tạo unique ID cho chunk
        
        Args:
            doc_type: Loại văn bản (Luật, Nghị định, Thông tư)
            doc_name: Tên văn bản
            year: Năm
            article: Số điều (VD: "Điều 13")
            clause: Số khoản (VD: "Khoản 1") - optional
            source_id: Số hiệu văn bản (VD: "59/2020/QH14") - ưu tiên dùng làm prefix
            point: Điểm (VD: "a", "b", "c") - optional
        """
        # FIX 1: Ưu tiên dùng source_id làm prefix (định danh duy nhất)
        if source_id:
            # Chuyển "59/2020/QH14" thành "59_2020_QH14"
            prefix = re.sub(r'[^a-zA-Z0-9]', '_', source_id)
        else:
            # Fallback an toàn hơn: lấy nhiều ký tự hơn từ doc_name
            prefix = re.sub(r'[^a-zA-Z0-9]', '', doc_name)[:15].upper()
            if not prefix:
                # Nếu vẫn không có, dùng doc_type + year
                prefix = f"{doc_type[0].upper()}{year}"
        
        # Extract article number
        article_num = re.search(r'\d+', article)
        article_num_str = article_num.group(0) if article_num else "0"
        
        # Build ID parts
        parts = [prefix, f"D{article_num_str}"]
        
        # CRITICAL FIX: Luôn include clause để đảm bảo unique ID
        # Nếu clause được truyền vào (kể cả None), phải có trong ID
        if clause is not None:
            # Extract số từ clause (có thể là "Khoản 1" hoặc "K0" từ index)
            clause_num = re.search(r'\d+', clause)
            if clause_num:
                parts.append(f"K{clause_num.group(0)}")
            elif clause.startswith("K"):
                # Đã là format "K0", "K1", etc.
                parts.append(clause)
            else:
                # clause không có số, dùng "K0"
                parts.append("K0")
        else:
            # CRITICAL FIX: Nếu clause=None, vẫn thêm K0 để đảm bảo unique
            # Tránh trường hợp nhiều chunks cùng Điều có cùng ID
            parts.append("K0")
        
        # CRITICAL FIX: Luôn include point nếu được truyền vào
        if point is not None:
            # point có thể là "a", "b", "c" hoặc "p0", "p1" từ index
            if point.startswith("p") and point[1:].isdigit():
                # Format từ index: "p0" -> "P0"
                parts.append(point.upper())
            else:
                # Điểm thực: a, b, c, d, đ...
                parts.append(f"P{point.lower()}")
        
        return "_".join(parts)
    
    def enrich_text_for_embedding(
        self,
        doc_name: str,
        doc_type: str,
        chapter: str,
        article: str,
        article_title: str,
        content: str,
        clause: Optional[str] = None,
        point: Optional[str] = None
    ) -> str:
        """
        Context Injection cho text embedding - CỰC KỲ QUAN TRỌNG cho RAG Chatbot
        
        Strategy: Luôn luôn đảm bảo mỗi chunk có đầy đủ context để Vector Search
        có thể tìm chính xác ngay cả khi user query không rõ ràng.
        
        Format: [Tên Luật] - [Tên Điều] - [Khoản/Điểm] - [Nội dung]
        
        Ví dụ:
        "Luật Doanh nghiệp 2020. Điều 13: Người đại diện theo pháp luật. Khoản 1. Người đại diện theo pháp luật của doanh nghiệp có các quyền và nghĩa vụ sau đây: ..."
        
        Tại sao quan trọng?
        - Nếu chỉ có nội dung "Phạt tiền từ 10.000.000 đồng..." mà không có context,
          Vector Search sẽ trả về mọi quy định phạt tiền từ nhiều luật khác nhau.
        - Với context injection, Vector sẽ biết chính xác đây là quy định của Luật nào,
          Điều nào, áp dụng cho hành vi gì.
        """
        # Build context string theo format tối ưu cho semantic search
        context_parts = []
        
        # 1. Document level context (QUAN TRỌNG NHẤT)
        if doc_name:
            context_parts.append(f"Luật: {doc_name}")
        
        # 2. Chapter context (nếu có)
        if chapter:
            context_parts.append(chapter)
        
        # 3. Article context (RẤT QUAN TRỌNG)
        article_context = article
        if article_title:
            article_context = f"{article}: {article_title}"
        if article_context:
            context_parts.append(article_context)
        
        # 4. Clause/Point context
        if clause:
            context_parts.append(clause)
        if point:
            context_parts.append(f"Điểm {point}")
        
        # 5. Content (nội dung chính)
        # Đảm bảo content luôn có trong embedding text
        if content:
            context_parts.append(content)
        
        # Join với dấu ". " để tạo thành câu văn tự nhiên
        # Format này giúp embedding model hiểu được mối quan hệ giữa các phần
        enriched_text = ". ".join(context_parts)
        
        return enriched_text
    
    def create_chunk_json(
        self,
        chunk_id: str,
        text_for_embedding: str,
        original_text: str,
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Tạo JSON chunk theo schema đề xuất"""
        return {
            "id": chunk_id,
            "text_for_embedding": text_for_embedding,
            "metadata": metadata,
            "original_text": original_text
        }
    
    def chunk_document(
        self,
        text: str,
        filename: str = "",
        max_article_length: int = 2000,
        max_clause_length: int = 1000
    ) -> List[Dict[str, Any]]:
        """
        Chunk document theo cấu trúc logic
        
        Args:
            text: Full text của văn bản
            filename: Tên file
            max_article_length: Nếu điều dài hơn này, sẽ chunk theo khoản
            max_clause_length: Nếu khoản dài hơn này, sẽ chunk theo điểm
        
        Returns:
            List of chunk JSON objects
        """
        from .parser import LegalDocumentParser
        
        parser = LegalDocumentParser()
        doc_info = self.extract_doc_info(text, filename)
        
        # FIX 1: Lấy Source ID từ filename hoặc doc_info để làm ID chuẩn
        source_id = doc_info.get("source_id") or filename.split('.')[0]
        
        # Extract year for ID
        year_match = re.search(r'(\d{4})', text[:500])
        year = year_match.group(1) if year_match else "0000"
        
        chunks = []
        
        # CRITICAL FIX: Global chunk counter để đảm bảo unique ID cho mọi chunks
        # Ngay cả khi có nhiều chunks cho cùng một Điều (không split), mỗi chunk vẫn có ID unique
        global_chunk_counter = 0
        
        # Split by chapters first
        chapters = parser.split_by_chapters(text)
        
        # If no chapters found, treat whole text as one chapter
        if not chapters:
            chapters = [{"chapter": "", "content": text}]
        
        for chapter_data in chapters:
            chapter = chapter_data.get("chapter", "")
            chapter_content = chapter_data.get("content", "")
            
            # Split by articles
            articles = parser.split_by_articles(chapter_content, chapter)
            
            # If no articles found, treat whole chapter as one article
            if not articles:
                articles = [{
                    "article": "Điều 1",
                    "article_title": "",
                    "content": chapter_content,
                    "chapter": chapter
                }]
            
            for article_data in articles:
                article = article_data.get("article", "")
                article_title = article_data.get("article_title", "")
                article_content = article_data.get("content", "")
                article_chapter = article_data.get("chapter", "")
                
                # Check if article is too long
                should_split_clause = len(article_content) > max_article_length
                
                if should_split_clause:
                    # Split by clauses
                    clauses = parser.split_by_clauses(article_content, article, article_title)
                    
                    # CRITICAL FIX: Đếm số chunks để đảm bảo unique ID
                    clause_index = 0
                    for clause_data in clauses:
                        original_clause = clause_data.get("clause")
                        clause_content = clause_data.get("content", "")
                        
                        # Nếu clause=None (preamble), dùng index để tạo unique ID
                        # Đảm bảo mỗi chunk có clause unique trong ID
                        if original_clause is None:
                            clause_for_id = f"K{clause_index}"  # Temporary clause name for ID
                        else:
                            clause_for_id = original_clause
                        
                        # Giữ original_clause cho metadata, nhưng dùng clause_for_id cho ID
                        clause = original_clause  # For metadata
                        clause_index += 1
                        
                        # FIX 4: Check if clause is too long, split by points
                        should_split_point = len(clause_content) > max_clause_length
                        
                        if should_split_point:
                            # Split by points
                            points = parser.split_by_points(clause_content, article, article_title, clause or "")
                            
                            # FIX 3: Tìm đoạn dẫn nhập (intro) của Khoản để nhúng vào các điểm con
                            clause_intro = ""
                            point_index = 0
                            for p in points:
                                if p.get("point") is None:  # Đây là chunk dẫn nhập
                                    clause_intro = p.get("content", "").strip()
                                    break
                            
                            for point_data in points:
                                # CRITICAL FIX: Nếu point=None (preamble), dùng index để tạo unique ID
                                original_point = point_data.get("point")
                                if original_point is None:
                                    # Tạo temporary point name cho ID
                                    point_for_id = f"p{point_index}"
                                else:
                                    point_for_id = original_point
                                point_index += 1
                                point = point_data.get("point")
                                point_content = point_data.get("content", "")
                                
                                # FIX 3: Khi enrich text cho điểm a, b, c... hãy nối thêm clause_intro vào trước
                                # để chunk có nghĩa: "Doanh nghiệp có quyền: Tự do kinh doanh..."
                                final_content = point_content
                                if point and clause_intro and len(clause_intro) < 200:
                                    final_content = f"{clause_intro}\n{point_content}"
                                
                                # CRITICAL FIX: Dùng global counter để đảm bảo unique ID
                                global_chunk_counter += 1
                                # Dùng global counter để tạo ID unique
                                final_clause_for_id = f"K{global_chunk_counter}"
                                
                                chunk_id = self.create_chunk_id(
                                    doc_info["doc_type"],
                                    doc_info["doc_name"],
                                    year,
                                    article,
                                    final_clause_for_id,
                                    source_id=source_id,
                                    point=point_for_id  # Dùng point_for_id thay vì point
                                )
                                
                                # Enrich text for embedding với final_content đã ghép intro
                                text_for_embedding = self.enrich_text_for_embedding(
                                    doc_info["doc_name"],
                                    doc_info["doc_type"],
                                    article_chapter,
                                    article,
                                    article_title,
                                    final_content,
                                    clause,
                                    point
                                )
                                
                                # Create metadata
                                metadata = {
                                    **doc_info,
                                    "chapter": article_chapter,
                                    "article": article,
                                    "article_title": article_title,
                                    "clause": clause if clause else "",
                                    "point": point if point else "",
                                    "keywords": self._extract_keywords(final_content)  # Use final_content for keywords
                                }
                                
                                # Create chunk - use final_content for original_text if it was modified
                                original_text = final_content if (point and clause_intro) else point_content
                                
                                chunk = self.create_chunk_json(
                                    chunk_id,
                                    text_for_embedding,
                                    original_text,
                                    metadata
                                )
                                
                                chunks.append(chunk)
                        else:
                            # Clause is short enough, use as single chunk
                            # CRITICAL FIX: Dùng global counter để đảm bảo unique ID
                            global_chunk_counter += 1
                            # Dùng global counter để tạo ID unique
                            final_clause_for_id = f"K{global_chunk_counter}"
                            
                            chunk_id = self.create_chunk_id(
                                doc_info["doc_type"],
                                doc_info["doc_name"],
                                year,
                                article,
                                final_clause_for_id,
                                source_id=source_id
                            )
                            
                            # Enrich text for embedding
                            text_for_embedding = self.enrich_text_for_embedding(
                                doc_info["doc_name"],
                                doc_info["doc_type"],
                                article_chapter,
                                article,
                                article_title,
                                clause_content,
                                clause
                            )
                            
                            # Create metadata
                            metadata = {
                                **doc_info,
                                "chapter": article_chapter,
                                "article": article,
                                "article_title": article_title,
                                "clause": clause if clause else "",
                                "point": "",
                                "keywords": self._extract_keywords(clause_content)
                            }
                            
                            # Create chunk
                            chunk = self.create_chunk_json(
                                chunk_id,
                                text_for_embedding,
                                clause_content,
                                metadata
                            )
                            
                            chunks.append(chunk)
                else:
                    # Article is short enough, use as single chunk
                    # CRITICAL FIX: Dùng global counter để đảm bảo unique ID
                    # Nếu một Điều có nhiều chunks (có thể do logic khác), mỗi chunk vẫn có ID unique
                    global_chunk_counter += 1
                    final_clause_for_id = f"K{global_chunk_counter}"
                    chunk_id = self.create_chunk_id(
                        doc_info["doc_type"],
                        doc_info["doc_name"],
                        year,
                        article,
                        final_clause_for_id,
                        source_id=source_id
                    )
                    
                    text_for_embedding = self.enrich_text_for_embedding(
                        doc_info["doc_name"],
                        doc_info["doc_type"],
                        article_chapter,
                        article,
                        article_title,
                        article_content,
                        None
                    )
                    
                    metadata = {
                        **doc_info,
                        "chapter": article_chapter,
                        "article": article,
                        "article_title": article_title,
                        "clause": "",
                        "point": "",
                        "keywords": self._extract_keywords(article_content)
                    }
                    
                    chunk = self.create_chunk_json(
                        chunk_id,
                        text_for_embedding,
                        article_content,
                        metadata
                    )
                    
                    chunks.append(chunk)
        
        return chunks
    
    def _extract_keywords(self, text: str, max_keywords: int = 5) -> List[str]:
        """Extract keywords từ text (simple version)"""
        # Remove common words
        stopwords = {
            "của", "và", "hoặc", "là", "được", "cho", "với", "theo", "tại",
            "về", "trong", "này", "đó", "các", "một", "như", "để", "có"
        }
        
        # Extract words (Vietnamese)
        words = re.findall(r'\b\w+\b', text.lower())
        words = [w for w in words if len(w) > 3 and w not in stopwords]
        
        # Count frequency
        from collections import Counter
        word_freq = Counter(words)
        
        # Return top keywords
        return [word for word, _ in word_freq.most_common(max_keywords)]

