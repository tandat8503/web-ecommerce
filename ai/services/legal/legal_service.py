"""
Legal Assistant Service - High-level service for legal consultation
Combines RAG (consult_legal_documents) and Tax Calculator
"""
import logging
import re
from typing import Dict, Any, Optional
from services.legal.vector_service import LegalVectorService
from services.legal.tax_calculator import TaxCalculator
from shared.llm_client import LLMClientFactory
from prompts import LEGAL_CONSULTANT_RAG_PROMPT

logger = logging.getLogger(__name__)


class LegalAssistant:
    """
    Legal Assistant Service - Main interface for legal consultation
    Handles both legal document queries and tax calculations
    """
    
    def __init__(self):
        """Initialize Legal Assistant with required services"""
        try:
            self.vector_service = LegalVectorService()
            self.tax_calculator = TaxCalculator()
            self.llm_client = LLMClientFactory.create_client()
            logger.info("✅ Legal Assistant initialized successfully")
        except Exception as e:
            logger.error(f"❌ Error initializing Legal Assistant: {e}", exc_info=True)
            raise
    
    async def process_query(self, query: str, region: int = 1) -> str:
        """
        Process a legal/tax query and return appropriate response
        
        This method uses LLM Router to intelligently determine if the query is:
        1. A tax calculation request (e.g., "Lương 50 triệu đóng thuế bao nhiêu?")
        2. A legal document query (e.g., "Điều kiện thành lập công ty là gì?")
        3. Needs more info (asking about tax but no numbers)
        
        Args:
            query: User query in Vietnamese
            region: Region code (1-4) for minimum wage calculation
        
        Returns:
            Response string with answer or calculation result
        """
        try:
            # Step 1: Use LLM Router to classify intent
            intent = await self._classify_intent(query)
            
            # Step 2: Route to appropriate handler
            if intent == "NEED_MORE_INFO":
                return "Dạ để tính thuế cho anh/chị, em cần biết **mức doanh thu/thu nhập cụ thể** (ví dụ: 50 triệu/tháng). Anh/chị vui lòng cung cấp số tiền để em tính chính xác nhé! 📊"
            elif intent == "CALCULATION":
                return await self._handle_tax_query(query, region)
            else:
                return await self._handle_legal_query(query)
        
        except Exception as e:
            logger.error(f"Error processing query: {e}", exc_info=True)
            # Fallback to keyword-based classification if LLM fails
            try:
                query_lower = query.lower()
                tax_keywords = [
                    "tính thuế", "đóng thuế", "thuế tncn", "thuế thu nhập",
                    "lương gross", "lương net", "lương bao nhiêu", "doanh thu",
                    "đóng bảo hiểm", "bhxh", "bảo hiểm", "thu nhập"
                ]
                is_tax_query = any(keyword in query_lower for keyword in tax_keywords)
                has_numbers = bool(re.search(r'\d+', query))
                
                # If tax query but no numbers, ask for more info
                if is_tax_query and not has_numbers:
                    return "Dạ để tính thuế cho anh/chị, em cần biết **mức doanh thu/thu nhập cụ thể** (ví dụ: 50 triệu/tháng). Anh/chị vui lòng cung cấp số tiền để em tính chính xác nhé! 📊"
                elif is_tax_query or (has_numbers and any(word in query_lower for word in ["triệu", "tr", "nghìn", "k", "triệu đồng"])):
                    return await self._handle_tax_query(query, region)
                else:
                    return await self._handle_legal_query(query)
            except Exception as fallback_error:
                logger.error(f"Fallback classification also failed: {fallback_error}")
                return f"Xin lỗi, đã xảy ra lỗi khi xử lý câu hỏi: {str(e)}"
    
    async def _classify_intent(self, query: str) -> str:
        """
        Use LLM to classify query intent (CALCULATION vs LEGAL_SEARCH vs NEED_MORE_INFO)
        
        Args:
            query: User query
        
        Returns:
            "CALCULATION", "LEGAL_SEARCH", or "NEED_MORE_INFO"
        """
        query_lower = query.lower()
        
        # Tax-related keywords
        tax_keywords = [
            "tính thuế", "đóng thuế", "thuế tncn", "thuế thu nhập",
            "lương gross", "lương net", "doanh thu", "thu nhập",
            "đóng bảo hiểm", "bhxh", "bảo hiểm", "tiền thuế"
        ]
        
        has_numbers = bool(re.search(r'\d+', query))
        has_tax_keyword = any(keyword in query_lower for keyword in tax_keywords)
        
        # Check if asking about tax but no numbers provided
        if has_tax_keyword and not has_numbers:
            return "NEED_MORE_INFO"
        
        if not self.llm_client:
            # Fallback to keyword-based if LLM not available
            if has_tax_keyword and has_numbers:
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
            if has_tax_keyword and has_numbers:
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
            # Pattern: "lương 50 triệu", "50tr", "50 triệu", "2 con"
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
    
    async def _handle_legal_query(self, query: str, top_k: int = 30) -> str:
        """
        Handle legal document queries using RAG
        
        Args:
            query: User query about legal regulations
            top_k: Number of documents to retrieve (increased to 30 for better accuracy)
        
        Returns:
            Legal consultation answer
        """
        try:
            # Step 1: Search legal documents (increased top_k for more comprehensive results)
            search_results = self.vector_service.search(
                query=query,
                top_k=top_k,
                doc_type=None,
                status="active"
            )
            
            if not search_results:
                return "Xin lỗi, tôi không tìm thấy văn bản pháp luật nào liên quan đến câu hỏi của bạn. Vui lòng thử lại với từ khóa khác hoặc mô tả chi tiết hơn."
            
            # Step 2: Construct context from search results (formatted for better LLM understanding)
            # Group results by document to avoid semantic fragmentation
            context_parts = []
            seen_docs = {}  # Track documents to group related chunks
            
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
                
                # Build source citation in a cleaner format
                source_parts = []
                if doc_type:
                    source_parts.append(doc_type)
                source_parts.append(doc_name)
                
                # Build hierarchical reference (complete path for better context)
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
                
                # Create a document key for grouping
                doc_key = f"{doc_name}_{article}_{clause}"
                
                # Format context entry with complete information (no truncation)
                context_entry = f"---\n[Văn bản {i}] {source}"
                if reference:
                    context_entry += f"\nTham chiếu: {reference}"
                # Include full text without truncation to preserve semantic meaning
                context_entry += f"\nNội dung đầy đủ:\n{text}\n"
                
                context_parts.append(context_entry)
            
            # Join all context parts with clear separators
            context = "\n".join(context_parts)
            
            # Step 3: LLM Generation
            if not self.llm_client:
                # Fallback: return formatted context
                logger.warning("LLM client not available, returning formatted context")
                return f"Dựa vào các văn bản pháp luật sau đây:\n\n{context}\n\nTrả lời: {query}"
            
            prompt = LEGAL_CONSULTANT_RAG_PROMPT.format(
                context=context,
                user_query=query
            )
            
            # Generate answer using LLM (increased max_tokens for comprehensive responses)
            result = await self.llm_client.generate_simple(
                prompt=prompt,
                temperature=0.3,  # Lower temperature for more factual responses
                max_tokens=5000  # Increased from 1500 to 5000 for comprehensive legal answers
            )
            
            if result.get("success") and result.get("content"):
                # Even if truncated (finish_reason=2), return the content
                if result.get("truncated", False):
                    logger.info("Legal response was truncated but still usable")
                return result["content"]
            else:
                # Fallback: return formatted context
                error_msg = result.get("error", "Unknown error")
                logger.warning(f"LLM generation failed: {error_msg}, returning formatted context")
                return f"Dựa vào các văn bản pháp luật sau đây:\n\n{context}\n\nTrả lời: {query}"
        
        except Exception as e:
            logger.error(f"Error handling legal query: {e}", exc_info=True)
            return f"Xin lỗi, đã xảy ra lỗi khi tư vấn pháp luật: {str(e)}"
    
    async def consult_legal_documents(
        self,
        query: str,
        top_k: int = 30,
        doc_type: Optional[str] = None,
        status: str = "active"
    ) -> str:
        """
        Direct method to consult legal documents (RAG pipeline)
        
        Args:
            query: Legal question
            top_k: Number of documents to retrieve (default: 30 for better accuracy)
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

