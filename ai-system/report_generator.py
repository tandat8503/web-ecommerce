#!/usr/bin/env python3
"""
Report Generator - Tạo báo cáo HTML thật từ dữ liệu
Chức năng: Sinh file index.html với Jinja2 + Tailwind CSS
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from jinja2 import Environment, FileSystemLoader, Template
import pandas as pd

logger = logging.getLogger(__name__)

class ReportGenerator:
    """Generator báo cáo HTML chuyên nghiệp"""
    
    def __init__(self, template_dir: str = "./templates", output_dir: str = "./web/generated"):
        self.template_dir = template_dir
        self.output_dir = output_dir
        self.jinja_env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=True
        )
        
        # Tạo thư mục nếu chưa có
        os.makedirs(template_dir, exist_ok=True)
        os.makedirs(output_dir, exist_ok=True)
        
        # Tạo template mặc định nếu chưa có
        self._create_default_templates()
    
    def _create_default_templates(self):
        """Tạo template mặc định cho báo cáo"""
        base_template = """<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ title }}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        .chart-container { position: relative; height: 400px; }
        .print-hidden { display: none; }
        @media print {
            .print-hidden { display: none !important; }
            .no-print { display: none !important; }
        }
    </style>
</head>
<body class="bg-gray-50">
    <div class="min-h-screen">
        <!-- Header -->
        <header class="bg-white shadow-sm border-b">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center py-6">
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900">{{ title }}</h1>
                        <p class="mt-2 text-gray-600">{{ subtitle }}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-sm text-gray-500">Ngày tạo: {{ created_at }}</p>
                        <p class="text-sm text-gray-500">Nguồn: AI System</p>
                    </div>
                </div>
            </div>
        </header>

        <!-- Navigation -->
        <nav class="bg-white shadow-sm">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex space-x-8 py-4">
                    {% for section in sections %}
                    <a href="#{{ section.id }}" class="text-gray-600 hover:text-gray-900 font-medium">
                        {{ section.title }}
                    </a>
                    {% endfor %}
                </div>
            </div>
        </nav>

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {% for section in sections %}
            <section id="{{ section.id }}" class="mb-12">
                <h2 class="text-2xl font-bold text-gray-900 mb-6">{{ section.title }}</h2>
                <div class="bg-white rounded-lg shadow p-6">
                    {{ section.content | safe }}
                </div>
            </section>
            {% endfor %}
        </main>

        <!-- Footer -->
        <footer class="bg-gray-800 text-white py-8">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="text-center">
                    <p class="text-sm">Báo cáo được tạo tự động bởi AI System</p>
                    <p class="text-xs text-gray-400 mt-2">
                        Dữ liệu cập nhật lần cuối: {{ updated_at }}
                    </p>
                </div>
            </div>
        </footer>
    </div>

    <!-- JavaScript -->
    <script>
        // Chart initialization
        {% if charts %}
        document.addEventListener('DOMContentLoaded', function() {
            {% for chart in charts %}
            const ctx{{ loop.index }} = document.getElementById('chart{{ loop.index }}');
            if (ctx{{ loop.index }}) {
                new Chart(ctx{{ loop.index }}, {{ chart.config | tojson }});
            }
            {% endfor %}
        });
        {% endif %}

        // Print function
        function printReport() {
            window.print();
        }

        // Export function
        function exportReport() {
            const element = document.documentElement;
            const opt = {
                margin: 1,
                filename: '{{ title | replace(" ", "_") }}.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
            };
            
            // Note: This requires html2pdf library
            // html2pdf().set(opt).from(element).save();
            alert('Export PDF feature requires html2pdf library');
        }
    </script>
