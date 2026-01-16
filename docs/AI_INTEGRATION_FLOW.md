# 🔄 LUỒNG XỬ LÝ GIỮA FRONTEND - BACKEND - AI SERVICE

## 📊 KIẾN TRÚC TỔNG QUAN

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │         │                 │
│    FRONTEND     │────────▶│     BACKEND     │────────▶│   AI SERVICE    │
│   (React App)   │         │   (Node.js)     │         │    (Python)     │
│   Port: 5173    │◀────────│   Port: 3000    │◀────────│   Port: 5000    │
│                 │         │                 │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                     │                           │
                                     │                           │
                                     ▼                           ▼
                            ┌─────────────────┐         ┌─────────────────┐
                            │                 │         │                 │
                            │   MySQL DB      │◀────────│   MySQL DB      │
                            │   Port: 3306    │         │   Port: 3306    │
                            │                 │         │                 │
                            └─────────────────┘         └─────────────────┘
```

---

## 🎯 LUỒNG 1: USER CHATBOT (Tư vấn sản phẩm)

### 📱 Frontend → Backend → AI Service

```javascript
// 1. FRONTEND: User gửi tin nhắn
// File: frontend/src/pages/user/chatbot/UserChatbot.jsx

const sendMessage = async (message) => {
  try {
    // Gọi API backend
    const response = await axios.post('/api/chatbot/user', {
      message: message,
      session_id: sessionId,
      user_id: userId
    });
    
    // Hiển thị response
    setMessages([...messages, {
      role: 'assistant',
      content: response.data.response.text,
      products: response.data.response.data
    }]);
  } catch (error) {
    console.error('Chat error:', error);
  }
};
```

```javascript
// 2. BACKEND: Nhận request và forward đến AI Service
// File: backend/controller/chatbotController.js

export const userChat = async (req, res) => {
  try {
    const { message, session_id, user_id } = req.body;
    
    // Lấy thông tin user từ DB (nếu có)
    let userContext = '';
    if (user_id) {
      const user = await prisma.user.findUnique({
        where: { id: user_id },
        include: {
          orders: {
            take: 1,
            orderBy: { createdAt: 'desc' }
          }
        }
      });
      
      userContext = `User: ${user.firstName} ${user.lastName}`;
      if (user.orders.length > 0) {
        userContext += `, Last order: ${user.orders[0].id}`;
      }
    }
    
    // Forward request đến AI Service
    const aiResponse = await axios.post('http://localhost:5000/chat/user', {
      message: message,
      session_id: session_id,
      user_id: user_id,
      user_context: userContext
    });
    
    // Trả response về frontend
    res.json({
      success: true,
      response: aiResponse.data.response,
      agent_type: aiResponse.data.agent_type
    });
    
  } catch (error) {
    logger.error('User chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xử lý chat'
    });
  }
};
```

```python
# 3. AI SERVICE: Xử lý tin nhắn
# File: ai/app.py

@app.route('/chat/user', methods=['POST'])
async def chat_user():
    try:
        data = request.json
        user_message = data.get('message')
        session_id = data.get('session_id', 'default')
        user_id = data.get('user_id')
        user_context = data.get('user_context', '')
        
        # Khởi tạo agent
        from services.chatbot.improved_user_chatbot import improved_user_chatbot_service
        
        # Xử lý message
        response = await improved_user_chatbot_service.process_message(
            user_message=user_message,
            context={
                'session_id': session_id,
                'user_id': user_id,
                'user_context': user_context
            }
        )
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Chat user error: {e}")
        return jsonify({
            'success': False,
            'response': {
                'text': 'Xin lỗi, hệ thống đang gặp sự cố.',
                'type': 'text'
            }
        }), 500
```

```python
# 4. AI SERVICE: Agent xử lý chi tiết
# File: ai/services/chatbot/improved_user_chatbot.py

