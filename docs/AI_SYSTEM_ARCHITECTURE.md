# 🤖 GIẢI THÍCH CẤU TRÚC HỆ THỐNG AI

## 📁 CẤU TRÚC THỨ MỤC

```
ai/
├── app.py                          # 🚀 Main application - Entry point
├── prompts.py                      # 📝 Tất cả prompts cho AI
├── agents.py                       # 🤖 Định nghĩa các AI Agents
├── config.py                       # ⚙️ Cấu hình hệ thống
├── requirements.txt                # 📦 Dependencies
│
├── core/                           # 🔧 Core utilities
│   ├── db.py                       # Database connection pool
│   ├── utils.py                    # Helper functions
│   └── conversation.py             # Conversation history manager
│
├── shared/                         # 🔗 Shared modules
│   └── llm_client.py               # LLM client (Gemini API)
│
├── services/                       # 🎯 Business logic services
│   ├── chatbot/
│   │   ├── improved_user_chatbot.py    # User chatbot với memory
│   │   └── user_chatbot.py             # User chatbot cơ bản
│   └── legal/
│       ├── improved_legal_service.py   # Legal chatbot nâng cao
│       └── legal_service.py            # Legal chatbot cơ bản
│
├── mcps/                           # 🛠️ MCP Tools (Model Context Protocol)
│   ├── helpers.py                  # Tool helper functions
│   └── tools.py                    # Tool definitions
│
└── documents/                      # 📚 Legal documents for RAG
    └── legal/
        └── *.txt                   # Văn bản pháp luật
```

---

## 📄 CHI TIẾT TỪNG FILE

### 1. `app.py` - Main Application 🚀

**Chức năng**: Entry point của hệ thống AI, khởi tạo Flask server

**Nhiệm vụ**:
- Khởi tạo Flask app
- Định nghĩa API endpoints:
  - `POST /chat/user` - User chatbot (tư vấn sản phẩm)
  - `POST /chat/admin` - Admin chatbot (business analytics)
  - `POST /chat/legal` - Legal chatbot (tư vấn pháp luật)
- Xử lý CORS
- Load environment variables

**Code chính**:
```python
from flask import Flask, request, jsonify
from agents import UserChatbotAgent, AdminChatbotAgent
from services.legal.improved_legal_service import improved_legal_service

app = Flask(__name__)

@app.route('/chat/user', methods=['POST'])
async def chat_user():
    # Xử lý chat với user
    data = request.json
    user_message = data.get('message')
    
    agent = UserChatbotAgent()
    response = await agent.process_message(user_message)
    return jsonify(response)

@app.route('/chat/admin', methods=['POST'])
async def chat_admin():
    # Xử lý chat với admin
    ...

@app.route('/chat/legal', methods=['POST'])
async def chat_legal():
    # Xử lý tư vấn pháp luật
    ...
```

**Khi nào chạy**: `python app.py` để start server

---

### 2. `prompts.py` - Prompt Templates 📝

**Chức năng**: Lưu trữ TẤT CẢ prompts cho AI

**Các prompts chính**:

#### User Chatbot Prompts:
```python
USER_CHATBOT_SYSTEM_PROMPT = """
Bạn là Chuyên gia tư vấn nội thất cao cấp...
- Thân thiện, nhiệt tình
- Ghi nhớ context
- Đưa ra gợi ý phù hợp
"""

USER_CHATBOT_CONSULTANT_PROMPT = """
Dữ liệu sản phẩm: {products_data}
Yêu cầu: {user_message}

Nhiệm vụ:
1. Khớp nhu cầu
2. Phân tích
3. Tư vấn
4. So sánh
5. Cross-sell
"""
```

#### Admin Chatbot Prompts:
```python
ADMIN_CHATBOT_SYSTEM_PROMPT = """
You are an Admin Chatbot specialized in business intelligence...
- Revenue analysis
- Customer sentiment
- Report generation
"""
```

#### Legal Chatbot Prompts:
```python
LEGAL_CONSULTANT_SYSTEM_PROMPT = """
Bạn là Trợ lý Luật sư AI...
- Tìm kiếm văn bản pháp luật
- Trích dẫn chính xác
- Tính toán thuế
"""
```

**Khi nào sửa**: Khi muốn thay đổi cách AI trả lời, giọng điệu, hoặc hướng dẫn

---

### 3. `agents.py` - AI Agents 🤖

**Chức năng**: Định nghĩa các AI Agent classes

