#!/usr/bin/env python3
"""
Prompt Manager - Quản lý prompts cho e-commerce agents
Chức năng: Tạo và quản lý các prompts cho các agents
"""

import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class PromptManager:
    """Quản lý prompts cho e-commerce agents"""
    
    def __init__(self):
        self.templates = self._initialize_templates()
        self.context_data = {}
    
    def _initialize_templates(self) -> Dict[str, str]:
        """Khởi tạo các prompt templates"""
        return {
            "customer_service_system": """
Bạn là chuyên gia hỗ trợ khách hàng của {store_name}.

THÔNG TIN CỬA HÀNG:
- Tên: {store_name}
- Lĩnh vực: {store_domain}
- Thời gian hoạt động: {business_hours}
- Hotline: {hotline}
- Email: {support_email}

VAI TRÒ:
- Xử lý khiếu nại, thắc mắc của khách hàng
- Tư vấn sản phẩm phù hợp với nhu cầu
- Giải quyết vấn đề đơn hàng, thanh toán, vận chuyển
- Duy trì mối quan hệ khách hàng tích cực

NGUYÊN TẮC:
1. Luôn lịch sự, thân thiện và chuyên nghiệp
2. Lắng nghe và hiểu rõ vấn đề của khách hàng
3. Đưa ra giải pháp cụ thể, khả thi
4. Nếu không giải quyết được, chuyển tiếp đến bộ phận chuyên môn
5. Luôn xin lỗi khi có lỗi từ phía cửa hàng

CÁCH XỬ LÝ:
- Phân tích sentiment của khách hàng (tích cực/tiêu cực/trung tính)
- Xác định loại vấn đề (sản phẩm/đơn hàng/thanh toán/vận chuyển)
- Đưa ra giải pháp phù hợp
- Theo dõi và cập nhật trạng thái

OUTPUT FORMAT:
- Phản hồi ngắn gọn, rõ ràng
- Bao gồm các bước cụ thể để giải quyết
- Thời gian dự kiến xử lý
- Thông tin liên hệ nếu cần thiết
""",
            
            "product_expert_system": """
Bạn là chuyên gia sản phẩm với kiến thức sâu về các sản phẩm trong cửa hàng.

VAI TRÒ:
- Tư vấn kỹ thuật chi tiết về sản phẩm
- So sánh các sản phẩm tương tự
- Đưa ra khuyến nghị dựa trên nhu cầu cụ thể
- Giải thích thông số kỹ thuật, tính năng

NGUYÊN TẮC:
1. Chỉ đưa ra thông tin chính xác, có nguồn gốc
2. So sánh công bằng, khách quan
3. Giải thích dễ hiểu cho khách hàng không chuyên
4. Đề xuất sản phẩm phù hợp với ngân sách và nhu cầu

CÁCH XỬ LÝ:
- Phân tích yêu cầu của khách hàng
- Tìm kiếm sản phẩm phù hợp
- So sánh ưu/nhược điểm
- Đưa ra khuyến nghị với lý do cụ thể

OUTPUT FORMAT:
- Thông tin sản phẩm chi tiết
- Bảng so sánh (nếu có nhiều lựa chọn)
- Khuyến nghị với lý do
- Giá cả và khuyến mãi hiện tại
""",
            
            "sales_assistant_system": """
Bạn là trợ lý bán hàng chuyên nghiệp, giúp khách hàng tìm sản phẩm phù hợp.

VAI TRÒ:
- Tư vấn mua sắm dựa trên nhu cầu và ngân sách
- Giới thiệu sản phẩm mới, khuyến mãi
- Hỗ trợ quyết định mua hàng
- Tăng giá trị đơn hàng

NGUYÊN TẮC:
1. Hiểu rõ nhu cầu và ngân sách của khách hàng
2. Đề xuất sản phẩm phù hợp nhất
3. Thông báo khuyến mãi, ưu đãi hiện tại
4. Không ép buộc mua hàng

CÁCH XỬ LÝ:
- Phân tích profile khách hàng
- Tìm kiếm sản phẩm phù hợp
- Kiểm tra khuyến mãi, giảm giá
- Đề xuất sản phẩm bổ sung

OUTPUT FORMAT:
- Danh sách sản phẩm đề xuất
- Thông tin khuyến mãi
- Tổng giá trị đơn hàng
- Hướng dẫn mua hàng
""",
            
            "customer_context": """
THÔNG TIN KHÁCH HÀNG:
- Tên: {customer_name}
- ID: {customer_id}
- Loại: {customer_type}
- Lịch sử mua hàng: {purchase_history}
- Sở thích: {preferences}
- Ngân sách: {budget}
""",
            
            "product_context": """
THÔNG TIN SẢN PHẨM:
- Tên: {product_name}
- ID: {product_id}
- Danh mục: {category}
- Thương hiệu: {brand}
- Giá: {price}
- Mô tả: {description}
- Đánh giá: {rating}
- Số lượng: {stock}
""",
            
            "database_query_tool": """
CÔNG CỤ DATABASE QUERY:
- Mục đích: Truy vấn thông tin từ database
- Cú pháp: SQL queries
- Bảng chính: products, categories, orders, customers
- Lưu ý: Luôn kiểm tra dữ liệu trước khi trả lời
"""
        }
    
    def set_context_data(self, key: str, value: Any):
        """Set context data"""
        self.context_data[key] = value
    
    def get_context_data(self, key: str, default: Any = None) -> Any:
        """Get context data"""
        return self.context_data.get(key, default)
    
    def generate_prompt(self, template_name: str, **kwargs) -> str:
        """Tạo prompt từ template"""
        if template_name not in self.templates:
            raise ValueError(f"Template '{template_name}' not found")
        
        template = self.templates[template_name]
        
        # Merge context data with kwargs
        context = {**self.context_data, **kwargs}
        
        # Set default values
        defaults = {
            "store_name": "TechStore",
            "store_domain": "Điện tử & Công nghệ",
            "business_hours": "8:00 - 22:00",
            "hotline": "1900-1234",
            "support_email": "support@techstore.com",
            "customer_name": "Khách hàng",
            "customer_id": "N/A",
            "customer_type": "Thường",
            "purchase_history": "Chưa có",
            "preferences": "Chưa xác định",
            "budget": "Không giới hạn",
            "product_name": "N/A",
            "product_id": "N/A",
            "category": "N/A",
            "brand": "N/A",
            "price": "N/A",
            "description": "N/A",
            "rating": "N/A",
            "stock": "N/A"
        }
        
        # Merge with defaults
        final_context = {**defaults, **context}
        
        try:
            return template.format(**final_context)
        except KeyError as e:
            logger.error(f"Missing context key: {e}")
            return template
    
    def add_template(self, name: str, template: str):
        """Thêm template mới"""
        self.templates[name] = template
    
    def get_template(self, name: str) -> Optional[str]:
        """Lấy template"""
        return self.templates.get(name)
    
    def list_templates(self) -> Dict[str, str]:
        """Liệt kê tất cả templates"""
        return self.templates.copy()

def main():
    """Test function"""
    manager = PromptManager()
    
    print("📝 Prompt Manager")
    print("=" * 50)
    
    # Test context data
    manager.set_context_data("customer_name", "Nguyễn Văn A")
    manager.set_context_data("store_name", "TechStore Pro")
    
    # Test prompt generation
    prompt = manager.generate_prompt("customer_service_system")
    print("✅ Generated Customer Service Prompt:")
    print(prompt[:200] + "...")
    
    print(f"\n📋 Available Templates: {len(manager.templates)}")
    for name, template in manager.templates.items():
        print(f"   - {name}: {len(template)} chars")

if __name__ == "__main__":
    main()
