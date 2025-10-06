#!/usr/bin/env python3
"""
Train Models Script - Script training models
Chức năng: Training tất cả các models AI
"""

import os
import sys
import json
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import DatabaseManager
from core.models import ModelManager

def print_banner():
    """In banner training"""
    print("=" * 80)
    print("🚀 AI MODELS TRAINING")
    print("=" * 80)
    print("📊 Training tất cả các models AI")
    print("🔧 Sentiment, Chatbot, Recommendation")
    print("=" * 80)

def train_sentiment_model():
    """Training sentiment model"""
    print("\n🎯 Training Sentiment Model...")
    
    # Lấy dữ liệu đã đánh nhãn
    db_manager = DatabaseManager()
    labeled_data = db_manager.export_labeled_data('sentiment')
    
    if not labeled_data:
        print("❌ Không có dữ liệu sentiment đã đánh nhãn!")
        return None
    
    print(f"📊 Found {len(labeled_data)} labeled samples")
    
    # Training model
    model_manager = ModelManager()
    accuracy, metadata = model_manager.train_sentiment_model(labeled_data)
    
    print(f"✅ Sentiment Model trained! Accuracy: {accuracy:.4f}")
    return {'accuracy': accuracy, 'metadata': metadata}

def train_chatbot_model():
    """Training chatbot model"""
    print("\n🤖 Training Chatbot Model...")
    
    # Lấy dữ liệu đã đánh nhãn
    db_manager = DatabaseManager()
    labeled_data = db_manager.export_labeled_data('chatbot')
    
    if not labeled_data:
        print("❌ Không có dữ liệu chatbot đã đánh nhãn!")
        return None
    
    print(f"📊 Found {len(labeled_data)} labeled samples")
    
    # Training model
    model_manager = ModelManager()
    accuracy, metadata = model_manager.train_chatbot_model(labeled_data)
    
    print(f"✅ Chatbot Model trained! Accuracy: {accuracy:.4f}")
    return {'accuracy': accuracy, 'metadata': metadata}

def train_recommendation_model():
    """Training recommendation model"""
    print("\n💡 Training Recommendation Model...")
    
    # Lấy dữ liệu đã đánh nhãn
    db_manager = DatabaseManager()
    labeled_data = db_manager.export_labeled_data('recommendation')
    
    if not labeled_data:
        print("❌ Không có dữ liệu recommendation đã đánh nhãn!")
        return None
    
    print(f"📊 Found {len(labeled_data)} labeled samples")
    
    # Training model
    model_manager = ModelManager()
    mse, metadata = model_manager.train_recommendation_model(labeled_data)
    
    print(f"✅ Recommendation Model trained! MSE: {mse:.4f}")
    return {'mse': mse, 'metadata': metadata}

def create_sample_labels():
    """Tạo nhãn mẫu cho dữ liệu"""
    print("\n🏷️ Creating sample labels...")
    
    db_manager = DatabaseManager()
    
    # Lấy dữ liệu chưa đánh nhãn
    sentiment_data = db_manager.get_pending_data('sentiment', limit=5)
    chatbot_data = db_manager.get_pending_data('chatbot', limit=5)
    recommendation_data = db_manager.get_pending_data('recommendation', limit=5)
    
    # Tạo nhãn sentiment
    if sentiment_data:
        sentiment_labels = ['joy', 'anger', 'optimism', 'sadness', 'anticipation']
        ratings = [5, 1, 4, 2, 3]
        
        for i, data in enumerate([sentiment_data]):
            if i < len(sentiment_labels):
                db_manager.add_sentiment_label(
                    data['id'], 
                    sentiment_labels[i], 
                    ratings[i]
                )
    
    # Tạo nhãn chatbot
    if chatbot_data:
        intent_labels = ['greeting', 'product_inquiry', 'price_question', 'availability', 'warranty']
        
        for i, data in enumerate([chatbot_data]):
            if i < len(intent_labels):
                db_manager.add_chatbot_label(
                    data['id'], 
                    intent_labels[i], 
                    {}
                )
    
    # Tạo nhãn recommendation
    if recommendation_data:
        for i, data in enumerate([recommendation_data]):
            db_manager.add_recommendation_label(
                data['id'], 
                f'user_{i}', 
                f'product_{i}', 
                (i % 5) + 1
            )
    
    print("✅ Sample labels created!")

def main():
    """Hàm main"""
    print_banner()
    
    # Tạo nhãn mẫu
    create_sample_labels()
    
    # Training results
    results = {}
    
    # Training sentiment model
    sentiment_result = train_sentiment_model()
    if sentiment_result:
        results['sentiment'] = sentiment_result
    
    # Training chatbot model
    chatbot_result = train_chatbot_model()
    if chatbot_result:
        results['chatbot'] = chatbot_result
    
    # Training recommendation model
    recommendation_result = train_recommendation_model()
    if recommendation_result:
        results['recommendation'] = recommendation_result
    
    # Lưu kết quả
    training_log = {
        'timestamp': datetime.now().isoformat(),
        'results': results
    }
    
    os.makedirs('logs', exist_ok=True)
    with open('logs/training_results.json', 'w') as f:
        json.dump(training_log, f, indent=2)
    
    # Hiển thị kết quả
    print("\n🎉 TRAINING COMPLETED!")
    print("=" * 80)
    print("📊 RESULTS:")
    
    for model_type, result in results.items():
        if 'accuracy' in result:
            print(f"   ✅ {model_type.title()}: {result['accuracy']:.4f} accuracy")
        else:
            print(f"   ✅ {model_type.title()}: {result['mse']:.4f} MSE")
    
    print("=" * 80)
    print("📱 Để chạy web app:")
    print("   python3 web/app.py")
    print("📱 Truy cập: http://localhost:5000")

if __name__ == "__main__":
    main()
