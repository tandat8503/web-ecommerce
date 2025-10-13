#!/usr/bin/env python3
"""
Improve Sentiment Model - Cải thiện model sentiment với dữ liệu mới
Quy trình: Crawl data -> Process -> Train -> Evaluate
"""

import os
import sys
import subprocess
from pathlib import Path
import sqlite3
import pandas as pd

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

class SentimentModelImprover:
    """Cải thiện Sentiment Model"""
    
    def __init__(self):
        self.db_path = "data/sentiment_training.db"
        
    def run_crawling(self):
        """Chạy crawling dữ liệu"""
        print("🕷️ Step 1: Crawling furniture reviews...")
        print("=" * 50)
        
        try:
            # Chạy script crawl
            result = subprocess.run([
                sys.executable, 
                "scripts/crawl_furniture_reviews.py"
            ], cwd=Path(__file__).parent.parent, capture_output=True, text=True)
            
            if result.returncode == 0:
                print("✅ Crawling completed successfully")
                print(result.stdout)
            else:
                print("❌ Crawling failed")
                print(result.stderr)
                return False
                
        except Exception as e:
            print(f"❌ Error running crawling: {e}")
            return False
            
        return True
    
    def process_data(self):
        """Xử lý dữ liệu đã crawl"""
        print("\n🔧 Step 2: Processing crawled data...")
        print("=" * 50)
        
        try:
            # Kiểm tra file CSV có tồn tại không
            csv_path = Path(__file__).parent.parent / "data" / "crawled_reviews.csv"
            if not csv_path.exists():
                print("⚠️ No crawled data found. Generating synthetic data...")
                # Tạo synthetic data nếu không có crawled data
                from scripts.process_crawled_data import CrawledDataProcessor
                processor = CrawledDataProcessor()
                processor.process_all_data()
            else:
                # Chạy script process với CSV
                result = subprocess.run([
                    sys.executable, 
                    "scripts/process_crawled_data.py"
                ], cwd=Path(__file__).parent.parent, capture_output=True, text=True)
                
                if result.returncode == 0:
                    print("✅ Data processing completed successfully")
                    print(result.stdout)
                else:
                    print("❌ Data processing failed")
                    print(result.stderr)
                    return False
                
        except Exception as e:
            print(f"❌ Error processing data: {e}")
            return False
            
        return True
    
    def retrain_model(self):
        """Train lại model với dữ liệu mới"""
        print("\n🤖 Step 3: Retraining sentiment model...")
        print("=" * 50)
        
        try:
            # Chạy script train
            result = subprocess.run([
                sys.executable, 
                "scripts/train_advanced_sentiment.py",
                "/Users/macbookpro/Workspace/test_repo/shopee-reviews-sentiment-analysis/data"
            ], cwd=Path(__file__).parent.parent, capture_output=True, text=True)
            
            if result.returncode == 0:
                print("✅ Model retraining completed successfully")
                print(result.stdout)
            else:
                print("❌ Model retraining failed")
                print(result.stderr)
                return False
                
        except Exception as e:
            print(f"❌ Error retraining model: {e}")
            return False
            
        return True
    
    def evaluate_improvement(self):
        """Đánh giá sự cải thiện của model"""
        print("\n📊 Step 4: Evaluating model improvement...")
        print("=" * 50)
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Lấy performance mới nhất
            cursor.execute("""
                SELECT model_name, accuracy, f1_score, precision, recall, 
                       training_samples, validation_samples, created_at
                FROM model_performance 
                ORDER BY created_at DESC 
                LIMIT 1
            """)
            
            latest_perf = cursor.fetchone()
            
            if latest_perf:
                print("📈 Latest Model Performance:")
                print(f"  Model: {latest_perf[0]}")
                print(f"  Accuracy: {latest_perf[1]:.4f}")
                print(f"  F1-score: {latest_perf[2]:.4f}")
                print(f"  Precision: {latest_perf[3]:.4f}")
                print(f"  Recall: {latest_perf[4]:.4f}")
                print(f"  Training samples: {latest_perf[5]}")
                print(f"  Validation samples: {latest_perf[6]}")
                print(f"  Created at: {latest_perf[7]}")
            
            # Thống kê dữ liệu
            cursor.execute("""
                SELECT label, COUNT(*) as count 
                FROM sentiment_training_data 
                GROUP BY label
            """)
            
            results = cursor.fetchall()
            total = sum(count for _, count in results)
            
            print(f"\n📊 Training Data Statistics:")
            print(f"  Total samples: {total}")
            
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
            print(f"\n📁 Data Sources:")
            for source, count in sources:
                percentage = count / total * 100
                print(f"  {source}: {count} ({percentage:.1f}%)")
            
            conn.close()
            
        except Exception as e:
            print(f"❌ Error evaluating improvement: {e}")
    
    def test_model_predictions(self):
        """Test model với các câu mẫu"""
        print("\n🧪 Step 5: Testing model predictions...")
        print("=" * 50)
        
        try:
            # Import model
            import joblib
            model_path = "models/sentiment/advanced/vietnamese_sentiment_model.joblib"
            
            if not os.path.exists(model_path):
                print("❌ Model file not found")
                return False
            
            model_data = joblib.load(model_path)
            model = model_data["pipeline"]
            
            # Test samples
            test_samples = [
                "Bàn làm việc rất đẹp, chất lượng cao",
                "Ghế văn phòng không thoải mái, ngồi lâu bị đau lưng",
                "Tủ sách bình thường, không có gì đặc biệt",
                "Sofa rất đẹp và thoải mái, giá cả hợp lý",
                "Giường không chắc chắn, gỗ kém chất lượng",
                "Bàn ăn ok, tạm được",
                "Sản phẩm nội thất rất tốt, giao hàng nhanh",
                "Không hài lòng với dịch vụ, sản phẩm bị hỏng",
                "Nội thất đẹp, phù hợp với không gian",
                "Chất lượng kém, không đúng với mô tả"
            ]
            
            print("🔮 Model Predictions:")
            for text in test_samples:
                # Preprocess
                from scripts.train_advanced_sentiment import preprocess_text
                processed_text, _ = preprocess_text(text)
                
                # Predict
                pred_proba = model.predict_proba([processed_text])[0]
                pred_label = pred_proba.argmax()
                confidence = pred_proba[pred_label]
                
                label_names = {0: "negative", 1: "neutral", 2: "positive"}
                print(f"  '{text[:50]}...' → {label_names[pred_label]} ({confidence:.3f})")
            
            print("✅ Model testing completed")
            
        except Exception as e:
            print(f"❌ Error testing model: {e}")
    
    def run_improvement_pipeline(self):
        """Chạy toàn bộ pipeline cải thiện"""
        print("🚀 Starting Sentiment Model Improvement Pipeline")
        print("=" * 60)
        
        steps = [
            ("Crawling Data", self.run_crawling),
            ("Processing Data", self.process_data),
            ("Retraining Model", self.retrain_model),
            ("Evaluating Improvement", self.evaluate_improvement),
            ("Testing Predictions", self.test_model_predictions)
        ]
        
        for step_name, step_func in steps:
            print(f"\n🔄 Running: {step_name}")
            success = step_func()
            
            if not success:
                print(f"❌ Failed at step: {step_name}")
                return False
        
        print("\n🎉 Sentiment Model Improvement Pipeline Completed Successfully!")
        return True

def main():
    """Main function"""
    improver = SentimentModelImprover()
    improver.run_improvement_pipeline()

if __name__ == "__main__":
    main()
