#!/usr/bin/env python3
"""
Admin Chatbot Agent
Provides business intelligence and analytics services for administrators
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import asyncio
from ddtrace.trace import tracer

from ...shared.models import (
    AgentRequest, AgentResponse, AgentStep, AgentStepOutput,
    RevenueAnalysisRequest, SentimentAnalysisRequest, ReportGenerationRequest,
    AgentType
)
from ...shared.llm_client import LLMClientFactory, generate_business_insights
from ...core.db import get_conn
from ...mcps.agent_integration import get_mcp_integration
from ...services.analyst.service import AnalystService
from ...services.sentiment.service import SentimentService
from .prompts import (
    ADMIN_CHATBOT_SYSTEM_PROMPT,
    ADMIN_CHATBOT_REVENUE_ANALYSIS_PROMPT,
    ADMIN_CHATBOT_SENTIMENT_ANALYSIS_PROMPT,
    ADMIN_CHATBOT_PRODUCT_PERFORMANCE_PROMPT,
    ADMIN_CHATBOT_BUSINESS_INSIGHTS_PROMPT,
    ADMIN_CHATBOT_REPORT_GENERATION_PROMPT,
    ADMIN_CHATBOT_ERROR_HANDLING_PROMPT,
    ADMIN_CHATBOT_GREETING_PROMPT,
    ADMIN_CHATBOT_HELP_PROMPT
)

logger = logging.getLogger(__name__)


class AdminChatbotAgent:
    """Admin Chatbot Agent for business intelligence and analytics"""
    
    def __init__(self):
        self.agent_type = AgentType.ADMIN_CHATBOT
        self.analyst_service = AnalystService()
        self.sentiment_service = SentimentService()
        self.llm_client = LLMClientFactory.create_client()
        self.mcp_integration = get_mcp_integration()
        self.capabilities = {
            "can_search_products": False,
            "can_analyze_sentiment": True,
            "can_analyze_revenue": True,
            "can_generate_reports": True,
            "can_use_tools": True,
            "max_context_length": 8000,
            "supported_languages": ["vi", "en"]
        }
    
    @tracer.trace("admin_chatbot.process_request")
    async def process_request(self, request: AgentRequest) -> AgentResponse:
        """Process an admin chatbot request"""
        start_time = datetime.now()
        
        try:
            # Create initial step
            step = AgentStep(
                task=f"Process admin request: {request.message[:100]}...",
                expectation="Provide business intelligence and analytics",
                reason="Admin needs business insights",
                step_type="analyze",
                agent_type=self.agent_type
            )
            
            # Process the request
            result = await self._handle_admin_message(request)
            
            # Create step output
            step_output = AgentStepOutput(
                step_id=step.id,
                agent_type=self.agent_type,
                full=result.get("message", ""),
                summary=result.get("summary", ""),
                data=result.get("data", {}),
                metadata=result.get("metadata", {})
            )
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return AgentResponse(
                request_id=request.request_id,
                agent_type=self.agent_type,
                success=result.get("success", True),
                message=result.get("message", ""),
                data=result.get("data", {}),
                steps=[step_output],
                metadata=result.get("metadata", {}),
                processing_time=processing_time
            )
            
        except Exception as e:
            logger.error(f"Error processing admin request: {e}")
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return AgentResponse(
                request_id=request.request_id,
                agent_type=self.agent_type,
                success=False,
                message="Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu. Vui lòng thử lại sau.",
                metadata={"error": str(e)},
                processing_time=processing_time
            )
    
    async def _handle_admin_message(self, request: AgentRequest) -> Dict[str, Any]:
        """Handle admin message and determine response type"""
        message = request.message.lower().strip()
        
        # Determine intent
        intent = await self._classify_intent(message)
        
        if intent == "greeting":
            return await self._handle_greeting(request)
        elif intent == "revenue_analysis":
            return await self._handle_revenue_analysis(request)
        elif intent == "sentiment_analysis":
            return await self._handle_sentiment_analysis(request)
        elif intent == "product_performance":
            return await self._handle_product_performance(request)
        elif intent == "business_insights":
            return await self._handle_business_insights(request)
        elif intent == "report_generation":
            return await self._handle_report_generation(request)
        elif intent == "help":
            return await self._handle_help(request)
        else:
            return await self._handle_general_query(request)
    
    async def _classify_intent(self, message: str) -> str:
        """Classify admin intent from message"""
        greeting_keywords = ["xin chào", "hello", "hi", "chào", "bắt đầu"]
        revenue_keywords = ["doanh thu", "revenue", "bán hàng", "sales", "tài chính"]
        sentiment_keywords = ["sentiment", "cảm xúc", "đánh giá", "bình luận", "feedback"]
        product_keywords = ["sản phẩm", "product", "hiệu suất", "performance", "bán chạy"]
        insights_keywords = ["insights", "phân tích", "báo cáo", "tổng hợp", "kinh doanh"]
        report_keywords = ["báo cáo", "report", "tạo", "generate", "xuất"]
        help_keywords = ["help", "hướng dẫn", "giúp", "có thể làm gì"]
        
        if any(keyword in message for keyword in greeting_keywords):
            return "greeting"
        elif any(keyword in message for keyword in revenue_keywords):
            return "revenue_analysis"
        elif any(keyword in message for keyword in sentiment_keywords):
            return "sentiment_analysis"
        elif any(keyword in message for keyword in product_keywords):
            return "product_performance"
        elif any(keyword in message for keyword in insights_keywords):
            return "business_insights"
        elif any(keyword in message for keyword in report_keywords):
            return "report_generation"
        elif any(keyword in message for keyword in help_keywords):
            return "help"
        else:
            return "general_query"
    
    async def _handle_greeting(self, request: AgentRequest) -> Dict[str, Any]:
        """Handle greeting messages"""
        if not self.llm_client:
            return {
                "success": True,
                "message": "Xin chào! Tôi là trợ lý phân tích kinh doanh. Tôi có thể giúp bạn phân tích doanh thu, sentiment khách hàng, hiệu suất sản phẩm và tạo báo cáo. Bạn cần phân tích gì?",
                "summary": "Greeting response",
                "data": {"intent": "greeting"}
            }
        
        result = await self.llm_client.generate_simple(
            prompt=ADMIN_CHATBOT_GREETING_PROMPT,
            system_instruction=ADMIN_CHATBOT_SYSTEM_PROMPT,
            temperature=0.7
        )
        
        return {
            "success": result.get("success", True),
            "message": result.get("content", "Xin chào! Tôi có thể giúp gì cho bạn?"),
            "summary": "Greeting response",
            "data": {"intent": "greeting"}
        }
    
    async def _handle_revenue_analysis(self, request: AgentRequest) -> Dict[str, Any]:
        """Handle revenue analysis requests"""
        try:
            # Extract time period from message
            period_info = await self._extract_time_period(request.message)
            
            # Get revenue data using MCP tool
            revenue_result = await self.mcp_integration.get_revenue_analytics(
                month=period_info.get("month"),
                year=period_info.get("year")
            )
            
            if not revenue_result.get("success"):
                return {
                    "success": True,
                    "message": "Không thể lấy dữ liệu doanh thu. Vui lòng thử lại sau.",
                    "summary": "Revenue data error",
                    "data": {"intent": "revenue_analysis", "error": revenue_result.get("error")}
                }
            
            revenue_data = revenue_result.get("revenue_data", {})
            
            if not revenue_data.get("data"):
                return {
                    "success": True,
                    "message": "Không có dữ liệu doanh thu cho khoảng thời gian này. Vui lòng kiểm tra lại hoặc chọn khoảng thời gian khác.",
                    "summary": "No revenue data",
                    "data": {"intent": "revenue_analysis", "data": revenue_data}
                }
            
            # Generate analysis using Gemini Pro
            if self.llm_client:
                result = await self.llm_client.generate_simple(
                    prompt=ADMIN_CHATBOT_REVENUE_ANALYSIS_PROMPT.format(
                        user_query=request.message,
                        revenue_data=self._format_revenue_data(revenue_data)
                    ),
                    system_instruction=ADMIN_CHATBOT_SYSTEM_PROMPT,
                    temperature=0.5
                )
                
                message = result.get("content", "Không thể phân tích dữ liệu doanh thu.")
            else:
                message = self._format_revenue_analysis_simple(revenue_data)
            
            return {
                "success": True,
                "message": message,
                "summary": f"Revenue analysis for {period_info}",
                "data": {
                    "intent": "revenue_analysis",
                    "revenue_data": revenue_data,
                    "period": period_info
                }
            }
            
        except Exception as e:
            logger.error(f"Error in revenue analysis: {e}")
            return await self._handle_error(request, str(e))
    
    async def _handle_sentiment_analysis(self, request: AgentRequest) -> Dict[str, Any]:
        """Handle sentiment analysis requests"""
        try:
            # Get sentiment data
            conn = await get_conn()
            sentiment_data = await self.sentiment_service.summarize_by_product(conn)
            
            if not sentiment_data.get("products"):
                return {
                    "success": True,
                    "message": "Không có dữ liệu sentiment để phân tích. Vui lòng kiểm tra lại sau.",
                    "summary": "No sentiment data",
                    "data": {"intent": "sentiment_analysis", "data": sentiment_data}
                }
            
            # Generate analysis using Gemini Pro
            if self.llm_client:
                result = await self.llm_client.generate_simple(
                    prompt=ADMIN_CHATBOT_SENTIMENT_ANALYSIS_PROMPT.format(
                        user_query=request.message,
                        sentiment_data=self._format_sentiment_data(sentiment_data)
                    ),
                    system_instruction=ADMIN_CHATBOT_SYSTEM_PROMPT,
                    temperature=0.5
                )
                
                message = result.get("content", "Không thể phân tích dữ liệu sentiment.")
            else:
                message = self._format_sentiment_analysis_simple(sentiment_data)
            
            return {
                "success": True,
                "message": message,
                "summary": f"Sentiment analysis with {len(sentiment_data.get('products', []))} products",
                "data": {
                    "intent": "sentiment_analysis",
                    "sentiment_data": sentiment_data
                }
            }
            
        except Exception as e:
            logger.error(f"Error in sentiment analysis: {e}")
            return await self._handle_error(request, str(e))
    
    async def _handle_product_performance(self, request: AgentRequest) -> Dict[str, Any]:
        """Handle product performance analysis requests"""
        try:
            # Get product performance data
            conn = await get_conn()
            product_data = await self._get_product_performance_data(conn)
            
            if not product_data:
                return {
                    "success": True,
                    "message": "Không có dữ liệu hiệu suất sản phẩm để phân tích. Vui lòng kiểm tra lại sau.",
                    "summary": "No product performance data",
                    "data": {"intent": "product_performance"}
                }
            
            # Generate analysis using Gemini Pro
            if self.llm_client:
                result = await self.llm_client.generate_simple(
                    prompt=ADMIN_CHATBOT_PRODUCT_PERFORMANCE_PROMPT.format(
                        user_query=request.message,
                        product_data=self._format_product_performance_data(product_data)
                    ),
                    system_instruction=ADMIN_CHATBOT_SYSTEM_PROMPT,
                    temperature=0.5
                )
                
                message = result.get("content", "Không thể phân tích hiệu suất sản phẩm.")
            else:
                message = self._format_product_performance_simple(product_data)
            
            return {
                "success": True,
                "message": message,
                "summary": f"Product performance analysis with {len(product_data)} products",
                "data": {
                    "intent": "product_performance",
                    "product_data": product_data
                }
            }
            
        except Exception as e:
            logger.error(f"Error in product performance analysis: {e}")
            return await self._handle_error(request, str(e))
    
    async def _handle_business_insights(self, request: AgentRequest) -> Dict[str, Any]:
        """Handle business insights requests"""
        try:
            # Get combined business data
            conn = await get_conn()
            
            # Get revenue data
            revenue_data = await self.analyst_service.get_revenue(conn)
            
            # Get sentiment data
            sentiment_data = await self.sentiment_service.summarize_by_product(conn)
            
            # Get product performance data
            product_data = await self._get_product_performance_data(conn)
            
            combined_data = {
                "revenue": revenue_data,
                "sentiment": sentiment_data,
                "products": product_data
            }
            
            # Generate insights using Gemini Pro
            if self.llm_client:
                result = await self.llm_client.generate_simple(
                    prompt=ADMIN_CHATBOT_BUSINESS_INSIGHTS_PROMPT.format(
                        user_query=request.message,
                        combined_data=self._format_combined_data(combined_data)
                    ),
                    system_instruction=ADMIN_CHATBOT_SYSTEM_PROMPT,
                    temperature=0.5
                )
                
                message = result.get("content", "Không thể tạo business insights.")
            else:
                message = self._format_business_insights_simple(combined_data)
            
            return {
                "success": True,
                "message": message,
                "summary": "Business insights analysis",
                "data": {
                    "intent": "business_insights",
                    "combined_data": combined_data
                }
            }
            
        except Exception as e:
            logger.error(f"Error in business insights: {e}")
            return await self._handle_error(request, str(e))
    
    async def _handle_report_generation(self, request: AgentRequest) -> Dict[str, Any]:
        """Handle report generation requests"""
        try:
            # Extract report type from message
            report_type = await self._extract_report_type(request.message)
            
            # Get data for report
            conn = await get_conn()
            revenue_data = await self.analyst_service.get_revenue(conn)
            sentiment_data = await self.sentiment_service.summarize_by_product(conn)
            
            report_data = {
                "revenue": revenue_data,
                "sentiment": sentiment_data,
                "generated_at": datetime.now().isoformat()
            }
            
            # Generate report using Gemini Pro
            if self.llm_client:
                result = await self.llm_client.generate_simple(
                    prompt=ADMIN_CHATBOT_REPORT_GENERATION_PROMPT.format(
                        user_query=request.message,
                        report_type=report_type,
                        report_data=self._format_report_data(report_data)
                    ),
                    system_instruction=ADMIN_CHATBOT_SYSTEM_PROMPT,
                    temperature=0.5
                )
                
                message = result.get("content", "Không thể tạo báo cáo.")
            else:
                message = self._format_report_simple(report_data, report_type)
            
            return {
                "success": True,
                "message": message,
                "summary": f"Report generation: {report_type}",
                "data": {
                    "intent": "report_generation",
                    "report_type": report_type,
                    "report_data": report_data
                }
            }
            
        except Exception as e:
            logger.error(f"Error in report generation: {e}")
            return await self._handle_error(request, str(e))
    
    async def _handle_help(self, request: AgentRequest) -> Dict[str, Any]:
        """Handle help requests"""
        if not self.llm_client:
            return {
                "success": True,
                "message": """
