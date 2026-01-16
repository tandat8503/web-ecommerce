from fastmcp import FastMCP
from typing import Annotated, Optional, Dict, Any, List
import json
import aiomysql
from app.services.product_vector_service import get_product_vector_service
from app.core.db import get_db_conn
from app.core.logger import get_logger

logger = get_logger(__name__)

# Initialize FastMCP for Product domain
mcp = FastMCP("product_domain")

# --- IMPLEMENTATION ---

async def search_semantic_impl(
    query: str, 
    limit: int = 15,
    min_price: float = None,
    max_price: float = None
) -> str:
    """Search for product IDs using vector embeddings."""
    logger.info(f"Searching semantic vectors for: {query}")
    vector_service = get_product_vector_service()
    if not vector_service:
        return json.dumps({"status": "no_service", "ids": []})
        
    try:
        # Search with limit (default 15)
        # Vector service accepts price_min/max
        results = vector_service.search_products(
            query=query, 
            top_k=limit,
            price_min=min_price,
            price_max=max_price
        )
        
        if not results:
            return json.dumps({"status": "no_results", "ids": []})
            
        ids = [r["product_id"] for r in results if r.get("product_id")]
        # Unique IDs while preserving order (rank)
        seen = set()
        unique_ids = []
        for pid in ids:
            if pid not in seen:
                seen.add(pid)
                unique_ids.append(pid)
                
        return json.dumps({"status": "success", "ids": unique_ids}, default=str)
    except Exception as e:
        logger.error(f"Vector search failed: {e}")
        return json.dumps({"status": "error", "message": str(e)})

async def get_products_db_impl(product_ids: list[int]) -> str:
    """Fetch rich product details from MySQL for given IDs."""
    if not product_ids:
        return json.dumps([])
        
    conn = await get_db_conn()
    try:
        async with conn.cursor(aiomysql.DictCursor) as cursor:
            # 1. Fetch Products + Brand + Category + Stats
            format_strings = ','.join(['%s'] * len(product_ids))
            query = f"""
                SELECT p.id, p.name, p.slug, p.price, p.sale_price, p.image_url, p.description,
                       b.name as brand_name, c.name as category_name,
                       (SELECT AVG(rating) FROM product_reviews WHERE product_id = p.id) as avg_rating,
                       (SELECT COUNT(*) FROM order_items WHERE product_id = p.id) as sold_count
                FROM products p
                LEFT JOIN brands b ON p.brand_id = b.id
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.id IN ({format_strings})
                AND p.status = 'ACTIVE'
            """
            await cursor.execute(query, tuple(product_ids))
            products = await cursor.fetchall()
            
            # 2. Fetch Variants (Colors/Materials)
            variants_query = f"""
                SELECT product_id, color, material, stock_quantity 
                FROM product_variants 
                WHERE product_id IN ({format_strings}) AND is_active = 1
            """
            await cursor.execute(variants_query, tuple(product_ids))
            variants = await cursor.fetchall()
            
            # Merge variants
            product_map = {p['id']: p for p in products}
            for p in product_map.values():
                p['variants'] = []
                p['final_price'] = float(p['sale_price']) if p['sale_price'] else float(p['price'])
                p['avg_rating'] = float(p['avg_rating']) if p['avg_rating'] else 0.0
                p['price'] = float(p['price'])
                if p['sale_price']: p['sale_price'] = float(p['sale_price'])
                
            for v in variants:
                pid = v['product_id']
                if pid in product_map:
                    product_map[pid]['variants'].append({
                        'color': v['color'], 
                        'material': v['material'],
                        'stock': v['stock_quantity']
                    })
            
            # Restore order based on input IDs importance
            ordered_products = []
            for pid in product_ids:
                if pid in product_map:
                    ordered_products.append(product_map[pid])
                    
            return json.dumps({"products": ordered_products}, default=str)
            
    except Exception as e:
        logger.error(f"DB Fetch failed: {e}")
        return json.dumps({"error": str(e)})
    finally:
        from app.core.db import release_conn
        await release_conn(conn)

async def get_best_sellers_impl(limit: int = 5) -> str:
    """Get top best selling products based on order count."""
    conn = await get_db_conn()
    try:
        async with conn.cursor(aiomysql.DictCursor) as cursor:
            query = """
                SELECT p.id
                FROM products p
                JOIN order_items oi ON p.id = oi.product_id
                GROUP BY p.id
                ORDER BY COUNT(oi.id) DESC
                LIMIT %s
            """
            await cursor.execute(query, (limit,))
            rows = await cursor.fetchall()
            ids = [r['id'] for r in rows]
            return json.dumps({"ids": ids})
    except Exception as e:
        logger.error(f"Best sellers failed: {e}")
        return json.dumps({"ids": []})
    finally:
        from app.core.db import release_conn
        await release_conn(conn)

