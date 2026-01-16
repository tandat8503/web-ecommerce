#!/usr/bin/env python3
"""
Helper functions for MCP tools
Cleaned up version - only keeping actively used helpers
"""

import asyncio
import json
import logging
import re
from typing import List, Dict, Any, Optional

from core.db import get_conn, release_conn
from services.chatbot.search import ProductSearchService
from core.utils import safe_json_parse, normalize_dimension_to_mm

logger = logging.getLogger(__name__)

# Initialize services
product_search_service = ProductSearchService()


async def search_products_helper(
    query: str,
    limit: int = 10,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    category: Optional[str] = None,
    attributes: Optional[Dict[str, Any]] = None
) -> str:
    """
    Search products using SQL with optimized query matching.
    
    Args:
        query: Search query string
        limit: Maximum number of results
        min_price: Minimum price filter
        max_price: Maximum price filter
        category: Category filter
        attributes: Additional attributes (size, color, material)
    
    Returns:
        JSON string with search results
    """
    conn = None
    try:
        conn = await get_conn()
        
        logger.info(f"[SEARCH] Query: '{query}', Price: {min_price}-{max_price}, Category: {category}")
        
        products = await _sql_product_search(
            conn, query, limit, min_price, max_price, category, attributes
        )
        
        logger.info(f"[SEARCH] Found {len(products)} products")
        
        return json.dumps({
            "success": True,
            "products": products,
            "total_count": len(products),
            "query": query
        }, ensure_ascii=False)
        
    except Exception as e:
        logger.error(f"[SEARCH] Error: {e}", exc_info=True)
        return json.dumps({
            "success": False,
            "error": str(e),
            "products": [],
            "total_count": 0,
            "query": query
        }, ensure_ascii=False)
    finally:
        if conn:
            await release_conn(conn)


