#!/usr/bin/env python3
"""
AI System CLI - Command Line Interface
Chức năng: Quản lý toàn bộ hệ thống AI qua command line
"""

import os
import sys
import argparse
import logging
import subprocess
from typing import Dict, Any, List
from datetime import datetime

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.database_connector import DatabaseConnector
from report_generator import ReportGenerator

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AISystemCLI:
    """CLI cho AI System"""
    
    def __init__(self):
        self.db = DatabaseConnector()
        self.report_generator = ReportGenerator()
    
    def train_models(self, args):
        """Train AI models"""
        print("🚀 Training AI models...")
        try:
            # Chạy script training
            result = subprocess.run([
                sys.executable, "scripts/train_models.py"
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                print("✅ Training completed successfully")
                print(result.stdout)
            else:
                print("❌ Training failed")
                print(result.stderr)
        except Exception as e:
            print(f"❌ Error during training: {e}")
    
    def test_models(self, args):
        """Test AI models"""
        print("🧪 Testing AI models...")
        try:
            # Test agents
            print("Testing Agents system...")
            result = subprocess.run([
                sys.executable, "-c", "import sys; sys.path.append('agents'); from ecommerce_agents import main; main()"
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                print("✅ Agents test passed")
            else:
                print("❌ Agents test failed")
                print(result.stderr)
            
            # Test database connection
            print("Testing Database connection...")
            if self.db.connect():
                print("✅ Database connection successful")
                self.db.disconnect()
            else:
                print("❌ Database connection failed")
                
        except Exception as e:
            print(f"❌ Error during testing: {e}")
    
    def start_agents_api(self, args):
        """Start Agents API server"""
        print("🤖 Starting Agents API server...")
        try:
            os.chdir("agents")
            subprocess.run([
                sys.executable, "agent_api.py", 
                "--host", args.host, 
                "--port", str(args.port)
            ])
        except KeyboardInterrupt:
            print("\n🛑 Agents API server stopped")
        except Exception as e:
            print(f"❌ Error starting Agents API: {e}")
    
    def start_nlp_api(self, args):
        """Start NLP API server"""
        print("🧠 Starting NLP API server...")
        try:
            os.chdir("nlp_system")
            subprocess.run([
                sys.executable, "nlp_api.py",
                "--host", args.host,
                "--port", str(args.port)
            ])
        except KeyboardInterrupt:
            print("\n🛑 NLP API server stopped")
        except Exception as e:
            print(f"❌ Error starting NLP API: {e}")
    
    def start_web_api(self, args):
        """Start Web API server"""
        print("🌐 Starting Web API server...")
        try:
            os.chdir("web")
            subprocess.run([
                sys.executable, "app.py",
                "--host", args.host,
                "--port", str(args.port)
            ])
        except KeyboardInterrupt:
            print("\n🛑 Web API server stopped")
        except Exception as e:
            print(f"❌ Error starting Web API: {e}")
    
    def generate_report(self, args):
        """Generate report"""
        print("📊 Generating report...")
        try:
            if not self.db.connect():
                print("❌ Cannot connect to database")
                return
            
            # Lấy dữ liệu từ database
            data = {}
            
            if args.type == "sales":
                data["sales_summary"] = self.db.get_sales_analytics(
                    args.start_date, args.end_date
                )
                data["top_products"] = self.db.get_top_products(
                    args.limit, args.start_date, args.end_date
                )
                data["category_analytics"] = self.db.get_category_analytics()
                
                filepath = self.report_generator.generate_sales_report(
                    data, args.title or "Báo cáo doanh số"
                )
                
            elif args.type == "product":
                if not args.product_id:
                    print("❌ Product ID is required for product report")
                    return
                
                product = self.db.get_product_by_id(args.product_id)
                if not product:
                    print(f"❌ Product with ID {args.product_id} not found")
                    return
                
                data["product"] = product
                data["reviews"] = self.db.get_product_reviews(args.product_id, 50)
                data["review_analytics"] = self.db.get_review_analytics(args.product_id)
                
                filepath = self.report_generator.generate_product_report(
                    data, args.title or f"Báo cáo sản phẩm {product['name']}"
                )
            
            else:
                print(f"❌ Unknown report type: {args.type}")
                return
            
            print(f"✅ Report generated: {filepath}")
            print(f"🌐 Open in browser: file://{os.path.abspath(filepath)}")
            
            self.db.disconnect()
            
        except Exception as e:
            print(f"❌ Error generating report: {e}")
    
    def list_products(self, args):
        """List products from database"""
        print("📦 Listing products...")
        try:
            if not self.db.connect():
                print("❌ Cannot connect to database")
                return
            
            products = self.db.get_products(
                limit=args.limit,
                category_id=args.category_id,
                brand_id=args.brand_id
            )
            
            if not products:
                print("No products found")
                return
            
            print(f"\nFound {len(products)} products:")
            print("-" * 80)
            print(f"{'ID':<5} {'Name':<30} {'SKU':<15} {'Price':<15} {'Stock':<10}")
            print("-" * 80)
            
            for product in products:
                print(f"{product['id']:<5} {product['name'][:30]:<30} {product['sku']:<15} {product['price']:<15} {product['stock_quantity']:<10}")
            
            self.db.disconnect()
            
        except Exception as e:
            print(f"❌ Error listing products: {e}")
    
    def search_products(self, args):
        """Search products"""
        print(f"🔍 Searching products for: {args.keyword}")
        try:
            if not self.db.connect():
                print("❌ Cannot connect to database")
                return
            
            products = self.db.search_products(args.keyword, args.limit)
            
            if not products:
                print("No products found")
                return
            
            print(f"\nFound {len(products)} products:")
            print("-" * 80)
            print(f"{'ID':<5} {'Name':<30} {'SKU':<15} {'Price':<15} {'Category':<20}")
            print("-" * 80)
            
            for product in products:
                print(f"{product['id']:<5} {product['name'][:30]:<30} {product['sku']:<15} {product['price']:<15} {product['category_name']:<20}")
            
            self.db.disconnect()
            
        except Exception as e:
            print(f"❌ Error searching products: {e}")
    
    def get_analytics(self, args):
        """Get analytics data"""
        print("📈 Getting analytics data...")
        try:
            if not self.db.connect():
                print("❌ Cannot connect to database")
                return
            
            analytics = self.db.get_sales_analytics(args.start_date, args.end_date)
            
            print("\n📊 Sales Analytics:")
            print("-" * 40)
            print(f"Total Orders: {analytics.get('total_orders', 0):,}")
            print(f"Total Revenue: {analytics.get('total_revenue', 0):,.0f} VNĐ")
            print(f"Total Quantity: {analytics.get('total_quantity', 0):,}")
            print(f"Avg Order Value: {analytics.get('avg_order_value', 0):,.0f} VNĐ")
            
            self.db.disconnect()
            
        except Exception as e:
            print(f"❌ Error getting analytics: {e}")
    
    def status(self, args):
        """Check system status"""
        print("📊 AI System Status")
        print("=" * 50)
        
        # Check database connection
        print("Database:")
        if self.db.connect():
            print("  ✅ Connected")
            self.db.disconnect()
        else:
            print("  ❌ Not connected")
        
        # Check API endpoints
        import requests
        
        apis = [
            ("Agents API", "http://localhost:5003/health"),
            ("NLP API", "http://localhost:5004/health"),
            ("Web API", "http://localhost:5005/health")
        ]
        
        print("\nAPI Services:")
        for name, url in apis:
            try:
                response = requests.get(url, timeout=2)
                if response.status_code == 200:
                    print(f"  ✅ {name} - Running")
                else:
                    print(f"  ⚠️ {name} - Responding but error")
            except:
                print(f"  ❌ {name} - Not running")
        
        # Check files
        print("\nFiles:")
        files_to_check = [
            "models/sentiment/model_info.json",
            "models/recommendation/model_info.json",
            "models/chatbot/model_info.json",
            "data/ai_training.db"
        ]
        
        for file_path in files_to_check:
            if os.path.exists(file_path):
                print(f"  ✅ {file_path}")
            else:
                print(f"  ❌ {file_path}")

def main():
    """Main CLI function"""
    parser = argparse.ArgumentParser(description="AI System CLI")
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Initialize CLI first
    cli = AISystemCLI()
    
    # Train command
    train_parser = subparsers.add_parser('train', help='Train AI models')
    train_parser.set_defaults(func=cli.train_models)
    
    # Test command
    test_parser = subparsers.add_parser('test', help='Test AI models')
    test_parser.set_defaults(func=cli.test_models)
    
    # Start Agents API
    agents_parser = subparsers.add_parser('agents', help='Start Agents API server')
    agents_parser.add_argument('--host', default='0.0.0.0', help='Host to bind to')
    agents_parser.add_argument('--port', type=int, default=5003, help='Port to bind to')
    agents_parser.set_defaults(func=cli.start_agents_api)
    
    # Start NLP API
    nlp_parser = subparsers.add_parser('nlp', help='Start NLP API server')
    nlp_parser.add_argument('--host', default='0.0.0.0', help='Host to bind to')
    nlp_parser.add_argument('--port', type=int, default=5004, help='Port to bind to')
    nlp_parser.set_defaults(func=cli.start_nlp_api)
    
    # Start Web API
    web_parser = subparsers.add_parser('web', help='Start Web API server')
    web_parser.add_argument('--host', default='0.0.0.0', help='Host to bind to')
    web_parser.add_argument('--port', type=int, default=5005, help='Port to bind to')
    web_parser.set_defaults(func=cli.start_web_api)
    
    # Generate report
    report_parser = subparsers.add_parser('report', help='Generate report')
    report_parser.add_argument('--type', choices=['sales', 'product'], required=True, help='Report type')
    report_parser.add_argument('--title', help='Report title')
    report_parser.add_argument('--product-id', type=int, help='Product ID (for product report)')
    report_parser.add_argument('--start-date', help='Start date (YYYY-MM-DD)')
    report_parser.add_argument('--end-date', help='End date (YYYY-MM-DD)')
    report_parser.add_argument('--limit', type=int, default=10, help='Limit for top products')
    report_parser.set_defaults(func=cli.generate_report)
    
    # List products
    list_parser = subparsers.add_parser('list-products', help='List products')
    list_parser.add_argument('--limit', type=int, default=20, help='Number of products to show')
    list_parser.add_argument('--category-id', type=int, help='Filter by category ID')
    list_parser.add_argument('--brand-id', type=int, help='Filter by brand ID')
    list_parser.set_defaults(func=cli.list_products)
    
    # Search products
    search_parser = subparsers.add_parser('search', help='Search products')
    search_parser.add_argument('keyword', help='Search keyword')
    search_parser.add_argument('--limit', type=int, default=20, help='Number of results')
    search_parser.set_defaults(func=cli.search_products)
    
    # Analytics
    analytics_parser = subparsers.add_parser('analytics', help='Get analytics data')
    analytics_parser.add_argument('--start-date', help='Start date (YYYY-MM-DD)')
    analytics_parser.add_argument('--end-date', help='End date (YYYY-MM-DD)')
    analytics_parser.set_defaults(func=cli.get_analytics)
    
    # Status
    status_parser = subparsers.add_parser('status', help='Check system status')
    status_parser.set_defaults(func=cli.status)
    
    # Parse arguments
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # Execute command
    try:
        args.func(args)
    except Exception as e:
        logger.error(f"Command failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