# --- MCP TOOLS ---

@mcp.tool(description="Search product IDs by semantic vector search")
async def search_product_vectors(
    query: Annotated[str, "Search query"],
    limit: Annotated[int, "Max IDs to return (default 15)"] = 15,
    min_price: Annotated[Optional[float], "Minimum price"] = None,
    max_price: Annotated[Optional[float], "Maximum price"] = None
) -> str:
    return await search_semantic_impl(query, limit, min_price, max_price)

@mcp.tool(description="Get full product details (Brand, Category, Variants, Rating) from DB")
async def get_products_db(
    product_ids: Annotated[List[int], "List of Product IDs"]
) -> str:
    return await get_products_db_impl(product_ids)

@mcp.tool(description="Get IDs of best selling products")
async def get_best_sellers(
    limit: Annotated[int, "Number of products"] = 5
) -> str:
    return await get_best_sellers_impl(limit)

# --- IMAGE UNDERSTANDING ---

async def analyze_image_impl(image_data: str) -> str:
    """
    Analyze product image using Gemini Vision to extract attributes.
    
    Args:
        image_data: Base64 encoded image string
        
    Returns:
        JSON string with extracted attributes:
        {
            "category": str,
            "colors": [str],
            "materials": [str],
            "style_tags": [str],
            "notable_features": [str],
            "keywords": [str],
            "confidence": float (0-1),
            "search_query": str
        }
    """
    import google.generativeai as genai
    import base64
    from app.core.config import settings
    
    try:
        # Initialize Vision model
        genai.configure(api_key=settings.GEMINI_API_KEY)
        vision_model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        # Decode base64 image
        image_bytes = base64.b64decode(image_data)
        
        # Vision prompt for furniture attribute extraction
        prompt = """Bạn là chuyên gia phân tích nội thất văn phòng. Phân tích ảnh này và trích xuất thông tin sản phẩm.

QUAN TRỌNG: Chỉ trả về JSON thuần túy, KHÔNG thêm markdown hoặc text khác.

Schema JSON:
{
  "category": "ghế văn phòng/bàn làm việc/tủ tài liệu/kệ sách/ghế công thái học/bàn họp/...",
  "colors": ["màu 1", "màu 2"],
  "materials": ["da thật/vải lưới/gỗ/kim loại/nhựa/..."],
  "style_tags": ["hiện đại/cổ điển/tối giản/sang trọng/công nghiệp/..."],
  "notable_features": ["có tay vịn", "có bánh xe", "điều chỉnh độ cao", "có lưng tựa", ...],
  "keywords": ["từ khoá 1", "từ khoá 2", ...],
  "confidence": 0.8,
  "search_query": "ghế văn phòng lưng lưới màu đen hiện đại"
}

QUY TẮC:
- Nếu KHÔNG phải nội thất văn phòng: trả category = "không phải nội thất văn phòng"
- Không phỏng đoán brand/giá
- Confidence: 0.9+ nếu rõ ràng, 0.5-0.8 nếu mơ hồ, <0.5 nếu không chắc
- search_query: tổng hợp keywords để search text
- Chỉ trả JSON, không markdown```
"""
        
        # Call Gemini Vision
        response = await vision_model.generate_content_async([prompt, {"mime_type": "image/jpeg", "data": image_bytes}])
        result_text = response.text.strip()
        
        # Clean markdown if present
        if result_text.startswith("```"):
            result_text = result_text.split("```")[1]
            if result_text.startswith("json"):
                result_text = result_text[4:]
            result_text = result_text.strip()
        
        # Validate JSON
        parsed = json.loads(result_text)
        
        logger.info(f"[Vision] Analyzed image: category={parsed.get('category')}, confidence={parsed.get('confidence')}")
        
        return json.dumps(parsed, ensure_ascii=False)
        
    except Exception as e:
        logger.error(f"Image analysis failed: {e}")
        return json.dumps({
            "error": str(e),
            "category": "unknown",
            "colors": [],
            "materials": [],
            "style_tags": [],
            "notable_features": [],
            "keywords": [],
            "confidence": 0.0,
            "search_query": ""
        })

@mcp.tool(description="Analyze product image to extract attributes (category, colors, materials, style)")
async def analyze_image(
    image_data: Annotated[str, "Base64 encoded image string"]
) -> str:
    return await analyze_image_impl(image_data)