async def get_product_details_helper(product_name_or_id: str) -> str:
    """
    Get detailed product information by name or ID.
    
    Args:
        product_name_or_id: Product name (partial match) or product ID
    
    Returns:
        JSON string with product details including specs
    """
    conn = None
    try:
        conn = await get_conn()
        async with conn.cursor() as cur:
            is_id = product_name_or_id.isdigit()
            
            if is_id:
                # Search by ID
                await cur.execute("""
                    SELECT 
                        p.id, p.name, p.description, p.price, p.sale_price,
                        p.slug, p.image_url, p.view_count,
                        c.name as category_name, c.slug as category_slug,
                        b.name as brand_name,
                        GROUP_CONCAT(DISTINCT pv.material SEPARATOR ', ') as materials,
                        GROUP_CONCAT(DISTINCT CONCAT(pv.width, 'x', pv.depth, 'x', pv.height) SEPARATOR '; ') as dimensions,
                        GROUP_CONCAT(DISTINCT pv.color SEPARATOR ', ') as colors
                    FROM products p
                    LEFT JOIN categories c ON p.category_id = c.id
                    LEFT JOIN brands b ON p.brand_id = b.id
                    LEFT JOIN product_variants pv ON p.id = pv.product_id
                    WHERE p.id = %s AND p.status = 'ACTIVE'
                    GROUP BY p.id
                    LIMIT 1
                """, (int(product_name_or_id),))
            else:
                # Check if input is a model code (F42, EU01, etc.)
                model_code_match = re.match(r'^([A-Z]{1,3}\d{1,3})$', product_name_or_id.upper())
                
                if model_code_match:
                    model_code = model_code_match.group(1)
                    logger.info(f"[PRODUCT_DETAIL] Searching by model code: {model_code}")
                    
                    await cur.execute("""
                        SELECT 
                            p.id, p.name, p.description, p.price, p.sale_price,
                            p.slug, p.image_url, p.view_count,
                            c.name as category_name, c.slug as category_slug,
                            b.name as brand_name,
                            GROUP_CONCAT(DISTINCT pv.material SEPARATOR ', ') as materials,
                            GROUP_CONCAT(DISTINCT CONCAT(pv.width, 'x', pv.depth, 'x', pv.height) SEPARATOR '; ') as dimensions,
                            GROUP_CONCAT(DISTINCT pv.color SEPARATOR ', ') as colors
                        FROM products p
                        LEFT JOIN categories c ON p.category_id = c.id
                        LEFT JOIN brands b ON p.brand_id = b.id
                        LEFT JOIN product_variants pv ON p.id = pv.product_id
                        WHERE p.status = 'ACTIVE' AND (
                            p.name LIKE %s OR p.name LIKE %s OR p.name LIKE %s
                        )
                        GROUP BY p.id
                        ORDER BY 
                            CASE WHEN p.name LIKE %s THEN 1 
                                 WHEN p.name LIKE %s THEN 2
                                 ELSE 3 END,
                            p.view_count DESC
                        LIMIT 1
                    """, (
                        f"% {model_code}%", f"%{model_code} %", f"%{model_code}%",
                        f"% {model_code}%", f"%{model_code} %"
                    ))
                else:
                    # Search by name with keyword matching
                    keywords = [kw.strip() for kw in product_name_or_id.split() if kw.strip()]
                    if not keywords:
                        keywords = [product_name_or_id]
                    
                    # Build dynamic WHERE clause
                    like_clauses = []
                    params = []
                    for kw in keywords:
                        like_clauses.append("(p.name LIKE %s OR p.description LIKE %s OR p.slug LIKE %s)")
                        kw_param = f"%{kw}%"
                        params.extend([kw_param, kw_param, kw_param])
                    
                    where_sql = " AND ".join(like_clauses)
                    order_param = f"%{keywords[0] if keywords else product_name_or_id}%"
                    
                    sql = f"""
                        SELECT 
                            p.id, p.name, p.description, p.price, p.sale_price,
                            p.slug, p.image_url, p.view_count,
                            c.name as category_name, c.slug as category_slug,
                            b.name as brand_name,
                            GROUP_CONCAT(DISTINCT pv.material SEPARATOR ', ') as materials,
                            GROUP_CONCAT(DISTINCT CONCAT(pv.width, 'x', pv.depth, 'x', pv.height) SEPARATOR '; ') as dimensions,
                            GROUP_CONCAT(DISTINCT pv.color SEPARATOR ', ') as colors
                        FROM products p
                        LEFT JOIN categories c ON p.category_id = c.id
                        LEFT JOIN brands b ON p.brand_id = b.id
                        LEFT JOIN product_variants pv ON p.id = pv.product_id
                        WHERE p.status = 'ACTIVE' AND ({where_sql})
                        GROUP BY p.id
                        ORDER BY 
                            CASE WHEN p.name LIKE %s THEN 1 ELSE 2 END,
                            p.view_count DESC
                        LIMIT 1
                    """
                    params.append(order_param)
                    await cur.execute(sql, params)
            
            row = await cur.fetchone()
            
            if not row:
                return json.dumps({
                    "success": False,
                    "error": "Không tìm thấy sản phẩm",
                    "product_name_or_id": product_name_or_id
                }, ensure_ascii=False)
            
            # Calculate final price
            price = float(row[3]) if row[3] else 0.0
            sale_price = float(row[4]) if row[4] else None
            final_price = sale_price if sale_price else price
            
            product_detail = {
                "success": True,
                "product": {
                    "id": row[0],
                    "name": row[1],
                    "description": row[2] or "",
                    "price": price,
                    "sale_price": sale_price,
                    "final_price": final_price,
                    "slug": row[5] or "",
                    "image_url": row[6] or "",
                    "view_count": row[7] or 0,
                    "category": row[8] or "",
                    "category_slug": row[9] or "",
                    "brand": row[10] or "",
                    "specs": {
                        "materials": row[11] or "",
                        "dimensions": row[12] or "",
                        "colors": row[13] or ""
                    }
                }
            }
            
            logger.info(f"[PRODUCT_DETAIL] Found: {product_detail['product']['name']}")
            return json.dumps(product_detail, ensure_ascii=False)
            
    except Exception as e:
        logger.error(f"[PRODUCT_DETAIL] Error: {e}", exc_info=True)
        return json.dumps({
            "success": False,
            "error": str(e),
            "product_name_or_id": product_name_or_id
        }, ensure_ascii=False)
    finally:
        if conn:
            await release_conn(conn)


