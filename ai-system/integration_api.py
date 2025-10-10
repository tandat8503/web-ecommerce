#!/usr/bin/env python3
"""
Integration API - API tích hợp cho frontend
Chức năng: Cung cấp endpoints cho frontend web-ecommerce
"""

import os
import sys
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

# Add current directory and agents directory to path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)
sys.path.append(os.path.join(BASE_DIR, "agents"))

from core.database_connector import DatabaseConnector
from core.ai_database import AIDatabase
from report_generator import ReportGenerator
from agents.agent_orchestrator import AgentOrchestrator, AgentRequest, RequestType, Priority

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Initialize components
db = DatabaseConnector()  # E-commerce database (read-only)
ai_db = AIDatabase()      # AI system database (read-write)
report_generator = ReportGenerator()
agent_orchestrator = AgentOrchestrator()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "database": "connected" if db.connect() else "disconnected",
            "agents": "available",
            "report_generator": "available"
        }
    })

# ===========================
# PRODUCT ENDPOINTS
# ===========================

@app.route('/api/products', methods=['GET'])
def get_products():
    """Lấy danh sách sản phẩm"""
    try:
        limit = request.args.get('limit', 20, type=int)
        offset = request.args.get('offset', 0, type=int)
        category_id = request.args.get('category_id', type=int)
        brand_id = request.args.get('brand_id', type=int)
        
        if not db.connect():
            return jsonify({"error": "Database connection failed"}), 500
        
        products = db.get_products(limit, offset, category_id, brand_id)
        db.disconnect()
        
        return jsonify({
            "products": products,
            "total": len(products),
            "limit": limit,
            "offset": offset
        })
        
    except Exception as e:
        logger.error(f"Error getting products: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    """Lấy thông tin sản phẩm theo ID"""
    try:
        if not db.connect():
            return jsonify({"error": "Database connection failed"}), 500
        
        product = db.get_product_by_id(product_id)
        if not product:
            return jsonify({"error": "Product not found"}), 404
        
        # Lấy thêm thông tin chi tiết
        product['specifications'] = db.get_product_specifications(product_id)
        product['reviews'] = db.get_product_reviews(product_id, 10)
        
        db.disconnect()
        
        return jsonify({"product": product})
        
    except Exception as e:
        logger.error(f"Error getting product {product_id}: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/products/search', methods=['GET'])
def search_products():
    """Tìm kiếm sản phẩm"""
    try:
        keyword = request.args.get('q', '')
        limit = request.args.get('limit', 20, type=int)
        
        if not keyword:
            return jsonify({"error": "Search keyword is required"}), 400
        
        if not db.connect():
            return jsonify({"error": "Database connection failed"}), 500
        
        products = db.search_products(keyword, limit)
        db.disconnect()
        
        return jsonify({
            "products": products,
            "keyword": keyword,
            "total": len(products)
        })
        
    except Exception as e:
        logger.error(f"Error searching products: {e}")
        return jsonify({"error": str(e)}), 500

# ===========================
# USER ENDPOINTS
# ===========================

@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    """Lấy thông tin user"""
    try:
        if not db.connect():
            return jsonify({"error": "Database connection failed"}), 500
        
        user = db.get_user_by_id(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        db.disconnect()
        
        return jsonify({"user": user})
        
    except Exception as e:
        logger.error(f"Error getting user {user_id}: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/users/<int:user_id>/orders', methods=['GET'])
def get_user_orders(user_id):
    """Lấy đơn hàng của user"""
    try:
        limit = request.args.get('limit', 20, type=int)
        
        if not db.connect():
            return jsonify({"error": "Database connection failed"}), 500
        
        orders = db.get_user_orders(user_id, limit)
        db.disconnect()
        
        return jsonify({
            "orders": orders,
            "user_id": user_id,
            "total": len(orders)
        })
        
    except Exception as e:
        logger.error(f"Error getting user orders: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/users/<int:user_id>/cart', methods=['GET'])
def get_user_cart(user_id):
    """Lấy giỏ hàng của user"""
    try:
        if not db.connect():
            return jsonify({"error": "Database connection failed"}), 500
        
        cart = db.get_user_cart(user_id)
        db.disconnect()
        
        return jsonify({
            "cart": cart,
            "user_id": user_id,
            "total_items": len(cart)
        })
        
    except Exception as e:
        logger.error(f"Error getting user cart: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/users/<int:user_id>/wishlist', methods=['GET'])
def get_user_wishlist(user_id):
    """Lấy danh sách yêu thích của user"""
    try:
        if not db.connect():
            return jsonify({"error": "Database connection failed"}), 500
        
        wishlist = db.get_user_wishlist(user_id)
        db.disconnect()
        
        return jsonify({
            "wishlist": wishlist,
            "user_id": user_id,
            "total_items": len(wishlist)
        })
        
    except Exception as e:
        logger.error(f"Error getting user wishlist: {e}")
        return jsonify({"error": str(e)}), 500

# ===========================
# ORDER ENDPOINTS
# ===========================

@app.route('/api/orders/<int:order_id>', methods=['GET'])
def get_order(order_id):
    """Lấy thông tin đơn hàng"""
    try:
        if not db.connect():
            return jsonify({"error": "Database connection failed"}), 500
        
        order = db.get_order_by_id(order_id)
        if not order:
            return jsonify({"error": "Order not found"}), 404
        
        # Lấy chi tiết đơn hàng
        order['items'] = db.get_order_items(order_id)
        
        db.disconnect()
        
        return jsonify({"order": order})
        
    except Exception as e:
        logger.error(f"Error getting order {order_id}: {e}")
        return jsonify({"error": str(e)}), 500

# ===========================
# ANALYTICS ENDPOINTS
# ===========================

@app.route('/api/analytics/sales', methods=['GET'])
def get_sales_analytics():
    """Lấy phân tích doanh số"""
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if not db.connect():
            return jsonify({"error": "Database connection failed"}), 500
        
        analytics = db.get_sales_analytics(start_date, end_date)
        db.disconnect()
        
        return jsonify({"analytics": analytics})
        
    except Exception as e:
        logger.error(f"Error getting sales analytics: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/analytics/top-products', methods=['GET'])
def get_top_products():
    """Lấy sản phẩm bán chạy"""
    try:
        limit = request.args.get('limit', 10, type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if not db.connect():
            return jsonify({"error": "Database connection failed"}), 500
        
        products = db.get_top_products(limit, start_date, end_date)
        db.disconnect()
        
        return jsonify({
            "products": products,
            "total": len(products)
        })
        
    except Exception as e:
        logger.error(f"Error getting top products: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/analytics/categories', methods=['GET'])
def get_category_analytics():
    """Lấy phân tích theo danh mục"""
    try:
        if not db.connect():
            return jsonify({"error": "Database connection failed"}), 500
        
        categories = db.get_category_analytics()
        db.disconnect()
        
        return jsonify({
            "categories": categories,
            "total": len(categories)
        })
        
    except Exception as e:
        logger.error(f"Error getting category analytics: {e}")
        return jsonify({"error": str(e)}), 500

# ===========================
# AI CHATBOT ENDPOINTS
# ===========================

@app.route('/api/chat', methods=['POST'])
def chat_with_ai():
    """Chat với AI system"""
    try:
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({"error": "Message is required"}), 400
        
        user_message = data['message']
        user_id = data.get('user_id', 'anonymous')
        session_id = data.get('session_id', f"session_{datetime.now().timestamp()}")
        context = data.get('context', {})
        priority = data.get('priority', 'medium')
        
        # Convert priority string to enum
        priority_map = {
            'low': Priority.LOW,
            'medium': Priority.MEDIUM,
            'high': Priority.HIGH,
            'urgent': Priority.URGENT
        }
        priority_enum = priority_map.get(priority.lower(), Priority.MEDIUM)
        
        # Create agent request
        agent_request = AgentRequest(
            request_id=f"req_{datetime.now().timestamp()}",
            user_message=user_message,
            request_type=RequestType.GENERAL_QUESTION,
            priority=priority_enum,
            context=context,
            user_id=user_id,
            session_id=session_id
        )
        
        # Process request
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        response = loop.run_until_complete(agent_orchestrator.process_request(agent_request))
        loop.close()
        
        # Log conversation to AI database
        ai_db.log_conversation(
            session_id=session_id,
            user_id=user_id,
            user_message=user_message,
            agent_name=response.agent_name,
            response_text=response.response_text,
            confidence=response.confidence,
            product_validation=response.metadata.get("product_validation")
        )
        
        return jsonify({
            "request_id": response.request_id,
            "agent_name": response.agent_name,
            "response": response.response_text,
            "confidence": response.confidence,
            "actions_taken": response.actions_taken,
            "next_steps": response.next_steps,
            "metadata": response.metadata,
            "timestamp": response.timestamp.isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        return jsonify({"error": str(e)}), 500

# ===========================
# REPORT ENDPOINTS
# ===========================

@app.route('/api/reports/sales', methods=['POST'])
def generate_sales_report():
    """Tạo báo cáo doanh số"""
    try:
        data = request.get_json()
        
        title = data.get('title', 'Báo cáo doanh số')
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        limit = data.get('limit', 10)
        
        if not db.connect():
            return jsonify({"error": "Database connection failed"}), 500
        
        # Lấy dữ liệu
        report_data = {
            "sales_summary": db.get_sales_analytics(start_date, end_date),
            "top_products": db.get_top_products(limit, start_date, end_date),
            "category_analytics": db.get_category_analytics()
        }
        
        db.disconnect()
        
        # Tạo báo cáo
        filepath = report_generator.generate_sales_report(report_data, title)
        
        return jsonify({
            "success": True,
            "filepath": filepath,
            "url": f"/api/reports/download/{os.path.basename(filepath)}",
            "title": title
        })
        
    except Exception as e:
        logger.error(f"Error generating sales report: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/reports/product/<int:product_id>', methods=['POST'])
def generate_product_report(product_id):
    """Tạo báo cáo sản phẩm"""
    try:
        data = request.get_json()
        title = data.get('title', f'Báo cáo sản phẩm #{product_id}')
        
        if not db.connect():
            return jsonify({"error": "Database connection failed"}), 500
        
        # Lấy dữ liệu sản phẩm
        product = db.get_product_by_id(product_id)
        if not product:
            return jsonify({"error": "Product not found"}), 404
        
        report_data = {
            "product": product,
            "reviews": db.get_product_reviews(product_id, 50),
            "review_analytics": db.get_review_analytics(product_id)
        }
        
        db.disconnect()
        
        # Tạo báo cáo
        filepath = report_generator.generate_product_report(report_data, title)
        
        return jsonify({
            "success": True,
            "filepath": filepath,
            "url": f"/api/reports/download/{os.path.basename(filepath)}",
            "title": title
        })
        
    except Exception as e:
        logger.error(f"Error generating product report: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/reports/download/<filename>', methods=['GET'])
def download_report(filename):
    """Download báo cáo"""
    try:
        filepath = os.path.join(report_generator.output_dir, filename)
        
        if not os.path.exists(filepath):
            return jsonify({"error": "File not found"}), 404
        
        return send_file(filepath, as_attachment=True)
        
    except Exception as e:
        logger.error(f"Error downloading report: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/reports/view/<filename>', methods=['GET'])
def view_report(filename):
    """Xem báo cáo trong browser"""
    try:
        filepath = os.path.join(report_generator.output_dir, filename)
        
        if not os.path.exists(filepath):
            return jsonify({"error": "File not found"}), 404
        
        return send_file(filepath)
        
    except Exception as e:
        logger.error(f"Error viewing report: {e}")
        return jsonify({"error": str(e)}), 500

# ===========================
# RECOMMENDATION ENDPOINTS
# ===========================

@app.route('/api/recommendations/user/<int:user_id>', methods=['GET'])
def get_user_recommendations(user_id):
    """Lấy gợi ý sản phẩm cho user"""
    try:
        limit = request.args.get('limit', 10, type=int)
        
        # TODO: Implement recommendation logic
        # For now, return random products
        if not db.connect():
            return jsonify({"error": "Database connection failed"}), 500
        
        products = db.get_products(limit)
        db.disconnect()
        
        return jsonify({
            "recommendations": products,
            "user_id": user_id,
            "total": len(products)
        })
        
    except Exception as e:
        logger.error(f"Error getting recommendations: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/recommendations/product/<int:product_id>', methods=['GET'])
def get_product_recommendations(product_id):
    """Lấy sản phẩm tương tự"""
    try:
        limit = request.args.get('limit', 5, type=int)
        
        # TODO: Implement product similarity logic
        # For now, return random products
        if not db.connect():
            return jsonify({"error": "Database connection failed"}), 500
        
        products = db.get_products(limit)
        db.disconnect()
        
        return jsonify({
            "recommendations": products,
            "product_id": product_id,
            "total": len(products)
        })
        
    except Exception as e:
        logger.error(f"Error getting product recommendations: {e}")
        return jsonify({"error": str(e)}), 500

# ===========================
# AI SYSTEM ENDPOINTS
# ===========================

@app.route('/api/ai/stats', methods=['GET'])
def get_ai_stats():
    """Lấy thống kê AI system"""
    try:
        stats = ai_db.get_database_stats()
        return jsonify({
            "ai_database_stats": stats,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting AI stats: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/ai/conversations/<session_id>', methods=['GET'])
def get_conversation_history(session_id):
    """Lấy lịch sử cuộc trò chuyện"""
    try:
        limit = request.args.get('limit', 50, type=int)
        conversations = ai_db.get_conversation_history(session_id, limit)
        
        return jsonify({
            "session_id": session_id,
            "conversations": conversations,
            "total": len(conversations)
        })
        
    except Exception as e:
        logger.error(f"Error getting conversation history: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/ai/training-data', methods=['GET'])
def get_training_data():
    """Lấy training data"""
    try:
        data_type = request.args.get('type')
        limit = request.args.get('limit', 1000, type=int)
        
        training_data = ai_db.get_training_data(data_type, limit)
        
        return jsonify({
            "training_data": training_data,
            "data_type": data_type,
            "total": len(training_data)
        })
        
    except Exception as e:
        logger.error(f"Error getting training data: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/ai/cleanup', methods=['POST'])
def cleanup_ai_data():
    """Dọn dẹp dữ liệu AI cũ"""
    try:
        days = request.json.get('days', 30) if request.json else 30
        ai_db.cleanup_old_data(days)
        
        return jsonify({
            "success": True,
            "message": f"Cleaned up data older than {days} days",
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error cleaning up AI data: {e}")
        return jsonify({"error": str(e)}), 500

def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Integration API Server')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to')
    parser.add_argument('--port', type=int, default=5006, help='Port to bind to')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    
    args = parser.parse_args()
    
    print("🚀 Starting Integration API Server")
    print("=" * 50)
    print(f"Host: {args.host}")
    print(f"Port: {args.port}")
    print(f"Debug: {args.debug}")
    print("\n📋 Available Endpoints:")
    print("  GET  /health - Health check")
    print("  GET  /api/products - List products")
    print("  GET  /api/products/<id> - Get product details")
    print("  GET  /api/products/search - Search products")
    print("  GET  /api/users/<id> - Get user info")
    print("  GET  /api/users/<id>/orders - Get user orders")
    print("  GET  /api/users/<id>/cart - Get user cart")
    print("  GET  /api/users/<id>/wishlist - Get user wishlist")
    print("  GET  /api/orders/<id> - Get order details")
    print("  GET  /api/analytics/sales - Sales analytics")
    print("  GET  /api/analytics/top-products - Top products")
    print("  GET  /api/analytics/categories - Category analytics")
    print("  POST /api/chat - Chat with AI")
    print("  POST /api/reports/sales - Generate sales report")
    print("  POST /api/reports/product/<id> - Generate product report")
    print("  GET  /api/reports/download/<filename> - Download report")
    print("  GET  /api/reports/view/<filename> - View report")
    print("  GET  /api/recommendations/user/<id> - User recommendations")
    print("  GET  /api/recommendations/product/<id> - Product recommendations")
    print("\n🎯 Ready to serve requests!")
    
    # Run Flask app
    app.run(host=args.host, port=args.port, debug=args.debug)

if __name__ == "__main__":
    main()

