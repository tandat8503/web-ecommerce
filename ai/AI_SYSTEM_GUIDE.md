# 🤖 Web-ecommerce AI System - Hướng dẫn Toàn diện

## 📋 Tổng quan

Hệ thống AI e-commerce được xây dựng theo kiến trúc **ai-native-todo-task-agent** và **ai-native-todo-mcps-server**, sử dụng **Gemini Pro API** để cung cấp các tính năng AI thông minh cho cả phía **Admin** và **User**.

---

## 🏗️ Kiến trúc Hệ thống

```
┌─────────────────────────────────────────────────────────────┐
│                     FastAPI Application                      │
│                    (app.py - Port 8000)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    OrchestratorAgent                         │
│              (Điều phối và chọn agent phù hợp)               │
└─────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
    ┌───────────────┐ ┌───────────────┐ ┌────────────────┐
    │ User Agents   │ │ Admin Agents  │ │ Utility Agents │
    └───────────────┘ └───────────────┘ └────────────────┘
            │                 │                 │
            ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                        MCP Tools (8 tools)                   │
│                    (mcps/main.py - STDIO)                    │
└─────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│              Services (Business Logic Layer)                 │
│  • ProductSearchService   • ModerationService               │
│  • SentimentService      • ReportGeneratorService           │
│  • AnalystService                                            │
└─────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│                    MySQL Database (Prisma)                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🤖 Các AI Agents (6 Agents)

### 1. **UserChatbotAgent** 👤
**Mục đích**: Tư vấn sản phẩm cho khách hàng

**Khả năng**:
- Tìm kiếm và gợi ý sản phẩm
- So sánh giá và thông tin sản phẩm
- Tư vấn mua hàng thông minh

**MCP Tools sử dụng**:
- `search_products`

**Ví dụ câu hỏi**:
- "Tìm laptop gaming giá dưới 20 triệu"
- "So sánh ghế gaming và ghế văn phòng"
- "Sản phẩm nào đang bán chạy nhất?"

---

### 2. **AdminChatbotAgent** 👨‍💼
**Mục đích**: Hỗ trợ quản trị viên với thông tin kinh doanh tổng quát

**Khả năng**:
- Tổng hợp dữ liệu kinh doanh
- Trả lời câu hỏi tổng quát
- Điều phối các agent khác

**MCP Tools sử dụng**:
- `get_revenue_analytics`
- `summarize_sentiment_by_product`
- `generate_report`

---

### 3. **SentimentAnalyzerAgent** 😊😢
**Mục đích**: Phân tích cảm xúc khách hàng từ comments/reviews

**Khả năng**:
- Phân tích sentiment (positive, negative, neutral)
- Tóm tắt sentiment theo sản phẩm
- Trích xuất insights từ feedback

**MCP Tools sử dụng**:
- `analyze_sentiment`
- `summarize_sentiment_by_product`

**Ví dụ câu hỏi**:
- "Phân tích cảm xúc khách hàng về sản phẩm ID 123"
- "Tóm tắt đánh giá tất cả sản phẩm"

---

### 4. **BusinessAnalystAgent** 📊
**Mục đích**: Phân tích KPI và metrics kinh doanh

**Khả năng**:
- Phân tích doanh thu
- Tính toán KPI
- Đánh giá hiệu suất sản phẩm
- Phân tích xu hướng

**MCP Tools sử dụng**:
- `get_revenue_analytics`
- `get_sales_performance`
- `get_product_metrics`

**Ví dụ câu hỏi**:
- "Doanh thu tháng 11 như thế nào?"
- "Top 10 sản phẩm bán chạy nhất"
- "KPI hiện tại đạt được bao nhiêu?"

---

### 5. **ReportGeneratorAgent** 📝 ⭐ MỚI
**Mục đích**: Tạo báo cáo HTML visual với AI insights

**Khả năng**:
- Tạo báo cáo sentiment (cảm xúc khách hàng)
- Tạo báo cáo revenue (doanh thu)
- Tạo báo cáo product (hiệu suất sản phẩm)
- Tạo báo cáo customer (khách hàng)
- Tự động tạo biểu đồ Chart.js
- AI insights và recommendations

**MCP Tools sử dụng**:
- `generate_html_report`
- `get_revenue_analytics`
- `summarize_sentiment_by_product`
- `get_product_metrics`

**Tính năng báo cáo**:
✅ Executive summary (AI-generated)  
✅ Interactive Chart.js visualizations  
✅ Key insights (3-5 bullet points)  
✅ Action recommendations (3-5 bullet points)  
✅ Responsive HTML với CSS đẹp  
✅ Print-friendly format  

**Ví dụ câu hỏi**:
- "Xuất báo cáo phân tích cảm xúc khách hàng"
- "Tạo báo cáo doanh thu tháng 11"
- "Xuất báo cáo hiệu suất sản phẩm"

---

### 6. **ContentModerationAgent** 🛡️ ⭐ MỚI
**Mục đích**: Kiểm duyệt nội dung do người dùng tạo

**Khả năng**:
- Phát hiện ngôn từ thô tục (tiếng Việt + English)
- Nhận diện spam và quảng cáo
- Phát hiện tấn công cá nhân/harassment
- Đánh giá mức độ vi phạm
- Đề xuất hành động (approve/review/reject)

**MCP Tools sử dụng**:
- `moderate_content`

**Loại vi phạm kiểm tra**:
- `profanity` - Ngôn từ thô tục
- `spam` - Spam, quảng cáo
- `harassment` - Tấn công cá nhân
- `irrelevant` - Không liên quan
- `hate_speech` - Ngôn từ thù ghét
- `sexual_content` - Nội dung khiêu dâm
- `violence` - Bạo lực

**Response Format**:
```json
{
  "success": true,
  "is_appropriate": false,
  "violations": ["profanity", "harassment"],
  "severity": "high",
  "confidence": 0.95,
  "suggested_action": "reject",
  "explanation": "Phát hiện ngôn từ thô tục và tấn công cá nhân"
}
```

---

## 🛠️ MCP Tools (8 Tools)

### 1. **search_products** 🔍
Tìm kiếm sản phẩm trong database

**Parameters**:
- `query` (str): Từ khóa tìm kiếm
- `limit` (int): Số lượng kết quả (default: 10)
- `min_price` (float): Giá tối thiểu
- `max_price` (float): Giá tối đa
- `category` (str): Danh mục

---

### 2. **analyze_sentiment** 😊
Phân tích cảm xúc từ texts

**Parameters**:
- `texts` (List[str]): Danh sách texts cần phân tích
- `product_id` (int, optional): ID sản phẩm liên quan

**Returns**: JSON với sentiment classification

---

### 3. **summarize_sentiment_by_product** 📋
Tóm tắt sentiment theo sản phẩm

**Parameters**:
- `product_id` (int, optional): ID sản phẩm cụ thể

---

### 4. **get_revenue_analytics** 💰
Lấy phân tích doanh thu

**Parameters**:
- `month` (int): Tháng
- `year` (int): Năm
- `start_date` (str): Ngày bắt đầu
- `end_date` (str): Ngày kết thúc

---

### 5. **get_sales_performance** 📈
Lấy metrics hiệu suất bán hàng

**Parameters**:
- `days` (int): Số ngày gần đây (default: 30)

---

### 6. **get_product_metrics** 📊
Lấy metrics hiệu suất sản phẩm

**Parameters**:
- `limit` (int): Số lượng sản phẩm (default: 20)

---

### 7. **generate_report** 📄
Tạo báo cáo tổng hợp

**Parameters**:
- `report_type` (str): Loại báo cáo
- `start_date` (str): Ngày bắt đầu
- `end_date` (str): Ngày kết thúc

---

### 8. **generate_html_report** 🎨 ⭐ MỚI
Tạo báo cáo HTML visual với AI insights

**Parameters**:
- `report_type` (str): "sentiment", "revenue", "product", "customer", "business"
- `data` (str): JSON string chứa dữ liệu báo cáo
- `title` (str, optional): Tiêu đề tùy chỉnh
- `period` (str, optional): Mô tả thời gian (vd: "Tháng 11/2024")

**Returns**:
```json
{
  "success": true,
  "html": "<html>...</html>",
  "summary": "Tóm tắt điều hành",
  "insights": ["Insight 1", "Insight 2", ...],
  "recommendations": ["Recommendation 1", ...],
  "charts_data": {...},
  "generated_at": "2024-11-17T..."
}
```

---

### 9. **moderate_content** 🛡️ ⭐ MỚI
Kiểm duyệt nội dung do người dùng tạo

**Parameters**:
- `content` (str): Nội dung cần kiểm duyệt
- `content_type` (str): "comment", "review", "chat" (default: "comment")
- `product_id` (int, optional): ID sản phẩm liên quan
- `user_id` (int, optional): ID người dùng

**Returns**:
```json
{
  "success": true,
  "is_appropriate": false,
  "violations": ["profanity"],
  "severity": "high",
  "confidence": 0.95,
  "suggested_action": "reject",
  "explanation": "Phát hiện ngôn từ thô tục",
  "moderated_content": "..."
}
```

---

## 🌐 API Endpoints

### **POST /chat**
Main chat endpoint cho cả user và admin

**Request**:
```json
{
  "message": "Tìm laptop gaming giá dưới 20 triệu",
  "user_type": "user",
  "context": {}
}
```

**Response**:
```json
{
  "success": true,
  "response": "Tôi tìm thấy 5 laptop gaming phù hợp...",
  "agent_type": "user_chatbot",
  "data": {...}
}
```

---

### **POST /moderate** ⭐ MỚI
Content moderation endpoint

**Request**:
```json
{
  "content": "Bình luận của người dùng",
  "content_type": "comment",
  "product_id": 123,
  "user_id": 456
}
```

**Response**:
```json
{
  "success": true,
  "is_appropriate": true,
  "violations": [],
  "severity": "low",
  "confidence": 0.95,
  "suggested_action": "approve",
  "explanation": "Nội dung phù hợp",
  "moderated_content": "..."
}
```

---

### **GET /health**
Health check endpoint

---

### **GET /agents**
Liệt kê tất cả agents và capabilities

---

### **GET /tools**
Liệt kê tất cả MCP tools

---

## 🚀 Cách sử dụng

### **1. Setup Environment**

```bash
cd ai
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### **2. Cấu hình .env**

