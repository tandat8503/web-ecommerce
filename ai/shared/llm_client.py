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
from google import genai
from google.genai.types import (
    GenerateContentConfig,
    GoogleSearch,
    GroundingChunk,
    GroundingSupport,
    HttpOptions,
    Modality,
    Tool,
    FunctionDeclaration,
    Schema,
    Type,
)
from pydantic import BaseModel, Field
from ..core.config import get_llm_config

logger = logging.getLogger(__name__)


class GeminiProClient:
    """Advanced Gemini Pro client with function calling and grounding support"""
    
    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)
        self.api_key = api_key
        
    async def generate_with_tools(
        self,
        prompt: str,
        tools: List[Tool],
        system_instruction: Optional[str] = None,
        temperature: float = 0.6,
        max_tokens: int = 800,
        model: str = "gemini-1.5-pro"
    ) -> Dict[str, Any]:
        """Generate content with function calling tools"""
        try:
            config = GenerateContentConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
                tools=tools,
            )
            
            messages = []
            if system_instruction:
                messages.append({
                    "role": "user",
                    "parts": [{"text": f"System: {system_instruction}\n\nUser: {prompt}"}]
                })
            else:
                messages.append({
                    "role": "user", 
                    "parts": [{"text": prompt}]
                })
            
            response = self.client.models.generate_content(
                model=model,
                contents=messages,
                config=config
            )
            
            return {
                "success": True,
                "content": response.text,
                "candidates": response.candidates,
                "usage_metadata": response.usage_metadata,
                "model": model
            }
            
        except Exception as e:
            logger.error(f"Gemini Pro generation error: {e}")
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
        model: str = "gemini-1.5-pro"
    ) -> Dict[str, Any]:
        """Generate content with grounding from sources"""
        try:
            grounding_chunks = []
            for source in sources:
                grounding_chunks.append(GroundingChunk(
                    web={"uri": source}
                ))
            
            grounding_support = GroundingSupport(
                grounding_chunks=grounding_chunks
            )
            
            config = GenerateContentConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
                grounding_support=grounding_support,
            )
            
            messages = []
            if system_instruction:
                messages.append({
                    "role": "user",
                    "parts": [{"text": f"System: {system_instruction}\n\nUser: {prompt}"}]
                })
            else:
                messages.append({
                    "role": "user",
                    "parts": [{"text": prompt}]
                })
            
            response = self.client.models.generate_content(
                model=model,
                contents=messages,
                config=config
            )
            
            return {
                "success": True,
                "content": response.text,
                "grounding_metadata": response.grounding_metadata,
                "usage_metadata": response.usage_metadata,
                "model": model
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
        model: str = "gemini-1.5-pro"
    ) -> Dict[str, Any]:
        """Simple content generation without tools or grounding"""
        try:
            config = GenerateContentConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            )
            
            messages = []
            if system_instruction:
                messages.append({
                    "role": "user",
                    "parts": [{"text": f"System: {system_instruction}\n\nUser: {prompt}"}]
                })
            else:
                messages.append({
                    "role": "user",
                    "parts": [{"text": prompt}]
                })
            
            response = self.client.models.generate_content(
                model=model,
                contents=messages,
                config=config
            )
            
            return {
                "success": True,
                "content": response.text,
                "usage_metadata": response.usage_metadata,
                "model": model
            }
            
        except Exception as e:
            logger.error(f"Gemini Pro simple generation error: {e}")
            return {
                "success": False,
                "error": str(e),
                "content": "Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu."
            }
    
    def create_function_tool(
        self,
        name: str,
        description: str,
        parameters: Dict[str, Any]
    ) -> Tool:
        """Create a function tool for Gemini Pro"""
        function_declaration = FunctionDeclaration(
            name=name,
            description=description,
            parameters=Schema(
                type=Type.OBJECT,
                properties=parameters
            )
        )
        
        return Tool(function_declarations=[function_declaration])


class LLMClientFactory:
    """Factory for creating LLM clients based on configuration"""
    
    @staticmethod
    def create_client() -> Union[GeminiProClient, None]:
        """Create appropriate LLM client based on configuration"""
        config = get_llm_config()
        
        if config.gemini_api_key:
            return GeminiProClient(api_key=config.gemini_api_key)
        
        return None
    
    @staticmethod
    def get_available_models() -> List[str]:
        """Get list of available models"""
        return [
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
