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
        # Try Cache with ENHANCED MATCHING
        if context and "last_products_data" in context:
            all_prods = context["last_products_data"].get("all_products", [])
            
            if all_prods:
                logger.info(f"[ProductAgent] Found {len(all_prods)} cached products for matching")
                query_lower = query.lower()
                
                # 1. POSITION-BASED MATCHING: "sản phẩm số 2", "cái thứ 3"
                pos_patterns = [
                    r"sản phẩm\s+(?:số\s+)?(\d+)",
                    r"cái\s+(?:thứ\s+)?(\d+)",
                    r"#(\d+)",
                    r"thứ\s+(\d+)"
                ]
                
                for pattern in pos_patterns:
                    match = re.search(pattern, query_lower)
                    if match:
                        idx = int(match.group(1)) - 1
                        if 0 <= idx < len(all_prods):
                            logger.info(f"  Position match: #{idx+1} -> '{all_prods[idx].get('name')}'")
                            return all_prods[idx].get('id')
                
                # 2. NAME-BASED MATCHING: "Thông tin Eos EC06"
                stop_words = {'thông', 'tin', 'cho', 'tôi', 'xem', 'về', 'của', 'sản', 'phẩm', 'có', 'gì'}
                query_words = [w for w in query_lower.split() if len(w) >= 3 and w not in stop_words]
                
                best_match = None
                best_score = 0
                
                for p in all_prods:
                    p_name_lower = (p.get('name') or '').lower()
                    score = sum(len(w) for w in query_words if w in p_name_lower)
                    
                    if score > best_score:
                        best_score = score
                        best_match = p
                
                if best_match and best_score >= 6:
                    logger.info(f"  Name match: query contains '{best_match.get('name')}' (score={best_score})")
                    return best_match.get('id')
                
                # 3. POSITIONAL FALLBACK
                if "đầu" in query_lower or "first" in query_lower:
                    return all_prods[0].get('id')
                
                return all_prods[-1].get('id')
        
        # Fallback: Try History
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
        
        # Check for "show remaining products" intent
        if re.search(r"(còn lại|xem thêm|sản phẩm khác|remaining|show more|tiếp theo)", msg_lower):
            # Get cached products from last search
            last_prods = context.get('last_products_data', {}).get('all_products', []) if context else []
            
            if last_prods and len(last_prods) > 3:
                logger.info(f"[ProductAgent] 'Show remaining' detected - returning {len(last_prods) - 3} cached products")
                
                # Return products 4-8 (remaining from previous search)
                remaining_products = last_prods[3:]
                
                # Build response
                lines = [f"Dạ! Đây là **{len(remaining_products)} sản phẩm còn lại**:", ""]
                
                for i, p in enumerate(remaining_products, 4):  # Start from #4
                    name = p.get('name', 'Sản phẩm')
                    price = p.get('final_price', p.get('price', 0))
                    pid = p.get('id')
                    lines.append(f"{i}. **{name}** - {price:,.0f}đ")
                    lines.append(f"   [Xem chi tiết](/san-pham/{pid})")
                    lines.append("")
                
                lines.append("Bạn có cần thông tin thêm không?")
                response_text = "\n".join(lines)
                
                return {
                    "status": "success",
                    "tool_used": "show_remaining",
                    "data": {"products": remaining_products},
                    "agent_response": response_text
                }
        
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
             # Enhance query with category emphasis
             query = input_message
             
             # Boost category keywords for better matching
             if re.search(r"(ghế|ngồi)", msg_lower) and not re.search(r"(bàn)", msg_lower):
                 query = f"ghế văn phòng {input_message}"
             elif re.search(r"(bàn làm việc|bàn)", msg_lower):
                 query = f"bàn làm việc {input_message}"
             
             params["query"] = query
             min_p, max_p = self._extract_price_filters(input_message)
             if min_p: params["min_price"] = min_p
             if max_p: params["max_price"] = max_p

        logger.info("-"*80)
        logger.info("[PRODUCT AGENT] Tool selection")
        logger.info(f"  Tool: {tool_name}")
        logger.info(f"  Params: {params}")
        logger.info("-"*80)

        # 2. Execute Tool
        collected_products = []
        try:
            logger.info("[MCP TOOL] Executing...")
            
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
            logger.error(f"[MCP TOOL] Execution failed: {e}")
            
        # MCP RESULTS LOGGING
        logger.info("="*80)
        logger.info("[MCP RESULTS] Products retrieved")
        logger.info(f"  Total count: {len(collected_products)}")
        
        if collected_products:
            logger.info("  Product details:")
            for idx, p in enumerate(collected_products, 1):
                logger.info(f"    [{idx}] ID: {p.get('id')} | Name: {p.get('name', 'N/A')}")
                logger.info(f"        Price: {p.get('price', 0):,.0f}đ | Sale: {p.get('sale_price') or 'N/A'}")
                logger.info(f"        Final Price: {p.get('final_price', 0):,.0f}đ")
                logger.info(f"        Category: {p.get('category_name', 'N/A')} | Brand: {p.get('brand_name', 'N/A')}")
                logger.info(f"        Rating: {p.get('avg_rating', 0):.1f} | Sold: {p.get('sold_count', 0)}")
                
                # Variants
                variants = p.get('variants', [])
                if variants:
                    logger.info(f"        Variants ({len(variants)}):")
                    for v in variants[:3]:  # Show max 3 variants
                        logger.info(f"          - Color: {v.get('color', 'N/A')} | Material: {v.get('material', 'N/A')} | Stock: {v.get('stock_quantity', 0)}")
                    if len(variants) > 3:
                        logger.info(f"          ... and {len(variants) - 3} more variants")
                else:
                    logger.info(f"        Variants: None")
                    
                logger.info(f"        Image: {p.get('image_url', 'N/A')[:50]}...")
                logger.info(f"        Slug: {p.get('slug', 'N/A')}")
        else:
            logger.info("  No products found")
        logger.info("="*80)

        # 2.5 VARIANT FILTERING (color/material)
        variant_filtered = False
        if collected_products and tool_name == "search_product_vectors":
            # Detect color keywords
            color_keywords = {
                r"\bđen\b": "đen",
                r"\btrắng\b": "trắng", 
                r"\bxám\b": "xám",
                r"\bnâu\b": "nâu",
                r"\bxanh\b": "xanh",
                r"\bđỏ\b": "đỏ",
                r"\bvàng\b": "vàng",
                r"\bhồng\b": "hồng"
            }
            
            requested_color = None
            for pattern, color_name in color_keywords.items():
                if re.search(pattern, msg_lower):
                    requested_color = color_name
                    break
            
            # Material detection
            material_keywords = {
                r"\bgỗ\b": "gỗ",
                r"\bda\b": "da",
                r"\blưới\b": "lưới",
                r"\bvải\b": "vải",
                r"\bkim loại\b": "kim loại",
                r"\bnhựa\b": "nhựa"
            }
            
            requested_material = None
            for pattern, mat_name in material_keywords.items():
                if re.search(pattern, msg_lower):
                    requested_material = mat_name
                    break
            
            # Filter by variant if color/material specified
            if requested_color or requested_material:
                filtered_products = []
                for p in collected_products:
                    variants = p.get('variants', [])
                    if not variants:
                        # No variants → include if no strict filter
                        if not requested_color and not requested_material:
                            filtered_products.append(p)
                        continue
                    
                    # Check if any variant matches
                    for v in variants:
                        v_color = (v.get('color') or '').lower()
                        v_material = (v.get('material') or '').lower()
                        
                        color_match = not requested_color or requested_color in v_color
                        material_match = not requested_material or requested_material in v_material
                        
                        if color_match and material_match:
                            filtered_products.append(p)
                            break  # Found matching variant
                
                if filtered_products:
                    logger.info(f"[ProductAgent] Variant filter: {len(collected_products)} → {len(filtered_products)} (color={requested_color}, material={requested_material})")
                    collected_products = filtered_products
                    variant_filtered = True
                else:
                    logger.info(f"[ProductAgent] Variant filter found 0 results, keeping original {len(collected_products)}")


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
        
        # 4. DETERMINISTIC RESPONSE (avoid MAX_TOKENS - NO LLM)
        is_detail = (tool_name == "get_products_db")
        
        if is_detail and len(collected_products) == 1:
            # Single product - simple format
            p = collected_products[0]
            response_text = f"**{p.get('name')}**\n\nGiá: {p.get('final_price', 0):,.0f}đ\n\nXem chi tiết: /san-pham/{p.get('id')}"
        else:
            # Product list - numbered (max 3 in text)
            lines = [f"Tìm thấy {len(collected_products)} sản phẩm phù hợp:", ""]
            
            for i, p in enumerate(collected_products[:3], 1):
                name = p.get('name', 'Sản phẩm')
                price = p.get('final_price', p.get('price', 0))
                pid = p.get('id')
                lines.append(f"{i}. **{name}** - {price:,.0f}đ")
                lines.append(f"   [Xem chi tiết](/san-pham/{pid})")
                lines.append("")
            
            if len(collected_products) > 3:
                lines.append(f"_Còn {len(collected_products) - 3} sản phẩm khác._")
                lines.append("")
            
            lines.append("Bạn muốn xem thêm thông tin sản phẩm nào?")
            response_text = "\n".join(lines)
        
        # FINAL RESULT LOGGING
        logger.info("-"*80)
        logger.info("[FINAL RESULT] ProductAgent response")
        logger.info(f"  Status: success")
        logger.info(f"  Tool used: {tool_name}")
        logger.info(f"  Products count: {len(collected_products)}")
        logger.info(f"  Response length: {len(response_text)} chars")
        logger.info(f"  Response preview: {response_text[:200]}...")
        logger.info("-"*80)
        
        return {
            "status": "success",
            "tool_used": tool_name,
            "data": {"products": collected_products},
            "agent_response": response_text
        }
        
    async def _handle_image_search(self, image_data: str, user_message: str) -> Dict[str, Any]:
        """Handle image-based product search using Vision API."""
        try:
            logger.info("#"*80)
            logger.info("[IMAGE SEARCH] Starting vision-based product search")
            logger.info(f"  User message: {user_message}")
            logger.info(f"  Image data size: {len(image_data)} bytes")
            logger.info("#"*80)
            
            # 1. Analyze image with Gemini Vision
            logger.info("[VISION API] Calling Gemini Vision for image analysis...")
            vision_result_str = await analyze_image_impl(image_data)
            vision_data = json.loads(vision_result_str)
            
            category = vision_data.get("category", "")
            colors = vision_data.get("colors", [])
            materials = vision_data.get("materials", [])
            style_tags = vision_data.get("style_tags", [])
            keywords = vision_data.get("keywords", [])
            confidence = vision_data.get("confidence", 0.0)
            search_query = vision_data.get("search_query", "")
            
            logger.info("="*80)
            logger.info("[VISION API RESULT] Image analysis complete")
            logger.info(f"  Category: {category}")
            logger.info(f"  Confidence: {confidence:.2f}")
            logger.info(f"  Colors: {colors}")
            logger.info(f"  Materials: {materials}")
            logger.info(f"  Style tags: {style_tags}")
            logger.info(f"  Keywords: {keywords}")
            logger.info(f"  Search query: {search_query}")
            logger.info("="*80)
            
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
            
            logger.info("-"*80)
            logger.info("[SEARCH QUERY] Enhanced query for semantic search")
            logger.info(f"  Final query: {search_query}")
            logger.info("-"*80)
            
            # 4. Semantic search with query
            logger.info("[MCP TOOL] search_product_vectors executing...")
            result_str = await search_semantic_impl(query=search_query, limit=15)
            data = extract_json_object(result_str)
            ids = data.get("ids", [])
            
            logger.info(f"[MCP TOOL] Semantic search returned {len(ids)} product IDs")
            
            if not ids:
                logger.info("[IMAGE SEARCH] No products found")
                return {
                    "status": "success",
                    "tool_used": "analyze_image",
                    "data": {"products": []},
                    "agent_response": f"Tôi hiểu bạn đang tìm **{category}** với màu {', '.join(colors) if colors else 'không xác định'}, nhưng không tìm thấy sản phẩm phù hợp. Bạn có thể thử tìm kiếm bằng từ khóa hoặc mô tả chi tiết hơn?"
                }
            
            # 5. Get full product details
            logger.info(f"[MCP TOOL] get_products_db fetching details for {len(ids[:8])} products...")
            detail_str = await get_products_db_impl(product_ids=ids[:8])
            detail_data = extract_json_object(detail_str)
            products = detail_data.get("products", [])
            
            # MCP RESULTS for image search
            logger.info("="*80)
            logger.info("[MCP RESULTS - IMAGE SEARCH] Products retrieved (BEFORE RE-RANKING)")
            logger.info(f"  Total count: {len(products)}")
            if products:
                for idx, p in enumerate(products, 1):
                    logger.info(f"    [{idx}] {p.get('name')} (ID: {p.get('id')})")
                    logger.info(f"        Category: {p.get('category_name', 'N/A')}")
            logger.info("="*80)
            
            # 6. SMART RE-RANKING based on visual features match
            if products:
                logger.info("[RE-RANKING] Scoring products by visual similarity...")
                
                for idx, p in enumerate(products):
                    score = 0
                    
                    # POSITION BONUS (preserve semantic search ranking)
                    # Products at top of semantic search get bonus
                    position_bonus = max(0, 20 - (idx * 2))  # #1: +20, #2: +18, #3: +16, ...
                    score += position_bonus
                    
                    # Category match (most important)
                    p_category = (p.get('category_name') or '').lower()
                    detected_cat = category.lower()
                    
                    # Exact category name match (very strong signal)
                    if p_category == detected_cat:
                        score += 100
                    # "Bàn" categories - check for exact sub-type
                    elif 'bàn' in detected_cat and 'bàn' in p_category:
                        # Check if it's the right type of desk
                        if 'chữ l' in detected_cat and 'chữ l' in p_category:
                            score += 70
                        elif 'chữ u' in detected_cat and 'chữ u' in p_category:
                            score += 70
                        elif 'nâng hạ' in detected_cat and 'nâng hạ' in p_category:
                            score += 70
                        else:
                            score += 30  # Generic "bàn" match
                    # "Ghế" categories
                    elif 'ghế' in detected_cat and 'ghế' in p_category:
                        if 'văn phòng' in detected_cat and 'văn phòng' in p_category:
                            score += 70
                        else:
                            score += 30
                    
                    # EXACT NAME/ID DETECTION
                    # Check if product name/ID appears in keywords
                    p_name_lower = (p.get('name') or '').lower()
                    p_id_str = str(p.get('id', ''))
                    
                    # If keywords contain product model number (e.g., "EC06", "F42")
                    for kw in keywords:
                        kw_clean = kw.lower().replace('-', '').replace(' ', '')
                        name_clean = p_name_lower.replace('-', '').replace(' ', '')
                        if len(kw) >= 3 and kw_clean in name_clean:
                            score += 100  # Strong signal of exact product
                            logger.info(f"    EXACT MATCH: keyword '{kw}' in '{p.get('name')}'")
                            break
                    
                    # Color match
                    p_variants = p.get('variants', [])
                    for color in colors:
                        for v in p_variants:
                            v_color = (v.get('color') or '').lower()
                            if color.lower() in v_color:
                                score += 15
                                break
                    
                    # Material match
                    for material in materials:
                        for v in p_variants:
                            v_material = (v.get('material') or '').lower()
                            if material.lower() in v_material:
                                score += 10
                                break
                    
                    # Keyword match in name/description
                    p_desc = (p.get('description') or '').lower()
                    for kw in keywords:
                        kw_lower = kw.lower()
                        if kw_lower in p_name_lower:
                            score += 5
                        if kw_lower in p_desc:
                            score += 2
                    
                    p['_similarity_score'] = score
                    logger.info(f"  {p.get('name')}: score={score} (pos_bonus={position_bonus})")
                
                # Sort by score descending
                products.sort(key=lambda x: x.get('_similarity_score', 0), reverse=True)
                
                logger.info("="*80)
                logger.info("[MCP RESULTS - IMAGE SEARCH] Products after RE-RANKING")
                for idx, p in enumerate(products, 1):
                    logger.info(f"    [{idx}] {p.get('name')} (score: {p.get('_similarity_score', 0)})")
                    logger.info(f"        Category: {p.get('category_name', 'N/A')}")
                logger.info("="*80)
            
            # 7. THRESHOLD CHECK - if top product score too low, product not available
            SIMILARITY_THRESHOLD = 40  # Minimum score for "product available"
            
            if not products or products[0].get('_similarity_score', 0) < SIMILARITY_THRESHOLD:
                logger.info(f"[IMAGE SEARCH] Top score {products[0].get('_similarity_score', 0) if products else 0} < {SIMILARITY_THRESHOLD} - Product not available")
                return {
                    "status": "success",
                    "tool_used": "analyze_image",
                    "data": {"products": []},
                    "agent_response": f"Xin lỗi, cửa hàng của tôi hiện không có sản phẩm **{category}** này.\n\nBạn có thể xem các sản phẩm tương tự khác hoặc liên hệ để được tư vấn thêm!"
                }
            
            # 8. Build DETERMINISTIC response (NO LLM to avoid MAX_TOKENS)
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
            
            # FINAL RESULT for image search
            logger.info("#"*80)
            logger.info("[FINAL RESULT - IMAGE SEARCH] Vision-based search complete")
            logger.info(f"  Category detected: {category}")
            logger.info(f"  Confidence: {confidence:.2f}")
            logger.info(f"  Products found: {len(products)}")
            logger.info(f"  Response length: {len(response_text)} chars")
            logger.info("#"*80)
            
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
