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

# Import LegalVectorService
from services.legal.vector_service import LegalVectorService
legal_vector_service = LegalVectorService()


def _trace_tool_call(tool_name: str, kwargs: Dict[str, Any], result: Any = None, error: Exception = None):
    """Trace tool call without using decorator (FastMCP doesn't support *args)"""
    try:
        with tracer.trace("mcp.tool", service="ecommerce-ai", resource=tool_name) as span:
            span.set_tag("tool.name", tool_name)
            span.set_tag("tool.kwargs", json.dumps(kwargs, default=str))
            if result is not None:
                span.set_tag("tool.result", json.dumps(result, default=str) if isinstance(result, (dict, list)) else str(result)[:500])
            if error:
                span.set_tag("error", True)
                span.set_tag("error.msg", str(error))
    except Exception:
        pass  # Don't fail if tracing fails


# =============================================================================
# MCP TOOLS - 7 Tools for E-commerce AI System
# =============================================================================

@mcp.tool(description="Search for products in the e-commerce database using vector search and SQL fallback")
async def search_products(
    query: Annotated[str, "Search query for products"],
    limit: Annotated[int, "Maximum number of results to return"] = 10,
    min_price: Annotated[Optional[float], "Minimum price filter in VND"] = None,
    max_price: Annotated[Optional[float], "Maximum price filter in VND"] = None,
    category: Annotated[Optional[str], "Product category filter"] = None,
    attributes: Annotated[Optional[Dict[str, Any]], "Product attributes (color, size, material)"] = None
) -> str:
    """Search for products in the e-commerce database"""
    from mcps.helpers import search_products_helper
    return await search_products_helper(query, limit, min_price, max_price, category, attributes)


@mcp.tool(description="Analyze sentiment of customer feedback texts")
async def analyze_sentiment(
    texts: Annotated[List[str], "List of texts to analyze for sentiment"],
    product_id: Annotated[Optional[int], "Product ID for context"] = None
) -> str:
    """Analyze sentiment of customer feedback texts"""
    from mcps.helpers import analyze_sentiment_helper
    return await analyze_sentiment_helper(texts, product_id)


@mcp.tool(description="Summarize sentiment analysis by product")
async def summarize_sentiment_by_product(
    product_id: Annotated[Optional[int], "Product ID to analyze (None for all products)"] = None
) -> str:
    """Summarize sentiment analysis by product"""
    from mcps.helpers import summarize_sentiment_by_product_helper
    return await summarize_sentiment_by_product_helper(product_id)


@mcp.tool(description="Get revenue analytics for specified period")
async def get_revenue_analytics(
    month: Annotated[Optional[int], "Month for analysis (1-12)"] = None,
    year: Annotated[Optional[int], "Year for analysis"] = None,
    start_date: Annotated[Optional[str], "Start date (YYYY-MM-DD)"] = None,
    end_date: Annotated[Optional[str], "End date (YYYY-MM-DD)"] = None
) -> str:
    """Get revenue analytics for specified period"""
    from mcps.helpers import get_revenue_analytics_helper
    return await get_revenue_analytics_helper(month, year, start_date, end_date)


@mcp.tool(description="Get sales performance metrics")
async def get_sales_performance(
    days: Annotated[int, "Number of days to analyze"] = 30
) -> str:
    """Get sales performance metrics"""
    from mcps.helpers import get_sales_performance_helper
    return await get_sales_performance_helper(days)


@mcp.tool(description="Get product performance metrics")
async def get_product_metrics(
    limit: Annotated[int, "Maximum number of products to return"] = 20
) -> str:
    """Get product performance metrics"""
    from mcps.helpers import get_product_metrics_helper
    return await get_product_metrics_helper(limit)


