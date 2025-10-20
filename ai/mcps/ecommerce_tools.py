#!/usr/bin/env python3
"""
MCP Tools for web-ecommerce AI system
"""

import logging
import asyncio
from typing import List, Dict, Any, Optional, Annotated
from datetime import datetime, timedelta
import json

from fastmcp import FastMCP
from pydantic import BaseModel, Field
from ddtrace.trace import tracer

from ..core.db import get_conn
from ..core.exceptions import handle_agent_error, DatabaseError
from ..services.chatbot.search import ProductSearchService
from ..services.sentiment.service import SentimentService
from ..services.analyst.service import AnalystService
from ..core.utils import extract_time_period, format_currency, safe_json_parse
from .trace import trace_tool

logger = logging.getLogger(__name__)


# =============================================================================
# PYDANTIC MODELS FOR MCP TOOLS
# =============================================================================

class ProductSearchRequest(BaseModel):
    """Request model for product search"""
    query: str = Field(..., description="Search query for products")
    limit: int = Field(default=10, description="Maximum number of results")
    min_price: Optional[float] = Field(None, description="Minimum price filter")
    max_price: Optional[float] = Field(None, description="Maximum price filter")
    category: Optional[str] = Field(None, description="Product category filter")


class ProductSearchResponse(BaseModel):
    """Response model for product search"""
    success: bool = Field(..., description="Whether the search was successful")
    products: List[Dict[str, Any]] = Field(default_factory=list, description="List of found products")
    total_count: int = Field(default=0, description="Total number of products found")
    query: str = Field(..., description="Original search query")
    processing_time: float = Field(default=0.0, description="Processing time in seconds")


class SentimentAnalysisRequest(BaseModel):
    """Request model for sentiment analysis"""
    texts: List[str] = Field(..., description="List of texts to analyze")
    product_id: Optional[int] = Field(None, description="Product ID for context")


class SentimentAnalysisResponse(BaseModel):
    """Response model for sentiment analysis"""
    success: bool = Field(..., description="Whether the analysis was successful")
    results: List[Dict[str, Any]] = Field(default_factory=list, description="Sentiment analysis results")
    summary: Dict[str, Any] = Field(default_factory=dict, description="Summary statistics")
    processing_time: float = Field(default=0.0, description="Processing time in seconds")


