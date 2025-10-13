# Unified AI Chatbot Module
"""
Advanced AI Chatbot with MySQL integration, caching, and analytics
Combines all chatbot functionality into a single, clean module
"""

import os
import sys
import json
import time
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Union, Any
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent.parent))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Check dependencies
MYSQL_AVAILABLE = False
try:
    import mysql.connector
    MYSQL_AVAILABLE = True
except ImportError:
    logger.warning("⚠️ MySQL connector not available")

@dataclass
class ChatMessage:
    """Structured message format"""
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime
    session_id: str
    metadata: Optional[Dict] = None

@dataclass
class ProductInfo:
    """Structured product data"""
    id: int
    name: str
    price: float
    category: str
    stock_quantity: int
    description: Optional[str] = None

@dataclass
class ChatMetrics:
    """Chat metrics for analytics"""
    session_id: str
    message_count: int
    response_time_avg: float
    timestamp: datetime
    error_count: int = 0
    fallback_count: int = 0

class MySQLConnector:
    """Optimized MySQL connector with caching and connection pooling"""
    
    def __init__(self):
        self.config = {
            'host': 'localhost',
            'user': 'root',
            'password': '',
            'database': 'ecommerce_db',
            'port': 3306,
            'charset': 'utf8mb4',
            'autocommit': True,
            'pool_size': 5,
            'pool_reset_session': True
        }
        self.connection = None
        self._cache = {}
        self._cache_ttl = 300  # 5 minutes
        self._last_cache_cleanup = datetime.now()
    
    def connect(self):
        """Connect to MySQL database"""
        if not MYSQL_AVAILABLE:
            logger.warning("⚠️ MySQL not available, using fallback mode")
            return False
        
        try:
            self.connection = mysql.connector.connect(**self.config)
            if self.connection.is_connected():
                logger.info("✅ Connected to MySQL database")
                return True
        except Exception as e:
            logger.error(f"❌ MySQL connection failed: {e}")
        
        return False
    
    def _cleanup_cache(self):
        """Clean expired cache entries"""
        now = datetime.now()
        if (now - self._last_cache_cleanup).seconds > 60:  # Cleanup every minute
            expired_keys = [k for k, (_, timestamp) in self._cache.items() 
                          if (now - timestamp).seconds > self._cache_ttl]
            for key in expired_keys:
                del self._cache[key]
            self._last_cache_cleanup = now
    
    def get_products(self, limit: int = 10) -> List[Dict]:
        """Get products with caching"""
        cache_key = f"products_{limit}"
        
        # Check cache first
        if cache_key in self._cache:
            cached_data, timestamp = self._cache[cache_key]
            if (datetime.now() - timestamp).seconds < self._cache_ttl:
                return cached_data
        
        if not self.connection:
            return []
        
        try:
            cursor = self.connection.cursor(dictionary=True)
            query = """
                SELECT p.id, p.name, p.price, p.stock_quantity, p.description, c.name as category_name
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.status = 'ACTIVE' AND p.stock_quantity > 0
                ORDER BY p.created_at DESC
                LIMIT %s
            """
            cursor.execute(query, (limit,))
            products = cursor.fetchall()
            cursor.close()
            
            # Cache results
            self._cache[cache_key] = (products, datetime.now())
            self._cleanup_cache()
            
            return products
            
        except Exception as e:
            logger.error(f"❌ Error fetching products: {e}")
            return []
    
    def search_products(self, search_term: str) -> List[Dict]:
        """Search products by name or description"""
        cache_key = f"search_{search_term}"
        
        # Check cache first
        if cache_key in self._cache:
            cached_data, timestamp = self._cache[cache_key]
            if (datetime.now() - timestamp).seconds < self._cache_ttl:
                return cached_data
        
        if not self.connection:
            return []
        
        try:
            cursor = self.connection.cursor(dictionary=True)
            query = """
                SELECT p.id, p.name, p.price, p.stock_quantity, p.description, c.name as category_name
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.status = 'ACTIVE' AND p.stock_quantity > 0
                AND (p.name LIKE %s OR p.description LIKE %s)
                ORDER BY p.created_at DESC
                LIMIT 10
            """
            search_pattern = f"%{search_term}%"
            cursor.execute(query, (search_pattern, search_pattern))
            products = cursor.fetchall()
            cursor.close()
            
            # Cache results
            self._cache[cache_key] = (products, datetime.now())
            self._cleanup_cache()
            
            return products
            
        except Exception as e:
            logger.error(f"❌ Error searching products: {e}")
            return []
    
    def get_price_range(self) -> Optional[Dict]:
        """Get price range from database"""
        if not self.connection:
            return None
        
        try:
            cursor = self.connection.cursor(dictionary=True)
            query = """
                SELECT 
                    MIN(price) as min_price,
                    MAX(price) as max_price,
                    AVG(price) as avg_price
                FROM products 
                WHERE stock_quantity > 0 AND status = 'ACTIVE'
            """
            cursor.execute(query)
            price_info = cursor.fetchone()
            cursor.close()
            return price_info
        except Exception as e:
            logger.error(f"❌ Error getting price range: {e}")
            return None

