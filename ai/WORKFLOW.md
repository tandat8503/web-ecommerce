# AI E-commerce System Workflow

## 🔄 **Quy trình hoạt động hiện tại**

### **1. Kiến trúc tổng thể:**
```
User Input → Orchestrator → Agent Selection → MCP Tools → Database → Response
```

### **2. Luồng xử lý chi tiết:**

#### **Bước 1: Nhận input từ user**
```
User gửi message: "Tìm laptop gaming giá dưới 10 triệu"
↓
FastAPI endpoint: POST /chat
↓
ChatRequest: {
  "message": "Tìm laptop gaming giá dưới 10 triệu",
  "user_type": "user",
  "context": {}
}
```

#### **Bước 2: Orchestrator phân tích và chọn agent**
```
OrchestratorAgent.process_request()
↓
Phân tích user_type: "user"
↓
Chọn agent: UserChatbotAgent
↓
Gọi agent.process_request()
```

#### **Bước 3: Agent phân tích intent**
```
UserChatbotAgent._classify_intent()
↓
Phân tích message: "tìm laptop gaming giá dưới 10 triệu"
↓
Keywords: ["tìm", "laptop", "gaming", "giá"]
↓
Intent: "product_search"
```

#### **Bước 4: Agent gọi MCP tools**
```
UserChatbotAgent._call_tools()
↓
Intent: "product_search"
↓
Gọi tool: search_products
↓
MCPToolClient.call_tool("search_products", query="laptop gaming", limit=10)
```

#### **Bước 5: MCP tool xử lý**
```
search_products tool
↓
Kết nối database: get_conn()
↓
Thử vector search trước
↓
Nếu fail → SQL search fallback
↓
Query: SELECT * FROM products WHERE name LIKE '%laptop gaming%'
↓
Trả về: JSON result
```

#### **Bước 6: Agent tạo response**
```
UserChatbotAgent._generate_response()
↓
Sử dụng LLM (Gemini Pro)
↓
Prompt: "User Query: Tìm laptop gaming... Tool Result: {...}"
↓
LLM tạo response tiếng Việt
↓
Trả về: "Tôi tìm thấy 5 laptop gaming phù hợp với ngân sách của bạn..."
```

#### **Bước 7: Trả về kết quả**
```
ChatResponse: {
  "success": true,
  "response": "Tôi tìm thấy 5 laptop gaming...",
  "agent_type": "user_chatbot",
  "data": {...}
}
```

## 🤖 **Các Agent và chức năng**

### **1. UserChatbotAgent**
- **Mục đích**: Tư vấn sản phẩm cho khách hàng
- **Intents**: product_search, price_inquiry, product_comparison
- **Tools**: search_products
- **Database**: products table

### **2. AdminChatbotAgent**
- **Mục đích**: Business intelligence cho admin
- **Intents**: revenue_analysis, sentiment_analysis, report_generation
- **Tools**: get_revenue_analytics, summarize_sentiment_by_product, generate_report
- **Database**: orders, products, comments tables

### **3. SentimentAnalyzerAgent**
- **Mục đích**: Phân tích cảm xúc khách hàng
- **Intents**: sentiment_analysis, sentiment_summary
- **Tools**: analyze_sentiment, summarize_sentiment_by_product
- **Database**: comments, products tables

### **4. BusinessAnalystAgent**
- **Mục đích**: Phân tích KPI và metrics
- **Intents**: revenue_analysis, sales_performance, product_metrics
- **Tools**: get_revenue_analytics, get_sales_performance, get_product_metrics
- **Database**: orders, order_items, products tables

## 🛠️ **7 MCP Tools và xử lý**

### **1. search_products**
```python
# Input: query, limit, min_price, max_price, category
# Process:
1. Kết nối database
2. Thử vector search (ChromaDB)
3. Nếu fail → SQL search
4. Filter theo price, category
5. Trả về JSON result
```

### **2. analyze_sentiment**
```python
# Input: texts, product_id
# Process:
1. Kết nối database
2. Gọi SentimentService.analyze_texts()
3. Tính toán summary statistics
4. Trả về sentiment results
```

