# 📁 CHROMA DB FOLDERS - GIẢI THÍCH

## 🔍 TÌM THẤY 2 FOLDERS

### **1. `.chroma/` (13.9 MB)**
**Đường dẫn:** `/Users/macbookpro/Workspace/web-ecommerce/ai/.chroma/`

**Mục đích:** 
- ✅ Lưu **Legal documents** embeddings
- ✅ Được dùng bởi: `LegalVectorService`

**File sử dụng:**
```python
# services/legal/vector_service.py (line 29)
self._client = chromadb.PersistentClient(path=app_config.chroma_dir)

# core/config.py
chroma_dir = os.getenv("CHROMA_DIR", "./.chroma")
```

**Nội dung:**
- `chroma.sqlite3` (13.9 MB) - Legal documents embeddings
- 2 collection folders

---

### **2. `chroma_db/` (1.4 MB)**
**Đường dẫn:** `/Users/macbookpro/Workspace/web-ecommerce/ai/chroma_db/`

**Mục đích:** 
- ✅ Lưu **Product catalog** embeddings
- ✅ Được dùng bởi: `ProductVectorService`

**File sử dụng:**
```python
# services/chatbot/product_vector_service.py (line 20)
chroma_path = Path(__file__).parent.parent.parent / "chroma_db"
client = chromadb.PersistentClient(path=str(chroma_path))
```

**Nội dung:**
- `chroma.sqlite3` (1.4 MB) - Product embeddings
- 2 collection folders (product_catalog, etc.)

---

## 📊 SO SÁNH

| Feature | `.chroma/` | `chroma_db/` |
|---------|-----------|--------------|
| **Size** | 13.9 MB | 1.4 MB |
| **Purpose** | Legal docs | Products |
| **Service** | LegalVectorService | ProductVectorService |
| **Collections** | legal_docs | product_catalog |
| **Config** | From .env (CHROMA_DIR) | Hardcoded path |

---

## ✅ KẾT LUẬN

**CẢ 2 FOLDERS ĐỀU ĐANG ĐƯỢC DÙNG!**

- **`.chroma/`** → Legal chatbot (tư vấn luật)
- **`chroma_db/`** → Product chatbot (tư vấn sản phẩm)

**KHÔNG XÓA CÁI NÀO!** 🚫

---

## 🔧 ĐỀ XUẤT CẢI THIỆN

### **Vấn đề:** Inconsistent naming

**Hiện tại:**
```
.chroma/       # Legal (hidden folder)
chroma_db/     # Products (visible folder)
```

**Nên đổi thành:**
```
chroma_db/
  ├── legal_docs/      # Legal embeddings
  └── products/        # Product embeddings
```

**Hoặc giữ nguyên nhưng rename:**
```
vector_db_legal/     # Legal
vector_db_products/  # Products
```

---

## 🎯 KHUYẾN NGHỊ

**Option A: Giữ nguyên** (an toàn nhất)
- ✅ Không cần thay đổi code
- ✅ Đang hoạt động tốt
- ❌ Naming hơi lộn xộn

**Option B: Merge vào 1 folder**
- ✅ Organized hơn
- ✅ Dễ backup
- ⚠️  Cần update code config

**Tôi khuyên: Giữ nguyên hiện tại!** Hệ thống đang hoạt động tốt, không cần risk.

---

## 📝 NOTE

Nếu sau này muốn cleanup:
1. **Backup cả 2 folders**
2. **Test Legal + Product chatbot**
3. **Chỉ merge nếu cần thiết**

**Current status: ✅ WORKING - DON'T TOUCH!**
