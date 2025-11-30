#!/usr/bin/env python3
"""
Simple Agents for Web-ecommerce AI System
Following ai-native-todo-task-agent structure
"""

import asyncio
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from shared.llm_client import LLMClientFactory
from core.db import get_conn, release_conn
from prompts import (
    ORCHESTRATOR_SYSTEM_PROMPT,
    USER_CHATBOT_SYSTEM_PROMPT,
    USER_CHATBOT_EXTRACTION_PROMPT,
    USER_CHATBOT_CONSULTANT_PROMPT,
    ADMIN_CHATBOT_SYSTEM_PROMPT,
    SENTIMENT_ANALYZER_SYSTEM_PROMPT,
    BUSINESS_ANALYST_SYSTEM_PROMPT,
    CONTENT_MODERATION_SYSTEM_PROMPT,
    REPORT_GENERATOR_SYSTEM_PROMPT,
    ERROR_HANDLING_PROMPT
)

logger = logging.getLogger(__name__)


class MCPToolClient:
    """Simple MCP tool client"""
    
    def __init__(self):
        self.tools = {}
        self._load_tools()
    
    def _load_tools(self):
        """Load MCP tool helpers dynamically"""
        try:
            # ✅ Import helper functions (without MCP decorators) to avoid FastMCP parsing issues
            from mcps.helpers import (
                search_products_helper,
                analyze_sentiment_helper,
                summarize_sentiment_by_product_helper,
                get_revenue_analytics_helper,
                get_sales_performance_helper,
                get_product_metrics_helper,
                generate_report_helper,
                generate_html_report_helper,
                moderate_content_helper
            )
            
            self.tools = {
                "search_products": search_products_helper,
                "analyze_sentiment": analyze_sentiment_helper,
                "summarize_sentiment_by_product": summarize_sentiment_by_product_helper,
                "get_revenue_analytics": get_revenue_analytics_helper,
                "get_sales_performance": get_sales_performance_helper,
                "get_product_metrics": get_product_metrics_helper,
                "generate_report": generate_report_helper,
                "generate_html_report": generate_html_report_helper,
                "moderate_content": moderate_content_helper
            }
            logger.info(f"Successfully loaded {len(self.tools)} MCP tool helpers")
        except ImportError as e:
            logger.error(f"Failed to load MCP tool helpers: {e}")
            logger.warning("MCP tools may not work properly")
    
    async def call_tool(self, tool_name: str, **kwargs) -> Dict[str, Any]:
        """Call an MCP tool"""
        try:
            if tool_name not in self.tools:
                return {"success": False, "error": f"Tool {tool_name} not found"}
            
            result = await self.tools[tool_name](**kwargs)
            return json.loads(result)
        except Exception as e:
            logger.error(f"Error calling tool {tool_name}: {e}")
            return {"success": False, "error": str(e)}


