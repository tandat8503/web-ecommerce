#!/usr/bin/env python3
"""
Simple Agents for Web-ecommerce AI System
Following ai-native-todo-task-agent structure
"""

import asyncio
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from shared.llm_client import LLMClientFactory
from core.db import get_conn, release_conn
from prompts import (
    ORCHESTRATOR_SYSTEM_PROMPT,
    USER_CHATBOT_SYSTEM_PROMPT,
    ADMIN_CHATBOT_SYSTEM_PROMPT,
    SENTIMENT_ANALYZER_SYSTEM_PROMPT,
    BUSINESS_ANALYST_SYSTEM_PROMPT,
    ERROR_HANDLING_PROMPT
)

logger = logging.getLogger(__name__)


class MCPToolClient:
    """Simple MCP tool client"""
    
    def __init__(self):
        self.tools = {}
        self._load_tools()
    
    def _load_tools(self):
        """Load MCP tools dynamically"""
        try:
            from mcps.main import (
                search_products,
                analyze_sentiment,
                summarize_sentiment_by_product,
                get_revenue_analytics,
                get_sales_performance,
                get_product_metrics,
                generate_report
            )
            
            self.tools = {
                "search_products": search_products,
                "analyze_sentiment": analyze_sentiment,
                "summarize_sentiment_by_product": summarize_sentiment_by_product,
                "get_revenue_analytics": get_revenue_analytics,
                "get_sales_performance": get_sales_performance,
                "get_product_metrics": get_product_metrics,
                "generate_report": generate_report
            }
        except ImportError as e:
            logger.error(f"Failed to load MCP tools: {e}")
    
    async def call_tool(self, tool_name: str, **kwargs) -> Dict[str, Any]:
        """Call an MCP tool"""
        try:
            if tool_name not in self.tools:
                return {"success": False, "error": f"Tool {tool_name} not found"}
            
            result = await self.tools[tool_name](**kwargs)
            return json.loads(result)
        except Exception as e:
            logger.error(f"Error calling tool {tool_name}: {e}")
            return {"success": False, "error": str(e)}