class AdvancedLLM:
    """Advanced LLM with context management and intelligent responses"""
    
    def __init__(self, mysql_connector: MySQLConnector):
        self.mysql = mysql_connector
        self.conversation_memory = defaultdict(list)  # Session-based memory
        self.response_templates = {
            "greeting": "Xin chào! Tôi là nhân viên tư vấn AI của cửa hàng nội thất văn phòng. Tôi có thể giúp bạn tìm hiểu về sản phẩm, giá cả và dịch vụ từ database thực. Bạn cần tư vấn gì ạ?",
            "product_list": "Chúng tôi hiện có {count} sản phẩm nội thất văn phòng: {products}",
            "search_results": "Tôi tìm thấy {count} sản phẩm phù hợp với '{search_term}': {products}",
            "no_results": "Xin lỗi, tôi không tìm thấy sản phẩm nào phù hợp với yêu cầu của bạn. Bạn có thể thử tìm kiếm với từ khóa khác không?",
            "out_of_category": "Xin lỗi, chúng tôi chỉ chuyên về nội thất văn phòng (bàn, ghế, tủ sách, bàn ăn, sofa, giường, tủ quần áo). Bạn có thể hỏi về các sản phẩm này không?",
            "price_info": "Giá sản phẩm của chúng tôi dao động từ {min_price:,} VNĐ đến {max_price:,} VNĐ. Trung bình khoảng {avg_price:,.0f} VNĐ.",
            "service_info": "Chúng tôi cung cấp dịch vụ giao hàng tận nơi miễn phí trong nội thành và hỗ trợ lắp ráp miễn phí cho tất cả sản phẩm.",
            "warranty_info": "Tất cả sản phẩm của chúng tôi đều được bảo hành 2 năm và hỗ trợ khách hàng 24/7.",
            "contact_info": "Địa chỉ: 123 Đường ABC, Quận XYZ, TP.HCM. Điện thoại: 0123-456-789. Email: info@furniture.com. Giờ làm việc: 8:00 - 18:00 (Thứ 2 - Thứ 6).",
            "quality_info": "Tất cả sản phẩm của chúng tôi đều được làm từ gỗ tự nhiên, có thiết kế hiện đại và chất lượng cao.",
            "fallback": "Xin lỗi, tôi chưa hiểu rõ câu hỏi của bạn. Bạn có thể hỏi về sản phẩm, giá cả, hoặc dịch vụ không?"
        }
    
    def generate_response(self, query: str, context: str = "") -> str:
        """Generate intelligent response based on query and context"""
        query_lower = query.lower()
        
        # Product validation - Check if query is about office furniture
        if self._is_out_of_category_query(query_lower):
            return self.response_templates["out_of_category"]
        
        # Product listing with MySQL data (highest priority)
        if any(word in query_lower for word in ["sản phẩm", "sản phẩm gì", "có gì", "bán gì", "danh sách", "list", "bán các sản phẩm"]) and not any(word in query_lower for word in ["tìm", "search", "mua"]):
            if self.mysql and self.mysql.connection:
                products = self.mysql.get_products(5)
                if products:
                    product_names = [p['name'] for p in products[:3]]
                    products_text = ", ".join(product_names)
                    if len(products) > 3:
                        products_text += f" và {len(products) - 3} sản phẩm khác"
                    return self.response_templates["product_list"].format(
                        count=len(products),
                        products=products_text
                    )
            return "Chúng tôi chuyên cung cấp các sản phẩm nội thất văn phòng chất lượng cao bao gồm: bàn làm việc, ghế văn phòng, tủ sách, bàn ăn, sofa, giường, tủ quần áo."
        
        # Greeting detection
        if any(word in query_lower for word in ["xin chào", "hello", "hi", "chào"]) and not any(word in query_lower for word in ["giá", "tìm", "mua", "có"]):
            return self.response_templates["greeting"]
        
        # Price information with MySQL data
        if any(word in query_lower for word in ["giá", "bao nhiêu", "tiền", "cost", "price", "giá bàn", "giá ghế", "giá tủ"]):
            if self.mysql and self.mysql.connection:
                price_info = self._get_price_range()
                if price_info:
                    return self.response_templates["price_info"].format(
                        min_price=price_info['min_price'],
                        max_price=price_info['max_price'],
                        avg_price=price_info['avg_price']
                    )
            return "Giá sản phẩm của chúng tôi dao động từ 500,000 VNĐ đến 5,000,000 VNĐ tùy theo loại sản phẩm và chất liệu."
        
        # Product search with improved logic
        if any(word in query_lower for word in ["tìm", "search", "có", "còn", "mua"]) and not any(word in query_lower for word in ["giao hàng", "bảo hành", "địa chỉ", "liên hệ"]):
            if self.mysql and self.mysql.connection:
                search_term = self._extract_search_term(query_lower)
                if search_term:
                    products = self.mysql.search_products(search_term)
                    if products:
                        product_names = [p['name'] for p in products[:3]]
                        products_text = ", ".join(product_names)
                        if len(products) > 3:
                            products_text += f" và {len(products) - 3} sản phẩm khác"
                        return self.response_templates["search_results"].format(
                            count=len(products),
                            search_term=search_term,
                            products=products_text
                        )
                    else:
                        return f"Xin lỗi, tôi không tìm thấy sản phẩm nào phù hợp với '{search_term}'. Bạn có thể thử tìm kiếm với từ khóa khác như 'bàn', 'ghế', 'tủ' không?"
        
        # Service information
        if any(word in query_lower for word in ["giao hàng", "giao", "ship", "delivery", "tận nơi"]):
            return self.response_templates["service_info"]
        
        # Warranty information
        if any(word in query_lower for word in ["bảo hành", "warranty", "bao lâu", "thời gian"]):
            return self.response_templates["warranty_info"]
        
        # Contact information
        if any(word in query_lower for word in ["địa chỉ", "address", "liên hệ", "contact", "số điện thoại", "phone"]):
            return self.response_templates["contact_info"]
        
        # Quality information
        if any(word in query_lower for word in ["chất lượng", "quality", "tốt", "good", "uy tín", "có chất lượng"]):
            return self.response_templates["quality_info"]
        
        # Fallback
        return self.response_templates["fallback"]
    
    def _is_out_of_category_query(self, query_lower: str) -> bool:
        """Check if query is about products outside office furniture category"""
        out_of_category_keywords = [
            "iphone", "samsung", "xiaomi", "oppo", "vivo", "realme",
            "laptop", "máy tính", "computer", "pc", "macbook",
            "điện thoại", "phone", "mobile", "smartphone",
            "xe máy", "xe đạp", "ô tô", "car", "motorcycle",
            "quần áo", "giày dép", "shoes", "clothes", "fashion",
            "mỹ phẩm", "cosmetics", "skincare", "makeup",
            "thực phẩm", "food", "đồ ăn", "restaurant"
        ]
        
        return any(keyword in query_lower for keyword in out_of_category_keywords)
    
    def _extract_search_term(self, query_lower: str) -> str:
        """Extract search terms more intelligently"""
        furniture_keywords = ["bàn", "ghế", "tủ", "sofa", "giường", "văn phòng", "nội thất"]
        
        # Find furniture keywords in query
        found_keywords = [keyword for keyword in furniture_keywords if keyword in query_lower]
        
        if found_keywords:
            return " ".join(found_keywords)
        
        # If no furniture keywords, try to extract meaningful words
        words = query_lower.split()
        meaningful_words = [word for word in words if len(word) > 2 and word not in ["tìm", "có", "còn", "mua", "sản", "phẩm"]]
        
        return " ".join(meaningful_words[:2]) if meaningful_words else ""
    
    def _get_price_range(self) -> Optional[Dict]:
        """Get price range from MySQL database"""
        if not self.mysql or not self.mysql.connection:
            return None
        
        return self.mysql.get_price_range()

