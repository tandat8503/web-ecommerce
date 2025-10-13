# SQLite Integration Guide - Hướng dẫn tích hợp SQLite

## Tổng quan

Hệ thống AI đã được cập nhật để sử dụng SQLite database thay vì JSON files cho việc lưu trữ dữ liệu đã gán nhãn. Điều này mang lại nhiều lợi ích:

- **ACID Compliance**: Đảm bảo tính toàn vẹn dữ liệu
- **Query Capabilities**: Hỗ trợ SQL queries phức tạp
- **Indexing**: Tăng tốc độ truy vấn
- **Concurrent Access**: Hỗ trợ nhiều người dùng đồng thời
- **Scalability**: Dễ dàng mở rộng

## Kiến trúc Database

### SQLite Database (AI System)
- **File**: `data/labeled_data.db`
- **Mục đích**: Lưu trữ dữ liệu đã gán nhãn cho AI
- **Quyền**: Read/Write cho AI system

### MySQL Database (E-commerce)
- **Mục đích**: Dữ liệu sản phẩm, đơn hàng, khách hàng
- **Quyền**: Read-only cho AI system

## Cấu trúc Bảng SQLite

### 1. `raw_data` - Dữ liệu gốc
```sql
CREATE TABLE raw_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    source_file TEXT,
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. `srl_labels` - Labels SRL
```sql
CREATE TABLE srl_labels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    raw_data_id INTEGER NOT NULL,
    role TEXT NOT NULL,  -- ASPECT, OPINION, HOLDER, MODALITY
    text TEXT NOT NULL,
    start_pos INTEGER NOT NULL,
    end_pos INTEGER NOT NULL,
    emotion TEXT,
    aspect_category TEXT,
    confidence REAL DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (raw_data_id) REFERENCES raw_data (id)
);
```

### 3. `labeling_sessions` - Sessions gán nhãn
```sql
CREATE TABLE labeling_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_name TEXT NOT NULL,
    source_file TEXT,
    total_texts INTEGER DEFAULT 0,
    labeled_texts INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);
```

### 4. `training_data` - Dữ liệu training đã xử lý
```sql
CREATE TABLE training_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    aspect_labels TEXT,  -- JSON string
    opinion_labels TEXT, -- JSON string
    sentiment_labels TEXT, -- JSON string
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Cách sử dụng

### 1. Khởi động hệ thống

```bash
# Terminal 1: Start SRL Labeling Tool
cd web-ecommerce/ai-system
make dev

# Terminal 2: Start Save Labels API
make save-api

# Terminal 3: Start AI API (optional)
make api
```

### 2. Gán nhãn dữ liệu

1. **Upload CSV**: Sử dụng SRL Labeling Tool để upload file CSV
2. **Gán nhãn**: Gán nhãn cho từng text
3. **Lưu vào Database**: Click "💾 Lưu vào Database" thay vì export JSON
4. **Kiểm tra**: Dữ liệu được lưu vào SQLite database

### 3. Training Models

```bash
# Train từ SQLite database
make train

# Hoặc chạy trực tiếp
python scripts/train_models.py
```

### 4. Sử dụng API

#### Save Labels API (Port 5001)
```bash
# Lưu labels
curl -X POST http://localhost:5001/api/save-labels \
  -H "Content-Type: application/json" \
  -d '{
    "texts": ["Tôi rất hài lòng với sản phẩm"],
    "labels": [[{"role": "OPINION", "text": "rất hài lòng"}]],
    "session_name": "Test Session"
  }'

# Lấy danh sách sessions
curl http://localhost:5001/api/sessions

# Lấy thống kê
curl http://localhost:5001/api/statistics
```

#### AI API (Port 5000)
```bash
# Phân tích text
curl -X POST http://localhost:5000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "Tôi rất hài lòng với chất lượng bàn làm việc"}'
```

## Quản lý Database

### Xem dữ liệu
```python
from core.data_manager import DataManager

dm = DataManager()

# Lấy tất cả sessions
sessions = dm.get_all_sessions()
print(sessions)

# Lấy thống kê
stats = dm.get_statistics()
print(stats)

# Lấy dữ liệu đã gán nhãn
labeled_data = dm.get_labeled_texts(limit=10)
print(labeled_data)
```

### Export dữ liệu
```python
# Export ra JSON
export_file = dm.export_to_json(session_id=1)
print(f"Exported to: {export_file}")
```

### Chuẩn bị dữ liệu training
```python
# Lấy dữ liệu training
training_data = dm.prepare_training_data(session_id=1)
print(f"Found {len(training_data)} training samples")
```

## Lợi ích của SQLite

### 1. **ACID Compliance**
- Đảm bảo tính toàn vẹn dữ liệu
- Không mất dữ liệu khi có lỗi

### 2. **Query Capabilities**
```sql
-- Tìm tất cả aspects về chất lượng
SELECT * FROM srl_labels 
WHERE role = 'ASPECT' AND aspect_category = 'quality';

-- Thống kê theo session
SELECT 
    ls.session_name,
    COUNT(DISTINCT rd.id) as total_texts,
    COUNT(DISTINCT sl.raw_data_id) as labeled_texts
FROM labeling_sessions ls
LEFT JOIN raw_data rd ON rd.source_file = ls.source_file
LEFT JOIN srl_labels sl ON rd.id = sl.raw_data_id
GROUP BY ls.id;
```

### 3. **Indexing**
- Tự động tạo index cho primary keys
- Có thể tạo custom indexes cho performance

### 4. **Concurrent Access**
- Hỗ trợ nhiều người dùng đồng thời
- Locking mechanism tự động

### 5. **Scalability**
- Dễ dàng backup/restore
- Có thể migrate sang PostgreSQL/MySQL sau này

## Troubleshooting

### Lỗi thường gặp

1. **Database locked**
   ```bash
   # Kiểm tra processes đang sử dụng database
   lsof data/labeled_data.db
   ```

2. **Permission denied**
   ```bash
   # Đảm bảo quyền ghi
   chmod 755 data/
   chmod 644 data/labeled_data.db
   ```

3. **API connection failed**
   ```bash
   # Kiểm tra API server
   curl http://localhost:5001/api/statistics
   ```

### Backup Database
```bash
# Backup
cp data/labeled_data.db data/labeled_data_backup_$(date +%Y%m%d).db

# Restore
cp data/labeled_data_backup_20240101.db data/labeled_data.db
```

## Migration từ JSON

Nếu bạn có dữ liệu JSON cũ:

```python
import json
from core.data_manager import DataManager

# Load JSON data
with open('old_data.json', 'r', encoding='utf-8') as f:
    json_data = json.load(f)

# Initialize DataManager
dm = DataManager()

# Create session
session_id = dm.import_csv('temp.csv', 'Migration Session')

# Save labels
for item in json_data:
    # Find raw_data_id and save labels
    # ... implementation details
```

## Kết luận

SQLite integration mang lại:
- ✅ Tính toàn vẹn dữ liệu cao
- ✅ Query capabilities mạnh mẽ
- ✅ Performance tốt hơn JSON
- ✅ Dễ dàng quản lý và scale
- ✅ Tương thích với các hệ thống khác

Hệ thống AI giờ đây có thể xử lý dữ liệu lớn hơn, an toàn hơn và hiệu quả hơn!
