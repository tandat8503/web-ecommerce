#!/usr/bin/env python3
"""
Conversation History Manager for Chatbot
Manages conversation context and history for natural dialogue
"""

import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from collections import deque

logger = logging.getLogger(__name__)


class ConversationHistory:
    """Manages conversation history for chatbot sessions"""
    
    def __init__(self, max_history: int = 10):
        """
        Initialize conversation history
        
        Args:
            max_history: Maximum number of messages to keep in history
        """
        self.max_history = max_history
        self.sessions: Dict[str, deque] = {}
        self.session_contexts: Dict[str, Dict[str, Any]] = {}
    
    def get_session(self, session_id: str) -> deque:
        """Get or create conversation session"""
        if session_id not in self.sessions:
            self.sessions[session_id] = deque(maxlen=self.max_history)
            self.session_contexts[session_id] = {
                "created_at": datetime.now(),
                "last_activity": datetime.now(),
                "message_count": 0,
                "last_product_name": None,
                "last_products": [],
                "user_intent": None,
                "conversation_topics": []
            }
        return self.sessions[session_id]
    
    def add_message(self, session_id: str, role: str, content: str, metadata: Optional[Dict[str, Any]] = None):
        """Add message to conversation history"""
        session = self.get_session(session_id)
        context = self.session_contexts[session_id]
        
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat(),
            "metadata": metadata or {}
        }
        
        session.append(message)
        context["last_activity"] = datetime.now()
        context["message_count"] += 1
        
        # Update context based on message
        if role == "user":
            # Extract potential product names or intents
            if metadata:
                if "products" in metadata and metadata["products"]:
                    context["last_products"] = metadata["products"][:3]  # Keep last 3 products
                    if metadata["products"]:
                        context["last_product_name"] = metadata["products"][0].get("name")
                if "intent" in metadata:
                    context["user_intent"] = metadata["intent"]
        
        logger.debug(f"Added {role} message to session {session_id[:8]}...")
    
    def get_history(self, session_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get conversation history for session"""
        session = self.get_session(session_id)
        history = list(session)
        
        if limit:
            history = history[-limit:]
        
        return history
    
    def get_context(self, session_id: str) -> Dict[str, Any]:
        """Get conversation context for session"""
        context = self.session_contexts.get(session_id, {})
        return context.copy()
    
    def update_context(self, session_id: str, updates: Dict[str, Any]):
        """Update conversation context"""
        if session_id not in self.session_contexts:
            self.get_session(session_id)  # Initialize if needed
        
        self.session_contexts[session_id].update(updates)
        self.session_contexts[session_id]["last_activity"] = datetime.now()
    
    def get_conversation_summary(self, session_id: str) -> str:
        """Get a summary of the conversation for context"""
        history = self.get_history(session_id, limit=5)
        context = self.get_context(session_id)
        
        if not history:
            return ""
        
        summary_parts = []
        
        # Add recent conversation
        recent_messages = history[-3:]  # Last 3 messages
        for msg in recent_messages:
            role = msg.get("role", "unknown")
            content = msg.get("content", "")[:100]  # Truncate long messages
            summary_parts.append(f"{role}: {content}")
        
        # Add context information
        if context.get("last_product_name"):
            summary_parts.append(f"Last mentioned product: {context['last_product_name']}")
        
        if context.get("user_intent"):
            summary_parts.append(f"User intent: {context['user_intent']}")
        
        return "\n".join(summary_parts)
    
    def clear_session(self, session_id: str):
        """Clear conversation session"""
        if session_id in self.sessions:
            del self.sessions[session_id]
        if session_id in self.session_contexts:
            del self.session_contexts[session_id]
        logger.info(f"Cleared session {session_id[:8]}...")
    
    def cleanup_old_sessions(self, max_age_hours: int = 24):
        """Clean up old inactive sessions"""
        cutoff_time = datetime.now() - timedelta(hours=max_age_hours)
        
        sessions_to_remove = []
        for session_id, context in self.session_contexts.items():
            last_activity = context.get("last_activity")
            if isinstance(last_activity, str):
                try:
                    last_activity = datetime.fromisoformat(last_activity)
                except:
                    continue
            
            if isinstance(last_activity, datetime) and last_activity < cutoff_time:
                sessions_to_remove.append(session_id)
        
        for session_id in sessions_to_remove:
            self.clear_session(session_id)
        
        if sessions_to_remove:
            logger.info(f"Cleaned up {len(sessions_to_remove)} old sessions")


# Global conversation history manager
conversation_history = ConversationHistory(max_history=10)