class ChatbotAnalytics:
    """Lightweight analytics for chatbot performance"""
    
    def __init__(self):
        self.metrics_buffer = deque(maxlen=1000)  # Keep last 1k metrics
        self.session_metrics = defaultdict(lambda: {
            'start_time': None,
            'message_count': 0,
            'response_times': [],
            'errors': 0
        })
    
    def log_message(self, session_id: str, response_time: float, error: bool = False):
        """Log message metrics"""
        now = datetime.now()
        
        # Update session metrics
        session_data = self.session_metrics[session_id]
        if session_data['start_time'] is None:
            session_data['start_time'] = now
        
        session_data['message_count'] += 1
        session_data['response_times'].append(response_time)
        
        if error:
            session_data['errors'] += 1
        
        # Create metrics record
        metrics = ChatMetrics(
            session_id=session_id,
            message_count=session_data['message_count'],
            response_time_avg=sum(session_data['response_times']) / len(session_data['response_times']),
            timestamp=now,
            error_count=session_data['errors']
        )
        
        self.metrics_buffer.append(metrics)
    
    def get_session_stats(self, session_id: str) -> Dict:
        """Get session statistics"""
        if session_id not in self.session_metrics:
            return {}
        
        session_data = self.session_metrics[session_id]
        return {
            'session_id': session_id,
            'message_count': session_data['message_count'],
            'avg_response_time': sum(session_data['response_times']) / len(session_data['response_times']) if session_data['response_times'] else 0,
            'error_rate': session_data['errors'] / session_data['message_count'] if session_data['message_count'] > 0 else 0
        }
    
    def get_system_stats(self) -> Dict:
        """Get system statistics"""
        if not self.metrics_buffer:
            return {}
        
        total_messages = len(self.metrics_buffer)
        avg_response_time = sum(m.response_time_avg for m in self.metrics_buffer) / total_messages
        error_rate = sum(m.error_count for m in self.metrics_buffer) / total_messages
        
        return {
            'total_messages': total_messages,
            'avg_response_time': avg_response_time,
            'error_rate': error_rate,
            'active_sessions': len(self.session_metrics)
        }

