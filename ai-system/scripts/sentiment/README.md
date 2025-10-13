# 📊 Sentiment Analysis Module

Thư mục này chứa các scripts cho sentiment analysis với Vietnamese text processing.

## 📁 Files:

### `train_advanced_sentiment.py`
- **Chức năng**: Train advanced Vietnamese sentiment model
- **Sử dụng**: `python train_advanced_sentiment.py`
- **Features**:
  - Vietnamese text preprocessing
  - Teencode expansion
  - Compound word handling
  - TF-IDF + LogisticRegression

### `train_from_database.py`
- **Chức năng**: Train sentiment model từ SQLite database
- **Sử dụng**: `python train_from_database.py`
- **Features**:
  - Load data từ database
  - Model training và evaluation
  - Performance metrics

### `demo_sentiment.py`
- **Chức năng**: Demo sentiment analysis capabilities
- **Sử dụng**: `python demo_sentiment.py`
- **Features**:
  - Test various text types
  - Performance demonstration
  - Accuracy metrics

### `sentiment_chat.py`
- **Chức năng**: Interactive sentiment analysis chat
- **Sử dụng**: `python sentiment_chat.py`
- **Features**:
  - Real-time sentiment analysis
  - Interactive testing
  - Confidence scores

### `quick_sentiment_test.py`
- **Chức năng**: Quick sentiment test từ command line
- **Sử dụng**: `python quick_sentiment_test.py "text to analyze"`
- **Features**:
  - Fast testing
  - Command line interface

### `test_special_chars.py`
- **Chức năng**: Test model với special characters
- **Sử dụng**: `python test_special_chars.py`
- **Features**:
  - Special character handling
  - Teencode testing
  - Robustness verification

## 🚀 Quick Start:

```bash
# Train model
python train_advanced_sentiment.py

# Interactive chat
python sentiment_chat.py

# Quick test
python quick_sentiment_test.py "sản phẩm tốt"
```

## 🔧 Features:

- ✅ **Vietnamese NLP** - Xử lý tiếng Việt chuyên sâu
- ✅ **Teencode Support** - Hiểu từ viết tắt và teencode
- ✅ **Special Characters** - Xử lý ký tự đặc biệt
- ✅ **Compound Words** - Hiểu từ ghép với underscore
- ✅ **Database Integration** - Train từ SQLite
- ✅ **Interactive Testing** - Test real-time
