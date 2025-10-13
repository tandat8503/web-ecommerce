#!/usr/bin/env python3
"""
Train Model from Database - Train model từ dữ liệu đã tích hợp trong database
"""

import os
import sys
import sqlite3
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from scripts.train_advanced_sentiment import (
    normalize_vietnamese_text, 
    expand_vietnamese_slang, 
    expand_underscore_words,
    extract_sentiment_features,
    LABEL_MAP,
    ID2LABEL
)

DB_PATH = "data/sentiment_training.db"
MODEL_DIR = "models/sentiment/advanced"
MODEL_PATH = f"{MODEL_DIR}/vietnamese_sentiment_model.joblib"

def load_training_data_from_db(db_path: str = DB_PATH) -> pd.DataFrame:
    """Load dữ liệu training từ SQLite database"""
    print(f"📁 Loading data from database: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        
        # Load tất cả dữ liệu training từ database
        query = """
        SELECT text, original_text, label, source_file, confidence, preprocessing_info, created_at
        FROM sentiment_training_data
        ORDER BY created_at DESC
        """
        
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        print(f"✅ Loaded {len(df)} rows from database")
        
        # Map sentiment label sang text
        def map_label_to_sentiment(label):
            if label == 0: return "negative"
            elif label == 1: return "neutral"
            elif label == 2: return "positive"
            else: return "neutral"
        
        df['sentiment'] = df['label'].apply(map_label_to_sentiment)
        df['source'] = df['source_file']
        
        return df
        
    except Exception as e:
        print(f"❌ Error loading from database: {e}")
        return pd.DataFrame()

def preprocess_text(text: str) -> str:
    """Preprocess text với xử lý tiếng Việt nâng cao"""
    if not text or pd.isna(text):
        return ""
    
    # Chuẩn hóa văn bản
    text = normalize_vietnamese_text(text)
    
    # Mở rộng từ viết tắt
    text = expand_vietnamese_slang(text)
    
    # Xử lý từ ghép có dấu gạch dưới
    text = expand_underscore_words(text)
    
    return text

def build_advanced_model():
    """Xây dựng model với TF-IDF và Logistic Regression"""
    print("🔧 Building advanced model...")
    
    # TF-IDF Vectorizer với parameters tối ưu cho tiếng Việt
    vectorizer = TfidfVectorizer(
        max_features=10000,
        ngram_range=(1, 3),  # Unigram, bigram, trigram
        min_df=2,  # Từ phải xuất hiện ít nhất 2 lần
        max_df=0.95,  # Từ không được xuất hiện quá 95% documents
        stop_words=None,  # Không dùng stop words vì có thể mất thông tin quan trọng
        lowercase=True,
        strip_accents='unicode',
        analyzer='word'
    )
    
    # Logistic Regression với parameters tối ưu
    classifier = LogisticRegression(
        random_state=42,
        max_iter=1000,
        C=1.0,  # Regularization strength
        multi_class='ovr'  # One-vs-Rest for multi-class
    )
    
    # Pipeline
    model = Pipeline([
        ('vectorizer', vectorizer),
        ('classifier', classifier)
    ])
    
    return model

def train_and_evaluate(model, X_train, X_val, y_train, y_val):
    """Train và evaluate model"""
    print("🔄 Training model...")
    
    # Train model
    model.fit(X_train, y_train)
    
    # Predictions
    y_pred = model.predict(X_val)
    y_pred_proba = model.predict_proba(X_val)
    
    # Metrics
    accuracy = accuracy_score(y_val, y_pred)
    print(f"📊 Accuracy: {accuracy:.4f}")
    
    # Cross-validation
    cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring='accuracy')
    print(f"📊 Cross-validation scores: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
    
    # Classification report
    print("\n📊 Classification Report:")
    print(classification_report(y_val, y_pred, target_names=['negative', 'neutral', 'positive']))
    
    # Confusion matrix
    print("\n📊 Confusion Matrix:")
    cm = confusion_matrix(y_val, y_pred)
    print(cm)
    
    return model, accuracy, cv_scores

def test_model_predictions(model, test_cases):
    """Test model với các test cases"""
    print("\n🔮 Testing model predictions...")
    
    for text in test_cases:
        # Preprocess text
        processed_text = preprocess_text(text)
        
        # Predict
        prediction = model.predict([processed_text])[0]
        probability = model.predict_proba([processed_text])[0]
        
        # Get confidence
        confidence = max(probability)
        
        print(f"📝 '{text[:50]}{'...' if len(text) > 50 else ''}' → {ID2LABEL[prediction]} ({confidence:.3f})")

def save_model_performance(accuracy, cv_scores, model, db_path: str = DB_PATH):
    """Lưu performance metrics vào database"""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Lưu performance metrics
        cursor.execute("""
            INSERT INTO model_performance 
            (model_name, accuracy, f1_score, precision, recall, training_samples, validation_samples, 
             cross_val_scores, confusion_matrix, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "advanced-vietnamese-sentiment",
            accuracy,
            accuracy,  # F1 score (simplified)
            accuracy,  # Precision (simplified)
            accuracy,  # Recall (simplified)
            0,  # Will be updated
            0,  # Will be updated
            str(cv_scores.tolist()),
            "",  # Confusion matrix
            pd.Timestamp.now().isoformat()
        ))
        
        conn.commit()
        conn.close()
        
        print("✅ Model performance saved to database")
        
    except Exception as e:
        print(f"❌ Error saving model performance: {e}")

def main():
    """Main function"""
    print("🚀 Training Model from Database")
    print("=" * 60)
    
    # 1. Load data from database
    df = load_training_data_from_db()
    
    if len(df) == 0:
        print("❌ No data found in database!")
        return
    
    # 2. Preprocess data
    print("🔄 Preprocessing data...")
    df['processed_text'] = df['text'].apply(preprocess_text)
    
    # Filter out empty texts
    df = df[df['processed_text'].str.len() > 0]
    
    print(f"📊 Final dataset: {len(df)} rows")
    print(f"📊 Sentiment distribution:")
    sentiment_counts = df['sentiment'].value_counts()
    print(sentiment_counts)
    
    # 3. Prepare features and labels
    X = df['processed_text'].values
    y = df['label'].values  # Use numeric labels
    
    # 4. Split data
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"📊 Training samples: {len(X_train)}")
    print(f"📊 Validation samples: {len(X_val)}")
    
    # 5. Build and train model
    model = build_advanced_model()
    trained_model, accuracy, cv_scores = train_and_evaluate(model, X_train, X_val, y_train, y_val)
    
    # 6. Save model
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(trained_model, MODEL_PATH)
    print(f"💾 Model saved to: {MODEL_PATH}")
    
    # 7. Save performance
    save_model_performance(accuracy, cv_scores, trained_model)
    
    # 8. Test predictions
    test_cases = [
        "Sản phẩm rất tốt, chất lượng cao, giao hàng nhanh",
        "Tôi không hài lòng với dịch vụ này, tệ quá",
        "Sản phẩm bình thường, không có gì đặc biệt",
        "Shop phục vụ tốt, shipper thân thiện",
        "Hàng về bị hỏng, rất thất vọng",
        "Quá tuyệt vời! Sẽ mua lại",
        "Không như mong đợi, chất lượng kém",
        "Bình thường thôi, không có gì nổi bật",
        "Tuyệt vời! Rất hài lòng với sản phẩm",
        "Sp ok, tạm dc",
        "Nma sp rat tot, giao hang nhanh",
        "K dc, sp te qua",
        "Oki, sp dep nma hoi dat",
        "Sp rat hay, se mua lai",
        "K nhu mong doi, chat luong kem",
        "Sp binh thuong, k co gi dac biet",
        "Shop phuc vu tot, shipper than thien",
        "Hang ve bi hong, rat that vong",
        "Qua tuyet voi! Se mua lai",
        "Sp rat tot, chat luong cao, giao hang nhanh",
        "T k hai long vs dich vu nay, te qua",
        "Sp binh thuong, k co gi dac biet",
        "Shop phuc vu tot, shipper than thien",
        "Hang ve bi hong, rat that vong",
        "Sp ok, tam dc",
        "Qua tuyet voi! Se mua lai",
        "K nhu mong doi, chat luong kem",
        "Binh thuong thoi, k co gi noi bat",
        "Tuyet voi! Rat hai long vs sp",
        "Sản_phẩm rất tốt, chất_lượng cao",
        "Dịch_vụ giao_hàng nhanh chóng",
        "Khách_hàng hài_lòng với sản_phẩm",
        "Cửa_hàng phục_vụ tốt, shipper thân_thiện",
        "Hàng về bị hỏng, rất thất_vọng",
        "Sản_phẩm bình_thường, không có gì đặc_biệt",
        "Chất_lượng sản_phẩm kém, giá_cả đắt",
        "Thời_gian giao_hàng chậm, dịch_vụ tệ",
        "Sản_phẩm đẹp, màu_sắc đúng với mô_tả",
        "Kích_thước sản_phẩm phù_hợp, giá_thành hợp_lý"
    ]
    
    test_model_predictions(trained_model, test_cases)
    
    print(f"\n🎉 Training completed successfully!")
    print(f"📊 Final accuracy: {accuracy:.4f}")
    print(f"💾 Model saved to: {MODEL_PATH}")
    print(f"💾 Database: {DB_PATH}")

if __name__ == "__main__":
    main()