async def process_message(self, user_message, context):
    # Step 1: Get conversation history
    session_id = context.get('session_id')
    conv_history = self.conversation_history.get_history(session_id, limit=5)
    
    # Step 2: Detect intent
    intent, intent_data = await self._detect_intent(
        user_message, 
        conv_history, 
        context
    )
    # Intent có thể là: greeting, product_search, price_inquiry, etc.
    
    # Step 3: Execute handler
    if intent == "greeting":
        response = await self._handle_greeting(...)
    elif intent == "product_search":
        response = await self._handle_product_search(...)
        # Gọi tool search_products()
        # Query database MySQL
        # LLM generate response
    
    # Step 4: Save to conversation history
    self.conversation_history.add_message(session_id, 'user', user_message)
    self.conversation_history.add_message(session_id, 'assistant', response)
    
    return response
```

```python
# 5. AI SERVICE: Tool gọi database
# File: ai/mcps/tools.py

async def search_products(query, limit=5, min_price=None, max_price=None):
    """Tìm kiếm sản phẩm trong database"""
    from core.db import get_conn, release_conn
    
    conn = await get_conn()
    try:
        sql = """
            SELECT p.id, p.name, p.price, p.sale_price, p.slug, 
                   p.image_url, c.name as category
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.status = 'ACTIVE' 
              AND p.name LIKE %s
        """
        params = [f"%{query}%"]
        
        if min_price:
            sql += " AND p.price >= %s"
            params.append(min_price)
        
        if max_price:
            sql += " AND p.price <= %s"
            params.append(max_price)
        
        sql += " ORDER BY p.view_count DESC LIMIT %s"
        params.append(limit)
        
        async with conn.cursor() as cur:
            await cur.execute(sql, params)
            rows = await cur.fetchall()
            
            products = []
            for row in rows:
                products.append({
                    'id': row[0],
                    'name': row[1],
                    'price': float(row[2]),
                    'sale_price': float(row[3]) if row[3] else None,
                    'slug': row[4],
                    'image_url': row[5],
                    'category': row[6]
                })
            
            return {
                'success': True,
                'products': products
            }
    finally:
        await release_conn(conn)
```

### 📊 Sequence Diagram - User Chatbot Flow

```
User                Frontend            Backend             AI Service          Database
 │                     │                   │                     │                  │
 │  Type: "Tìm bàn"   │                   │                     │                  │
 │────────────────────▶│                   │                     │                  │
 │                     │  POST /api/       │                     │                  │
 │                     │  chatbot/user     │                     │                  │
 │                     │──────────────────▶│                     │                  │
 │                     │                   │  Get user info      │                  │
 │                     │                   │─────────────────────────────────────▶│
 │                     │                   │◀─────────────────────────────────────│
 │                     │                   │  POST /chat/user    │                  │
 │                     │                   │────────────────────▶│                  │
 │                     │                   │                     │  Detect intent   │
 │                     │                   │                     │  = product_search│
 │                     │                   │                     │                  │
 │                     │                   │                     │  search_products │
 │                     │                   │                     │─────────────────▶│
 │                     │                   │                     │  Query: "bàn"    │
 │                     │                   │                     │◀─────────────────│
 │                     │                   │                     │  [products]      │
 │                     │                   │                     │                  │
 │                     │                   │                     │  LLM generate    │
 │                     │                   │                     │  response        │
 │                     │                   │◀────────────────────│                  │
 │                     │                   │  {text, products}   │                  │
 │                     │◀──────────────────│                     │                  │
 │                     │  Response         │                     │                  │
 │◀────────────────────│                   │                     │                  │
 │  Display products   │                   │                     │                  │
```

---

## 🎯 LUỒNG 2: ADMIN CHATBOT (Business Analytics)

### 📱 Frontend → Backend → AI Service

```javascript
// 1. FRONTEND: Admin hỏi về doanh thu
// File: frontend/src/pages/admin/chatbot/AdminChatbot.jsx

