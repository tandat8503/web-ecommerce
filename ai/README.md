# Web-ecommerce AI System - Optimized

## 🎯 Tổng quan

Hệ thống AI e-commerce được tối ưu với cấu trúc đơn giản, lấy data từ `ecommerce_db` và không có lỗi.

## 🏗️ Cấu trúc tối ưu

```
ai/
├── mcps/
│   ├── main.py              # 7 MCP tools (STDIO)
│   └── trace.py             # Tracing utilities
├── agents.py                # 4 agents + orchestrator
├── prompts.py               # English prompts
├── app.py                   # FastAPI main app
├── test_simple.py           # Simple testing
├── requirements.txt         # Dependencies
└── README.md                # This file
```

## 🛠️ 7 MCP Tools (Optimized)

### 1. **search_products**
```python
async def search_products(query: str, limit: int = 10, ...) -> str:
    # Search products with vector search + SQL fallback
    # Proper database connection handling
```

### 2. **analyze_sentiment**
```python
async def analyze_sentiment(texts: List[str], product_id: Optional[int] = None) -> str:
    # Analyze sentiment of customer feedback
    # Proper database connection handling
```

### 3. **summarize_sentiment_by_product**
```python
async def summarize_sentiment_by_product(product_id: Optional[int] = None) -> str:
    # Summarize sentiment by product
    # Proper database connection handling
```

### 4. **get_revenue_analytics**
```python
async def get_revenue_analytics(month: Optional[int] = None, year: Optional[int] = None, ...) -> str:
    # Get revenue analytics for specified period
    # Proper database connection handling
```

### 5. **get_sales_performance**
```python
async def get_sales_performance(days: int = 30) -> str:
    # Get sales performance metrics
    # Direct SQL queries to ecommerce_db
```

### 6. **get_product_metrics**
```python
async def get_product_metrics(limit: int = 20) -> str:
    # Get product performance metrics
    # Direct SQL queries to ecommerce_db
```

### 7. **generate_report**
```python
async def generate_report(report_type: str = "summary", ...) -> str:
    # Generate comprehensive business report
    # Combines multiple data sources
```

## 🤖 4 Agents (Optimized)

### 1. **UserChatbotAgent**
- **Mục đích**: Tư vấn sản phẩm cho khách hàng
- **Tools**: `search_products`
- **Database**: Lấy data từ `ecommerce_db.products`

### 2. **AdminChatbotAgent**
- **Mục đích**: Business intelligence cho admin
- **Tools**: `get_revenue_analytics`, `summarize_sentiment_by_product`, `generate_report`
- **Database**: Lấy data từ `ecommerce_db.orders`, `ecommerce_db.products`

### 3. **SentimentAnalyzerAgent**
- **Mục đích**: Phân tích cảm xúc khách hàng
- **Tools**: `analyze_sentiment`, `summarize_sentiment_by_product`
- **Database**: Lấy data từ `ecommerce_db.comments`, `ecommerce_db.products`

### 4. **BusinessAnalystAgent**
- **Mục đích**: Phân tích KPI và metrics
- **Tools**: `get_revenue_analytics`, `get_sales_performance`, `get_product_metrics`
- **Database**: Lấy data từ `ecommerce_db.orders`, `ecommerce_db.order_items`

## 🗄️ Database Integration

### **Tables được sử dụng:**
- `products` - Thông tin sản phẩm
- `orders` - Đơn hàng
- `order_items` - Chi tiết đơn hàng
- `comments` - Bình luận khách hàng
- `customers` - Thông tin khách hàng

### **Connection Handling:**
```python
# Proper connection management
conn = None
try:
    conn = await get_conn()
    # Database operations
    result = await some_database_operation(conn)
    return result
except Exception as e:
    logger.error(f"Database error: {e}")
    return error_response
finally:
    if conn:
        await release_conn(conn)
```

## 🚀 Cách sử dụng

### 1. **Setup Environment**
```bash
# Copy environment file
cp env.example .env

# Edit .env with your database and API keys
DB_MYSQL_HOST=localhost
DB_MYSQL_DATABASE=ecommerce_db
DB_MYSQL_USER=your_username
DB_MYSQL_PASSWORD=your_password
GEMINI_API_KEY=your_gemini_api_key
```

### 2. **Install Dependencies**
```bash
pip install -r requirements.txt
```

### 3. **Run MCP Server (STDIO)**
```bash
python mcps/main.py
```

### 4. **Run FastAPI App**
```bash
python app.py
```

### 5. **Test System**
```bash
python test_simple.py
```

## 📊 API Endpoints

### **POST /chat**
```json
{
  "message": "Tìm laptop gaming",
  "user_type": "user",
  "context": {}
}
```

### **GET /health**
```json
{
  "status": "healthy",
  "timestamp": "1234567890.123",
  "version": "1.0.0"
}
```

### **GET /agents**
```json
{
  "agents": {
    "user_chatbot": {
      "name": "User Chatbot",
      "description": "Product consultation and search for customers",
      "capabilities": ["product_search", "price_inquiry", "product_comparison"]
    }
  },
  "total": 4,
  "orchestrator_available": true
}
```

### **GET /tools**
```json
{
  "tools": {
    "search_products": {
      "description": "Search for products in the e-commerce database",
      "parameters": ["query", "limit", "min_price", "max_price", "category"]
    }
  },
  "total": 7
}
```

## 🔧 Optimizations

### **Database Connection:**
- ✅ **Proper connection pooling** - Sử dụng aiomysql pool
- ✅ **Connection lifecycle** - Proper acquire/release
- ✅ **Error handling** - Try/catch/finally blocks
- ✅ **Resource cleanup** - Always release connections

### **Code Structure:**
- ✅ **Single responsibility** - Mỗi file có 1 mục đích rõ ràng
- ✅ **No circular imports** - Clean import structure
- ✅ **Error handling** - Comprehensive error handling
- ✅ **Logging** - Proper logging throughout

### **Performance:**
- ✅ **Async/await** - Non-blocking operations
- ✅ **Connection pooling** - Efficient database usage
- ✅ **Caching** - Tool result caching
- ✅ **Tracing** - DDTrace integration

## 🎯 Kết quả

- ✅ **Cấu trúc đơn giản** - Chỉ 6 files chính
- ✅ **Database integration** - Lấy data từ ecommerce_db
- ✅ **No errors** - Code clean và không lỗi
- ✅ **Production ready** - Proper error handling và logging
- ✅ **Maintainable** - Dễ maintain và extend
- ✅ **Scalable** - Có thể scale theo nhu cầu

## 🧪 Testing

```bash
# Test database connection
python -c "import asyncio; from test_simple import test_database_connection; asyncio.run(test_database_connection())"

# Test MCP tools
python -c "import asyncio; from test_simple import test_mcp_tools; asyncio.run(test_mcp_tools())"

# Test agents
python -c "import asyncio; from test_simple import test_agents; asyncio.run(test_agents())"

# Full test suite
python test_simple.py
```

---

**Hệ thống AI e-commerce đã được tối ưu hoàn toàn! 🎉**