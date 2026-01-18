import json
import re
from typing import Dict, Any
from app.agents.base import BaseAgent
from app.agents.product import ProductAgent
from app.agents.legal import LegalAgent
from app.core.logger import get_logger

logger = get_logger(__name__)

class ManagerAgent(BaseAgent):
    """
    Main Orchestrator. 
    Routes tasks to sub-agents and aggregates results.
    """
    
    def __init__(self):
        super().__init__("ManagerAgent")
        self.product_agent = ProductAgent()
        self.legal_agent = LegalAgent()
        
    async def run(self, input_message: str, context: Dict = None) -> Dict[str, Any]:
        context = context or {}
        role = context.get("role", "user")
        
        # 1. Fast Chitchat Check
        msg_lower = input_message.lower().strip()
        if re.search(r"^(xin chào|chào|hello|hi|alo)( shop| ad| em| admin)?(!|\.|~)*$", msg_lower) or \
           re.search(r"^(cảm ơn|thanks)( shop| ad| em| admin)?(!|\.|~)*$", msg_lower):
            return {
                "action": "chitchat", 
                "response": "Chào bạn! Mình có thể giúp gì cho bạn hôm nay?",
                "data": {}
            }

        # 2. Role-Based Routing
        logger.info("[MANAGER] Routing decision")
        logger.info(f"  Role: {role}")
        logger.info(f"  Target Agent: {'LegalAgent' if role == 'admin' else 'ProductAgent'}")
        
        agent_result = {}
        action_type = ""
        
        if role == "admin":
            agent_result = await self.legal_agent.run(input_message, context)
            tool_used = agent_result.get("tool_used", "consult_legal_documents")
            
            # Map tool to canonical action
            if tool_used in ["calculate_pit", "calculate_corporate_tax", "calculate_vat"]:
                action_type = "tax_calculation"
            else:
                action_type = "legal_search"
            
        else: # user
            agent_result = await self.product_agent.run(input_message, context)
            tool_used = agent_result.get("tool_used", "product_search")
            
            # Map tool to canonical action
            if tool_used == "get_products_db":
                action_type = "product_detail"
            elif tool_used in ["get_best_sellers", "search_product_vectors"]:
                action_type = "product_search"
            else:
                action_type = tool_used # Fallback
                 
        return {
            "response": agent_result.get("agent_response", ""),
            "action": action_type,
            "data": agent_result.get("data", {})
        }
