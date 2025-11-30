#!/usr/bin/env python3
"""
Helper functions for MCP tools (without decorators)
These can be imported without triggering FastMCP parsing
"""

import asyncio
import json
import logging
from typing import List, Dict, Any, Optional

from core.db import get_conn, release_conn
from services.chatbot.search import ProductSearchService
from services.sentiment.service import SentimentService
from services.analyst.service import AnalystService
from services.moderation.service import ModerationService
from services.report.service import ReportGeneratorService
from core.utils import safe_json_parse

logger = logging.getLogger(__name__)

# Initialize services
product_search_service = ProductSearchService()
sentiment_service = SentimentService()
analyst_service = AnalystService()
moderation_service = ModerationService()
report_generator_service = ReportGeneratorService()


async def search_products_helper(
    query: str,
    limit: int = 10,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    category: Optional[str] = None,
    attributes: Optional[Dict[str, Any]] = None
) -> str:
    """Helper function for product search (without MCP decorator)"""
    conn = None
    try:
        conn = await get_conn()
        
        # For product searches, prefer SQL search for better accuracy with specific queries
        # Vector search is better for semantic similarity, but SQL is better for exact matches
        # Use SQL search by default, vector search only for very semantic queries
        use_vector_search = False  # Disable vector search for now - SQL is more reliable for specific product queries
        
        products = []
        if use_vector_search:
            try:
                await product_search_service.build_from_db(conn)
                products = product_search_service.search(query, top_k=limit * 2)  # Get more results for filtering
                logger.info(f"Vector search returned {len(products)} products for query: '{query}'")
            except Exception as e:
                logger.warning(f"Vector search failed, falling back to SQL: {e}")
                products = []
        
        # Always use SQL search for better accuracy with specific product queries
        if not products or not use_vector_search:
            logger.info(f"Using SQL search for query: '{query}' (min_price={min_price}, max_price={max_price}, category={category})")
            products = await _sql_product_search_fallback(conn, query, limit, min_price, max_price, category, attributes)
            logger.info(f"SQL search returned {len(products)} products for query: '{query}'")
            if products:
                logger.info(f"Top products: {[p.get('name', 'N/A') for p in products[:3]]}")
        
        result = {
            "success": True,
            "products": products,
            "total_count": len(products),
            "query": query
        }
        
        return json.dumps(result)
        
    except Exception as e:
        logger.error(f"Error in product search: {e}")
        return json.dumps({
            "success": False,
            "error": str(e),
            "products": [],
            "total_count": 0,
            "query": query
        })
    finally:
        if conn:
            await release_conn(conn)


async def analyze_sentiment_helper(
    texts: List[str],
    product_id: Optional[int] = None
) -> str:
    """Helper function for sentiment analysis"""
    conn = None
    try:
        conn = await get_conn()
        results = await sentiment_service.analyze_texts(conn, texts)
        
        total_texts = len(texts)
        positive_count = sum(1 for r in results if r.get('sentiment') == 'positive')
        negative_count = sum(1 for r in results if r.get('sentiment') == 'negative')
        neutral_count = total_texts - positive_count - negative_count
        
        summary = {
            "total_texts": total_texts,
            "positive": positive_count,
            "negative": negative_count,
            "neutral": neutral_count,
            "positive_rate": (positive_count / total_texts * 100) if total_texts > 0 else 0,
            "negative_rate": (negative_count / total_texts * 100) if total_texts > 0 else 0
        }
        
        result = {
            "success": True,
            "results": results,
            "summary": summary
        }
        
        return json.dumps(result)
        
    except Exception as e:
        logger.error(f"Error in sentiment analysis: {e}")
        return json.dumps({
            "success": False,
            "error": str(e),
            "results": [],
            "summary": {}
        })
    finally:
        if conn:
            await release_conn(conn)


async def summarize_sentiment_by_product_helper(
    product_id: Optional[int] = None
) -> str:
    """Helper function for sentiment summary"""
    conn = None
    try:
        conn = await get_conn()
        summary_data = await sentiment_service.summarize_by_product(conn, product_id)
        
        result = {
            "success": True,
            "products": summary_data.get("products", []),
            "overall": summary_data.get("overall", {})
        }
        
        return json.dumps(result)
        
    except Exception as e:
        logger.error(f"Error in sentiment summary: {e}")
        return json.dumps({
            "success": False,
            "error": str(e),
            "products": [],
            "overall": {}
        })
    finally:
        if conn:
            await release_conn(conn)


