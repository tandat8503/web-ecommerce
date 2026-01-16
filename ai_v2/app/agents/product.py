import json
import re
from typing import Dict, Any, List, Optional
from app.agents.base import BaseAgent
from app.core.utils import extract_json_object
from app.mcps.product import (
    search_semantic_impl, 
    get_products_db_impl, 
    get_best_sellers_impl,
    analyze_image_impl
)
from app.core.logger import get_logger

logger = get_logger(__name__)

class ProductAgent(BaseAgent):
    """Agent specialized in Product Consultation with Deterministic Responses."""
    
    def __init__(self):
        super().__init__("ProductAgent")
    
    def _extract_price_filters(self, text: str) -> (Optional[float], Optional[float]):
        text = text.lower().replace(".", "").replace(",", "")
        min_p = None
        max_p = None
        
        match_under = re.search(r"(dưới|nhỏ hơn|tối đa)\s+(\d+)\s*(triệu|tr|m)", text)
        if match_under:
            max_p = float(match_under.group(2)) * 1_000_000
            
        match_over = re.search(r"(trên|lớn hơn|tối thiểu)\s+(\d+)\s*(triệu|tr|m)", text)
        if match_over:
            min_p = float(match_over.group(2)) * 1_000_000
            
        return min_p, max_p
    
    def _extract_colors_from_product(self, product: Dict) -> List[str]:
        """Extract colors from product variants."""
        colors = []
        variants = product.get('variants', [])
        for v in variants:
            color = v.get('color')
            if color and color not in colors:
                colors.append(color)
        return colors
    
    def extract_last_product_id(self, history: str, context: Dict = None, query: str = ""):
        # Try Cache
        if context and "session_data" in context:
            last_prods = context["session_data"].get("last_products", [])
            if last_prods:
                logger.info(f"[ProductAgent] Found Cache IDs: {len(last_prods)}")
                # Positional fallback
                if query and ("đầu" in query or "first" in query or "số 1" in query):
                    return last_prods[0]
                return last_prods[-1]  # Default to last
        
        # Try History
        if not history: return None
        ids = re.findall(r"/san-pham/(\d+)", history)
        return int(ids[-1]) if ids else None

    async def run(self, input_message: str, context: Dict = None) -> Dict[str, Any]:
        history = context.get("history", "") if context else ""
        msg_lower = input_message.lower()
        
        # 0. Check for image-based search
        image_data = context.get("image_data") if context else None
        if image_data:
            logger.info("[ProductAgent] Image-based search detected")
            return await self._handle_image_search(image_data, input_message)
        
        # 1. Deterministic Tool Selection
        tool_name = "search_product_vectors"
        params = {"limit": 15}
        
        if re.search(r"(bán chạy|top|hot|phổ biến)", msg_lower):
             tool_name = "get_best_sellers"
             params = {"limit": 5}
             
        elif re.search(r"(cái này|cái đó|nó|chi tiết|giá|màu|thông số)", msg_lower):
            last_id = self.extract_last_product_id(history, context, msg_lower)
            if last_id:
                tool_name = "get_products_db"
                params = {"product_ids": [last_id]}
                logger.info(f"[ProductAgent] Fast-track follow-up: ID {last_id}")
        
        if tool_name == "search_product_vectors":
             params["query"] = input_message
             min_p, max_p = self._extract_price_filters(input_message)
             if min_p: params["min_price"] = min_p
             if max_p: params["max_price"] = max_p

        logger.info(f"[ProductAgent] Action: {tool_name} | Params: {params}")

        # 2. Execute Tool
        collected_products = []
        try:
            if tool_name == "search_product_vectors":
                result_str = await search_semantic_impl(**params)
                data = extract_json_object(result_str)
                ids = data.get("ids", [])
                if ids:
                     detail_str = await get_products_db_impl(product_ids=ids[:8])
                     detail_data = extract_json_object(detail_str)
                     collected_products = detail_data.get("products", [])
                
            elif tool_name == "get_best_sellers":
                result_str = await get_best_sellers_impl(**params)
                data = extract_json_object(result_str)
                ids = data.get("ids", [])
                if ids:
                     detail_str = await get_products_db_impl(product_ids=ids)
                     detail_data = extract_json_object(detail_str)
                     collected_products = detail_data.get("products", [])
                
            elif tool_name == "get_products_db":
                result_str = await get_products_db_impl(**params)
                data = extract_json_object(result_str)
                collected_products = data.get("products", [])

        except Exception as e:
            logger.error(f"Tool execution failed: {e}")
            
        # Debug logging with product names
        logger.info(f"[ProductAgent] Found {len(collected_products)} products")
        if collected_products:
            product_summary = ", ".join([f"{p.get('id')}:{p.get('name', 'Unknown')[:30]}" for p in collected_products[:5]])
            logger.info(f"[ProductAgent] Products: {product_summary}{'...' if len(collected_products) > 5 else ''}")


        # 3. DETERMINISTIC RESPONSE for single product detail queries
        if tool_name == "get_products_db" and len(collected_products) == 1:
            product = collected_products[0]
            pid = product.get('id')
            pname = product.get('name', 'sản phẩm này')
            link = f"/san-pham/{pid}"
            
            # Color question - DETERMINISTIC (no LLM)
            if "màu" in msg_lower:
                colors = self._extract_colors_from_product(product)
                if colors:
                    response_text = f"Sản phẩm **{pname}** có các màu: **{', '.join(colors)}**.\n\nXem chi tiết tại: {link}"
                else:
                    response_text = f"Hiện tại hệ thống chưa có thông tin màu cụ thể cho **{pname}**. Bạn có thể xem hình ảnh và chi tiết tại: {link}"
                
                return {
                    "status": "success",
                    "tool_used": tool_name,
                    "data": {"products": collected_products},
                    "agent_response": response_text
                }
            
            # Price question - DETERMINISTIC
            if any(kw in msg_lower for kw in ["giá", "bao nhiêu"]):
                price = product.get('final_price') or product.get('price', 0)
                if price:
                    price_fmt = f"{int(price):,}".replace(",", ".")
                    response_text = f"Sản phẩm **{pname}** có giá: **{price_fmt} VNĐ**.\n\nXem chi tiết tại: {link}"
                else:
                    response_text = f"Vui lòng liên hệ để biết giá **{pname}**.\n\nXem chi tiết tại: {link}"
                
                return {
                    "status": "success",
                    "tool_used": tool_name,
                    "data": {"products": collected_products},
                    "agent_response": response_text
                }
        
        # 4. LLM Synthesis (reduced prompt size to avoid MAX_TOKENS)
        response_text = await self._synthesize(input_message, collected_products, is_detail=(tool_name == "get_products_db"))
        
        # 5. Force link for single product
        if tool_name == "get_products_db" and len(collected_products) == 1:
            p_id = collected_products[0].get("id")
            link = f"/san-pham/{p_id}"
            if link not in response_text:
                response_text += f"\n\nXem chi tiết tại: {link}"
        
        return {
            "status": "success",
            "tool_used": tool_name,
            "data": {"products": collected_products},
            "agent_response": response_text
        }
        
    async def _handle_image_search(self, image_data: str, user_message: str) -> Dict[str, Any]:
        """Handle image-based product search using Vision API."""
        try:
            # 1. Analyze image with Gemini Vision
            vision_result_str = await analyze_image_impl(image_data)
            vision_data = json.loads(vision_result_str)
            
            category = vision_data.get("category", "")
            colors = vision_data.get("colors", [])
            materials = vision_data.get("materials", [])
            style_tags = vision_data.get("style_tags", [])
            keywords = vision_data.get("keywords", [])
            confidence = vision_data.get("confidence", 0.0)
            search_query = vision_data.get("search_query", "")
            
            logger.info(f"[Vision] Category: {category}, Confidence: {confidence}")
            logger.info(f"[Vision] Keywords: {keywords}")
            
            # 2. Check if not furniture
            if "không phải nội thất" in category.lower() or confidence < 0.3:
                return {
                    "status": "success",
                    "tool_used": "analyze_image",
                    "data": {"products": []},
                    "agent_response": "Xin lỗi, tôi không nhận diện được sản phẩm nội thất văn phòng rõ ràng trong ảnh này. Bạn có thể mô tả hoặc gửi ảnh rõ hơn không?"
                }
            
            # 3. Build enhanced search query
            if not search_query and keywords:
                search_query = " ".join(keywords[:5])
            
            if user_message and len(user_message.strip()) > 5:
                search_query = f"{search_query} {user_message}"
            
            logger.info(f"[Vision] Search query: {search_query}")
            
            # 4. Semantic search with query
            result_str = await search_semantic_impl(query=search_query, limit=15)
            data = extract_json_object(result_str)
            ids = data.get("ids", [])
            
            if not ids:
                return {
                    "status": "success",
                    "tool_used": "analyze_image",
                    "data": {"products": []},
                    "agent_response": f"Tôi hiểu bạn đang tìm **{category}** với màu {', '.join(colors) if colors else 'không xác định'}, nhưng không tìm thấy sản phẩm phù hợp. Bạn có thể thử tìm kiếm bằng từ khóa hoặc mô tả chi tiết hơn?"
                }
            
            # 5. Get full product details
            detail_str = await get_products_db_impl(product_ids=ids[:8])
            detail_data = extract_json_object(detail_str)
            products = detail_data.get("products", [])
            
            # 6. Filter by colors/materials if specified (optional enhancement)
            # For now, trust semantic search ranking
            
            logger.info(f"[Vision] Found {len(products)} products matching image")
            
            # 7. Build DETERMINISTIC response (NO LLM to avoid MAX_TOKENS)
            response_lines = []
            
            # Intro
            if confidence >= 0.8:
                response_lines.append(f"Tuyệt vời! Tìm thấy **{len(products)} sản phẩm {category}** tương tự:")
            else:
                response_lines.append(f"Dựa trên ảnh, đây là {len(products)} sản phẩm **{category}** phù hợp:")
            
            response_lines.append("")  # Empty line
            
            # List top 3 products
            for i, p in enumerate(products[:3], 1):
                name = p.get('name', 'Sản phẩm')
                price = p.get('final_price', p.get('price', 0))
                pid = p.get('id')
                response_lines.append(f"{i}. **{name}** - {price:,.0f}đ")
                response_lines.append(f"   👉 [Xem chi tiết](/san-pham/{pid})")
                response_lines.append("")
            
            if len(products) > 3:
                response_lines.append(f"_Còn {len(products) - 3} sản phẩm khác nữa._")
                response_lines.append("")
            
            response_lines.append("Bạn muốn xem thêm thông tin sản phẩm nào?")
            
            response_text = "\n".join(response_lines)
            
            return {
                "status": "success",
                "tool_used": "analyze_image",
                "data": {
                    "products": products,
                    "vision_attributes": vision_data
                },
                "agent_response": response_text
            }
            
        except Exception as e:
            logger.error(f"Image search failed: {e}")
            return {
                "status": "error",
                "tool_used": "analyze_image",
                "data": {"products": []},
                "agent_response": f"Xin lỗi, có lỗi khi phân tích ảnh: {str(e)}. Bạn có thể thử lại hoặc mô tả sản phẩm bằng text?"
            }
    
    async def _synthesize_vision_result(self, intro: str, products: List[Dict], vision_data: Dict) -> str:
        """Synthesize response for vision-based search with MINIMAL prompt."""
        # Ultra compact - chỉ ID và tên
        product_list = []
        for p in products[:3]:  # Chỉ 3 sản phẩm để tránh MAX_TOKENS
            product_list.append(f"{p.get('name')} - /san-pham/{p.get('id')}")
        products_text = "\n".join(product_list)
        
        prompt = f"""{intro}

{products_text}

Giới thiệu ngắn gọn 3 sản phẩm (tên + link). Hỏi: "Bạn muốn xem thêm không?\"
"""
        
        return await self.generate(prompt)
        
    async def _synthesize(self, query: str, products: List[Dict], is_detail: bool = False) -> str:
        """Synthesize with MINIMAL prompt to avoid MAX_TOKENS."""
        if is_detail:
            # Detail - chỉ tên
            p = products[0]
            product_info = f"{p.get('name')} - {p.get('final_price', 0):,.0f}đ"
            
            prompt = f"""Sản phẩm: {product_info}

Khách: "{query}"

Giới thiệu ngắn. Bao gồm link /san-pham/{p.get('id')}"""
        else:
            # List - top 3 only
            lines = []
            for p in products[:3]:
                lines.append(f"{p.get('name')} - /san-pham/{p.get('id')}")
            products_text = "\n".join(lines)
            
            prompt = f"""Tìm thấy {len(products)} sản phẩm:

{products_text}

Giới thiệu 3 sản phẩm trên (tên + link). Thân thiện."""
        
        return await self.generate(prompt)
