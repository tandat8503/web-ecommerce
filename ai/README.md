# 🤖 AI Service - E-commerce Legal Assistant

Hệ thống AI tư vấn pháp luật cho doanh nghiệp e-commerce, sử dụng RAG (Retrieval-Augmented Generation) để trả lời câu hỏi về luật doanh nghiệp, thuế, lao động.

---

## 📋 Mục Lục

1. [Tổng Quan](#-tổng-quan)
2. [Công Nghệ](#-công-nghệ)
3. [Cấu Trúc Project](#-cấu-trúc-project)
4. [Cài Đặt](#-cài-đặt)
5. [Sử Dụng](#-sử-dụng)
6. [Workflow Chi Tiết](#-workflow-chi-tiết)
7. [API Endpoints](#-api-endpoints)
8. [Testing](#-testing)
9. [Troubleshooting](#-troubleshooting)

---

## 🎯 Tổng Quan

### **Chức Năng Chính:**

1. **Legal Assistant (Chatbot Admin):**
   - Tư vấn pháp luật doanh nghiệp
   - Trả lời câu hỏi về thuế, lao động, đầu tư
   - Dẫn chứng chính xác từ văn bản pháp luật

2. **Tax Calculator:**
   - Tính thuế thu nhập cá nhân (TNCN)
   - Tính bảo hiểm (BHXH, BHYT, BHTN)
   - Hiển thị chi tiết các khoản giảm trừ

3. **User Chatbot:**
   - Hỗ trợ khách hàng
   - Tìm kiếm sản phẩm
   - Trả lời FAQ

### **Kết Quả Đạt Được:**

| Metric | Kết Quả | Đánh Giá |
|--------|---------|----------|
| **Đúng văn bản** | 100% (5/5) | ✅ Excellent |
| **Đúng Điều** | 40% (2/5) | ⚠️ Acceptable |
| **Total chunks** | 1,621 | ✅ Good coverage |
| **Documents** | 7 luật | ✅ Complete |

---

## 🛠️ Công Nghệ

### **Core Technologies:**

- **Backend:** Python 3.11, Flask
- **Vector Database:** ChromaDB
- **Embedding Model:** intfloat/multilingual-e5-small
- **LLM:** Google Gemini 1.5 Flash
- **PDF Parsing:** PyMuPDF, python-docx

### **Chunking Strategy:**

Document Structure-based Chunking:
```
Văn bản pháp luật
  └── Chương (Chapter)
      └── Điều (Article)
          └── Khoản (Clause)
              └── Điểm (Point)
```

Mỗi chunk chứa:
- Text gốc của Điều/Khoản/Điểm
- Context injection (tên luật, chương, điều)
- Metadata (doc_name, article, chapter, source_id)

---

## 📁 Cấu Trúc Project

```
ai/
├── README.md                       # File này
├── app.py                          # Main Flask application
├── prompts.py                      # LLM prompts
├── agents.py                       # Agent definitions
│
├── core/                           # Core modules
│   ├── config.py                   # Configuration
│   ├── conversation.py             # Conversation management
│   ├── db.py                       # Database connection
│   ├── exceptions.py               # Custom exceptions
│   ├── logging.py                  # Logging setup
│   └── utils.py                    # Utility functions
│
├── shared/                         # Shared modules
│   ├── llm_client.py               # LLM client (Gemini)
│   └── models.py                   # Data models
│
├── services/                       # Business logic
│   ├── legal/                      # Legal RAG system ⭐
│   │   ├── parser.py               # Parse PDF/DOC → text
│   │   ├── chunker.py              # Chunk theo cấu trúc luật
│   │   ├── vector_service.py       # Embedding & ChromaDB
│   │   ├── legal_service.py        # RAG pipeline (MAIN)
│   │   ├── improved_legal_service.py  # Enhanced version
│   │   ├── tax_calculator.py       # Tax calculation
│   │   └── constants.py            # Constants
│   │
│   ├── chatbot/                    # Chatbot services
│   │   ├── search.py               # Search service
│   │   └── improved_user_chatbot.py  # User chatbot
│   │
│   ├── analyst/                    # Analytics
│   ├── report/                     # Reporting
│   ├── sentiment/                  # Sentiment analysis
│   └── moderation/                 # Content moderation
│
├── scripts/                        # Utility scripts ⭐
│   ├── parse_to_json.py            # Parse PDF → JSON
│   ├── embed_from_json.py          # Embed JSON → VectorDB
│   ├── test_current_system.py      # Test accuracy
│   └── reprocess_legal_documents.py  # Main reprocess script
│
├── luat_VN/                        # Legal documents (PDF/DOC)
│   ├── 67-VBHN-VPQH.docx          # Luật Doanh Nghiệp 2020
│   ├── 125-vbhn-vpqh.pdf          # Bộ Luật Lao Động 2019
│   ├── 134-vbhn-vpqh.pdf          # Luật Đầu Tư 2020
│   ├── thue_gtgt.pdf              # Luật Thuế GTGT 2024
│   ├── 103-vbhn-vpqh.pdf          # Luật Thuế TNCN 2007
│   ├── 2023_575+576_22-VBHN-VPQH.pdf  # Luật Thuế TNDN 2008
│   └── 123.signed_01.pdf          # Nghị định 123 (scan)
│
├── chroma_db/                      # VectorDB storage
│   └── legal_documents/            # Legal chunks collection
│
└── venv/                           # Python virtual environment
```

---

## ⚙️ Cài Đặt

### **1. Prerequisites:**

```bash
# Python 3.11+
python --version

# Node.js (for backend server)
node --version
```

### **2. Setup Virtual Environment:**

```bash
cd /path/to/web-ecommerce/ai

# Create virtual environment
python3 -m venv venv

# Activate
source venv/bin/activate  # macOS/Linux
# hoặc
venv\Scripts\activate  # Windows
```

### **3. Install Dependencies:**

```bash
pip install -r requirements.txt
```

**Key dependencies:**
- `chromadb` - Vector database
- `sentence-transformers` - Embedding model
- `google-generativeai` - Gemini LLM
- `PyMuPDF` - PDF parsing
- `python-docx` - DOC parsing
- `flask` - Web framework

### **4. Environment Variables:**

Tạo file `.env` trong thư mục `ai/`:

```env
# Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce

# ChromaDB
CHROMA_DB_PATH=./chroma_db

# Flask
FLASK_ENV=development
FLASK_DEBUG=True
```

---

## 🚀 Sử Dụng

### **A. Sử Dụng Chatbot (Qua UI)**

#### **1. Start Backend Server:**

```bash
# Terminal 1: Start AI service
cd /path/to/web-ecommerce/ai
source venv/bin/activate
python app.py

# Terminal 2: Start backend server
cd /path/to/web-ecommerce/backend
npm run dev
```

#### **2. Access Admin Chatbot:**

```
URL: http://localhost:5000/admin/chatbot
```

#### **3. Sample Queries:**

**Legal Questions:**
```
- "Điều kiện thành lập công ty TNHH là gì?"
- "Người đại diện theo pháp luật có những quyền gì?"
- "Thủ tục đăng ký kinh doanh như thế nào?"
- "Quy định về thuế GTGT cho sản phẩm điện tử?"
```

**Tax Calculation:**
```
- "Lương 50 triệu đóng thuế bao nhiêu?"
- "Tính thuế TNCN cho lương 30 triệu, 2 người phụ thuộc"
- "Giảm trừ gia cảnh là bao nhiêu?"
```

---

### **B. Re-process Legal Documents (Khi Cần)**

#### **Khi nào cần re-process?**

- Thêm văn bản pháp luật mới
- Cập nhật văn bản hiện có
- VectorDB bị corrupt
- Thay đổi chunking strategy

#### **Workflow:**

```bash
cd /path/to/web-ecommerce/ai
source venv/bin/activate

# Bước 1: Parse PDF/DOC → JSON
python scripts/parse_to_json.py

# Bước 2: Review JSON
# Mở file scripts/legal_documents.json để kiểm tra

# Bước 3: Embed JSON → VectorDB (xóa data cũ)
python scripts/embed_from_json.py --clear
# Nhập 'yes' khi được hỏi confirm

# Bước 4: Test accuracy
python scripts/test_current_system.py
```

#### **Output:**

```
✅ Embedding complete!
Total chunks in DB: 1621

🔍 Verifying by sampling...
Query: 'Người đại diện theo pháp luật'
  Top result:
    Doc: Luật Doanh Nghiệp 2020
    Article: Điều 12
    Distance: 0.2065
```

---

### **C. Thêm Văn Bản Pháp Luật Mới**

#### **Bước 1: Thêm file PDF/DOC**

```bash
# Copy file vào thư mục luat_VN/
cp /path/to/new_law.pdf ai/luat_VN/
```

#### **Bước 2: Update mapping trong parser**

Mở file `services/legal/parser.py`, tìm method `guess_law_name_from_filename()`:

```python
def guess_law_name_from_filename(self, filename: str) -> str:
    mapping = {
        # ... existing mappings ...
        
        # Thêm mapping mới
        "new_law": "Luật Mới 2024",
        "123-new": "Luật Mới 2024",
    }
    # ...
```

#### **Bước 3: Re-process**

```bash
python scripts/parse_to_json.py
python scripts/embed_from_json.py --clear
python scripts/test_current_system.py
```

---

## 🔄 Workflow Chi Tiết

### **1. Parse PDF/DOC → Text**

**File:** `services/legal/parser.py`

**Input:** PDF/DOC file

**Process:**
1. Detect file type (PDF/DOC)
2. Extract raw text
3. Clean text (remove noise, normalize whitespace)
4. Extract document name
5. Extract metadata from filename

**Output:** 
```python
{
    "text": "LUẬT\nDOANH NGHIỆP\n...",
    "doc_name": "Luật Doanh Nghiệp 2020",
    "source_id": "67"
}
```

**Key Methods:**
- `parse_file()` - Main parsing
- `extract_doc_name()` - Extract tên luật
- `guess_law_name_from_filename()` - Fallback mapping

---

### **2. Chunk Document → Structured Chunks**

**File:** `services/legal/chunker.py`

**Input:** Raw text + metadata

**Process:**
1. Split by Chapters (Chương)
2. Split by Articles (Điều)
3. Split by Clauses (Khoản)
4. Split by Points (Điểm)
5. Inject context for embedding
6. Generate unique chunk IDs

**Output:**
```python
{
    "id": "67_VBHN_VPQH_D13_K1",
    "text_for_embedding": "Luật: Luật Doanh Nghiệp 2020. Điều 13: Trách nhiệm của người đại diện theo pháp luật...",
    "metadata": {
        "doc_name": "Luật Doanh Nghiệp 2020",
        "doc_type": "Luật",
        "article": "Điều 13",
        "article_title": "Trách nhiệm của người đại diện theo pháp luật",
        "chapter": "Chương I",
        "source_id": "67",
        "status": "active"
    }
}
```

**Key Methods:**
- `chunk_document()` - Main chunking logic
- `enrich_text_for_embedding()` - Add context
- `generate_chunk_id()` - Generate unique ID

---

### **3. Embed & Store → VectorDB**

**File:** `services/legal/vector_service.py`

**Input:** List of chunks

**Process:**
1. Load embedding model (multilingual-e5-small)
2. Generate embeddings in batches
3. Handle OOM (Out of Memory) gracefully
4. Upsert to ChromaDB

**Output:** VectorDB với 1,621 chunks

**Key Methods:**
- `embed_chunks()` - Generate embeddings
- `upsert_chunks()` - Store to ChromaDB
- `search()` - Vector similarity search

**Embedding Model:**
- Model: `intfloat/multilingual-e5-small`
- Dimension: 384
- Language: Multilingual (Vietnamese supported)

---

### **4. RAG Pipeline → Answer**

**File:** `services/legal/legal_service.py`

**Input:** User query

**Process:**
1. **Intent Classification:**
   - Legal query → RAG pipeline
   - Tax query → Tax calculator

2. **Vector Search:**
   - Embed query
   - Search top_k=30 chunks
   - Filter by doc_type, status

3. **Context Construction:**
   - Group chunks by document
   - Format with citations
   - Add metadata

4. **LLM Generation:**
   - Send context + query to Gemini
   - Generate answer with citations
   - Format response

**Output:**
```
Dựa vào các văn bản pháp luật sau đây:

---
[Văn bản 1] Luật - Luật Doanh Nghiệp 2020
Tham chiếu: Điều 13, "Trách nhiệm của người đại diện theo pháp luật"
Nội dung: ...

Trả lời: ...
```

**Key Methods:**
- `handle_query()` - Main entry point
- `_handle_legal_query()` - RAG pipeline
- `_handle_tax_query()` - Tax calculator

---

## 🌐 API Endpoints

### **1. Legal Consultation**

```http
POST /api/legal/consult
Content-Type: application/json

{
  "query": "Điều kiện thành lập công ty TNHH?",
  "top_k": 30
}
```

**Response:**
```json
{
  "answer": "Dựa vào Luật Doanh Nghiệp 2020, Điều 4...",
  "sources": [
    {
      "doc_name": "Luật Doanh Nghiệp 2020",
      "article": "Điều 4",
      "distance": 0.18
    }
  ]
}
```

### **2. Tax Calculation**

```http
POST /api/legal/calculate-tax
Content-Type: application/json

{
  "gross_salary": 50000000,
  "dependents": 2
}
```

**Response:**
```json
{
  "gross_salary": 50000000,
  "insurance": {
    "bhxh": 3744000,
    "bhyt": 702000,
    "bhtn": 500000,
    "total": 4946000
  },
  "deductions": {
    "personal": 11000000,
    "dependents": 8800000,
    "total": 24746000
  },
  "taxable_income": 25254000,
  "tax": 2525400,
  "net_salary": 42528600
}
```

---

## 🧪 Testing

### **1. Test Accuracy:**

```bash
python scripts/test_current_system.py
```

**Output:**
```
================================================================================
📊 TỔNG KẾT TEST
================================================================================

Kết quả:
  - Tổng số test: 5
  - Tìm thấy kết quả: 5/5 (100.0%)
  - Đúng văn bản: 5/5 (100.0%)
  - Đúng điều: 2/5 (40.0%)
  - Hoàn toàn chính xác: 2/5 (40.0%)
```

### **2. Test Search:**

```python
from services.legal.vector_service import LegalVectorService

vector_service = LegalVectorService()
results = vector_service.search(
    query="Người đại diện theo pháp luật",
    top_k=5
)

for r in results:
    print(f"{r['metadata']['doc_name']} - {r['metadata']['article']}")
```

### **3. Check VectorDB Stats:**

```python
stats = vector_service.get_collection_stats()
print(stats)
# {'total_chunks': 1621, 'unique_docs': 7}
```

---

## 🐛 Troubleshooting

### **Problem 1: VectorDB Empty**

**Symptoms:**
```
Total chunks in DB: 0
```

**Solution:**
```bash
# Re-embed data
python scripts/embed_from_json.py --clear
```

---

### **Problem 2: Wrong Document Names**

**Symptoms:**
```
Doc name: "LUẬT\nD" (corrupt)
```

**Solution:**
1. Check `parser.py` → `extract_doc_name()`
2. Update `guess_law_name_from_filename()` mapping
3. Re-parse and re-embed

---

### **Problem 3: Low Accuracy**

**Symptoms:**
```
Đúng điều: 1/5 (20%)
```

**Solutions:**
1. **Increase top_k:** 20 → 30 (done)
2. **Implement LLM re-ranking:** (30 phút)
3. **Hybrid search (BM25 + Vector):** (1-2 giờ)
4. **Fine-tune embedding model:** (1-2 tuần)

---

### **Problem 4: OOM During Embedding**

**Symptoms:**
```
Out of memory at batch 10
```

**Solution:**
- System tự động giảm batch_size
- Nếu vẫn lỗi: Giảm `embedding_batch_size` trong `embed_from_json.py`

---

## 📚 Tài Liệu Tham Khảo

### **Văn Bản Pháp Luật:**
- Luật Doanh Nghiệp 2020 (67/2020/QH14)
- Bộ Luật Lao Động 2019 (45/2019/QH14)
- Luật Đầu Tư 2020 (61/2020/QH14)
- Luật Thuế GTGT 2024 (48/2024/QH15)
- Luật Thuế TNDN 2008 (14/2008/QH12)
- Luật Thuế TNCN 2007 (04/2007/QH12)

### **Technical Docs:**
- [ChromaDB Documentation](https://docs.trychroma.com/)
- [Sentence Transformers](https://www.sbert.net/)
- [Google Gemini API](https://ai.google.dev/docs)

---

## 👥 Contributors

- **Tan Dat** - Developer

---

## 📝 License

Private - E-commerce Project

---

**Last Updated:** 2026-01-12  
**Version:** 1.0  
**Status:** ✅ Production Ready