**Các tính năng phân tích có sẵn:**

1. **Phân tích doanh thu** - "Thống kê doanh thu tháng 3", "Báo cáo doanh thu năm 2024"
2. **Phân tích sentiment** - "Phân tích đánh giá khách hàng", "Sentiment sản phẩm"
3. **Hiệu suất sản phẩm** - "Sản phẩm bán chạy", "Hiệu suất theo danh mục"
4. **Business insights** - "Tổng hợp kinh doanh", "Phân tích tổng thể"
5. **Tạo báo cáo** - "Tạo báo cáo HTML", "Xuất báo cáo PDF"

Bạn cần phân tích gì cụ thể?
                """.strip(),
                "summary": "Help response",
                "data": {"intent": "help"}
            }
        
        result = await self.llm_client.generate_simple(
            prompt=ADMIN_CHATBOT_HELP_PROMPT,
            system_instruction=ADMIN_CHATBOT_SYSTEM_PROMPT,
            temperature=0.7
        )
        
        return {
            "success": result.get("success", True),
            "message": result.get("content", "Tôi có thể giúp gì cho bạn?"),
            "summary": "Help response",
            "data": {"intent": "help"}
        }
    
    async def _handle_general_query(self, request: AgentRequest) -> Dict[str, Any]:
        """Handle general queries"""
        return {
            "success": True,
            "message": "Tôi có thể giúp bạn phân tích doanh thu, sentiment khách hàng, hiệu suất sản phẩm và tạo báo cáo. Bạn cần phân tích gì cụ thể?",
            "summary": "General query response",
            "data": {"intent": "general_query"}
        }
    
    async def _handle_error(self, request: AgentRequest, error: str) -> Dict[str, Any]:
        """Handle errors"""
        if not self.llm_client:
            return {
                "success": False,
                "message": "Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu. Vui lòng thử lại sau hoặc liên hệ kỹ thuật để được hỗ trợ.",
                "summary": "Error occurred",
                "data": {"intent": "error", "error": error}
            }
        
        result = await self.llm_client.generate_simple(
            prompt=ADMIN_CHATBOT_ERROR_HANDLING_PROMPT.format(
                error_message=error,
                user_query=request.message
            ),
            system_instruction=ADMIN_CHATBOT_SYSTEM_PROMPT,
            temperature=0.7
        )
        
        return {
            "success": False,
            "message": result.get("content", "Xin lỗi, có lỗi xảy ra."),
            "summary": "Error occurred",
            "data": {"intent": "error", "error": error}
        }
    
    async def _extract_time_period(self, message: str) -> Dict[str, Any]:
        """Extract time period from message"""
        import re
        
        period_info = {}
        
        # Extract month
        month_match = re.search(r"tháng\s*(\d{1,2})", message)
        if month_match:
            period_info["month"] = int(month_match.group(1))
        
        # Extract year
        year_match = re.search(r"năm\s*(\d{4})", message)
        if year_match:
            period_info["year"] = int(year_match.group(1))
        
        return period_info
    
    async def _extract_report_type(self, message: str) -> str:
        """Extract report type from message"""
        if "chi tiết" in message or "detailed" in message:
            return "detailed"
        elif "executive" in message or "tổng hợp" in message:
            return "executive"
        else:
            return "summary"
    
    async def _get_product_performance_data(self, conn) -> List[Dict[str, Any]]:
        """Get product performance data"""
        try:
            async with conn.cursor() as cur:
                await cur.execute("""
                    SELECT 
                        p.id,
                        p.name,
                        p.price,
                        p.view_count,
                        COUNT(oi.id) as order_count,
                        SUM(oi.quantity) as total_quantity,
                        SUM(oi.quantity * oi.price) as total_revenue
                    FROM products p
                    LEFT JOIN order_items oi ON p.id = oi.product_id
                    LEFT JOIN orders o ON oi.order_id = o.id
                    GROUP BY p.id, p.name, p.price, p.view_count
                    ORDER BY total_revenue DESC
                    LIMIT 20
                """)
                rows = await cur.fetchall()
                
                return [
                    {
                        "id": r[0],
                        "name": r[1],
                        "price": float(r[2]),
                        "view_count": r[3],
                        "order_count": r[4] or 0,
                        "total_quantity": r[5] or 0,
                        "total_revenue": float(r[6] or 0)
                    }
                    for r in rows
                ]
        except Exception as e:
            logger.error(f"Error getting product performance data: {e}")
            return []
    
    def _format_revenue_data(self, revenue_data: Dict[str, Any]) -> str:
        """Format revenue data for LLM"""
        data_points = revenue_data.get("data", [])
        summary = revenue_data.get("summary", {})
        
        lines = []
        lines.append(f"Tổng doanh thu: {summary.get('total', 0):,.0f}đ")
        lines.append(f"Số điểm dữ liệu: {len(data_points)}")
        lines.append("\nChi tiết theo tháng:")
        
        for point in data_points:
            lines.append(f"- {point.get('month', 'N/A')}: {point.get('revenue', 0):,.0f}đ")
        
        return "\n".join(lines)
    
    def _format_sentiment_data(self, sentiment_data: Dict[str, Any]) -> str:
        """Format sentiment data for LLM"""
        products = sentiment_data.get("products", [])
        overall = sentiment_data.get("overall", {})
        
        lines = []
        lines.append(f"Tổng quan sentiment:")
        lines.append(f"- Tích cực: {overall.get('positive', 0)}")
        lines.append(f"- Trung tính: {overall.get('neutral', 0)}")
        lines.append(f"- Tiêu cực: {overall.get('negative', 0)}")
        lines.append(f"\nSản phẩm cần chú ý (top 5):")
        
        for product in products[:5]:
            counts = product.get("counts", {})
            lines.append(f"- Sản phẩm {product.get('product_id', 'N/A')}: "
                        f"Tích cực {counts.get('positive', 0)}, "
                        f"Tiêu cực {counts.get('negative', 0)}")
        
        return "\n".join(lines)
    
    def _format_product_performance_data(self, product_data: List[Dict[str, Any]]) -> str:
        """Format product performance data for LLM"""
        lines = []
        lines.append(f"Hiệu suất sản phẩm (top {len(product_data)}):")
        
        for i, product in enumerate(product_data, 1):
            lines.append(f"{i}. {product.get('name', 'N/A')}")
            lines.append(f"   - Giá: {product.get('price', 0):,.0f}đ")
            lines.append(f"   - Lượt xem: {product.get('view_count', 0)}")
            lines.append(f"   - Số đơn hàng: {product.get('order_count', 0)}")
            lines.append(f"   - Tổng doanh thu: {product.get('total_revenue', 0):,.0f}đ")
            lines.append("")
        
        return "\n".join(lines)
    
    def _format_combined_data(self, combined_data: Dict[str, Any]) -> str:
        """Format combined data for LLM"""
        lines = []
        
        # Revenue summary
        revenue = combined_data.get("revenue", {})
        lines.append("DOANH THU:")
        lines.append(f"- Tổng: {revenue.get('summary', {}).get('total', 0):,.0f}đ")
        lines.append(f"- Số điểm dữ liệu: {len(revenue.get('data', []))}")
        
        # Sentiment summary
        sentiment = combined_data.get("sentiment", {})
        overall = sentiment.get("overall", {})
        lines.append("\nSENTIMENT:")
        lines.append(f"- Tích cực: {overall.get('positive', 0)}")
        lines.append(f"- Trung tính: {overall.get('neutral', 0)}")
        lines.append(f"- Tiêu cực: {overall.get('negative', 0)}")
        
        # Product performance summary
        products = combined_data.get("products", [])
        lines.append(f"\nSẢN PHẨM:")
        lines.append(f"- Tổng số sản phẩm: {len(products)}")
        if products:
            total_revenue = sum(p.get("total_revenue", 0) for p in products)
            lines.append(f"- Tổng doanh thu sản phẩm: {total_revenue:,.0f}đ")
        
        return "\n".join(lines)
    
    def _format_report_data(self, report_data: Dict[str, Any]) -> str:
        """Format report data for LLM"""
        return self._format_combined_data(report_data)
    
    def _format_revenue_analysis_simple(self, revenue_data: Dict[str, Any]) -> str:
        """Simple formatting for revenue analysis"""
        data_points = revenue_data.get("data", [])
        summary = revenue_data.get("summary", {})
        
        lines = []
        lines.append(f"**Phân tích doanh thu:**")
        lines.append(f"- Tổng doanh thu: {summary.get('total', 0):,.0f}đ")
        lines.append(f"- Số tháng có dữ liệu: {len(data_points)}")
        
        if data_points:
            lines.append(f"- Tháng cao nhất: {max(data_points, key=lambda x: x.get('revenue', 0)).get('month', 'N/A')}")
            lines.append(f"- Tháng thấp nhất: {min(data_points, key=lambda x: x.get('revenue', 0)).get('month', 'N/A')}")
        
        return "\n".join(lines)
    
    def _format_sentiment_analysis_simple(self, sentiment_data: Dict[str, Any]) -> str:
        """Simple formatting for sentiment analysis"""
        products = sentiment_data.get("products", [])
        overall = sentiment_data.get("overall", {})
        
        lines = []
        lines.append(f"**Phân tích sentiment:**")
        lines.append(f"- Tổng bình luận: {sum(overall.values())}")
        lines.append(f"- Tích cực: {overall.get('positive', 0)} ({overall.get('positive', 0)/sum(overall.values())*100:.1f}%)")
        lines.append(f"- Trung tính: {overall.get('neutral', 0)} ({overall.get('neutral', 0)/sum(overall.values())*100:.1f}%)")
        lines.append(f"- Tiêu cực: {overall.get('negative', 0)} ({overall.get('negative', 0)/sum(overall.values())*100:.1f}%)")
        
        if products:
            lines.append(f"\n**Sản phẩm cần chú ý:**")
            for product in products[:3]:
                counts = product.get("counts", {})
                lines.append(f"- Sản phẩm {product.get('product_id', 'N/A')}: "
                            f"Tiêu cực {counts.get('negative', 0)}")
        
        return "\n".join(lines)
    
    def _format_product_performance_simple(self, product_data: List[Dict[str, Any]]) -> str:
        """Simple formatting for product performance"""
        lines = []
        lines.append(f"**Hiệu suất sản phẩm (top {len(product_data)}):**")
        
        for i, product in enumerate(product_data[:5], 1):
            lines.append(f"{i}. {product.get('name', 'N/A')}")
            lines.append(f"   - Doanh thu: {product.get('total_revenue', 0):,.0f}đ")
            lines.append(f"   - Đơn hàng: {product.get('order_count', 0)}")
            lines.append(f"   - Lượt xem: {product.get('view_count', 0)}")
        
        return "\n".join(lines)
    
    def _format_business_insights_simple(self, combined_data: Dict[str, Any]) -> str:
        """Simple formatting for business insights"""
        lines = []
        lines.append("**Tổng quan kinh doanh:**")
        
        # Revenue insights
        revenue = combined_data.get("revenue", {})
        lines.append(f"- Doanh thu: {revenue.get('summary', {}).get('total', 0):,.0f}đ")
        
        # Sentiment insights
        sentiment = combined_data.get("sentiment", {})
        overall = sentiment.get("overall", {})
        total_sentiment = sum(overall.values())
        if total_sentiment > 0:
            positive_rate = overall.get('positive', 0) / total_sentiment * 100
            lines.append(f"- Tỷ lệ tích cực: {positive_rate:.1f}%")
        
        # Product insights
        products = combined_data.get("products", [])
        if products:
            total_product_revenue = sum(p.get("total_revenue", 0) for p in products)
            lines.append(f"- Doanh thu sản phẩm: {total_product_revenue:,.0f}đ")
        
        return "\n".join(lines)
    
    def _format_report_simple(self, report_data: Dict[str, Any], report_type: str) -> str:
        """Simple formatting for report"""
        lines = []
        lines.append(f"**Báo cáo {report_type}:**")
        lines.append(f"- Thời gian tạo: {report_data.get('generated_at', 'N/A')}")
        lines.append(f"- Nội dung: {self._format_business_insights_simple(report_data)}")
        
        return "\n".join(lines)
