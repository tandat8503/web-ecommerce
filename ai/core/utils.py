#!/usr/bin/env python3
"""
Utility functions for web-ecommerce AI system
"""

import json
import re
import asyncio
from typing import Any, Dict, List, Optional, Union
from datetime import datetime, timedelta
import logging


def safe_json_parse(text: str, default: Any = None) -> Any:
    """
    Safely parse JSON from text, with fallback to default value
    
    Args:
        text: Text to parse as JSON
        default: Default value if parsing fails
        
    Returns:
        Parsed JSON or default value
    """
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        return default


def extract_json_from_text(text: str) -> Optional[Dict[str, Any]]:
    """
    Extract JSON object from text that may contain other content
    
    Args:
        text: Text that may contain JSON
        
    Returns:
        Extracted JSON object or None
    """
    # Try direct JSON parse first
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        pass
    
    # Look for JSON in code blocks
    json_match = re.search(r"```json\s*\n(.*?)\n```", text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except (json.JSONDecodeError, TypeError):
            pass
    
    # Look for JSON between curly braces
    json_match = re.search(r"\{.*\}", text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(0))
        except (json.JSONDecodeError, TypeError):
            pass
    
    return None


def format_currency(amount: Union[int, float], currency: str = "VND") -> str:
    """
    Format currency amount for display
    
    Args:
        amount: Amount to format
        currency: Currency code
        
    Returns:
        Formatted currency string
    """
    if currency == "VND":
        return f"{amount:,.0f}đ"
    else:
        return f"{amount:,.2f} {currency}"


def format_percentage(value: float, decimals: int = 1) -> str:
    """
    Format percentage value for display
    
    Args:
        value: Percentage value (0-100)
        decimals: Number of decimal places
        
    Returns:
        Formatted percentage string
    """
    return f"{value:.{decimals}f}%"


def truncate_text(text: str, max_length: int = 100, suffix: str = "...") -> str:
    """
    Truncate text to maximum length
    
    Args:
        text: Text to truncate
        max_length: Maximum length
        suffix: Suffix to add if truncated
        
    Returns:
        Truncated text
    """
    if len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)] + suffix


def clean_text(text: str) -> str:
    """
    Clean text by removing extra whitespace and normalizing
    
    Args:
        text: Text to clean
        
    Returns:
        Cleaned text
    """
    if not text:
        return ""
    
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text.strip())
    
    # Remove control characters
    text = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', text)
    
    return text


def extract_time_period(text: str) -> Dict[str, Optional[int]]:
    """
    Extract time period information from text
    
    Args:
        text: Text to analyze
        
    Returns:
        Dictionary with month and year if found
    """
    result = {"month": None, "year": None}
    
    # Extract month
    month_match = re.search(r"tháng\s*(\d{1,2})", text.lower())
    if month_match:
        try:
            result["month"] = int(month_match.group(1))
        except ValueError:
            pass
    
    # Extract year
    year_match = re.search(r"năm\s*(\d{4})", text.lower())
    if year_match:
        try:
            result["year"] = int(year_match.group(1))
        except ValueError:
            pass
    
    return result


def extract_keywords(text: str, min_length: int = 3) -> List[str]:
    """
    Extract keywords from text
    
    Args:
        text: Text to extract keywords from
        min_length: Minimum keyword length
        
    Returns:
        List of keywords
    """
    if not text:
        return []
    
    # Simple keyword extraction
    words = re.findall(r'\b\w+\b', text.lower())
    
    # Filter by length and common stop words
    stop_words = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these',
        'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him',
        'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their'
    }
    
    keywords = [
        word for word in words
        if len(word) >= min_length and word not in stop_words
    ]
    
    return list(set(keywords))  # Remove duplicates


def calculate_confidence_score(
    positive_score: float,
    negative_score: float,
    threshold: float = 0.6
) -> tuple[str, float]:
    """
    Calculate confidence score for sentiment analysis
    
    Args:
        positive_score: Positive sentiment score
        negative_score: Negative sentiment score
        threshold: Confidence threshold
        
    Returns:
        Tuple of (sentiment, confidence)
    """
    if positive_score >= threshold:
        return "positive", positive_score
    elif negative_score >= threshold:
        return "negative", negative_score
    else:
        return "neutral", max(positive_score, negative_score)


def format_agent_response(
    message: str,
    data: Optional[Dict[str, Any]] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Format agent response in standard format
    
    Args:
        message: Response message
        data: Optional response data
        metadata: Optional metadata
        
    Returns:
        Formatted response dictionary
    """
    response = {
        "message": message,
        "timestamp": datetime.now().isoformat(),
        "success": True
    }
    
    if data is not None:
        response["data"] = data
    
    if metadata is not None:
        response["metadata"] = metadata
    
    return response


def format_error_response(
    error_message: str,
    error_code: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Format error response in standard format
    
    Args:
        error_message: Error message
        error_code: Optional error code
        details: Optional error details
        
    Returns:
        Formatted error response dictionary
    """
    response = {
        "message": error_message,
        "timestamp": datetime.now().isoformat(),
        "success": False
    }
    
    if error_code:
        response["error_code"] = error_code
    
    if details:
        response["details"] = details
    
    return response


async def retry_async(
    func,
    *args,
    max_retries: int = 3,
    delay: float = 1.0,
    backoff_factor: float = 2.0,
    **kwargs
):
    """
    Retry an async function with exponential backoff
    
    Args:
        func: Async function to retry
        *args: Function arguments
        max_retries: Maximum number of retries
        delay: Initial delay between retries
        backoff_factor: Backoff multiplier
        **kwargs: Function keyword arguments
        
    Returns:
        Function result
        
    Raises:
        Last exception if all retries fail
    """
    last_exception = None
    
    for attempt in range(max_retries + 1):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            last_exception = e
            if attempt < max_retries:
                wait_time = delay * (backoff_factor ** attempt)
                logging.warning(f"Attempt {attempt + 1} failed: {e}. Retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)
            else:
                logging.error(f"All {max_retries + 1} attempts failed. Last error: {e}")
    
    raise last_exception


def validate_required_fields(data: Dict[str, Any], required_fields: List[str]) -> List[str]:
    """
    Validate that required fields are present in data
    
    Args:
        data: Data to validate
        required_fields: List of required field names
        
    Returns:
        List of missing fields
    """
    missing_fields = []
    
    for field in required_fields:
        if field not in data or data[field] is None:
            missing_fields.append(field)
    
    return missing_fields


def sanitize_input(text: str, max_length: int = 1000) -> str:
    """
    Sanitize user input to prevent injection attacks
    
    Args:
        text: Input text to sanitize
        max_length: Maximum allowed length
        
    Returns:
        Sanitized text
    """
    if not text:
        return ""
    
    # Truncate to max length
    text = text[:max_length]
    
    # Remove potentially dangerous characters
    text = re.sub(r'[<>"\']', '', text)
    
    # Remove control characters
    text = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', text)
    
    return text.strip()