class BaseAgent:
    """Base agent class"""
    
    def __init__(self, agent_type: str, system_prompt: str):
        self.agent_type = agent_type
        self.system_prompt = system_prompt
        self.llm_client = LLMClientFactory.create_client()
        self.tool_client = MCPToolClient()
    
    async def _get_user_context(self, user_id: Optional[int]) -> str:
        """Get user information and order history for personalization"""
        if not user_id:
            return ""
        
        try:
            from core.db import get_conn, release_conn
            conn = await get_conn()
            try:
                async with conn.cursor() as cur:
                    # Get user info
                    await cur.execute("""
                        SELECT first_name, last_name, email, phone
                        FROM users
                        WHERE id = %s AND is_active = 1
                    """, (user_id,))
                    user_row = await cur.fetchone()
                    
                    if not user_row:
                        return ""
                    
                    first_name = user_row[0] or ""
                    last_name = user_row[1] or ""
                    user_name = f"{first_name} {last_name}".strip() or "khách hàng"
                    
                    # Get last order
                    await cur.execute("""
                        SELECT o.order_number, o.status, o.total_amount, o.created_at,
                               GROUP_CONCAT(p.name SEPARATOR ', ') as products
                        FROM orders o
                        LEFT JOIN order_items oi ON o.id = oi.order_id
                        LEFT JOIN products p ON oi.product_id = p.id
                        WHERE o.user_id = %s
                        ORDER BY o.created_at DESC
                        LIMIT 1
                    """, (user_id,))
                    order_row = await cur.fetchone()
                    
                    context_parts = [f"Khách hàng: {user_name}"]
                    
                    if order_row:
                        order_number = order_row[0] or ""
                        order_status = order_row[1] or ""
                        total_amount = float(order_row[2]) if order_row[2] else 0
                        products = order_row[4] or ""
                        
                        status_map = {
                            "PENDING": "đang chờ xử lý",
                            "CONFIRMED": "đã xác nhận",
                            "PROCESSING": "đang xử lý",
                            "DELIVERED": "đã giao hàng",
                            "CANCELLED": "đã hủy"
                        }
                        status_text = status_map.get(order_status, order_status)
                        
                        context_parts.append(f"Đơn hàng gần nhất: {order_number} - {products} - Trạng thái: {status_text} - Tổng tiền: {total_amount:,.0f}₫")
                    
                    return ". ".join(context_parts) + "."
            finally:
                await release_conn(conn)
        except Exception as e:
            logger.warning(f"Failed to get user context: {e}")
            return ""
    
    async def process_request(self, user_message: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Process a user request with conversation history"""
        try:
            # Get or create session ID from context
            session_id = context.get("session_id", "default") if context else "default"
            
            # Get user context for personalization
            user_id = context.get("user_id") if context else None
            user_context = ""
            if user_id and self.agent_type == "user_chatbot":
                user_context = await self._get_user_context(user_id)
            
            # Get conversation history for context
            conversation_summary = self.conversation_history.get_conversation_summary(session_id)
            conv_context = self.conversation_history.get_context(session_id)
            
            # Merge conversation context with provided context
            enhanced_context = {**(context or {}), **conv_context}
            enhanced_context["conversation_summary"] = conversation_summary
            enhanced_context["user_context"] = user_context
            
            # Determine intent and call appropriate tools
            intent = await self._classify_intent(user_message)
            tool_result = await self._call_tools(intent, user_message, enhanced_context)
            
            # Add user message to history
            self.conversation_history.add_message(
                session_id=session_id,
                role="user",
                content=user_message,
                metadata={"intent": intent, "products": tool_result.get("products", [])}
            )
            
            # Generate response using LLM with conversation context
            if self.llm_client:
                response_data = await self._generate_response(
                    user_message, 
                    tool_result, 
                    intent,
                    conversation_summary=conversation_summary,
                    context=enhanced_context
                )
            else:
                response_text = self._format_simple_response(tool_result, intent)
                response_data = {
                    "text": response_text,
                    "type": "text"
                }
            
            # Extract response text for history (backward compatibility)
            if isinstance(response_data, dict):
                response_text = response_data.get("text", str(response_data))
            else:
                response_text = str(response_data)
                response_data = {"text": response_text, "type": "text"}
            
            # Add assistant response to history
            self.conversation_history.add_message(
                session_id=session_id,
                role="assistant",
                content=response_text,
                metadata={"intent": intent, "products": tool_result.get("products", [])}
            )
            
            # Update context with latest products
            if tool_result.get("products"):
                self.conversation_history.update_context(session_id, {
                    "last_products": tool_result.get("products", [])[:3],
                    "last_product_name": tool_result.get("products", [])[0].get("name") if tool_result.get("products") else None
                })
            
            return {
                "success": True,
                "agent_type": self.agent_type,
                "intent": intent,
                "response": response_data,  # Return structured response
                "tool_result": tool_result,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in {self.agent_type}: {e}")
            return {
                "success": False,
                "agent_type": self.agent_type,
                "error": str(e),
                "response": ERROR_HANDLING_PROMPT.format(
                    error_message=str(e),
                    user_query=user_message
                )
            }
    
    async def _classify_intent(self, user_message: str) -> str:
        """Classify user intent - to be overridden by subclasses"""
        return "general"
    
    async def _call_tools(self, intent: str, user_message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Call appropriate tools - to be overridden by subclasses"""
        return {}
    
    async def _generate_response(
        self, 
        user_message: str, 
        tool_result: Dict[str, Any], 
        intent: str,
        conversation_summary: str = "",
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Generate response using LLM with conversation context"""
        try:
            # ✅ Xử lý các trường hợp đặc biệt TRƯỚC khi gọi LLM
            out_of_scope = tool_result.get("out_of_scope", False)
            greeting = tool_result.get("greeting", False)
            no_results = tool_result.get("no_results", False)
            products = tool_result.get("products", [])
            has_products = products and len(products) > 0
            
            # ✅ out_of_scope → Return fixed response
            if out_of_scope:
                return {
                    "text": "Xin chào bạn! Mình là AI tư vấn chuyên về nội thất văn phòng (bàn, ghế, tủ, kệ, v.v.). Câu hỏi của bạn không thuộc phạm vi tư vấn của mình. Bạn có cần tư vấn về sản phẩm nội thất văn phòng không ạ?",
                    "type": "text"
                }
            
            # ✅ greeting → Return fixed response with user personalization
            if greeting:
                user_context = context.get("user_context", "") if context else ""
                greeting_text = "Xin chào bạn! Mình là AI tư vấn chuyên về nội thất văn phòng. Bạn cần tư vấn về sản phẩm nào ạ?"
                if user_context and "Khách hàng:" in user_context:
                    # Extract user name from context
                    user_name = user_context.split("Khách hàng:")[1].split(".")[0].strip() if "Khách hàng:" in user_context else ""
                    if user_name:
                        greeting_text = f"Xin chào {user_name}! Mình là AI tư vấn chuyên về nội thất văn phòng. Bạn cần tư vấn về sản phẩm nào ạ?"
                return {
                    "text": greeting_text,
                    "type": "text"
                }
            
            # ✅ no_results → Generate helpful response based on query
            if no_results or (tool_result.get("success") and not has_products and intent in ["product_search", "price_inquiry", "product_comparison", "product_detail"]):
                query = tool_result.get("query", user_message)
                user_lower = user_message.lower()
                
                # Check if user asked about price filter
                from core.utils import extract_price_filter
                min_price, max_price = extract_price_filter(user_message)
                has_price_filter = min_price is not None or max_price is not None
                
                # Special handling for "học tập" queries
                is_chair_query = any(word in user_lower for word in ["ghế", "ghe", "chair"])
                is_desk_query = any(word in user_lower for word in ["bàn", "ban", "desk"])
                
                is_study_query = (
                    "học tập" in user_lower or 
                    "dành cho việc học" in user_lower or
                    "danh cho viec hoc" in user_lower or
                    "cho việc học" in user_lower or
                    "cho viec hoc" in user_lower or
                    ("học" in user_lower and "họp" not in user_lower and "khóa học" not in user_lower)
                )
                
                if is_study_query:
                    if is_chair_query:
                        # For chairs, we don't have specific study chairs, suggest swivel chairs
                        price_msg = ""
                        if max_price:
                            price_msg = f" với giá dưới {max_price:,.0f}₫"
                        return {
                            "text": f"Xin chào bạn! Về ghế dùng cho học tập{price_msg}, cửa hàng mình có các loại ghế phù hợp như Ghế Xoay. Bạn muốn mình tư vấn cụ thể về loại ghế nào không ạ?",
                            "type": "text"
                        }
                    else:
                        # For desks, suggest all desk types except meeting tables
                        price_msg = ""
                        if max_price:
                            price_msg = f" với giá dưới {max_price:,.0f}₫"
                        return {
                            "text": f"Xin chào bạn! Về bàn dùng cho học tập{price_msg}, cửa hàng mình có các loại bàn phù hợp như: Bàn Chữ U, Bàn Chữ L, và Bàn Nâng Hạ. Tất cả các loại bàn này đều có thể dùng để học tập rất tốt. Bạn muốn mình tư vấn cụ thể về loại bàn nào không ạ?",
                            "type": "text"
                        }
                
                # Default no results message
                price_msg = ""
                if has_price_filter:
                    if min_price and max_price:
                        price_msg = f" trong khoảng giá từ {min_price:,.0f}₫ đến {max_price:,.0f}₫"
                    elif max_price:
                        price_msg = f" với giá dưới {max_price:,.0f}₫"
                    elif min_price:
                        price_msg = f" với giá trên {min_price:,.0f}₫"
                
                # ✅ Fallback Strategy Pro: Gợi ý màu tương đồng và thu thập lead
                fallback_text = f"Xin chào bạn! Mình đã tìm kiếm nhưng hiện tại cửa hàng chưa có sản phẩm phù hợp với yêu cầu \"{query}\"{price_msg} của bạn."
                
                # Try to find alternative products (different color, similar category)
                alternative_products = []
                try:
                    from core.db import get_conn, release_conn
                    conn = await get_conn()
                    try:
                        async with conn.cursor() as cur:
                            # If user asked for specific color, suggest similar colors
                            if "màu" in query.lower() or "color" in query.lower():
                                # Extract color from query
                                color_keywords = ["trắng", "đen", "nâu", "xám", "gỗ", "tím", "xanh", "đỏ", "vàng"]
                                query_lower = query.lower()
                                requested_color = None
                                for color in color_keywords:
                                    if color in query_lower:
                                        requested_color = color
                                        break
                                
                                # Suggest alternative colors
                                alternative_colors = {
                                    "tím": "Trắng hoặc Đen",
                                    "đỏ": "Nâu hoặc Gỗ",
                                    "vàng": "Gỗ hoặc Nâu",
                                    "xanh": "Xám hoặc Đen"
                                }
                                
                                if requested_color and requested_color in alternative_colors:
                                    fallback_text += f" Dạ màu {requested_color.capitalize()} bên em tạm hết, nhưng em thấy màu {alternative_colors[requested_color]} cũng rất đẹp và phù hợp, bạn xem thử nhé?"
                                
                                # Get products with alternative colors
                                await cur.execute("""
                                    SELECT p.id, p.name, p.price, p.slug, p.image_url, 
                                           COALESCE(p.sale_price, p.price) as final_price,
                                           c.name as category
                                    FROM products p
                                    LEFT JOIN categories c ON p.category_id = c.id
                                    LEFT JOIN product_variants pv ON p.id = pv.product_id
                                    WHERE p.status = 'ACTIVE'
                                      AND (pv.color LIKE %s OR pv.color LIKE %s OR pv.color LIKE %s)
                                    ORDER BY p.view_count DESC
                                    LIMIT 3
                                """, (f"%{alternative_colors[requested_color].split()[0]}%", "%trắng%", "%đen%"))
                                rows = await cur.fetchall()
                                for row in rows:
                                    alternative_products.append({
                                        "id": row[0],
                                        "name": row[1],
                                        "price": float(row[2]),
                                        "slug": row[4] or "",
                                        "image_url": row[4],
                                        "final_price": float(row[5]) if row[5] else float(row[2]),
                                        "category": row[6] or ""
                                    })
                            else:
                                # Suggest similar category products
                                if "bàn" in query.lower():
                                    await cur.execute("""
                                        SELECT p.id, p.name, p.price, p.slug, p.image_url, 
                                               COALESCE(p.sale_price, p.price) as final_price,
                                               c.name as category
                                        FROM products p
                                        LEFT JOIN categories c ON p.category_id = c.id
                                        WHERE p.status = 'ACTIVE' 
                                          AND c.name LIKE '%Bàn%'
                                        ORDER BY p.view_count DESC
                                        LIMIT 3
                                    """)
                                elif "ghế" in query.lower():
                                    await cur.execute("""
                                        SELECT p.id, p.name, p.price, p.slug, p.image_url, 
                                               COALESCE(p.sale_price, p.price) as final_price,
                                               c.name as category
                                        FROM products p
                                        LEFT JOIN categories c ON p.category_id = c.id
                                        WHERE p.status = 'ACTIVE' 
                                          AND c.name LIKE '%Ghế%'
                                        ORDER BY p.view_count DESC
                                        LIMIT 3
                                    """)
                                else:
                                    # Get popular products
                                    await cur.execute("""
                                        SELECT p.id, p.name, p.price, p.slug, p.image_url, 
                                               COALESCE(p.sale_price, p.price) as final_price,
                                               c.name as category
                                        FROM products p
                                        LEFT JOIN categories c ON p.category_id = c.id
                                        WHERE p.status = 'ACTIVE'
                                        ORDER BY p.view_count DESC
                                        LIMIT 3
                                    """)
                                
                                rows = await cur.fetchall()
                                for row in rows:
                                    alternative_products.append({
                                        "id": row[0],
                                        "name": row[1],
                                        "price": float(row[2]),
                                        "slug": row[4] or "",
                                        "image_url": row[4],
                                        "final_price": float(row[5]) if row[5] else float(row[2]),
                                        "category": row[6] or ""
                                    })
                    finally:
                        await release_conn(conn)
                except Exception as e:
                    logger.warning(f"Failed to get alternative products: {e}")
                
                # If no alternative products found, suggest contact
                if not alternative_products:
                    fallback_text += " Mẫu này đang cháy hàng, bạn để lại số điện thoại, khi nào hàng về em nhắn Zalo cho bạn ngay ạ?"
                    return {
                        "text": fallback_text,
                        "type": "text",
                        "suggest_contact": True  # Flag to show contact form in frontend
                    }
                
                # Format alternative products as cards
                alternative_cards = []
                for p in alternative_products:
                    alternative_cards.append({
                        "id": p.get("id"),
                        "name": p.get("name", "Sản phẩm"),
                        "category": p.get("category", ""),
                        "price": float(p.get("price", 0)),
                        "sale_price": None,
                        "final_price": float(p.get("final_price", 0)),
                        "slug": p.get("slug", ""),
                        "image_url": p.get("image_url", ""),
                        "link": f"/san-pham/{p.get('id', '')}"
                    })
                
                return {
                    "text": fallback_text,
                    "type": "product_recommendation",
                    "data": alternative_cards,
                    "suggest_contact": True  # Also suggest contact for lead collection
                }
            
            # ✅ Có products → Trust search engine results, let LLM handle filtering and ranking
            # Simplified: Take top 5 products from search results (search engine already did the hard work)
            top_products = products[:5]  # Trust search engine ranking
            
            # Format products với đầy đủ thông tin: tên, category, giá, giá sale, link, image
            products_info = []
            for p in top_products:
                slug = p.get("slug", "")
                name = p.get("name", "Sản phẩm")
                category = p.get("category", "")
                category_slug = p.get("category_slug", "")
                original_price = float(p.get("price", 0))
                sale_price = p.get("sale_price")
                final_price = float(sale_price) if sale_price else original_price
                
                # Đảm bảo có slug - nếu không có, thử lấy từ id (fallback)
                if not slug and p.get("id"):
                    logger.warning(f"Product {p.get('id')} missing slug")
                
                # Frontend route is /san-pham/:id (not /product/:slug)
                product_id = p.get("id")
                product_link = f"/san-pham/{product_id}" if product_id else "/san-pham"
                
                products_info.append({
                    "id": p.get("id"),
                    "name": name,
                    "category": category,
                    "category_slug": category_slug,
                    "price": original_price,
                    "sale_price": float(sale_price) if sale_price else None,
                    "final_price": final_price,
                    "link": product_link,
                    "slug": slug,
                    "description": p.get("description", "")[:200],  # Truncate description
                    "image_url": p.get("image_url") or p.get("image")  # Include image URL for display
                })
            
            # Build conversation context string
            conv_context_str = ""
            if conversation_summary:
                conv_context_str = f"\n\nLịch sử trò chuyện gần đây:\n{conversation_summary}"
            
            # Add user context for personalization
            user_context = context.get("user_context", "") if context else ""
            if user_context:
                conv_context_str += f"\n\nThông tin khách hàng: {user_context}"
            
            # ✅ Cross-sell: Get related products (e.g., if searching for "bàn", suggest "ghế")
            cross_sell_products = []
            user_lower = user_message.lower()
            if "bàn" in user_lower and "ghế" not in user_lower:
                # User searching for desk, suggest chairs
                try:
                    from core.db import get_conn, release_conn
                    conn = await get_conn()
                    try:
                        async with conn.cursor() as cur:
                            await cur.execute("""
                                SELECT p.id, p.name, p.price, p.slug, p.image_url, 
                                       COALESCE(p.sale_price, p.price) as final_price,
                                       c.name as category
                                FROM products p
                                LEFT JOIN categories c ON p.category_id = c.id
                                WHERE p.status = 'ACTIVE' 
                                  AND (c.name LIKE '%Ghế%' OR c.name LIKE '%Chair%')
                                ORDER BY p.view_count DESC
                                LIMIT 2
                            """)
                            rows = await cur.fetchall()
                            for row in rows:
                                cross_sell_products.append({
                                    "id": row[0],
                                    "name": row[1],
                                    "price": float(row[2]),
                                    "slug": row[4] or "",
                                    "image_url": row[4],
                                    "final_price": float(row[5]) if row[5] else float(row[2]),
                                    "category": row[6] or ""
                                })
                    finally:
                        await release_conn(conn)
                except Exception as e:
                    logger.warning(f"Failed to get cross-sell products: {e}")
            
            # Build prompt với conversation context
            products_display = json.dumps(products_info, indent=2, ensure_ascii=False)
            
            # Use new consultant prompt
            prompt = USER_CHATBOT_CONSULTANT_PROMPT.format(
                products_data=products_display,
                user_message=user_message
            )
            
            # Add conversation context if available
            if conv_context_str:
                prompt += f"\n\n{conv_context_str}"
            
            result = await self.llm_client.generate_simple(
                prompt=prompt,
                system_instruction=self.system_prompt,
                temperature=0.7
            )
            
            # Check if LLM generation failed
            if not result.get("success", False):
                error_msg = result.get("error", "Unknown error")
                logger.warning(f"LLM generation failed: {error_msg}")
                # Fallback to simple response without LLM
                response_text = result.get("content", "Xin lỗi, tôi không thể tạo phản hồi cho yêu cầu này. Vui lòng thử lại với câu hỏi khác.")
            else:
                response_text = result.get("content", "Xin lỗi, tôi không thể tạo phản hồi.")
            
            # ✅ Return structured response with product cards
            if has_products:
                # Filter products based on LLM response (if LLM mentioned specific products)
                mentioned_product_names = []
                for p in top_products:
                    if p.get("name") in response_text:
                        mentioned_product_names.append(p.get("name"))
                
                # If LLM mentioned specific products, only show those
                # Otherwise show top 3 products
                if mentioned_product_names:
                    filtered_products = [p for p in top_products if p.get("name") in mentioned_product_names]
                else:
                    filtered_products = top_products[:3]
                
                # Format product cards data
                product_cards = []
                for p in filtered_products:
                    product_cards.append({
                        "id": p.get("id"),
                        "name": p.get("name", "Sản phẩm"),
                        "category": p.get("category", ""),
                        "price": float(p.get("price", 0)),
                        "sale_price": float(p.get("sale_price")) if p.get("sale_price") else None,
                        "final_price": float(p.get("sale_price")) if p.get("sale_price") else float(p.get("price", 0)),
                        "slug": p.get("slug", ""),
                        "image_url": p.get("image_url") or p.get("image", ""),
                        "link": f"/san-pham/{p.get('id', '')}"
                    })
                
                # Add cross-sell products if available
                cross_sell_cards = []
                if cross_sell_products:
                    for p in cross_sell_products:
                        cross_sell_cards.append({
                            "id": p.get("id"),
                            "name": p.get("name", "Sản phẩm"),
                            "category": p.get("category", ""),
                            "price": float(p.get("price", 0)),
                            "sale_price": None,
                            "final_price": float(p.get("final_price", 0)),
                            "slug": p.get("slug", ""),
                            "image_url": p.get("image_url", ""),
                            "link": f"/san-pham/{p.get('id', '')}"
                        })
                
                return {
                    "text": response_text,
                    "type": "product_recommendation",
                    "data": product_cards,
                    "cross_sell": cross_sell_cards if cross_sell_cards else None
                }
            
            # No products - return text response
            return {
                "text": response_text,
                "type": "text"
            }
            
        except Exception as e:
            logger.error(f"Error generating response: {e}", exc_info=True)
            # Log the tool_result to debug
            logger.error(f"Tool result: {json.dumps(tool_result, indent=2, ensure_ascii=False, default=str)}")
            return self._format_simple_response(tool_result, intent)
    
    def _format_simple_response(self, tool_result: Dict[str, Any], intent: str) -> str:
        """Format simple response without LLM - tạo response có ý nghĩa từ tool results"""
        # ✅ Xử lý các trường hợp đặc biệt TRƯỚC
        out_of_scope = tool_result.get("out_of_scope", False)
        greeting = tool_result.get("greeting", False)
        no_results = tool_result.get("no_results", False)
        
        if out_of_scope:
            return "Xin chào bạn! Mình là AI tư vấn chuyên về nội thất văn phòng (bàn, ghế, tủ, kệ, v.v.). Câu hỏi của bạn không thuộc phạm vi tư vấn của mình. Bạn có cần tư vấn về sản phẩm nội thất văn phòng không ạ?"
        
        if greeting:
            return "Xin chào bạn! Mình là AI tư vấn chuyên về nội thất văn phòng. Bạn cần tư vấn về sản phẩm nào ạ?"
        
        if not tool_result.get("success"):
            return f"Xin lỗi, tôi không thể xử lý yêu cầu của bạn. Lỗi: {tool_result.get('error', 'Lỗi không xác định')}"
        
        # ✅ Nếu có products từ search, format response ngắn gọn
        products = tool_result.get("products", [])
        if products and len(products) > 0:
            # Tạo response ngắn gọn chỉ giới thiệu 1-2 sản phẩm phù hợp nhất
            top_products = products[:2]  # Chỉ lấy 2 sản phẩm đầu
            product_names = [p.get("name", "Sản phẩm") for p in top_products]
            
            if len(products) == 1:
                return f"Chào bạn! Mình tìm thấy sản phẩm {product_names[0]} phù hợp với yêu cầu của bạn. Bạn muốn xem chi tiết sản phẩm này không?"
            else:
                return f"Chào bạn! Mình tìm thấy {len(products)} sản phẩm phù hợp, gợi ý bạn {product_names[0]} và {product_names[1]}. Bạn muốn xem chi tiết sản phẩm nào không?"
        
        # ✅ Nếu không có products (no_results = True)
        if no_results or intent in ["product_search", "price_inquiry", "product_comparison", "product_detail"]:
            query = tool_result.get("query", "")
            # Note: This is a fallback - the main _generate_response should handle this
            # But we check for "học tập" here too for safety
            if "học tập" in query.lower() or ("học" in query.lower() and "họp" not in query.lower()):
                return "Xin chào bạn! Về bàn dùng cho học tập, cửa hàng mình có các loại bàn phù hợp như: Bàn Chữ U, Bàn Chữ L, và Bàn Nâng Hạ. Tất cả các loại bàn này đều có thể dùng để học tập rất tốt. Bạn muốn mình tư vấn cụ thể về loại bàn nào không ạ?"
            
            if query:
                return f"Xin chào bạn! Mình đã tìm kiếm nhưng hiện tại cửa hàng chưa có sản phẩm phù hợp với yêu cầu \"{query}\" của bạn. Bạn có thể thử tìm kiếm với từ khóa khác hoặc liên hệ trực tiếp với chúng tôi để được tư vấn chi tiết hơn ạ."
            else:
                return "Xin chào bạn! Mình đã tìm kiếm nhưng hiện tại cửa hàng chưa có sản phẩm phù hợp với yêu cầu của bạn. Bạn có thể thử tìm kiếm với từ khóa khác hoặc liên hệ trực tiếp với chúng tôi để được tư vấn chi tiết hơn ạ."
        
        # ✅ Default fallback
        return "Tôi có thể giúp bạn tìm kiếm sản phẩm, tư vấn, hoặc so sánh giá. Bạn muốn tôi giúp gì ạ?"


class UserChatbotAgent(BaseAgent):
    """User Chatbot Agent for product consultation"""
    
    def __init__(self):
        super().__init__("user_chatbot", USER_CHATBOT_SYSTEM_PROMPT)
        from core.conversation import conversation_history
        self.conversation_history = conversation_history
    
    async def _extract_search_params(self, user_message: str) -> Dict[str, Any]:
        """
        Use LLM to extract search parameters from user message
        Returns: Dict with query, price_min, price_max, category_hint, attributes
        """
        import json
        import re
        
        # If LLM client is not available, use fallback extraction
        if not self.llm_client:
            logger.warning("LLM client not available, using fallback extraction")
            from core.utils import extract_price_filter, extract_search_query
            min_price, max_price = extract_price_filter(user_message)
            query = extract_search_query(user_message)
            return {
                "query": query,
                "price_min": min_price,
                "price_max": max_price,
                "category_hint": None,
                "attributes": {}
            }
        
        try:
            prompt = USER_CHATBOT_EXTRACTION_PROMPT.format(user_message=user_message)
            
            # Call LLM to extract parameters
            result = await self.llm_client.generate_simple(
                prompt=prompt,
                system_instruction="Bạn là chuyên gia trích xuất thông tin. Chỉ trả về JSON, không có text thêm.",
                temperature=0.3
            )
            
            # Check if LLM generation failed
            if not result.get("success", False):
                error_msg = result.get("error", "Unknown error")
                logger.warning(f"LLM extraction failed: {error_msg}, falling back to simple extraction")
                # Fallback to simple extraction
                from core.utils import extract_price_filter, extract_search_query
                min_price, max_price = extract_price_filter(user_message)
                query = extract_search_query(user_message)
                return {
                    "query": query,
                    "price_min": min_price,
                    "price_max": max_price,
                    "category_hint": None,
                    "attributes": {}
                }
            
            content = result.get("content", "").strip()
            logger.info(f"LLM extraction response: {content[:200]}")  # Log first 200 chars
            
            # Try to extract JSON from response
            # LLM might wrap JSON in markdown code blocks
            json_match = re.search(r'\{[^{}]*\}', content, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                try:
                    extracted = json.loads(json_str)
                    logger.info(f"LLM extracted: query={extracted.get('query')}, price_min={extracted.get('price_min')}, price_max={extracted.get('price_max')}")
                    
                    # Validate and normalize
                    result_dict = {
                        "query": extracted.get("query") or user_message,
                        "price_min": float(extracted.get("price_min")) if extracted.get("price_min") else None,
                        "price_max": float(extracted.get("price_max")) if extracted.get("price_max") else None,
                        "category_hint": extracted.get("category_hint"),
                        "attributes": extracted.get("attributes", {}) or {}
                    }
                    
                    # ✅ If LLM didn't extract price but user message has price, use fallback
                    if result_dict["price_min"] is None and result_dict["price_max"] is None:
                        from core.utils import extract_price_filter
                        min_price, max_price = extract_price_filter(user_message)
                        if min_price or max_price:
                            logger.info(f"LLM didn't extract price, using fallback: min_price={min_price}, max_price={max_price}")
                            result_dict["price_min"] = min_price
                            result_dict["price_max"] = max_price
                    
                    return result_dict
                except json.JSONDecodeError:
                    logger.warning(f"Failed to parse JSON from LLM extraction: {json_str}")
            
            # Fallback: use simple extraction
            from core.utils import extract_price_filter, extract_search_query
            min_price, max_price = extract_price_filter(user_message)
            query = extract_search_query(user_message)
            
            logger.info(f"LLM extraction fallback: query='{query}', min_price={min_price}, max_price={max_price}")
            
            return {
                "query": query,
                "price_min": min_price,
                "price_max": max_price,
                "category_hint": None,
                "attributes": {}
            }
            
        except Exception as e:
            logger.error(f"Error in LLM extraction: {e}")
            # Fallback to simple extraction
            from core.utils import extract_price_filter, extract_search_query
            min_price, max_price = extract_price_filter(user_message)
            query = extract_search_query(user_message)
            
            logger.info(f"LLM extraction error fallback: query='{query}', min_price={min_price}, max_price={max_price}")
            
            return {
                "query": query,
                "price_min": min_price,
                "price_max": max_price,
                "category_hint": None,
                "attributes": {}
            }
    
    async def _classify_intent(self, user_message: str) -> str:
        """Classify user intent for product consultation"""
        message = user_message.lower()
        
        # ✅ Intent: out_of_scope - Không liên quan đến nội thất văn phòng
        # Từ khóa về các lĩnh vực KHÔNG liên quan
        out_of_scope_keywords = [
            # Thời trang, mỹ phẩm
            "quần áo", "áo", "quần", "giày", "dép", "túi xách", "mỹ phẩm", "son", "kem",
            # Điện thoại, điện tử
            "điện thoại", "iphone", "samsung", "laptop", "máy tính", "tivi", "loa", "tai nghe",
            # Thực phẩm
            "đồ ăn", "thức ăn", "món ăn", "nhà hàng", "cà phê", "trà", "bánh",
            # Du lịch
            "khách sạn", "vé máy bay", "tour", "du lịch", "resort",
            # Xe cộ
            "xe máy", "ô tô", "xe hơi", "xe đạp",
            # Bất động sản
            "nhà đất", "căn hộ", "chung cư", "mua nhà",
            # Giáo dục, học tập (không phải nội thất)
            "khóa học", "học online", "giáo viên", "gia sư",
            # Sức khỏe
            "bác sĩ", "bệnh viện", "thuốc", "y tế"
        ]
        
        # Kiểm tra nếu message chứa từ khóa out_of_scope NHƯNG không có từ khóa liên quan đến nội thất
        has_out_of_scope = any(keyword in message for keyword in out_of_scope_keywords)
        has_office_furniture_keywords = any(keyword in message for keyword in [
            "bàn", "ghế", "nội thất", "furniture", "desk", "chair",
            "làm việc", "work", "học tập", "study", "văn phòng", "office",
            "tủ", "kệ", "bàn làm việc", "ghế xoay", "ghế văn phòng"
        ])
        
        # Nếu có out_of_scope keywords VÀ không có office furniture keywords → out_of_scope
        if has_out_of_scope and not has_office_furniture_keywords:
            return "out_of_scope"
        
        # ✅ Intent: product_detail - xem chi tiết sản phẩm cụ thể
        detail_keywords = ["chi tiết", "xem chi tiết", "muốn xem", "thông tin về", "về sản phẩm", "sản phẩm", "có"]
        if any(keyword in message for keyword in detail_keywords):
            # Nếu message ngắn và có vẻ như là tên sản phẩm hoặc "có"
            if len(message.split()) <= 5 or message.strip() in ["có", "co"]:
                return "product_detail"
        
        # ✅ Intent: price_inquiry - hỏi giá
        if any(keyword in message for keyword in ["giá", "price", "cost", "giá cả", "giá tốt", "giá rẻ"]):
            return "price_inquiry"
        
        # ✅ Intent: product_comparison - so sánh
        if any(keyword in message for keyword in ["so sánh", "compare", "khác biệt", "khác nhau"]):
            return "product_comparison"
        
        # ✅ Intent: product_search - tìm kiếm/tư vấn sản phẩm
        product_search_keywords = [
            "tìm", "search", "mua", "buy", "sản phẩm", "product",
            "tư vấn", "advise", "recommend", "gợi ý", "suggest",
            "nên", "should", "dùng", "use", "cho", "for",
            "bàn", "ghế", "nội thất", "furniture", "desk", "chair",
            "làm việc", "work", "học tập", "study", "văn phòng", "office",
            "tủ", "kệ", "bàn làm việc", "ghế xoay", "ghế văn phòng"
        ]
        
        if any(keyword in message for keyword in product_search_keywords):
            return "product_search"
        
        # ✅ Nếu không có từ khóa nào → có thể là greeting hoặc general inquiry
        # Kiểm tra greeting
        greeting_keywords = ["xin chào", "chào", "hello", "hi", "hey"]
        if any(keyword in message for keyword in greeting_keywords) and len(message.split()) <= 3:
            return "greeting"
        
        # ✅ Default: product_search (giả định user muốn tìm sản phẩm)
        return "product_search"
    
    async def _call_tools(self, intent: str, user_message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Call tools for user chatbot"""
        # ✅ Import extract_search_query helper
        from core.utils import extract_search_query
        
        # ✅ Intent: out_of_scope - Không liên quan đến nội thất văn phòng
        if intent == "out_of_scope":
            return {
                "success": True,
                "out_of_scope": True,
                "message": "out_of_scope",
                "products": []
            }
        
        # ✅ Intent: greeting - Chào hỏi
        if intent == "greeting":
            return {
                "success": True,
                "greeting": True,
                "message": "greeting",
                "products": []
            }
        
        if intent == "product_detail":
            # ✅ Extract product name from message for detail view
            # Remove common words: "xem chi tiết", "muốn xem", "thông tin về"
            product_name = user_message
            for word in ["xem chi tiết", "chi tiết", "muốn xem", "thông tin về", "về", "sản phẩm"]:
                product_name = product_name.replace(word, "").strip()
            
            # If just "có" or empty, check context for previous products
            if not product_name or product_name.lower() in ["có", "co"]:
                # Try to get from context if available
                product_name = context.get("last_product_name", "")
                if not product_name:
                    return {"success": False, "error": "Vui lòng cho tôi biết tên sản phẩm bạn muốn xem chi tiết."}
            
            # Search with product name
            query = extract_search_query(product_name) if product_name else product_name
            result = await self.tool_client.call_tool("search_products", query=query, limit=5)
            
            # If found, return first product as detail
            if result.get("success") and result.get("products"):
                products = result["products"]
                if products:
                    return {
                        "success": True,
                        "products": [products[0]],  # Return only first match
                        "detail_mode": True
                    }
            
            # ✅ Nếu không tìm thấy, đánh dấu no_results
            if result.get("success") and (not result.get("products") or len(result.get("products", [])) == 0):
                result["no_results"] = True
                result["query"] = query
            
            return result
        
        elif intent == "product_search":
            # ✅ NEW: Use LLM to extract search parameters instead of hard-coded logic
            extracted_params = await self._extract_search_params(user_message)
            
            query = extracted_params.get("query", user_message)
            min_price = extracted_params.get("price_min")
            max_price = extracted_params.get("price_max")
            category = extracted_params.get("category_hint")
            attributes = extracted_params.get("attributes", {})
            
            # ✅ Ensure query doesn't contain price phrases (clean it)
            # Price filter should be in min_price/max_price, not in query string
            from core.utils import extract_search_query
            query = extract_search_query(query)  # Clean query to remove price phrases
            
            # --- LOGIC MỚI: MAPPING TỪ KHÓA NGỮ NGHĨA ---
            query_lower = query.lower()
            original_query = query  # Store original for context
            
            # 1. Xử lý nhu cầu "Học tập" -> Map to "bàn" (broaden search)
            # DB không có category "Bàn học", nhưng "Bàn Chữ U", "Bàn Chữ L", "Bàn Nâng Hạ" đều phù hợp
            study_keywords = ["học", "học tập", "sinh viên", "học sinh", "study", "homework", "dành cho việc học", "cho việc học"]
            if any(kw in query_lower for kw in study_keywords):
                if "bàn" in query_lower:
                    # Đổi query tìm kiếm thành từ khóa rộng hơn có trong DB
                    # Giữ lại material/color nếu có
                    material_part = ""
                    color_part = ""
                    if attributes.get("material"):
                        material_part = attributes["material"]
                    if attributes.get("color"):
                        color_part = attributes["color"]
                    
                    # Build broad query: "bàn" + material/color if available
                    query_parts = ["bàn"]
                    if material_part:
                        query_parts.append(material_part)
                    if color_part:
                        query_parts.append(color_part)
                    query = " ".join(query_parts).strip()
                    
                    # Mark that this is a study query for LLM to filter "Bàn họp" later
                    attributes["purpose"] = "học tập"
                    logger.info(f"Detected study intent -> Broadening query from '{original_query}' to '{query}'")
            
            # 2. Xử lý nhu cầu "Gaming"
            if "game" in query_lower or "gaming" in query_lower:
                if "bàn" in query_lower:
                    query = "bàn"  # Bàn chữ U, L, Nâng hạ đều chơi game được
                    attributes["purpose"] = "gaming"
                elif "ghế" in query_lower:
                    query = "ghế xoay"  # Ghế xoay có thể dùng làm ghế gaming
                    attributes["purpose"] = "gaming"
            
            # 3. Xử lý nhu cầu "Làm việc" (General work)
            if "làm việc" in query_lower or "work" in query_lower or "văn phòng" in query_lower:
                if "bàn" in query_lower:
                    # Tương tự, nếu tìm "bàn làm việc" mà query sql tìm chính xác cụm này có thể fail
                    # nếu tên sp chỉ là "Bàn Eos..."
                    query = "bàn"
                    attributes["purpose"] = "làm việc"
            
            # Build search query with attributes if available
            # If user asks for "bàn 1m2", combine query with size attribute
            if attributes.get("size"):
                # Add size to query for better semantic search
                size = attributes["size"]
                if size not in query.lower():
                    query = f"{query} {size}".strip()
            
            if attributes.get("color"):
                color = attributes["color"]
                if color not in query.lower():
                    query = f"{query} {color}".strip()
            
            if attributes.get("material"):
                material = attributes["material"]
                if material not in query.lower():
                    query = f"{query} {material}".strip()
            
            # Call search with all extracted parameters
            logger.info(f"Searching products with: query='{query}', min_price={min_price}, max_price={max_price}, category={category}, attributes={attributes}")
            result = await self.tool_client.call_tool(
                "search_products", 
                query=query, 
                limit=10,
                min_price=min_price,
                max_price=max_price,
                category=category,
                attributes=attributes if any(attributes.values()) else None
            )
            logger.info(f"Search result: found {len(result.get('products', []))} products")
            
            # ✅ Kiểm tra nếu không tìm thấy sản phẩm
            if result.get("success") and (not result.get("products") or len(result.get("products", [])) == 0):
                # Try broader search without attributes if no results
                if attributes and any(attributes.values()):
                    logger.info(f"No results with attributes, trying broader search")
                    result = await self.tool_client.call_tool(
                        "search_products", 
                        query=extracted_params.get("query", user_message), 
                        limit=10,
                        min_price=min_price,
                        max_price=max_price,
                        category=category
                    )
                
                    if not result.get("products") or len(result.get("products", [])) == 0:
                        result["no_results"] = True
                        result["query"] = query
            
            return result
        
        elif intent == "price_inquiry":
            # Extract product name and search
            query = extract_search_query(user_message)
            result = await self.tool_client.call_tool("search_products", query=query, limit=5)
            
            # ✅ Kiểm tra nếu không tìm thấy sản phẩm
            if result.get("success") and (not result.get("products") or len(result.get("products", [])) == 0):
                result["no_results"] = True
                result["query"] = query
            
            return result
        
        elif intent == "product_comparison":
            # For comparison, also search products
            query = extract_search_query(user_message)
            result = await self.tool_client.call_tool("search_products", query=query, limit=5)
            
            # ✅ Kiểm tra nếu không tìm thấy sản phẩm
            if result.get("success") and (not result.get("products") or len(result.get("products", [])) == 0):
                result["no_results"] = True
                result["query"] = query
            
            return result
        
        else:
            # ✅ Mặc định cũng search products để có thông tin trả lời
            query = extract_search_query(user_message)
            result = await self.tool_client.call_tool("search_products", query=query, limit=5)
            
            # ✅ Kiểm tra nếu không tìm thấy sản phẩm
            if result.get("success") and (not result.get("products") or len(result.get("products", [])) == 0):
                result["no_results"] = True
                result["query"] = query
            
            return result


class AdminChatbotAgent(BaseAgent):
    """Admin Chatbot Agent for business intelligence"""
    
    def __init__(self):
        super().__init__("admin_chatbot", ADMIN_CHATBOT_SYSTEM_PROMPT)
    
    async def _classify_intent(self, user_message: str) -> str:
        """Classify admin intent"""
        message = user_message.lower()
        
        # Business analytics intents
        if any(keyword in message for keyword in ["doanh thu", "revenue", "tài chính", "financial"]):
            return "revenue_analysis"
        elif any(keyword in message for keyword in ["sentiment", "cảm xúc", "feedback", "đánh giá"]):
            return "sentiment_analysis"
        elif any(keyword in message for keyword in ["báo cáo", "report", "thống kê"]):
            return "report_generation"
        elif any(keyword in message for keyword in ["hiệu suất", "performance", "kpi"]):
            return "performance_analysis"
        # Business law intents
        elif any(keyword in message for keyword in ["luật", "law", "pháp luật", "quy định", "regulation", "đăng ký kinh doanh", "business registration", "giấy phép", "license"]):
            return "business_law"
        # Tax intents
        elif any(keyword in message for keyword in ["thuế", "tax", "vat", "gtgt", "thuế thu nhập", "income tax", "kê khai thuế", "tax filing", "ưu đãi thuế", "tax incentive"]):
            return "tax_consultation"
        else:
            return "general_admin"
    
    async def _call_tools(self, intent: str, user_message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Call tools for admin chatbot"""
        if intent == "revenue_analysis":
            # Extract time period
            month = context.get("month")
            year = context.get("year")
            return await self.tool_client.call_tool("get_revenue_analytics", month=month, year=year)
        elif intent == "sentiment_analysis":
            return await self.tool_client.call_tool("summarize_sentiment_by_product")
        elif intent == "report_generation":
            month = context.get("month")
            year = context.get("year")
            return await self.tool_client.call_tool("generate_report", month=month, year=year)
        elif intent == "performance_analysis":
            return await self.tool_client.call_tool("get_sales_performance", days=30)
        elif intent == "business_law":
            # Business law questions - no tool needed, LLM will handle based on knowledge
            return {
                "success": True,
                "message": "Tôi sẽ tư vấn về pháp luật kinh doanh Việt Nam cho bạn.",
                "intent": "business_law",
                "requires_llm": True
            }
        elif intent == "tax_consultation":
            # Tax consultation - no tool needed, LLM will handle based on knowledge
            return {
                "success": True,
                "message": "Tôi sẽ tư vấn về thuế Việt Nam cho bạn.",
                "intent": "tax_consultation",
                "requires_llm": True
            }
        else:
            return {"success": True, "message": "Bạn cần thông tin kinh doanh gì?"}


class SentimentAnalyzerAgent(BaseAgent):
    """Sentiment Analyzer Agent for customer feedback analysis"""
    
    def __init__(self):
        super().__init__("sentiment_analyzer", SENTIMENT_ANALYZER_SYSTEM_PROMPT)
    
    async def _classify_intent(self, user_message: str) -> str:
        """Classify sentiment analysis intent"""
        message = user_message.lower()
        
        if any(keyword in message for keyword in ["phân tích", "analyze", "sentiment", "cảm xúc"]):
            return "sentiment_analysis"
        elif any(keyword in message for keyword in ["tổng hợp", "summary", "tổng kết"]):
            return "sentiment_summary"
        else:
            return "general_sentiment"
    
    async def _call_tools(self, intent: str, user_message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Call tools for sentiment analysis"""
        if intent == "sentiment_analysis":
            texts = context.get("texts", [])
            product_id = context.get("product_id")
            return await self.tool_client.call_tool("analyze_sentiment", texts=texts, product_id=product_id)
        elif intent == "sentiment_summary":
            product_id = context.get("product_id")
            return await self.tool_client.call_tool("summarize_sentiment_by_product", product_id=product_id)
        else:
            return {"success": True, "message": "Bạn cần phân tích cảm xúc gì?"}


class BusinessAnalystAgent(BaseAgent):
    """Business Analyst Agent for revenue and KPI analysis"""
    
    def __init__(self):
        super().__init__("business_analyst", BUSINESS_ANALYST_SYSTEM_PROMPT)
    
    async def _classify_intent(self, user_message: str) -> str:
        """Classify business analysis intent"""
        message = user_message.lower()
        
        if any(keyword in message for keyword in ["doanh thu", "revenue", "tài chính"]):
            return "revenue_analysis"
        elif any(keyword in message for keyword in ["hiệu suất", "performance", "bán hàng"]):
            return "sales_performance"
        elif any(keyword in message for keyword in ["sản phẩm", "product", "metrics"]):
            return "product_metrics"
        else:
            return "general_analysis"
    
    async def _call_tools(self, intent: str, user_message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Call tools for business analysis"""
        if intent == "revenue_analysis":
            month = context.get("month")
            year = context.get("year")
            return await self.tool_client.call_tool("get_revenue_analytics", month=month, year=year)
        elif intent == "sales_performance":
            days = context.get("days", 30)
            return await self.tool_client.call_tool("get_sales_performance", days=days)
        elif intent == "product_metrics":
            limit = context.get("limit", 20)
            return await self.tool_client.call_tool("get_product_metrics", limit=limit)
        else:
            return {"success": True, "message": "Bạn cần phân tích kinh doanh gì?"}


class ReportGeneratorAgent(BaseAgent):
    """Agent for generating comprehensive HTML visual reports"""
    
    def __init__(self):
        super().__init__(
            agent_type="report_generator",
            system_prompt=REPORT_GENERATOR_SYSTEM_PROMPT
        )
    
    async def _classify_intent(self, user_message: str) -> str:
        """Classify report generation intent"""
        message = user_message.lower()
        
        if any(word in message for word in ["sentiment", "cảm xúc", "đánh giá"]):
            return "generate_sentiment_report"
        elif any(word in message for word in ["revenue", "doanh thu", "tài chính"]):
            return "generate_revenue_report"
        elif any(word in message for word in ["product", "sản phẩm", "hiệu suất"]):
            return "generate_product_report"
        elif any(word in message for word in ["customer", "khách hàng"]):
            return "generate_customer_report"
        else:
            return "generate_business_report"
    
    async def _call_tools(self, intent: str, user_message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Call report generation tool"""
        try:
            # Determine report type
            if "sentiment" in intent:
                report_type = "sentiment"
            elif "revenue" in intent:
                report_type = "revenue"
            elif "product" in intent:
                report_type = "product"
            elif "customer" in intent:
                report_type = "customer"
            else:
                report_type = "business"
            
            # Get data from context or fetch it
            data = context.get("data", {})
            if not data:
                # If no data provided, fetch it based on report type
                data = await self._fetch_report_data(report_type, context)
            
            # Generate HTML report
            import json
            result = await self.tool_client.call_tool(
                "generate_html_report",
                report_type=report_type,
                data=json.dumps(data, ensure_ascii=False),
                title=context.get("title"),
                period=context.get("period")
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error calling report generation tool: {e}")
            return {
                "success": False,
                "error": str(e),
                "html": f"<html><body><h1>Lỗi: {str(e)}</h1></body></html>",
                "summary": f"Lỗi tạo báo cáo: {str(e)}",
                "insights": [],
                "recommendations": []
            }
    
    async def _fetch_report_data(self, report_type: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Fetch data for report if not provided"""
        try:
            if report_type == "sentiment":
                # Fetch sentiment data
                result = await self.tool_client.call_tool("summarize_sentiment_by_product")
                return result
            elif report_type == "revenue":
                # Fetch revenue data
                result = await self.tool_client.call_tool("get_revenue_analytics")
                return result
            elif report_type == "product":
                # Fetch product metrics
                result = await self.tool_client.call_tool("get_product_metrics")
                return result
            else:
                # Default data
                return {"message": "Dữ liệu không khả dụng"}
        except Exception as e:
            logger.error(f"Error fetching report data: {e}")
            return {"error": str(e)}


class ContentModerationAgent(BaseAgent):
    """Agent for content moderation"""
    
    def __init__(self):
        super().__init__(
            agent_type="content_moderation",
            system_prompt=CONTENT_MODERATION_SYSTEM_PROMPT
        )
    
    async def _classify_intent(self, user_message: str) -> str:
        """Always moderate intent"""
        return "moderate_content"
    
    async def _call_tools(self, intent: str, user_message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Call moderation tool"""
        try:
            # Get content from context or use message as content
            content = context.get("content", user_message)
            content_type = context.get("content_type", "comment")
            product_id = context.get("product_id")
            user_id = context.get("user_id")
            
            # Call moderate_content tool
            result = await self.tool_client.call_tool(
                "moderate_content",
                content=content,
                content_type=content_type,
                product_id=product_id,
                user_id=user_id
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error calling moderation tool: {e}")
            return {
                "success": False,
                "error": str(e),
                "is_appropriate": True,  # Default to allow on error
                "violations": [],
                "severity": "low",
                "confidence": 0.0,
                "suggested_action": "review",
                "explanation": f"Lỗi kiểm duyệt: {str(e)}"
            }


class OrchestratorAgent:
    """Orchestrator Agent to coordinate all sub-agents"""
    
    def __init__(self):
        self.llm_client = LLMClientFactory.create_client()
        self.agents = {
            "user_chatbot": UserChatbotAgent(),
            "admin_chatbot": AdminChatbotAgent(),
            "sentiment_analyzer": SentimentAnalyzerAgent(),
            "business_analyst": BusinessAnalystAgent(),
            "report_generator": ReportGeneratorAgent(),
            "content_moderation": ContentModerationAgent()
        }
    
    async def process_request(self, user_message: str, user_type: str = "user", context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Process request and route to appropriate agent"""
        try:
            # Determine which agent to use based on user type and message
            if user_type == "user":
                agent = self.agents["user_chatbot"]
            elif user_type == "admin":
                # Use LLM to determine best admin agent
                agent = await self._select_admin_agent(user_message)
            else:
                agent = self.agents["user_chatbot"]  # Default to user chatbot
            
            # Process with selected agent
            result = await agent.process_request(user_message, context or {})
            
            return {
                "success": True,
                "orchestrator": "ecommerce_ai",
                "selected_agent": agent.agent_type,
                "result": result,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in orchestrator: {e}")
            return {
                "success": False,
                "error": str(e),
                "response": ERROR_HANDLING_PROMPT.format(
                    error_message=str(e),
                    user_query=user_message
                )
            }
    
    async def _select_admin_agent(self, user_message: str) -> BaseAgent:
        """Select the best admin agent based on message content"""
        message = user_message.lower()
        
        if any(keyword in message for keyword in ["báo cáo", "report", "xuất báo cáo", "tạo báo cáo"]):
            return self.agents["report_generator"]
        elif any(keyword in message for keyword in ["sentiment", "cảm xúc", "feedback", "đánh giá"]):
            return self.agents["sentiment_analyzer"]
        elif any(keyword in message for keyword in ["doanh thu", "revenue", "kpi", "hiệu suất", "performance"]):
            return self.agents["business_analyst"]
        else:
            return self.agents["admin_chatbot"]


# Global orchestrator instance
orchestrator = OrchestratorAgent()