@mcp.tool(description="Generate comprehensive business report")
async def generate_report(
    report_type: Annotated[str, "Type of report to generate"] = "summary",
    month: Annotated[Optional[int], "Month for report (1-12)"] = None,
    year: Annotated[Optional[int], "Year for report"] = None,
    include_sentiment: Annotated[bool, "Include sentiment analysis"] = True,
    include_revenue: Annotated[bool, "Include revenue analysis"] = True
) -> str:
    """Generate comprehensive business report"""
    from mcps.helpers import generate_report_helper
    return await generate_report_helper(report_type, month, year, include_sentiment, include_revenue)


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
    """Fallback SQL product search with improved matching"""
    try:
        async with conn.cursor() as cur:
            # Build SQL query with filters - using MATCH AGAINST for better fulltext search
            # First try fulltext search if available, then fallback to LIKE
            where_conditions = []
            params = []
            
            # Use fulltext search if query has meaningful keywords
            if len(query.strip()) > 2:
                # Try MATCH AGAINST first (requires fulltext index)
                where_conditions.append("(MATCH(p.name, p.description) AGAINST(%s IN BOOLEAN MODE) OR p.name LIKE %s OR p.description LIKE %s)")
                search_term = f"+{query}*"  # Prefix search
                params.extend([search_term, f"%{query}%", f"%{query}%"])
            else:
                where_conditions.append("(p.name LIKE %s OR p.description LIKE %s)")
                params.extend([f"%{query}%", f"%{query}%"])
            
            # Only show active products
            where_conditions.append("p.status = 'ACTIVE'")
            
            if min_price is not None:
                where_conditions.append("p.price >= %s")
                params.append(min_price)
            
            if max_price is not None:
                where_conditions.append("p.price <= %s")
                params.append(max_price)
            
            if category:
                # Join with categories table if category name provided
                where_conditions.append("c.name LIKE %s")
                params.append(f"%{category}%")
            
            where_clause = " AND ".join(where_conditions)
            
            # Build query with optional category join
            if category:
                query_sql = f"""
                    SELECT p.id, p.name, p.price, p.description, p.slug, p.image_url, 
                           COALESCE(p.sale_price, p.price) as final_price,
                           c.name as category_name, b.name as brand_name
                    FROM products p
                    LEFT JOIN categories c ON p.category_id = c.id
                    LEFT JOIN brands b ON p.brand_id = b.id
                    WHERE {where_clause}
                    ORDER BY 
                        CASE WHEN p.name LIKE %s THEN 1 ELSE 2 END,
                        p.view_count DESC, 
                        p.created_at DESC
                    LIMIT %s
                """
                # Add exact name match for better ranking
                params.append(f"{query}%")
                params.append(limit)
            else:
                query_sql = f"""
                    SELECT p.id, p.name, p.price, p.description, p.slug, p.image_url,
                           COALESCE(p.sale_price, p.price) as final_price,
                           c.name as category_name, b.name as brand_name
                    FROM products p
                    LEFT JOIN categories c ON p.category_id = c.id
                    LEFT JOIN brands b ON p.brand_id = b.id
                    WHERE {where_clause}
                    ORDER BY 
                        CASE WHEN p.name LIKE %s THEN 1 ELSE 2 END,
                        p.view_count DESC, 
                        p.created_at DESC
                    LIMIT %s
                """
                # Add exact name match for better ranking
                params.append(f"{query}%")
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
                    "category": row[7] or "",
                    "brand": row[8] or ""
                }
                for row in rows
            ]
            
    except Exception as e:
        logger.error(f"Error in SQL product search: {e}")
        # Fallback to simple LIKE search if fulltext fails
        try:
            async with conn.cursor() as cur:
                query_sql = """
                    SELECT p.id, p.name, p.price, p.description, p.slug, p.image_url,
                           COALESCE(p.sale_price, p.price) as final_price
                    FROM products p
                    WHERE (p.name LIKE %s OR p.description LIKE %s) 
                      AND p.status = 'ACTIVE'
                    ORDER BY p.view_count DESC, p.created_at DESC
                    LIMIT %s
                """
                await cur.execute(query_sql, [f"%{query}%", f"%{query}%", limit])
                rows = await cur.fetchall()
                
                return [
                    {
                        "id": row[0],
                        "name": row[1],
                        "price": float(row[2]),
                        "description": row[3] or "",
                        "slug": row[4] or "",
                        "image_url": row[5],
                        "final_price": float(row[6]) if row[6] else float(row[2])
                    }
                    for row in rows
                ]
        except Exception as e2:
            logger.error(f"Error in fallback SQL search: {e2}")
            return []


@mcp.tool(description="Generate comprehensive HTML visual report with AI insights and recommendations")
async def generate_html_report(
    report_type: Annotated[str, "Type of report: sentiment, revenue, product, customer, business"],
    data: Annotated[str, "JSON string containing report data from analytics tools"],
    title: Annotated[Optional[str], "Custom report title"] = None,
    period: Annotated[Optional[str], "Time period description (e.g. 'Tháng 11/2024')"] = None
) -> str:
    """Generate comprehensive HTML visual report"""
    from mcps.helpers import generate_html_report_helper
    return await generate_html_report_helper(report_type, data, title, period)