async def get_revenue_analytics_helper(
    month: Optional[int] = None,
    year: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> str:
    """Helper function for revenue analytics"""
    conn = None
    try:
        conn = await get_conn()
        revenue_data = await analyst_service.get_revenue(conn, month=month, year=year)
        
        period = {
            "month": month,
            "year": year,
            "start_date": start_date,
            "end_date": end_date
        }
        
        result = {
            "success": True,
            "revenue_data": revenue_data,
            "summary": revenue_data.get("summary", {}),
            "period": period
        }
        
        return json.dumps(result)
        
    except Exception as e:
        logger.error(f"Error in revenue analysis: {e}")
        return json.dumps({
            "success": False,
            "error": str(e),
            "revenue_data": {},
            "summary": {},
            "period": {}
        })
    finally:
        if conn:
            await release_conn(conn)


async def get_sales_performance_helper(
    days: int = 30
) -> str:
    """Helper function for sales performance"""
    conn = None
    try:
        conn = await get_conn()
        
        async with conn.cursor() as cur:
            await cur.execute("""
                SELECT 
                    DATE_FORMAT(o.created_at, '%Y-%m-%d') as date,
                    COUNT(DISTINCT o.id) as total_orders,
                    COUNT(DISTINCT o.user_id) as unique_customers,
                    SUM(o.total_amount) as total_revenue,
                    AVG(o.total_amount) as avg_order_value
                FROM orders o
                WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL %s DAY)
                GROUP BY DATE_FORMAT(o.created_at, '%Y-%m-%d')
                ORDER BY date DESC
            """, (days,))
            
            rows = await cur.fetchall()
            
            performance_data = [
                {
                    "date": row[0],
                    "total_orders": row[1] or 0,
                    "unique_customers": row[2] or 0,
                    "total_revenue": float(row[3] or 0),
                    "avg_order_value": float(row[4] or 0)
                }
                for row in rows
            ]
        
        total_revenue = sum(p["total_revenue"] for p in performance_data)
        total_orders = sum(p["total_orders"] for p in performance_data)
        total_customers = sum(p["unique_customers"] for p in performance_data)
        avg_order_value = total_revenue / total_orders if total_orders > 0 else 0
        
        summary = {
            "period_days": days,
            "total_revenue": total_revenue,
            "total_orders": total_orders,
            "total_customers": total_customers,
            "avg_order_value": avg_order_value,
            "daily_avg_revenue": total_revenue / days if days > 0 else 0,
            "daily_avg_orders": total_orders / days if days > 0 else 0
        }
        
        result = {
            "success": True,
            "performance_data": performance_data,
            "summary": summary
        }
        
        return json.dumps(result)
        
    except Exception as e:
        logger.error(f"Error in sales performance: {e}")
        return json.dumps({
            "success": False,
            "error": str(e),
            "performance_data": [],
            "summary": {}
        })
    finally:
        if conn:
            await release_conn(conn)


async def get_product_metrics_helper(
    limit: int = 20
) -> str:
    """Helper function for product metrics"""
    conn = None
    try:
        conn = await get_conn()
        
        async with conn.cursor() as cur:
            await cur.execute("""
                SELECT 
                    p.id,
                    p.name,
                    p.price,
                    p.view_count,
                    COUNT(DISTINCT oi.order_id) as order_count,
                    SUM(oi.quantity) as total_quantity,
                    SUM(oi.quantity * oi.unit_price) as total_revenue,
                    AVG(oi.unit_price) as avg_selling_price
                FROM products p
                LEFT JOIN order_items oi ON p.id = oi.product_id
                LEFT JOIN orders o ON oi.order_id = o.id
                WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH) OR o.created_at IS NULL
                GROUP BY p.id, p.name, p.price, p.view_count
                ORDER BY total_revenue DESC
                LIMIT %s
            """, (limit,))
            
            rows = await cur.fetchall()
            
            product_metrics = [
                {
                    "id": row[0],
                    "name": row[1],
                    "price": float(row[2]),
                    "view_count": row[3],
                    "order_count": row[4] or 0,
                    "total_quantity": row[5] or 0,
                    "total_revenue": float(row[6] or 0),
                    "avg_selling_price": float(row[7] or 0)
                }
                for row in rows
            ]
        
        result = {
            "success": True,
            "product_metrics": product_metrics,
            "total_products": len(product_metrics)
        }
        
        return json.dumps(result)
        
    except Exception as e:
        logger.error(f"Error in product metrics: {e}")
        return json.dumps({
            "success": False,
            "error": str(e),
            "product_metrics": [],
            "total_products": 0
        })
    finally:
        if conn:
            await release_conn(conn)


async def generate_report_helper(
    report_type: str = "summary",
    month: Optional[int] = None,
    year: Optional[int] = None,
    include_sentiment: bool = True,
    include_revenue: bool = True
) -> str:
    """Helper function for report generation"""
    conn = None
    try:
        conn = await get_conn()
        
        report_data = {
            "report_type": report_type,
            "generated_at": asyncio.get_event_loop().time(),
            "period": {
                "month": month,
                "year": year
            }
        }
        
        if include_revenue:
            revenue_data = await analyst_service.get_revenue(conn, month=month, year=year)
            report_data["revenue"] = revenue_data
        
        if include_sentiment:
            sentiment_data = await sentiment_service.summarize_by_product(conn)
            report_data["sentiment"] = sentiment_data
        
        report_url = f"/reports/{report_type}?month={month}&year={year}"
        
        result = {
            "success": True,
            "report_url": report_url,
            "report_data": report_data
        }
        
        return json.dumps(result)
        
    except Exception as e:
        logger.error(f"Error in report generation: {e}")
        return json.dumps({
            "success": False,
            "error": str(e),
            "report_url": None,
            "report_data": {}
        })
    finally:
        if conn:
            await release_conn(conn)


async def generate_html_report_helper(
    report_type: str,
    data: str,
    title: Optional[str] = None,
    period: Optional[str] = None
) -> str:
    """Helper function for HTML report generation"""
    try:
        logger.info(f"Generating {report_type} HTML report for period: {period}")
        
        data_dict = safe_json_parse(data) if isinstance(data, str) else data
        
        result = await report_generator_service.generate_html_report(
            report_type=report_type,
            data=data_dict,
            title=title,
            period=period
        )
        
        logger.info(f"HTML report generated successfully, insights: {len(result.get('insights', []))}")
        
        return json.dumps(result, ensure_ascii=False)
        
    except Exception as e:
        logger.error(f"Error in generate_html_report tool: {e}")
        return json.dumps({
            "success": False,
            "error": str(e),
            "html": f"<html><body><h1>Lỗi: {str(e)}</h1></body></html>",
            "summary": f"Lỗi tạo báo cáo: {str(e)}",
            "insights": [],
            "recommendations": [],
            "charts_data": {},
            "generated_at": ""
        }, ensure_ascii=False)


async def moderate_content_helper(
    content: str,
    content_type: str = "comment",
    product_id: Optional[int] = None,
    user_id: Optional[int] = None
) -> str:
    """Helper function for content moderation"""
    try:
        logger.info(f"Moderating {content_type} content, length: {len(content)}")
        
        result = await moderation_service.moderate_content(
            content=content,
            content_type=content_type,
            product_id=product_id,
            user_id=user_id
        )
        
        logger.info(f"Moderation result: {result.get('suggested_action')}, violations: {result.get('violations')}")
        
        return json.dumps(result, ensure_ascii=False)
        
    except Exception as e:
        logger.error(f"Error in moderate_content tool: {e}")
        return json.dumps({
            "success": False,
            "error": str(e),
            "is_appropriate": True,
            "violations": [],
            "severity": "low",
            "confidence": 0.0,
            "suggested_action": "review",
            "explanation": f"Lỗi kiểm duyệt: {str(e)}",
            "moderated_content": content
        }, ensure_ascii=False)


async def _sql_product_search_fallback(
    conn, 
    query: str, 
    limit: int, 
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    category: Optional[str] = None,
    attributes: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    Optimized SQL search without dangerous exclusions
    Let search engine rank products, don't manually exclude categories
    """
    try:
        async with conn.cursor() as cur:
            where_conditions = []
            params = []
            query_lower = query.lower().strip()
            
            # --- PHẦN 1: TÌM KIẾM TEXT (FULLTEXT + LIKE) ---
            # Không loại trừ từ khóa nào cả. Hãy để DB quyết định độ phù hợp.
            
            if len(query_lower) > 0:
                # Tìm trong Tên, Mô tả và cả Variant (Màu, Chất liệu)
                # Kỹ thuật: Dùng OR bao quanh để tìm rộng
                text_search_clauses = [
                    "p.name LIKE %s",
                    "p.description LIKE %s", 
                    # Tìm text trong variants (VD: khách tìm "bàn chân sắt" -> sắt nằm trong material)
                    "EXISTS (SELECT 1 FROM product_variants pv_text WHERE pv_text.product_id = p.id AND pv_text.is_active = 1 AND (pv_text.material LIKE %s OR pv_text.color LIKE %s))"
                ]
                search_param = f"%{query_lower}%"
                
                # Logic Fulltext (nếu có index) hoặc Like
                where_conditions.append(f"({' OR '.join(text_search_clauses)})")
                params.extend([search_param, search_param, search_param, search_param])

            # --- PHẦN 2: TÌM KIẾM THEO THUỘC TÍNH (ATTRIBUTES) ---
            if attributes:
                variant_conditions = []
                
                # Xử lý Size (Quan trọng)
                if attributes.get("size"):
                    size_raw = attributes["size"]
                    from core.utils import normalize_dimension_to_mm
                    size_mm = normalize_dimension_to_mm(size_raw)
                    
                    if size_mm:
                        # Tìm chính xác hoặc LIKE prefix (VD: 1200 matches 1200)
                        # Tìm cả ở chiều rộng (Width) và chiều sâu (Depth)
                        variant_conditions.append("(pv.width = %s OR pv.depth = %s OR pv.width LIKE %s)")
                        params.extend([size_mm, size_mm, f"{size_mm}%"])
                        logger.info(f"Searching for size: {size_raw} -> normalized to {size_mm}mm")
                
                if attributes.get("color"):
                    color = attributes["color"].lower()
                    variant_conditions.append("pv.color LIKE %s")
                    params.append(f"%{color}%")
                
                if attributes.get("material"):
                    material = attributes["material"].lower()
                    variant_conditions.append("pv.material LIKE %s")
                    params.append(f"%{material}%")
                
                if variant_conditions:
                    # Gắn điều kiện variant vào query chính
                    where_conditions.append(f"EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = 1 AND ({' AND '.join(variant_conditions)}))")

            # --- PHẦN 3: CÁC FILTER CỐ ĐỊNH ---
            if category:
                where_conditions.append("c.name LIKE %s")
                params.append(f"%{category}%")
            
            where_conditions.append("p.status = 'ACTIVE'")
            
            if min_price is not None:
                where_conditions.append("COALESCE(p.sale_price, p.price) >= %s")
                params.append(min_price)
            
            if max_price is not None:
                where_conditions.append("COALESCE(p.sale_price, p.price) <= %s")
                params.append(max_price)
            
            # --- BUILD QUERY ---
            where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"
            
            # Order by: Ưu tiên tên khớp chính xác query -> Giá trị view cao
            query_sql = f"""
                SELECT DISTINCT
                    p.id, 
                    p.name, 
                    p.price, 
                    p.description, 
                    p.slug, 
                    p.image_url, 
                    COALESCE(p.sale_price, p.price) as final_price,
                    p.sale_price,
                    c.name as category_name,
                    c.slug as category_slug,
                    b.name as brand_name,
                    (SELECT GROUP_CONCAT(CONCAT(pv2.width, 'x', pv2.depth) SEPARATOR '; ') 
                     FROM product_variants pv2 
                     WHERE pv2.product_id = p.id AND pv2.is_active = 1
                     LIMIT 3) as dimensions
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN brands b ON p.brand_id = b.id
                WHERE {where_clause}
                ORDER BY 
                    CASE WHEN p.name LIKE %s THEN 1 ELSE 2 END,
                    p.view_count DESC
                LIMIT %s
            """
            
            # Params cho Order by và Limit
            params.append(f"%{query_lower}%") 
            params.append(limit)
            
            await cur.execute(query_sql, params)
            rows = await cur.fetchall()
            
            return [
                {
                    "id": row[0],
                    "name": row[1],
                    "price": float(row[2]),
                    "description": row[3] or "",
                    "slug": row[4] or "",
                    "image_url": row[5],
                    "final_price": float(row[6]) if row[6] else float(row[2]),
                    "sale_price": float(row[7]) if row[7] else None,
                    "category": row[8] or "",
                    "category_slug": row[9] or "",
                    "brand": row[10] or "",
                    "variant_info": row[11] or ""  # Trả về kích thước để hiển thị cho user biết tại sao tìm thấy
                }
                for row in rows
            ]
            
    except Exception as e:
        logger.error(f"Error in SQL search: {e}", exc_info=True)
        return []


async def get_product_details_helper(product_name_or_id: str) -> str:
    """
    Lấy thông tin chi tiết đầy đủ của sản phẩm để trả lời về cấu hình/thông số
    
    Args:
        product_name_or_id: Tên sản phẩm (có thể là một phần) hoặc ID sản phẩm
    
    Returns:
        JSON string với thông tin chi tiết sản phẩm
    """
    conn = None
    try:
        conn = await get_conn()
        async with conn.cursor() as cur:
            # Tìm sản phẩm khớp tên nhất hoặc theo ID
            # Thử tìm theo ID trước (nếu là số)
            is_id = product_name_or_id.isdigit()
            
            if is_id:
                await cur.execute("""
                    SELECT 
                        p.id, p.name, p.description, p.price, p.sale_price,
                        p.slug, p.image_url, p.view_count,
                        c.name as category_name, c.slug as category_slug,
                        b.name as brand_name,
                        GROUP_CONCAT(DISTINCT pv.material SEPARATOR ', ') as materials,
                        GROUP_CONCAT(DISTINCT CONCAT(pv.width, 'x', pv.depth, 'x', pv.height) SEPARATOR '; ') as dimensions,
                        GROUP_CONCAT(DISTINCT pv.color SEPARATOR ', ') as colors,
                        GROUP_CONCAT(DISTINCT pv.weight SEPARATOR ', ') as weights
                    FROM products p
                    LEFT JOIN categories c ON p.category_id = c.id
                    LEFT JOIN brands b ON p.brand_id = b.id
                    LEFT JOIN product_variants pv ON p.id = pv.product_id
                    WHERE p.id = %s AND p.status = 'ACTIVE'
                    GROUP BY p.id
                    LIMIT 1
                """, (int(product_name_or_id),))
            else:
                # Tìm theo tên (LIKE search)
                await cur.execute("""
                    SELECT 
                        p.id, p.name, p.description, p.price, p.sale_price,
                        p.slug, p.image_url, p.view_count,
                        c.name as category_name, c.slug as category_slug,
                        b.name as brand_name,
                        GROUP_CONCAT(DISTINCT pv.material SEPARATOR ', ') as materials,
                        GROUP_CONCAT(DISTINCT CONCAT(pv.width, 'x', pv.depth, 'x', pv.height) SEPARATOR '; ') as dimensions,
                        GROUP_CONCAT(DISTINCT pv.color SEPARATOR ', ') as colors,
                        GROUP_CONCAT(DISTINCT pv.weight SEPARATOR ', ') as weights
                    FROM products p
                    LEFT JOIN categories c ON p.category_id = c.id
                    LEFT JOIN brands b ON p.brand_id = b.id
                    LEFT JOIN product_variants pv ON p.id = pv.product_id
                    WHERE (p.name LIKE %s OR p.description LIKE %s) AND p.status = 'ACTIVE'
                    GROUP BY p.id
                    ORDER BY 
                        CASE WHEN p.name LIKE %s THEN 1 ELSE 2 END,
                        p.view_count DESC
                    LIMIT 1
                """, (f"%{product_name_or_id}%", f"%{product_name_or_id}%", f"{product_name_or_id}%"))
            
            row = await cur.fetchone()
            
            if not row:
                return json.dumps({
                    "success": False, 
                    "error": "Không tìm thấy sản phẩm",
                    "product_name_or_id": product_name_or_id
                }, ensure_ascii=False)
            
            # Build product detail dictionary
            product_detail = {
                "success": True,
                "product": {
                    "id": row[0],
                    "name": row[1],
                    "description": row[2] or "",  # AI cần cái này để đọc thông số
                    "price": float(row[3]) if row[3] else 0.0,
                    "sale_price": float(row[4]) if row[4] else None,
                    "slug": row[5] or "",
                    "image_url": row[6] or "",
                    "view_count": row[7] or 0,
                    "category": row[8] or "",
                    "category_slug": row[9] or "",
                    "brand": row[10] or "",
                    "specs": {
                        "materials": row[11] or "",
                        "dimensions": row[12] or "",
                        "colors": row[13] or "",
                        "weights": row[14] or ""
                    }
                }
            }
            
            return json.dumps(product_detail, ensure_ascii=False)
            
    except Exception as e:
        logger.error(f"Error getting product details: {e}", exc_info=True)
        return json.dumps({
            "success": False, 
            "error": str(e),
            "product_name_or_id": product_name_or_id
        }, ensure_ascii=False)
    finally:
        if conn:
            await release_conn(conn)

