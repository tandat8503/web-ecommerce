#!/usr/bin/env python3
"""
Logging configuration for web-ecommerce AI system
"""

import logging
import sys
from typing import Optional
from datetime import datetime


def setup_logging(
    level: str = "INFO",
    log_file: Optional[str] = None,
    format_string: Optional[str] = None
) -> logging.Logger:
    """
    Setup logging configuration for the AI system
    
    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Optional log file path
        format_string: Optional custom format string
        
    Returns:
        Configured logger
    """
    if format_string is None:
        format_string = (
            "%(asctime)s - %(name)s - %(levelname)s - "
            "%(filename)s:%(lineno)d - %(message)s"
        )
    
    # Create formatter
    formatter = logging.Formatter(format_string)
    
    # Get root logger
    logger = logging.getLogger()
    logger.setLevel(getattr(logging, level.upper()))
    
    # Clear existing handlers
    logger.handlers.clear()
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, level.upper()))
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # File handler (if specified)
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(getattr(logging, level.upper()))
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    return logger


def get_agent_logger(agent_name: str) -> logging.Logger:
    """
    Get a logger for a specific agent
    
    Args:
        agent_name: Name of the agent
        
    Returns:
        Logger instance for the agent
    """
    return logging.getLogger(f"ai.agent.{agent_name}")


def get_orchestrator_logger() -> logging.Logger:
    """
    Get a logger for the orchestrator
    
    Returns:
        Logger instance for the orchestrator
    """
    return logging.getLogger("ai.orchestrator")


def get_system_logger() -> logging.Logger:
    """
    Get a logger for the system
    
    Returns:
        Logger instance for the system
    """
    return logging.getLogger("ai.system")


class AgentLoggerAdapter(logging.LoggerAdapter):
    """Logger adapter for agents with additional context"""
    
    def __init__(self, logger: logging.Logger, agent_name: str, request_id: Optional[str] = None):
        super().__init__(logger, {})
        self.agent_name = agent_name
        self.request_id = request_id
    
    def process(self, msg, kwargs):
        """Add agent context to log messages"""
        extra = kwargs.get('extra', {})
        extra.update({
            'agent_name': self.agent_name,
            'request_id': self.request_id,
            'timestamp': datetime.now().isoformat()
        })
        kwargs['extra'] = extra
        return msg, kwargs


def create_agent_logger(agent_name: str, request_id: Optional[str] = None) -> AgentLoggerAdapter:
    """
    Create a logger adapter for an agent
    
    Args:
        agent_name: Name of the agent
        request_id: Optional request ID for context
        
    Returns:
        Logger adapter for the agent
    """
    logger = get_agent_logger(agent_name)
    return AgentLoggerAdapter(logger, agent_name, request_id)
