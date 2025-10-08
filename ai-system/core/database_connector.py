#!/usr/bin/env python3
"""
Database Connector - Kết nối với MySQL database từ Prisma schema
Chức năng: Quản lý kết nối và truy vấn database cho AI system
"""

import os
import logging
import mysql.connector
from mysql.connector import Error
from typing import Dict, List, Any, Optional, Union
from contextlib import contextmanager
import json
from datetime import datetime

logger = logging.getLogger(__name__)

class DatabaseConnector:
    """Kết nối và quản lý database MySQL từ Prisma schema"""
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or self._load_config()
        self.connection = None
        
    def _load_config(self) -> Dict[str, Any]:
        """Load database configuration from environment"""
        return {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': int(os.getenv('DB_PORT', 3306)),
            'user': os.getenv('DB_USER', 'root'),
            'password': os.getenv('DB_PASSWORD', ''),
            'database': os.getenv('DB_NAME', 'ecommerce'),
            'charset': 'utf8mb4',
            'autocommit': True
        }
    
    def connect(self) -> bool:
        """Kết nối đến database"""
        try:
            self.connection = mysql.connector.connect(**self.config)
            if self.connection.is_connected():
                logger.info(f"✅ Connected to MySQL database: {self.config['database']}")
                return True
        except Error as e:
            logger.error(f"❌ Error connecting to MySQL: {e}")
            return False
        return False
    
    def disconnect(self):
        """Ngắt kết nối database"""
        if self.connection and self.connection.is_connected():
            self.connection.close()
            logger.info("✅ Disconnected from MySQL database")
    
    @contextmanager
    def get_connection(self):
        """Context manager cho database connection"""
        conn = None
        try:
            conn = mysql.connector.connect(**self.config)
            yield conn
        except Error as e:
            logger.error(f"Database error: {e}")
            raise
        finally:
            if conn and conn.is_connected():
                conn.close()
    
    def execute_query(self, query: str, params: tuple = None) -> List[Dict[str, Any]]:
        """Thực hiện SELECT query và trả về kết quả"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor(dictionary=True)
                cursor.execute(query, params)
                results = cursor.fetchall()
                cursor.close()
                return results
        except Error as e:
            logger.error(f"Query execution error: {e}")
            return []
    
    def execute_update(self, query: str, params: tuple = None) -> int:
        """Thực hiện INSERT/UPDATE/DELETE query"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query, params)
                conn.commit()
                affected_rows = cursor.rowcount
                cursor.close()
                return affected_rows
        except Error as e:
            logger.error(f"Update execution error: {e}")
            return 0
    
    # ===========================
    # PRODUCT QUERIES
    # ===========================
    
    def get_products(self, limit: int = 100, offset: int = 0, category_id: int = None, brand_id: int = None) -> List[Dict[str, Any]]:
        """Lấy danh sách sản phẩm"""
        query = """
        SELECT p.*, c.name as category_name, b.name as brand_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN brands b ON p.brand_id = b.id
        WHERE p.status = 'ACTIVE'
        """
        params = []
        
        if category_id:
            query += " AND p.category_id = %s"
            params.append(category_id)
        
        if brand_id:
            query += " AND p.brand_id = %s"
            params.append(brand_id)
        
        query += " ORDER BY p.created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        return self.execute_query(query, tuple(params))
    
    def get_product_by_id(self, product_id: int) -> Optional[Dict[str, Any]]:
        """Lấy sản phẩm theo ID"""
        query = """
        SELECT p.*, c.name as category_name, b.name as brand_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN brands b ON p.brand_id = b.id
        WHERE p.id = %s
        """
        results = self.execute_query(query, (product_id,))
        return results[0] if results else None
    
    def search_products(self, keyword: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Tìm kiếm sản phẩm theo từ khóa"""
        query = """
        SELECT p.*, c.name as category_name, b.name as brand_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN brands b ON p.brand_id = b.id
        WHERE p.status = 'ACTIVE' 
        AND (p.name LIKE %s OR p.description LIKE %s OR p.sku LIKE %s)
        ORDER BY p.view_count DESC, p.created_at DESC
        LIMIT %s
        """
        search_term = f"%{keyword}%"
        return self.execute_query(query, (search_term, search_term, search_term, limit))
    
    def get_product_reviews(self, product_id: int, limit: int = 50) -> List[Dict[str, Any]]:
        """Lấy đánh giá sản phẩm"""
        query = """
        SELECT pr.*, u.first_name, u.last_name
        FROM product_reviews pr
        LEFT JOIN users u ON pr.user_id = u.id
        WHERE pr.product_id = %s AND pr.is_approved = 1
        ORDER BY pr.created_at DESC
        LIMIT %s
        """
        return self.execute_query(query, (product_id, limit))
    
    def get_product_specifications(self, product_id: int) -> List[Dict[str, Any]]:
        """Lấy thông số kỹ thuật sản phẩm"""
        query = """
        SELECT spec_name, spec_value, spec_unit, display_name, sort_order
        FROM product_specifications
        WHERE product_id = %s
        ORDER BY sort_order ASC
        """
        return self.execute_query(query, (product_id,))
    
    # ===========================
    # USER QUERIES
    # ===========================
    
    def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Lấy thông tin user"""
        query = """
        SELECT id, email, first_name, last_name, phone, avatar, is_active, created_at
        FROM users
        WHERE id = %s
        """
        results = self.execute_query(query, (user_id,))
        return results[0] if results else None
    
    def get_user_orders(self, user_id: int, limit: int = 20) -> List[Dict[str, Any]]:
        """Lấy đơn hàng của user"""
        query = """
        SELECT o.*, COUNT(oi.id) as item_count
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.user_id = %s
        GROUP BY o.id
        ORDER BY o.created_at DESC
        LIMIT %s
        """
        return self.execute_query(query, (user_id, limit))
    
    def get_user_cart(self, user_id: int) -> List[Dict[str, Any]]:
        """Lấy giỏ hàng của user"""
        query = """
        SELECT sc.*, p.name as product_name, p.price, p.image_url, pv.name as variant_name
        FROM shopping_cart sc
        LEFT JOIN products p ON sc.product_id = p.id
        LEFT JOIN product_variants pv ON sc.variant_id = pv.id
        WHERE sc.user_id = %s
        ORDER BY sc.created_at DESC
        """
        return self.execute_query(query, (user_id,))
    
    def get_user_wishlist(self, user_id: int) -> List[Dict[str, Any]]:
        """Lấy danh sách yêu thích của user"""
        query = """
        SELECT w.*, p.name as product_name, p.price, p.image_url, p.sale_price
        FROM wishlist w
        LEFT JOIN products p ON w.product_id = p.id
        WHERE w.user_id = %s
        ORDER BY w.created_at DESC
        """
        return self.execute_query(query, (user_id,))
    
    # ===========================
    # ORDER QUERIES
    # ===========================
    
    def get_order_by_id(self, order_id: int) -> Optional[Dict[str, Any]]:
        """Lấy đơn hàng theo ID"""
        query = """
        SELECT o.*, u.first_name, u.last_name, u.email
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE o.id = %s
        """
        results = self.execute_query(query, (order_id,))
        return results[0] if results else None
    
    def get_order_items(self, order_id: int) -> List[Dict[str, Any]]:
        """Lấy chi tiết đơn hàng"""
        query = """
        SELECT oi.*, p.name as product_name, p.image_url, pv.name as variant_name
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN product_variants pv ON oi.variant_id = pv.id
        WHERE oi.order_id = %s
        ORDER BY oi.id ASC
        """
        return self.execute_query(query, (order_id,))
    
    # ===========================
    # ANALYTICS QUERIES
    # ===========================
    
    def get_sales_analytics(self, start_date: str = None, end_date: str = None) -> Dict[str, Any]:
        """Lấy phân tích doanh số"""
        date_filter = ""
        params = []
        
        if start_date and end_date:
            date_filter = "WHERE o.created_at BETWEEN %s AND %s"
            params = [start_date, end_date]
        
        query = f"""
        SELECT 
            COUNT(DISTINCT o.id) as total_orders,
            COUNT(DISTINCT oi.product_id) as unique_products,
            SUM(oi.quantity) as total_quantity,
            SUM(oi.total_price) as total_revenue,
            AVG(oi.total_price) as avg_order_value
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        {date_filter}
        """
        
        results = self.execute_query(query, tuple(params))
        return results[0] if results else {}
    
    def get_top_products(self, limit: int = 10, start_date: str = None, end_date: str = None) -> List[Dict[str, Any]]:
        """Lấy sản phẩm bán chạy nhất"""
        date_filter = ""
        params = []
        
        if start_date and end_date:
            date_filter = "AND o.created_at BETWEEN %s AND %s"
            params = [start_date, end_date]
        
        query = f"""
        SELECT 
            p.id, p.name, p.sku, p.price,
            SUM(oi.quantity) as total_sold,
            SUM(oi.total_price) as total_revenue,
            COUNT(DISTINCT o.id) as order_count
        FROM products p
        LEFT JOIN order_items oi ON p.id = oi.product_id
        LEFT JOIN orders o ON oi.order_id = o.id
        WHERE o.status IN ('CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED')
        {date_filter}
        GROUP BY p.id, p.name, p.sku, p.price
        ORDER BY total_sold DESC
        LIMIT %s
        """
        params.append(limit)
        
        return self.execute_query(query, tuple(params))
    
    def get_category_analytics(self) -> List[Dict[str, Any]]:
        """Lấy phân tích theo danh mục"""
        query = """
        SELECT 
            c.id, c.name,
            COUNT(DISTINCT p.id) as product_count,
            COUNT(DISTINCT oi.order_id) as order_count,
            SUM(oi.quantity) as total_sold,
            SUM(oi.total_price) as total_revenue
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id
        LEFT JOIN order_items oi ON p.id = oi.product_id
        LEFT JOIN orders o ON oi.order_id = o.id
        WHERE o.status IN ('CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED')
        GROUP BY c.id, c.name
        ORDER BY total_revenue DESC
        """
        return self.execute_query(query)
    
    def get_review_analytics(self, product_id: int = None) -> Dict[str, Any]:
        """Lấy phân tích đánh giá"""
        where_clause = ""
        params = []
        
        if product_id:
            where_clause = "WHERE pr.product_id = %s"
            params = [product_id]
        
        query = f"""
        SELECT 
            COUNT(*) as total_reviews,
            AVG(rating) as avg_rating,
            COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_reviews,
            COUNT(CASE WHEN rating <= 2 THEN 1 END) as negative_reviews
        FROM product_reviews pr
        {where_clause}
        AND pr.is_approved = 1
        """
        
        results = self.execute_query(query, tuple(params))
        return results[0] if results else {}
    
    # ===========================
    # REPORT DATA QUERIES
    # ===========================
    
    def get_report_data(self, report_type: str, filters: Dict[str, Any] = None) -> Dict[str, Any]:
        """Lấy dữ liệu cho báo cáo"""
        if not filters:
            filters = {}
        
        if report_type == "sales_summary":
            return self.get_sales_analytics(
                filters.get('start_date'),
                filters.get('end_date')
            )
        elif report_type == "top_products":
            return {
                "products": self.get_top_products(
                    filters.get('limit', 10),
                    filters.get('start_date'),
                    filters.get('end_date')
                )
            }
        elif report_type == "category_analytics":
            return {
                "categories": self.get_category_analytics()
            }
        elif report_type == "review_analytics":
            return self.get_review_analytics(filters.get('product_id'))
        else:
            return {}

def main():
    """Test function"""
    db = DatabaseConnector()
    
    if db.connect():
        print("✅ Database connection successful")
        
        # Test queries
        products = db.get_products(limit=5)
        print(f"📦 Found {len(products)} products")
        
        if products:
            product_id = products[0]['id']
            reviews = db.get_product_reviews(product_id, limit=3)
            print(f"⭐ Found {len(reviews)} reviews for product {product_id}")
        
        sales_data = db.get_sales_analytics()
        print(f"💰 Sales analytics: {sales_data}")
        
        db.disconnect()
    else:
        print("❌ Database connection failed")

if __name__ == "__main__":
    main()
