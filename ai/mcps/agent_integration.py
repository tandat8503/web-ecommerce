#!/usr/bin/env python3
"""
Integration between MCP tools and AI agents
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from ..shared.models import AgentRequest, AgentResponse, AgentType
from ..core.exceptions import handle_agent_error, AIAgentError
from .stdio_client import get_mcp_client

logger = logging.getLogger(__name__)


class MCPToolIntegration:
    """Integration layer between MCP tools and AI agents"""
    
    def __init__(self):
        self.mcp_client = None
        self.tool_cache = {}
        self.cache_ttl = 300  # 5 minutes
    
    async def call_tool(self, tool_name: str, **kwargs) -> Dict[str, Any]:
        """
        Call an MCP tool with error handling and caching
        
        Args:
            tool_name: Name of the tool to call
            **kwargs: Tool arguments
            
        Returns:
            Tool response dictionary
        """
        try:
            # Check cache first
            cache_key = f"{tool_name}:{hash(str(sorted(kwargs.items())))}"
            if cache_key in self.tool_cache:
                cached_result, timestamp = self.tool_cache[cache_key]
                if (datetime.now() - timestamp).seconds < self.cache_ttl:
                    logger.debug(f"Using cached result for {tool_name}")
                    return cached_result
            
            # Get MCP client
            if not self.mcp_client:
                self.mcp_client = await get_mcp_client()
            
            # Call the tool via STDIO
            if tool_name == "search_products":
                result = await self.mcp_client.search_products(
                    query=kwargs.get("query", ""),
                    limit=kwargs.get("limit", 10),
                    min_price=kwargs.get("min_price"),
                    max_price=kwargs.get("max_price"),
                    category=kwargs.get("category")
                )
            elif tool_name == "analyze_sentiment":
                result = await self.mcp_client.analyze_sentiment(
                    texts=kwargs.get("texts", []),
                    product_id=kwargs.get("product_id")
                )
            elif tool_name == "summarize_sentiment_by_product":
                result = await self.mcp_client.summarize_sentiment_by_product(
                    product_id=kwargs.get("product_id")
                )
            elif tool_name == "get_revenue_analytics":
                result = await self.mcp_client.get_revenue_analytics(
                    month=kwargs.get("month"),
                    year=kwargs.get("year"),
                    start_date=kwargs.get("start_date"),
                    end_date=kwargs.get("end_date")
                )
            elif tool_name == "get_sales_performance":
                result = await self.mcp_client.get_sales_performance(
                    days=kwargs.get("days", 30)
                )
            elif tool_name == "get_product_metrics":
                result = await self.mcp_client.get_product_metrics(
                    limit=kwargs.get("limit", 20)
                )
            elif tool_name == "generate_report":
                result = await self.mcp_client.generate_report(
                    report_type=kwargs.get("report_type", "summary"),
                    month=kwargs.get("month"),
                    year=kwargs.get("year"),
                    include_sentiment=kwargs.get("include_sentiment", True),
                    include_revenue=kwargs.get("include_revenue", True)
                )
            else:
                raise ValueError(f"Unknown tool: {tool_name}")
            
            # Cache the result
            self.tool_cache[cache_key] = (result, datetime.now())
            
            return result
            
        except Exception as e:
            logger.error(f"Error calling tool {tool_name}: {e}")
            return {
                "success": False,
                "error": str(e),
                "tool_name": tool_name
            }
    
    async def search_products(
        self,
        query: str,
        limit: int = 10,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        category: Optional[str] = None
    ) -> Dict[str, Any]:
        """Search for products using MCP tool"""
        return await self.call_tool(
            "search_products",
            query=query,
            limit=limit,
            min_price=min_price,
            max_price=max_price,
            category=category
        )
    
    async def analyze_sentiment(
        self,
        texts: List[str],
        product_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Analyze sentiment using MCP tool"""
        return await self.call_tool(
            "analyze_sentiment",
            texts=texts,
            product_id=product_id
        )
    
    async def summarize_sentiment_by_product(
        self,
        product_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Summarize sentiment by product using MCP tool"""
        return await self.call_tool(
            "summarize_sentiment_by_product",
            product_id=product_id
        )
    
    async def get_revenue_analytics(
        self,
        month: Optional[int] = None,
        year: Optional[int] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get revenue analytics using MCP tool"""
        return await self.call_tool(
            "get_revenue_analytics",
            month=month,
            year=year,
            start_date=start_date,
            end_date=end_date
        )
    
    async def get_sales_performance(
        self,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get sales performance using MCP tool"""
        return await self.call_tool(
            "get_sales_performance",
            days=days
        )
    
    async def get_product_metrics(
        self,
        limit: int = 20
    ) -> Dict[str, Any]:
        """Get product metrics using MCP tool"""
        return await self.call_tool(
            "get_product_metrics",
            limit=limit
        )
    
    async def generate_report(
        self,
        report_type: str = "summary",
        month: Optional[int] = None,
        year: Optional[int] = None,
        include_sentiment: bool = True,
        include_revenue: bool = True
    ) -> Dict[str, Any]:
        """Generate report using MCP tool"""
        return await self.call_tool(
            "generate_report",
            report_type=report_type,
            month=month,
            year=year,
            include_sentiment=include_sentiment,
            include_revenue=include_revenue
        )
    
    def clear_cache(self):
        """Clear the tool cache"""
        self.tool_cache.clear()
        logger.info("Tool cache cleared")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return {
            "cache_size": len(self.tool_cache),
            "cache_ttl": self.cache_ttl,
            "cached_tools": list(set(key.split(":")[0] for key in self.tool_cache.keys()))
        }


# Global MCP tool integration instance
mcp_integration = MCPToolIntegration()


def get_mcp_integration() -> MCPToolIntegration:
    """Get the global MCP tool integration instance"""
    return mcp_integration
