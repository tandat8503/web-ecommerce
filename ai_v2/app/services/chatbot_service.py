
from typing import Dict, Any
from app.agents.manager import ManagerAgent
from app.core.logger import get_logger

logger = get_logger(__name__)

class ChatbotService:
    def __init__(self):
        self.manager = ManagerAgent()
        self._sessions: Dict[str, Any] = {}

    async def process_message(self, user_message: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Entry point - delegates to ManagerAgent with full context.
        Context can include: history, role, session_id, image_data, etc.
        """
        if context is None:
            context = {}
            
        # Extract parameters from context
        history_summary = context.get("history", "")
        role = context.get("role", "user")
        session_id = context.get("session_id")
        
        # Truncate history
        MAX_HISTORY_CHARS = 2000
        if history_summary and len(history_summary) > MAX_HISTORY_CHARS:
             history_summary = history_summary[-MAX_HISTORY_CHARS:]
             context["history"] = history_summary
             
        # Retrieve Cache and inject into context
        session_data = {}
        if session_id:
             session_data = self._sessions.get(session_id, {})
             # Inject cached full product data into context
             if session_data:
                 context["last_products_data"] = {
                     "product_ids": session_data.get("last_products", []),
                     "all_products": session_data.get("all_products", [])
                 }
             context["session_data"] = session_data
        
        result = await self.manager.run(user_message, context)
        
        # Update Cache with FULL product objects
        if session_id:
             data = result.get("data", {})
             if data and "products" in data and data["products"]:
                  self._sessions[session_id] = {
                      "last_products": [p.get('id') for p in data["products"] if p.get('id') is not None],
                      "all_products": data["products"],  # Cache full objects for 'show remaining'
                      "last_action": result.get("action")
                  }
                  
             # Prevent infinite growth (Simple LRU-like eviction)
             if len(self._sessions) > 5000:
                  keys_to_remove = list(self._sessions.keys())[:500]
                  for k in keys_to_remove:
                       self._sessions.pop(k, None)
        
        return result

chatbot_service = ChatbotService()
