# 🕷️ Data Crawling Module

Thư mục này chứa các scripts để crawl và xử lý dữ liệu cho training AI models.

## 📁 Files:

### `crawl_furniture_reviews.py`
- **Chức năng**: Crawl review data cho furniture products
- **Sử dụng**: `python crawl_furniture_reviews.py`
- **Features**:
  - Crawl từ noithatviet.vn, Shopee, Lazada
  - Save to CSV format
  - Structured data fields

### `crawl_massive_reviews.py`
- **Chức năng**: Crawl massive data (1000-2000 reviews)
- **Sử dụng**: `python crawl_massive_reviews.py`
- **Features**:
  - Multiple sources (Facebook, Reddit, Forums)
  - Synthetic data generation
  - Large-scale data collection

### `generate_sample_data.py`
- **Chức năng**: Generate sample furniture review data
- **Sử dụng**: `python generate_sample_data.py`
- **Features**:
  - Balanced sentiment distribution
  - Quick testing data
  - CSV output format

### `import_shopee_data.py`
- **Chức năng**: Import Shopee reviews data
- **Sử dụng**: `python import_shopee_data.py`
- **Features**:
  - Load từ shopee-reviews-sentiment-analysis
  - Data preprocessing
  - Database integration

### `process_crawled_data.py`
- **Chức năng**: Process crawled data cho training
- **Sử dụng**: `python process_crawled_data.py`
- **Features**:
  - Data cleaning và filtering
  - Quality assessment
  - Training data preparation

### `process_massive_data.py`
- **Chức năng**: Process massive crawled data
- **Sử dụng**: `python process_massive_data.py`
- **Features**:
  - Large-scale data processing
  - Data balancing
  - Integration với training pipeline

### `improve_sentiment_model.py`
- **Chức năng**: Orchestrate crawling và training pipeline
- **Sử dụng**: `python improve_sentiment_model.py`
- **Features**:
  - End-to-end pipeline
  - Data quality improvement
  - Model retraining

## 🚀 Quick Start:

```bash
# Generate sample data
python generate_sample_data.py

# Crawl furniture reviews
python crawl_furniture_reviews.py

# Process data
python process_crawled_data.py

# Complete pipeline
python improve_sentiment_model.py
```

## 🔧 Features:

- ✅ **Multi-source Crawling** - Nhiều nguồn dữ liệu
- ✅ **Data Quality Control** - Kiểm soát chất lượng
- ✅ **Balanced Datasets** - Cân bằng sentiment
- ✅ **Automated Pipeline** - Quy trình tự động
- ✅ **CSV Integration** - Tích hợp CSV format
- ✅ **Database Ready** - Sẵn sàng cho database
