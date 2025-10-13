# 🛠️ AI System Scripts

Thư mục này chứa tất cả các scripts cho AI system, được tổ chức theo modules để dễ hiểu và maintain.

## 📁 Structure:

```
scripts/
├── 🤖 chatbot/              # Chatbot với MySQL integration
├── 📊 sentiment/            # Sentiment analysis cho Vietnamese
├── 🕷️ data_crawling/        # Crawl và xử lý dữ liệu
├── 📈 business_analytics/   # Business analytics và forecasting
└── 🔧 utils/                # Utilities và debug tools
```

## 🚀 Quick Start:

### **1. 🤖 Chatbot:**
```bash
cd chatbot/
python setup_chatbot.py      # Setup chatbot
python chatbot_interactive.py # Interactive chat
python chatbot_demo.py       # Demo capabilities
```

### **2. 📊 Sentiment Analysis:**
```bash
cd sentiment/
python train_advanced_sentiment.py # Train model
python sentiment_chat.py           # Interactive chat
python quick_sentiment_test.py "text" # Quick test
```

### **3. 🕷️ Data Crawling:**
```bash
cd data_crawling/
python generate_sample_data.py     # Generate sample data
python crawl_furniture_reviews.py  # Crawl reviews
python process_crawled_data.py     # Process data
```

### **4. 📈 Business Analytics:**
```bash
cd business_analytics/
python train_business_model.py     # Train business models
```

### **5. 🔧 Utilities:**
```bash
cd utils/
python inspect_database.py         # Inspect database
```

## 📋 Makefile Commands:

```bash
# Chatbot
make setup-chatbot
make chatbot-chat
make chatbot-demo

# Sentiment
make train-sentiment
make sentiment-chat

# Data Crawling
make generate-sample
make crawl-reviews
make process-crawled

# Business Analytics
make train-business

# All
make train-all
make test-system
```

## 🔧 Features Overview:

### **🤖 Chatbot Module:**
- ✅ MySQL integration với e-commerce database
- ✅ Product validation và smart search
- ✅ Real-time responses với fallback
- ✅ Interactive chat interface

### **📊 Sentiment Module:**
- ✅ Vietnamese NLP với teencode support
- ✅ Special character handling
- ✅ Database training pipeline
- ✅ Interactive testing tools

### **🕷️ Data Crawling Module:**
- ✅ Multi-source data collection
- ✅ Quality control và balancing
- ✅ Automated processing pipeline
- ✅ CSV và database integration

### **📈 Business Analytics Module:**
- ✅ Sales forecasting models
- ✅ Customer analytics
- ✅ Inventory optimization
- ✅ HTML report generation

### **🔧 Utilities Module:**
- ✅ Database inspection tools
- ✅ Performance analysis
- ✅ Debug utilities
- ✅ Health checks

## 📚 Documentation:

Mỗi module có README riêng với chi tiết về:
- File descriptions
- Usage instructions
- Features overview
- Quick start guides

## 🎯 Best Practices:

1. **Module Separation**: Mỗi module có chức năng riêng biệt
2. **Clear Documentation**: README cho từng module
3. **Consistent Structure**: Cấu trúc thống nhất
4. **Easy Navigation**: Dễ tìm và sử dụng
5. **Maintainable Code**: Code dễ maintain và extend
