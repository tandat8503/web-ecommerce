# CHƯƠNG 2 - PHẦN 2.3: BỔ SUNG CÔNG NGHỆ AI

## 2.3.4. Công nghệ Trí tuệ Nhân tạo (AI)

Hệ thống E-Commerce tích hợp các công nghệ AI tiên tiến để nâng cao trải nghiệm người dùng và hỗ trợ ra quyết định kinh doanh.

---

### 2.3.4.1. Google Gemini Pro API

#### Giới thiệu
**Google Gemini Pro** là mô hình ngôn ngữ lớn (Large Language Model - LLM) thế hệ mới của Google, được tối ưu cho các tác vụ xử lý ngôn ngữ tự nhiên phức tạp.

#### Đặc điểm chính
- **Multimodal:** Xử lý cả text, image, audio
- **Context window:** Hỗ trợ context lên đến 32K tokens
- **Multilingual:** Hỗ trợ đa ngôn ngữ bao gồm tiếng Việt
- **Function calling:** Tích hợp với external tools
- **Safety settings:** Kiểm soát nội dung an toàn

#### Ứng dụng trong hệ thống
```python
import google.generativeai as genai

# Cấu hình Gemini Pro
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-pro')

# Tạo chatbot tư vấn sản phẩm
response = model.generate_content(
    f"Tư vấn sản phẩm: {user_query}",
    generation_config={
        "temperature": 0.7,
        "top_p": 0.8,
        "max_output_tokens": 1024,
    }
)
```

#### Lợi ích
- ✅ Hiểu ngữ cảnh tốt, trả lời tự nhiên
- ✅ Xử lý tiếng Việt chính xác
- ✅ API đơn giản, dễ tích hợp
- ✅ Chi phí hợp lý (Free tier: 60 requests/minute)

---

### 2.3.4.2. FastAPI Framework

#### Giới thiệu
**FastAPI** là web framework hiện đại cho Python, được thiết kế để xây dựng API nhanh chóng với hiệu năng cao.

#### Đặc điểm chính
- **Async/Await:** Hỗ trợ bất đồng bộ native
- **Type hints:** Validation tự động với Pydantic
- **Auto documentation:** Swagger UI và ReDoc tự động
- **Performance:** Ngang bằng NodeJS và Go
- **Modern Python:** Python 3.7+ với type annotations

#### Cấu trúc AI Service
```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(
    title="E-Commerce AI Service",
    version="1.0.0",
    description="AI-powered chatbot and analytics"
)

class ChatRequest(BaseModel):
    message: str
    user_type: str  # "user" hoặc "admin"
    context: dict = {}

@app.post("/chat")
async def chat(request: ChatRequest):
    """
    Endpoint xử lý chat với AI
    - User: Tư vấn sản phẩm
    - Admin: Business intelligence
    """
    response = await orchestrator.process_message(
        message=request.message,
        user_type=request.user_type,
        context=request.context
    )
    return {"response": response}
```

#### Lợi ích
- ✅ Performance cao (async/await)
- ✅ Type safety với Pydantic
- ✅ Auto documentation (Swagger)
- ✅ Dễ test và maintain

---

### 2.3.4.3. Model Context Protocol (MCP)

#### Giới thiệu
**MCP (Model Context Protocol)** là giao thức chuẩn để kết nối LLM với external tools và data sources, được phát triển bởi Anthropic.

#### Kiến trúc MCP

```
┌─────────────────────────────────────────────────────┐
│                   LLM (Gemini Pro)                  │
│              - Xử lý ngôn ngữ tự nhiên              │
│              - Quyết định gọi tool nào              │
└────────────────────┬────────────────────────────────┘
                     │
                     │ MCP Protocol
                     │
┌────────────────────▼────────────────────────────────┐
│                  MCP Server                         │
│              - Quản lý 9 tools                      │
│              - Validation parameters                │
│              - Execute tools                        │
└────────────────────┬────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
┌───────▼──────┐ ┌──▼──────┐ ┌──▼──────────┐
│   Database   │ │  Cache  │ │  External   │
│   (MySQL)    │ │ (Redis) │ │  APIs       │
└──────────────┘ └─────────┘ └─────────────┘
```

