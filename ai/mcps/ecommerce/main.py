#!/usr/bin/env python3
"""
E-commerce MCP Tools - STDIO Server
"""

import asyncio
import logging
import sys
from pathlib import Path
from typing import Annotated, List, Dict, Any, Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from fastmcp import FastMCP
from pydantic import BaseModel
from ddtrace.trace import tracer

from core.db import get_conn
from core.exceptions import handle_agent_error, DatabaseError
from services.chatbot.search import ProductSearchService
from services.sentiment.service import SentimentService
from services.analyst.service import AnalystService
from core.utils import extract_time_period, format_currency, safe_json_parse
from mcps.trace import trace_tool

# Setup logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Initialize FastMCP
mcp = FastMCP("ecommerce")

# Initialize services
product_search_service = ProductSearchService()
sentiment_service = SentimentService()
analyst_service = AnalystService()


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class ProductSearchRequest(BaseModel):
    """Request model for product search"""
    query: str
    limit: int = 10
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    category: Optional[str] = None


class SentimentAnalysisRequest(BaseModel):
    """Request model for sentiment analysis"""
    texts: List[str]
    product_id: Optional[int] = None


class RevenueAnalysisRequest(BaseModel):
    """Request model for revenue analysis"""
    month: Optional[int] = None
    year: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


# =============================================================================
# MCP TOOLS
# =============================================================================

@mcp.tool(description="Search for products in the e-commerce database using vector search and SQL fallback")
@trace_tool("ecommerce_search_products")
async def search_products(
    query: Annotated[str, "Search query for products"],
    limit: Annotated[int, "Maximum number of results to return"] = 10,
    min_price: Annotated[Optional[float], "Minimum price filter"] = None,
    max_price: Annotated[Optional[float], "Maximum price filter"] = None,
    category: Annotated[Optional[str], "Product category filter"] = None
) -> str:
    """
    Search for products in the e-commerce database
    
    Args:
        query: Search query for products
        limit: Maximum number of results to return
        min_price: Optional minimum price filter
        max_price: Optional maximum price filter
        category: Optional product category filter
        
    Returns:
        JSON string with search results
    """
    try:
        # Get database connection
        conn = await get_conn()
        
        # Try vector search first
        try:
            await product_search_service.build_from_db(conn)
            products = product_search_service.search(query, top_k=limit)
        except Exception as e:
            logger.warning(f"Vector search failed, falling back to SQL: {e}")
            products = await _sql_product_search(conn, query, limit, min_price, max_price, category)
        
        # Format results
        result = {
            "success": True,
            "products": products,
            "total_count": len(products),
            "query": query
        }
        
        return str(result)
        
    except Exception as e:
        logger.error(f"Error in product search: {e}")
        return str({
            "success": False,
            "error": str(e),
            "products": [],
            "total_count": 0,
            "query": query
        })


@mcp.tool(description="Analyze sentiment of customer feedback texts")
@trace_tool("ecommerce_analyze_sentiment")
async def analyze_sentiment(
    texts: Annotated[List[str], "List of texts to analyze for sentiment"],
    product_id: Annotated[Optional[int], "Product ID for context"] = None
) -> str:
    """
    Analyze sentiment of customer feedback texts
    
    Args:
        texts: List of texts to analyze
        product_id: Optional product ID for context
        
    Returns:
        JSON string with sentiment analysis results
    """
    try:
        # Get database connection
        conn = await get_conn()
        
        # Perform sentiment analysis
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
        
        return str(result)
        
    except Exception as e:
        logger.error(f"Error in sentiment analysis: {e}")
        return str({
            "success": False,
            "error": str(e),
            "results": [],
            "summary": {}
        })


@mcp.tool(description="Summarize sentiment analysis by product")
@trace_tool("ecommerce_summarize_sentiment_by_product")
async def summarize_sentiment_by_product(
    product_id: Annotated[Optional[int], "Product ID to analyze (None for all products)"] = None
) -> str:
    """
    Summarize sentiment analysis by product
    
    Args:
        product_id: Optional product ID to analyze (None for all products)
        
    Returns:
        JSON string with sentiment summary
    """
    try:
        # Get database connection
        conn = await get_conn()
        
        # Get sentiment summary by product
        summary_data = await sentiment_service.summarize_by_product(conn, product_id)
        
        result = {
            "success": True,
            "products": summary_data.get("products", []),
            "overall": summary_data.get("overall", {})
        }
        
        return str(result)
        
    except Exception as e:
        logger.error(f"Error in sentiment summary: {e}")
        return str({
            "success": False,
            "error": str(e),
            "products": [],
            "overall": {}
        })