const sendMessage = async (message) => {
  try {
    const response = await axios.post('/api/chatbot/admin', {
      message: message,
      user_id: adminId
    });
    
    setMessages([...messages, {
      role: 'assistant',
      content: response.data.response.text,
      data: response.data.response.data
    }]);
  } catch (error) {
    console.error('Admin chat error:', error);
  }
};
```

```javascript
// 2. BACKEND: Forward request
// File: backend/controller/chatbotController.js

export const adminChat = async (req, res) => {
  try {
    const { message, user_id } = req.body;
    
    // Verify admin role
    const user = await prisma.user.findUnique({
      where: { id: user_id }
    });
    
    if (user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    // Forward to AI Service
    const aiResponse = await axios.post('http://localhost:5000/chat/admin', {
      message: message,
      user_id: user_id
    });
    
    res.json({
      success: true,
      response: aiResponse.data.response
    });
    
  } catch (error) {
    logger.error('Admin chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xử lý chat'
    });
  }
};
```

```python
# 3. AI SERVICE: Xử lý analytics
# File: ai/app.py

@app.route('/chat/admin', methods=['POST'])
async def chat_admin():
    try:
        data = request.json
        user_message = data.get('message')
        user_id = data.get('user_id')
        
        # Khởi tạo admin agent
        from agents import AdminChatbotAgent
        agent = AdminChatbotAgent()
        
        # Xử lý message
        response = await agent.process_message(
            user_message=user_message,
            context={'user_id': user_id}
        )
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Admin chat error: {e}")
        return jsonify({
            'success': False,
            'response': {
                'text': 'Xin lỗi, hệ thống đang gặp sự cố.',
                'type': 'text'
            }
        }), 500
```

```python
# 4. AI SERVICE: Admin Agent xử lý
# File: ai/agents.py - AdminChatbotAgent

async def process_message(self, user_message, context):
    # Classify intent
    intent = await self._classify_intent(user_message)
    # Intent: revenue_analysis, sentiment_analysis, report_generation
    
    # Call appropriate tool
    if intent == 'revenue_analysis':
        tool_result = await self.tool_client.call_tool(
            'get_revenue_analytics',
            period='2024-12'
        )
    elif intent == 'sentiment_analysis':
        tool_result = await self.tool_client.call_tool(
            'summarize_sentiment_by_product',
            product_id=None  # All products
        )
    
    # Generate response with LLM
    response = await self._generate_response(tool_result, user_message)
    
    return response
```

```python
# 5. AI SERVICE: Analytics Tool
# File: ai/mcps/tools.py

async def get_revenue_analytics(period):
    """Phân tích doanh thu theo tháng"""
    from core.db import get_conn, release_conn
    
    conn = await get_conn()
    try:
        # Parse period (e.g., "2024-12")
        year, month = period.split('-')
        
        sql = """
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as order_count,
                SUM(total_amount) as revenue
            FROM orders
            WHERE YEAR(created_at) = %s 
              AND MONTH(created_at) = %s
              AND status = 'COMPLETED'
            GROUP BY DATE(created_at)
            ORDER BY date
        """
        
        async with conn.cursor() as cur:
            await cur.execute(sql, (year, month))
            rows = await cur.fetchall()
            
            analytics = []
            total_revenue = 0
            for row in rows:
                analytics.append({
                    'date': str(row[0]),
                    'order_count': row[1],
                    'revenue': float(row[2])
                })
                total_revenue += float(row[2])
            
            return {
                'success': True,
                'period': period,
                'total_revenue': total_revenue,
                'analytics': analytics
            }
    finally:
        await release_conn(conn)