```env
GEMINI_API_KEY=your_gemini_pro_api_key_here
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=web_ecommerce
```

### **3. Chạy AI System**

```bash
python app.py
```

Server sẽ chạy tại: `http://localhost:8000`

---

## 💡 Use Cases Thực tế

### **Admin Side:**

#### 1. **Tạo báo cáo HTML visual** ⭐ MỚI
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Xuất báo cáo phân tích cảm xúc khách hàng",
    "user_type": "admin",
    "context": {
      "period": "Tháng 11/2024"
    }
  }'
```

Response sẽ bao gồm:
- HTML report đầy đủ với CSS đẹp
- Interactive Chart.js visualizations
- AI-generated summary, insights, recommendations
- Print-friendly format

#### 2. **Phân tích doanh thu**
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Doanh thu tháng 11 như thế nào?",
    "user_type": "admin"
  }'
```

#### 3. **Phân tích sentiment**
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Phân tích cảm xúc khách hàng về sản phẩm",
    "user_type": "admin"
  }'
```

---

### **User Side:**

#### 1. **Tìm kiếm sản phẩm**
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tìm ghế gaming giá dưới 5 triệu",
    "user_type": "user"
  }'
```

#### 2. **Kiểm duyệt comment** ⭐ MỚI
```bash
curl -X POST http://localhost:8000/moderate \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Sản phẩm rất tốt, tôi rất hài lòng!",
    "content_type": "comment",
    "product_id": 17,
    "user_id": 1
  }'
```

