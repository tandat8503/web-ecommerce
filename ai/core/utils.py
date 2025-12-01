#!/usr/bin/env python3
"""
Utility functions for AI system
"""

import re
import json
from typing import Dict, Any, Optional, Tuple, List
from datetime import datetime, timedelta

def clean_text(text: str) -> str:
    """Clean and normalize text"""
    if not text:
        return ""
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def extract_keywords(text: str, min_length: int = 2) -> List[str]:
    """Extract keywords from text"""
    if not text:
        return []
    
    # Simple word extraction
    words = re.findall(r'\b\w+\b', text.lower())
    # Filter by length
    keywords = [w for w in words if len(w) >= min_length]
    return keywords

def format_currency(amount: float, currency: str = "VND") -> str:
    """Format currency amount"""
    if currency == "VND":
        return f"{amount:,.0f}₫"
    return f"{amount:,.2f} {currency}"

def extract_time_period(text: str) -> Dict[str, Any]:
    """Extract time period from text"""
    # Simple implementation
    return {"start": None, "end": None}

def safe_json_parse(text: str, default: Any = None) -> Any:
    """Safely parse JSON string"""
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        return default

def sanitize_input(text: str, max_length: int = 1000) -> str:
    """Sanitize user input"""
    if not text:
        return ""
    
    # Remove potentially dangerous characters
    text = re.sub(r'[<>"\']', '', text)
    
    # Truncate if too long
    if len(text) > max_length:
        text = text[:max_length]
    
    return text.strip()


def extract_search_query(user_message: str) -> str:
    """
    Extract search query from user message
    Only removes stopwords and price phrases, keeps context keywords like "học tập", "làm việc", "gỗ", etc.
    """
    if not user_message:
        return ""
    
    query = clean_text(user_message.lower())
    
    # 1. Chỉ xóa các từ đệm vô nghĩa (stopwords)
    consultation_phrases = [
        r'tôi muốn',
        r'tôi cần',
        r'cho tôi',
        r'tìm giúp',
        r'có loại', 
        r'tư vấn',
        r'xin chào',
        r'giá khoảng',
        r'tầm giá', 
        r'mua',
        r'bán',
        r'shop',
        r'cửa hàng',
        r'cho\s+',
        r'for\s+',
        r'với\s+',
        r'with\s+',
        r'và\s+',
        r'and\s+',
        r'hoặc\s+',
        r'or\s+',
        r'thì\s+',
        r'các\s+',
        r'loại\s+',
        r'loai\s+',
        r'của\s+',
        r'có\s+',
        r'có thể\s+',
        r'không\s+',
        r'không có\s+',
        r'được không\s+',
        r'được\s+',
        r'ạ\s+',
        r'nhé\s+',
    ]
    for phrase in consultation_phrases:
        query = re.sub(phrase, ' ', query, flags=re.IGNORECASE)

    # 2. Xóa giá tiền (để tránh SQL search text tìm thấy số tiền trong tên sp)
    price_phrases = [
        r'\d+\s*(?:tr|triệu|k|nghìn|đ|vnd)', 
        r'dưới\s+\d+',
        r'trên\s+\d+',
        r'từ\s+\d+',
        r'đến\s+\d+',
        r'giá\s+dưới',
        r'giá\s+trên',
    ]
    for phrase in price_phrases:
        query = re.sub(phrase, ' ', query, flags=re.IGNORECASE)

    # 3. QUAN TRỌNG: KHÔNG XÓA các từ khóa: học tập, làm việc, họp, gỗ, xoay...
    # Vì "Bàn học tập" khác "Bàn". Nếu xóa "học tập", query chỉ còn "Bàn" -> Mất ngữ nghĩa.
    # Database thường chứa các từ này trong cột description.
    
    # Remove extra whitespace
    query = re.sub(r'\s+', ' ', query).strip()
    
    # If query is too short or empty after cleaning, use original message
    if len(query) < 2:
        # Fallback: extract keywords from original message
        keywords = extract_keywords(user_message, min_length=2)
        query = ' '.join(keywords[:5])  # Take top 5 keywords
    
    # If still empty, return a general search term
    if not query or len(query) < 2:
        query = user_message.strip()[:50]  # Use first 50 chars as fallback
    
    return query.strip()


