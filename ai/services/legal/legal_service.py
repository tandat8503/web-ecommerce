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
            self.llm_client = LLMClientFactory.get_client()
            logger.info("✅ Legal Assistant initialized successfully")
        except Exception as e:
            logger.error(f"❌ Error initializing Legal Assistant: {e}", exc_info=True)
            raise
    
    async def process_query(self, query: str, region: int = 1) -> str:
        """
        Process a legal/tax query and return appropriate response
        
        This method intelligently determines if the query is:
        1. A tax calculation request (e.g., "Lương 50 triệu đóng thuế bao nhiêu?")
        2. A legal document query (e.g., "Điều kiện thành lập công ty là gì?")
        
        Args:
            query: User query in Vietnamese
            region: Region code (1-4) for minimum wage calculation
        
        Returns:
            Response string with answer or calculation result
        """
        try:
            query_lower = query.lower()
            
            # Check if query is about tax calculation
            tax_keywords = [
                "tính thuế", "đóng thuế", "thuế tncn", "thuế thu nhập",
                "lương gross", "lương net", "lương bao nhiêu",
                "đóng bảo hiểm", "bhxh", "bảo hiểm"
            ]
            
            is_tax_query = any(keyword in query_lower for keyword in tax_keywords)
            
            # Check if query contains numbers (likely a calculation)
            has_numbers = bool(re.search(r'\d+', query))
            
            if is_tax_query or (has_numbers and any(word in query_lower for word in ["triệu", "tr", "nghìn", "k"])):
                # This is likely a tax calculation query
                return await self._handle_tax_query(query, region)
            else:
                # This is a legal document query
                return await self._handle_legal_query(query)
        
        except Exception as e:
            logger.error(f"Error processing query: {e}", exc_info=True)
            return f"Xin lỗi, đã xảy ra lỗi khi xử lý câu hỏi: {str(e)}"
    
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
    
    async def _handle_legal_query(self, query: str, top_k: int = 5) -> str:
        """
        Handle legal document queries using RAG
        
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
                text = result.get("text", "")
                
                # Build source citation
                source_parts = []
                if doc_type:
                    source_parts.append(doc_type)
                source_parts.append(doc_name)
                if chapter:
                    source_parts.append(chapter)
                if article:
                    source_parts.append(article)
                if article_title:
                    source_parts.append(f'"{article_title}"')
                if clause:
                    source_parts.append(clause)
                if point:
                    source_parts.append(f"Điểm {point}")
                
                source = " - ".join(source_parts)
                
                context_parts.append(f"""
Nguồn {i}: {source}
Nội dung: {text}
""")
            
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
            
            # Generate answer using LLM
            result = await self.llm_client.generate_simple(
                prompt=prompt,
                temperature=0.3,  # Lower temperature for more factual responses
                max_tokens=1500
            )
            
            if result.get("success") and result.get("content"):
                return result["content"]
            else:
                # Fallback: return formatted context
                logger.warning("LLM generation failed, returning formatted context")
                return f"Dựa vào các văn bản pháp luật sau đây:\n\n{context}\n\nTrả lời: {query}"
        
        except Exception as e:
            logger.error(f"Error handling legal query: {e}", exc_info=True)
            return f"Xin lỗi, đã xảy ra lỗi khi tư vấn pháp luật: {str(e)}"
    
    async def consult_legal_documents(
        self,
        query: str,
        top_k: int = 5,
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

