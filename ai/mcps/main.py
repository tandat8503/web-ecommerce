#!/usr/bin/env python3
"""
E-commerce MCP Tools - Optimized STDIO Server
Following ai-native-todo-task-agent structure
"""

import asyncio
import json
import logging
import sys
from pathlib import Path
from typing import Annotated, List, Dict, Any, Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastmcp import FastMCP
from pydantic import BaseModel
from ddtrace.trace import tracer

from core.db import get_conn, release_conn
from core.exceptions import handle_agent_error, DatabaseError
from services.chatbot.search import ProductSearchService
from services.sentiment.service import SentimentService
from services.analyst.service import AnalystService
from core.utils import extract_time_period, format_currency, safe_json_parse

# Setup logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Initialize FastMCP
mcp = FastMCP("ecommerce")

# Initialize services
product_search_service = ProductSearchService()
sentiment_service = SentimentService()
analyst_service = AnalystService()

# Import ModerationService (will be used by moderate_content tool)
from services.moderation.service import ModerationService
moderation_service = ModerationService()

# Import ReportGeneratorService
from services.report.service import ReportGeneratorService
report_generator_service = ReportGeneratorService()


def trace_tool(resource=None, trace_args=True, trace_return=True):
    """Simple trace decorator"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            with tracer.trace("mcp.tool", service="ecommerce-ai", resource=resource or func.__name__) as span:
                try:
                    if trace_args:
                        span.set_tag("tool.args", json.dumps(args, default=str))
                        span.set_tag("tool.kwargs", json.dumps(kwargs, default=str))
                    result = await func(*args, **kwargs)
                    if trace_return:
                        span.set_tag("tool.result", json.dumps(result, default=str))
                    return result
                except Exception as e:
                    span.set_tag("error", True)
                    span.set_tag("error.msg", str(e))
                    raise
        return wrapper
    return decorator


# =============================================================================
# MCP TOOLS - 7 Tools for E-commerce AI System
# =============================================================================

@mcp.tool(description="Search for products in the e-commerce database using vector search and SQL fallback")
@trace_tool("search_products")
async def search_products(
    query: Annotated[str, "Search query for products"],
    limit: Annotated[int, "Maximum number of results to return"] = 10,
    min_price: Annotated[Optional[float], "Minimum price filter"] = None,
    max_price: Annotated[Optional[float], "Maximum price filter"] = None,
    category: Annotated[Optional[str], "Product category filter"] = None
) -> str:
    """Search for products in the e-commerce database"""
    conn = None
    try:
        conn = await get_conn()
        
        # Try vector search first
        try:
            await product_search_service.build_from_db(conn)
            products = product_search_service.search(query, top_k=limit)
        except Exception as e:
            logger.warning(f"Vector search failed, falling back to SQL: {e}")
            products = await _sql_product_search(conn, query, limit, min_price, max_price, category)
        
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


@mcp.tool(description="Analyze sentiment of customer feedback texts")
@trace_tool("analyze_sentiment")
async def analyze_sentiment(
    texts: Annotated[List[str], "List of texts to analyze for sentiment"],
    product_id: Annotated[Optional[int], "Product ID for context"] = None
) -> str:
    """Analyze sentiment of customer feedback texts"""
    conn = None
    try:
        conn = await get_conn()
        results = await sentiment_service.analyze_texts(conn, texts)
        
        # Calculate summary statistics
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


@mcp.tool(description="Summarize sentiment analysis by product")
@trace_tool("summarize_sentiment_by_product")
async def summarize_sentiment_by_product(
    product_id: Annotated[Optional[int], "Product ID to analyze (None for all products)"] = None
) -> str:
    """Summarize sentiment analysis by product"""
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


@mcp.tool(description="Get revenue analytics for specified period")
@trace_tool("get_revenue_analytics")
async def get_revenue_analytics(
    month: Annotated[Optional[int], "Month for analysis (1-12)"] = None,
    year: Annotated[Optional[int], "Year for analysis"] = None,
    start_date: Annotated[Optional[str], "Start date (YYYY-MM-DD)"] = None,
    end_date: Annotated[Optional[str], "End date (YYYY-MM-DD)"] = None
) -> str:
    """Get revenue analytics for specified period"""
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


@mcp.tool(description="Get sales performance metrics")
@trace_tool("get_sales_performance")
async def get_sales_performance(
    days: Annotated[int, "Number of days to analyze"] = 30
) -> str:
    """Get sales performance metrics"""
    conn = None
    try:
        conn = await get_conn()
        
        async with conn.cursor() as cur:
            await cur.execute("""
                SELECT 
                    DATE_FORMAT(o.order_date, '%Y-%m-%d') as date,
                    COUNT(DISTINCT o.id) as total_orders,
                    COUNT(DISTINCT o.customer_id) as unique_customers,
                    SUM(o.total_amount) as total_revenue,
                    AVG(o.total_amount) as avg_order_value
                FROM orders o
                WHERE o.order_date >= DATE_SUB(NOW(), INTERVAL %s DAY)
                GROUP BY DATE_FORMAT(o.order_date, '%Y-%m-%d')
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
        
        # Calculate summary metrics
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


