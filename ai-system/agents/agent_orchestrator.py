#!/usr/bin/env python3
"""
Agent Orchestrator - Điều phối các agents cho e-commerce
Chức năng: Quyết định agent nào xử lý request và điều phối workflow
"""

import json
import logging
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import asyncio
from datetime import datetime

from ecommerce_agents import EcommerceAgentSystem, AgentType
from prompt_manager import PromptManager

logger = logging.getLogger(__name__)

class RequestType(Enum):
    """Loại request"""
    PRODUCT_INQUIRY = "product_inquiry"
    CUSTOMER_SERVICE = "customer_service"
    ORDER_MANAGEMENT = "order_management"
    TECHNICAL_SUPPORT = "technical_support"
    SALES_ASSISTANCE = "sales_assistance"
    RECOMMENDATION = "recommendation"
    COMPLAINT = "complaint"
    GENERAL_QUESTION = "general_question"
    REPORT = "report"

class Priority(Enum):
    """Mức độ ưu tiên"""
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    URGENT = 4

@dataclass
class AgentRequest:
    """Request cho agent"""
    request_id: str
    user_message: str
    request_type: RequestType
    priority: Priority
    context: Dict[str, Any]
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()

@dataclass
class AgentResponse:
    """Response từ agent"""
    request_id: str
    agent_name: str
    response_text: str
    confidence: float
    actions_taken: List[str]
    next_steps: List[str]
    metadata: Dict[str, Any]
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()