def extract_price_filter(user_message: str) -> Tuple[Optional[float], Optional[float]]:
    """
    Extract price filter from user message
    Returns: (min_price, max_price) in VND
    
    Examples:
        "dưới 5tr" -> (None, 5000000)
        "trên 2 triệu" -> (2000000, None)
        "từ 1tr đến 3tr" -> (1000000, 3000000)
        "khoảng 5 triệu" -> (None, None)  # No exact filter
    """
    if not user_message:
        return None, None
    
    text = user_message.lower()
    min_price = None
    max_price = None
    
    # Pattern for Vietnamese price expressions
    # "dưới", "dưới", "ít hơn", "nhỏ hơn" -> max_price
    # "trên", "lớn hơn", "nhiều hơn" -> min_price
    # "từ X đến Y", "X - Y", "X đến Y" -> both
    
    # Extract numbers with units (tr, triệu, triệu đồng, vnd, etc.)
    # Note: "5tr" (no space) and "5 tr" (with space) should both match
    price_patterns = [
        (r'(\d+(?:\.\d+)?)\s*(?:tr|triệu|triệu đồng|vnd|đ)', 1000000),  # triệu - matches "5tr" and "5 tr"
        (r'(\d+(?:\.\d+)?)\s*(?:nghìn|k|ngàn)', 1000),  # nghìn
        (r'(\d+(?:\.\d+)?)\s*(?:tỷ|ty)', 1000000000),  # tỷ
    ]
    
    # Find all price mentions
    prices = []
    for pattern, multiplier in price_patterns:
        matches = re.finditer(pattern, text)
        for match in matches:
            number = float(match.group(1))
            price = number * multiplier
            prices.append((price, match.start(), match.end()))
    
    if not prices:
        return None, None
    
    # Sort by position in text
    prices.sort(key=lambda x: x[1])
    
    # Check for "dưới", "ít hơn", "nhỏ hơn" -> max_price
    # Also check for "giá dưới", "giá ít hơn" etc.
    if any(word in text for word in ["dưới", "duoi", "ít hơn", "it hon", "nhỏ hơn", "nho hon", "tối đa", "toi da"]):
        # Find the price after these words
        for price, start, end in prices:
            # Check if there's a "dưới" etc. before this price (extend window to 30 chars to catch "giá dưới")
            text_before = text[max(0, start-30):start]
            if any(word in text_before for word in ["dưới", "duoi", "ít hơn", "it hon", "nhỏ hơn", "nho hon", "tối đa", "toi da", "giá dưới", "gia duoi"]):
                max_price = price
                break
        if max_price is None and prices:
            # If no specific match, use first price as max
            max_price = prices[0][0]
    
    # Check for "trên", "lớn hơn", "nhiều hơn" -> min_price
    # Also check for "giá trên", "giá lớn hơn" etc.
    elif any(word in text for word in ["trên", "tren", "lớn hơn", "lon hon", "nhiều hơn", "nhieu hon", "tối thiểu", "toi thieu"]):
        for price, start, end in prices:
            text_before = text[max(0, start-30):start]  # Extend window to catch "giá trên"
            if any(word in text_before for word in ["trên", "tren", "lớn hơn", "lon hon", "nhiều hơn", "nhieu hon", "tối thiểu", "toi thieu", "giá trên", "gia tren"]):
                min_price = price
                break
        if min_price is None and prices:
            min_price = prices[0][0]
    
    # Check for range: "từ X đến Y", "X - Y", "X đến Y"
    elif any(word in text for word in ["từ", "tu", "đến", "den", "tới", "toi", "-"]):
        if len(prices) >= 2:
            min_price = prices[0][0]
            max_price = prices[1][0]
        elif len(prices) == 1:
            # Single price with "từ" or "đến" - ambiguous, don't set filter
            pass
    
    # If no specific pattern, check if it's a simple price mention
    # "5tr", "5 triệu" without "dưới" or "trên" - don't set filter (too ambiguous)
    
    return min_price, max_price


