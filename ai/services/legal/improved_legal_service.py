"""
Legal Assistant Service - IMPROVED VERSION
Combines RAG (consult_legal_documents) and Tax Calculator
WITH: Hallucination Prevention + Response Caching + Better Error Handling
"""
import logging
import re
import hashlib
from typing import Dict, Any, Optional
from functools import lru_cache
from services.legal.vector_service import LegalVectorService
from services.legal.tax_calculator import TaxCalculator
from shared.llm_client import LLMClientFactory
from prompts import LEGAL_CONSULTANT_RAG_PROMPT

logger = logging.getLogger(__name__)


class ImprovedLegalAssistant:
    """
    IMPROVED Legal Assistant Service - Main interface for legal consultation
    
    NEW FEATURES:
    - ✅ Hallucination Prevention (strict data-only mode)
    - ✅ Response Caching (LRU cache for frequent queries)
    - ✅ Better Error Handling
    - ✅ Query sanitization
    """
    
    # Class-level cache for responses
    _response_cache: Dict[str, str] = {}
    _cache_hits = 0
    _cache_misses = 0
    
    def __init__(self):
        """Initialize Legal Assistant with required services"""
        try:
            self.vector_service = LegalVectorService()
            self.tax_calculator = TaxCalculator()
            self.llm_client = LLMClientFactory.create_client()
            logger.info("✅ Improved Legal Assistant initialized successfully")
        except Exception as e:
            logger.error(f"❌ Error initializing Legal Assistant: {e}", exc_info=True)
            raise
    
    def _get_query_hash(self, query: str) -> str:
        """Generate hash for query caching"""
        normalized_query = query.lower().strip()
        return hashlib.md5(normalized_query.encode()).hexdigest()
    
    def _sanitize_query(self, query: str) -> str:
        """Sanitize user query to prevent prompt injection"""
        # Remove potentially dangerous patterns
        dangerous_patterns = [
            "ignore previous",
            "ignore all",
            "new instructions",
            "system:",
            "assistant:",
            "you are now",
            "forget everything",
        ]
        
        query_lower = query.lower()
        for pattern in dangerous_patterns:
            if pattern in query_lower:
                logger.warning(f"⚠️  Potential prompt injection detected: {query[:100]}")
                # Remove the pattern
                query = query.replace(pattern, "")
        
        # Limit length
        max_length = 500
        if len(query) > max_length:
            query = query[:max_length]
            logger.warning(f"Query truncated to {max_length} chars")
        
        return query.strip()
    
    async def process_query(self, query: str, region: int = 1, use_cache: bool = True) -> str:
        """
        Process a legal/tax query and return appropriate response
        
        NEW: Added caching and query sanitization
        
        Args:
            query: User query in Vietnamese
            region: Region code (1-4) for minimum wage calculation
            use_cache: Whether to use cached responses (default: True)
        
        Returns:
            Response string with answer or calculation result
        """
        try:
            # Sanitize query
            query = self._sanitize_query(query)
            
            if not query:
                return "Xin lỗi, câu hỏi không hợp lệ. Vui lòng thử lại."
            
            # Check cache first
            if use_cache:
                query_hash = self._get_query_hash(query)
                if query_hash in self._response_cache:
                    self._cache_hits += 1
                    logger.info(f"✅ Cache HIT for query: {query[:50]}... (hits: {self._cache_hits}, misses: {self._cache_misses})")
                    return self._response_cache[query_hash]
                else:
                    self._cache_misses += 1
            
            # Step 1: Use LLM Router to classify intent
            intent = await self._classify_intent(query)
            
            # Step 2: Route to appropriate handler
            if intent == "CALCULATION":
                response = await self._handle_tax_query(query, region)
            else:
                response = await self._handle_legal_query(query)
            
            # Cache the response
            if use_cache:
                query_hash = self._get_query_hash(query)
                self._response_cache[query_hash] = response
                
                # Limit cache size
                if len(self._response_cache) > 100:
                    # Remove oldest entry (simple FIFO)
                    oldest_key = next(iter(self._response_cache))
                    del self._response_cache[oldest_key]
            
            return response
        
        except Exception as e:
            logger.error(f"Error processing query: {e}", exc_info=True)
            # Fallback to keyword-based classification if LLM fails
            try:
                query_lower = query.lower()
                tax_keywords = [
                    "tính thuế", "đóng thuế", "thuế tncn", "thuế thu nhập",
                    "lương gross", "lương net", "lương bao nhiêu",
                    "đóng bảo hiểm", "bhxh", "bảo hiểm", "thu nhập"
                ]
                is_tax_query = any(keyword in query_lower for keyword in tax_keywords)
                has_numbers = bool(re.search(r'\d+', query))
                
                if is_tax_query or (has_numbers and any(word in query_lower for word in ["triệu", "tr", "nghìn", "k", "triệu đồng"])):
                    return await self._handle_tax_query(query, region)
                else:
                    return await self._handle_legal_query(query)
            except Exception as fallback_error:
                logger.error(f"Fallback classification also failed: {fallback_error}")
                return f"Xin lỗi, đã xảy ra lỗi khi xử lý câu hỏi: {str(e)}"
    
    async def _classify_intent(self, query: str) -> str:
        """
        Use LLM to classify query intent (CALCULATION vs LEGAL_SEARCH)
        
        Args:
            query: User query
        
        Returns:
            "CALCULATION" or "LEGAL_SEARCH"
        """
        if not self.llm_client:
            # Fallback to keyword-based if LLM not available
            query_lower = query.lower()
            tax_keywords = ["tính thuế", "đóng thuế", "thuế", "lương", "bảo hiểm", "thu nhập"]
            has_numbers = bool(re.search(r'\d+', query))
            
            if any(keyword in query_lower for keyword in tax_keywords) and has_numbers:
                return "CALCULATION"
            return "LEGAL_SEARCH"
        
        router_prompt = f"""
Phân loại câu hỏi sau vào 1 trong 2 nhóm:

1. "CALCULATION": Nếu câu hỏi yêu cầu tính toán con số cụ thể (thuế, lương, bảo hiểm, số tiền phải đóng).
   Ví dụ: "Lương 50 triệu đóng thuế bao nhiêu?", "Thu nhập 30 triệu thì đóng bao nhiêu tiền cho nhà nước?", 
   "Tính thuế cho lương 20 triệu", "50 triệu đóng bảo hiểm bao nhiêu"

2. "LEGAL_SEARCH": Các câu hỏi về quy định, luật lệ, thủ tục, điều kiện, hoặc lý thuyết pháp luật.
   Ví dụ: "Điều kiện thành lập công ty là gì?", "Quy định về thuế GTGT", "Thủ tục đăng ký doanh nghiệp"

Câu hỏi: "{query}"

Chỉ trả về đúng 1 từ: CALCULATION hoặc LEGAL_SEARCH
"""
        
        try:
            result = await self.llm_client.generate_simple(
                prompt=router_prompt,
                temperature=0.1,  # Low temperature for consistent classification
                max_tokens=50
            )
            
            if result.get("success") and result.get("content"):
                intent = result["content"].strip().upper()
                if "CALCULATION" in intent:
                    return "CALCULATION"
                else:
                    return "LEGAL_SEARCH"
            else:
                # Fallback
                return "LEGAL_SEARCH"
        except Exception as e:
            logger.warning(f"LLM intent classification failed: {e}, using fallback")
            # Fallback to keyword-based
            query_lower = query.lower()
            tax_keywords = ["tính thuế", "đóng thuế", "thuế", "lương", "bảo hiểm", "thu nhập", "tiền"]
            has_numbers = bool(re.search(r'\d+', query))
            
            if any(keyword in query_lower for keyword in tax_keywords) and has_numbers:
                return "CALCULATION"
            return "LEGAL_SEARCH"
    
    async def _handle_tax_query(self, query: str, region: int = 1) -> str:
        """
        Handle tax calculation queries
        
        Args:
            query: User query about tax calculation
            region: Region code for minimum wage
        
        Returns:
            Tax calculation result
        """
        try:
            # Extract salary and dependents from query using regex
            salary_match = re.search(r'(\d+)\s*(?:triệu|tr|million|m)', query, re.IGNORECASE)
            dependents_match = re.search(r'(\d+)\s*(?:con|người phụ thuộc|dependents)', query, re.IGNORECASE)
            
            if salary_match:
                salary_str = salary_match.group(1)
                gross_salary = float(salary_str) * 1_000_000  # Convert to VND
            else:
                # Try to find any number that might be salary
                numbers = re.findall(r'\d+', query)
                if numbers:
                    # Assume the largest number is the salary
                    largest_number = max([int(n) for n in numbers])
                    if largest_number > 10:  # Likely in millions
                        gross_salary = float(largest_number) * 1_000_000
                    else:
                        gross_salary = float(largest_number) * 1_000_000
                else:
                    return "Xin lỗi, tôi không thể xác định được mức lương từ câu hỏi của bạn. Vui lòng cung cấp rõ ràng, ví dụ: 'Lương 50 triệu đóng thuế bao nhiêu?'"
            
            dependents = int(dependents_match.group(1)) if dependents_match else 0
            
            # Calculate tax
            result = self.tax_calculator.calculate_pit(
                gross_salary=gross_salary,
                dependents=dependents,
                region=region
            )
            
            # Format result
            from services.legal.tax_calculator import format_tax_result
            formatted_result = format_tax_result(result, result_type="personal_income")
            
            return formatted_result
        
        except Exception as e:
            logger.error(f"Error handling tax query: {e}", exc_info=True)
            return f"Xin lỗi, đã xảy ra lỗi khi tính thuế: {str(e)}"
    
    async def _handle_legal_query(self, query: str, top_k: int = 20) -> str:
        """
        Handle legal document queries using RAG
        
        WITH HALLUCINATION PREVENTION:
        - Only use information from legal documents
        - Always cite sources
        - Don't fabricate laws
        
        Args:
            query: User query about legal regulations
            top_k: Number of documents to retrieve
        
        Returns:
            Legal consultation answer
        """
        try:
            # Step 1: Search legal documents
            search_results = self.vector_service.search(
                query=query,
                top_k=top_k,
                doc_type=None,
                status="active"
            )
            
            if not search_results:
                return "Xin lỗi, tôi không tìm thấy văn bản pháp luật nào liên quan đến câu hỏi của bạn. Vui lòng thử lại với từ khóa khác hoặc mô tả chi tiết hơn."
            
            # Step 2: Construct context from search results
            context_parts = []
            
            for i, result in enumerate(search_results, 1):
                metadata = result.get("metadata", {})
                doc_name = metadata.get("doc_name", "Văn bản không rõ")
                doc_type = metadata.get("doc_type", "")
                article = metadata.get("article", "")
                article_title = metadata.get("article_title", "")
                chapter = metadata.get("chapter", "")
                clause = metadata.get("clause", "")
                point = metadata.get("point", "")
                text = result.get("text", "").strip()
                
                # Build source citation
                source_parts = []
                if doc_type:
                    source_parts.append(doc_type)
                source_parts.append(doc_name)
                
                # Build hierarchical reference
                ref_parts = []
                if chapter:
                    ref_parts.append(f"Chương {chapter}")
                if article:
                    ref_parts.append(f"Điều {article}")
                if article_title:
                    ref_parts.append(f'"{article_title}"')
                if clause:
                    ref_parts.append(f"Khoản {clause}")
                if point:
                    ref_parts.append(f"Điểm {point}")
                
                source = " - ".join(source_parts)
                reference = ", ".join(ref_parts) if ref_parts else ""
                
                # Format context entry
                context_entry = f"---\n[Văn bản {i}] {source}"
                if reference:
                    context_entry += f"\nTham chiếu: {reference}"
                context_entry += f"\nNội dung đầy đủ:\n{text}\n"
                
                context_parts.append(context_entry)
            
            # Join all context parts
            context = "\n".join(context_parts)
            
            # Step 3: LLM Generation with HALLUCINATION PREVENTION
            if not self.llm_client:
                logger.warning("LLM client not available, returning formatted context")
                return f"Dựa vào các văn bản pháp luật sau đây:\n\n{context}\n\nTrả lời: {query}"
            
            # Use improved prompt with hallucination prevention
            prompt = LEGAL_CONSULTANT_RAG_PROMPT.format(
                context=context,
                user_query=query
            )
            
            # Generate answer using LLM
            result = await self.llm_client.generate_simple(
                prompt=prompt,
                temperature=0.3,  # Lower temperature for more factual responses
                max_tokens=5000
            )
            
            if result.get("success") and result.get("content"):
                if result.get("truncated", False):
                    logger.info("Legal response was truncated but still usable")
                return result["content"]
            else:
                error_msg = result.get("error", "Unknown error")
                logger.warning(f"LLM generation failed: {error_msg}, returning formatted context")
                return f"Dựa vào các văn bản pháp luật sau đây:\n\n{context}\n\nTrả lời: {query}"
        
        except Exception as e:
            logger.error(f"Error handling legal query: {e}", exc_info=True)
            return f"Xin lỗi, đã xảy ra lỗi khi tư vấn pháp luật: {str(e)}"
    
    async def consult_legal_documents(
        self,
        query: str,
        top_k: int = 20,
        doc_type: Optional[str] = None,
        status: str = "active"
    ) -> str:
        """
        Direct method to consult legal documents (RAG pipeline)
        
        Args:
            query: Legal question
            top_k: Number of documents to retrieve
            doc_type: Filter by document type
            status: Filter by status
        
        Returns:
            Legal consultation answer
        """
        return await self._handle_legal_query(query, top_k)
    
    def calculate_tax(
        self,
        gross_salary: float,
        dependents: int = 0,
        region: int = 1
    ) -> Dict[str, Any]:
        """
        Direct method to calculate personal income tax
        
        Args:
            gross_salary: Gross salary in VND per month
            dependents: Number of dependents
            region: Region code (1-4)
        
        Returns:
            Tax calculation result dictionary
        """
        return self.tax_calculator.calculate_pit(
            gross_salary=gross_salary,
            dependents=dependents,
            region=region
        )
    
    def get_cache_stats(self) -> Dict[str, int]:
        """Get cache statistics"""
        return {
            "cache_size": len(self._response_cache),
            "cache_hits": self._cache_hits,
            "cache_misses": self._cache_misses,
            "hit_rate": self._cache_hits / (self._cache_hits + self._cache_misses) if (self._cache_hits + self._cache_misses) > 0 else 0
        }
    
    def clear_cache(self):
        """Clear response cache"""
        self._response_cache.clear()
        logger.info("✅ Response cache cleared")
