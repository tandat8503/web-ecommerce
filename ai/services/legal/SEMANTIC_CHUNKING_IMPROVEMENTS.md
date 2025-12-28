# Semantic Chunking Improvements for Legal RAG Chatbot

## Tổng quan

Code đã được cải thiện theo chiến lược **Contextual Semantic Chunking** để giải quyết các vấn đề nghiêm trọng khiến chatbot dễ trả lời sai hoặc "ảo giác".

## Các vấn đề đã được giải quyết

### 1. ❌ Context Loss (Mất ngữ cảnh)

**Vấn đề cũ:**
- Chunks bị cắt theo độ dài ký tự (`max_article_length`) mà không đảm bảo ngữ cảnh
- Ví dụ: Chunk chỉ chứa "Phạt tiền từ 10.000.000 đồng..." mà không biết thuộc Điều nào, Luật nào

**Giải pháp:**
- Chunking theo cấu trúc logic: Văn bản → Chương → Điều → Khoản → Điểm
- **Context Injection**: Mỗi chunk luôn chứa đầy đủ thông tin ngữ cảnh trong `text_for_embedding`

**Code cải thiện:**
```python
def enrich_text_for_embedding(...) -> str:
    """
    Context Injection với format:
    "Luật: [Tên Luật]. [Chương]. [Điều X: Tiêu đề]. [Khoản Y]. [Nội dung]"
    """
    context_parts = []
    if doc_name:
        context_parts.append(f"Luật: {doc_name}")
    if article_title:
        context_parts.append(f"{article}: {article_title}")
    if clause:
        context_parts.append(clause)
    context_parts.append(content)
    return ". ".join(context_parts)
```

**Ví dụ output:**
```
"Luật: Luật Doanh nghiệp 2020. Chương 1: Quy định chung. Điều 13: Người đại diện theo pháp luật. Khoản 1. Người đại diện theo pháp luật của doanh nghiệp có các quyền và nghĩa vụ sau đây: a) Đại diện cho doanh nghiệp..."
```

### 2. ❌ Embedding Text chưa tối ưu

**Vấn đề cũ:**
- `text_for_embedding` chỉ chứa nội dung thô, thiếu metadata
- Vector search không thể phân biệt được các quy định tương tự từ luật khác nhau

**Giải pháp:**
- Format tối ưu: `"Luật: {doc_name}. {article}: {article_title}. {clause}. {content}"`
- Đảm bảo mọi chunk đều có đầy đủ context hierarchy

**Tại sao quan trọng:**
- Khi user hỏi "Quy định về vốn điều lệ", nếu không có context, Vector Search sẽ trả về cả:
  - Luật Doanh nghiệp
  - Luật Ngân hàng
  - Luật Bảo hiểm
- Với context injection, Vector sẽ biết chính xác chunk nào thuộc Luật nào

### 3. ❌ Xử lý Văn bản hợp nhất (VBHN) chưa tốt

**Vấn đề cũ:**
- Các file VBHN chứa nhiều footnotes `[1]`, `[12]`, page markers `--- PAGE 1 ---`
- Các yếu tố này làm nhiễu vector embedding

**Giải pháp:**
- Thêm method `clean_vbhn_text()` để loại bỏ:
  - Footnotes: `[1]`, `[12]`, `[a]`
  - Page markers: `--- PAGE 1 ---`, `Trang 1/50`
  - Header/Footer noise
  - Dòng chỉ chứa số hoặc ký tự đặc biệt

**Code:**
```python
def clean_vbhn_text(self, text: str) -> str:
    # Xóa page markers
    text = re.sub(r'---\s*PAGE\s+\d+\s*---', '', text)
    # Xóa footnotes [1], [12], [a]
    text = re.sub(r'\[\d+\](?![a-zàáảãạ...])', '', text)
    # Xóa dòng chỉ chứa số/ky tự đặc biệt
    # ... (giữ lại dòng có chữ cái)
    return text
```

**Tự động áp dụng:**
- `parse_pdf()` và `parse_doc()` tự động gọi `clean_vbhn_text()` sau khi extract text

## Cấu trúc Chunking

### Hierarchy Logic (không phải Character-based)

```
Văn bản (Document)
  └── Chương (Chapter)
      └── Điều (Article) ← Đơn vị ngữ nghĩa nhỏ nhất
          └── Khoản (Clause) ← Chỉ split nếu Điều quá dài
              └── Điểm (Point) ← Chỉ split nếu Khoản quá dài
```

### Chunking Strategy

1. **Primary Split**: Theo Điều (Article)
   - Mỗi Điều là một đơn vị ngữ nghĩa hoàn chỉnh
   - Không bao giờ cắt đôi một Điều

2. **Secondary Split**: Theo Khoản (Clause) - CHỈ khi Điều > `max_article_length`
   - Split theo pattern: `^\s*(\d+)[\.\)]\s+`
   - Mỗi Khoản vẫn giữ context của Điều