@mcp.tool(description="Moderate user-generated content for inappropriate language and violations")
async def moderate_content(
    content: Annotated[str, "The content to moderate (comment, review, etc.)"],
    content_type: Annotated[str, "Type of content: comment, review, chat"] = "comment",
    product_id: Annotated[Optional[int], "Associated product ID for context"] = None,
    user_id: Annotated[Optional[int], "User ID who created the content"] = None
) -> str:
    """Moderate user-generated content"""
    from mcps.helpers import moderate_content_helper
    return await moderate_content_helper(content, content_type, product_id, user_id)


@mcp.tool(description="Search Vietnamese legal documents (Luật, Nghị định, Thông tư) using semantic search")
async def search_legal_documents(
    query: Annotated[str, "Search query about legal regulations"],
    top_k: Annotated[int, "Number of results to return"] = 5,
    doc_type: Annotated[Optional[str], "Filter by document type: Luật, Nghị định, Thông tư"] = None,
    status: Annotated[str, "Filter by status: active, expired, amended"] = "active"
) -> str:
    """Search Vietnamese legal documents in Vector DB"""
    try:
        _trace_tool_call("search_legal_documents", {"query": query, "top_k": top_k, "doc_type": doc_type, "status": status})
        
        results = legal_vector_service.search(
            query=query,
            top_k=top_k,
            doc_type=doc_type,
            status=status
        )
        
        if not results:
            return json.dumps({
                "success": True,
                "results": [],
                "message": "Không tìm thấy văn bản pháp luật phù hợp"
            }, ensure_ascii=False, indent=2)
        
        # Format results
        formatted_results = []
        for result in results:
            metadata = result.get("metadata", {})
            formatted_results.append({
                "id": result.get("id"),
                "article": metadata.get("article", ""),
                "article_title": metadata.get("article_title", ""),
                "doc_name": metadata.get("doc_name", ""),
                "doc_type": metadata.get("doc_type", ""),
                "chapter": metadata.get("chapter", ""),
                "text": result.get("text", ""),
                "original_text": metadata.get("original_text", ""),
                "distance": result.get("distance")
            })
        
        _trace_tool_call("search_legal_documents", {"query": query}, {"results_count": len(formatted_results)})
        
        return json.dumps({
            "success": True,
            "results": formatted_results,
            "count": len(formatted_results)
        }, ensure_ascii=False, indent=2)
        
    except Exception as e:
        logger.error(f"Error searching legal documents: {e}", exc_info=True)
        _trace_tool_call("search_legal_documents", {"query": query}, error=e)
        return json.dumps({
            "success": False,
            "error": str(e),
            "results": []
        }, ensure_ascii=False, indent=2)


