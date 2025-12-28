#!/usr/bin/env python3
"""
Improved User Chatbot Service with:
1. Better search logic (intent detection)
2. Conversation memory (chat liên tục)
3. Context-aware responses
"""

import asyncio
import json
import logging
import re
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime

from shared.llm_client import LLMClientFactory
from core.conversation import conversation_history
from core.db import get_conn, release_conn

logger = logging.getLogger(__name__)


class ImprovedUserChatbotService:
    """
    Improved User Chatbot với:
    - Intent Detection (phân loại ý định user)
    - Conversation Memory (nhớ ngữ cảnh)
    - Smart Search Logic (tìm kiếm thông minh)
    """
    
    def __init__(self):
        self.llm_client = LLMClientFactory.create_client()
        self.conversation_history = conversation_history
    
    async def process_message(
        self, 
        user_message: str, 
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Xử lý tin nhắn user với conversation memory
        
        Flow:
        1. Get conversation history
        2. Detect intent (greeting, product_search, price_inquiry, comparison, follow_up)
        3. Execute appropriate handler
        4. Save to conversation history
        5. Return response
        """
        try:
            # 1. Get session_id and conversation history
            session_id = context.get("session_id", "default") if context else "default"
            user_id = context.get("user_id") if context else None
            
            # Get conversation history (last 5 messages)
            conv_history = self.conversation_history.get_history(session_id, limit=5)
            conv_context = self.conversation_history.get_context(session_id)
            
            logger.info(f"[Session {session_id[:8]}] User: {user_message[:100]}")
            logger.info(f"[Session {session_id[:8]}] History: {len(conv_history)} messages")
            
            # 2. Detect intent with conversation context
            intent, intent_data = await self._detect_intent(
                user_message, 
                conv_history, 
                conv_context
            )
            
            logger.info(f"[Session {session_id[:8]}] Intent: {intent}")
            
            # 3. Execute handler based on intent
            if intent == "greeting":
                response = await self._handle_greeting(user_message, conv_context, user_id)
            elif intent == "follow_up":
                response = await self._handle_follow_up(
                    user_message, 
                    conv_history, 
                    conv_context, 
                    intent_data
                )
            elif intent == "price_inquiry":
                response = await self._handle_price_inquiry(user_message, intent_data)
            elif intent == "comparison":
                response = await self._handle_comparison(user_message, intent_data)
            elif intent == "product_detail":
                response = await self._handle_product_detail(user_message, intent_data)
            elif intent == "product_search":
                response = await self._handle_product_search(user_message, intent_data)
            else:
                # Fallback to general search
                response = await self._handle_product_search(user_message, intent_data)
            
            # 4. Save to conversation history
            self.conversation_history.add_message(
                session_id=session_id,
                role="user",
                content=user_message,
                metadata={"intent": intent, "intent_data": intent_data}
            )
            
            # Extract response text for history
            response_text = response.get("response", {}).get("text", "")
            self.conversation_history.add_message(
                session_id=session_id,
                role="assistant",
                content=response_text,
                metadata={"intent": intent}
            )
            
            # Update context with latest products
            if response.get("response", {}).get("data"):
                products = response["response"]["data"]
                self.conversation_history.update_context(session_id, {
                    "last_products": products[:3],
                    "last_product_name": products[0].get("name") if products else None,
                    "last_intent": intent
                })
            
            return response
            
        except Exception as e:
            logger.error(f"Error in ImprovedUserChatbotService: {e}", exc_info=True)
            return {
                "success": False,
                "response": {
                    "text": "Xin lỗi, hệ thống đang gặp sự cố. Vui lòng thử lại sau.",
                    "type": "text"
                },
                "error": str(e),
                "agent_type": "user_chatbot_improved"
            }
    
    async def _detect_intent(
        self, 
        user_message: str, 
        conv_history: List[Dict], 
        conv_context: Dict
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Detect user intent with conversation context
        
        Intents:
        - greeting: Chào hỏi
        - follow_up: Câu hỏi tiếp theo (dựa vào context)
        - price_inquiry: Hỏi giá
        - comparison: So sánh sản phẩm
        - product_detail: Hỏi chi tiết sản phẩm
        - product_search: Tìm kiếm sản phẩm
        """
        msg_lower = user_message.lower().strip()
        intent_data = {}
        
        # 1. Greeting (chào hỏi)
        greetings = ["xin chào", "chào", "hello", "hi", "hey", "alo", "shop ơi", "shop oi"]
        word_count = len(msg_lower.split())
        if word_count <= 4 and any(g in msg_lower for g in greetings):
            return "greeting", {}
        
        # 2. Follow-up (câu hỏi tiếp theo dựa vào context)
        # VD: User hỏi "Bàn F42" -> Bot trả lời -> User hỏi "Giá bao nhiêu?" (không nói rõ sản phẩm)
        follow_up_keywords = [
            "nó", "con này", "cái này", "mẫu này", "sản phẩm này", "sp này",
            "thế", "vậy", "còn", "thì sao", "như thế nào"
        ]
        has_follow_up = any(kw in msg_lower for kw in follow_up_keywords)
        
        # Check if user is asking about previous products without mentioning product name
        last_products = conv_context.get("last_products", [])
        last_product_name = conv_context.get("last_product_name")
        
        if has_follow_up and last_products:
            # User is asking about previous products
            intent_data["last_products"] = last_products
            intent_data["last_product_name"] = last_product_name
            
            # Detect sub-intent (price, detail, comparison)
            if any(kw in msg_lower for kw in ["giá", "bao nhiêu", "giá bán", "giá tiền"]):
                return "follow_up", {"sub_intent": "price", **intent_data}
            elif any(kw in msg_lower for kw in ["chi tiết", "thông tin", "cấu hình", "thông số"]):
                return "follow_up", {"sub_intent": "detail", **intent_data}
            else:
                return "follow_up", {"sub_intent": "general", **intent_data}
        
        # 3. Price Inquiry (hỏi giá)
        price_keywords = ["giá", "bao nhiêu", "giá bán", "giá tiền", "giá cả", "giá thành"]
        if any(kw in msg_lower for kw in price_keywords):
            # Extract product name from query
            product_name = self._extract_product_name(user_message)
            intent_data["product_name"] = product_name
            return "price_inquiry", intent_data
        
        # 4. Comparison (so sánh)
        comparison_keywords = ["so sánh", "khác nhau", "giống nhau", "nên chọn", "tốt hơn", "vs", "với"]
        if any(kw in msg_lower for kw in comparison_keywords):
            # Extract product names to compare
            product_names = self._extract_multiple_product_names(user_message)
            intent_data["product_names"] = product_names
            return "comparison", intent_data
        
        # 5. Product Detail (hỏi chi tiết)
        detail_keywords = ["chi tiết", "thông tin", "cấu hình", "thông số", "specs", "specification"]
        has_detail_keyword = any(kw in msg_lower for kw in detail_keywords)
        
        # Check if user mentions specific product ID/name (F42, G100, etc.)
        has_specific_product = bool(re.search(r'\b[A-Z]\d+\b', user_message))
        
        if has_detail_keyword or has_specific_product:
            product_name = self._extract_product_name(user_message)
            intent_data["product_name"] = product_name
            return "product_detail", intent_data
        
        # 6. Product Search (tìm kiếm sản phẩm)
        # Default intent - extract search parameters
        from core.utils import extract_price_filter, clean_product_query
        
        min_price, max_price = extract_price_filter(user_message)
        cleaned_query = clean_product_query(user_message)
        
        intent_data["query"] = cleaned_query if cleaned_query else user_message
        intent_data["min_price"] = min_price
        intent_data["max_price"] = max_price
        
        return "product_search", intent_data
    
    def _extract_product_name(self, text: str) -> str:
        """Extract product name from text"""
        from core.utils import clean_product_query
        return clean_product_query(text)
    
    def _extract_multiple_product_names(self, text: str) -> List[str]:
        """Extract multiple product names for comparison"""
        # Simple implementation: split by "và", "với", "vs"
        separators = [" và ", " với ", " vs ", ","]
        parts = [text]
        
        for sep in separators:
            new_parts = []
            for part in parts:
                new_parts.extend(part.split(sep))
            parts = new_parts
        
        # Clean each part
        from core.utils import clean_product_query
        product_names = [clean_product_query(p.strip()) for p in parts if p.strip()]
        
        return product_names[:2]  # Max 2 products for comparison
    
    async def _handle_greeting(
        self, 
        user_message: str, 
        conv_context: Dict, 
        user_id: Optional[int]
    ) -> Dict[str, Any]:
        """Handle greeting intent"""
        # Get user name if available
        user_name = ""
        if user_id:
            try:
                conn = await get_conn()
                try:
                    async with conn.cursor() as cur:
                        await cur.execute("""
                            SELECT first_name, last_name 
                            FROM users 
                            WHERE id = %s AND is_active = 1
                        """, (user_id,))
                        user_row = await cur.fetchone()
                        
                        if user_row:
                            first_name = user_row[0] or ""
                            last_name = user_row[1] or ""
                            user_name = f"{first_name} {last_name}".strip()
                finally:
                    await release_conn(conn)
            except Exception as e:
                logger.warning(f"Failed to get user name: {e}")
        
        # Personalized greeting
        if user_name:
            greeting_text = f"Dạ xin chào anh/chị {user_name}! 👋 Em là trợ lý ảo của G-Tech. Em có thể giúp anh/chị tìm bàn, ghế hay tư vấn setup văn phòng không ạ?"
        else:
            greeting_text = "Dạ xin chào ạ! 👋 Em là trợ lý ảo của G-Tech. Em có thể giúp anh/chị tìm bàn, ghế hay tư vấn setup văn phòng không ạ?"
        
        return {
            "success": True,
            "response": {
                "text": greeting_text,
                "type": "text"
            },
            "agent_type": "user_chatbot_improved"
        }
    
    async def _handle_follow_up(
        self, 
        user_message: str, 
        conv_history: List[Dict], 
        conv_context: Dict,
        intent_data: Dict
    ) -> Dict[str, Any]:
        """
        Handle follow-up questions based on conversation context
        VD: User hỏi "Bàn F42" -> Bot trả lời -> User hỏi "Giá bao nhiêu?"
        """
        sub_intent = intent_data.get("sub_intent", "general")
        last_products = intent_data.get("last_products", [])
        last_product_name = intent_data.get("last_product_name")
        
        if not last_products:
            # No previous products, fallback to search
            return await self._handle_product_search(user_message, {})
        
        # Use first product from last conversation
        product = last_products[0]
        
        if sub_intent == "price":
            # User asking about price of previous product
            price = product.get("final_price") or product.get("price")
            sale_price = product.get("sale_price")
            
            if sale_price:
                answer_text = f"Dạ **{product['name']}** hiện đang có giá ưu đãi **{sale_price:,.0f}₫** (giá gốc ~~{product['price']:,.0f}₫~~) ạ. 🎉 Anh/chị muốn xem chi tiết sản phẩm không ạ?"
            else:
                answer_text = f"Dạ **{product['name']}** có giá **{price:,.0f}₫** ạ. Anh/chị muốn xem chi tiết sản phẩm không ạ?"
            
            return {
                "success": True,
                "response": {
                    "text": answer_text,
                    "type": "price_inquiry",
                    "data": [product]
                },
                "agent_type": "user_chatbot_improved"
            }
        
        elif sub_intent == "detail":
            # User asking for details of previous product
            return await self._handle_product_detail(
                last_product_name or product.get("name", ""), 
                {"product_name": last_product_name or product.get("name", "")}
            )
        
        else:
            # General follow-up - provide context-aware response
            prompt = f"""Khách hàng đang hỏi tiếp về sản phẩm **{last_product_name}** mà họ vừa xem.

Câu hỏi: "{user_message}"

Thông tin sản phẩm: {json.dumps(product, ensure_ascii=False)}

Hãy trả lời ngắn gọn, thân thiện, xưng "em" - "anh/chị"."""
            
            ai_response = await self.llm_client.generate_simple(
                prompt=prompt,
                system_instruction="Bạn là nhân viên tư vấn nội thất nhiệt tình.",
                temperature=0.7
            )
            
            answer_text = ai_response.get("content", "Dạ em có thể giúp gì thêm cho anh/chị ạ?")
            
            return {
                "success": True,
                "response": {
                    "text": answer_text,
                    "type": "text",
                    "data": [product]
                },
                "agent_type": "user_chatbot_improved"
            }
    
    async def _handle_price_inquiry(
        self, 
        user_message: str, 
        intent_data: Dict
    ) -> Dict[str, Any]:
        """Handle price inquiry intent"""
        product_name = intent_data.get("product_name", "")
        
        if not product_name:
            return {
                "success": True,
                "response": {
                    "text": "Dạ anh/chị muốn hỏi giá sản phẩm nào ạ? Em có thể tư vấn chi tiết hơn.",
                    "type": "text"
                },
                "agent_type": "user_chatbot_improved"
            }
        
        # Search for product
        from mcps.helpers import get_product_details_helper
        
        product_result_json = await get_product_details_helper(product_name)
        product_result = json.loads(product_result_json) if isinstance(product_result_json, str) else product_result_json
        
        if product_result.get("success") and product_result.get("product"):
            product = product_result["product"]
            price = product.get("final_price") or product.get("price")
            sale_price = product.get("sale_price")
            
            if sale_price:
                answer_text = f"Dạ **{product['name']}** hiện đang có giá ưu đãi **{sale_price:,.0f}₫** (giá gốc ~~{product['price']:,.0f}₫~~) ạ. 🎉\n\nAnh/chị muốn xem chi tiết sản phẩm không ạ?"
            else:
                answer_text = f"Dạ **{product['name']}** có giá **{price:,.0f}₫** ạ.\n\nAnh/chị muốn xem chi tiết sản phẩm không ạ?"
            
            product_card = {
                "id": product.get("id"),
                "name": product.get("name", "Sản phẩm"),
                "category": product.get("category", ""),
                "price": float(product.get("price", 0)),
                "sale_price": float(sale_price) if sale_price else None,
                "final_price": float(price),
                "slug": product.get("slug", ""),
                "image_url": product.get("image_url", ""),
                "link": f"/san-pham/{product.get('id', '')}"
            }
            
            return {
                "success": True,
                "response": {
                    "text": answer_text,
                    "type": "price_inquiry",
                    "data": [product_card]
                },
                "agent_type": "user_chatbot_improved"
            }
        else:
            return {
                "success": True,
                "response": {
                    "text": f"Dạ em không tìm thấy sản phẩm '{product_name}' ạ. Anh/chị có thể mô tả rõ hơn hoặc cho em biết tên chính xác không ạ?",
                    "type": "text"
                },
                "agent_type": "user_chatbot_improved"
            }
    
    async def _handle_comparison(
        self, 
        user_message: str, 
        intent_data: Dict
    ) -> Dict[str, Any]:
        """Handle product comparison intent"""
        product_names = intent_data.get("product_names", [])
        
        if len(product_names) < 2:
            return {
                "success": True,
                "response": {
                    "text": "Dạ anh/chị muốn so sánh 2 sản phẩm nào ạ? Vui lòng cho em biết tên cả 2 sản phẩm.",
                    "type": "text"
                },
                "agent_type": "user_chatbot_improved"
            }
        
        # Get details of both products
        from mcps.helpers import get_product_details_helper
        
        products = []
        for name in product_names[:2]:
            result_json = await get_product_details_helper(name)
            result = json.loads(result_json) if isinstance(result_json, str) else result_json
            
            if result.get("success") and result.get("product"):
                products.append(result["product"])
        
        if len(products) < 2:
            return {
                "success": True,
                "response": {
                    "text": f"Dạ em chỉ tìm thấy {len(products)} sản phẩm. Anh/chị vui lòng cho em biết tên chính xác của 2 sản phẩm cần so sánh ạ.",
                    "type": "text"
                },
                "agent_type": "user_chatbot_improved"
            }
        
        # Generate comparison using AI
        prompt = f"""So sánh 2 sản phẩm sau:

**Sản phẩm 1:** {products[0]['name']}
- Giá: {products[0].get('final_price') or products[0].get('price'):,.0f}₫
- Danh mục: {products[0].get('category', '')}
- Thương hiệu: {products[0].get('brand', '')}

**Sản phẩm 2:** {products[1]['name']}
- Giá: {products[1].get('final_price') or products[1].get('price'):,.0f}₫
- Danh mục: {products[1].get('category', '')}
- Thương hiệu: {products[1].get('brand', '')}

Hãy so sánh ngắn gọn về:
- Giá cả (sản phẩm nào rẻ hơn, chênh lệch bao nhiêu)
- Phù hợp với ai (dựa vào danh mục và giá)
- Gợi ý lựa chọn

Trả lời bằng tiếng Việt, dùng bullet points, thân thiện, xưng "em" - "anh/chị"."""
        
        ai_response = await self.llm_client.generate_simple(
            prompt=prompt,
            system_instruction="Bạn là chuyên gia tư vấn nội thất, giúp khách hàng so sánh và lựa chọn sản phẩm phù hợp.",
            temperature=0.7
        )
        
        answer_text = ai_response.get("content", "Dạ đây là so sánh 2 sản phẩm ạ.")
        
        # Format product cards
        product_cards = []
        for p in products:
            product_cards.append({
                "id": p.get("id"),
                "name": p.get("name", "Sản phẩm"),
                "category": p.get("category", ""),
                "price": float(p.get("price", 0)),
                "sale_price": float(p.get("sale_price")) if p.get("sale_price") else None,
                "final_price": float(p.get("final_price", 0)) if p.get("final_price") else float(p.get("price", 0)),
                "slug": p.get("slug", ""),
                "image_url": p.get("image_url", ""),
                "link": f"/san-pham/{p.get('id', '')}"
            })
        
        return {
            "success": True,
            "response": {
                "text": answer_text,
                "type": "comparison",
                "data": product_cards
            },
            "agent_type": "user_chatbot_improved"
        }
    
    async def _handle_product_detail(
        self, 
        user_message: str, 
        intent_data: Dict
    ) -> Dict[str, Any]:
        """Handle product detail inquiry"""
        product_name = intent_data.get("product_name", "")
        
        if not product_name:
            product_name = user_message
        
        # Get product details
        from mcps.helpers import get_product_details_helper
        
        product_result_json = await get_product_details_helper(product_name)
        product_result = json.loads(product_result_json) if isinstance(product_result_json, str) else product_result_json
        
        if not product_result.get("success") or not product_result.get("product"):
            return {
                "success": True,
                "response": {
                    "text": f"Dạ em không tìm thấy sản phẩm '{product_name}' ạ. Anh/chị có thể mô tả rõ hơn không ạ?",
                    "type": "text"
                },
                "agent_type": "user_chatbot_improved"
            }
        
        product = product_result["product"]
        specs = product.get("specs", {})
        
        # Generate detailed response using AI
        product_info = {
            "name": product.get("name"),
            "price": product.get("price"),
            "sale_price": product.get("sale_price"),
            "final_price": product.get("final_price") or product.get("price"),
            "category": product.get("category", ""),
            "brand": product.get("brand", ""),
            "description": product.get("description", ""),
            "specs": {
                "materials": specs.get("materials", ""),
                "dimensions": specs.get("dimensions", ""),
                "colors": specs.get("colors", ""),
                "weights": specs.get("weights", "")
            }
        }
        
        prompt = f"""Khách hỏi chi tiết về sản phẩm.

Thông tin sản phẩm: {json.dumps(product_info, ensure_ascii=False, indent=2)}

Hãy giới thiệu chi tiết về:
- Tên sản phẩm và thương hiệu
- Thông số kỹ thuật (kích thước, chất liệu, màu sắc) - dùng bullet points
- Ưu điểm và phù hợp với không gian nào
- Giá cả và khuyến mãi (nếu có)
- Chốt đơn một cách tự nhiên

Trả lời bằng tiếng Việt, thân thiện, xưng "em" - "anh/chị", dùng emoji vui vẻ (😊, 🚀).
Sử dụng Markdown để format đẹp (bold cho tên sản phẩm, bullet points cho thông số)."""
        
        ai_response = await self.llm_client.generate_simple(
            prompt=prompt,
            system_instruction="Bạn là nhân viên tư vấn bán hàng nội thất nhiệt tình, chuyên nghiệp.",
            temperature=0.7
        )
        
        answer_text = ai_response.get("content", "Dạ đây là thông tin chi tiết sản phẩm ạ.")
        
        # Format product card
        product_card = {
            "id": product.get("id"),
            "name": product.get("name", "Sản phẩm"),
            "category": product.get("category", ""),
            "price": float(product.get("price", 0)),
            "sale_price": float(product.get("sale_price")) if product.get("sale_price") else None,
            "final_price": float(product.get("final_price", 0)) if product.get("final_price") else float(product.get("price", 0)),
            "slug": product.get("slug", ""),
            "image_url": product.get("image_url", ""),
            "link": f"/san-pham/{product.get('id', '')}"
        }
        
        return {
            "success": True,
            "response": {
                "text": answer_text,
                "type": "product_detail",
                "data": [product_card]
            },
            "agent_type": "user_chatbot_improved"
        }
    
    async def _handle_product_search(
        self, 
        user_message: str, 
        intent_data: Dict
    ) -> Dict[str, Any]:
        """Handle general product search"""
        query = intent_data.get("query", user_message)
        min_price = intent_data.get("min_price")
        max_price = intent_data.get("max_price")
        
        # Search products
        from mcps.helpers import search_products_helper
        
        search_result_json = await search_products_helper(
            query=query,
            limit=5,
            min_price=min_price,
            max_price=max_price
        )
        search_result = json.loads(search_result_json) if isinstance(search_result_json, str) else search_result_json
        
        if not search_result.get("success") or not search_result.get("products"):
            return {
                "success": True,
                "response": {
                    "text": f"Dạ em tìm '{query}' nhưng hiện tại kho đang hết hàng mẫu này ạ. Anh/chị có muốn tham khảo các mẫu bàn/ghế khác không ạ?",
                    "type": "text"
                },
                "agent_type": "user_chatbot_improved"
            }
        
        products_found = search_result["products"]
        
        # Generate response using AI
        products_context = []
        for p in products_found:
            products_context.append({
                "name": p.get("name"),
                "price": p.get("price"),
                "sale_price": p.get("sale_price"),
                "final_price": p.get("final_price") or p.get("price"),
                "category": p.get("category", ""),
                "brand": p.get("brand", "")
            })
        
        prompt = f"""Khách đang tìm sản phẩm.

Dữ liệu tìm được: {json.dumps(products_context, ensure_ascii=False, indent=2)}

Câu hỏi: "{user_message}"

Hãy viết 1 câu tóm tắt ngắn gọn dẫn dắt (VD: "Dạ bên em có mấy mẫu này hợp với anh/chị nè:").
KHÔNG cần liệt kê lại danh sách (Frontend đã hiển thị thẻ sản phẩm).

Trả lời bằng tiếng Việt, thân thiện, xưng "em" - "anh/chị", dùng emoji vui vẻ (😊, 🚀)."""
        
        ai_response = await self.llm_client.generate_simple(
            prompt=prompt,
            system_instruction="Bạn là nhân viên tư vấn bán hàng nội thất nhiệt tình, chuyên nghiệp.",
            temperature=0.7
        )
        
        answer_text = ai_response.get("content", "Dạ đây là các sản phẩm mình tìm thấy ạ.")
        
        # Format product cards
        product_cards = []
        for p in products_found:
            product_cards.append({
                "id": p.get("id"),
                "name": p.get("name", "Sản phẩm"),
                "category": p.get("category", ""),
                "price": float(p.get("price", 0)),
                "sale_price": float(p.get("sale_price")) if p.get("sale_price") else None,
                "final_price": float(p.get("final_price", 0)) if p.get("final_price") else float(p.get("price", 0)),
                "slug": p.get("slug", ""),
                "image_url": p.get("image_url", ""),
                "link": f"/san-pham/{p.get('id', '')}"
            })
        
        return {
            "success": True,
            "response": {
                "text": answer_text,
                "type": "product_recommendation",
                "data": product_cards
            },
            "agent_type": "user_chatbot_improved"
        }


# Initialize improved service instance
improved_user_chatbot_service = ImprovedUserChatbotService()
