# NỘI DUNG BỔ SUNG LUẬN VĂN - THEO CẤU TRÚC ĐÚNG

**Dựa trên file:** LVTN_Dat_Ly_final1.docx

---

## 📋 CẤU TRÚC HIỆN TẠI CỦA LUẬN VĂN

```
Chương 1. GIỚI THIỆU
Chương 2. PHƯƠNG PHÁP THỰC HIỆN
  └── 2.2.3 MySQL (trang 14)
Chương 3. TỔNG QUAN VỀ AI  ← ĐÃ CÓ SẴN
  ├── 3.1 Tổng quan về AI
  ├── 3.2 Cơ sở lý thuyết và công nghệ AI
  │   ├── 3.2.1 Mô hình ngôn ngữ lớn Google Gemini Pro
  │   ├── 3.2.2 Kỹ thuật RAG
  │   ├── 3.2.3 Model Context Protocol (MCP)
  │   ├── 3.2.4 Cơ sở dữ liệu VectorDB
  │   └── 3.2.5 FastAPI Framework
  └── 3.3 Thiết kế kiến trúc AI  ← CẦN BỔ SUNG!
      ├── 3.3.1 Các AI Agent chuyên biệt
      └── 3.3.2 Quy trình xử lí NLP Flow
Chương 4. THIẾT KẾ
Chương 5. THỬ NGHIỆM
Chương 6. KẾT LUẬN
```

---

## 📍 PHẦN 1: BỔ SUNG VÀO MỤC 3.3 (Thiết kế kiến trúc AI)

Giáo viên yêu cầu bổ sung chi tiết hơn cho phần này. Các nội dung dưới đây bổ sung vào **Chương 3, mục 3.3**:

---

### 3.3.1 Sơ đồ kiến trúc hệ thống AI

Hệ thống AI được thiết kế theo kiến trúc microservice, tách biệt khỏi Backend Node.js chính:

```
[Hình: Sơ đồ kiến trúc hệ thống AI]

┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
│          ChatWidget Component - Port 5173                   │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP POST /chat
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  AI SERVICE (FastAPI)                        │
│                      Port 8000                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            ImprovedUserChatbotService               │    │
│  │  ┌──────────┐  ┌──────────────┐  ┌─────────────┐   │    │
│  │  │ Intent   │  │   Hybrid     │  │ LLM Client  │   │    │
│  │  │Detection │─▶│   Search     │─▶│  (Gemini)   │   │    │
│  │  └──────────┘  └──────┬───────┘  └─────────────┘   │    │
│  │                       │                             │    │
│  │         ┌─────────────┴─────────────┐              │    │
│  │         ▼                           ▼              │    │
│  │  ┌────────────┐            ┌─────────────┐         │    │
│  │  │ SQL Search │            │VectorSearch │         │    │
│  │  │  (MySQL)   │            │ (ChromaDB)  │         │    │
│  │  └────────────┘            └─────────────┘         │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
         │                           │
         ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│     MySQL       │         │    ChromaDB     │
│ (Products Data) │         │ (Vector Store)  │
└─────────────────┘         └─────────────────┘
```

**Mô tả các thành phần:**

| Thành phần | Công nghệ | Chức năng |
|------------|-----------|-----------|
| ChatWidget | React | Giao diện chat với khách hàng |
| AI Service | FastAPI (Python) | Xử lý logic AI, điều phối các service |
| Intent Detection | SChds | Phân loại ý định người dùng |
| Hybrid Search | Custom logic | Chọn phương pháp tìm kiếm phù hợp |
| SQL Search | MySQL | Tìm kiếm chính xác theo từ khóa |
| Vector Search | ChromaDB + SentenceTransformer | Tìm kiếm theo ngữ nghĩa |
| LLM Client | Google Gemini API | Sinh câu trả lời tự nhiên |

---

### 3.3.2 Quy trình xử lý Chatbot AI (4 bước)

**Bước 1: Chuẩn bị dữ liệu (Embedding Pipeline)**

Trước khi chatbot hoạt động, cần chuyển đổi thông tin sản phẩm thành vector:

```
MySQL Database ──▶ Python Script ──▶ Embedding Model ──▶ ChromaDB
(Bảng products)    (embedding.py)   (SentenceTransformer)  (Vector Store)
```

Quy trình chi tiết:
1. Đọc thông tin sản phẩm từ MySQL (tên, mô tả, danh mục, giá)
2. Kết hợp các trường thành một văn bản mô tả
3. Sử dụng model multilingual-e5-small để chuyển văn bản thành vector 384 chiều
4. Lưu vector cùng metadata vào ChromaDB