```

### 📊 Sequence Diagram - Admin Chatbot Flow

```
Admin               Frontend            Backend             AI Service          Database
 │                     │                   │                     │                  │
 │  "Doanh thu T12"   │                   │                     │                  │
 │────────────────────▶│                   │                     │                  │
 │                     │  POST /api/       │                     │                  │
 │                     │  chatbot/admin    │                     │                  │
 │                     │──────────────────▶│                     │                  │
 │                     │                   │  Verify admin role  │                  │
 │                     │                   │─────────────────────────────────────▶│
 │                     │                   │◀─────────────────────────────────────│
 │                     │                   │  POST /chat/admin   │                  │
 │                     │                   │────────────────────▶│                  │
 │                     │                   │                     │  Classify intent │
 │                     │                   │                     │  = revenue_      │
 │                     │                   │                     │    analysis      │
 │                     │                   │                     │                  │
 │                     │                   │                     │  get_revenue_    │
 │                     │                   │                     │  analytics()     │
 │                     │                   │                     │─────────────────▶│
 │                     │                   │                     │  Query orders    │
 │                     │                   │                     │◀─────────────────│
 │                     │                   │                     │  [revenue data]  │
 │                     │                   │                     │                  │
 │                     │                   │                     │  LLM generate    │
 │                     │                   │                     │  insights        │
 │                     │                   │◀────────────────────│                  │
 │                     │                   │  {text, data}       │                  │
 │                     │◀──────────────────│                     │                  │
 │                     │  Response         │                     │                  │
 │◀────────────────────│                   │                     │                  │
 │  Display chart      │                   │                     │                  │
```

---

## 🎯 LUỒNG 3: LEGAL CHATBOT (Tư vấn pháp luật)

### 📱 Frontend → Backend → AI Service

```javascript
// 1. FRONTEND: User hỏi về luật
// File: frontend/src/pages/user/legal/LegalChatbot.jsx

const sendMessage = async (message) => {
  try {
    const response = await axios.post('/api/chatbot/legal', {
      message: message
    });
    
    setMessages([...messages, {
      role: 'assistant',
      content: response.data.response.text,
      citations: response.data.response.citations
    }]);
  } catch (error) {
    console.error('Legal chat error:', error);
  }
};
```

```javascript
// 2. BACKEND: Forward request
// File: backend/controller/chatbotController.js

export const legalChat = async (req, res) => {
  try {
    const { message } = req.body;
    
    // Forward to AI Service
    const aiResponse = await axios.post('http://localhost:5000/chat/legal', {
      message: message
    });
    
    res.json({
      success: true,
      response: aiResponse.data.response
    });
    
  } catch (error) {
    logger.error('Legal chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xử lý chat'
    });
  }
};
```

```python
# 3. AI SERVICE: RAG Processing
# File: ai/app.py

@app.route('/chat/legal', methods=['POST'])
async def chat_legal():
    try:
        data = request.json
        user_query = data.get('message')
        
        # Khởi tạo legal service
        from services.legal.improved_legal_service import improved_legal_service
        
        # Xử lý query với RAG
        response = await improved_legal_service.process_query(user_query)
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Legal chat error: {e}")
        return jsonify({
            'success': False,
            'response': {
                'text': 'Xin lỗi, hệ thống đang gặp sự cố.',
                'type': 'text'
            }
        }), 500
```

```python
# 4. AI SERVICE: RAG Implementation
# File: ai/services/legal/improved_legal_service.py

async def process_query(self, user_query):
    # Step 1: Search relevant legal documents
    relevant_docs = await self._search_documents(user_query)
    # Tìm trong documents/legal/*.txt
    
    # Step 2: Extract context from documents
    context = self._extract_context(relevant_docs, max_chars=8000)
    
    # Step 3: Generate response with LLM
    prompt = LEGAL_CONSULTANT_RAG_PROMPT.format(
        context=context,
        user_query=user_query
    )
    
    response = await self.llm_client.generate_simple(
        prompt=prompt,
        system_instruction=LEGAL_CONSULTANT_SYSTEM_PROMPT,
        temperature=0.3  # Lower for more factual
    )
    
    # Step 4: Extract citations
    citations = self._extract_citations(response['content'])
    
    return {
        'success': True,
        'response': {
            'text': response['content'],
            'type': 'legal_advice',
            'citations': citations
        }
    }