@mcp.tool(description="Consult Vietnamese legal documents - Full RAG pipeline (Search + Context + LLM Generation). Returns natural language answer instead of JSON")
async def consult_legal_documents(
    query: Annotated[str, "Legal question or query"],
    top_k: Annotated[int, "Number of legal documents to retrieve"] = 5,
    doc_type: Annotated[Optional[str], "Filter by document type: Luật, Nghị định, Thông tư"] = None,
    status: Annotated[str, "Filter by status: active, expired, amended"] = "active"
) -> str:
    """
    Consult Vietnamese legal documents using full RAG pipeline.
    This tool performs: Search -> Context Construction -> LLM Generation
    Returns natural language answer instead of raw JSON.
    """
    try:
        _trace_tool_call("consult_legal_documents", {"query": query, "top_k": top_k, "doc_type": doc_type, "status": status})
        
        # Step 1: Search legal documents
        search_results = legal_vector_service.search(
            query=query,
            top_k=top_k,
            doc_type=doc_type,
            status=status
        )
        
        if not search_results:
            return "Xin lỗi, tôi không tìm thấy văn bản pháp luật nào liên quan đến câu hỏi của bạn. Vui lòng thử lại với từ khóa khác hoặc mô tả chi tiết hơn."
        
        # Step 2: Construct context from search results
        context_parts = []
        for i, result in enumerate(search_results, 1):
            metadata = result.get("metadata", {})
            doc_name = metadata.get("doc_name", "Văn bản không rõ")
            doc_type = metadata.get("doc_type", "")
            article = metadata.get("article", "")
            article_title = metadata.get("article_title", "")
            chapter = metadata.get("chapter", "")
            clause = metadata.get("clause", "")
            point = metadata.get("point", "")
            text = result.get("text", "")
            
            # Build source citation
            source_parts = []
            if doc_type:
                source_parts.append(doc_type)
            source_parts.append(doc_name)
            if chapter:
                source_parts.append(chapter)
            if article:
                source_parts.append(article)
            if article_title:
                source_parts.append(f'"{article_title}"')
            if clause:
                source_parts.append(clause)
            if point:
                source_parts.append(f"Điểm {point}")
            
            source = " - ".join(source_parts)
            
            context_parts.append(f"""
Nguồn {i}: {source}
Nội dung: {text}
""")
        
        context = "\n".join(context_parts)
        
        # Step 3: LLM Generation
        from prompts import LEGAL_CONSULTANT_RAG_PROMPT
        from shared.llm_client import LLMClientFactory
        
        prompt = LEGAL_CONSULTANT_RAG_PROMPT.format(
            context=context,
            user_query=query
        )
        
        # Get LLM client
        llm_client = LLMClientFactory.get_client()
        if not llm_client:
            # Fallback: return formatted context
            logger.warning("LLM client not available, returning formatted context")
            return f"Dựa vào các văn bản pháp luật sau đây:\n\n{context}\n\nTrả lời: {query}"
        
        # Generate answer using LLM
        try:
            result = await llm_client.generate_simple(
                prompt=prompt,
                temperature=0.3,  # Lower temperature for more factual responses
                max_tokens=1500
            )
            
            if result.get("success") and result.get("content"):
                answer = result["content"]
                _trace_tool_call("consult_legal_documents", {"query": query}, {"answer_length": len(answer)})
                return answer
            else:
                # Fallback: return formatted context
                logger.warning("LLM generation failed, returning formatted context")
                return f"Dựa vào các văn bản pháp luật sau đây:\n\n{context}\n\nTrả lời: {query}"
        except Exception as llm_error:
            logger.error(f"Error calling LLM: {llm_error}", exc_info=True)
            # Fallback: return formatted context
            return f"Dựa vào các văn bản pháp luật sau đây:\n\n{context}\n\nTrả lời: {query}"
        
    except Exception as e:
        logger.error(f"Error consulting legal documents: {e}", exc_info=True)
        _trace_tool_call("consult_legal_documents", {"query": query}, error=e)
        return f"Xin lỗi, đã xảy ra lỗi khi tư vấn pháp luật: {str(e)}"


@mcp.tool(description="Calculate Personal Income Tax (Thuế TNCN) from gross salary. Use this tool for accurate tax calculation instead of letting LLM calculate")
async def calculate_personal_income_tax(
    gross_salary: Annotated[float, "Gross salary in VND per month"],
    dependents: Annotated[int, "Number of dependents"] = 0,
    region: Annotated[int, "Region code (1-4) for minimum wage. 1=Region I (HN, HCM), 2=Region II, 3=Region III, 4=Region IV"] = 1
) -> str:
    """
    Calculate Personal Income Tax (Thuế Thu Nhập Cá Nhân) accurately using Python.
    This tool ensures accurate calculation and avoids LLM hallucination.
    Includes proper insurance capping (20x base salary for BHXH/BHYT, 20x regional minimum wage for BHTN).
    """
    try:
        _trace_tool_call("calculate_personal_income_tax", {
            "gross_salary": gross_salary,
            "dependents": dependents,
            "region": region
        })
        
        from services.legal.tax_calculator import TaxCalculator, format_tax_result
        
        calculator = TaxCalculator()
        result = calculator.calculate_pit(
            gross_salary=gross_salary,
            dependents=dependents,
            region=region
        )
        
        # Format kết quả trả về cho đẹp để AI dễ đọc
        formatted_result = f"""📊 KẾT QUẢ TÍNH TOÁN LƯƠNG (VND):

💰 Lương Gross: {result['gross_salary']:,.0f} VNĐ/tháng

🏥 Các khoản bảo hiểm:
   - BHXH (8% trên {result['insurance']['base_bhxh_bhyt']:,.0f}): {result['insurance']['BHXH']:,.0f} VNĐ
   - BHYT (1.5% trên {result['insurance']['base_bhxh_bhyt']:,.0f}): {result['insurance']['BHYT']:,.0f} VNĐ
   - BHTN (1% trên {result['insurance']['base_bhtn']:,.0f}): {result['insurance']['BHTN']:,.0f} VNĐ
   - Tổng bảo hiểm: {result['insurance']['total']:,.0f} VNĐ

📉 Các khoản giảm trừ:
   - Giảm trừ bản thân: {result['deductions']['self']:,.0f} VNĐ
   - Giảm trừ người phụ thuộc ({dependents} người): {result['deductions']['dependents']:,.0f} VNĐ
   - Tổng giảm trừ: {result['deductions']['total_deductions_amount']:,.0f} VNĐ

📋 Thu nhập chịu thuế: {result['taxable_income']:,.0f} VNĐ

💸 Thuế TNCN phải nộp: {result['tax_amount']:,.0f} VNĐ/tháng

✅ Lương Net (Thực nhận): {result['net_salary']:,.0f} VNĐ/tháng
"""
        
        _trace_tool_call("calculate_personal_income_tax", {"gross_salary": gross_salary}, {"tax_amount": result.get("tax_amount")})
        
        return formatted_result
        
    except Exception as e:
        logger.error(f"Error calculating personal income tax: {e}", exc_info=True)
        _trace_tool_call("calculate_personal_income_tax", {"gross_salary": gross_salary}, error=e)
        return f"Lỗi khi tính thuế TNCN: {str(e)}"


