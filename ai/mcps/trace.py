#!/usr/bin/env python3
"""
Tracing utilities for MCP tools
"""

from ddtrace.trace import tracer
import functools
import json


def trace_tool(resource=None, trace_args=True, trace_return=True):
    """
    Decorator for tracing MCP tool calls
    
    Args:
        resource: Resource name for tracing
        trace_args: Whether to trace function arguments
        trace_return: Whether to trace function return value
        
    Returns:
        Decorated function with tracing
    """
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            with tracer.trace(
                "mcp.tool",
                service="web-ecommerce-ai",
                resource=resource or func.__name__,
            ) as span:
                try:
                    if trace_args:
                        # Log args + kwargs as JSON string (safe to truncate)
                        span.set_tag(
                            "tool.args", json.dumps(args, default=str)
                        )
                        span.set_tag(
                            "tool.kwargs", json.dumps(kwargs, default=str)
                        )
                    result = await func(*args, **kwargs)
                    if trace_return:
                        span.set_tag(
                            "tool.result", json.dumps(result, default=str)
                        )
                    return result
                except Exception as e:
                    span.set_tag("error", True)
                    span.set_tag("error.msg", str(e))
                    raise

        return wrapper

    return decorator
