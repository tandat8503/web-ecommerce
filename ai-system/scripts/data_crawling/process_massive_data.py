#!/usr/bin/env python3
"""
Process Massive Data - Xử lý dữ liệu massive (1000-2000 reviews)
"""

import os
import sqlite3
import pandas as pd
import re
from pathlib import Path
from typing import List, Dict, Any
import sys

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from scripts.train_advanced_sentiment import (
    normalize_vietnamese_text, 
    expand_vietnamese_slang, 
    expand_underscore_words,
    extract_sentiment_features,
    LABEL_MAP
)

class MassiveDataProcessor:
    """Xử lý dữ liệu massive"""
    
    def __init__(self, db_path: str = "data/sentiment_training.db"):
        self.db_path = db_path
        
    def load_massive_data(self, csv_path: str = "data/massive_reviews.csv") -> pd.DataFrame:
        """Load dữ liệu massive từ CSV file"""
        print("🔄 Loading massive data from CSV...")
        
        try:
            if not os.path.exists(csv_path):
                print(f"⚠️ CSV file not found: {csv_path}")
                return pd.DataFrame()
            
            # Load từ CSV
            df_massive = pd.read_csv(csv_path, encoding='utf-8')
            
            print(f"✅ Loaded {len(df_massive)} massive reviews from CSV")
            return df_massive
            
        except Exception as e:
            print(f"❌ Error loading massive data: {e}")
            return pd.DataFrame()
    
    def preprocess_massive_text(self, text: str) -> str:
        """Preprocess text từ massive data"""
        if not text or pd.isna(text):
            return ""
        
        # Chuẩn hóa văn bản
        text = normalize_vietnamese_text(text)
        
        # Mở rộng từ viết tắt
        text = expand_vietnamese_slang(text)
        
        return text
    
    def validate_sentiment(self, sentiment: str, rating: int) -> str:
        """Validate và chuẩn hóa sentiment"""
        if pd.isna(sentiment):
            return "neutral"
        
        sentiment = sentiment.lower().strip()
        
        # Nếu có rating, sử dụng rating để xác định sentiment
        if rating and rating > 0:
            if rating >= 4:
                return "positive"
            elif rating <= 2:
                return "negative"
            else:
                return "neutral"
        
        # Nếu không có rating, sử dụng sentiment text
        if sentiment in ["positive", "pos", "tích cực", "tốt", "hay"]:
            return "positive"
        elif sentiment in ["negative", "neg", "tiêu cực", "tệ", "dở"]:
            return "negative"
        else:
            return "neutral"
    
    def filter_quality_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Lọc dữ liệu chất lượng cao"""
        print("🔍 Filtering quality data...")
        
        original_count = len(df)
        
        # Loại bỏ dữ liệu trống
        df = df.dropna(subset=['text'])
        df = df[df['text'].str.strip() != '']
        
        # Preprocess text
        df['processed_text'] = df['text'].apply(self.preprocess_massive_text)
        
        # Loại bỏ text quá ngắn hoặc không có ý nghĩa
        df = df[df['processed_text'].str.len() >= 10]
        df = df[df['processed_text'] != '']
        
        # Validate sentiment
        df['validated_sentiment'] = df.apply(
            lambda row: self.validate_sentiment(row['sentiment'], row['rating']), 
            axis=1
        )
        
        # Loại bỏ text có quá nhiều ký tự đặc biệt
        df = df[df['processed_text'].str.count(r'[^\w\s]') / df['processed_text'].str.len() < 0.3]
        
        # Loại bỏ text có quá nhiều số
        df = df[df['processed_text'].str.count(r'\d') / df['processed_text'].str.len() < 0.5]
        
        # Loại bỏ duplicate content
        df = df.drop_duplicates(subset=['processed_text'])
        
        filtered_count = len(df)
        print(f"✅ Filtered from {original_count} to {filtered_count} reviews ({filtered_count/original_count*100:.1f}% kept)")
        
        return df
    
    def balance_massive_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Cân bằng dữ liệu massive"""
        print("⚖️ Balancing massive data by sentiment...")
        
        sentiment_counts = df['validated_sentiment'].value_counts()
        print(f"Original distribution: {sentiment_counts.to_dict()}")
        
        # Tìm số lượng nhỏ nhất
        min_count = sentiment_counts.min()
        
        # Cân bằng dữ liệu
        balanced_dfs = []
        for sentiment in sentiment_counts.index:
            sentiment_df = df[df['validated_sentiment'] == sentiment]
            if len(sentiment_df) > min_count:
                # Undersample nếu quá nhiều
                balanced_df = sentiment_df.sample(min_count, random_state=42)
            else:
                balanced_df = sentiment_df
            balanced_dfs.append(balanced_df)
        
        df_balanced = pd.concat(balanced_dfs, ignore_index=True)
        
        new_counts = df_balanced['validated_sentiment'].value_counts()
        print(f"Balanced distribution: {new_counts.to_dict()}")
        
        return df_balanced
    
    def integrate_with_training_data(self, df_massive: pd.DataFrame) -> None:
        """Tích hợp dữ liệu massive vào training data"""
        print("🔄 Integrating massive data with training data...")
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Chuẩn bị dữ liệu để insert
            rows = []
            for _, row in df_massive.iterrows():
                # Trích xuất features
                features = extract_sentiment_features(row['processed_text'])
                features_json = str(features)
                
                rows.append((
                    row['processed_text'],  # text
                    row['text'],         # original_text
                    LABEL_MAP[row['validated_sentiment']],  # label
                    f"massive_{row['source']}",  # source_file
                    1.0,                    # confidence
                    features_json           # preprocessing_info
                ))
            
            # Insert vào bảng training data
            cursor.executemany("""
                INSERT INTO sentiment_training_data 
                (text, original_text, label, source_file, confidence, preprocessing_info)
                VALUES (?, ?, ?, ?, ?, ?)
            """, rows)
            
            conn.commit()
            conn.close()
            
            print(f"✅ Integrated {len(rows)} massive reviews into training data")
            
        except Exception as e:
            print(f"❌ Error integrating massive data: {e}")
    
    def generate_additional_neutral_data(self, count: int = 500) -> pd.DataFrame:
        """Tạo thêm dữ liệu neutral từ templates"""
        print(f"🔄 Generating {count} additional neutral samples...")
        
        # Templates cho neutral reviews
        neutral_templates = [
            "Sản phẩm {product} bình thường, không có gì đặc biệt",
            "Đúng với mô tả, giao hàng đúng hẹn",
            "Giá cả hợp lý, chất lượng ổn",
            "Sản phẩm {product} ok, tạm được",
            "Không có gì nổi bật, cũng không tệ",
            "Sản phẩm {product} bình thường thôi",
            "Đúng như hình, không có gì đặc biệt",
            "Giá vậy thì cũng được, không mong đợi gì hơn",
            "Sản phẩm {product} ổn, không có gì phàn nàn",
            "Bình thường, không có gì đặc biệt",
            "Đúng với mô tả, không có gì nổi bật",
            "Sản phẩm {product} tạm được, không có gì đặc biệt",
            "Giá cả phù hợp, chất lượng bình thường",
            "Sản phẩm {product} ok, không có gì phàn nàn",
            "Đúng như hình, không có gì đặc biệt",
            "Sản phẩm {product} bình thường, không có gì nổi bật",
            "Giá vậy thì cũng được, không mong đợi gì hơn",
            "Sản phẩm {product} ổn, không có gì phàn nàn",
            "Bình thường, không có gì đặc biệt",
            "Đúng với mô tả, không có gì nổi bật"
        ]
        
        # Danh sách sản phẩm nội thất
        products = [
            "bàn làm việc", "ghế văn phòng", "tủ sách", "bàn ăn", 
            "ghế ăn", "sofa", "giường", "tủ quần áo", "kệ sách",
            "bàn học", "ghế xoay", "tủ giày", "bàn trà", "ghế sofa",
            "bàn máy tính", "ghế gaming", "tủ tivi", "bàn trang điểm",
            "ghế đọc sách", "kệ tivi", "bàn cà phê", "ghế bar",
            "tủ bếp", "bàn ăn gỗ", "ghế ăn gỗ", "sofa gỗ",
            "giường gỗ", "tủ quần áo gỗ", "kệ sách gỗ", "bàn học gỗ"
        ]
        
        synthetic_data = []
        
        for i in range(count):
            # Chọn template ngẫu nhiên
            template = neutral_templates[i % len(neutral_templates)]
            product = products[i % len(products)]
            
            # Tạo text
            text = template.format(product=product)
            
            # Preprocess
            processed_text = self.preprocess_massive_text(text)
            
            # Trích xuất features
            features = extract_sentiment_features(processed_text)
            
            synthetic_data.append({
                'text': text,
                'processed_text': processed_text,
                'validated_sentiment': 'neutral',
                'source': 'additional_neutral',
                'product_name': product,
                'features': features
            })
        
        df_synthetic = pd.DataFrame(synthetic_data)
        print(f"✅ Generated {len(df_synthetic)} additional neutral samples")
        
        return df_synthetic
    
    def process_massive_data(self, csv_path: str = "data/massive_reviews.csv"):
        """Xử lý dữ liệu massive"""
        print("🚀 Starting massive data processing...")
        print("=" * 60)
        
        # 1. Load massive data từ CSV
        df_massive = self.load_massive_data(csv_path)
        
        if len(df_massive) == 0:
            print("⚠️ No massive data found. Generating synthetic data...")
            df_massive = self.generate_additional_neutral_data(1000)
        else:
            # 2. Filter quality data
            df_massive = self.filter_quality_data(df_massive)
            
            # 3. Balance data
            df_massive = self.balance_massive_data(df_massive)
        
        # 4. Generate additional neutral data
        df_additional = self.generate_additional_neutral_data(300)
        
        # 5. Combine data
        df_combined = pd.concat([df_massive, df_additional], ignore_index=True)
        
        # 6. Integrate with training data
        self.integrate_with_training_data(df_combined)
        
        # 7. Show statistics
        self.show_statistics()
        
        print("\n🎉 Massive data processing completed!")
    
    def show_statistics(self):
        """Hiển thị thống kê dữ liệu"""
        print("\n📊 Final Data Statistics:")
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Thống kê training data
            cursor.execute("""
                SELECT label, COUNT(*) as count 
                FROM sentiment_training_data 
                GROUP BY label
            """)
            
            results = cursor.fetchall()
            total = sum(count for _, count in results)
            
            print(f"Total training samples: {total}")
            print("Sentiment distribution:")
            
            label_names = {0: "negative", 1: "neutral", 2: "positive"}
            for label, count in results:
                percentage = count / total * 100
                print(f"  {label_names.get(label, 'unknown')}: {count} ({percentage:.1f}%)")
            
            # Thống kê sources
            cursor.execute("""
                SELECT source_file, COUNT(*) as count 
                FROM sentiment_training_data 
                GROUP BY source_file
                ORDER BY count DESC
            """)
            
            sources = cursor.fetchall()
            print("\nSource distribution:")
            for source, count in sources:
                percentage = count / total * 100
                print(f"  {source}: {count} ({percentage:.1f}%)")
            
            conn.close()
            
        except Exception as e:
            print(f"❌ Error showing statistics: {e}")

def main():
    """Main function"""
    processor = MassiveDataProcessor()
    processor.process_massive_data()

if __name__ == "__main__":
    main()