**Các Agent chính**:

#### BaseAgent (Abstract class):
```python
class BaseAgent:
    """Base class cho tất cả agents"""
    def __init__(self, agent_type, system_prompt):
        self.agent_type = agent_type
        self.system_prompt = system_prompt
        self.llm_client = LLMClientFactory.create_client()
        self.tool_client = ToolClient()
    
    async def process_message(self, user_message, context):
        # 1. Classify intent
        # 2. Call tools
        # 3. Generate response
        pass
```

#### UserChatbotAgent:
```python
class UserChatbotAgent(BaseAgent):
    """Agent tư vấn sản phẩm cho khách hàng"""
    
    async def _classify_intent(self, user_message):
        # Phân loại ý định:
        # - greeting
        # - product_search
        # - price_inquiry
        # - product_detail
        # - comparison
        pass
    
    async def _call_tools(self, intent, user_message):
        # Gọi tools phù hợp:
        # - search_products
        # - get_product_details
        pass
    
    async def _generate_response(self, tool_result, user_message):
        # Tạo response từ LLM
        pass
```

#### AdminChatbotAgent:
```python
class AdminChatbotAgent(BaseAgent):
    """Agent phân tích business cho admin"""
    
    async def _call_tools(self, intent, user_message):
        # Gọi tools:
        # - get_revenue_analytics
        # - summarize_sentiment_by_product
        # - generate_report
        pass
```

**Khi nào sửa**: Khi muốn thêm agent mới hoặc thay đổi logic xử lý

---

### 4. `config.py` - Configuration ⚙️

**Chức năng**: Cấu hình hệ thống

```python
import os
from dotenv import load_dotenv

load_dotenv()

# Database
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'ecommerce')
}

# LLM
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-1.5-flash')

# App
DEBUG = os.getenv('DEBUG', 'False') == 'True'
PORT = int(os.getenv('PORT', 5000))
```

**Khi nào sửa**: Khi thêm config mới hoặc thay đổi settings

---

### 5. `core/db.py` - Database Connection 💾

**Chức năng**: Quản lý connection pool đến MySQL

```python
import aiomysql
from config import DB_CONFIG

# Connection pool
pool = None

async def init_pool():
    """Khởi tạo connection pool"""
    global pool
    pool = await aiomysql.create_pool(
        host=DB_CONFIG['host'],
        port=DB_CONFIG['port'],
        user=DB_CONFIG['user'],
        password=DB_CONFIG['password'],
        db=DB_CONFIG['database'],
        minsize=5,
        maxsize=10
    )

async def get_conn():
    """Lấy connection từ pool"""
    return await pool.acquire()

async def release_conn(conn):
    """Trả connection về pool"""
    pool.release(conn)
```

**Khi nào dùng**: Khi cần query database trong agents/services

---

### 6. `core/utils.py` - Helper Functions 🔧

**Chức năng**: Các hàm tiện ích

```python
def extract_price_filter(text):
    """Trích xuất giá từ text
    
    VD: "dưới 5 triệu" -> (None, 5000000)
        "từ 2tr đến 5tr" -> (2000000, 5000000)
    """
    import re
    
    # Pattern: "dưới X triệu"
    match = re.search(r'dưới\s+(\d+)\s*(?:triệu|tr)', text)
    if match:
        return (None, int(match.group(1)) * 1000000)
    
    # Pattern: "từ X đến Y triệu"
    match = re.search(r'từ\s+(\d+)\s*(?:tr|triệu).*?đến\s+(\d+)\s*(?:tr|triệu)', text)
    if match:
        return (int(match.group(1)) * 1000000, int(match.group(2)) * 1000000)
    
    return (None, None)

def clean_product_query(text):
    """Làm sạch query
    
    VD: "Tìm bàn làm việc" -> "bàn làm việc"
        "Cho tôi xem ghế" -> "ghế"
    """
    # Remove stopwords
    stopwords = ['tìm', 'cho tôi', 'xem', 'mua', 'có', 'không']
    for word in stopwords:
        text = text.replace(word, '')
    return text.strip()
```

**Khi nào dùng**: Khi cần xử lý text, extract thông tin

---

### 7. `core/conversation.py` - Conversation Memory 🧠

**Chức năng**: Lưu trữ lịch sử hội thoại

