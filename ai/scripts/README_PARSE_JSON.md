# Script Parse Legal Documents to JSON

Script để parse các file luật trong folder `luat_VN` và xuất ra JSON với metadata có cấu trúc.

## Cấu trúc JSON Output

### Format tổng hợp (legal_documents.json)

```json
{
  "summary": {
    "total_documents": 7,
    "total_chunks": 1487,
    "failed_files": [],
    "document_types": {
      "Luật": 7
    },
    "parsed_at": "2025-12-13T12:00:00"
  },
  "documents": [
    {
      "document_info": {
        "filename": "67-VBHN-VPQH.docx",
        "file_path": "/path/to/67-VBHN-VPQH.docx",
        "doc_name": "Luật Doanh Nghiệp 2020",
        "doc_type": "Luật",
        "source_id": "67",
        "effective_date": "2021-01-01",
        "status": "active",
        "parsed_at": "2025-12-13T12:00:00",
        "total_chunks": 220,
        "total_characters": 125000
      },
      "chunks": [
        {
          "id": "67_VBHN_VPQH_D1_K1",
          "text_for_embedding": "Luật Doanh Nghiệp 2020. Chương 1: Quy định chung. Điều 1: Phạm vi điều chỉnh...",
          "original_text": "Điều 1. Phạm vi điều chỉnh\n1. Luật này quy định...",
          "metadata": {
            "source_id": "67",
            "doc_name": "Luật Doanh Nghiệp 2020",
            "doc_type": "Luật",
            "chapter": "Chương 1: Quy định chung",
            "article": "Điều 1",
            "article_title": "Phạm vi điều chỉnh",
            "clause": "Khoản 1",
            "point": "",
            "effective_date": "2021-01-01",
            "status": "active",
            "keywords": ["phạm vi", "điều chỉnh", "doanh nghiệp"]
          }
        }
      ]
    }
  ]
}
```

### Format riêng lẻ (mỗi file một JSON)

Nếu dùng option `--export-individual`, mỗi document sẽ được export thành một file JSON riêng với cấu trúc:

```json
{
  "document_info": { ... },
  "chunks": [ ... ]
}
```

## Cách sử dụng

### 1. Parse và export tổng hợp (mặc định)

```bash
cd ai
python scripts/parse_legal_to_json.py
```

Output: `ai/scripts/legal_documents.json`

### 2. Parse và export với tên file tùy chỉnh

```bash
python scripts/parse_legal_to_json.py --output my_legal_data.json
```

### 3. Parse và export từng file riêng lẻ

```bash
python scripts/parse_legal_to_json.py --export-individual
```

Output: `ai/scripts/legal_documents_individual/*.json`

### 4. Parse và export cả tổng hợp và riêng lẻ

```bash
python scripts/parse_legal_to_json.py --output all_documents.json --export-individual --output-dir individual_files
```

### 5. Parse từ folder khác

```bash
python scripts/parse_legal_to_json.py --input-dir /path/to/other/folder --output other_output.json
```

## Metadata Structure

### Document Info

- `filename`: Tên file gốc
- `file_path`: Đường dẫn đầy đủ đến file
- `doc_name`: Tên văn bản (được extract từ nội dung)
- `doc_type`: Loại văn bản (Luật, Nghị định, Thông tư)
- `source_id`: Số hiệu văn bản (extract từ filename)
- `effective_date`: Ngày có hiệu lực (nếu tìm thấy)
- `status`: Trạng thái (active, expired, amended)
- `parsed_at`: Thời gian parse
- `total_chunks`: Tổng số chunks
- `total_characters`: Tổng số ký tự trong document

### Chunk Metadata

- `source_id`: Số hiệu văn bản
- `doc_name`: Tên văn bản
- `doc_type`: Loại văn bản
- `chapter`: Tên chương
- `article`: Số điều (VD: "Điều 13")
- `article_title`: Tiêu đề điều
- `clause`: Khoản (VD: "Khoản 1")
- `point`: Điểm (VD: "a", "b", "c")
- `effective_date`: Ngày có hiệu lực
- `status`: Trạng thái
- `keywords`: Từ khóa được extract từ nội dung

## Lưu ý

1. Script sẽ tự động skip các file scan (PDF ảnh) không có text
2. Các file bị lỗi sẽ được log và liệt kê trong `failed_files` của summary
3. Format JSON sử dụng UTF-8 encoding để hỗ trợ tiếng Việt
4. Indent 2 spaces để dễ đọc và debug




