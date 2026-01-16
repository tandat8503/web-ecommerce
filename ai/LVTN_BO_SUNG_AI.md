# 📚 HƯỚNG DẪN BỔ SUNG LUẬN VĂN - PHẦN TÍCH HỢP AI

## 📌 YÊU CẦU GIÁO VIÊN

Giáo viên yêu cầu thêm tài liệu về:
1. Các bước triển khai AI vào web bán hàng
2. Dòng chảy dữ liệu (Data Flow)
3. Sơ đồ tổng quát và luồng xử lý
4. Code ví dụ minh họa
5. Kiến thức lý thuyết AI

---

## 📖 NỘI DUNG CẦN BỔ SUNG VÀO LUẬN VĂN

### **PHẦN 1: CÁC BƯỚC TRIỂN KHAI AI VÀO WEB BÁN HÀNG**

#### **Bước 1: Chuẩn bị dữ liệu (Embedding Pipeline)**

**Mục đích:** Chuyển đổi dữ liệu văn bản (sản phẩm, chính sách) thành dạng vector số để AI có thể tìm kiếm và so sánh.

**Quy trình:**
```
MySQL Database ──> Python Script ──> Embedding Model ──> Vector Database
(Products)         (embedding.py)   (SentenceTransformer)  (ChromaDB)
```

**Code thực tế trong hệ thống:**
```python
# ai/services/chatbot/product_vector_service.py
from sentence_transformers import SentenceTransformer
import chromadb

class ProductVectorService:
    def __init__(self):
        # Khởi tạo model embedding
        self.model = SentenceTransformer('intfloat/multilingual-e5-small')
        
        # Kết nối Vector Database
        self.chroma_client = chromadb.PersistentClient(path="./chroma_db")
        self.collection = self.chroma_client.get_or_create_collection("products")
    
    def embed_products(self, products):
        """Chuyển đổi thông tin sản phẩm thành vector"""
        for product in products:
            # Tạo văn bản mô tả sản phẩm
            text = f"{product['name']} - {product['description']} - {product['category']}"
            
            # Chuyển thành vector (dãy số)
            vector = self.model.encode(text).tolist()
            
            # Lưu vào Vector Database
            self.collection.add(
                ids=[str(product['id'])],
                embeddings=[vector],
                documents=[text],
                metadatas=[{"name": product['name'], "price": product['price']}]
            )
```

**Lợi ích:** Khi thêm sản phẩm mới vào MySQL, chạy lại script embedding → AI tự động "biết" sản phẩm mới.

---

#### **Bước 2: Xử lý truy vấn (Retrieval)**

**Khi khách hàng hỏi:** "Tôi muốn tìm bàn làm việc dưới 5 triệu"

**Quy trình:**
```
User Query ──> Embedding ──> Vector Search ──> Top K Products ──> Context
"bàn 5tr"     [0.1, 0.3...]  ChromaDB         [Bàn A, B, C]      
```

**Code thực tế:**
```python
# ai/services/chatbot/improved_user_chatbot.py
async def search_similar_products(self, query: str, top_k: int = 5):
    """Tìm sản phẩm tương tự bằng Vector Search"""
    # 1. Chuyển câu hỏi thành vector
    query_vector = self.model.encode(query).tolist()
    
    # 2. Tìm kiếm trong Vector Database
    results = self.collection.query(
        query_embeddings=[query_vector],
        n_results=top_k
    )
    
    # 3. Trả về danh sách sản phẩm phù hợp
    return results['documents'], results['metadatas']
```

---

#### **Bước 3: Tạo Prompt và Gọi LLM (Generation)**

**Quy trình:**
```
Context (Products) + User Query ──> Prompt ──> Gemini API ──> Response
[Bàn A, B, C]       "bàn 5tr"       Template    LLM           "Dạ có 3 mẫu..."
```