@mcp.tool(description="Get revenue analytics for specified period")
@trace_tool("ecommerce_get_revenue_analytics")
async def get_revenue_analytics(
    month: Annotated[Optional[int], "Month for analysis (1-12)"] = None,
    year: Annotated[Optional[int], "Year for analysis"] = None,
    start_date: Annotated[Optional[str], "Start date (YYYY-MM-DD)"] = None,
    end_date: Annotated[Optional[str], "End date (YYYY-MM-DD)"] = None
) -> str:
    """
    Get revenue analytics for specified period
    
    Args:
        month: Optional month for analysis (1-12)
        year: Optional year for analysis
        start_date: Optional start date (YYYY-MM-DD)
        end_date: Optional end date (YYYY-MM-DD)
        
    Returns:
        JSON string with revenue data
    """
    try:
        # Get database connection
        conn = await get_conn()
        
        # Get revenue data
        revenue_data = await analyst_service.get_revenue(conn, month=month, year=year)
        
        # Calculate period info
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
        
        return str(result)
        
    except Exception as e:
        logger.error(f"Error in revenue analysis: {e}")
        return str({
            "success": False,
            "error": str(e),
            "revenue_data": {},
            "summary": {},
            "period": {}
        })


@mcp.tool(description="Get sales performance metrics")
@trace_tool("ecommerce_get_sales_performance")
async def get_sales_performance(
    days: Annotated[int, "Number of days to analyze"] = 30
) -> str:
    """
    Get sales performance metrics
    
    Args:
        days: Number of days to analyze
        
    Returns:
        JSON string with sales performance data
    """
    try:
        # Get database connection
        conn = await get_conn()
        
        # Get sales performance data
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
        
        return str(result)
        
    except Exception as e:
        logger.error(f"Error in sales performance: {e}")
        return str({
            "success": False,
            "error": str(e),
            "performance_data": [],
            "summary": {}
        })


@mcp.tool(description="Get product performance metrics")
@trace_tool("ecommerce_get_product_metrics")
async def get_product_metrics(
    limit: Annotated[int, "Maximum number of products to return"] = 20
) -> str:
    """
    Get product performance metrics
    
    Args:
        limit: Maximum number of products to return
        
    Returns:
        JSON string with product metrics data
    """
    try:
        # Get database connection
        conn = await get_conn()
        
        # Get product metrics
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
        
        return str(result)
        
    except Exception as e:
        logger.error(f"Error in product metrics: {e}")
        return str({
            "success": False,
            "error": str(e),
            "product_metrics": [],
            "total_products": 0
        })


@mcp.tool(description="Generate comprehensive business report")
@trace_tool("ecommerce_generate_report")
async def generate_report(
    report_type: Annotated[str, "Type of report to generate"] = "summary",
    month: Annotated[Optional[int], "Month for report (1-12)"] = None,
    year: Annotated[Optional[int], "Year for report"] = None,
    include_sentiment: Annotated[bool, "Include sentiment analysis"] = True,
    include_revenue: Annotated[bool, "Include revenue analysis"] = True
) -> str:
    """
    Generate comprehensive business report
    
    Args:
        report_type: Type of report to generate
        month: Optional month for report (1-12)
        year: Optional year for report
        include_sentiment: Whether to include sentiment analysis
        include_revenue: Whether to include revenue analysis
        
    Returns:
        JSON string with report data
    """
    try:
        # Get database connection
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
        
        return str(result)
        
    except Exception as e:
        logger.error(f"Error in report generation: {e}")
        return str({
            "success": False,
            "error": str(e),
            "report_url": None,
            "report_data": {}
        })


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


# =============================================================================
# MAIN EXECUTION
# =============================================================================

if __name__ == "__main__":
    # Run the MCP server
    mcp.run()
