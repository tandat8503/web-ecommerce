#!/usr/bin/env python3
"""
Custom exceptions for web-ecommerce AI system
"""

from typing import Optional, Dict, Any


class AIAgentError(Exception):
    """Base exception for AI agent errors"""
    
    def __init__(
        self,
        message: str,
        agent_type: Optional[str] = None,
        request_id: Optional[str] = None,
        error_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message)
        self.message = message
        self.agent_type = agent_type
        self.request_id = request_id
        self.error_code = error_code
        self.details = details or {}


class LLMClientError(AIAgentError):
    """Exception for LLM client errors"""
    pass


class DatabaseError(AIAgentError):
    """Exception for database errors"""
    pass


class AgentExecutionError(AIAgentError):
    """Exception for agent execution errors"""
    pass


class OrchestratorError(AIAgentError):
    """Exception for orchestrator errors"""
    pass


class ValidationError(AIAgentError):
    """Exception for validation errors"""
    pass


class ConfigurationError(AIAgentError):
    """Exception for configuration errors"""
    pass


class ServiceUnavailableError(AIAgentError):
    """Exception for service unavailable errors"""
    pass


class RateLimitError(AIAgentError):
    """Exception for rate limit errors"""
    pass


class AuthenticationError(AIAgentError):
    """Exception for authentication errors"""
    pass


class AuthorizationError(AIAgentError):
    """Exception for authorization errors"""
    pass


def handle_agent_error(
    error: Exception,
    agent_type: str,
    request_id: Optional[str] = None,
    context: Optional[Dict[str, Any]] = None
) -> AIAgentError:
    """
    Convert a generic exception to an AIAgentError with context
    
    Args:
        error: The original exception
        agent_type: Type of agent that encountered the error
        request_id: Optional request ID
        context: Optional additional context
        
    Returns:
        AIAgentError with proper context
    """
    if isinstance(error, AIAgentError):
        return error
    
    # Convert to appropriate AIAgentError type
    if "database" in str(error).lower() or "mysql" in str(error).lower():
        return DatabaseError(
            message=str(error),
            agent_type=agent_type,
            request_id=request_id,
            details=context or {}
        )
    elif "llm" in str(error).lower() or "gemini" in str(error).lower():
        return LLMClientError(
            message=str(error),
            agent_type=agent_type,
            request_id=request_id,
            details=context or {}
        )
    elif "rate limit" in str(error).lower():
        return RateLimitError(
            message=str(error),
            agent_type=agent_type,
            request_id=request_id,
            details=context or {}
        )
    else:
        return AgentExecutionError(
            message=str(error),
            agent_type=agent_type,
            request_id=request_id,
            details=context or {}
        )
