# 🧠 AI System - Workflow và Structure Guide

## 📋 Mục lục

1. [Tổng quan](#tổng-quan)
2. [Cấu trúc thư mục](#cấu-trúc-thư-mục)
3. [Architecture Overview](#architecture-overview)
4. [Agents và Workflow](#agents-và-workflow)
5. [MCP Tools](#mcp-tools)
6. [Services](#services)
7. [Report Generation Flow](#report-generation-flow)
8. [Frontend Integration](#frontend-integration)
9. [API Endpoints](#api-endpoints)
10. [Database Integration](#database-integration)
11. [Configuration](#configuration)

---

## 🎯 Tổng quan

Hệ thống AI e-commerce được thiết kế theo mô hình **Multi-Agent System** với **Orchestrator Pattern**, sử dụng **MCP (Model Context Protocol)** tools để tương tác với database và các services. Hệ thống hỗ trợ:

- **User Side**: Product consultation, search assistance
- **Admin Side**: Business intelligence, analytics, report generation
- **Content Moderation**: AI-powered comment filtering
- **Report Generation**: HTML reports với detailed progress tracking

### Công nghệ chính:
- **LLM**: Gemini Pro (Gemini 1.5 Pro)
- **Backend**: FastAPI (Python)
- **Database**: MySQL (aiomysql connection pool)
- **Frontend**: React + Ant Design
- **Real-time**: Server-Sent Events (SSE) cho progress tracking

---

## 📁 Cấu trúc thư mục

```
ai/
├── __init__.py
├── agents.py                    # Tất cả agents (BaseAgent, OrchestratorAgent, etc.)
├── prompts.py                   # System prompts cho từng agent
├── app.py                       # FastAPI main application
├── requirements.txt             # Python dependencies
│
├── core/                        # Core utilities
│   ├── config.py               # Configuration management (DB, LLM, App)
│   ├── db.py                   # Database connection pool
│   ├── exceptions.py           # Custom exceptions
│   ├── logging.py              # Logging setup
│   └── utils.py                # Utility functions
│
├── mcps/                        # MCP Tools (Model Context Protocol)
│   ├── __init__.py
│   └── main.py                 # 9 MCP tools (search, sentiment, revenue, etc.)
│
├── services/                    # Business logic services
│   ├── analyst/                # Revenue & business analytics
│   │   └── service.py
│   ├── sentiment/              # Sentiment analysis
│   │   └── service.py
│   ├── moderation/             # Content moderation
│   │   ├── __init__.py
│   │   └── service.py
│   ├── report/                 # Report generation
│   │   ├── __init__.py
│   │   ├── service.py          # ReportGeneratorService
│   │   ├── progress_tracker.py # Progress tracking
│   │   ├── storage.py          # Report storage
│   │   └── templates/          # HTML templates
│   │       ├── base.html
│   │       ├── sentiment.html
│   │       ├── revenue.html
│   │       ├── product.html
│   │       └── business.html
│   └── chatbot/                # Chatbot utilities
│       └── search.py
│
└── shared/                      # Shared utilities
    ├── __init__.py
    ├── llm_client.py           # LLM client factory (Gemini Pro)
    └── models.py               # Pydantic models
```

---

## 🏗️ Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ UserChatWidget│  │AdminChatWidget│  │Comment Form  │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
└─────────┼──────────────────┼──────────────────┼────────────┘
          │                  │                  │
          │ HTTP/SSE         │ HTTP/SSE         │ HTTP
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼────────────┐
│              FastAPI Backend (app.py)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         OrchestratorAgent                            │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │  │
│  │  │UserChatbot│  │AdminChat │  │Sentiment │           │  │
│  │  │  Agent   │  │  Agent   │  │ Analyzer │            │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘            │  │
│  │       │             │              │                 │  │
│  │  ┌────▼─────────────▼──────────────▼─────┐           │  │
│  │  │      MCPToolClient                    │           │  │
│  │  │  ┌──────────────────────────────────┐ │           │  │
│  │  │  │  MCP Tools (mcps/main.py)        │ │           │  │
│  │  │  │  • search_products               │ │           │  │
│  │  │  │  • analyze_sentiment             │ │           │  │
│  │  │  │  • get_revenue_analytics         │ │           │  │
│  │  │  │  • generate_html_report          │ │           │  │
│  │  │  │  • moderate_content              │ │           │  │
│  │  │  └──────────────────────────────────┘ │           │  │
│  │  └───────────────────────────────────────┘           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Services Layer                          │  │
│  │  • ReportGeneratorService                            │  │
│  │  • ModerationService                                 │  │
│  │  • SentimentService                                  │  │
│  │  • AnalystService                                    │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
          │
          │ aiomysql connection pool
          │
┌─────────▼─────────────────────────────────────────────────┐
│              MySQL Database (ecommerce_db)                 │
│  • products, orders, order_items                          │
│  • product_comments, users                                │
└────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Request** → Frontend (React)
2. **HTTP Request** → FastAPI Backend (`/chat` endpoint)
3. **OrchestratorAgent** → Phân tích intent → Chọn agent phù hợp
4. **Selected Agent** → Classify intent → Call MCP tools
5. **MCP Tools** → Query database → Return JSON
6. **Agent** → Generate response với LLM (Gemini Pro)
7. **Response** → Frontend → Hiển thị cho user

---

## 🤖 Agents và Workflow

### 1. BaseAgent (Abstract Class)

**Location**: `ai/agents.py`

**Responsibilities**:
- Base class cho tất cả agents
- Quản lý LLM client và MCP tool client
- Template method pattern: `process_request()` → `_classify_intent()` → `_call_tools()` → `_generate_response()`

**Workflow**:
```python
async def process_request(user_message, context):
    1. Classify intent (_classify_intent)
    2. Call appropriate tools (_call_tools)
    3. Generate response với LLM (_generate_response)
    4. Return structured result
```

### 2. OrchestratorAgent

**Location**: `ai/agents.py`

**Responsibilities**:
- Điều phối tất cả sub-agents
- Phân tích user request → Chọn agent phù hợp
- Tổng hợp kết quả từ sub-agents

**Sub-agents**:
- `user_chatbot`: UserChatbotAgent
- `admin_chatbot`: AdminChatbotAgent
- `sentiment_analyzer`: SentimentAnalyzerAgent
- `business_analyst`: BusinessAnalystAgent
- `report_generator`: ReportGeneratorAgent
- `content_moderation`: ContentModerationAgent

**Workflow**:
```
User Request
    ↓
OrchestratorAgent._select_agent()
    ↓
Selected Agent.process_request()
    ↓
Agent calls MCP tools
    ↓
Agent generates response
    ↓
OrchestratorAgent returns result
```

### 3. UserChatbotAgent

**Purpose**: Tư vấn sản phẩm cho khách hàng

**MCP Tools**:
- `search_products`: Tìm kiếm sản phẩm

**Intents**:
- `product_search`: Tìm sản phẩm
- `product_inquiry`: Hỏi thông tin sản phẩm
- `price_inquiry`: Hỏi giá

**Workflow**:
```
User: "Tìm áo thun"
    ↓
Intent: product_search
    ↓
Call: search_products(query="áo thun")
    ↓
LLM generates friendly response với product list
```

### 4. AdminChatbotAgent

**Purpose**: Business intelligence cho admin

**MCP Tools**:
- `get_revenue_analytics`: Phân tích doanh thu
- `get_sales_performance`: Hiệu suất bán hàng
- `get_product_metrics`: Metrics sản phẩm
- `summarize_sentiment_by_product`: Tóm tắt sentiment

**Intents**:
- `revenue_analysis`: Phân tích doanh thu
- `sales_performance`: Hiệu suất bán hàng
- `product_metrics`: Metrics sản phẩm
- `sentiment_summary`: Tóm tắt sentiment

**Workflow**:
```
Admin: "Phân tích doanh thu tháng này"
    ↓
Intent: revenue_analysis
    ↓
Call: get_revenue_analytics(month=current_month)
    ↓
LLM generates business insights
```

### 5. SentimentAnalyzerAgent

**Purpose**: Phân tích cảm xúc khách hàng

**MCP Tools**:
- `analyze_sentiment`: Phân tích sentiment của text
- `summarize_sentiment_by_product`: Tóm tắt theo sản phẩm

**Intents**:
- `analyze_sentiment`: Phân tích sentiment
- `summarize_sentiment`: Tóm tắt sentiment

**Workflow**:
```
Request: "Phân tích đánh giá sản phẩm X"
    ↓
Call: summarize_sentiment_by_product(product_id=X)
    ↓
LLM generates sentiment insights
```

### 6. BusinessAnalystAgent

**Purpose**: Phân tích KPI và business metrics

**MCP Tools**:
- `get_revenue_analytics`: Doanh thu
- `get_sales_performance`: Hiệu suất bán hàng
- `get_product_metrics`: Metrics sản phẩm

**Intents**:
- `revenue_analysis`: Phân tích doanh thu
- `sales_performance`: Hiệu suất bán hàng
- `product_metrics`: Metrics sản phẩm

### 7. ReportGeneratorAgent

**Purpose**: Tạo HTML reports với progress tracking

**MCP Tools**:
- `generate_html_report`: Generate HTML report

**Intents**:
- `generate_sentiment_report`: Báo cáo sentiment
- `generate_revenue_report`: Báo cáo doanh thu
- `generate_product_report`: Báo cáo sản phẩm
- `generate_customer_report`: Báo cáo khách hàng
- `generate_business_report`: Báo cáo kinh doanh tổng hợp

**Workflow** (chi tiết ở section Report Generation Flow):
```
Admin: "Xuất báo cáo sentiment"
    ↓
Fetch data từ database
    ↓
Generate HTML report với progress tracking
    ↓
Save report → Return report URL
```

### 8. ContentModerationAgent

**Purpose**: Kiểm duyệt nội dung comment

**MCP Tools**:
- `moderate_content`: Kiểm duyệt content

**Intents**:
- `moderate_content`: Luôn luôn moderate

**Workflow**:
```
Comment submitted
    ↓
Call: moderate_content(content=comment_text)
    ↓
AI analyzes: appropriate/inappropriate
    ↓
Return: decision + explanation
```

---

## 🔧 MCP Tools

**Location**: `ai/mcps/main.py`

MCP (Model Context Protocol) Tools là standardized interface để agents tương tác với database và services.

### 1. search_products
```python
@mcp.tool(description="Search for products in the database")
async def search_products(
    query: str,
    limit: int = 10,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    category: Optional[str] = None
) -> str:
    # Full-text search với MySQL BOOLEAN MODE
    # Return JSON: {success, products: [...]}
```

### 2. analyze_sentiment
```python
@mcp.tool(description="Analyze sentiment of customer feedback")
async def analyze_sentiment(
    texts: List[str],
    product_id: Optional[int] = None
) -> str:
    # Sử dụng SentimentService
    # Return JSON: {success, sentiments: [...]}
```

### 3. summarize_sentiment_by_product
```python
@mcp.tool(description="Summarize sentiment analysis by product")
async def summarize_sentiment_by_product(
    product_id: Optional[int] = None
) -> str:
    # Query product_comments table
    # Return JSON: {success, summary: {...}}
```

### 4. get_revenue_analytics
```python
@mcp.tool(description="Get revenue analytics for specified period")
async def get_revenue_analytics(
    month: Optional[int] = None,
    year: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> str:
    # Query orders table
    # Return JSON: {success, revenue: [...]}
```

### 5. get_sales_performance
```python
@mcp.tool(description="Get sales performance metrics")
async def get_sales_performance(days: int = 30) -> str:
    # Query orders + order_items
    # Return JSON: {success, performance: {...}}
```

### 6. get_product_metrics
```python
@mcp.tool(description="Get product performance metrics")
async def get_product_metrics(limit: int = 20) -> str:
    # Query products + order_items
    # Return JSON: {success, products: [...]}
```

### 7. generate_report
```python
@mcp.tool(description="Generate comprehensive business report")
async def generate_report(
    report_type: str = "summary",
    month: Optional[int] = None,
    year: Optional[int] = None,
    include_sentiment: bool = True,
    include_revenue: bool = True
) -> str:
    # Combine multiple data sources
    # Return JSON: {success, report_data: {...}}
```

### 8. generate_html_report
```python
@mcp.tool(description="Generate HTML visual report with AI insights")
async def generate_html_report(
    report_type: str,
    data: Dict[str, Any],
    title: Optional[str] = None,
    period: Optional[str] = None
) -> str:
    # Sử dụng ReportGeneratorService
    # Return JSON: {success, html: "...", ...}
```

### 9. moderate_content
```python
@mcp.tool(description="Moderate content for inappropriate language")
async def moderate_content(
    content: str,
    content_type: str = "comment",
    product_id: Optional[int] = None,
    user_id: Optional[int] = None
) -> str:
    # Sử dụng ModerationService
    # Return JSON: {success, is_appropriate: bool, ...}
```

---

## 🛠️ Services

### 1. ReportGeneratorService

**Location**: `ai/services/report/service.py`

**Responsibilities**:
- Generate HTML reports với AI insights
- Template-based report generation
- Context optimization (chỉ gửi summary data cho LLM)

**Key Methods**:
```python
async def generate_html_report(
    report_type: str,
    data: Dict[str, Any],
    title: Optional[str] = None,
    period: Optional[str] = None,
    progress_tracker: Optional[ReportProgressTracker] = None
) -> Dict[str, Any]:
    # 1. Extract data sources
    # 2. Calculate metrics
    # 3. AI analysis (với condensed data)
    # 4. Generate HTML từ template
    # 5. Return HTML + metadata
```

**Report Types**:
- `sentiment`: Phân tích cảm xúc
- `revenue`: Doanh thu
- `product`: Hiệu suất sản phẩm
- `customer`: Khách hàng
- `business`: Kinh doanh tổng hợp

**Templates**:
- `base.html`: Base template
- `sentiment.html`: Green theme
- `revenue.html`: Blue theme
- `product.html`: Purple theme
- `business.html`: Multi-color gradient

### 2. ModerationService

**Location**: `ai/services/moderation/service.py`

**Responsibilities**:
- AI-powered content moderation
- Detect: profanity, spam, harassment, irrelevant content

**Key Methods**:
```python
async def moderate_content(
    content: str,
    content_type: str = "comment"
) -> Dict[str, Any]:
    # 1. LLM analysis (Gemini Pro)
    # 2. Rule-based fallback
    # 3. Return: is_appropriate, violations, severity
```

### 3. SentimentService

**Location**: `ai/services/sentiment/service.py`

**Responsibilities**:
- Analyze sentiment của customer feedback
- Summarize sentiment by product

### 4. AnalystService

**Location**: `ai/services/analyst/service.py`

**Responsibilities**:
- Revenue analytics
- Sales performance
- Product metrics

---

## 📊 Report Generation Flow

### Detailed Workflow với Progress Tracking

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Admin Request: "Xuất báo cáo sentiment"                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. AdminChatWidget detects report request                   │
│    → extractReportType() → "sentiment"                      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Frontend: aiChatbotAPI.generateReport()                  │
│    → POST /api/ai/reports/generate                          │
│    → SSE connection established                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Backend: generate_report_stream()                        │
│    → Create ReportProgressTracker                           │
│    → Start SSE streaming                                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Thu thập dữ liệu (0%)                              │
│    → ReportGeneratorAgent._fetch_report_data()             │
│    → Query: product_comments table                          │
│    → Extract data sources:                                  │
│      • Đánh giá khách hàng: 150 items                      │
│      • Top sản phẩm: 10 items                               │
│    → Emit progress: {step: 1, details: {...}}              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Tính toán số liệu (25%)                            │
│    → ReportGeneratorService._prepare_data()                │
│    → Calculations:                                          │
│      • Phân bổ cảm xúc: positive=80, negative=20, ...      │
│      • Tính phần trăm: positive=53.3%, ...                │
│    → Formulas:                                             │
│      • Positive: 80 đánh giá = 150 × 53.3%                 │
│    → Emit progress: {step: 2, details: {...}}              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: AI Phân tích (50%)                                  │
│    → ReportGeneratorService._generate_ai_analysis()          │
│    → Prepare condensed data summary (chỉ statistics)      │
│    → LLM Call (Gemini Pro):                                 │
│      • Model: gemini-1.5-pro                                │
│      • Prompt: Analyze statistics...                        │
│      • Processing time: 1.2s                               │
│    → Output:                                                │
│      • Summary: "Tổng quan về sentiment..."                │
│      • Insights: 5 items                                    │
│      • Recommendations: 4 items                             │
│    → Emit progress: {step: 3, details: {...}}             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Tạo báo cáo HTML (75%)                             │
│    → ReportGeneratorService._generate_html()                │
│    → Load template: sentiment.html                          │
│    → Generate components:                                  │
│      • 1 Doughnut chart                                    │
│      • 4 metric cards                                       │
│      • 5 insights                                           │
│      • 4 recommendations                                    │
│    → Fill template với data                                │
│    → Generate Chart.js scripts                             │
│    → Emit progress: {step: 4, details: {...}}             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Hoàn thành (100%)                                  │
│    → ReportStorage.save_report()                           │
│    → Save HTML file: reports/{report_id}.html              │
│    → Save metadata: reports/metadata.json                  │
│    → Emit progress: {step: 5, details: {...}}             │
│      • report_id: "uuid"                                    │
│      • report_url: "/api/ai/reports/{id}"                   │
│      • file_size: 245KB                                     │
│      • total_time: 3.5s                                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Frontend: ReportProgressCard hiển thị progress          │
│    → Collapsible panels cho từng step                      │
│    → Chi tiết: data sources, calculations, AI analysis     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. Frontend: ReportCard hiển thị completed report         │
│    → View button → Open report in new tab                  │
│    → Download button → Download HTML file                   │
└─────────────────────────────────────────────────────────────┘
```

### Progress Tracking Details

**ReportProgressTracker** (`ai/services/report/progress_tracker.py`):
- Track tất cả progress events
- Emit qua SSE với detailed information
- Steps:
  1. `COLLECTING_DATA`: Data sources, counts
  2. `CALCULATING`: Calculations, formulas, inputs/outputs
  3. `AI_ANALYZING`: Model, prompt preview, processing time
  4. `GENERATING_HTML`: Template, charts, metrics, components
  5. `COMPLETED`: Report ID, URL, file size, total time

---

## 🎨 Frontend Integration

### 1. AdminChatWidget

**Location**: `frontend/src/pages/admin/chatbox/AdminChatWidget.jsx`

**Features**:
- Auto-detect report generation requests
- Real-time progress display
- Report card với view/download

**Workflow**:
```javascript
User types: "Xuất báo cáo sentiment"
    ↓
isReportRequest() → true
    ↓
extractReportType() → "sentiment"
    ↓
handleGenerateReport()
    ↓
aiChatbotAPI.generateReport(params, onProgress)
    ↓
SSE events → Update reportProgress state
    ↓
ReportProgressCard displays progress
    ↓
On completion → ReportCard displays report
```

### 2. ReportProgressCard

**Location**: `frontend/src/components/reports/ReportProgressCard.jsx`

**Features**:
- Progress bar với percentage
- Collapsible panels cho từng step
- Detailed information:
  - Step 1: Data sources list
  - Step 2: Calculations với inputs/outputs, formulas
  - Step 3: AI model, prompt preview, processing time
  - Step 4: Template, charts, metrics, components
  - Step 5: Report info, file size, total time

### 3. ReportCard

**Location**: `frontend/src/components/reports/ReportCard.jsx`

**Features**:
- Display completed report info
- View button: Open report in new tab
- Download button: Download HTML file

### 4. API Client

**Location**: `frontend/src/api/aiChatbotAPI.js`

**Methods**:
```javascript
// Generate report với SSE progress
generateReport(params, onProgress)

// Get report by ID
getReport(reportId)

// Download report
downloadReport(reportId)

// List reports
listReports(reportType, limit)
```

---

## 🌐 API Endpoints

### 1. Chat Endpoint

**POST** `/chat`

**Request**:
```json
{
  "message": "Tìm áo thun",
  "user_type": "user",
  "context": {}
}
```

**Response**:
```json
{
  "success": true,
  "response": "Tôi tìm thấy 10 sản phẩm...",
  "agent_type": "user_chatbot",
  "data": {...}
}
```

### 2. Report Generation (SSE)

**POST** `/api/ai/reports/generate`

**Request**:
```json
{
  "report_type": "sentiment",
  "period": "Tháng hiện tại",
  "title": "Báo cáo Sentiment"
}
```

**Response**: Server-Sent Events stream
```
data: {"step": 1, "step_name": "COLLECTING_DATA", "percentage": 0, ...}
data: {"step": 2, "step_name": "CALCULATING", "percentage": 25, ...}
data: {"step": 3, "step_name": "AI_ANALYZING", "percentage": 50, ...}
data: {"step": 4, "step_name": "GENERATING_HTML", "percentage": 75, ...}
data: {"step": 5, "step_name": "COMPLETED", "percentage": 100, ...}
```

### 3. Get Report

**GET** `/api/ai/reports/{report_id}`

**Response**: HTML content

### 4. Download Report

**GET** `/api/ai/reports/{report_id}/download`

**Response**: HTML file download

### 5. List Reports

**GET** `/api/ai/reports?report_type=sentiment&limit=50`

**Response**:
```json
{
  "reports": [...],
  "total": 10
}
```

### 6. Content Moderation

**POST** `/moderate`

**Request**:
```json
{
  "content": "Sản phẩm rất tốt!",
  "content_type": "comment",
  "product_id": 123
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
  "explanation": "Nội dung phù hợp",
  "moderated_content": "Sản phẩm rất tốt!"
}
```

---

## 💾 Database Integration

### Connection Pool

**Location**: `ai/core/db.py`

**Features**:
- `aiomysql` connection pool
- Min/Max connections configurable
- Automatic connection management

**Usage**:
```python
conn = await get_conn()
try:
    # Database operations
    async with conn.cursor() as cur:
        await cur.execute("SELECT ...")
        rows = await cur.fetchall()
finally:
    await release_conn(conn)
```

### Tables Used

1. **products**: Product information
2. **orders**: Order data
3. **order_items**: Order line items
4. **product_comments**: Customer comments/reviews
5. **users**: User information

### Query Patterns

**Full-Text Search**:
```sql
SELECT *, MATCH(name, description) AGAINST('query' IN BOOLEAN MODE) as relevance
FROM products
WHERE MATCH(name, description) AGAINST('query' IN BOOLEAN MODE)
ORDER BY relevance DESC
```

**Revenue Analytics**:
```sql
SELECT DATE_FORMAT(order_date, '%Y-%m') as period, SUM(total_amount) as revenue
FROM orders
WHERE YEAR(order_date) = ? AND MONTH(order_date) = ?
GROUP BY period
```

**Sentiment Analysis**:
```sql
SELECT product_id, COUNT(*) as total,
       SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as positive
FROM product_comments
WHERE product_id = ?
GROUP BY product_id
```

---

## ⚙️ Configuration

### Environment Variables

**Location**: `ai/.env` (copy from `env.example`)

```bash
# Database
DB_MYSQL_HOST=localhost
DB_MYSQL_PORT=3306
DB_MYSQL_USER=root
DB_MYSQL_PASSWORD=your_password
DB_MYSQL_DATABASE=ecommerce_db
DB_POOL_MIN=1
DB_POOL_MAX=10

# LLM (Gemini Pro)
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-pro
LLM_MAX_TOKENS=800
LLM_TEMPERATURE=0.6

# App
APP_ENV=local
APP_BASE_URL=http://localhost:8000
```

### Configuration Management

**Location**: `ai/core/config.py`

**Classes**:
- `DBConfig`: Database configuration
- `LLMConfig`: LLM configuration
- `AppConfig`: Application configuration

**Usage**:
```python
from core.config import get_db_config, get_llm_config

db_config = get_db_config()
llm_config = get_llm_config()
```

---

## 🚀 Running the System

### 1. Backend Setup

```bash
cd ai
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp env.example .env
# Edit .env with your credentials
python app.py
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 3. Test Endpoints

```bash
# Health check
curl http://localhost:8000/health

# Chat
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Tìm áo thun", "user_type": "user"}'

# Generate report (SSE)
curl -X POST http://localhost:8000/api/ai/reports/generate \
  -H "Content-Type: application/json" \
  -d '{"report_type": "sentiment"}' \
  --no-buffer
```

---

## 📝 Best Practices

1. **Database Connections**: Luôn sử dụng `get_conn()` và `release_conn()`
2. **Error Handling**: Wrap operations trong try-except
3. **Logging**: Sử dụng `logger` từ `core.logging`
4. **Progress Tracking**: Luôn emit progress events cho long-running operations
5. **Context Optimization**: Chỉ gửi summary data cho LLM, không gửi raw data lớn
6. **Template-based Reports**: Sử dụng templates thay vì generate HTML từ scratch

---

## 🔍 Troubleshooting

### Common Issues

1. **Connection Pool Exhausted**:
   - Tăng `DB_POOL_MAX` trong `.env`
   - Kiểm tra connection leaks

2. **LLM Timeout**:
   - Giảm `LLM_MAX_TOKENS`
   - Optimize prompts

3. **Report Generation Slow**:
   - Kiểm tra database queries
   - Optimize data fetching

4. **SSE Not Working**:
   - Kiểm tra CORS settings
   - Verify SSE headers

---

## 📚 Additional Resources

- `AI_SYSTEM_GUIDE.md`: Detailed guide về AI system
- `README.md`: Quick start guide
- `CLEANUP_SUMMARY.md`: File cleanup history
- `services/report/TEMPLATE_OPTIMIZATION.md`: Report optimization details

---

**Last Updated**: 2024
**Version**: 1.0.0