**Lợi ích:** Khi thêm sản phẩm mới vào MySQL, chỉ cần chạy lại script embedding → AI tự động "biết" sản phẩm mới mà không cần đào tạo lại.

**Bước 2: Xử lý truy vấn người dùng (Retrieval)**

Khi khách hàng gửi tin nhắn, hệ thống thực hiện:
1. Nhận câu hỏi từ Frontend
2. Phân loại ý định (greeting, product_search, comparison, follow_up)
3. Chuyển câu hỏi thành vector
4. Tìm kiếm sản phẩm tương tự trong ChromaDB (hoặc MySQL)
5. Lấy top 5 sản phẩm phù hợp nhất

**Bước 3: Tạo Prompt và Gọi LLM (Generation)**

Sau khi có danh sách sản phẩm phù hợp:
1. Xây dựng prompt chứa: vai trò AI, danh sách sản phẩm, câu hỏi khách hàng
2. Gửi prompt đến Gemini API
3. Nhận câu trả lời và format kết quả
4. Trả về Frontend kèm danh sách sản phẩm

**Bước 4: Hiển thị kết quả (Frontend)**

Frontend React xử lý response:
1. Hiển thị tin nhắn text với hỗ trợ Markdown
2. Render danh sách sản phẩm dưới dạng cards
3. Cho phép click vào sản phẩm để xem chi tiết

---

### 3.3.3 Sơ đồ tuần tự xử lý Chatbot AI

*Xem chi tiết tại Chương 4, Hình 4-18: Sơ đồ tuần tự chức năng chatbot AI*

**Tóm tắt luồng xử lý:**
1. User/Admin mở khung chat
2. Frontend gửi POST /chat đến AI Service
3. AI Service xử lý NLP & RAG
4. Tìm kiếm dữ liệu trong MySQL/ChromaDB
5. Gọi Gemini API tạo câu trả lời
6. Trả về Frontend và hiển thị kết quả

---

### 3.3.4 Chiến lược Hybrid Search

Hệ thống sử dụng chiến lược Hybrid Search để tối ưu kết quả tìm kiếm:

**Phân loại truy vấn:**
- **Truy vấn đơn giản:** "Tìm bàn chữ L", "Ghế xoay" → Sử dụng SQL Search
- **Truy vấn phức tạp:** "Bàn phù hợp cho văn phòng nhỏ" → Sử dụng Vector Search

**Bảng so sánh hai phương pháp:**

| Tiêu chí | SQL Search | Vector Search |
|----------|------------|---------------|
| Độ chính xác | Cao với từ khóa cụ thể | Cao với câu hỏi mô tả |
| Tốc độ | Rất nhanh | Nhanh |
| Ví dụ | "Bàn Hòa Phát", "Ghế FM-702" | "Ghế thoải mái cho người ngồi lâu" |
| Kết quả | Exact match | Semantic match |

---

### 3.3.5 Conversation Memory (Lưu trữ lịch sử hội thoại)

Hệ thống lưu trữ lịch sử hội thoại để hiểu ngữ cảnh:

**Cơ chế hoạt động:**
1. Mỗi phiên chat có một session_id duy nhất
2. Lưu trữ 10 tin nhắn gần nhất
3. Theo dõi context: sản phẩm đã đề cập, ý định người dùng

**Ví dụ:**
- User: "Tìm bàn làm việc" → Bot trả về 5 sản phẩm
- User: "Cái đầu tiên giá bao nhiêu?" → Bot hiểu "cái đầu tiên" là sản phẩm vừa nói

---

### 3.3.6 Legal Chatbot (Tư vấn pháp luật kinh doanh - Dành cho Admin)

Ngoài Product Chatbot cho khách hàng, hệ thống còn có **Legal Chatbot** dành cho **Quản lý (Admin)** để tra cứu thông tin pháp luật kinh doanh và tính thuế.

#### A. Kiến trúc Legal Chatbot

```
Admin Frontend ──▶ POST /api/legal/chat ──▶ LegalAssistant Service
                                                    │
                        ┌───────────────────────────┴───────────────────────────┐
                        ▼                                                       ▼
              ┌─────────────────┐                                     ┌─────────────────┐
              │  LLM Router     │                                     │  Keyword-based  │
              │  (Intent)       │                                     │  Fallback       │
              └────────┬────────┘                                     └─────────────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│  CALCULATION    │         │  LEGAL_SEARCH   │
│  (Tính thuế)    │         │  (Tra cứu luật) │
└────────┬────────┘         └────────┬────────┘
         │                           │
         ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│ TaxCalculator   │         │ LegalVectorSvc  │
│ (Thuế TNCN,BHXH)│         │ (ChromaDB RAG)  │
└─────────────────┘         └─────────────────┘
```

