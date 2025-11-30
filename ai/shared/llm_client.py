#!/usr/bin/env python3
"""
Shared Gemini Pro Client for web-ecommerce AI system
Provides advanced Gemini Pro integration with function calling and grounding
"""

import json
import logging
from typing import Any, Dict, List, Optional, Annotated, Literal, Union
from datetime import datetime
import httpx
import google.generativeai as genai
from pydantic import BaseModel, Field

# Import config - handle both relative and absolute imports
try:
    from core.config import get_llm_config
except ImportError:
    from ..core.config import get_llm_config

logger = logging.getLogger(__name__)


class GeminiProClient:
    """Advanced Gemini Pro client with function calling and grounding support"""
    
    def __init__(self, api_key: str, model_name: str = None):
        genai.configure(api_key=api_key)
        self.api_key = api_key
        # Get model from config or use default
        try:
            from core.config import get_llm_config
        except ImportError:
            from ..core.config import get_llm_config
        config = get_llm_config()
        self.model_name = model_name or config.gemini_model or "gemini-2.5-flash"
        
    async def generate_with_tools(
        self,
        prompt: str,
        tools: List[Any],
        system_instruction: Optional[str] = None,
        temperature: float = 0.6,
        max_tokens: int = 800,
        model: str = None
    ) -> Dict[str, Any]:
        """Generate content with function calling tools"""
        try:
            model_name = model or self.model_name
            genai_model = genai.GenerativeModel(
                model_name=model_name,
                system_instruction=system_instruction
            )
            
            # Configure generation config
            generation_config = genai.types.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            )
            
            # Build prompt with system instruction if provided
            full_prompt = prompt
            if system_instruction:
                full_prompt = f"{system_instruction}\n\n{prompt}"
            
            response = genai_model.generate_content(
                full_prompt,
                generation_config=generation_config
            )
            
            # Check for blocked or invalid responses
            if not response.candidates or len(response.candidates) == 0:
                logger.warning("Gemini response has no candidates")
                return {
                    "success": False,
                    "error": "Response blocked or empty",
                    "content": "Xin lỗi, tôi không thể tạo phản hồi cho yêu cầu này. Vui lòng thử lại với câu hỏi khác."
                }
            
            # Check finish_reason
            candidate = response.candidates[0]
            finish_reason = candidate.finish_reason if hasattr(candidate, 'finish_reason') else None
            
            # finish_reason values: 1=STOP, 2=MAX_TOKENS, 3=SAFETY, 4=RECITATION, 5=OTHER
            if finish_reason == 3:  # SAFETY - content blocked
                logger.warning(f"Gemini response blocked by safety filters (finish_reason={finish_reason})")
                return {
                    "success": False,
                    "error": "Response blocked by safety filters",
                    "content": "Xin lỗi, tôi không thể tạo phản hồi cho yêu cầu này do bị chặn bởi bộ lọc an toàn."
                }
            
            # Try to get text content first (even if finish_reason=2, we may still have partial content)
            content_text = None
            try:
                # Try direct text access first
                if hasattr(response, 'text') and response.text:
                    content_text = response.text
            except Exception:
                pass
            
            # If direct text access failed, try extracting from parts
            if not content_text:
                try:
                    if candidate.content and candidate.content.parts:
                        parts_text = []
                        for part in candidate.content.parts:
                            if hasattr(part, 'text') and part.text:
                                parts_text.append(part.text)
                        content_text = " ".join(parts_text) if parts_text else None
                except Exception as parts_error:
                    logger.warning(f"Failed to extract from parts: {parts_error}")
            
            # If finish_reason=2 (MAX_TOKENS), we still return content if available, but with warning
            if finish_reason == 2:  # MAX_TOKENS - response was truncated
                if content_text:
                    logger.warning(f"Gemini response truncated due to max_tokens limit (finish_reason={finish_reason}). Content may be incomplete.")
                    # Return the partial content - it's still useful
                    return {
                        "success": True,
                        "content": content_text + "\n\n*Lưu ý: Phản hồi có thể bị cắt do giới hạn độ dài. Vui lòng hỏi cụ thể hơn nếu cần thông tin đầy đủ.*",
                        "candidates": response.candidates if hasattr(response, 'candidates') else [],
                        "usage_metadata": response.usage_metadata if hasattr(response, 'usage_metadata') else {},
                        "model": model_name,
                        "finish_reason": finish_reason,
                        "truncated": True
                    }
                else:
                    # No content at all - this is an error
                    logger.warning(f"Gemini response has no content despite finish_reason=2 (MAX_TOKENS)")
                    return {
                        "success": False,
                        "error": f"Response truncated but no content available (finish_reason={finish_reason})",
                        "content": "Xin lỗi, phản hồi quá dài và bị cắt. Vui lòng thử lại với câu hỏi cụ thể hơn hoặc chia nhỏ câu hỏi."
                    }
            
            # For other finish_reasons, check if we have content
            if not content_text:
                logger.warning(f"Gemini response has no valid content (finish_reason={finish_reason})")
                return {
                    "success": False,
                    "error": f"Response has no valid content (finish_reason={finish_reason})",
                    "content": "Xin lỗi, tôi không thể tạo phản hồi cho yêu cầu này. Vui lòng thử lại với câu hỏi khác."
                }
            
            return {
                "success": True,
                "content": content_text,
                "candidates": response.candidates if hasattr(response, 'candidates') else [],
                "usage_metadata": response.usage_metadata if hasattr(response, 'usage_metadata') else {},
                "model": model_name,
                "finish_reason": finish_reason
            }
            
        except Exception as e:
            logger.error(f"Gemini Pro generation error: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "content": "Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu."
            }
    
    async def generate_with_grounding(
        self,
        prompt: str,
        sources: List[str],
        system_instruction: Optional[str] = None,
        temperature: float = 0.6,
        max_tokens: int = 800,
        model: str = None
    ) -> Dict[str, Any]:
        """Generate content with grounding from sources"""
        try:
            model_name = model or self.model_name
            genai_model = genai.GenerativeModel(
                model_name=model_name,
                system_instruction=system_instruction
            )
            
            # Configure generation config
            generation_config = genai.types.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            )
            
            # Build prompt with sources
            sources_text = "\n".join([f"- {source}" for source in sources])
            full_prompt = f"{prompt}\n\nNguồn tham khảo:\n{sources_text}"
            
            if system_instruction:
                full_prompt = f"{system_instruction}\n\n{full_prompt}"
            
            response = genai_model.generate_content(
                full_prompt,
                generation_config=generation_config
            )
            
            return {
                "success": True,
                "content": response.text,
                "grounding_metadata": {},
                "usage_metadata": response.usage_metadata if hasattr(response, 'usage_metadata') else {},
                "model": model_name
            }
            
        except Exception as e:
            logger.error(f"Gemini Pro grounding error: {e}")
            return {
                "success": False,
                "error": str(e),
                "content": "Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu."
            }
    
    async def generate_simple(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.6,
        max_tokens: int = 800,
        model: str = None
    ) -> Dict[str, Any]:
        """Simple content generation without tools or grounding"""
        try:
            model_name = model or self.model_name
            
            # Create model with system instruction
            genai_model = genai.GenerativeModel(
                model_name=model_name,
                system_instruction=system_instruction
            )
            
            # Configure generation config
            generation_config = genai.types.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            )
            
            # Generate content
            response = genai_model.generate_content(
                prompt,
                generation_config=generation_config
            )
            
            # Check for blocked or invalid responses
            if not response.candidates or len(response.candidates) == 0:
                logger.warning("Gemini response has no candidates")
                return {
                    "success": False,
                    "error": "Response blocked or empty",
                    "content": "Xin lỗi, tôi không thể tạo phản hồi cho yêu cầu này. Vui lòng thử lại với câu hỏi khác."
                }
            
            # Check finish_reason
            candidate = response.candidates[0]
            finish_reason = candidate.finish_reason if hasattr(candidate, 'finish_reason') else None
            
            # finish_reason values: 1=STOP, 2=MAX_TOKENS, 3=SAFETY, 4=RECITATION, 5=OTHER
            if finish_reason == 3:  # SAFETY - content blocked
                logger.warning(f"Gemini response blocked by safety filters (finish_reason={finish_reason})")
                return {
                    "success": False,
                    "error": "Response blocked by safety filters",
                    "content": "Xin lỗi, tôi không thể tạo phản hồi cho yêu cầu này do bị chặn bởi bộ lọc an toàn. Vui lòng thử lại với câu hỏi khác."
                }
            
            # Try to get text content first (even if finish_reason=2, we may still have partial content)
            content_text = None
            try:
                # Try direct text access first
                if hasattr(response, 'text') and response.text:
                    content_text = response.text
            except Exception:
                pass
            
            # If direct text access failed, try extracting from parts
            if not content_text:
                try:
                    if candidate.content and candidate.content.parts:
                        parts_text = []
                        for part in candidate.content.parts:
                            if hasattr(part, 'text') and part.text:
                                parts_text.append(part.text)
                        content_text = " ".join(parts_text) if parts_text else None
                except Exception as parts_error:
                    logger.warning(f"Failed to extract from parts: {parts_error}")
            
            # If finish_reason=2 (MAX_TOKENS), we still return content if available, but with warning
            if finish_reason == 2:  # MAX_TOKENS - response was truncated
                if content_text:
                    logger.warning(f"Gemini response truncated due to max_tokens limit (finish_reason={finish_reason}). Content may be incomplete.")
                    # Return the partial content - it's still useful
                    return {
                        "success": True,
                        "content": content_text + "\n\n*Lưu ý: Phản hồi có thể bị cắt do giới hạn độ dài. Vui lòng hỏi cụ thể hơn nếu cần thông tin đầy đủ.*",
                        "usage_metadata": response.usage_metadata if hasattr(response, 'usage_metadata') else {},
                        "model": model_name,
                        "finish_reason": finish_reason,
                        "truncated": True
                    }
                else:
                    # No content at all - this is an error
                    logger.warning(f"Gemini response has no content despite finish_reason=2 (MAX_TOKENS)")
                    return {
                        "success": False,
                        "error": f"Response truncated but no content available (finish_reason={finish_reason})",
                        "content": "Xin lỗi, phản hồi quá dài và bị cắt. Vui lòng thử lại với câu hỏi cụ thể hơn hoặc chia nhỏ câu hỏi."
                    }
            
            # For other finish_reasons, check if we have content
            if not content_text:
                logger.warning(f"Gemini response has no valid content (finish_reason={finish_reason})")
                return {
                    "success": False,
                    "error": f"Response has no valid content (finish_reason={finish_reason})",
                    "content": "Xin lỗi, tôi không thể tạo phản hồi cho yêu cầu này. Vui lòng thử lại với câu hỏi khác."
                }
            
            return {
                "success": True,
                "content": content_text,
                "usage_metadata": response.usage_metadata if hasattr(response, 'usage_metadata') else {},
                "model": model_name,
                "finish_reason": finish_reason
            }
            
        except Exception as e:
            logger.error(f"Gemini Pro simple generation error: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "content": "Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu. Vui lòng thử lại."
            }
    
    def create_function_tool(
        self,
        name: str,
        description: str,
        parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create a function tool for Gemini Pro"""
        # For google-generativeai, we return a dict that can be used with function calling
        return {
            "name": name,
            "description": description,
            "parameters": {
                "type": "object",
                "properties": parameters
            }
        }


class LLMClientFactory:
    """Factory for creating LLM clients based on configuration"""
    
    @staticmethod
    def create_client() -> Union[GeminiProClient, None]:
        """Create appropriate LLM client based on configuration"""
        config = get_llm_config()
        
        if config.gemini_api_key:
            return GeminiProClient(api_key=config.gemini_api_key, model_name=config.gemini_model)
        
        return None
    
    @staticmethod
    def get_available_models() -> List[str]:
        """Get list of available models"""
        return [
            "gemini-2.5-flash",
            "gemini-2.0-flash-exp",
            "gemini-1.5-pro",
            "gemini-1.5-flash",
            "gemini-1.0-pro"
        ]


# Utility functions for common operations
async def generate_product_recommendation(
    products: List[Dict[str, Any]],
    user_query: str,
    client: Optional[GeminiProClient] = None
) -> str:
    """Generate product recommendation using Gemini Pro"""
    if not client:
        client = LLMClientFactory.create_client()
        if not client:
            return "Không thể kết nối đến Gemini Pro."
    
    system_instruction = """
    Bạn là trợ lý bán hàng chuyên nghiệp cho cửa hàng e-commerce.
    Nhiệm vụ: Phân tích sản phẩm và đưa ra gợi ý phù hợp với nhu cầu khách hàng.
    
    Quy tắc:
    - Chỉ gợi ý sản phẩm có trong danh sách
    - Giải thích ngắn gọn lý do chọn sản phẩm
    - Bao gồm giá và link sản phẩm
    - Từ chối lịch sự nếu không có sản phẩm phù hợp
    """
    
    product_list = "\n".join([
        f"- {p.get('name', 'N/A')} | {p.get('price', 0):,.0f}đ | /product/{p.get('slug', '')}"
        for p in products
    ])
    
    prompt = f"""
    Khách hàng hỏi: "{user_query}"
    
    Sản phẩm có sẵn:
    {product_list}
    
    Hãy gợi ý sản phẩm phù hợp và giải thích lý do.
    """
    
    result = await client.generate_simple(
        prompt=prompt,
        system_instruction=system_instruction,
        temperature=0.7
    )
    
    return result.get("content", "Không thể tạo gợi ý sản phẩm.")


async def analyze_sentiment_with_gemini(
    texts: List[str],
    client: Optional[GeminiProClient] = None
) -> List[Dict[str, Any]]:
    """Analyze sentiment using Gemini Pro"""
    if not client:
        client = LLMClientFactory.create_client()
        if not client:
            return []
    
    system_instruction = """
    Bạn là chuyên gia phân tích sentiment cho e-commerce.
    Nhiệm vụ: Phân tích cảm xúc của khách hàng từ bình luận.
    
    Phân loại:
    - positive: Tích cực, hài lòng, khen ngợi
    - negative: Tiêu cực, không hài lòng, phàn nàn  
    - neutral: Trung tính, không rõ ràng
    
    Trả về JSON format:
    [{"text": "comment", "sentiment": "positive/negative/neutral", "confidence": 0.95, "reason": "lý do"}]
    """
    
    texts_text = "\n".join([f"- {text}" for text in texts])
    
    prompt = f"""
    Phân tích sentiment cho các bình luận sau:
    
    {texts_text}
    
    Trả về kết quả dưới dạng JSON array.
    """
    
    result = await client.generate_simple(
        prompt=prompt,
        system_instruction=system_instruction,
        temperature=0.3
    )
    
    try:
        content = result.get("content", "[]")
        # Extract JSON from response
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
        
        return json.loads(content)
    except Exception as e:
        logger.error(f"Error parsing sentiment analysis: {e}")
        return []


async def generate_business_insights(
    data: Dict[str, Any],
    analysis_type: str,
    client: Optional[GeminiProClient] = None
) -> str:
    """Generate business insights using Gemini Pro"""
    if not client:
        client = LLMClientFactory.create_client()
        if not client:
            return "Không thể kết nối đến Gemini Pro."
    
    system_instruction = """
    Bạn là chuyên gia phân tích kinh doanh cho e-commerce.
    Nhiệm vụ: Phân tích dữ liệu và đưa ra insights có giá trị.
    
    Quy tắc:
    - Phân tích xu hướng và patterns
    - Đưa ra khuyến nghị cụ thể
    - Sử dụng dữ liệu thực tế
    - Trình bày rõ ràng, dễ hiểu
    """
    
    prompt = f"""
    Loại phân tích: {analysis_type}
    
    Dữ liệu:
    {json.dumps(data, indent=2, ensure_ascii=False)}
    
    Hãy phân tích và đưa ra insights kinh doanh.
    """
    
    result = await client.generate_simple(
        prompt=prompt,
        system_instruction=system_instruction,
        temperature=0.5
    )
    
    return result.get("content", "Không thể tạo phân tích kinh doanh.")
