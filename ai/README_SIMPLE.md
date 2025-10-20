# Web-ecommerce AI System - Simple Structure

## 🎯 Tổng quan

Hệ thống AI e-commerce được tổ chức đơn giản theo cấu trúc `ai-native-todo-task-agent` với:
- **1 folder `mcps`** chứa 1 file `main.py` với 7 MCP tools
- **Prompts viết bằng tiếng Anh** (tốt hơn cho LLM)
- **Agents đơn giản** trong 1 file `agents.py`
- **Cấu trúc gọn gàng** dễ maintain

## 🏗️ Cấu trúc đơn giản

```
ai/
├── mcps/
│   └── main.py              # 7 MCP tools (STDIO)
├── agents.py                # 4 agents + orchestrator
├── prompts.py               # English prompts
├── app.py                   # FastAPI main app
├── test_simple.py           # Simple testing
└── README_SIMPLE.md         # This file
```

## 🛠️ 7 MCP Tools

### 1. **search_products**
```python
async def search_products(query: str, limit: int = 10, ...) -> str:
    # Search products with vector search + SQL fallback
```

### 2. **analyze_sentiment**
```python
async def analyze_sentiment(texts: List[str], product_id: Optional[int] = None) -> str:
    # Analyze sentiment of customer feedback
```

### 3. **summarize_sentiment_by_product**
```python
async def summarize_sentiment_by_product(product_id: Optional[int] = None) -> str:
    # Summarize sentiment by product
```

### 4. **get_revenue_analytics**
```python
async def get_revenue_analytics(month: Optional[int] = None, year: Optional[int] = None, ...) -> str:
    # Get revenue analytics for specified period
```

### 5. **get_sales_performance**
```python
async def get_sales_performance(days: int = 30) -> str:
    # Get sales performance metrics
```

### 6. **get_product_metrics**
```python
async def get_product_metrics(limit: int = 20) -> str:
    # Get product performance metrics
```

### 7. **generate_report**
```python
async def generate_report(report_type: str = "summary", ...) -> str:
    # Generate comprehensive business report
```

## 🤖 4 Agents

### 1. **UserChatbotAgent**
- **Mục đích**: Tư vấn sản phẩm cho khách hàng
- **Tools**: `search_products`
- **Intents**: product_search, price_inquiry, product_comparison

### 2. **AdminChatbotAgent**
- **Mục đích**: Business intelligence cho admin
- **Tools**: `get_revenue_analytics`, `summarize_sentiment_by_product`, `generate_report`
- **Intents**: revenue_analysis, sentiment_analysis, report_generation

### 3. **SentimentAnalyzerAgent**
- **Mục đích**: Phân tích cảm xúc khách hàng
- **Tools**: `analyze_sentiment`, `summarize_sentiment_by_product`
- **Intents**: sentiment_analysis, sentiment_summary

### 4. **BusinessAnalystAgent**
- **Mục đích**: Phân tích KPI và metrics
- **Tools**: `get_revenue_analytics`, `get_sales_performance`, `get_product_metrics`
- **Intents**: revenue_analysis, sales_performance, product_metrics

## 🚀 Cách sử dụng

### 1. **Chạy MCP Server (STDIO)**
```bash
cd web-ecommerce/ai
python mcps/main.py
```

### 2. **Chạy FastAPI App**
```bash
python app.py
```

### 3. **Test System**
```bash
python test_simple.py
```

### 4. **API Usage**
```bash
# Chat với user
curl -X POST "http://localhost:8000/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Tìm laptop gaming", "user_type": "user"}'

# Chat với admin
curl -X POST "http://localhost:8000/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Báo cáo doanh thu", "user_type": "admin"}'
```

## 📊 Prompts (English)

### **Tại sao dùng tiếng Anh?**
- ✅ **LLM hiểu tốt hơn** - Tiếng Anh có nhiều training data hơn
- ✅ **Consistency** - Tất cả prompts đều dùng tiếng Anh
- ✅ **Performance** - LLM xử lý tiếng Anh nhanh và chính xác hơn
- ✅ **Maintainability** - Dễ maintain và debug

### **Ví dụ prompt:**
```python
USER_CHATBOT_SYSTEM_PROMPT = """
You are a User Chatbot Agent specialized in product consultation and search for e-commerce customers.
Your goal is to help customers find the right products and provide accurate information.

Core Capabilities:
- Product search and recommendations
- Price inquiries and comparisons
- Product details and specifications
- Shopping guidance and support

Operating Rules:
- Always use search_products tool when customers ask about products
- Provide accurate product information including name, price, and links
- Give helpful explanations for product recommendations
- Politely decline requests outside of product consultation scope
- Always communicate in Vietnamese for better customer experience
- Never make up or guess product information
"""
```

## 🔧 Configuration

### **Environment Variables**
```env
# Database
DB_MYSQL_HOST=localhost
DB_MYSQL_DATABASE=ecommerce_db

# Gemini Pro
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-pro

# App
APP_ENV=local
LOG_LEVEL=INFO
```

## 📈 Benefits của cấu trúc đơn giản

### **Trước (phức tạp):**
- ❌ Nhiều folders và files
- ❌ Prompts tiếng Việt (khó maintain)
- ❌ Cấu trúc phức tạp
- ❌ Khó debug và maintain

### **Sau (đơn giản):**
- ✅ **1 folder mcps** với 1 file main.py
- ✅ **Prompts tiếng Anh** (tốt hơn cho LLM)
- ✅ **4 agents** trong 1 file agents.py
- ✅ **Dễ maintain** và debug
- ✅ **Theo chuẩn ai-native-todo-task-agent**

## 🎯 Kết quả

- ✅ **Cấu trúc đơn giản** như ai-native-todo-task-agent
- ✅ **1 folder mcps** với 7 tools
- ✅ **Prompts tiếng Anh** (tốt hơn cho LLM)
- ✅ **Agents đơn giản** trong 1 file
- ✅ **Dễ maintain** và extend
- ✅ **Production ready**

---

**Cấu trúc đơn giản và hiệu quả theo chuẩn ai-native-todo-task-agent! 🎉**
