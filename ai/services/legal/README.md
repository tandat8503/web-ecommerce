# Legal Document Processing Service

Hệ thống xử lý văn bản pháp luật Việt Nam với chunking theo đơn vị logic (Điều/Khoản) và embedding vào Vector DB.

## Cấu trúc

### 1. Parser (`parser.py`)
- Parse PDF files (PyMuPDF)
- Parse DOC/DOCX files (python-docx)
- Tách văn bản theo Chương → Điều → Khoản

### 2. Chunker (`chunker.py`)
- Chunking theo cấu trúc logic (không phải word count)
- Tạo JSON chunks theo schema đề xuất
- Context enrichment cho embedding

### 3. Vector Service (`vector_service.py`)
- Embed chunks bằng SentenceTransformer
- Upsert vào ChromaDB
- Search với metadata filtering

## Schema JSON Chunk

```json
{
  "id": "L_DN_2020_D13",
  "text_for_embedding": "Luật Doanh nghiệp 2020. Chương 1: Quy định chung. Điều 13: Người đại diện theo pháp luật...",
  "metadata": {
    "source_id": "59/2020/QH14",
    "doc_name": "Luật Doanh nghiệp 2020",
    "doc_type": "Luật",
    "chapter": "Chương 1: Quy định chung",
    "article": "Điều 13",
    "article_title": "Người đại diện theo pháp luật của doanh nghiệp",
    "clause": "",
    "effective_date": "2021-01-01",
    "status": "active",
    "keywords": ["người đại diện", "trách nhiệm", "quyền hạn"]
  },
  "original_text": "Điều 13. Người đại diện theo pháp luật của doanh nghiệp\n1. Người đại diện..."
}
```

## Sử dụng

### 1. Cài đặt dependencies

```bash
pip install PyMuPDF python-docx
```

### 2. Chạy script xử lý

```bash
cd ai
python scripts/process_legal_documents.py
```

Script sẽ:
- Đọc tất cả PDF/DOC files trong `ai/luat_VN/`
- Parse và chunk theo Điều/Khoản
- Embed và upsert vào ChromaDB collection `legal_documents`

### 3. Search trong code

```python
from services.legal.vector_service import LegalVectorService

service = LegalVectorService()

# Search với filter
results = service.search(
    query="Người đại diện theo pháp luật",
    top_k=5,
    doc_type="Luật",
    status="active"
)

for result in results:
    print(result["metadata"]["article"])
    print(result["text"])
```

## Chiến lược Chunking

1. **Theo Điều**: Mỗi Điều luật là 1 chunk (nếu < 2000 ký tự)
2. **Theo Khoản**: Nếu Điều quá dài, chunk theo từng Khoản
3. **Context Enrichment**: Mỗi chunk luôn có đầy đủ context (Tên Luật, Chương, Điều)

## Metadata Filtering

Có thể filter theo:
- `doc_type`: "Luật", "Nghị định", "Thông tư"
- `status`: "active", "expired", "amended"
- `effective_date`: Ngày có hiệu lực
- `article`: Số điều
- `chapter`: Tên chương

## Lưu ý

- Chunking theo logic, không theo word count
- Mỗi chunk có đầy đủ context để embedding chính xác
- ID format: `{DocType}_{DocAbbr}_{Year}_D{Article}_K{Clause}`
- Có thể update/delete theo `doc_name` khi văn bản được sửa đổi