@mcp.tool(description="Calculate Corporate Income Tax (Thuế TNDN) from revenue and expenses")
async def calculate_corporate_tax(
    revenue: Annotated[float, "Annual revenue in VND"],
    expenses: Annotated[float, "Annual deductible expenses in VND"],
    tax_rate: Annotated[Optional[float], "Tax rate (default 20%)"] = None
) -> str:
    """
    Calculate Corporate Income Tax (Thuế Thu Nhập Doanh Nghiệp) accurately.
    """
    try:
        _trace_tool_call("calculate_corporate_tax", {
            "revenue": revenue,
            "expenses": expenses,
            "tax_rate": tax_rate
        })
        
        from services.legal.tax_calculator import calculate_corporate_tax as calc_tax, format_tax_result
        
        result = calc_tax(
            revenue=revenue,
            expenses=expenses,
            tax_rate=tax_rate
        )
        
        formatted_result = format_tax_result(result, result_type="corporate")
        
        _trace_tool_call("calculate_corporate_tax", {"revenue": revenue}, {"tax_amount": result.get("tax_amount")})
        
        return formatted_result
        
    except Exception as e:
        logger.error(f"Error calculating corporate tax: {e}", exc_info=True)
        _trace_tool_call("calculate_corporate_tax", {"revenue": revenue}, error=e)
        return f"Lỗi khi tính thuế TNDN: {str(e)}"


@mcp.tool(description="Calculate Value Added Tax (Thuế GTGT/VAT)")
async def calculate_vat(
    amount: Annotated[float, "Amount in VND"],
    rate: Annotated[Optional[float], "VAT rate (default 10%, can be 8% for reduced rate)"] = None,
    is_inclusive: Annotated[bool, "True if amount already includes VAT"] = False
) -> str:
    """
    Calculate Value Added Tax (Thuế Giá Trị Gia Tăng) accurately.
    """
    try:
        _trace_tool_call("calculate_vat", {
            "amount": amount,
            "rate": rate,
            "is_inclusive": is_inclusive
        })
        
        from services.legal.tax_calculator import calculate_vat as calc_vat, format_tax_result
        
        result = calc_vat(
            amount=amount,
            rate=rate,
            is_inclusive=is_inclusive
        )
        
        formatted_result = format_tax_result(result, result_type="vat")
        
        _trace_tool_call("calculate_vat", {"amount": amount}, {"vat_amount": result.get("vat_amount")})
        
        return formatted_result
        
    except Exception as e:
        logger.error(f"Error calculating VAT: {e}", exc_info=True)
        _trace_tool_call("calculate_vat", {"amount": amount}, error=e)
        return f"Lỗi khi tính thuế GTGT: {str(e)}"


# =============================================================================
# MAIN EXECUTION
# =============================================================================

if __name__ == "__main__":
    # Run the MCP server
    mcp.run()