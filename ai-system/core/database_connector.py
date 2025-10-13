#!/usr/bin/env python3
"""
Database Connector - Kết nối với MySQL database
Chức năng: Kết nối và truy vấn database e-commerce
"""

import mysql.connector
import pymysql
import os
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class DatabaseConnector:
    """Kết nối với MySQL database"""
    
    def __init__(self):
        self.connection = None
        self.host = os.getenv('DB_HOST', 'localhost')
        self.port = int(os.getenv('DB_PORT', 3306))
        self.user = os.getenv('DB_USER', 'root')
        self.password = os.getenv('DB_PASSWORD', '')
        self.database = os.getenv('DB_NAME', 'ecommerce_db')
    
    def connect(self):
        """Kết nối với database"""
        try:
            self.connection = mysql.connector.connect(
                host=self.host,
                port=self.port,
                user=self.user,
                password=self.password,
                database=self.database,
                charset='utf8mb4',
                collation='utf8mb4_unicode_ci'
            )
            print(f"✅ Connected to MySQL database: {self.database}")
        except mysql.connector.Error as e:
            print(f"❌ MySQL connection failed: {e}")
            # Fallback to PyMySQL
            try:
                self.connection = pymysql.connect(
                    host=self.host,
                    port=self.port,
                    user=self.user,
                    password=self.password,
                    database=self.database,
                    charset='utf8mb4'
                )
                print(f"✅ Connected to MySQL database via PyMySQL: {self.database}")
            except Exception as e2:
                print(f"❌ PyMySQL connection also failed: {e2}")
                raise e2
    
    def disconnect(self):
        """Ngắt kết nối"""
        if self.connection:
            self.connection.close()
            print("✅ Database connection closed")
    
    def execute_query(self, query: str, params: Optional[tuple] = None) -> List[Dict[str, Any]]:
        """Thực thi SQL query và trả về kết quả"""
        if not self.connection:
            raise Exception("Database not connected")
        
        try:
            cursor = self.connection.cursor(dictionary=True)
            cursor.execute(query, params)
            results = cursor.fetchall()
            cursor.close()
            return results
        except Exception as e:
            print(f"❌ Query execution failed: {e}")
            print(f"Query: {query}")
            return []
    
    def execute_update(self, query: str, params: Optional[tuple] = None) -> int:
        """Thực thi UPDATE/INSERT/DELETE query"""
        if not self.connection:
            raise Exception("Database not connected")
        
        try:
            cursor = self.connection.cursor()
            cursor.execute(query, params)
            self.connection.commit()
            affected_rows = cursor.rowcount
            cursor.close()
            return affected_rows
        except Exception as e:
            print(f"❌ Update query failed: {e}")
            print(f"Query: {query}")
            return 0
    
    def get_products(self, limit: int = 20, offset: int = 0) -> List[Dict[str, Any]]:
        """Lấy danh sách sản phẩm"""
        query = """
        SELECT p.id, p.name, p.sku, p.price, p.sale_price, p.stock_quantity,
               p.image_url, p.status, p.is_featured,
               c.name as category_name, b.name as brand_name
        FROM products p
        JOIN categories c ON p.category_id = c.id
        JOIN brands b ON p.brand_id = b.id
        WHERE p.status = 'ACTIVE'
        ORDER BY p.created_at DESC
        LIMIT %s OFFSET %s
        """
        return self.execute_query(query, (limit, offset))
    
    def get_product_by_id(self, product_id: int) -> Optional[Dict[str, Any]]:
        """Lấy thông tin chi tiết sản phẩm"""
        query = """
        SELECT p.*, c.name as category_name, b.name as brand_name
        FROM products p
        JOIN categories c ON p.category_id = c.id
        JOIN brands b ON p.brand_id = b.id
        WHERE p.id = %s
        """
        results = self.execute_query(query, (product_id,))
        return results[0] if results else None
    
    def search_products(self, keyword: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Tìm kiếm sản phẩm theo từ khóa"""
        query = """
        SELECT p.id, p.name, p.sku, p.price, p.sale_price, p.stock_quantity,
               p.image_url, p.status, p.is_featured,
               c.name as category_name, b.name as brand_name
        FROM products p
        JOIN categories c ON p.category_id = c.id
        JOIN brands b ON p.brand_id = b.id
        WHERE p.status = 'ACTIVE'
        AND (p.name LIKE %s OR p.description LIKE %s OR c.name LIKE %s OR b.name LIKE %s)
        ORDER BY p.is_featured DESC, p.view_count DESC
        LIMIT %s
        """
        search_term = f"%{keyword}%"
        return self.execute_query(query, (search_term, search_term, search_term, search_term, limit))
    
    def get_products_by_category(self, category_id: int, limit: int = 20) -> List[Dict[str, Any]]:
        """Lấy sản phẩm theo danh mục"""
        query = """
        SELECT p.id, p.name, p.sku, p.price, p.sale_price, p.stock_quantity,
               p.image_url, p.status, p.is_featured,
               c.name as category_name, b.name as brand_name
        FROM products p
        JOIN categories c ON p.category_id = c.id
        JOIN brands b ON p.brand_id = b.id
        WHERE p.category_id = %s AND p.status = 'ACTIVE'
        ORDER BY p.created_at DESC
        LIMIT %s
        """
        return self.execute_query(query, (category_id, limit))
    
    def get_products_by_brand(self, brand_id: int, limit: int = 20) -> List[Dict[str, Any]]:
        """Lấy sản phẩm theo thương hiệu"""
        query = """
        SELECT p.id, p.name, p.sku, p.price, p.sale_price, p.stock_quantity,
               p.image_url, p.status, p.is_featured,
               c.name as category_name, b.name as brand_name
        FROM products p
        JOIN categories c ON p.category_id = c.id
        JOIN brands b ON p.brand_id = b.id
        WHERE p.brand_id = %s AND p.status = 'ACTIVE'
        ORDER BY p.created_at DESC
        LIMIT %s
        """
        return self.execute_query(query, (brand_id, limit))
    
    def get_categories(self) -> List[Dict[str, Any]]:
        """Lấy danh sách danh mục"""
        query = """
        SELECT id, name, slug, description, image_url, is_active
        FROM categories
        WHERE is_active = 1
        ORDER BY name
        """
        return self.execute_query(query)
    
    def get_brands(self) -> List[Dict[str, Any]]:
        """Lấy danh sách thương hiệu"""
        query = """
        SELECT id, name, country, is_active
        FROM brands
        WHERE is_active = 1
        ORDER BY name
        """
        return self.execute_query(query)
    
    def get_product_reviews(self, product_id: int, limit: int = 10) -> List[Dict[str, Any]]:
        """Lấy đánh giá sản phẩm"""
        query = """
        SELECT pr.id, pr.rating, pr.title, pr.comment, pr.is_verified,
               u.first_name, u.last_name, pr.created_at
        FROM product_reviews pr
        JOIN users u ON pr.user_id = u.id
        WHERE pr.product_id = %s AND pr.is_approved = 1
        ORDER BY pr.created_at DESC
        LIMIT %s
        """
        return self.execute_query(query, (product_id, limit))
    
    def get_sales_analytics(self, days: int = 30) -> Dict[str, Any]:
        """Lấy thống kê doanh số"""
        query = """
        SELECT 
            COUNT(DISTINCT o.id) as total_orders,
            COUNT(DISTINCT oi.product_id) as unique_products_sold,
            SUM(oi.total_price) as total_revenue,
            AVG(oi.total_price) as avg_order_value,
            COUNT(DISTINCT o.user_id) as unique_customers
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL %s DAY)
        AND o.status != 'CANCELLED'
        """
        results = self.execute_query(query, (days,))
        return results[0] if results else {}
    
    def get_top_products(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Lấy sản phẩm bán chạy nhất"""
        query = """
        SELECT p.id, p.name, p.sku, p.price, p.sale_price,
               SUM(oi.quantity) as total_sold,
               SUM(oi.total_price) as total_revenue,
               c.name as category_name, b.name as brand_name
        FROM products p
        JOIN order_items oi ON p.id = oi.product_id
        JOIN orders o ON oi.order_id = o.id
        JOIN categories c ON p.category_id = c.id
        JOIN brands b ON p.brand_id = b.id
        WHERE o.status != 'CANCELLED'
        AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY p.id
        ORDER BY total_sold DESC
        LIMIT %s
        """
        return self.execute_query(query, (limit,))
    
    def get_user_orders(self, user_id: int, limit: int = 10) -> List[Dict[str, Any]]:
        """Lấy đơn hàng của user"""
        query = """
        SELECT o.id, o.order_number, o.status, o.payment_status,
               o.total_amount, o.created_at, o.tracking_code
        FROM orders o
        WHERE o.user_id = %s
        ORDER BY o.created_at DESC
        LIMIT %s
        """
        return self.execute_query(query, (user_id, limit))
    
    def update_product_view_count(self, product_id: int):
        """Cập nhật lượt xem sản phẩm"""
        query = "UPDATE products SET view_count = view_count + 1 WHERE id = %s"
        return self.execute_update(query, (product_id,))
    
    def get_low_stock_products(self, threshold: int = 5) -> List[Dict[str, Any]]:
        """Lấy sản phẩm sắp hết hàng"""
        query = """
        SELECT p.id, p.name, p.sku, p.stock_quantity, p.min_stock_level,
               c.name as category_name, b.name as brand_name
        FROM products p
        JOIN categories c ON p.category_id = c.id
        JOIN brands b ON p.brand_id = b.id
        WHERE p.stock_quantity <= %s AND p.status = 'ACTIVE'
        ORDER BY p.stock_quantity ASC
        """
        return self.execute_query(query, (threshold,))
    
    def __enter__(self):
        """Context manager entry"""
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.disconnect()

if __name__ == "__main__":
    # Test database connection
    with DatabaseConnector() as db:
        # Test basic queries
        print("🔍 Testing database connection...")
        
        # Get products
        products = db.get_products(limit=5)
        print(f"📦 Found {len(products)} products")
        
        # Get categories
        categories = db.get_categories()
        print(f"📂 Found {len(categories)} categories")
        
        # Get sales analytics
        analytics = db.get_sales_analytics()
        print(f"📊 Sales analytics: {analytics}")
        
        print("✅ Database connection test completed!")