def normalize_dimension_to_mm(size_str: str) -> Optional[str]:
    """
    Normalize dimension string to millimeters (mm) for database matching.
    
    Database stores dimensions in mm (e.g., width: 1200, depth: 600).
    This function converts user input like "1m2", "1.2m", "120cm" to "1200" (mm).
    
    Examples:
        "1m2" -> "1200"
        "1.2m" -> "1200"
        "120cm" -> "1200"
        "1200" -> "1200" (already in mm)
        "1m4" -> "1400"
        "1.4m" -> "1400"
        
    Returns:
        String representation of dimension in mm, or None if cannot parse
    """
    if not size_str:
        return None
    
    import re
    
    s = size_str.lower().replace(" ", "").strip()
    
    # Case 1: Already in mm (large numbers, no unit)
    if s.isdigit():
        num = int(s)
        # If number is > 100, assume it's already in mm
        if num > 100:
            return str(num)
        # If number is small (< 10), might be meters (e.g., "2" means 2m = 2000mm)
        elif num < 10:
            return str(num * 1000)
        # Otherwise ambiguous, return as is
        return s
    
    # Case 2: Meters format - "1m2", "1.2m", "1m", "2m"
    if "m" in s and "cm" not in s and "mm" not in s:
        # Handle "1m2" format -> convert to "1.2m"
        if re.match(r"\d+m\d+", s):
            # "1m2" -> "1.2"
            s = s.replace("m", ".", 1)
        else:
            # "1.2m" or "2m" -> remove "m"
            s = s.replace("m", "")
        
        try:
            val = float(s)
            return str(int(val * 1000))  # Convert to mm
        except (ValueError, TypeError):
            pass
    
    # Case 3: Centimeters format - "120cm", "120 cm"
    if "cm" in s:
        try:
            val = float(s.replace("cm", "").replace(" ", ""))
            return str(int(val * 10))  # Convert cm to mm
        except (ValueError, TypeError):
            pass
    
    # Case 4: Millimeters format - "1200mm", "1200 mm"
    if "mm" in s:
        try:
            val = float(s.replace("mm", "").replace(" ", ""))
            return str(int(val))
        except (ValueError, TypeError):
            pass
    
    # Fallback: return original if cannot parse
    return s


def clean_product_query(text: str) -> str:
    """
    Làm sạch câu hỏi để lấy tên sản phẩm cốt lõi.
    Loại bỏ các từ thừa (stop words) như "chi tiết", "thông tin", "của", "là" trước khi tìm kiếm.
    
    QUAN TRỌNG: Giữ lại các ký tự đặc biệt trong tên sản phẩm (như F-42, Chữ L, Chữ U)
    
    Ví dụ: 
        "Cho mình xin thông tin con F42 với" -> "F42"
        "Chi tiết F42" -> "F42"
        "Thông tin chi tiết của smark desk gtech f42" -> "smark desk gtech f42"
        "Bàn chữ U" -> "Bàn chữ U" (giữ nguyên "chữ U")
    """
    if not text:
        return ""
    
    # 1. Chuyển về chữ thường
    text = text.lower()
    
    # 2. Danh sách từ thừa (Stop words) cần loại bỏ
    stop_words = [
        "thông tin", "chi tiết", "cấu hình", "thông số", "về", "của", "cho", 
        "mình", "em", "shop", "ad", "admin", "sản phẩm", "con", "cái", "chiếc",
        "là gì", "như thế nào", "ra sao", "với", "ạ", "nhé", "nha", "muốn xem", 
        "hỏi", "tư vấn", "giúp", "tìm", "mua", "bán", "giá", "bao nhiêu", "review", "đánh giá",
        "xin", "cho tôi", "cho mình", "cho em", "xem", "muốn", "cần", "có thể",
        "được không", "được", "không", "có", "là", "và", "hoặc"
    ]
    
    # 3. Xóa từng từ (sử dụng word boundary để tránh xóa nhầm)
    for word in stop_words:
        # Xóa từ đứng đầu câu hoặc giữa câu (có khoảng trắng bao quanh)
        text = re.sub(r'\b' + re.escape(word) + r'\b', ' ', text, flags=re.IGNORECASE)
    
    # 4. QUAN TRỌNG: Chỉ xóa ký tự đặc biệt vô nghĩa, GIỮ LẠI các ký tự trong tên sản phẩm
    # Giữ lại: chữ, số, khoảng trắng, dấu gạch ngang (-), dấu chấm (.) cho số thập phân (1.2m)
    # Xóa: !@#$%^&*():,<>?[]{}|`~ (nhưng giữ - và .)
    # Lưu ý: Không xóa dấu chấm (.) vì có thể là số thập phân (1.2m, 1.4m)
    text = re.sub(r'[!@#$%^&*():,<>?\[\]{}|`~]', ' ', text)
    
    # 5. Xóa khoảng trắng thừa
    text = re.sub(r'\s+', ' ', text)
    
    return text.strip()