### **3. get_revenue_analytics**
```python
# Input: month, year, start_date, end_date
# Process:
1. Kết nối database
2. Gọi AnalystService.get_revenue()
3. Query orders table
4. Tính toán revenue metrics
5. Trả về analytics data
```

## 🗄️ **Database Integration**

### **Tables được sử dụng:**
- `products` - Thông tin sản phẩm
- `orders` - Đơn hàng
- `order_items` - Chi tiết đơn hàng
- `comments` - Bình luận khách hàng
- `customers` - Thông tin khách hàng

### **Connection Handling:**
```python
conn = None
try:
    conn = await get_conn()
    # Database operations
    result = await some_operation(conn)
    return result
except Exception as e:
    logger.error(f"Database error: {e}")
    return error_response
finally:
    if conn:
        await release_conn(conn)
```

## 🧠 **AI Processing**

### **1. Intent Classification**
```python
def _classify_intent(self, user_message: str) -> str:
    message = user_message.lower()
    
    if any(keyword in message for keyword in ["tìm", "search", "mua"]):
        return "product_search"
    elif any(keyword in message for keyword in ["giá", "price"]):
        return "price_inquiry"
    # ... more intents
```

### **2. LLM Integration**
```python
async def _generate_response(self, user_message: str, tool_result: Dict[str, Any], intent: str) -> str:
    prompt = f"""
User Query: {user_message}
Intent: {intent}
Tool Result: {json.dumps(tool_result, indent=2)}

Please provide a helpful response based on the tool results.
"""
    
    result = await self.llm_client.generate_simple(
        prompt=prompt,
        system_instruction=self.system_prompt,
        temperature=0.7
    )
    
    return result.get("content", "I apologize, but I couldn't generate a response.")
```

### **3. Error Handling**
```python
try:
    # Main processing
    result = await process_request()
    return result
except Exception as e:
    logger.error(f"Error: {e}")
    return {
        "success": False,
        "error": str(e),
        "response": "I apologize, but I encountered an error."
    }
```

## 📊 **Ví dụ cụ thể**

### **Scenario 1: User tìm sản phẩm**
```
Input: "Tìm laptop gaming giá dưới 10 triệu"
↓
Orchestrator → UserChatbotAgent
↓
Intent: "product_search"
↓
Tool: search_products(query="laptop gaming", max_price=10000000)
↓
Database: SELECT * FROM products WHERE name LIKE '%laptop gaming%' AND price <= 10000000
↓
LLM: "Tôi tìm thấy 3 laptop gaming phù hợp với ngân sách của bạn..."
↓
Response: "Tôi tìm thấy 3 laptop gaming phù hợp với ngân sách của bạn..."
```

### **Scenario 2: Admin xem báo cáo**
```
Input: "Báo cáo doanh thu tháng 3"
↓
Orchestrator → BusinessAnalystAgent
↓
Intent: "revenue_analysis"
↓
Tool: get_revenue_analytics(month=3, year=2024)
↓
Database: SELECT SUM(total_amount) FROM orders WHERE MONTH(order_date) = 3 AND YEAR(order_date) = 2024
↓
LLM: "Doanh thu tháng 3 là 50,000,000 VND, tăng 15% so với tháng trước..."
↓
Response: "Doanh thu tháng 3 là 50,000,000 VND, tăng 15% so với tháng trước..."
```

## 🎯 **Ưu điểm của hệ thống hiện tại**

1. **Modular**: Mỗi agent có chức năng riêng biệt
2. **Scalable**: Dễ dàng thêm agent/tool mới
3. **Maintainable**: Code clean và dễ maintain
4. **Database-driven**: Lấy data thực từ ecommerce_db
5. **AI-powered**: Sử dụng Gemini Pro cho response generation
6. **Error handling**: Comprehensive error handling
7. **Tracing**: DDTrace integration cho monitoring

## 🚀 **Cách chạy hệ thống**

```bash
# 1. Chạy MCP Server
python mcps/main.py

# 2. Chạy FastAPI App
python app.py

# 3. Test hệ thống
python test_simple.py
```

Hệ thống sẽ chạy trên:
- MCP Server: STDIO protocol
- FastAPI App: http://localhost:8000
- Health check: http://localhost:8000/health
- Chat endpoint: POST http://localhost:8000/chat