class BaseAgent:
    """Base agent class"""
    
    def __init__(self, agent_type: str, system_prompt: str):
        self.agent_type = agent_type
        self.system_prompt = system_prompt
        self.llm_client = LLMClientFactory.create_client()
        self.tool_client = MCPToolClient()
    
    async def process_request(self, user_message: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Process a user request"""
        try:
            # Determine intent and call appropriate tools
            intent = await self._classify_intent(user_message)
            tool_result = await self._call_tools(intent, user_message, context or {})
            
            # Generate response using LLM
            if self.llm_client:
                response = await self._generate_response(user_message, tool_result, intent)
            else:
                response = self._format_simple_response(tool_result, intent)
            
            return {
                "success": True,
                "agent_type": self.agent_type,
                "intent": intent,
                "response": response,
                "tool_result": tool_result,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in {self.agent_type}: {e}")
            return {
                "success": False,
                "agent_type": self.agent_type,
                "error": str(e),
                "response": ERROR_HANDLING_PROMPT.format(
                    error_message=str(e),
                    user_query=user_message
                )
            }
    
    async def _classify_intent(self, user_message: str) -> str:
        """Classify user intent - to be overridden by subclasses"""
        return "general"
    
    async def _call_tools(self, intent: str, user_message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Call appropriate tools - to be overridden by subclasses"""
        return {}
    
    async def _generate_response(self, user_message: str, tool_result: Dict[str, Any], intent: str) -> str:
        """Generate response using LLM"""
        try:
            prompt = f"""
User Query: {user_message}
Intent: {intent}
Tool Result: {json.dumps(tool_result, indent=2)}

Please provide a helpful response based on the tool results. 
IMPORTANT: Always respond in Vietnamese for better user experience.
"""
            
            result = await self.llm_client.generate_simple(
                prompt=prompt,
                system_instruction=self.system_prompt,
                temperature=0.7
            )
            
            return result.get("content", "Xin lỗi, tôi không thể tạo phản hồi.")
            
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return self._format_simple_response(tool_result, intent)
    
    def _format_simple_response(self, tool_result: Dict[str, Any], intent: str) -> str:
        """Format simple response without LLM"""
        if tool_result.get("success"):
            return f"Yêu cầu đã được xử lý thành công cho mục đích: {intent}"
        else:
            return f"Xin lỗi, tôi không thể xử lý yêu cầu của bạn. Lỗi: {tool_result.get('error', 'Lỗi không xác định')}"


class UserChatbotAgent(BaseAgent):
    """User Chatbot Agent for product consultation"""
    
    def __init__(self):
        super().__init__("user_chatbot", USER_CHATBOT_SYSTEM_PROMPT)
    
    async def _classify_intent(self, user_message: str) -> str:
        """Classify user intent for product consultation"""
        message = user_message.lower()
        
        if any(keyword in message for keyword in ["tìm", "search", "mua", "buy", "sản phẩm", "product"]):
            return "product_search"
        elif any(keyword in message for keyword in ["giá", "price", "cost", "giá cả"]):
            return "price_inquiry"
        elif any(keyword in message for keyword in ["so sánh", "compare", "khác biệt"]):
            return "product_comparison"
        else:
            return "general_inquiry"
    
    async def _call_tools(self, intent: str, user_message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Call tools for user chatbot"""
        if intent == "product_search":
            # Extract search query
            query = user_message
            return await self.tool_client.call_tool("search_products", query=query, limit=10)
        elif intent == "price_inquiry":
            # Extract product name and search
            query = user_message
            return await self.tool_client.call_tool("search_products", query=query, limit=5)
        else:
            return {"success": True, "message": "Tôi có thể giúp gì cho bạn về sản phẩm của chúng tôi?"}


class AdminChatbotAgent(BaseAgent):
    """Admin Chatbot Agent for business intelligence"""
    
    def __init__(self):
        super().__init__("admin_chatbot", ADMIN_CHATBOT_SYSTEM_PROMPT)
    
    async def _classify_intent(self, user_message: str) -> str:
        """Classify admin intent"""
        message = user_message.lower()
        
        if any(keyword in message for keyword in ["doanh thu", "revenue", "tài chính", "financial"]):
            return "revenue_analysis"
        elif any(keyword in message for keyword in ["sentiment", "cảm xúc", "feedback", "đánh giá"]):
            return "sentiment_analysis"
        elif any(keyword in message for keyword in ["báo cáo", "report", "thống kê"]):
            return "report_generation"
        elif any(keyword in message for keyword in ["hiệu suất", "performance", "kpi"]):
            return "performance_analysis"
        else:
            return "general_admin"
    
    async def _call_tools(self, intent: str, user_message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Call tools for admin chatbot"""
        if intent == "revenue_analysis":
            # Extract time period
            month = context.get("month")
            year = context.get("year")
            return await self.tool_client.call_tool("get_revenue_analytics", month=month, year=year)
        elif intent == "sentiment_analysis":
            return await self.tool_client.call_tool("summarize_sentiment_by_product")
        elif intent == "report_generation":
            month = context.get("month")
            year = context.get("year")
            return await self.tool_client.call_tool("generate_report", month=month, year=year)
        elif intent == "performance_analysis":
            return await self.tool_client.call_tool("get_sales_performance", days=30)
        else:
            return {"success": True, "message": "Bạn cần thông tin kinh doanh gì?"}


class SentimentAnalyzerAgent(BaseAgent):
    """Sentiment Analyzer Agent for customer feedback analysis"""
    
    def __init__(self):
        super().__init__("sentiment_analyzer", SENTIMENT_ANALYZER_SYSTEM_PROMPT)
    
    async def _classify_intent(self, user_message: str) -> str:
        """Classify sentiment analysis intent"""
        message = user_message.lower()
        
        if any(keyword in message for keyword in ["phân tích", "analyze", "sentiment", "cảm xúc"]):
            return "sentiment_analysis"
        elif any(keyword in message for keyword in ["tổng hợp", "summary", "tổng kết"]):
            return "sentiment_summary"
        else:
            return "general_sentiment"
    
    async def _call_tools(self, intent: str, user_message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Call tools for sentiment analysis"""
        if intent == "sentiment_analysis":
            texts = context.get("texts", [])
            product_id = context.get("product_id")
            return await self.tool_client.call_tool("analyze_sentiment", texts=texts, product_id=product_id)
        elif intent == "sentiment_summary":
            product_id = context.get("product_id")
            return await self.tool_client.call_tool("summarize_sentiment_by_product", product_id=product_id)
        else:
            return {"success": True, "message": "Bạn cần phân tích cảm xúc gì?"}


class BusinessAnalystAgent(BaseAgent):
    """Business Analyst Agent for revenue and KPI analysis"""
    
    def __init__(self):
        super().__init__("business_analyst", BUSINESS_ANALYST_SYSTEM_PROMPT)
    
    async def _classify_intent(self, user_message: str) -> str:
        """Classify business analysis intent"""
        message = user_message.lower()
        
        if any(keyword in message for keyword in ["doanh thu", "revenue", "tài chính"]):
            return "revenue_analysis"
        elif any(keyword in message for keyword in ["hiệu suất", "performance", "bán hàng"]):
            return "sales_performance"
        elif any(keyword in message for keyword in ["sản phẩm", "product", "metrics"]):
            return "product_metrics"
        else:
            return "general_analysis"
    
    async def _call_tools(self, intent: str, user_message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Call tools for business analysis"""
        if intent == "revenue_analysis":
            month = context.get("month")
            year = context.get("year")
            return await self.tool_client.call_tool("get_revenue_analytics", month=month, year=year)
        elif intent == "sales_performance":
            days = context.get("days", 30)
            return await self.tool_client.call_tool("get_sales_performance", days=days)
        elif intent == "product_metrics":
            limit = context.get("limit", 20)
            return await self.tool_client.call_tool("get_product_metrics", limit=limit)
        else:
            return {"success": True, "message": "Bạn cần phân tích kinh doanh gì?"}


class OrchestratorAgent:
    """Orchestrator Agent to coordinate all sub-agents"""
    
    def __init__(self):
        self.llm_client = LLMClientFactory.create_client()
        self.agents = {
            "user_chatbot": UserChatbotAgent(),
            "admin_chatbot": AdminChatbotAgent(),
            "sentiment_analyzer": SentimentAnalyzerAgent(),
            "business_analyst": BusinessAnalystAgent()
        }
    
    async def process_request(self, user_message: str, user_type: str = "user", context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Process request and route to appropriate agent"""
        try:
            # Determine which agent to use based on user type and message
            if user_type == "user":
                agent = self.agents["user_chatbot"]
            elif user_type == "admin":
                # Use LLM to determine best admin agent
                agent = await self._select_admin_agent(user_message)
            else:
                agent = self.agents["user_chatbot"]  # Default to user chatbot
            
            # Process with selected agent
            result = await agent.process_request(user_message, context or {})
            
            return {
                "success": True,
                "orchestrator": "ecommerce_ai",
                "selected_agent": agent.agent_type,
                "result": result,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in orchestrator: {e}")
            return {
                "success": False,
                "error": str(e),
                "response": ERROR_HANDLING_PROMPT.format(
                    error_message=str(e),
                    user_query=user_message
                )
            }
    
    async def _select_admin_agent(self, user_message: str) -> BaseAgent:
        """Select the best admin agent based on message content"""
        message = user_message.lower()
        
        if any(keyword in message for keyword in ["sentiment", "cảm xúc", "feedback", "đánh giá"]):
            return self.agents["sentiment_analyzer"]
        elif any(keyword in message for keyword in ["doanh thu", "revenue", "kpi", "hiệu suất", "performance"]):
            return self.agents["business_analyst"]
        else:
            return self.agents["admin_chatbot"]


# Global orchestrator instance
orchestrator = OrchestratorAgent()