class RevenueAnalysisRequest(BaseModel):
    """Request model for revenue analysis"""
    month: Optional[int] = Field(None, description="Month for analysis (1-12)")
    year: Optional[int] = Field(None, description="Year for analysis")
    start_date: Optional[str] = Field(None, description="Start date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="End date (YYYY-MM-DD)")


class RevenueAnalysisResponse(BaseModel):
    """Response model for revenue analysis"""
    success: bool = Field(..., description="Whether the analysis was successful")
    revenue_data: Dict[str, Any] = Field(default_factory=dict, description="Revenue data")
    summary: Dict[str, Any] = Field(default_factory=dict, description="Summary statistics")
    period: Dict[str, Any] = Field(default_factory=dict, description="Analysis period")
    processing_time: float = Field(default=0.0, description="Processing time in seconds")


class ReportGenerationRequest(BaseModel):
    """Request model for report generation"""
    report_type: str = Field(..., description="Type of report to generate")
    month: Optional[int] = Field(None, description="Month for report (1-12)")
    year: Optional[int] = Field(None, description="Year for report")
    include_sentiment: bool = Field(default=True, description="Include sentiment analysis")
    include_revenue: bool = Field(default=True, description="Include revenue analysis")


class ReportGenerationResponse(BaseModel):
    """Response model for report generation"""
    success: bool = Field(..., description="Whether the generation was successful")
    report_url: Optional[str] = Field(None, description="URL to the generated report")
    report_data: Dict[str, Any] = Field(default_factory=dict, description="Report data")
    processing_time: float = Field(default=0.0, description="Processing time in seconds")


# =============================================================================
# MCP TOOLS IMPLEMENTATION
# =============================================================================

class EcommerceMCPTools:
    """MCP Tools for web-ecommerce AI system"""
    
    def __init__(self):
        self.product_search_service = ProductSearchService()
        self.sentiment_service = SentimentService()
        self.analyst_service = AnalystService()
        self.mcp = FastMCP("Web-ecommerce AI Tools")
        self._setup_tools()
    
    def _setup_tools(self):
        """Setup MCP tools"""
        
        @self.mcp.tool()
        @trace_tool("product_search")
        async def search_products(
            query: Annotated[str, "Search query for products"],
            limit: Annotated[int, "Maximum number of results"] = 10,
            min_price: Annotated[Optional[float], "Minimum price filter"] = None,
            max_price: Annotated[Optional[float], "Maximum price filter"] = None,
            category: Annotated[Optional[str], "Product category filter"] = None
        ) -> ProductSearchResponse:
            """
            Search for products in the e-commerce database
            
            Args:
                query: Search query for products
                limit: Maximum number of results to return
                min_price: Optional minimum price filter
                max_price: Optional maximum price filter
                category: Optional product category filter
                
            Returns:
                ProductSearchResponse with search results
            """
            start_time = datetime.now()
            
            try:
                # Get database connection
                conn = await get_conn()
                
                # Perform product search
                search_request = ProductSearchRequest(
                    query=query,
                    limit=limit,
                    min_price=min_price,
                    max_price=max_price,
                    category=category
                )
                
                # Use vector search if available, fallback to SQL
                try:
                    # Try vector search first
                    results = await self.product_search_service.search_products(
                        query=query,
                        limit=limit
                    )
                except Exception as e:
                    logger.warning(f"Vector search failed, falling back to SQL: {e}")
                    # Fallback to SQL search
                    results = await self._sql_product_search(conn, search_request)
                
                processing_time = (datetime.now() - start_time).total_seconds()
                
                return ProductSearchResponse(
                    success=True,
                    products=results,
                    total_count=len(results),
                    query=query,
                    processing_time=processing_time
                )
                
            except Exception as e:
                logger.error(f"Error in product search: {e}")
                processing_time = (datetime.now() - start_time).total_seconds()
                
                return ProductSearchResponse(
                    success=False,
                    products=[],
                    total_count=0,
                    query=query,
                    processing_time=processing_time
                )
        
        @self.mcp.tool()
        @trace_tool("sentiment_analysis")
        async def analyze_sentiment(
            texts: Annotated[List[str], "List of texts to analyze for sentiment"],
            product_id: Annotated[Optional[int], "Product ID for context"] = None
        ) -> SentimentAnalysisResponse:
            """
            Analyze sentiment of customer feedback texts
            
            Args:
                texts: List of texts to analyze
                product_id: Optional product ID for context
                
            Returns:
                SentimentAnalysisResponse with analysis results
            """
            start_time = datetime.now()
            
            try:
                # Get database connection
                conn = await get_conn()
                
                # Perform sentiment analysis
                results = await self.sentiment_service.analyze_texts(conn, texts)
                
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
                
                processing_time = (datetime.now() - start_time).total_seconds()
                
                return SentimentAnalysisResponse(
                    success=True,
                    results=results,
                    summary=summary,
                    processing_time=processing_time
                )
                
            except Exception as e:
                logger.error(f"Error in sentiment analysis: {e}")
                processing_time = (datetime.now() - start_time).total_seconds()
                
                return SentimentAnalysisResponse(
                    success=False,
                    results=[],
                    summary={},
                    processing_time=processing_time
                )
        
        @self.mcp.tool()
        @trace_tool("sentiment_summary")
        async def summarize_sentiment_by_product(
            product_id: Annotated[Optional[int], "Product ID to analyze"] = None
        ) -> SentimentAnalysisResponse:
            """
            Summarize sentiment analysis by product
            
            Args:
                product_id: Optional product ID to analyze (None for all products)
                
            Returns:
                SentimentAnalysisResponse with product sentiment summary
            """
            start_time = datetime.now()
            
            try:
                # Get database connection
                conn = await get_conn()
                
                # Get sentiment summary by product
                summary_data = await self.sentiment_service.summarize_by_product(conn, product_id)
                
                processing_time = (datetime.now() - start_time).total_seconds()
                
                return SentimentAnalysisResponse(
                    success=True,
                    results=summary_data.get("products", []),
                    summary=summary_data.get("overall", {}),
                    processing_time=processing_time
                )
                
            except Exception as e:
                logger.error(f"Error in sentiment summary: {e}")
                processing_time = (datetime.now() - start_time).total_seconds()
                
                return SentimentAnalysisResponse(
                    success=False,
                    results=[],
                    summary={},
                    processing_time=processing_time
                )
        
        @self.mcp.tool()
        @trace_tool("revenue_analysis")
        async def get_revenue_analytics(
            month: Annotated[Optional[int], "Month for analysis (1-12)"] = None,
            year: Annotated[Optional[int], "Year for analysis"] = None,
            start_date: Annotated[Optional[str], "Start date (YYYY-MM-DD)"] = None,
            end_date: Annotated[Optional[str], "End date (YYYY-MM-DD)"] = None
        ) -> RevenueAnalysisResponse:
            """
            Get revenue analytics for specified period
            
            Args:
                month: Optional month for analysis (1-12)
                year: Optional year for analysis
                start_date: Optional start date (YYYY-MM-DD)
                end_date: Optional end date (YYYY-MM-DD)
                
            Returns:
                RevenueAnalysisResponse with revenue data
            """
            start_time = datetime.now()
            
            try:
                # Get database connection
                conn = await get_conn()
                
                # Get revenue data
                revenue_data = await self.analyst_service.get_revenue(
                    conn,
                    month=month,
                    year=year
                )
                
                # Calculate period info
                period = {
                    "month": month,
                    "year": year,
                    "start_date": start_date,
                    "end_date": end_date
                }
                
                processing_time = (datetime.now() - start_time).total_seconds()
                
                return RevenueAnalysisResponse(
                    success=True,
                    revenue_data=revenue_data,
                    summary=revenue_data.get("summary", {}),
                    period=period,
                    processing_time=processing_time
                )
                
            except Exception as e:
                logger.error(f"Error in revenue analysis: {e}")
                processing_time = (datetime.now() - start_time).total_seconds()
                
                return RevenueAnalysisResponse(
                    success=False,
                    revenue_data={},
                    summary={},
                    period={},
                    processing_time=processing_time
                )
        
        @self.mcp.tool()
        @trace_tool("sales_performance")
        async def get_sales_performance(
            days: Annotated[int, "Number of days to analyze"] = 30
        ) -> Dict[str, Any]:
            """
            Get sales performance metrics
            
            Args:
                days: Number of days to analyze
                
            Returns:
                Dictionary with sales performance data
            """
            start_time = datetime.now()
            
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
                
                processing_time = (datetime.now() - start_time).total_seconds()
                
                return {
                    "success": True,
                    "performance_data": performance_data,
                    "summary": summary,
                    "processing_time": processing_time
                }
                
            except Exception as e:
                logger.error(f"Error in sales performance: {e}")
                processing_time = (datetime.now() - start_time).total_seconds()
                
                return {
                    "success": False,
                    "performance_data": [],
                    "summary": {},
                    "processing_time": processing_time,
                    "error": str(e)
                }
        
        @self.mcp.tool()
        @trace_tool("product_metrics")
        async def get_product_metrics(
            limit: Annotated[int, "Maximum number of products to return"] = 20
        ) -> Dict[str, Any]:
            """
            Get product performance metrics
            
            Args:
                limit: Maximum number of products to return
                
            Returns:
                Dictionary with product metrics data
            """
            start_time = datetime.now()
            
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
                
                processing_time = (datetime.now() - start_time).total_seconds()
                
                return {
                    "success": True,
                    "product_metrics": product_metrics,
                    "total_products": len(product_metrics),
                    "processing_time": processing_time
                }
                
            except Exception as e:
                logger.error(f"Error in product metrics: {e}")
                processing_time = (datetime.now() - start_time).total_seconds()
                
                return {
                    "success": False,
                    "product_metrics": [],
                    "total_products": 0,
                    "processing_time": processing_time,
                    "error": str(e)
                }
        
        @self.mcp.tool()
        @trace_tool("generate_report")
        async def generate_report(
            report_type: Annotated[str, "Type of report to generate"] = "summary",
            month: Annotated[Optional[int], "Month for report (1-12)"] = None,
            year: Annotated[Optional[int], "Year for report"] = None,
            include_sentiment: Annotated[bool, "Include sentiment analysis"] = True,
            include_revenue: Annotated[bool, "Include revenue analysis"] = True
        ) -> ReportGenerationResponse:
            """
            Generate comprehensive business report
            
            Args:
                report_type: Type of report to generate
                month: Optional month for report (1-12)
                year: Optional year for report
                include_sentiment: Whether to include sentiment analysis
                include_revenue: Whether to include revenue analysis
                
            Returns:
                ReportGenerationResponse with report data
            """
            start_time = datetime.now()
            
            try:
                # Get database connection
                conn = await get_conn()
                
                report_data = {
                    "report_type": report_type,
                    "generated_at": datetime.now().isoformat(),
                    "period": {
                        "month": month,
                        "year": year
                    }
                }
                
                # Include revenue analysis if requested
                if include_revenue:
                    revenue_data = await self.analyst_service.get_revenue(conn, month=month, year=year)
                    report_data["revenue"] = revenue_data
                
                # Include sentiment analysis if requested
                if include_sentiment:
                    sentiment_data = await self.sentiment_service.summarize_by_product(conn)
                    report_data["sentiment"] = sentiment_data
                
                # Generate report URL (simplified)
                report_url = f"/reports/{report_type}?month={month}&year={year}"
                
                processing_time = (datetime.now() - start_time).total_seconds()
                
                return ReportGenerationResponse(
                    success=True,
                    report_url=report_url,
                    report_data=report_data,
                    processing_time=processing_time
                )
                
            except Exception as e:
                logger.error(f"Error in report generation: {e}")
                processing_time = (datetime.now() - start_time).total_seconds()
                
                return ReportGenerationResponse(
                    success=False,
                    report_url=None,
                    report_data={},
                    processing_time=processing_time
                )
    
    async def _sql_product_search(self, conn, search_request: ProductSearchRequest) -> List[Dict[str, Any]]:
        """Fallback SQL product search"""
        try:
            async with conn.cursor() as cur:
                # Build SQL query with filters
                where_conditions = ["p.name LIKE %s OR p.description LIKE %s"]
                params = [f"%{search_request.query}%", f"%{search_request.query}%"]
                
                if search_request.min_price is not None:
                    where_conditions.append("p.price >= %s")
                    params.append(search_request.min_price)
                
                if search_request.max_price is not None:
                    where_conditions.append("p.price <= %s")
                    params.append(search_request.max_price)
                
                if search_request.category:
                    where_conditions.append("p.category = %s")
                    params.append(search_request.category)
                
                where_clause = " AND ".join(where_conditions)
                
                query = f"""
                    SELECT p.id, p.name, p.price, p.description, p.slug, p.image_url
                    FROM products p
                    WHERE {where_clause}
                    ORDER BY p.view_count DESC, p.created_at DESC
                    LIMIT %s
                """
                params.append(search_request.limit)
                
                await cur.execute(query, params)
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
    
    def get_mcp_server(self):
        """Get the MCP server instance"""
        return self.mcp