class UnifiedRAGSystem:
    """Unified RAG System combining all chatbot functionality"""
    
    def __init__(self, db_path: str = "data/chatbot_knowledge.db"):
        self.db_path = db_path
        self.mysql = MySQLConnector()
        self.llm = None
        self.analytics = ChatbotAnalytics()
        self.initialized = False
        
        # Knowledge base
        self.knowledge_base = []
        self.embedding_model = None
    
    def init_database(self):
        """Initialize SQLite knowledge database"""
        try:
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            
            import sqlite3
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Create tables
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS knowledge_base (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    content TEXT NOT NULL,
                    category TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS conversation_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    user_message TEXT NOT NULL,
                    bot_response TEXT NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            conn.commit()
            conn.close()
            
            logger.info("✅ Knowledge database initialized")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error initializing database: {e}")
            return False
    
    def load_embedding_model(self):
        """Load embedding model for vector search"""
        try:
            # Try to load sentence-transformers
            from sentence_transformers import SentenceTransformer
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("✅ Embedding model loaded")
        except ImportError:
            logger.warning("⚠️ sentence-transformers not available. Using simple keyword matching.")
            self.embedding_model = None
    
    def connect_mysql(self):
        """Connect to MySQL database"""
        return self.mysql.connect()
    
    def initialize(self):
        """Initialize all components"""
        if self.initialized:
            return True
        
        try:
            # Initialize components
            self.init_database()
            self.load_embedding_model()
            mysql_connected = self.connect_mysql()
            
            # Initialize LLM
            self.llm = AdvancedLLM(self.mysql)
            
            # Load default knowledge
            self._load_default_knowledge()
            
            self.initialized = True
            logger.info("✅ Unified RAG system initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error initializing RAG system: {e}")
            return False
    
    def _load_default_knowledge(self):
        """Load default knowledge base"""
        default_knowledge = [
            "Chúng tôi chuyên về nội thất văn phòng chất lượng cao",
            "Sản phẩm bao gồm: bàn làm việc, ghế văn phòng, tủ sách, bàn ăn, sofa, giường, tủ quần áo",
            "Giao hàng tận nơi miễn phí trong nội thành",
            "Bảo hành 2 năm cho tất cả sản phẩm",
            "Hỗ trợ khách hàng 24/7",
            "Địa chỉ: 123 Đường ABC, Quận XYZ, TP.HCM",
            "Điện thoại: 0123-456-789",
            "Email: info@furniture.com"
        ]
        
        self.knowledge_base = default_knowledge
    
    def generate_response(self, query: str, session_id: str = None) -> Dict:
        """Generate response with full context and analytics"""
        if not self.initialized:
            self.initialize()
        
        start_time = time.time()
        
        try:
            # Generate response
            response = self.llm.generate_response(query)
            
            # Log conversation
            if session_id:
                self._log_conversation(session_id, query, response)
            
            # Calculate response time
            response_time = time.time() - start_time
            
            # Log analytics
            self.analytics.log_message(session_id or "anonymous", response_time)
            
            return {
                "response": response,
                "session_id": session_id,
                "timestamp": datetime.now().isoformat(),
                "success": True,
                "response_time": response_time,
                "metadata": {
                    "model": "unified_rag",
                    "mysql_connected": self.mysql.connection is not None,
                    "knowledge_base_size": len(self.knowledge_base)
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Error generating response: {e}")
            
            # Log error
            response_time = time.time() - start_time
            self.analytics.log_message(session_id or "anonymous", response_time, error=True)
            
            return {
                "response": "Xin lỗi, có lỗi xảy ra khi xử lý tin nhắn của bạn. Vui lòng thử lại sau.",
                "session_id": session_id,
                "timestamp": datetime.now().isoformat(),
                "success": False,
                "error": str(e),
                "response_time": response_time
            }
    
    def _log_conversation(self, session_id: str, user_message: str, bot_response: str):
        """Log conversation to database"""
        try:
            import sqlite3
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO conversation_logs (session_id, user_message, bot_response)
                VALUES (?, ?, ?)
            ''', (session_id, user_message, bot_response))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"❌ Error logging conversation: {e}")
    
    def get_analytics(self) -> Dict:
        """Get system analytics"""
        return {
            "system_stats": self.analytics.get_system_stats(),
            "mysql_connected": self.mysql.connection is not None,
            "knowledge_base_size": len(self.knowledge_base),
            "initialized": self.initialized
        }
    
    def get_session_history(self, session_id: str) -> List[Dict]:
        """Get conversation history for session"""
        try:
            import sqlite3
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT user_message, bot_response, timestamp
                FROM conversation_logs
                WHERE session_id = ?
                ORDER BY timestamp DESC
                LIMIT 50
            ''', (session_id,))
            
            history = []
            for row in cursor.fetchall():
                history.append({
                    "user_message": row[0],
                    "bot_response": row[1],
                    "timestamp": row[2]
                })
            
            conn.close()
            return history
            
        except Exception as e:
            logger.error(f"❌ Error getting session history: {e}")
            return []

# Global instance for easy access
_rag_system = None

def get_rag_system() -> UnifiedRAGSystem:
    """Get global RAG system instance"""
    global _rag_system
    if _rag_system is None:
        _rag_system = UnifiedRAGSystem()
        _rag_system.initialize()
    return _rag_system

# Backward compatibility
RAGSystem = UnifiedRAGSystem

if __name__ == "__main__":
    # Demo usage
    rag = get_rag_system()
    
    test_queries = [
        "Xin chào",
        "Có những sản phẩm gì?",
        "Shop có iPhone không?",
        "Giá bàn làm việc bao nhiêu?"
    ]
    
    for query in test_queries:
        result = rag.generate_response(query, "demo_session")
        print(f"Q: {query}")
        print(f"A: {result['response']}")
        print(f"Time: {result['response_time']:.3f}s")
        print("-" * 50)