async def get_sales_performance_helper(days: int = 30) -> str:
    """
    Get sales performance metrics for the specified period.
    
    Args:
        days: Number of days to analyze
    
    Returns:
        JSON string with sales performance data
    """
    conn = None
    try:
        conn = await get_conn()
        
        async with conn.cursor() as cur:
            await cur.execute("""
                SELECT 
                    DATE_FORMAT(o.created_at, '%%Y-%%m-%%d') as date,
                    COUNT(DISTINCT o.id) as total_orders,
                    COUNT(DISTINCT o.user_id) as unique_customers,
                    SUM(o.total_amount) as total_revenue,
                    AVG(o.total_amount) as avg_order_value
                FROM orders o
                WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL %s DAY)
                GROUP BY DATE_FORMAT(o.created_at, '%%Y-%%m-%%d')
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
        
        return json.dumps({
            "success": True,
            "performance_data": performance_data,
            "summary": summary
        }, ensure_ascii=False)
        
    except Exception as e:
        logger.error(f"[SALES_PERF] Error: {e}", exc_info=True)
        return json.dumps({
            "success": False,
            "error": str(e),
            "performance_data": [],
            "summary": {}
        }, ensure_ascii=False)
    finally:
        if conn:
            await release_conn(conn)


async def get_product_metrics_helper(limit: int = 20) -> str:
    """
    Get product performance metrics.
    
    Args:
        limit: Maximum number of products to return
    
    Returns:
        JSON string with product metrics
    """
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
                    "view_count": row[3] or 0,
                    "order_count": row[4] or 0,
                    "total_quantity": row[5] or 0,
                    "total_revenue": float(row[6] or 0),
                    "avg_selling_price": float(row[7] or 0)
                }
                for row in rows
            ]
        
        return json.dumps({
            "success": True,
            "product_metrics": product_metrics,
            "total_products": len(product_metrics)
        }, ensure_ascii=False)
        
    except Exception as e:
        logger.error(f"[PRODUCT_METRICS] Error: {e}", exc_info=True)
        return json.dumps({
            "success": False,
            "error": str(e),
            "product_metrics": [],
            "total_products": 0
        }, ensure_ascii=False)
    finally:
        if conn:
            await release_conn(conn)


# =============================================================================
# PRIVATE SQL SEARCH HELPER
# =============================================================================

async def _sql_product_search(
    conn, 
    query: str, 
    limit: int, 
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    category: Optional[str] = None,
    attributes: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    Optimized SQL product search with fuzzy matching.
    """
    try:
        async with conn.cursor() as cur:
            where_conditions = []
            params = []
            query_lower = query.lower().strip()
            
            # --- TEXT SEARCH ---
            if len(query_lower) > 0:
                # Common typo corrections
                typo_corrections = {
                    "smark": "smart",
                    "smrt": "smart",
                    "dek": "desk",
                    "ban": "bàn",
                }
                
                # Split query into words
                query_words_raw = [w.strip() for w in query_lower.split() if len(w.strip()) > 1]
                
                # Add corrected words
                query_words = []
                for word in query_words_raw:
                    query_words.append(word)
                    if word in typo_corrections:
                        corrected = typo_corrections[word]
                        if corrected not in query_words:
                            query_words.append(corrected)
                
                if len(query_words) > 1:
                    # Multi-word search: OR logic for flexibility
                    word_clauses = []
                    for word in query_words:
                        word_param = f"%{word}%"
                        word_clauses.append("(p.name LIKE %s OR p.description LIKE %s)")
                        params.extend([word_param, word_param])
                    
                    where_conditions.append(f"({' OR '.join(word_clauses)})")
                else:
                    # Single word search
                    search_param = f"%{query_lower}%"
                    where_conditions.append(
                        "(p.name LIKE %s OR p.description LIKE %s)"
                    )
                    params.extend([search_param, search_param])
            
            # --- ATTRIBUTE FILTERS ---
            if attributes:
                if attributes.get("size"):
                    size_mm = normalize_dimension_to_mm(attributes["size"])
                    if size_mm:
                        where_conditions.append(
                            "EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = 1 AND (pv.width = %s OR pv.depth = %s))"
                        )
                        params.extend([size_mm, size_mm])
                
                if attributes.get("color"):
                    where_conditions.append(
                        "EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = 1 AND pv.color LIKE %s)"
                    )
                    params.append(f"%{attributes['color'].lower()}%")
                
                if attributes.get("material"):
                    where_conditions.append(
                        "EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = 1 AND pv.material LIKE %s)"
                    )
                    params.append(f"%{attributes['material'].lower()}%")
            
            # --- CATEGORY FILTER ---
            if category:
                where_conditions.append("c.name LIKE %s")
                params.append(f"%{category}%")
            
            # --- STATUS FILTER ---
            where_conditions.append("p.status = 'ACTIVE'")
            
            # --- PRICE FILTERS ---
            if min_price is not None:
                where_conditions.append("COALESCE(p.sale_price, p.price) >= %s")
                params.append(min_price)
            
            if max_price is not None:
                where_conditions.append("COALESCE(p.sale_price, p.price) <= %s")
                params.append(max_price)
            
            # --- BUILD QUERY ---
            where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"
            
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
                    b.name as brand_name
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN brands b ON p.brand_id = b.id
                WHERE {where_clause}
                ORDER BY 
                    CASE WHEN p.name LIKE %s THEN 1 ELSE 2 END,
                    p.view_count DESC
                LIMIT %s
            """
            
            params.append(f"%{query_lower}%")
            params.append(limit)
            
            await cur.execute(query_sql, params)
            rows = await cur.fetchall()
            
            return [
                {
                    "id": row[0],
                    "name": row[1],
                    "price": float(row[2]),
                    "description": (row[3] or "")[:200],  # Truncate for performance
                    "slug": row[4] or "",
                    "image_url": row[5],
                    "final_price": float(row[6]) if row[6] else float(row[2]),
                    "sale_price": float(row[7]) if row[7] else None,
                    "category": row[8] or "",
                    "category_slug": row[9] or "",
                    "brand": row[10] or ""
                }
                for row in rows
            ]
            
    except Exception as e:
        logger.error(f"[SQL_SEARCH] Error: {e}", exc_info=True)
        return []