**Code thực tế:**
```python
# ai/services/chatbot/improved_user_chatbot.py
async def generate_response(self, query: str, products: list):
    """Tạo câu trả lời bằng LLM"""
    
    # 1. Tạo Prompt với context
    prompt = f"""
    Bạn là AI tư vấn bán nội thất văn phòng.
    
    Dựa vào các sản phẩm sau:
    {products}
    
    Hãy trả lời câu hỏi của khách hàng: {query}
    
    Yêu cầu:
    - Trả lời bằng tiếng Việt, thân thiện
    - Giới thiệu sản phẩm phù hợp với nhu cầu
    - Đề cập giá và đặc điểm nổi bật
    """
    
    # 2. Gọi Gemini API
    response = await self.llm_client.generate_content(prompt)
    
    return response.text
```

---

#### **Bước 4: Hiển thị Frontend (React)**

**Code thực tế:**
```javascript
// frontend/src/pages/user/chatbox/ChatWidget.jsx
const handleSend = async () => {
  // 1. Gửi tin nhắn đến AI Service
  const response = await aiChatbotAPI.sendMessage(input, sessionId);
  
  // 2. Hiển thị response (hỗ trợ Markdown)
  const botMsg = {
    from: "bot",
    text: response.response.text,
    data: response.response.data  // Danh sách sản phẩm
  };
  
  setMessages(prev => [...prev, botMsg]);
};

// 3. Render sản phẩm cards
{msg.data && msg.data.map(product => (
  <ProductCard key={product.id} product={product} />
))}
```

---

### **PHẦN 2: SƠ ĐỒ KIẾN TRÚC HỆ THỐNG AI**

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                            │
│  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐         │
│  │ ChatWidget    │   │ ProductCard   │   │ ReactMarkdown │         │
│  └───────┬───────┘   └───────────────┘   └───────────────┘         │
│          │ HTTP POST /chat                                          │
└──────────┼──────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      AI SERVICE (FastAPI - Python)                  │
│  Port: 8000                                                         │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    /chat Endpoint                              │ │
│  │  1. Nhận message + session_id                                  │ │
│  │  2. Lấy conversation history                                   │ │
│  │  3. Detect Intent (greeting, search, comparison...)           │ │
│  └───────────────────────┬───────────────────────────────────────┘ │
│                          │                                          │
│  ┌───────────────────────▼───────────────────────────────────────┐ │
│  │              ImprovedUserChatbotService                        │ │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │ │
│  │  │ Intent      │───>│ Hybrid      │───>│ LLM Client  │        │ │
│  │  │ Detection   │    │ Search      │    │ (Gemini)    │        │ │
│  │  └─────────────┘    └──────┬──────┘    └─────────────┘        │ │
│  │                            │                                    │ │
│  │         ┌──────────────────┼──────────────────┐                │ │
│  │         ▼                  ▼                  ▼                │ │
│  │  ┌───────────┐     ┌─────────────┐    ┌─────────────┐         │ │
│  │  │ SQL Search│     │VectorSearch │    │Conversation │         │ │
│  │  │ (MySQL)   │     │ (ChromaDB)  │    │   Memory    │         │ │
│  │  └───────────┘     └─────────────┘    └─────────────┘         │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
           │                    │
           ▼                    ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    MySQL        │    │   ChromaDB      │    │   Gemini API    │
│  (Products DB)  │    │ (Vector Store)  │    │  (Google Cloud) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

### **PHẦN 3: LUỒNG XỬ LÝ CHI TIẾT (SEQUENCE DIAGRAM)**

**Add this to your thesis:**