#### 9 MCP Tools được implement

**1. search_products**
```python
@mcp.tool()
async def search_products(
    query: str,
    limit: int = 10,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    category: Optional[str] = None
) -> str:
    """
    Tìm kiếm sản phẩm trong database
    
    Args:
        query: Từ khóa tìm kiếm
        limit: Số lượng kết quả (mặc định 10)
        min_price: Giá tối thiểu
        max_price: Giá tối đa
        category: Danh mục sản phẩm
    
    Returns:
        JSON string chứa danh sách sản phẩm
    """
    # Full-text search trong MySQL
    # Vector search với sentence-transformers
    # Kết hợp kết quả và ranking
```

**2. analyze_sentiment**
```python
@mcp.tool()
async def analyze_sentiment(
    texts: List[str],
    product_id: Optional[int] = None
) -> str:
    """
    Phân tích cảm xúc từ bình luận/đánh giá
    
    Args:
        texts: Danh sách văn bản cần phân tích
        product_id: ID sản phẩm (optional)
    
    Returns:
        JSON với sentiment scores (positive/negative/neutral)
    """
    # Sử dụng Gemini Pro để phân tích
    # Trả về điểm số và phân loại
```

**3. summarize_sentiment_by_product**
```python
@mcp.tool()
async def summarize_sentiment_by_product(
    product_id: Optional[int] = None
) -> str:
    """
    Tổng hợp cảm xúc khách hàng theo sản phẩm
    
    Returns:
        Báo cáo tổng hợp sentiment
    """
```

**4. get_revenue_analytics**
```python
@mcp.tool()
async def get_revenue_analytics(
    month: Optional[int] = None,
    year: Optional[int] = None,
    group_by: str = "day"
) -> str:
    """
    Phân tích doanh thu theo thời gian
    
    Returns:
        JSON với revenue metrics
    """
```

**5. get_sales_performance**
```python
@mcp.tool()
async def get_sales_performance(days: int = 30) -> str:
    """
    Hiệu suất bán hàng trong N ngày gần nhất
    """
```

**6. get_product_metrics**
```python
@mcp.tool()
async def get_product_metrics(limit: int = 20) -> str:
    """
    Metrics của top sản phẩm bán chạy
    """
```

**7. generate_report**
```python
@mcp.tool()
async def generate_report(
    report_type: str = "summary",
    period: str = "month"
) -> str:
    """
    Tạo báo cáo kinh doanh tổng hợp
    """
```

**8. generate_html_report**
```python
@mcp.tool()
async def generate_html_report(
    report_type: str,
    data: dict,
    period: str
) -> str:
    """
    Tạo báo cáo HTML với Chart.js
    
    Returns:
        HTML string với interactive charts
    """
```

**9. moderate_content**
```python
@mcp.tool()
async def moderate_content(
    content: str,
    content_type: str,
    product_id: Optional[int] = None
) -> str:
    """
    Kiểm duyệt nội dung (bình luận, đánh giá)
    
    Returns:
        JSON với moderation result
        {
            "is_appropriate": bool,
            "violations": List[str],
            "severity": str,
            "confidence": float,
            "suggested_action": str
        }
    """
```

#### Lợi ích của MCP
- ✅ **Chuẩn hóa:** Protocol chuẩn, dễ mở rộng
- ✅ **Type-safe:** Validation tự động parameters
- ✅ **Composable:** Kết hợp nhiều tools
- ✅ **Traceable:** Logging và monitoring

---

### 2.3.4.4. AI Agents Architecture

#### Kiến trúc Multi-Agent System