```

### 📊 Sequence Diagram - Legal Chatbot Flow

```
User                Frontend            Backend             AI Service          Documents
 │                     │                   │                     │                  │
 │  "Thuế TNCN?"      │                   │                     │                  │
 │────────────────────▶│                   │                     │                  │
 │                     │  POST /api/       │                     │                  │
 │                     │  chatbot/legal    │                     │                  │
 │                     │──────────────────▶│                     │                  │
 │                     │                   │  POST /chat/legal   │                  │
 │                     │                   │────────────────────▶│                  │
 │                     │                   │                     │  Search docs     │
 │                     │                   │                     │─────────────────▶│
 │                     │                   │                     │  "thuế TNCN"     │
 │                     │                   │                     │◀─────────────────│
 │                     │                   │                     │  [relevant docs] │
 │                     │                   │                     │                  │
 │                     │                   │                     │  Extract context │
 │                     │                   │                     │                  │
 │                     │                   │                     │  LLM generate    │
 │                     │                   │                     │  with context    │
 │                     │                   │◀────────────────────│                  │
 │                     │                   │  {text, citations}  │                  │
 │                     │◀──────────────────│                     │                  │
 │                     │  Response         │                     │                  │
 │◀────────────────────│                   │                     │                  │
 │  Display answer     │                   │                     │                  │
```

---

## 🔐 AUTHENTICATION FLOW

```javascript
// Frontend gửi kèm token trong header
const sendMessage = async (message) => {
  const token = localStorage.getItem('token');
  
  const response = await axios.post('/api/chatbot/user', 
    { message },
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
};
```

```javascript
// Backend verify token trước khi forward
export const userChat = async (req, res) => {
  // Token đã được verify bởi authenticateToken middleware
  const userId = req.user.id;
  
  // Forward to AI Service với user_id
  const aiResponse = await axios.post('http://localhost:5000/chat/user', {
    message: req.body.message,
    user_id: userId
  });
  
  res.json(aiResponse.data);
};
```

---

## 📊 DATA FLOW SUMMARY

### Request Flow:
```
Frontend (React)
    │
    │ HTTP POST /api/chatbot/user
    │ Headers: { Authorization: Bearer <token> }
    │ Body: { message, session_id }
    ▼
Backend (Node.js)
    │
    │ 1. Verify JWT token
    │ 2. Get user info from DB
    │ 3. Add user context
    │
    │ HTTP POST http://localhost:5000/chat/user
    │ Body: { message, session_id, user_id, user_context }
    ▼
AI Service (Python)
    │
    │ 1. Detect intent
    │ 2. Call tools (query DB)
    │ 3. LLM generate response
    │ 4. Save conversation history
    │
    │ Return: { success, response: { text, type, data } }
    ▼
Backend (Node.js)
    │
    │ Forward response
    │
    │ Return: { success, response }
    ▼
Frontend (React)
    │
    │ Display message + products
    └─ Update UI
```

### Response Flow:
```
AI Service Response:
{
  "success": true,
  "response": {
    "text": "Dạ bên em có mấy mẫu bàn này...",
    "type": "product_recommendation",
    "data": [
      {
        "id": 1,
        "name": "Bàn Smart Desk F42",
        "price": 4500000,
        "sale_price": 3990000,
        "image_url": "...",
        "link": "/san-pham/1"
      }
    ]
  },
  "agent_type": "user_chatbot_improved"
}
```

---

## 🚀 DEPLOYMENT ARCHITECTURE

```
Production Environment:

┌─────────────────────────────────────────────────────────┐
│                      NGINX (Reverse Proxy)              │
│                         Port: 80/443                     │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Frontend   │   │   Backend    │   │  AI Service  │
│   (Static)   │   │   (PM2)      │   │  (Gunicorn)  │
│              │   │   Port: 3000 │   │  Port: 5000  │
└──────────────┘   └──────────────┘   └──────────────┘
                            │                   │
                            └───────┬───────────┘
                                    │
                            ┌───────▼────────┐
                            │   MySQL DB     │
                            │   Port: 3306   │
                            └────────────────┘
```

### NGINX Configuration:
```nginx
# Frontend
location / {
    root /var/www/frontend/dist;
    try_files $uri /index.html;
}

# Backend API
location /api/ {
    proxy_pass http://localhost:3000/api/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
}

# AI Service (không expose ra ngoài)
# Chỉ Backend mới gọi được
```

---

## 🔍 ERROR HANDLING

### Frontend Error Handling:
```javascript
const sendMessage = async (message) => {
  try {
    const response = await axios.post('/api/chatbot/user', { message });
    
    if (!response.data.success) {
      throw new Error(response.data.message);
    }
    
    return response.data;
    
  } catch (error) {
    if (error.response?.status === 401) {
      // Token expired
      router.push('/login');
    } else if (error.response?.status === 500) {
      // Server error
      toast.error('Hệ thống đang bận, vui lòng thử lại sau');
    } else {
      // Network error
      toast.error('Lỗi kết nối, vui lòng kiểm tra internet');
    }
  }
};
```

### Backend Error Handling:
```javascript
export const userChat = async (req, res) => {
  try {
    const aiResponse = await axios.post('http://localhost:5000/chat/user', ...);
    res.json(aiResponse.data);
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      // AI Service down
      logger.error('AI Service is down');
      return res.status(503).json({
        success: false,
        message: 'AI Service không khả dụng'
      });
    }
    
    logger.error('Chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống'
    });
  }
};
```

### AI Service Error Handling:
```python
@app.route('/chat/user', methods=['POST'])
async def chat_user():
    try:
        response = await agent.process_message(...)
        return jsonify(response)
        
    except DatabaseError as e:
        logger.error(f"Database error: {e}")
        return jsonify({
            'success': False,
            'response': {
                'text': 'Lỗi kết nối database',
                'type': 'error'
            }
        }), 500
        
    except LLMError as e:
        logger.error(f"LLM error: {e}")
        return jsonify({
            'success': False,
            'response': {
                'text': 'Lỗi AI service',
                'type': 'error'
            }
        }), 500
