#!/usr/bin/env python3
"""
Product Validator - Module nhận diện và validate sản phẩm
Chức năng: Kiểm tra sản phẩm có thuộc danh mục nội thất văn phòng không
"""

import re
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass

@dataclass
class ProductValidationResult:
    """Kết quả validation sản phẩm"""
    is_office_furniture: bool
    confidence: float
    suggested_category: Optional[str] = None
    suggested_alternatives: List[str] = None
    reason: str = ""

class ProductValidator:
    """Validator sản phẩm cho nội thất văn phòng"""
    
    def __init__(self):
        # Danh mục sản phẩm nội thất văn phòng
        self.office_furniture_categories = {
            "bàn_làm_việc": [
                "bàn", "bàn làm việc", "bàn gỗ", "bàn kính", "bàn veneer",
                "bàn công nghiệp", "bàn văn phòng", "desk", "work table"
            ],
            "ghế_văn_phòng": [
                "ghế", "ghế văn phòng", "ghế xoay", "ghế lưng cao", "ghế lưng thấp",
                "ghế chân sắt", "ghế da", "chair", "office chair", "swivel chair"
            ],
            "tủ_hồ_sơ": [
                "tủ", "tủ hồ sơ", "tủ tài liệu", "tủ 2 ngăn", "tủ 3 ngăn", "tủ 4 ngăn",
                "tủ treo tường", "cabinet", "filing cabinet", "storage"
            ],
            "kệ_sách": [
                "kệ", "kệ sách", "kệ gỗ", "kệ sắt", "kệ treo tường", "kệ góc",
                "shelf", "bookshelf", "storage shelf"
            ],
            "bàn_họp": [
                "bàn họp", "bàn họp tròn", "bàn họp chữ nhật", "bàn họp oval",
                "meeting table", "conference table"
            ],
            "phụ_kiện": [
                "đèn bàn", "đèn led", "giá đỡ laptop", "hộp đựng bút", "kẹp tài liệu",
                "lamp", "desk lamp", "laptop stand", "pen holder", "document holder"
            ]
        }
        
        # Sản phẩm KHÔNG thuộc nội thất văn phòng
        self.non_office_products = [
            "điện thoại", "phone", "smartphone", "iphone", "samsung", "xiaomi",
            "laptop", "máy tính", "computer", "pc", "macbook",
            "quần áo", "clothes", "shirt", "pants", "dress", "áo", "quần",
            "sách", "book", "truyện", "novel", "textbook",
            "xe máy", "motorcycle", "ô tô", "car", "xe hơi",
            "đồ ăn", "food", "thức ăn", "món ăn", "restaurant",
            "mỹ phẩm", "cosmetics", "makeup", "son môi", "kem dưỡng",
            "thuốc", "medicine", "dược phẩm", "pharmaceutical",
            "đồ chơi", "toy", "game", "trò chơi", "đồ chơi trẻ em",
            "thể thao", "sport", "gym", "tập gym", "dụng cụ thể thao",
            "nhạc cụ", "musical instrument", "guitar", "piano", "đàn",
            "đồ gia dụng", "household", "nồi", "chảo", "bếp", "tủ lạnh"
        ]
        
        # Từ khóa thay thế gợi ý
        self.suggestion_keywords = {
            "điện thoại": "bàn làm việc có giá đỡ laptop",
            "laptop": "bàn làm việc và ghế văn phòng",
            "máy tính": "bàn làm việc chuyên dụng",
            "sách": "kệ sách và tủ tài liệu",
            "quần áo": "tủ quần áo văn phòng",
            "xe": "bàn làm việc và ghế văn phòng",
            "đồ ăn": "bàn họp và ghế họp",
            "mỹ phẩm": "bàn trang điểm văn phòng",
            "thuốc": "tủ y tế văn phòng",
            "đồ chơi": "kệ trưng bày",
            "thể thao": "kệ dụng cụ văn phòng",
            "nhạc cụ": "kệ nhạc cụ văn phòng"
        }
    
    def validate_product(self, product_query: str) -> ProductValidationResult:
        """
        Validate sản phẩm có thuộc danh mục nội thất văn phòng không
        
        Args:
            product_query: Câu hỏi về sản phẩm từ khách hàng
            
        Returns:
            ProductValidationResult: Kết quả validation
        """
        query_lower = product_query.lower()
        
        # Kiểm tra sản phẩm KHÔNG thuộc nội thất văn phòng
        for non_office in self.non_office_products:
            if non_office in query_lower:
                # Tìm sản phẩm thay thế phù hợp
                suggested_alternatives = self._find_alternatives(non_office)
                return ProductValidationResult(
                    is_office_furniture=False,
                    confidence=0.9,
                    suggested_alternatives=suggested_alternatives,
                    reason=f"Sản phẩm '{non_office}' không thuộc danh mục nội thất văn phòng"
                )
        
        # Kiểm tra sản phẩm thuộc nội thất văn phòng
        office_matches = []
        for category, keywords in self.office_furniture_categories.items():
            for keyword in keywords:
                if keyword in query_lower:
                    office_matches.append((category, keyword))
        
        if office_matches:
            # Tìm category phù hợp nhất
            best_category = max(set([match[0] for match in office_matches]), 
                              key=[match[0] for match in office_matches].count)
            
            return ProductValidationResult(
                is_office_furniture=True,
                confidence=0.8,
                suggested_category=best_category,
                reason=f"Sản phẩm thuộc danh mục nội thất văn phòng: {best_category}"
            )
        
        # Nếu không xác định được rõ ràng
        return ProductValidationResult(
            is_office_furniture=False,
            confidence=0.3,
            suggested_alternatives=["bàn làm việc", "ghế văn phòng", "tủ hồ sơ", "kệ sách"],
            reason="Không xác định được sản phẩm cụ thể, đề xuất các sản phẩm nội thất văn phòng phổ biến"
        )
    
    def _find_alternatives(self, non_office_product: str) -> List[str]:
        """Tìm sản phẩm thay thế phù hợp"""
        alternatives = []
        
        # Tìm từ khóa gợi ý trực tiếp
        for keyword, suggestion in self.suggestion_keywords.items():
            if keyword in non_office_product.lower():
                alternatives.append(suggestion)
        
        # Nếu không tìm thấy, đề xuất sản phẩm phổ biến
        if not alternatives:
            alternatives = [
                "bàn làm việc cao cấp",
                "ghế văn phòng ergonomic", 
                "tủ hồ sơ 4 ngăn",
                "kệ sách treo tường",
                "bàn họp chữ nhật"
            ]
        
        return alternatives[:3]  # Chỉ trả về 3 gợi ý
    
    def get_office_furniture_categories(self) -> Dict[str, List[str]]:
        """Lấy danh sách các danh mục nội thất văn phòng"""
        return self.office_furniture_categories.copy()
    
    def is_office_furniture_keyword(self, keyword: str) -> bool:
        """Kiểm tra từ khóa có thuộc nội thất văn phòng không"""
        keyword_lower = keyword.lower()
        
        for category_keywords in self.office_furniture_categories.values():
            if keyword_lower in category_keywords:
                return True
        
        return False

# Test function
def test_product_validator():
    """Test ProductValidator"""
    validator = ProductValidator()
    
    test_cases = [
        "Giá iPhone 17 là bao nhiêu?",
        "Tôi muốn mua bàn làm việc gỗ",
        "Có ghế văn phòng nào không?",
        "Laptop gaming giá bao nhiêu?",
        "Tôi cần tủ hồ sơ 4 ngăn",
        "Có bán quần áo không?",
        "Đèn bàn LED có không?",
        "Xe máy Honda giá bao nhiêu?"
    ]
    
    print("=== TEST PRODUCT VALIDATOR ===")
    for query in test_cases:
        result = validator.validate_product(query)
        print(f"\nQuery: {query}")
        print(f"Is Office Furniture: {result.is_office_furniture}")
        print(f"Confidence: {result.confidence}")
        print(f"Reason: {result.reason}")
        if result.suggested_alternatives:
            print(f"Alternatives: {result.suggested_alternatives}")
        if result.suggested_category:
            print(f"Category: {result.suggested_category}")

if __name__ == "__main__":
    test_product_validator()