class AgentOrchestrator:
    """Điều phối các agents cho e-commerce"""
    
    def __init__(self):
        self.agent_system = EcommerceAgentSystem()
        self.prompt_manager = PromptManager()
        self.request_history = []
        self.agent_performance = {}
        
        # Routing rules
        self.routing_rules = self._initialize_routing_rules()
    
    def _initialize_routing_rules(self) -> Dict[RequestType, List[Tuple[str, float]]]:
        """Khởi tạo quy tắc routing"""
        return {
            RequestType.PRODUCT_INQUIRY: [
                ("product_expert", 0.8),
                ("sales_assistant", 0.6),
                ("recommendation_engine", 0.4)
            ],
            RequestType.CUSTOMER_SERVICE: [
                ("customer_service", 0.9),
                ("order_manager", 0.3)
            ],
            RequestType.ORDER_MANAGEMENT: [
                ("order_manager", 0.9),
                ("customer_service", 0.5)
            ],
            RequestType.TECHNICAL_SUPPORT: [
                ("technical_support", 0.9),
                ("product_expert", 0.4)
            ],
            RequestType.SALES_ASSISTANCE: [
                ("sales_assistant", 0.8),
                ("product_expert", 0.6),
                ("recommendation_engine", 0.5)
            ],
            RequestType.RECOMMENDATION: [
                ("recommendation_engine", 0.9),
                ("sales_assistant", 0.6)
            ],
            RequestType.COMPLAINT: [
                ("customer_service", 0.9),
                ("order_manager", 0.4)
            ],
            RequestType.REPORT: [
                ("report_writer", 0.95),
                ("customer_service", 0.4)
            ],
            RequestType.GENERAL_QUESTION: [
                ("customer_service", 0.7),
                ("product_expert", 0.5)
            ]
        }
    
    def classify_request(self, user_message: str, context: Dict[str, Any] = None) -> Tuple[RequestType, float]:
        """Phân loại request của user"""
        if context is None:
            context = {}
        
        message_lower = user_message.lower()
        
        # Keywords for each request type
        keywords = {
            RequestType.PRODUCT_INQUIRY: [
                'mua', 'bán', 'sản phẩm', 'điện thoại', 'laptop', 'quần áo', 'sách',
                'giá', 'bao nhiêu', 'có không', 'tìm', 'search', 'so sánh'
            ],
            RequestType.CUSTOMER_SERVICE: [
                'hỗ trợ', 'giúp đỡ', 'tư vấn', 'thắc mắc', 'câu hỏi', 'liên hệ'
            ],
            RequestType.ORDER_MANAGEMENT: [
                'đơn hàng', 'order', 'theo dõi', 'tracking', 'hủy', 'đổi', 'trả',
                'thanh toán', 'payment', 'giao hàng', 'shipping'
            ],
            RequestType.TECHNICAL_SUPPORT: [
                'lỗi', 'bug', 'không hoạt động', 'hướng dẫn', 'cách sử dụng',
                'bảo hành', 'sửa chữa', 'troubleshoot'
            ],
            RequestType.SALES_ASSISTANCE: [
                'khuyến mãi', 'giảm giá', 'sale', 'ưu đãi', 'combo', 'gói',
                'tư vấn mua', 'chọn sản phẩm'
            ],
            RequestType.RECOMMENDATION: [
                'gợi ý', 'đề xuất', 'recommend', 'phù hợp', 'tương tự',
                'giống', 'thay thế'
            ],
            RequestType.COMPLAINT: [
                'phàn nàn', 'khiếu nại', 'không hài lòng', 'tệ', 'kém',
                'thất vọng', 'complaint'
            ],
            RequestType.REPORT: [
                'báo cáo', 'report', 'tổng hợp', 'thống kê', 'biểu đồ', 'html', 'index.html'
            ]
        }
        
        # Calculate scores for each request type
        scores = {}
        for req_type, kw_list in keywords.items():
            score = sum(1 for kw in kw_list if kw in message_lower)
            scores[req_type] = score / len(kw_list) if kw_list else 0
        
        # Find the best match
        best_type = max(scores.items(), key=lambda x: x[1])
        
        # If no clear match, default to general question
        if best_type[1] < 0.1:
            return RequestType.GENERAL_QUESTION, 0.5
        
        return best_type[0], best_type[1]
    
    def select_agent(self, request_type: RequestType, context: Dict[str, Any] = None) -> Tuple[str, float]:
        """Chọn agent phù hợp nhất"""
        if context is None:
            context = {}
        
        if request_type not in self.routing_rules:
            return "customer_service", 0.5
        
        # Get routing rules for this request type
        agent_candidates = self.routing_rules[request_type]
        
        # Consider agent availability and performance
        best_agent = None
        best_score = 0
        
        for agent_name, base_score in agent_candidates:
            # Check if agent is enabled
            agent_config = self.agent_system.get_agent(agent_name)
            if not agent_config or not agent_config.enabled:
                continue
            
            # Adjust score based on performance
            performance_multiplier = self.agent_performance.get(agent_name, 1.0)
            adjusted_score = base_score * performance_multiplier
            
            if adjusted_score > best_score:
                best_score = adjusted_score
                best_agent = agent_name
        
        return best_agent or "customer_service", best_score
    
    def generate_agent_prompt(self, agent_name: str, request: AgentRequest) -> str:
        """Tạo prompt cho agent"""
        agent_config = self.agent_system.get_agent(agent_name)
        if not agent_config:
            raise ValueError(f"Agent '{agent_name}' not found")
        
        # Set context data
        self.prompt_manager.set_context_data("customer_name", request.context.get("customer_name", "Khách hàng"))
        self.prompt_manager.set_context_data("user_message", request.user_message)
        self.prompt_manager.set_context_data("request_type", request.request_type.value)
        self.prompt_manager.set_context_data("priority", request.priority.value)
        
        # Generate system prompt
        system_prompt = self.prompt_manager.generate_prompt(
            f"{agent_name}_system" if agent_name != "report_writer" else "customer_service_system",
            **request.context
        )
        
        return system_prompt
    
    async def process_request(self, request: AgentRequest) -> AgentResponse:
        """Xử lý request thông qua agent"""
        try:
            # Classify request
            request_type, confidence = self.classify_request(request.user_message, request.context)
            request.request_type = request_type
            
            # Select agent
            agent_name, agent_confidence = self.select_agent(request_type, request.context)
            
            # Generate prompt
            system_prompt = self.generate_agent_prompt(agent_name, request)
            
            # Simulate agent processing (in real implementation, this would call LLM)
            response_text = await self._simulate_agent_response(agent_name, request, system_prompt)
            
            # Create response
            response = AgentResponse(
                request_id=request.request_id,
                agent_name=agent_name,
                response_text=response_text,
                confidence=agent_confidence,
                actions_taken=self._get_actions_taken(agent_name, request),
                next_steps=self._get_next_steps(agent_name, request),
                metadata={
                    "request_type": request_type.value,
                    "processing_time": 0.5,
                    "prompt_length": len(system_prompt)
                }
            )
            
            # Update performance metrics
            self._update_agent_performance(agent_name, True)
            
            # Store in history
            self.request_history.append({
                "request": request,
                "response": response,
                "timestamp": datetime.now()
            })
            
            return response
            
        except Exception as e:
            logger.error(f"Error processing request {request.request_id}: {e}")
            
            # Fallback response
            return AgentResponse(
                request_id=request.request_id,
                agent_name="customer_service",
                response_text="Xin lỗi, tôi gặp sự cố khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.",
                confidence=0.1,
                actions_taken=["error_handling"],
                next_steps=["retry_request", "contact_support"],
                metadata={"error": str(e)}
            )
    
    async def _simulate_agent_response(self, agent_name: str, request: AgentRequest, system_prompt: str) -> str:
        """Mô phỏng response từ agent (thay thế bằng LLM call thực tế)"""
        # This is a simulation - in real implementation, you would call LLM here
        
        if agent_name == "report_writer":
            title = request.context.get("title", "Báo cáo tổng hợp")
            highlights = request.context.get("highlights", [])
            return (
                f"Đã tạo báo cáo '{title}'. Luôn xuất index.html (HTML5 + Tailwind). "
                f"Mục lục, sections rõ ràng, biểu đồ/bảng nếu có dữ liệu. "
                f"Highlights: {', '.join(highlights) if highlights else 'N/A'}."
            )
        
        responses = {
            "customer_service": f"Xin chào {request.context.get('customer_name', 'bạn')}! Tôi là chuyên gia hỗ trợ khách hàng. Tôi hiểu bạn đang quan tâm về: '{request.user_message}'. Tôi sẽ giúp bạn giải quyết vấn đề này.",
            "product_expert": f"Tôi là chuyên gia sản phẩm. Dựa trên yêu cầu '{request.user_message}', tôi sẽ tư vấn sản phẩm phù hợp nhất cho bạn.",
            "sales_assistant": f"Chào bạn! Tôi là trợ lý bán hàng. Tôi sẽ giúp bạn tìm sản phẩm phù hợp với nhu cầu: '{request.user_message}'.",
            "technical_support": f"Tôi là chuyên gia hỗ trợ kỹ thuật. Tôi sẽ giúp bạn giải quyết vấn đề: '{request.user_message}'.",
            "order_manager": f"Tôi là chuyên gia quản lý đơn hàng. Tôi sẽ hỗ trợ bạn với yêu cầu: '{request.user_message}'.",
            "recommendation_engine": f"Tôi là hệ thống đề xuất sản phẩm. Dựa trên sở thích của bạn, tôi sẽ đề xuất: '{request.user_message}'."
        }
        
        return responses.get(agent_name, "Tôi sẽ giúp bạn với yêu cầu này.")
    
    def _get_actions_taken(self, agent_name: str, request: AgentRequest) -> List[str]:
        """Lấy danh sách actions đã thực hiện"""
        actions = {
            "customer_service": ["analyze_request", "provide_solution", "escalate_if_needed"],
            "product_expert": ["analyze_requirements", "search_products", "compare_options"],
            "sales_assistant": ["analyze_needs", "find_products", "check_promotions"],
            "technical_support": ["diagnose_issue", "provide_solution", "escalate_if_needed"],
            "order_manager": ["check_order_status", "process_request", "update_customer"],
            "recommendation_engine": ["analyze_preferences", "generate_recommendations", "rank_results"],
            "report_writer": ["parse_outline", "gather_assets", "compose_html", "export_index_html"]
        }
        
        return actions.get(agent_name, ["process_request"])
    
    def _get_next_steps(self, agent_name: str, request: AgentRequest) -> List[str]:
        """Lấy danh sách next steps"""
        steps = {
            "customer_service": ["follow_up", "monitor_satisfaction"],
            "product_expert": ["provide_details", "answer_questions"],
            "sales_assistant": ["show_products", "assist_purchase"],
            "technical_support": ["provide_guidance", "schedule_follow_up"],
            "order_manager": ["update_status", "send_confirmation"],
            "recommendation_engine": ["show_recommendations", "get_feedback"],
            "report_writer": ["deliver_report", "collect_feedback"]
        }
        
        return steps.get(agent_name, ["complete_request"])
    
    def _update_agent_performance(self, agent_name: str, success: bool):
        """Cập nhật performance metrics"""
        if agent_name not in self.agent_performance:
            self.agent_performance[agent_name] = 1.0
        
        # Simple performance tracking
        if success:
            self.agent_performance[agent_name] = min(1.2, self.agent_performance[agent_name] * 1.01)
        else:
            self.agent_performance[agent_name] = max(0.5, self.agent_performance[agent_name] * 0.99)
    
    def get_agent_performance(self) -> Dict[str, float]:
        """Lấy performance metrics"""
        return self.agent_performance.copy()
    
    def get_request_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Lấy lịch sử requests"""
        return self.request_history[-limit:]

def main():
    """Test function"""
    orchestrator = AgentOrchestrator()
    
    print("🎭 Agent Orchestrator")
    print("=" * 50)
    
    # Test request classification
    test_messages = [
        "Tôi muốn mua điện thoại iPhone mới nhất",
        "Đơn hàng của tôi bị trễ, khi nào mới giao?",
        "Sản phẩm này có lỗi, tôi cần hỗ trợ kỹ thuật",
        "Có khuyến mãi gì không?",
        "Bạn có thể gợi ý sản phẩm phù hợp không?",
        "Hãy tạo báo cáo doanh thu tháng 9 với biểu đồ và bảng dữ liệu"
    ]
    
    for message in test_messages:
        req_type, confidence = orchestrator.classify_request(message)
        agent_name, agent_conf = orchestrator.select_agent(req_type)
        
        print(f"\n📝 Message: {message}")
        print(f"   Request Type: {req_type.value} (confidence: {confidence:.2f})")
        print(f"   Selected Agent: {agent_name} (confidence: {agent_conf:.2f})")
    
    print(f"\n📊 Agent Performance: {orchestrator.get_agent_performance()}")

if __name__ == "__main__":
    main()