```
User              Frontend           AI Service         ChromaDB        Gemini API
 │                   │                   │                 │                │
 │──"Tìm bàn 5tr"──>│                   │                 │                │
 │                   │──POST /chat────>│                 │                │
 │                   │                   │                 │                │
 │                   │                   │──query vector──>│                │
 │                   │                   │<──top 5 prods───│                │
 │                   │                   │                 │                │
 │                   │                   │──prompt+context────────────────>│
 │                   │                   │<──"Dạ có 3 mẫu bàn..."──────────│
 │                   │                   │                 │                │
 │                   │<──response+data──│                 │                │
 │<──render cards────│                   │                 │                │
 │                   │                   │                 │                │
```

---

### **PHẦN 4: LÝ THUYẾT CẦN NẮM**

#### **4.1 RAG (Retrieval-Augmented Generation)**

**Định nghĩa:** RAG là kỹ thuật kết hợp giữa:
- **Retrieval**: Tìm kiếm thông tin liên quan từ database
- **Augmentation**: Bổ sung thông tin vào prompt
- **Generation**: Tạo câu trả lời bằng LLM

**Lợi ích:**
- Không cần fine-tune model → tiết kiệm chi phí
- AI luôn cập nhật thông tin mới nhất từ database
- Giảm "hallucination" (AI bịa thông tin)

#### **4.2 Vector Embeddings**

**Định nghĩa:** Biểu diễn văn bản dưới dạng vector số nhiều chiều.

**Ví dụ:**
```
"Bàn làm việc gỗ" → [0.12, 0.45, -0.23, ...] (384 dimensions)
"Bàn văn phòng"   → [0.11, 0.44, -0.22, ...] (similar vector)
"Ghế xoay"        → [0.78, -0.31, 0.56, ...] (different vector)
```

**So sánh tương đồng:** Cosine Similarity
- Vectors gần nhau = Nội dung liên quan
- Vectors xa nhau = Nội dung khác biệt

#### **4.3 Hybrid Search**

**Trong hệ thống của bạn:**
```python
def _is_complex_query(self, query: str) -> bool:
    """Phân loại query đơn giản/phức tạp"""
    complex_keywords = ["tư vấn", "phù hợp", "nên mua", "so sánh"]
    
    if any(kw in query.lower() for kw in complex_keywords):
        return True  # Dùng Vector Search
    return False     # Dùng SQL Search
```

**Khi nào dùng gì:**
- **SQL Search**: "Tìm bàn chữ L" → Exact match
- **Vector Search**: "Bàn phù hợp cho lập trình viên" → Semantic match

---

### **PHẦN 5: TECH STACK CHI TIẾT**

| Component | Technology | Purpose |
|-----------|------------|---------|
| LLM | Google Gemini 2.0 Flash | Generate responses |
| Embeddings | intfloat/multilingual-e5-small | Text → Vector |
| Vector DB | ChromaDB | Store & search vectors |
| API Framework | FastAPI (Python) | AI Service endpoints |
| Frontend | React + Axios | Chat interface |
| Backend | Node.js + Express | Main e-commerce API |
| Database | MySQL + Prisma | Product data |

---

### **PHẦN 6: LỢI ÍCH CỦA KIẾN TRÚC NÀY**

1. **Tự động cập nhật kiến thức:**
   - Thêm sản phẩm mới vào MySQL
   - Chạy embedding script
   - AI tự động "biết" sản phẩm mới

2. **Không cần train AI:**
   - Sử dụng pre-trained models
   - RAG cung cấp context từ database
   - Tiết kiệm thời gian và chi phí

3. **Khả năng mở rộng:**
   - Thêm domain mới (Legal chatbot)
   - Modular architecture
   - Dễ bảo trì

---

## ✅ CHECKLIST BỔ SUNG LUẬN VĂN

- [ ] Thêm sơ đồ kiến trúc AI (phần 2)
- [ ] Thêm sequence diagram (phần 3)
- [ ] Giải thích RAG, Embedding, Hybrid Search (phần 4)
- [ ] Thêm bảng tech stack (phần 5)
- [ ] Code minh họa các bước (phần 1)
- [ ] Sơ đồ data flow

---

**File được tạo:** 2026-01-13