```
┌─────────────────────────────────────────────────────┐
│              AgentOrchestrator                      │
│         - Phân tích user intent                     │
│         - Route đến agent phù hợp                   │
│         - Kết hợp kết quả từ nhiều agents           │
└────────────────────┬────────────────────────────────┘
                     │
        ┌────────────┼────────────┬────────────┐
        │            │            │            │
┌───────▼──────┐ ┌──▼──────┐ ┌──▼──────┐ ┌──▼──────────┐
│UserChatbot   │ │AdminChat│ │Sentiment│ │Business     │
│Agent         │ │botAgent │ │Analyzer │ │Analyst      │
│              │ │         │ │Agent    │ │Agent        │
└──────────────┘ └─────────┘ └─────────┘ └─────────────┘
```

#### 1. UserChatbotAgent
**Mục đích:** Tư vấn sản phẩm cho khách hàng

**Capabilities:**
- Tìm kiếm sản phẩm theo yêu cầu
- So sánh sản phẩm
- Tư vấn giá cả, tính năng
- Gợi ý sản phẩm phù hợp

**Tools sử dụng:**
- `search_products`

**Ví dụ:**
```
User: "Tìm laptop gaming dưới 20 triệu"
Agent: → search_products(query="laptop gaming", max_price=20000000)
      → Trả về: 5 sản phẩm phù hợp với mô tả chi tiết
```

#### 2. AdminChatbotAgent
**Mục đích:** Business intelligence cho admin

**Capabilities:**
- Phân tích doanh thu
- Báo cáo hiệu suất bán hàng
- Tổng hợp feedback khách hàng
- Dự đoán xu hướng

**Tools sử dụng:**
- `get_revenue_analytics`
- `summarize_sentiment_by_product`
- `generate_report`
- `generate_html_report`

**Ví dụ:**
```
Admin: "Doanh thu tháng 11 như thế nào?"
Agent: → get_revenue_analytics(month=11, year=2024)
      → Trả về: Báo cáo chi tiết với charts
```

#### 3. SentimentAnalyzerAgent
**Mục đích:** Phân tích cảm xúc khách hàng

**Capabilities:**
- Phân tích bình luận/đánh giá
- Tổng hợp sentiment theo sản phẩm
- Phát hiện vấn đề sản phẩm
- Đề xuất cải thiện

**Tools sử dụng:**
- `analyze_sentiment`
- `summarize_sentiment_by_product`

**Ví dụ:**
```
Admin: "Khách hàng nghĩ gì về sản phẩm #17?"
Agent: → summarize_sentiment_by_product(product_id=17)
      → Trả về: 85% positive, 10% neutral, 5% negative
```

#### 4. BusinessAnalystAgent
**Mục đích:** Phân tích KPI và metrics

**Capabilities:**
- Phân tích hiệu suất bán hàng
- Top sản phẩm bán chạy
- Conversion rate analysis
- Revenue forecasting

**Tools sử dụng:**
- `get_revenue_analytics`
- `get_sales_performance`
- `get_product_metrics`

**Ví dụ:**
```
Admin: "Top 10 sản phẩm bán chạy nhất?"
Agent: → get_product_metrics(limit=10)
      → Trả về: Danh sách với revenue, quantity sold
```

#### 5. ContentModerationAgent
**Mục đích:** Kiểm duyệt nội dung tự động

**Capabilities:**
- Phát hiện ngôn từ thô tục
- Phát hiện spam, harassment
- Đánh giá độ nghiêm trọng
- Đề xuất hành động

**Tools sử dụng:**
- `moderate_content`

**Ví dụ:**
```
System: Kiểm tra bình luận mới
Agent: → moderate_content(content="...", content_type="comment")
      → Trả về: is_appropriate=false, violations=["profanity"]
```

#### 6. ReportGeneratorAgent
**Mục đích:** Tạo báo cáo HTML tự động

