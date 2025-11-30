#!/usr/bin/env python3
"""
MCP Tools for web-ecommerce AI system
"""

# Import MCP tools from main
from .main import (
    search_products,
    analyze_sentiment,
    summarize_sentiment_by_product,
    get_revenue_analytics,
    get_sales_performance,
    get_product_metrics,
    generate_report,
    generate_html_report,
    moderate_content
)

__all__ = [
    "search_products",
    "analyze_sentiment",
    "summarize_sentiment_by_product",
    "get_revenue_analytics",
    "get_sales_performance",
    "get_product_metrics",
    "generate_report",
    "generate_html_report",
    "moderate_content"
]