3. **Tertiary Split**: Theo Điểm (Point) - CHỈ khi Khoản > `max_clause_length`
   - Split theo pattern: `^\s*([a-zđ])[\.\)]\s+`
   - Mỗi Điểm vẫn giữ context của Khoản và Điều

## Context Injection Format

### Format chuẩn cho `text_for_embedding`

```
"Luật: {doc_name}. {chapter}. {article}: {article_title}. {clause}. Điểm {point}. {content}"
```

### Ví dụ thực tế

**Input chunk (content only):**
```
"a) Tự do kinh doanh ngành, nghề mà pháp luật không cấm;"
```

**Output text_for_embedding:**
```
"Luật: Luật Doanh nghiệp 2020. Chương 2: Thành lập doanh nghiệp. Điều 7: Quyền của doanh nghiệp. Khoản 1. Điểm a. a) Tự do kinh doanh ngành, nghề mà pháp luật không cấm;"
```

**Tại sao quan trọng:**
- User query: "Quy định về quyền tự do kinh doanh"
- Vector Search sẽ match chính xác với context "Luật Doanh nghiệp", "Điều 7", "Quyền của doanh nghiệp"
- Tránh trả về quy định tương tự từ luật khác (ví dụ: Luật Đầu tư cũng có quy định về tự do kinh doanh)

## Metadata Structure

Mỗi chunk có đầy đủ metadata để:
1. **Filter chính xác**: Filter theo `doc_name`, `doc_type`, `article`, etc.
2. **Citation**: Hiển thị nguồn cho user ("Theo Luật Doanh nghiệp 2020, Điều 13...")
3. **Context preservation**: Giữ lại toàn bộ hierarchy

```json
{
  "metadata": {
    "source_id": "67",
    "doc_name": "Luật Doanh nghiệp 2020",
    "doc_type": "Luật",
    "chapter": "Chương 1: Quy định chung",
    "article": "Điều 13",
    "article_title": "Người đại diện theo pháp luật",
    "clause": "Khoản 1",
    "point": "a",
    "effective_date": "2021-01-01",
    "status": "active",
    "keywords": ["người đại diện", "quyền hạn", "trách nhiệm"]
  }
}
```

## Best Practices cho RAG Chatbot

### 1. Search Strategy

```python
# ✅ TỐT: Search với filter
results = vector_service.search(
    query="Quy định về vốn điều lệ",
    doc_type="Luật",  # Filter theo loại văn bản
    status="active"   # Chỉ lấy văn bản còn hiệu lực
)

# ❌ XẤU: Search không filter
results = vector_service.search(query="vốn điều lệ")  # Sẽ trả về từ nhiều luật
```

### 2. Response Format

Khi trả lời user, luôn include citation:

```
Theo **Luật Doanh nghiệp 2020, Điều 4, Khoản 3**:
Vốn điều lệ là tổng giá trị tài sản do các thành viên đã góp hoặc cam kết góp...
```

### 3. Chunk Size

- **Recommended**: 
  - `max_article_length`: 2000-3000 ký tự
  - `max_clause_length`: 1000-1500 ký tự
  
- **Rationale**: 
  - Đủ ngắn để Vector Search chính xác
  - Đủ dài để giữ ngữ nghĩa hoàn chỉnh

## Testing & Validation

### Test Context Injection

```python
# Verify mỗi chunk có đầy đủ context
for chunk in chunks:
    text = chunk["text_for_embedding"]
    assert "Luật:" in text  # Phải có tên luật
    assert "Điều" in text   # Phải có số điều
    assert chunk["metadata"]["doc_name"]  # Metadata phải đầy đủ
```

### Test VBHN Cleaning

```python
# Verify footnotes đã được loại bỏ
text = parser.parse_file(pdf_path)
assert "[1]" not in text  # Footnotes đã bị xóa
assert "--- PAGE" not in text  # Page markers đã bị xóa
```

## Migration Guide

### Để áp dụng cải thiện cho dữ liệu hiện có:

1. **Re-process documents** với code mới:
```bash
cd ai
python scripts/reprocess_legal_documents.py --clear
```

2. **Verify** kết quả:
```bash
python scripts/test_vector_db.py
```

3. **Check** doc_name được extract chính xác:
```bash
python scripts/parse_legal_to_json.py
# Xem file legal_documents.json để verify doc_name
```

## Tóm tắt

✅ **Đã giải quyết:**
- Context Loss → Context Injection trong `text_for_embedding`
- Embedding Text chưa tối ưu → Format tối ưu với đầy đủ hierarchy
- VBHN noise → Clean text tự động

✅ **Cải thiện:**
- Semantic Chunking theo cấu trúc logic (không phải character-based)
- Metadata đầy đủ cho filtering và citation
- Code documentation chi tiết

🎯 **Kết quả:**
- Vector Search chính xác hơn
- Chatbot trả lời đúng ngữ cảnh
- Giảm thiểu "ảo giác" (hallucination)