```

---

## 📈 PERFORMANCE OPTIMIZATION

### 1. Caching (Backend):
```javascript
// Cache user context
const userContextCache = new Map();

export const userChat = async (req, res) => {
  const userId = req.user.id;
  
  // Check cache
  let userContext = userContextCache.get(userId);
  
  if (!userContext) {
    // Query DB
    const user = await prisma.user.findUnique({ where: { id: userId } });
    userContext = `User: ${user.firstName} ${user.lastName}`;
    
    // Cache for 5 minutes
    userContextCache.set(userId, userContext);
    setTimeout(() => userContextCache.delete(userId), 5 * 60 * 1000);
  }
  
  // Forward to AI Service
  const aiResponse = await axios.post('http://localhost:5000/chat/user', {
    message: req.body.message,
    user_context: userContext
  });
  
  res.json(aiResponse.data);
};
```

### 2. Connection Pooling (AI Service):
```python
# ai/core/db.py
pool = await aiomysql.create_pool(
    host=DB_CONFIG['host'],
    port=DB_CONFIG['port'],
    user=DB_CONFIG['user'],
    password=DB_CONFIG['password'],
    db=DB_CONFIG['database'],
    minsize=5,    # Minimum connections
    maxsize=20,   # Maximum connections
    pool_recycle=3600  # Recycle after 1 hour
)
```

### 3. Response Streaming (Future):
```python
# Stream response từ LLM
@app.route('/chat/user/stream', methods=['POST'])
async def chat_user_stream():
    async def generate():
        async for chunk in agent.process_message_stream(...):
            yield f"data: {json.dumps(chunk)}\n\n"
    
    return Response(generate(), mimetype='text/event-stream')
```

---

**Created**: 2025-12-29  
**Version**: 1.0  
**Status**: ✅ COMPLETE