```python
class ConversationHistory:
    """Quản lý lịch sử hội thoại"""
    
    def __init__(self):
        self.sessions = {}  # {session_id: [messages]}
    
    def add_message(self, session_id, role, content, metadata=None):
        """Thêm message vào session"""
        if session_id not in self.sessions:
            self.sessions[session_id] = []
        
        self.sessions[session_id].append({
            'role': role,  # 'user' or 'assistant'
            'content': content,
            'metadata': metadata,
            'timestamp': datetime.now()
        })
    
    def get_history(self, session_id, limit=5):
        """Lấy lịch sử gần nhất"""
        if session_id not in self.sessions:
            return []
        return self.sessions[session_id][-limit:]
    
    def get_context(self, session_id):
        """Lấy context (last_products, last_intent)"""
        # Trích xuất thông tin từ metadata
        pass

# Global instance
conversation_history = ConversationHistory()
```

**Khi nào dùng**: Để chatbot nhớ ngữ cảnh hội thoại

---

### 8. `shared/llm_client.py` - LLM Client 🧠

**Chức năng**: Giao tiếp với Gemini API

```python
import google.generativeai as genai
from config import GEMINI_API_KEY, GEMINI_MODEL

class GeminiClient:
    """Client để gọi Gemini API"""
    
    def __init__(self):
        genai.configure(api_key=GEMINI_API_KEY)
        self.model = genai.GenerativeModel(GEMINI_MODEL)
    
    async def generate_simple(self, prompt, system_instruction, temperature=0.7, max_tokens=2048):
        """Gọi Gemini API đơn giản"""
        try:
            response = self.model.generate_content(
                prompt,
                generation_config={
                    'temperature': temperature,
                    'max_output_tokens': max_tokens
                }
            )
            
            return {
                'success': True,
                'content': response.text,
                'truncated': response.finish_reason == 2
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

class LLMClientFactory:
    """Factory để tạo LLM client"""
    
    @staticmethod
    def create_client():
        return GeminiClient()
```

**Khi nào dùng**: Khi cần gọi AI để generate text

---

### 9. `services/chatbot/improved_user_chatbot.py` - User Chatbot Service 💬

**Chức năng**: Service xử lý chat với user (có memory)

**Đặc điểm**:
- Intent detection (greeting, product_search, price_inquiry, etc.)
- Conversation memory
- Context-aware responses
- Follow-up questions

```python
class ImprovedUserChatbotService:
    """User chatbot với conversation memory"""
    
    async def process_message(self, user_message, context):
        # 1. Get conversation history
        session_id = context.get('session_id')
        conv_history = conversation_history.get_history(session_id)
        
        # 2. Detect intent
        intent = await self._detect_intent(user_message, conv_history)
        
        # 3. Execute handler
        if intent == 'greeting':
            response = await self._handle_greeting(...)
        elif intent == 'product_search':
            response = await self._handle_product_search(...)
        elif intent == 'follow_up':
            response = await self._handle_follow_up(...)
        
        # 4. Save to history
        conversation_history.add_message(session_id, 'user', user_message)
        conversation_history.add_message(session_id, 'assistant', response)
        
        return response
```

**Khi nào dùng**: Được gọi từ `app.py` endpoint `/chat/user`

---

### 10. `services/legal/improved_legal_service.py` - Legal Chatbot Service ⚖️

**Chức năng**: Tư vấn pháp luật với RAG (Retrieval-Augmented Generation)

**Flow**:
1. User hỏi về luật
2. Search trong documents/legal/ để tìm văn bản liên quan
3. Trích xuất context từ văn bản
4. Gửi context + question cho LLM
5. LLM trả lời dựa trên context

```python
class ImprovedLegalService:
    """Legal chatbot với RAG"""
    
    async def process_query(self, user_query):
        # 1. Search legal documents
        relevant_docs = await self._search_documents(user_query)
        
        # 2. Extract context
        context = self._extract_context(relevant_docs)
        
        # 3. Generate response with LLM
        prompt = LEGAL_CONSULTANT_RAG_PROMPT.format(
            context=context,
            user_query=user_query
        )
        
        response = await self.llm_client.generate_simple(
            prompt=prompt,
            system_instruction=LEGAL_CONSULTANT_SYSTEM_PROMPT
        )
        
        return response
```

**Khi nào dùng**: Được gọi từ `app.py` endpoint `/chat/legal`

---

### 11. `mcps/tools.py` - MCP Tools 🛠️

**Chức năng**: Định nghĩa các tools mà AI có thể gọi

**Tools chính**:

```python
# Product tools
async def search_products(query, limit=5, min_price=None, max_price=None):
    """Tìm kiếm sản phẩm"""
    conn = await get_conn()
    try:
        sql = "SELECT * FROM products WHERE name LIKE %s"
        params = [f"%{query}%"]
        
        if min_price:
            sql += " AND price >= %s"
            params.append(min_price)
        
        if max_price:
            sql += " AND price <= %s"
            params.append(max_price)
        
        async with conn.cursor() as cur:
            await cur.execute(sql, params)
            rows = await cur.fetchall()
            return {'success': True, 'products': rows}
    finally:
        await release_conn(conn)

async def get_product_details(product_name_or_id):
    """Lấy chi tiết sản phẩm"""
    # Query database để lấy thông tin đầy đủ
    pass

# Analytics tools
async def get_revenue_analytics(period):
    """Phân tích doanh thu"""
    # Query orders, tính tổng revenue
    pass

async def summarize_sentiment_by_product(product_id):
    """Tổng hợp sentiment theo sản phẩm"""
    # Query reviews, phân tích sentiment
    pass
```

**Khi nào dùng**: Agents gọi tools thông qua `ToolClient`

---

### 12. `mcps/helpers.py` - Tool Helpers 🔧

**Chức năng**: Helper functions cho tools

```python
async def search_products_helper(query, limit, min_price, max_price):
    """Wrapper cho search_products tool"""
    result = await search_products(query, limit, min_price, max_price)
    return json.dumps(result, ensure_ascii=False)

async def get_product_details_helper(product_name_or_id):
    """Wrapper cho get_product_details tool"""
    result = await get_product_details(product_name_or_id)
    return json.dumps(result, ensure_ascii=False)
```

**Khi nào dùng**: Được gọi từ agents

---

## 🔄 FLOW HOÀN CHỈNH

### User Chat Flow:

```
1. Frontend gửi POST /chat/user
   Body: {message: "Tìm bàn dưới 5 triệu", session_id: "abc123"}
   
2. app.py nhận request
   ↓
3. Khởi tạo UserChatbotAgent
   ↓
4. Agent.process_message()
   ├─ Get conversation history (session_id)
   ├─ Classify intent → "product_search"
   ├─ Extract params → {query: "bàn", max_price: 5000000}
   ├─ Call tool: search_products(query="bàn", max_price=5000000)
   ├─ Tool query database → return products
   ├─ Generate response với LLM
   │  ├─ Prompt: USER_CHATBOT_CONSULTANT_PROMPT
   │  ├─ Context: products data
   │  └─ LLM generate: "Dạ bên em có mấy mẫu bàn này..."
   └─ Save to conversation history
   
5. Return response to frontend
   {
     success: true,
     response: {
       text: "Dạ bên em có...",
       type: "product_recommendation",
       data: [product cards]
     }
   }
```

### Admin Chat Flow:

```
1. Frontend gửi POST /chat/admin
   Body: {message: "Doanh thu tháng 12", user_id: 1}
   
2. app.py nhận request
   ↓
3. Khởi tạo AdminChatbotAgent
   ↓
4. Agent.process_message()
   ├─ Classify intent → "revenue_analysis"
   ├─ Call tool: get_revenue_analytics(period="2024-12")
   ├─ Tool query orders → calculate revenue
   ├─ Generate response với LLM
   └─ Return insights + recommendations
   
5. Return response to frontend
```

---

## 🎯 KHI NÀO SỬA FILE NÀO?

| Mục đích | File cần sửa |
|----------|--------------|
| Thay đổi cách AI trả lời | `prompts.py` |
| Thêm greeting message | `services/chatbot/improved_user_chatbot.py` (dòng 280) |
| Thêm intent mới | `agents.py` → `_classify_intent()` |
| Thêm tool mới | `mcps/tools.py` |
| Thay đổi database query | `mcps/tools.py` hoặc `core/db.py` |
| Thêm endpoint mới | `app.py` |
| Thay đổi config | `config.py` hoặc `.env` |
| Thêm helper function | `core/utils.py` |
| Thay đổi LLM model | `config.py` → `GEMINI_MODEL` |

---

## 📊 DEPENDENCIES

```
Flask==3.0.0              # Web framework
aiomysql==0.2.0           # Async MySQL driver
google-generativeai==0.3.0 # Gemini API
python-dotenv==1.0.0      # Environment variables
```

---

**Created**: 2025-12-29
**Version**: 1.0
**Status**: ✅ DOCUMENTATION COMPLETE