---

## 🔧 Tech Stack

- **Backend**: FastAPI (Python 3.10+)
- **LLM**: Gemini Pro API
- **Database**: MySQL (via Prisma)
- **MCP**: FastMCP (STDIO Protocol)
- **Tracing**: Datadog (ddtrace)
- **AI Architecture**: ai-native-todo-task-agent pattern

---

## 📂 Cấu trúc Thư mục

```
ai/
├── app.py                      # FastAPI main app
├── agents.py                   # 6 AI Agents (User, Admin, Sentiment, Business, Report, Moderation)
├── prompts.py                  # English prompts cho LLM
├── mcps/
│   └── main.py                 # 8 MCP tools (STDIO)
├── services/
│   ├── chatbot/                # Product search service
│   ├── sentiment/              # Sentiment analysis service
│   ├── analyst/                # Business analytics service
│   ├── moderation/             # ⭐ Content moderation service
│   └── report/                 # ⭐ HTML report generation service
├── core/
│   ├── config.py               # Configuration
│   ├── db.py                   # Database connection pool
│   ├── logging.py              # Logging setup
│   ├── exceptions.py           # Exception handling
│   └── utils.py                # Utility functions
└── shared/
    ├── llm_client.py           # Gemini Pro client factory
    └── models.py               # Pydantic models
```

---

## 🎯 Mục tiêu Đã Đạt Được

### **Phase 1: Core Enhancements** ✅
- [x] ContentModerationAgent + moderate_content MCP tool
- [x] ReportGeneratorAgent + generate_html_report MCP tool
- [x] HTML report templates với Chart.js
- [ ] Tối ưu Gemini Pro client với function calling
- [ ] Thêm Task Planner cho complex workflows

### **Phase 2: Advanced Features**
- [ ] SmartSearchAgent (optional - nice to have)
- [ ] Tích hợp moderation vào comment system

### **Phase 3: Testing & Documentation**
- [ ] Unit tests
- [ ] Integration tests
- [ ] API documentation (Swagger)
- [x] User guides

---

## 🔮 Next Steps

1. **Tích hợp Content Moderation vào Backend**
   - Thêm API call đến `/moderate` trong `backend/controller/productCommentController.js`
   - Auto-moderate comments trước khi lưu vào DB

2. **Tối ưu Gemini Pro Client**
   - Implement function calling
   - Cache responses
   - Retry logic

3. **Task Planner Implementation**
   - Break complex workflows thành steps
   - Sequential execution với error handling

4. **Testing & Deployment**
   - Write comprehensive tests
   - Deploy to production
   - Monitor performance

---

## 📞 Liên hệ & Hỗ trợ

- **Graduation Thesis**: Kỹ sư Công nghệ Thông tin - Lập trình Web
- **AI System**: Powered by Gemini Pro
- **Architecture**: ai-native-todo-task-agent pattern

---

**🎓 Hệ thống AI e-commerce hoàn chỉnh cho luận văn tốt nghiệp đại học!**

