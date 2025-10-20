#!/usr/bin/env python3
"""
User Chatbot Agent
Provides product consultation and search services for customers
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import asyncio
from ddtrace.trace import tracer

from ...shared.models import (
    AgentRequest, AgentResponse, AgentStep, AgentStepOutput,
    ProductSearchRequest, ProductSearchResult, AgentType
)
from ...shared.llm_client import LLMClientFactory, generate_product_recommendation
from ...core.db import get_conn
from ...services.chatbot.search import ProductSearchService
from ...mcps.agent_integration import get_mcp_integration
from .prompts import (
    USER_CHATBOT_SYSTEM_PROMPT,
    USER_CHATBOT_PRODUCT_SEARCH_PROMPT,
    USER_CHATBOT_NO_PRODUCTS_PROMPT,
    USER_CHATBOT_PRODUCT_DETAILS_PROMPT,
    USER_CHATBOT_COMPARISON_PROMPT,
    USER_CHATBOT_PRICE_INQUIRY_PROMPT,
    USER_CHATBOT_ERROR_HANDLING_PROMPT,
    USER_CHATBOT_GREETING_PROMPT,
    USER_CHATBOT_FAREWELL_PROMPT
)

logger = logging.getLogger(__name__)


class UserChatbotAgent:
    """User Chatbot Agent for product consultation"""
    
    def __init__(self):
        self.agent_type = AgentType.USER_CHATBOT
        self.search_service = ProductSearchService()
        self.llm_client = LLMClientFactory.create_client()
        self.mcp_integration = get_mcp_integration()
        self.capabilities = {
            "can_search_products": True,
            "can_analyze_sentiment": False,
            "can_analyze_revenue": False,
            "can_generate_reports": False,
            "can_use_tools": True,
            "max_context_length": 4000,
            "supported_languages": ["vi", "en"]
        }
    
    @tracer.trace("user_chatbot.process_request")
    async def process_request(self, request: AgentRequest) -> AgentResponse:
        """Process a user chatbot request"""
        start_time = datetime.now()
        
        try:
            # Create initial step
            step = AgentStep(
                task=f"Process user request: {request.message[:100]}...",
                expectation="Provide helpful product consultation",
                reason="User needs product advice",
                step_type="research",
                agent_type=self.agent_type
            )
            
            # Process the request
            result = await self._handle_user_message(request)
            
            # Create step output
            step_output = AgentStepOutput(
                step_id=step.id,
                agent_type=self.agent_type,
                full=result.get("message", ""),
                summary=result.get("summary", ""),
                data=result.get("data", {}),
                metadata=result.get("metadata", {})
            )
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return AgentResponse(
                request_id=request.request_id,
                agent_type=self.agent_type,
                success=result.get("success", True),
                message=result.get("message", ""),
                data=result.get("data", {}),
                steps=[step_output],
                metadata=result.get("metadata", {}),
                processing_time=processing_time
            )
            
        except Exception as e:
            logger.error(f"Error processing user request: {e}")
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return AgentResponse(
                request_id=request.request_id,
                agent_type=self.agent_type,
                success=False,
                message="Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.",
                metadata={"error": str(e)},
                processing_time=processing_time
            )
    
    async def _handle_user_message(self, request: AgentRequest) -> Dict[str, Any]:
        """Handle user message and determine response type"""
        message = request.message.lower().strip()
        
        # Determine intent
        intent = await self._classify_intent(message)
        
        if intent == "greeting":
            return await self._handle_greeting(request)
        elif intent == "product_search":
            return await self._handle_product_search(request)
        elif intent == "product_details":
            return await self._handle_product_details(request)
        elif intent == "price_inquiry":
            return await self._handle_price_inquiry(request)
        elif intent == "product_comparison":
            return await self._handle_product_comparison(request)
        elif intent == "farewell":
            return await self._handle_farewell(request)
        else:
            return await self._handle_general_query(request)
    
    async def _classify_intent(self, message: str) -> str:
        """Classify user intent from message"""
        greeting_keywords = ["xin chào", "hello", "hi", "chào", "bắt đầu"]
        search_keywords = ["tìm", "search", "có", "bán", "mua", "cần"]
        detail_keywords = ["chi tiết", "thông tin", "mô tả", "tính năng"]
        price_keywords = ["giá", "price", "bao nhiêu", "cost", "tiền"]
        comparison_keywords = ["so sánh", "compare", "khác nhau", "nên chọn"]
        farewell_keywords = ["cảm ơn", "tạm biệt", "bye", "kết thúc"]
        
        if any(keyword in message for keyword in greeting_keywords):
            return "greeting"
        elif any(keyword in message for keyword in search_keywords):
            return "product_search"
        elif any(keyword in message for keyword in detail_keywords):
            return "product_details"
        elif any(keyword in message for keyword in price_keywords):
            return "price_inquiry"
        elif any(keyword in message for keyword in comparison_keywords):
            return "product_comparison"
        elif any(keyword in message for keyword in farewell_keywords):
            return "farewell"
        else:
            return "general_query"
    
    async def _handle_greeting(self, request: AgentRequest) -> Dict[str, Any]:
        """Handle greeting messages"""
        if not self.llm_client:
            return {
                "success": True,
                "message": "Xin chào! Tôi là trợ lý bán hàng. Tôi có thể giúp bạn tìm kiếm sản phẩm phù hợp. Bạn cần tư vấn sản phẩm gì?",
                "summary": "Greeting response",
                "data": {"intent": "greeting"}
            }
        
        result = await self.llm_client.generate_simple(
            prompt=USER_CHATBOT_GREETING_PROMPT,
            system_instruction=USER_CHATBOT_SYSTEM_PROMPT,
            temperature=0.7
        )
        
        return {
            "success": result.get("success", True),
            "message": result.get("content", "Xin chào! Tôi có thể giúp gì cho bạn?"),
            "summary": "Greeting response",
            "data": {"intent": "greeting"}
        }
    
    async def _handle_product_search(self, request: AgentRequest) -> Dict[str, Any]:
        """Handle product search requests"""
        try:
            # Search for products
            products = await self._search_products(request.message)
            
            if not products:
                return await self._handle_no_products_found(request)
            
            # Generate recommendation using Gemini Pro
            if self.llm_client:
                recommendation = await generate_product_recommendation(
                    products=products,
                    user_query=request.message,
                    client=self.llm_client
                )
            else:
                # Fallback to simple formatting
                recommendation = self._format_products_simple(products)
            
            return {
                "success": True,
                "message": recommendation,
                "summary": f"Found {len(products)} products",
                "data": {
                    "products": products,
                    "intent": "product_search",
                    "count": len(products)
                }
            }
            
        except Exception as e:
            logger.error(f"Error in product search: {e}")
            return await self._handle_error(request, str(e))
    
    async def _handle_no_products_found(self, request: AgentRequest) -> Dict[str, Any]:
        """Handle case when no products are found"""
        if not self.llm_client:
            return {
                "success": True,
                "message": f"Xin lỗi, chúng tôi không tìm thấy sản phẩm phù hợp với '{request.message}'. Vui lòng thử từ khóa khác hoặc liên hệ hotline để được tư vấn.",
                "summary": "No products found",
                "data": {"intent": "no_products"}
            }
        
        result = await self.llm_client.generate_simple(
            prompt=USER_CHATBOT_NO_PRODUCTS_PROMPT.format(user_query=request.message),
            system_instruction=USER_CHATBOT_SYSTEM_PROMPT,
            temperature=0.7
        )
        
        return {
            "success": result.get("success", True),
            "message": result.get("content", "Không tìm thấy sản phẩm phù hợp."),
            "summary": "No products found",
            "data": {"intent": "no_products"}
        }
    
    async def _handle_product_details(self, request: AgentRequest) -> Dict[str, Any]:
        """Handle product details requests"""
        # Extract product name from message
        product_name = await self._extract_product_name(request.message)
        
        if not product_name:
            return {
                "success": True,
                "message": "Bạn có thể cho tôi biết tên sản phẩm cụ thể không? Tôi sẽ tìm thông tin chi tiết cho bạn.",
                "summary": "Need product name",
                "data": {"intent": "need_product_name"}
            }
        
        # Search for the specific product
        products = await self._search_products(product_name)
        
        if not products:
            return await self._handle_no_products_found(request)
        
        # Get detailed information
        product = products[0]  # Take the first (most relevant) result
        
        if self.llm_client:
            result = await self.llm_client.generate_simple(
                prompt=USER_CHATBOT_PRODUCT_DETAILS_PROMPT.format(
                    product_name=product.get("name", ""),
                    product_details=self._format_product_details(product)
                ),
                system_instruction=USER_CHATBOT_SYSTEM_PROMPT,
                temperature=0.7
            )
            
            message = result.get("content", "Không thể lấy thông tin sản phẩm.")
        else:
            message = self._format_product_details_simple(product)
        
        return {
            "success": True,
            "message": message,
            "summary": f"Product details for {product.get('name', '')}",
            "data": {
                "product": product,
                "intent": "product_details"
            }
        }
    
    async def _handle_price_inquiry(self, request: AgentRequest) -> Dict[str, Any]:
        """Handle price inquiry requests"""
        # Extract product name from message
        product_name = await self._extract_product_name(request.message)
        
        if not product_name:
            return {
                "success": True,
                "message": "Bạn có thể cho tôi biết tên sản phẩm cụ thể không? Tôi sẽ tìm giá cho bạn.",
                "summary": "Need product name for price",
                "data": {"intent": "need_product_name"}
            }
        
        # Search for the specific product
        products = await self._search_products(product_name)
        
        if not products:
            return await self._handle_no_products_found(request)
        
        product = products[0]
        
        if self.llm_client:
            result = await self.llm_client.generate_simple(
                prompt=USER_CHATBOT_PRICE_INQUIRY_PROMPT.format(
                    product_name=product.get("name", ""),
                    price=product.get("price", 0),
                    additional_info=self._format_product_details(product)
                ),
                system_instruction=USER_CHATBOT_SYSTEM_PROMPT,
                temperature=0.7
            )
            
            message = result.get("content", "Không thể lấy thông tin giá.")
        else:
            message = f"Giá của {product.get('name', '')} là {product.get('price', 0):,.0f}đ"
        
        return {
            "success": True,
            "message": message,
            "summary": f"Price inquiry for {product.get('name', '')}",
            "data": {
                "product": product,
                "intent": "price_inquiry"
            }
        }
    
    async def _handle_product_comparison(self, request: AgentRequest) -> Dict[str, Any]:
        """Handle product comparison requests"""
        # Extract product names from message
        product_names = await self._extract_product_names(request.message)
        
        if len(product_names) < 2:
            return {
                "success": True,
                "message": "Bạn có thể cho tôi biết ít nhất 2 sản phẩm để so sánh không?",
                "summary": "Need multiple products for comparison",
                "data": {"intent": "need_multiple_products"}
            }
        
        # Search for products
        all_products = []
        for name in product_names:
            products = await self._search_products(name)
            if products:
                all_products.extend(products[:2])  # Take top 2 results per name
        
        if len(all_products) < 2:
            return await self._handle_no_products_found(request)
        
        if self.llm_client:
            result = await self.llm_client.generate_simple(
                prompt=USER_CHATBOT_COMPARISON_PROMPT.format(
                    products=self._format_products_for_comparison(all_products)
                ),
                system_instruction=USER_CHATBOT_SYSTEM_PROMPT,
                temperature=0.7
            )
            
            message = result.get("content", "Không thể so sánh sản phẩm.")
        else:
            message = self._format_products_comparison_simple(all_products)
        
        return {
            "success": True,
            "message": message,
            "summary": f"Comparison of {len(all_products)} products",
            "data": {
                "products": all_products,
                "intent": "product_comparison"
            }
        }
    
    async def _handle_farewell(self, request: AgentRequest) -> Dict[str, Any]:
        """Handle farewell messages"""
        if not self.llm_client:
            return {
                "success": True,
                "message": "Cảm ơn bạn đã sử dụng dịch vụ! Chúc bạn mua sắm vui vẻ. Hẹn gặp lại!",
                "summary": "Farewell response",
                "data": {"intent": "farewell"}
            }
        
        result = await self.llm_client.generate_simple(
            prompt=USER_CHATBOT_FAREWELL_PROMPT,
            system_instruction=USER_CHATBOT_SYSTEM_PROMPT,
            temperature=0.7
        )
        
        return {
            "success": result.get("success", True),
            "message": result.get("content", "Cảm ơn bạn! Hẹn gặp lại!"),
            "summary": "Farewell response",
            "data": {"intent": "farewell"}
        }
    
    async def _handle_general_query(self, request: AgentRequest) -> Dict[str, Any]:
        """Handle general queries"""
        # Try to search for products anyway
        products = await self._search_products(request.message)
        
        if products:
            return await self._handle_product_search(request)
        else:
            return {
                "success": True,
                "message": "Tôi có thể giúp bạn tìm kiếm sản phẩm, tư vấn về giá cả, hoặc so sánh sản phẩm. Bạn cần hỗ trợ gì cụ thể?",
                "summary": "General query response",
                "data": {"intent": "general_query"}
            }
    
    async def _handle_error(self, request: AgentRequest, error: str) -> Dict[str, Any]:
        """Handle errors"""
        if not self.llm_client:
            return {
                "success": False,
                "message": "Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau hoặc liên hệ hotline để được hỗ trợ.",
                "summary": "Error occurred",
                "data": {"intent": "error", "error": error}
            }
        
        result = await self.llm_client.generate_simple(
            prompt=USER_CHATBOT_ERROR_HANDLING_PROMPT.format(
                error_message=error,
                user_query=request.message
            ),
            system_instruction=USER_CHATBOT_SYSTEM_PROMPT,
            temperature=0.7
        )
        
        return {
            "success": False,
            "message": result.get("content", "Xin lỗi, có lỗi xảy ra."),
            "summary": "Error occurred",
            "data": {"intent": "error", "error": error}
        }
    
    async def _search_products(self, query: str) -> List[Dict[str, Any]]:
        """Search for products using MCP tools"""
        try:
            # Use MCP tool for product search
            result = await self.mcp_integration.search_products(
                query=query,
                limit=10
            )
            
            if result.get("success"):
                return result.get("products", [])
            else:
                logger.error(f"MCP product search failed: {result.get('error', 'Unknown error')}")
                return []
                
        except Exception as e:
            logger.error(f"Error searching products: {e}")
            return []
    
    async def _sql_search_products(self, conn, query: str) -> List[Dict[str, Any]]:
        """SQL fallback search for products"""
        try:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT id, name, price, slug, brand, category
                    FROM products
                    WHERE name LIKE %s OR description LIKE %s
                    ORDER BY view_count DESC
                    LIMIT 5
                    """,
                    (f"%{query}%", f"%{query}%"),
                )
                rows = await cur.fetchall()
                
                return [
                    {
                        "id": r[0],
                        "name": r[1],
                        "price": float(r[2]),
                        "slug": r[3],
                        "brand": r[4],
                        "category": r[5]
                    }
                    for r in rows
                ]
        except Exception as e:
            logger.error(f"Error in SQL search: {e}")
            return []
    
    async def _extract_product_name(self, message: str) -> Optional[str]:
        """Extract product name from message"""
        # Simple extraction - look for quoted text or after keywords
        import re
        
        # Look for quoted text
        quoted = re.findall(r'"([^"]*)"', message)
        if quoted:
            return quoted[0]
        
        # Look for text after keywords
        keywords = ["sản phẩm", "product", "tên", "name"]
        for keyword in keywords:
            if keyword in message.lower():
                parts = message.lower().split(keyword)
                if len(parts) > 1:
                    return parts[1].strip()
        
        return None
    
    async def _extract_product_names(self, message: str) -> List[str]:
        """Extract multiple product names from message"""
        # Simple extraction for comparison
        import re
        
        # Look for "vs", "so sánh", "compare"
        separators = ["vs", "so sánh", "compare", "và", "and"]
        
        for sep in separators:
            if sep in message.lower():
                parts = message.lower().split(sep)
                if len(parts) >= 2:
                    return [part.strip() for part in parts[:2]]
        
        return []
    
    def _format_products_simple(self, products: List[Dict[str, Any]]) -> str:
        """Simple formatting for products"""
        if not products:
            return "Không tìm thấy sản phẩm phù hợp."
        
        lines = []
        for i, product in enumerate(products[:5], 1):
            lines.append(
                f"{i}. {product.get('name', 'N/A')} - {product.get('price', 0):,.0f}đ - /product/{product.get('slug', '')}"
            )
        
        return "Tôi tìm thấy các sản phẩm sau:\n" + "\n".join(lines)
    
    def _format_product_details(self, product: Dict[str, Any]) -> str:
        """Format product details for LLM"""
        details = []
        details.append(f"Tên: {product.get('name', 'N/A')}")
        details.append(f"Giá: {product.get('price', 0):,.0f}đ")
        details.append(f"Thương hiệu: {product.get('brand', 'N/A')}")
        details.append(f"Danh mục: {product.get('category', 'N/A')}")
        details.append(f"Link: /product/{product.get('slug', '')}")
        
        return "\n".join(details)
    
    def _format_product_details_simple(self, product: Dict[str, Any]) -> str:
        """Simple formatting for product details"""
        return f"""
**{product.get('name', 'N/A')}**
- Giá: {product.get('price', 0):,.0f}đ
- Thương hiệu: {product.get('brand', 'N/A')}
- Danh mục: {product.get('category', 'N/A')}
- Xem chi tiết: /product/{product.get('slug', '')}
        """.strip()
    
    def _format_products_for_comparison(self, products: List[Dict[str, Any]]) -> str:
        """Format products for comparison"""
        formatted = []
        for i, product in enumerate(products, 1):
            formatted.append(f"""
Sản phẩm {i}:
- Tên: {product.get('name', 'N/A')}
- Giá: {product.get('price', 0):,.0f}đ
- Thương hiệu: {product.get('brand', 'N/A')}
- Danh mục: {product.get('category', 'N/A')}
- Link: /product/{product.get('slug', '')}
            """.strip())
        
        return "\n\n".join(formatted)
    
    def _format_products_comparison_simple(self, products: List[Dict[str, Any]]) -> str:
        """Simple formatting for product comparison"""
        if len(products) < 2:
            return "Cần ít nhất 2 sản phẩm để so sánh."
        
        lines = ["**So sánh sản phẩm:**\n"]
        
        for i, product in enumerate(products[:2], 1):
            lines.append(f"**Sản phẩm {i}:**")
            lines.append(f"- Tên: {product.get('name', 'N/A')}")
            lines.append(f"- Giá: {product.get('price', 0):,.0f}đ")
            lines.append(f"- Thương hiệu: {product.get('brand', 'N/A')}")
            lines.append(f"- Link: /product/{product.get('slug', '')}")
            lines.append("")
        
        return "\n".join(lines)
