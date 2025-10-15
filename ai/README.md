# AI System (4 Modules) – web-ecommerce

Hệ thống AI phục vụ luận văn với 4 module:
- Chatbot (User/Admin)
- Sentiment Analysis
- Business Analyst
- Report (HTML tổng hợp)

## Mục tiêu
- Ưu tiên chạy local; dùng LLM qua API khi cần diễn đạt tự nhiên.
- Tổ chức mã rõ ràng, dễ debug, tách trách nhiệm từng module.

## Kiến trúc chức năng (mô tả)
- Chatbot (User): nhận câu hỏi liên quan sản phẩm → truy vấn MySQL → trả lời + link chi tiết; ngoài phạm vi thì từ chối lịch sự.
- Chatbot (Admin): nhận intent nghiệp vụ (doanh thu, tồn kho, bình luận) → gọi Analyst/Sentiment để tổng hợp.
- Sentiment: phân loại comment theo sản phẩm (positive/negative/neutral) + lý do tổng hợp.
- Analyst: thống kê doanh thu/KPI theo thời gian từ MySQL (SQL/Pandas).
- Report: kết hợp kết quả Sentiment/Analyst → render HTML để admin xem.

## Cài đặt nhanh
```bash
cd web-ecommerce/ai-system
pip install -r requirements.txt

# Biến môi trường tối thiểu
export DB_MYSQL_HOST=localhost
export DB_MYSQL_USER=root
export DB_MYSQL_PASSWORD=your_password
export DB_MYSQL_DATABASE=ecommerce_db

# (Tuỳ chọn) LLM cho diễn đạt tự nhiên
export OPENAI_API_KEY=sk-...
```

## Module & API (dự kiến)
- Chatbot
  - POST /chat/user        → tư vấn mua hàng theo DB
  - POST /chat/admin       → gợi ý câu lệnh nghiệp vụ cho admin
- Sentiment
  - POST /sentiment/analyze → phân tích danh sách comment
- Analyst
  - POST /analyst/revenue   → thống kê doanh thu theo tháng/năm
- Report
  - GET  /report/summary    → xuất HTML tổng hợp

## Gợi ý triển khai
- Bước 1: Analyst (SQL thuần) – đảm bảo dữ liệu chính xác
- Bước 2: Sentiment (scikit-learn baseline, local)
- Bước 3: Chatbot User (DB-first, không RAG)
- Bước 4: Report (Jinja2 + biểu đồ)
- Nâng cấp tuỳ chọn: thêm RAG khi có FAQ/policy dài

## Công nghệ đề xuất
- FastAPI, Pydantic
- MySQL (dùng chung với web-ecommerce)
- scikit-learn (Sentiment baseline)
- Pandas/NumPy (Analyst)
- Jinja2/Plotly (Report HTML)
- OpenAI API (tuỳ chọn, chỉ để diễn đạt tự nhiên)

## Ghi chú
- File này mô tả mục tiêu và API ở mức chức năng. Code sẽ tổ chức tách module rõ ràng, dễ mở rộng.