**Capabilities:**
- Tạo báo cáo sentiment
- Tạo báo cáo revenue
- Tạo báo cáo product performance
- Interactive charts với Chart.js

**Tools sử dụng:**
- `generate_html_report`

---

### 2.3.4.5. Sentence Transformers

#### Giới thiệu
**Sentence Transformers** là thư viện Python để tạo embeddings cho câu và đoạn văn, sử dụng pre-trained models.

#### Model sử dụng
```python
from sentence_transformers import SentenceTransformer

# Load model
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

# Tạo embeddings
query_embedding = model.encode("ghế văn phòng")
product_embeddings = model.encode([
    "Ghế văn phòng cao cấp",
    "Bàn làm việc gỗ",
    "Ghế gaming RGB"
])

# Tính similarity
from sklearn.metrics.pairwise import cosine_similarity
similarities = cosine_similarity([query_embedding], product_embeddings)
```

#### Ứng dụng
- **Semantic search:** Tìm kiếm theo nghĩa, không chỉ từ khóa
- **Product recommendation:** Gợi ý sản phẩm tương tự
- **Duplicate detection:** Phát hiện bình luận trùng lặp

#### Lợi ích
- ✅ Hiểu ngữ nghĩa tiếng Việt
- ✅ Tìm kiếm chính xác hơn keyword search
- ✅ Offline inference (không cần API)

---

### 2.3.4.6. ChromaDB

#### Giới thiệu
**ChromaDB** là vector database mã nguồn mở, được thiết kế cho AI applications.

#### Cấu trúc
```python
import chromadb

# Khởi tạo client
client = chromadb.PersistentClient(path="./chroma_db")

# Tạo collection
collection = client.create_collection(
    name="products",
    metadata={"description": "E-commerce products"}
)

# Thêm documents
collection.add(
    documents=["Ghế văn phòng cao cấp", "Bàn làm việc gỗ"],
    metadatas=[{"price": 2500000}, {"price": 3500000}],
    ids=["prod_1", "prod_2"]
)

# Vector search
results = collection.query(
    query_texts=["ghế làm việc"],
    n_results=5
)
```

#### Ứng dụng
- **Product search:** Tìm kiếm sản phẩm semantic
- **Document retrieval:** Tìm tài liệu liên quan
- **RAG (Retrieval Augmented Generation):** Cung cấp context cho LLM

#### Lợi ích
- ✅ Embedded database (không cần server riêng)
- ✅ Auto-embedding với sentence-transformers
- ✅ Metadata filtering
- ✅ Persistent storage

---

### 2.3.4.7. Kiến trúc tổng thể AI System

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│                  - ChatWidget component                     │
│                  - Admin Analytics Dashboard                │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/WebSocket
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  Backend (Node.js/Express)                  │
│              - API Gateway                                  │
│              - Authentication                               │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP
                         │
┌────────────────────────▼────────────────────────────────────┐
│                AI Service (FastAPI/Python)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           AgentOrchestrator                          │  │
│  │  - Intent detection                                  │  │
│  │  - Agent routing                                     │  │
│  │  - Response aggregation                              │  │
│  └────────────┬─────────────────────────────────────────┘  │
│               │                                             │
│  ┌────────────▼─────────────────────────────────────────┐  │
│  │              6 AI Agents                             │  │
│  │  - UserChatbot, AdminChatbot, SentimentAnalyzer     │  │
│  │  - BusinessAnalyst, ContentModeration, ReportGen    │  │
│  └────────────┬─────────────────────────────────────────┘  │
│               │                                             │
│  ┌────────────▼─────────────────────────────────────────┐  │
│  │           MCP Server (9 Tools)                       │  │
│  │  - search_products, analyze_sentiment               │  │
│  │  - get_revenue_analytics, moderate_content          │  │
│  │  - generate_html_report, ...                        │  │
│  └────────────┬─────────────────────────────────────────┘  │
│               │                                             │
│  ┌────────────▼─────────────────────────────────────────┐  │
│  │         External Services                            │  │
│  │  - Gemini Pro API (LLM)                             │  │
│  │  - Sentence Transformers (Embeddings)               │  │
│  │  - ChromaDB (Vector Store)                          │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    MySQL Database                           │
│  - products, orders, order_items                            │
│  - product_reviews, product_comments                        │
│  - users, moderation_logs                                   │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.3.4.8. Luồng xử lý AI Request