</body>
</html>"""
        
        # Lưu template
        template_path = os.path.join(self.template_dir, "base_report.html")
        if not os.path.exists(template_path):
            with open(template_path, 'w', encoding='utf-8') as f:
                f.write(base_template)
    
    def generate_sales_report(self, data: Dict[str, Any], title: str = "Báo cáo doanh số") -> str:
        """Tạo báo cáo doanh số"""
        sections = []
        
        # Tổng quan
        if 'sales_summary' in data:
            summary = data['sales_summary']
            sections.append({
                'id': 'overview',
                'title': 'Tổng quan doanh số',
                'content': self._generate_summary_section(summary)
            })
        
        # Top sản phẩm
        if 'top_products' in data:
            products = data['top_products']
            sections.append({
                'id': 'top_products',
                'title': 'Sản phẩm bán chạy',
                'content': self._generate_products_section(products)
            })
        
        # Phân tích danh mục
        if 'category_analytics' in data:
            categories = data['category_analytics']
            sections.append({
                'id': 'categories',
                'title': 'Phân tích theo danh mục',
                'content': self._generate_categories_section(categories)
            })
        
        # Biểu đồ
        charts = self._generate_charts(data)
        
        # Render HTML
        template = self.jinja_env.get_template("base_report.html")
        html_content = template.render(
            title=title,
            subtitle="Phân tích doanh số và hiệu suất bán hàng",
            sections=sections,
            charts=charts,
            created_at=datetime.now().strftime("%d/%m/%Y %H:%M"),
            updated_at=datetime.now().strftime("%d/%m/%Y %H:%M")
        )
        
        # Lưu file
        filename = f"sales_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
        filepath = os.path.join(self.output_dir, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        # Tạo index.html
        index_path = os.path.join(self.output_dir, "index.html")
        with open(index_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        logger.info(f"✅ Report generated: {filepath}")
        return filepath
    
    def generate_product_report(self, product_data: Dict[str, Any], title: str = "Báo cáo sản phẩm") -> str:
        """Tạo báo cáo sản phẩm"""
        sections = []
        
        # Thông tin sản phẩm
        if 'product' in product_data:
            product = product_data['product']
            sections.append({
                'id': 'product_info',
                'title': 'Thông tin sản phẩm',
                'content': self._generate_product_info_section(product)
            })
        
        # Đánh giá
        if 'reviews' in product_data:
            reviews = product_data['reviews']
            sections.append({
                'id': 'reviews',
                'title': 'Đánh giá khách hàng',
                'content': self._generate_reviews_section(reviews)
            })
        
        # Phân tích đánh giá
        if 'review_analytics' in product_data:
            analytics = product_data['review_analytics']
            sections.append({
                'id': 'review_analytics',
                'title': 'Phân tích đánh giá',
                'content': self._generate_review_analytics_section(analytics)
            })
        
        # Render HTML
        template = self.jinja_env.get_template("base_report.html")
        html_content = template.render(
            title=title,
            subtitle="Phân tích chi tiết sản phẩm",
            sections=sections,
            charts=[],
            created_at=datetime.now().strftime("%d/%m/%Y %H:%M"),
            updated_at=datetime.now().strftime("%d/%m/%Y %H:%M")
        )
        
        # Lưu file
        filename = f"product_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
        filepath = os.path.join(self.output_dir, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        # Tạo index.html
        index_path = os.path.join(self.output_dir, "index.html")
        with open(index_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        logger.info(f"✅ Product report generated: {filepath}")
        return filepath
    
    def _generate_summary_section(self, summary: Dict[str, Any]) -> str:
        """Tạo section tổng quan"""
        return f"""
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div class="bg-blue-50 p-6 rounded-lg">
                <h3 class="text-lg font-semibold text-blue-900">Tổng đơn hàng</h3>
                <p class="text-3xl font-bold text-blue-600">{summary.get('total_orders', 0):,}</p>
            </div>
            <div class="bg-green-50 p-6 rounded-lg">
                <h3 class="text-lg font-semibold text-green-900">Tổng doanh thu</h3>
                <p class="text-3xl font-bold text-green-600">{summary.get('total_revenue', 0):,.0f} VNĐ</p>
            </div>
            <div class="bg-purple-50 p-6 rounded-lg">
                <h3 class="text-lg font-semibold text-purple-900">Sản phẩm bán</h3>
                <p class="text-3xl font-bold text-purple-600">{summary.get('total_quantity', 0):,}</p>
            </div>
            <div class="bg-orange-50 p-6 rounded-lg">
                <h3 class="text-lg font-semibold text-orange-900">Giá trị TB/đơn</h3>
                <p class="text-3xl font-bold text-orange-600">{summary.get('avg_order_value', 0):,.0f} VNĐ</p>
            </div>
        </div>
        """
    
    def _generate_products_section(self, products: List[Dict[str, Any]]) -> str:
        """Tạo section sản phẩm bán chạy"""
        if not products:
            return "<p class='text-gray-500'>Không có dữ liệu sản phẩm</p>"
        
        rows = ""
        for i, product in enumerate(products, 1):
            rows += f"""
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{i}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.get('name', 'N/A')}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.get('sku', 'N/A')}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.get('total_sold', 0):,}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.get('total_revenue', 0):,.0f} VNĐ</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.get('order_count', 0)}</td>
            </tr>
            """
        
        return f"""
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên sản phẩm</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số lượng bán</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doanh thu</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số đơn</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    {rows}
                </tbody>
            </table>
        </div>
        """
    
    def _generate_categories_section(self, categories: List[Dict[str, Any]]) -> str:
        """Tạo section phân tích danh mục"""
        if not categories:
            return "<p class='text-gray-500'>Không có dữ liệu danh mục</p>"
        
        rows = ""
        for category in categories:
            rows += f"""
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{category.get('name', 'N/A')}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{category.get('product_count', 0)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{category.get('order_count', 0)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{category.get('total_sold', 0):,}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{category.get('total_revenue', 0):,.0f} VNĐ</td>
            </tr>
            """
        
        return f"""
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Danh mục</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số sản phẩm</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số đơn hàng</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số lượng bán</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doanh thu</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    {rows}
                </tbody>
            </table>
        </div>
        """
    
    def _generate_product_info_section(self, product: Dict[str, Any]) -> str:
        """Tạo section thông tin sản phẩm"""
        return f"""
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
                <h3 class="text-xl font-semibold mb-4">Thông tin cơ bản</h3>
                <dl class="space-y-3">
                    <div>
                        <dt class="text-sm font-medium text-gray-500">Tên sản phẩm</dt>
                        <dd class="text-sm text-gray-900">{product.get('name', 'N/A')}</dd>
                    </div>
                    <div>
                        <dt class="text-sm font-medium text-gray-500">SKU</dt>
                        <dd class="text-sm text-gray-900">{product.get('sku', 'N/A')}</dd>
                    </div>
                    <div>
                        <dt class="text-sm font-medium text-gray-500">Danh mục</dt>
                        <dd class="text-sm text-gray-900">{product.get('category_name', 'N/A')}</dd>
                    </div>
                    <div>
                        <dt class="text-sm font-medium text-gray-500">Thương hiệu</dt>
                        <dd class="text-sm text-gray-900">{product.get('brand_name', 'N/A')}</dd>
                    </div>
                    <div>
                        <dt class="text-sm font-medium text-gray-500">Giá</dt>
                        <dd class="text-sm text-gray-900">{product.get('price', 0):,.0f} VNĐ</dd>
                    </div>
                    <div>
                        <dt class="text-sm font-medium text-gray-500">Tồn kho</dt>
                        <dd class="text-sm text-gray-900">{product.get('stock_quantity', 0)}</dd>
                    </div>
                </dl>
            </div>
            <div>
                <h3 class="text-xl font-semibold mb-4">Mô tả</h3>
                <p class="text-sm text-gray-700">{product.get('description', 'Không có mô tả')}</p>
            </div>
        </div>
        """
    
    def _generate_reviews_section(self, reviews: List[Dict[str, Any]]) -> str:
        """Tạo section đánh giá"""
        if not reviews:
            return "<p class='text-gray-500'>Chưa có đánh giá nào</p>"
        
        review_items = ""
        for review in reviews[:10]:  # Hiển thị tối đa 10 đánh giá
            stars = "★" * review.get('rating', 0) + "☆" * (5 - review.get('rating', 0))
            review_items += f"""
            <div class="border-b border-gray-200 pb-4 mb-4">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center">
                        <span class="text-sm font-medium text-gray-900">
                            {review.get('first_name', '')} {review.get('last_name', '')}
                        </span>
                        <div class="ml-2 text-yellow-400">{stars}</div>
                    </div>
                    <span class="text-sm text-gray-500">{review.get('created_at', '')}</span>
                </div>
                <p class="text-sm text-gray-700">{review.get('comment', '')}</p>
            </div>
            """
        
        return f"""
        <div class="space-y-4">
            {review_items}
        </div>
        """
    
    def _generate_review_analytics_section(self, analytics: Dict[str, Any]) -> str:
        """Tạo section phân tích đánh giá"""
        total_reviews = analytics.get('total_reviews', 0)
        avg_rating = analytics.get('avg_rating', 0)
        positive_reviews = analytics.get('positive_reviews', 0)
        negative_reviews = analytics.get('negative_reviews', 0)
        
        positive_percent = (positive_reviews / total_reviews * 100) if total_reviews > 0 else 0
        negative_percent = (negative_reviews / total_reviews * 100) if total_reviews > 0 else 0
        
        return f"""
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div class="bg-blue-50 p-6 rounded-lg">
                <h3 class="text-lg font-semibold text-blue-900">Tổng đánh giá</h3>
                <p class="text-3xl font-bold text-blue-600">{total_reviews:,}</p>
            </div>
            <div class="bg-green-50 p-6 rounded-lg">
                <h3 class="text-lg font-semibold text-green-900">Điểm TB</h3>
                <p class="text-3xl font-bold text-green-600">{avg_rating:.1f}/5</p>
            </div>
            <div class="bg-purple-50 p-6 rounded-lg">
                <h3 class="text-lg font-semibold text-purple-900">Tích cực (4-5⭐)</h3>
                <p class="text-3xl font-bold text-purple-600">{positive_percent:.1f}%</p>
            </div>
            <div class="bg-red-50 p-6 rounded-lg">
                <h3 class="text-lg font-semibold text-red-900">Tiêu cực (1-2⭐)</h3>
                <p class="text-3xl font-bold text-red-600">{negative_percent:.1f}%</p>
            </div>
        </div>
        """
    
    def _generate_charts(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Tạo biểu đồ"""
        charts = []
        
        # Biểu đồ doanh thu theo danh mục
        if 'category_analytics' in data:
            categories = data['category_analytics']
            if categories:
                chart_config = {
                    "type": "doughnut",
                    "data": {
                        "labels": [cat.get('name', 'N/A') for cat in categories[:5]],
                        "datasets": [{
                            "label": "Doanh thu (VNĐ)",
                            "data": [cat.get('total_revenue', 0) for cat in categories[:5]],
                            "backgroundColor": [
                                "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"
                            ]
                        }]
                    },
                    "options": {
                        "responsive": True,
                        "plugins": {
                            "title": {
                                "display": True,
                                "text": "Doanh thu theo danh mục"
                            }
                        }
                    }
                }
                charts.append({
                    "id": "category_chart",
                    "config": chart_config
                })
        
        return charts

def main():
    """Test function"""
    generator = ReportGenerator()
    
    # Test data
    test_data = {
        "sales_summary": {
            "total_orders": 150,
            "total_revenue": 25000000,
            "total_quantity": 300,
            "avg_order_value": 166667
        },
        "top_products": [
            {
                "name": "iPhone 15 Pro",
                "sku": "IP15P-256",
                "total_sold": 25,
                "total_revenue": 25000000,
                "order_count": 20
            }
        ],
        "category_analytics": [
            {
                "name": "Điện thoại",
                "product_count": 50,
                "order_count": 100,
                "total_sold": 200,
                "total_revenue": 20000000
            }
        ]
    }
    
    # Generate report
    filepath = generator.generate_sales_report(test_data, "Báo cáo doanh số test")
    print(f"✅ Report generated: {filepath}")

if __name__ == "__main__":
    main()