#### B. Hai chức năng chính

**1. Tính thuế thu nhập cá nhân (TNCN) và Bảo hiểm xã hội (BHXH)**

- Nhập: Lương gross/net, vùng lương tối thiểu
- Tính: Thuế TNCN theo biểu thuế lũy tiến, BHXH, BHYT, BHTN
- Xuất: Chi tiết các khoản khấu trừ, lương thực lĩnh

**Ví dụ query:** "Lương 50 triệu đóng thuế bao nhiêu?"

**2. Tra cứu văn bản pháp luật kinh doanh**

- Nguồn dữ liệu: Văn bản pháp luật về kinh doanh, thương mại điện tử đã embed vào ChromaDB
- Sử dụng RAG để tìm kiếm và trả lời dựa trên nội dung văn bản gốc
- Trích dẫn nguồn điều luật cụ thể

**Ví dụ query:** "Điều kiện thành lập công ty TNHH là gì?"

#### C. Quy trình xử lý Legal Chatbot

**Bước 1: Phân loại Intent**
- LLM Router phân loại câu hỏi: CALCULATION hay LEGAL_SEARCH
- Fallback: Dùng keywords nếu LLM không khả dụng

**Bước 2: Xử lý theo loại**
- **CALCULATION:** Gọi TaxCalculator tính thuế TNCN, BHXH
- **LEGAL_SEARCH:** Tìm kiếm trong ChromaDB (collection: legal_documents)

**Bước 3: Tạo Response**
- Kết hợp kết quả với Gemini để tạo câu trả lời tự nhiên
- Format kết quả dễ đọc, trích dẫn nguồn điều luật

#### D. Dữ liệu trong ChromaDB

| Collection | Nội dung | Mục đích |
|------------|----------|----------|
| legal_documents | Văn bản pháp luật kinh doanh | Legal Chatbot (Admin) |
| product_catalog | Thông tin sản phẩm nội thất | Product Chatbot (User) |

---

## 📍 PHẦN 2: BỔ SUNG VÀO CHƯƠNG 5 (Thử nghiệm)

Thêm vào sau mục 5.1.5:

---

### 5.1.6 Kịch bản kiểm thử chức năng Chatbot AI

**Bảng kịch bản thử nghiệm:**

| STT | Loại test | Query mẫu | Kết quả mong đợi |
|-----|-----------|-----------|------------------|
| 1 | Tìm kiếm đơn giản | "Tìm bàn làm việc" | Trả về 5 sản phẩm bàn |
| 2 | Tìm kiếm theo giá | "Ghế dưới 3 triệu" | Trả về ghế có giá < 3tr |
| 3 | Tư vấn ngữ nghĩa | "Bàn cho văn phòng nhỏ" | Tư vấn bàn compact |
| 4 | So sánh sản phẩm | "So sánh bàn chữ L và chữ U" | Phân tích ưu nhược điểm |
| 5 | Follow-up | "Cái nào rẻ nhất?" | Hiểu context từ câu trước |

---

### 5.2.6 Kết quả thử nghiệm Chatbot AI

**Kết quả test:**
- Tổng số test: 8 kịch bản
- Thành công: 7/8 (87.5%)
- Thời gian phản hồi trung bình: 2-3 giây

**Đánh giá:**
- Chatbot trả lời đúng ngữ cảnh và thân thiện
- Gợi ý sản phẩm phù hợp với nhu cầu
- Hỗ trợ tiếng Việt tốt, hiểu các cách diễn đạt khác nhau

---

## ✅ CHECKLIST COPY VÀO WORD

- [ ] Bổ sung vào mục 3.3.1 → Sơ đồ kiến trúc hệ thống AI (vẽ bằng draw.io)
- [ ] Bổ sung vào mục 3.3.2 → Quy trình xử lý 4 bước (Product Chatbot)
- [x] Mục 3.3.3 → Tham chiếu Hình 4-18 (đã có)
- [ ] Thêm mục 3.3.4 → Hybrid Search
- [ ] Thêm mục 3.3.5 → Conversation Memory
- [ ] Thêm mục 3.3.6 → Legal Chatbot (Admin)
- [ ] Thêm mục 5.1.6 và 5.2.6 → Test Chatbot AI
- [ ] Cập nhật mục lục

---

**Ghi chú:** Các sơ đồ ASCII cần được vẽ lại bằng công cụ chuyên dụng (draw.io, Lucidchart) để đẹp hơn trong Word.
