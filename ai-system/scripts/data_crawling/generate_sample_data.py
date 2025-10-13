#!/usr/bin/env python3
"""
Generate Sample Data - Tạo dữ liệu mẫu cho testing
"""

import pandas as pd
import os
from datetime import datetime
import random

def generate_sample_furniture_reviews():
    """Tạo dữ liệu mẫu reviews nội thất"""
    
    # Dữ liệu mẫu positive
    positive_reviews = [
        "Bàn làm việc rất đẹp, chất lượng cao, giao hàng nhanh",
        "Ghế văn phòng thoải mái, ngồi lâu không bị mỏi",
        "Tủ sách chắc chắn, thiết kế đẹp, phù hợp với không gian",
        "Bàn ăn đẹp, gỗ tốt, giá cả hợp lý",
        "Sofa rất thoải mái, màu sắc đẹp, đúng với mô tả",
        "Giường chắc chắn, ngủ ngon, chất lượng tốt",
        "Tủ quần áo rộng rãi, nhiều ngăn, tiện lợi",
        "Kệ sách đẹp, dễ lắp ráp, giá cả phải chăng",
        "Bàn học phù hợp cho trẻ em, an toàn, bền",
        "Ghế xoay mượt mà, điều chỉnh được độ cao",
        "Sản phẩm nội thất rất tốt, shop phục vụ nhiệt tình",
        "Chất lượng sản phẩm cao, đóng gói cẩn thận",
        "Giao hàng nhanh, sản phẩm đúng như hình",
        "Rất hài lòng với sản phẩm, sẽ mua lại",
        "Thiết kế đẹp, chất lượng tốt, giá cả hợp lý"
    ]
    
    # Dữ liệu mẫu negative
    negative_reviews = [
        "Bàn làm việc không chắc chắn, gỗ kém chất lượng",
        "Ghế văn phòng không thoải mái, ngồi lâu bị đau lưng",
        "Tủ sách dễ hỏng, thiết kế không đẹp",
        "Bàn ăn không đúng với mô tả, gỗ bị nứt",
        "Sofa không thoải mái, màu sắc không đúng",
        "Giường không chắc chắn, ngủ không ngon",
        "Tủ quần áo nhỏ, không đủ chỗ",
        "Kệ sách khó lắp ráp, hướng dẫn không rõ",
        "Bàn học không an toàn cho trẻ em",
        "Ghế xoay bị kẹt, không điều chỉnh được",
        "Sản phẩm kém chất lượng, shop phục vụ tệ",
        "Chất lượng sản phẩm kém, đóng gói sơ sài",
        "Giao hàng chậm, sản phẩm bị hỏng",
        "Không hài lòng với sản phẩm, không mua lại",
        "Thiết kế xấu, chất lượng kém, giá đắt"
    ]
    
    # Dữ liệu mẫu neutral
    neutral_reviews = [
        "Bàn làm việc bình thường, không có gì đặc biệt",
        "Ghế văn phòng ok, tạm được",
        "Tủ sách bình thường, không có gì nổi bật",
        "Bàn ăn đúng với mô tả, không có gì đặc biệt",
        "Sofa bình thường, không có gì nổi bật",
        "Giường ok, tạm được",
        "Tủ quần áo bình thường, không có gì đặc biệt",
        "Kệ sách ok, tạm được",
        "Bàn học bình thường, không có gì nổi bật",
        "Ghế xoay ok, tạm được",
        "Sản phẩm bình thường, không có gì đặc biệt",
        "Chất lượng sản phẩm bình thường",
        "Giao hàng đúng hẹn, sản phẩm bình thường",
        "Sản phẩm ok, không có gì đặc biệt",
        "Thiết kế bình thường, chất lượng ổn"
    ]
    
    # Tạo dữ liệu
    data = []
    
    # Thêm positive reviews
    for review in positive_reviews:
        data.append({
            'text': review,
            'processed_text': review,
            'sentiment': 'positive',
            'sentiment_label': 2,
            'rating': random.randint(4, 5),
            'author': f'User_{random.randint(1, 100)}',
            'product_name': random.choice(['Bàn làm việc', 'Ghế văn phòng', 'Tủ sách', 'Bàn ăn', 'Sofa', 'Giường', 'Tủ quần áo']),
            'source': 'sample_data',
            'url': f'https://example.com/product/{random.randint(1, 1000)}',
            'crawled_at': datetime.now().isoformat()
        })
    
    # Thêm negative reviews
    for review in negative_reviews:
        data.append({
            'text': review,
            'processed_text': review,
            'sentiment': 'negative',
            'sentiment_label': 0,
            'rating': random.randint(1, 2),
            'author': f'User_{random.randint(1, 100)}',
            'product_name': random.choice(['Bàn làm việc', 'Ghế văn phòng', 'Tủ sách', 'Bàn ăn', 'Sofa', 'Giường', 'Tủ quần áo']),
            'source': 'sample_data',
            'url': f'https://example.com/product/{random.randint(1, 1000)}',
            'crawled_at': datetime.now().isoformat()
        })
    
    # Thêm neutral reviews
    for review in neutral_reviews:
        data.append({
            'text': review,
            'processed_text': review,
            'sentiment': 'neutral',
            'sentiment_label': 1,
            'rating': 3,
            'author': f'User_{random.randint(1, 100)}',
            'product_name': random.choice(['Bàn làm việc', 'Ghế văn phòng', 'Tủ sách', 'Bàn ăn', 'Sofa', 'Giường', 'Tủ quần áo']),
            'source': 'sample_data',
            'url': f'https://example.com/product/{random.randint(1, 1000)}',
            'crawled_at': datetime.now().isoformat()
        })
    
    # Tạo DataFrame
    df = pd.DataFrame(data)
    
    # Tạo thư mục nếu chưa có
    os.makedirs('data', exist_ok=True)
    
    # Lưu CSV
    csv_path = 'data/crawled_reviews.csv'
    df.to_csv(csv_path, index=False, encoding='utf-8')
    
    print(f"✅ Generated {len(df)} sample reviews")
    print(f"📊 Sentiment distribution:")
    print(f"  Positive: {len(df[df['sentiment'] == 'positive'])}")
    print(f"  Negative: {len(df[df['sentiment'] == 'negative'])}")
    print(f"  Neutral: {len(df[df['sentiment'] == 'neutral'])}")
    print(f"💾 Saved to: {csv_path}")
    
    return csv_path

if __name__ == "__main__":
    generate_sample_furniture_reviews()