@mcp.tool(description="Get product performance metrics")
@trace_tool("get_product_metrics")
async def get_product_metrics(
    limit: Annotated[int, "Maximum number of products to return"] = 20
) -> str:
    """Get product performance metrics"""
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
                    SUM(oi.quantity * oi.price) as total_revenue,
                    AVG(oi.price) as avg_selling_price
                FROM products p
                LEFT JOIN order_items oi ON p.id = oi.product_id
                LEFT JOIN orders o ON oi.order_id = o.id
                WHERE o.order_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
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


@mcp.tool(description="Generate comprehensive business report")
@trace_tool("generate_report")
async def generate_report(
    report_type: Annotated[str, "Type of report to generate"] = "summary",
    month: Annotated[Optional[int], "Month for report (1-12)"] = None,
    year: Annotated[Optional[int], "Year for report"] = None,
    include_sentiment: Annotated[bool, "Include sentiment analysis"] = True,
    include_revenue: Annotated[bool, "Include revenue analysis"] = True
) -> str:
    """Generate comprehensive business report"""
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
        
        # Include revenue analysis if requested
        if include_revenue:
            revenue_data = await analyst_service.get_revenue(conn, month=month, year=year)
            report_data["revenue"] = revenue_data
        
        # Include sentiment analysis if requested
        if include_sentiment:
            sentiment_data = await sentiment_service.summarize_by_product(conn)
            report_data["sentiment"] = sentiment_data
        
        # Generate report URL (simplified)
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


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

async def _sql_product_search(
    conn, 
    query: str, 
    limit: int, 
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    category: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Fallback SQL product search"""
    try:
        async with conn.cursor() as cur:
            # Build SQL query with filters
            where_conditions = ["p.name LIKE %s OR p.description LIKE %s"]
            params = [f"%{query}%", f"%{query}%"]
            
            if min_price is not None:
                where_conditions.append("p.price >= %s")
                params.append(min_price)
            
            if max_price is not None:
                where_conditions.append("p.price <= %s")
                params.append(max_price)
            
            if category:
                where_conditions.append("p.category = %s")
                params.append(category)
            
            where_clause = " AND ".join(where_conditions)
            
            query_sql = f"""
                SELECT p.id, p.name, p.price, p.description, p.slug, p.image_url
                FROM products p
                WHERE {where_clause}
                ORDER BY p.view_count DESC, p.created_at DESC
                LIMIT %s
            """
            params.append(limit)
            
            await cur.execute(query_sql, params)
            rows = await cur.fetchall()
            
            return [
                {
                    "id": row[0],
                    "name": row[1],
                    "price": float(row[2]),
                    "description": row[3],
                    "slug": row[4],
                    "image_url": row[5]
                }
                for row in rows
            ]
            
    except Exception as e:
        logger.error(f"Error in SQL product search: {e}")
        return []


@mcp.tool(description="Generate comprehensive HTML visual report with AI insights and recommendations")
@trace_tool("generate_html_report")
async def generate_html_report(
    report_type: Annotated[str, "Type of report: sentiment, revenue, product, customer, business"],
    data: Annotated[str, "JSON string containing report data from analytics tools"],
    title: Annotated[Optional[str], "Custom report title"] = None,
    period: Annotated[Optional[str], "Time period description (e.g. 'Tháng 11/2024')"] = None
) -> str:
    try:
        logger.info(f"Generating {report_type} HTML report for period: {period}")
        
        # Parse data JSON
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


@mcp.tool(description="Moderate user-generated content for inappropriate language and violations")
@trace_tool("moderate_content")
async def moderate_content(
    content: Annotated[str, "The content to moderate (comment, review, etc.)"],
    content_type: Annotated[str, "Type of content: comment, review, chat"] = "comment",
    product_id: Annotated[Optional[int], "Associated product ID for context"] = None,
    user_id: Annotated[Optional[int], "User ID who created the content"] = None
) -> str:
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
            "is_appropriate": True,  # Default to allow if moderation fails
            "violations": [],
            "severity": "low",
            "confidence": 0.0,
            "suggested_action": "review",
            "explanation": f"Lỗi kiểm duyệt: {str(e)}",
            "moderated_content": content
        }, ensure_ascii=False)


# =============================================================================
# MAIN EXECUTION
# =============================================================================

if __name__ == "__main__":
    # Run the MCP server
    mcp.run()