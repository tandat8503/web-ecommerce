#!/usr/bin/env python3
"""
Setup Chatbot with RAG - Thiết lập chatbot thông minh với RAG
"""

import os
import sys
import sqlite3
import json
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Tuple
import pickle

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

# Database connectors
try:
    import mysql.connector
    from mysql.connector import Error
    MYSQL_AVAILABLE = True
except ImportError:
    MYSQL_AVAILABLE = False
    print("⚠️ mysql-connector-python not available. Install with: pip install mysql-connector-python")

# RAG and Vector Database
try:
    from sentence_transformers import SentenceTransformer
    from sklearn.metrics.pairwise import cosine_similarity
    VECTOR_DB_AVAILABLE = True
except ImportError:
    VECTOR_DB_AVAILABLE = False
    print("⚠️ sentence-transformers not available. Install with: pip install sentence-transformers")

class MySQLConnector:
    """MySQL Database Connector for e-commerce data"""
    
    def __init__(self):
        self.connection = None
        self.config = {
            'host': 'localhost',
            'port': 3306,
            'user': 'root',
            'password': '',  # Empty password as per .env
            'database': 'ecommerce_db'
        }
    
    def connect(self):
        """Connect to MySQL database"""
        if not MYSQL_AVAILABLE:
            return False
        try:
            self.connection = mysql.connector.connect(**self.config)
            if self.connection.is_connected():
                print("✅ Connected to MySQL database")
                return True
        except Error as e:
            print(f"❌ Error connecting to MySQL: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from MySQL database"""
        if self.connection and self.connection.is_connected():
            self.connection.close()
            print("✅ Disconnected from MySQL database")
    
    def get_products(self, limit: int = 10) -> List[Dict]:
        """Get products from database"""
        if not self.connection:
            return []
        
        try:
            cursor = self.connection.cursor(dictionary=True)
            query = """
                SELECT p.id, p.name, p.description, p.price, p.stock_quantity, 
                       p.image_url, p.created_at, c.name as category_name
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.stock_quantity > 0 AND p.status = 'ACTIVE'
                ORDER BY p.created_at DESC
                LIMIT %s
            """
            cursor.execute(query, (limit,))
            products = cursor.fetchall()
            cursor.close()
            return products
        except Error as e:
            print(f"❌ Error fetching products: {e}")
            return []
    
    def search_products(self, search_term: str) -> List[Dict]:
        """Search products by name or description"""
        if not self.connection:
            return []
        
        try:
            cursor = self.connection.cursor(dictionary=True)
            query = """
                SELECT p.id, p.name, p.description, p.price, p.stock_quantity,
                       p.image_url, p.created_at, c.name as category_name
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE (p.name LIKE %s OR p.description LIKE %s) 
                AND p.stock_quantity > 0 AND p.status = 'ACTIVE'
                ORDER BY 
                    CASE WHEN p.name LIKE %s THEN 1 ELSE 0 END,
                    CASE WHEN p.description LIKE %s THEN 1 ELSE 0 END
            """
            search_pattern = f"%{search_term}%"
            cursor.execute(query, (search_pattern, search_pattern, search_pattern, search_pattern))
            products = cursor.fetchall()
            cursor.close()
            return products
        except Error as e:
            print(f"❌ Error searching products: {e}")
            return []

# Local LLM (simplified for demo)
class SimpleLLM:
    """Simple LLM with MySQL integration"""
    
    def __init__(self, mysql_connector=None):
        self.model_name = "simple-llm"
        self.mysql = mysql_connector
        self.templates = {
            "greeting": "Xin chào! Tôi là nhân viên tư vấn AI của cửa hàng nội thất văn phòng. Tôi có thể giúp bạn tìm hiểu về sản phẩm, giá cả và dịch vụ từ database thực. Bạn cần tư vấn gì ạ?",
            "product_list": "Chúng tôi hiện có {count} sản phẩm nội thất văn phòng: {products}",
            "product_detail": "Sản phẩm '{name}' có giá {price:,} VNĐ. {description}",
            "search_results": "Tôi tìm thấy {count} sản phẩm phù hợp với '{search_term}': {products}",
            "no_results": "Xin lỗi, tôi không tìm thấy sản phẩm nào phù hợp với yêu cầu của bạn. Bạn có thể thử tìm kiếm với từ khóa khác không?",
            "fallback": "Xin lỗi, tôi chưa hiểu rõ câu hỏi của bạn. Bạn có thể hỏi về sản phẩm, giá cả, hoặc dịch vụ không?"
        }
    
    def generate_response(self, query: str, context: str = "") -> str:
        """Generate response based on query and MySQL data"""
        query_lower = query.lower()
        
        # Product validation - Check if query is about office furniture
        if self._is_out_of_category_query(query_lower):
            return "Xin lỗi, chúng tôi chỉ chuyên về nội thất văn phòng (bàn, ghế, tủ sách, bàn ăn, sofa, giường, tủ quần áo). Bạn có thể hỏi về các sản phẩm này không?"
        
        # Product listing with MySQL data (ưu tiên cao)
        if any(word in query_lower for word in ["sản phẩm", "sản phẩm gì", "có gì", "bán gì", "danh sách", "list", "bán các sản phẩm"]) and not any(word in query_lower for word in ["tìm", "search", "mua"]):
            if self.mysql and self.mysql.connection:
                products = self.mysql.get_products(5)
                if products:
                    product_names = [p['name'] for p in products[:3]]
                    products_text = ", ".join(product_names)
                    if len(products) > 3:
                        products_text += f" và {len(products) - 3} sản phẩm khác"
                    return self.templates["product_list"].format(
                        count=len(products),
                        products=products_text
                    )
            return "Chúng tôi chuyên cung cấp các sản phẩm nội thất văn phòng chất lượng cao bao gồm: bàn làm việc, ghế văn phòng, tủ sách, bàn ăn, sofa, giường, tủ quần áo."
        
        # Greeting detection
        if any(word in query_lower for word in ["xin chào", "hello", "hi", "chào"]) and not any(word in query_lower for word in ["giá", "tìm", "mua", "có"]):
            return self.templates["greeting"]
        
        # Price information with MySQL data
        if any(word in query_lower for word in ["giá", "bao nhiêu", "tiền", "cost", "price", "giá bàn", "giá ghế", "giá tủ"]):
            if self.mysql and self.mysql.connection:
                # Get price range from database
                price_info = self._get_price_range()
                if price_info:
                    return f"Giá sản phẩm của chúng tôi dao động từ {price_info['min_price']:,} VNĐ đến {price_info['max_price']:,} VNĐ. Trung bình khoảng {price_info['avg_price']:,.0f} VNĐ."
            return "Giá sản phẩm của chúng tôi dao động từ 500,000 VNĐ đến 5,000,000 VNĐ tùy theo loại sản phẩm và chất liệu."
        
        # Product search with improved logic
        if any(word in query_lower for word in ["tìm", "search", "có", "còn", "mua"]) and not any(word in query_lower for word in ["giao hàng", "bảo hành", "địa chỉ", "liên hệ"]):
            if self.mysql and self.mysql.connection:
                # Extract search terms more intelligently
                search_term = self._extract_search_term(query_lower)
                if search_term:
                    products = self.mysql.search_products(search_term)
                    if products:
                        product_names = [p['name'] for p in products[:3]]
                        products_text = ", ".join(product_names)
                        if len(products) > 3:
                            products_text += f" và {len(products) - 3} sản phẩm khác"
                        return self.templates["search_results"].format(
                            count=len(products),
                            search_term=search_term,
                            products=products_text
                        )
                    else:
                        return f"Xin lỗi, tôi không tìm thấy sản phẩm nào phù hợp với '{search_term}'. Bạn có thể thử tìm kiếm với từ khóa khác như 'bàn', 'ghế', 'tủ' không?"
        
        # Warranty information
        if any(word in query_lower for word in ["bảo hành", "warranty", "bao lâu", "thời gian"]):
            return "Tất cả sản phẩm của chúng tôi đều được bảo hành 2 năm và hỗ trợ khách hàng 24/7."
        
        # Contact information
        if any(word in query_lower for word in ["địa chỉ", "address", "liên hệ", "contact", "điện thoại", "phone"]):
            return "Địa chỉ: 123 Đường ABC, Quận XYZ, TP.HCM. Điện thoại: 0123-456-789. Email: info@furniture.com. Giờ làm việc: 8:00 - 18:00 (Thứ 2 - Thứ 6)."
        
        # Working hours
        if any(word in query_lower for word in ["giờ làm việc", "working hours", "mở cửa", "thời gian"]):
            return "Giờ làm việc: 8:00 - 18:00 (Thứ 2 - Thứ 6), 8:00 - 17:00 (Thứ 7). Chủ nhật nghỉ."
        
        # Installation service
        if any(word in query_lower for word in ["lắp ráp", "assembly", "install", "miễn phí"]):
            return "Chúng tôi cung cấp dịch vụ lắp ráp miễn phí cho tất cả sản phẩm nội thất văn phòng."
        
        # Quality information
        if any(word in query_lower for word in ["chất lượng", "quality", "tốt", "good", "uy tín", "có chất lượng"]):
            return "Tất cả sản phẩm của chúng tôi đều được làm từ gỗ tự nhiên, có thiết kế hiện đại và chất lượng cao."
        
        # Fallback
        return self.templates["fallback"]
    
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
    
    def _get_price_range(self) -> dict:
        """Get price range from MySQL database"""
        if not self.mysql or not self.mysql.connection:
            return None
        
        try:
            cursor = self.mysql.connection.cursor(dictionary=True)
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
            print(f"❌ Error getting price range: {e}")
            return None

class RAGSystem:
    """RAG System for chatbot with MySQL integration"""
    
    def __init__(self, db_path: str = "data/chatbot_knowledge.db"):
        self.db_path = db_path
        self.embedding_model = None
        self.vector_db = None
        self.mysql = MySQLConnector()
        self.llm = None
        
    def init_database(self):
        """Initialize knowledge database"""
        print("🔄 Initializing knowledge database...")
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create tables
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS knowledge_base (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                category TEXT,
                tags TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS embeddings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                knowledge_id INTEGER,
                embedding BLOB,
                FOREIGN KEY (knowledge_id) REFERENCES knowledge_base (id)
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chat_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                user_query TEXT,
                bot_response TEXT,
                context_used TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
        conn.close()
        
        print("✅ Knowledge database initialized")
    
    def load_embedding_model(self):
        """Load sentence transformer model"""
        if not VECTOR_DB_AVAILABLE:
            print("⚠️ Vector database not available. Using simple keyword matching.")
            return
        
        print("🔄 Loading embedding model...")
        try:
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            print("✅ Embedding model loaded")
        except Exception as e:
            print(f"❌ Error loading embedding model: {e}")
            self.embedding_model = None
    
    def connect_mysql(self):
        """Connect to MySQL database"""
        if self.mysql.connect():
            self.llm = SimpleLLM(self.mysql)
            return True
        else:
            self.llm = SimpleLLM()  # Fallback without MySQL
            return False
    
    def add_knowledge(self, title: str, content: str, category: str = "general", tags: str = ""):
        """Add knowledge to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO knowledge_base (title, content, category, tags)
            VALUES (?, ?, ?, ?)
        """, (title, content, category, tags))
        
        knowledge_id = cursor.lastrowid
        
        # Generate embedding if model available
        if self.embedding_model:
            embedding = self.embedding_model.encode(content)
            cursor.execute("""
                INSERT INTO embeddings (knowledge_id, embedding)
                VALUES (?, ?)
            """, (knowledge_id, pickle.dumps(embedding)))
        
        conn.commit()
        conn.close()
        
        print(f"✅ Added knowledge: {title}")
    
    def search_knowledge(self, query: str, top_k: int = 3) -> List[Dict]:
        """Search knowledge base for relevant information"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        if self.embedding_model:
            # Vector similarity search
            query_embedding = self.embedding_model.encode(query)
            
            cursor.execute("""
                SELECT kb.title, kb.content, kb.category, kb.tags
                FROM knowledge_base kb
                JOIN embeddings e ON kb.id = e.knowledge_id
            """)
            
            results = []
            for row in cursor.fetchall():
                title, content, category, tags = row
                # Calculate similarity (simplified)
                similarity = 0.5  # Placeholder
                results.append({
                    'title': title,
                    'content': content,
                    'category': category,
                    'tags': tags,
                    'similarity': similarity
                })
            
            # Sort by similarity
            results.sort(key=lambda x: x['similarity'], reverse=True)
            
        else:
            # Simple keyword matching
            cursor.execute("""
                SELECT title, content, category, tags
                FROM knowledge_base
                WHERE content LIKE ? OR title LIKE ?
                ORDER BY 
                    CASE WHEN title LIKE ? THEN 1 ELSE 0 END,
                    CASE WHEN content LIKE ? THEN 1 ELSE 0 END
            """, (f"%{query}%", f"%{query}%", f"%{query}%", f"%{query}%"))
            
            results = []
            for row in cursor.fetchall():
                title, content, category, tags = row
                results.append({
                    'title': title,
                    'content': content,
                    'category': category,
                    'tags': tags,
                    'similarity': 1.0
                })
        
        conn.close()
        return results[:top_k]
    
    def generate_response(self, query: str, session_id: str = None) -> str:
        """Generate response using RAG"""
        # Search for relevant knowledge
        relevant_docs = self.search_knowledge(query)
        
        # Build context
        context = ""
        if relevant_docs:
            context = "\n".join([doc['content'] for doc in relevant_docs])
        
        # Generate response using LLM
        response = self.llm.generate_response(query, context)
        
        # Save to chat history
        if session_id:
            self.save_chat_history(session_id, query, response, context)
        
        return response
    
    def save_chat_history(self, session_id: str, user_query: str, bot_response: str, context: str = ""):
        """Save chat history"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO chat_history (session_id, user_query, bot_response, context_used)
            VALUES (?, ?, ?, ?)
        """, (session_id, user_query, bot_response, context))
        
        conn.commit()
        conn.close()
    
    def setup_default_knowledge(self):
        """Setup default knowledge base"""
        print("🔄 Setting up default knowledge base...")
        
        # Product information
        self.add_knowledge(
            "Sản phẩm nội thất văn phòng",
            "Chúng tôi chuyên cung cấp các sản phẩm nội thất văn phòng chất lượng cao bao gồm: bàn làm việc, ghế văn phòng, tủ sách, bàn ăn, sofa, giường, tủ quần áo. Tất cả sản phẩm đều được làm từ gỗ tự nhiên và có thiết kế hiện đại.",
            "products",
            "nội thất, văn phòng, sản phẩm"
        )
        
        # Price information
        self.add_knowledge(
            "Giá cả sản phẩm",
            "Giá sản phẩm của chúng tôi dao động từ 500,000 VNĐ đến 5,000,000 VNĐ tùy theo loại sản phẩm và chất liệu. Chúng tôi cam kết giá cả cạnh tranh và chất lượng tốt nhất.",
            "pricing",
            "giá, tiền, cost, price"
        )
        
        # Services
        self.add_knowledge(
            "Dịch vụ khách hàng",
            "Chúng tôi cung cấp dịch vụ giao hàng tận nơi, lắp ráp miễn phí, bảo hành 2 năm và hỗ trợ khách hàng 24/7. Đội ngũ nhân viên chuyên nghiệp sẵn sàng tư vấn và hỗ trợ.",
            "services",
            "dịch vụ, giao hàng, bảo hành, hỗ trợ"
        )
        
        # Contact information
        self.add_knowledge(
            "Thông tin liên hệ",
            "Địa chỉ: 123 Đường ABC, Quận XYZ, TP.HCM. Điện thoại: 0123-456-789. Email: info@furniture.com. Website: www.furniture.com. Giờ làm việc: 8:00 - 18:00 (Thứ 2 - Thứ 6), 8:00 - 17:00 (Thứ 7).",
            "contact",
            "liên hệ, địa chỉ, điện thoại, email"
        )
        
        # FAQ
        self.add_knowledge(
            "Câu hỏi thường gặp",
            "Q: Sản phẩm có bảo hành không? A: Có, chúng tôi bảo hành 2 năm cho tất cả sản phẩm. Q: Có giao hàng miễn phí không? A: Có, giao hàng miễn phí trong nội thành. Q: Có lắp ráp không? A: Có, chúng tôi lắp ráp miễn phí.",
            "faq",
            "câu hỏi, faq, thường gặp"
        )
        
        print("✅ Default knowledge base setup completed")

def main():
    """Main function"""
    print("🤖 Setting up Enhanced Chatbot with MySQL Integration")
    print("=" * 70)
    
    # Initialize RAG system
    rag = RAGSystem()
    
    # Setup database
    rag.init_database()
    
    # Load embedding model
    rag.load_embedding_model()
    
    # Connect to MySQL
    if rag.connect_mysql():
        print("✅ MySQL connected successfully!")
    else:
        print("⚠️ MySQL connection failed. Using fallback mode.")
    
    # Setup default knowledge
    rag.setup_default_knowledge()
    
    print("\n🎉 Enhanced chatbot setup completed!")
    print("💡 You can now use the chatbot with:")
    print("   python scripts/chatbot_interactive.py")
    print("   or")
    print("   make chatbot-chat")

if __name__ == "__main__":
    main()