#### Ví dụ: User hỏi "Tìm laptop gaming dưới 20 triệu"

```
1. Frontend gửi request
   POST /api/ai/chat
   {
     "message": "Tìm laptop gaming dưới 20 triệu",
     "user_type": "user"
   }

2. Backend forward đến AI Service
   POST http://localhost:8000/chat

3. AgentOrchestrator phân tích intent
   - Detect: Product search query
   - Route to: UserChatbotAgent

4. UserChatbotAgent xử lý
   - Parse query: "laptop gaming", max_price=20000000
   - Call MCP tool: search_products()

5. MCP Tool search_products
   a. Full-text search trong MySQL
      SELECT * FROM products 
      WHERE MATCH(name, description) AGAINST('laptop gaming')
      AND price <= 20000000
   
   b. Vector search trong ChromaDB
      - Encode query: "laptop gaming"
      - Query vector DB
      - Get top 10 similar products
   
   c. Merge và rank results
      - Combine SQL + vector results
      - Remove duplicates
      - Sort by relevance + price

6. Gemini Pro tạo response
   - Input: Product list + user query
   - Generate: Natural language response
   - Output: "Tôi tìm thấy 5 laptop gaming phù hợp..."

7. Trả về Frontend
   {
     "response": "Tôi tìm thấy 5 laptop gaming...",
     "products": [...],
     "metadata": {
       "agent": "UserChatbotAgent",
       "tools_used": ["search_products"],
       "processing_time": "1.2s"
     }
   }
```

---

### 2.3.4.9. So sánh công nghệ AI

| Công nghệ | Mục đích | Ưu điểm | Nhược điểm |
|-----------|----------|---------|------------|
| **Gemini Pro** | LLM chính | - Hiểu ngữ cảnh tốt<br>- Đa ngôn ngữ<br>- API đơn giản | - Cần internet<br>- Chi phí API |
| **FastAPI** | AI Service backend | - Performance cao<br>- Async native<br>- Auto docs | - Python only |
| **MCP** | Tool integration | - Chuẩn hóa<br>- Type-safe<br>- Composable | - Mới, ít tài liệu |
| **Sentence Transformers** | Embeddings | - Offline<br>- Multilingual<br>- Chính xác | - Cần GPU cho speed |
| **ChromaDB** | Vector DB | - Embedded<br>- Dễ setup<br>- Auto-embedding | - Không scale lớn |

---

### 2.3.4.10. Kết luận

Hệ thống AI của E-Commerce sử dụng **kiến trúc multi-agent** với **6 agents chuyên biệt**, được hỗ trợ bởi **9 MCP tools** và **Gemini Pro LLM**. 

**Điểm mạnh:**
- ✅ Tư vấn sản phẩm thông minh cho user
- ✅ Business intelligence cho admin
- ✅ Content moderation tự động
- ✅ Báo cáo HTML interactive
- ✅ Semantic search chính xác

**Công nghệ sử dụng:**
- **LLM:** Google Gemini Pro
- **Framework:** FastAPI (Python)
- **Protocol:** Model Context Protocol (MCP)
- **Embeddings:** Sentence Transformers
- **Vector DB:** ChromaDB
- **Database:** MySQL (aiomysql)

Hệ thống đã sẵn sàng cho production với **performance cao**, **scalable**, và **maintainable**.

---

**Tác giả:** Tân Đạt & Phước Lý  
**Ngày:** 22/12/2025  
**Phiên bản:** 1.0.0
