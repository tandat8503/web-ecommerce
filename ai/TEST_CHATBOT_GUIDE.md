# 🧪 HƯỚNG DẪN TEST AI CHATBOT

## 🎯 Mục Đích Test

So sánh chatbot **TRƯỚC** và **SAU** khi upgrade VectorDB:
- **TRƯỚC:** Chatbot hiện tại (MySQL search only)
- **SAU:** Chatbot với VectorDB (semantic search + expert advice)

---

## 🚀 Bước 1: Start Server

### **Terminal 1: Backend**
```bash
cd /Users/macbookpro/Workspace/web-ecommerce/backend
npm run dev
```

**Đợi thấy:**
```
Server running on port 5000
Database connected
```

### **Terminal 2: AI Service** (nếu cần)
```bash
cd /Users/macbookpro/Workspace/web-ecommerce/ai
source venv/bin/activate
python app.py
```

---

## 🌐 Bước 2: Access Chatbot

### **Option A: User Chatbot (Frontend)**
```
URL: http://localhost:3000
```
- Click vào icon chat ở góc phải
- Test với user perspective

### **Option B: Admin Chatbot (Backend)**
```
URL: http://localhost:5000/admin/chatbot
```
- Login: `admin@noithatvp.com` / `Admin@123`
- Test với admin perspective

### **Option C: API Direct Test**
```bash
curl -X POST http://localhost:5000/api/chatbot/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Tìm bàn làm việc"}'
```

---

## 📝 Test Cases

### **Test 1: Simple Product Search**

**Query:**
```
"Tìm bàn làm việc"
```

**Expected (HIỆN TẠI):**
```
Dạ bên em có mấy mẫu này hợp với anh/chị nè: 😊

[Card 1: Bàn Làm Việc Govi GL-120]
[Card 2: Bàn Làm Việc IKEA FM-456]
[Card 3: Bàn Làm Việc Hòa Phát XH-789]
```

**Vấn đề:**
- ❌ Chỉ show danh sách
- ❌ Không giải thích TẠI SAO nên chọn
- ❌ Không phân tích specs

---

### **Test 2: Price Range Query**

**Query:**
```
"Ghế xoay giá dưới 3 triệu"
```

**Expected (HIỆN TẠI):**
```
Dạ đây là các sản phẩm em tìm thấy ạ.

[Card 1: Ghế Xoay A - 2,500,000đ]
[Card 2: Ghế Xoay B - 2,800,000đ]
```

**Vấn đề:**
- ❌ Không tư vấn chất lượng
- ❌ Không so sánh options

---

### **Test 3: Complex Query (QUAN TRỌNG)**

**Query:**
```
"Tôi cần bàn làm việc cho văn phòng nhỏ, diện tích khoảng 10m²"
```

**Expected (HIỆN TẠI):**
```
Dạ bên em có mấy mẫu này: 😊

[Random 5 products - không filter theo size]
```

**Vấn đề:**
- ❌ Không hiểu "văn phòng nhỏ" = cần bàn compact
- ❌ Không filter theo kích thước
- ❌ Trả về cả bàn lớn (không phù hợp)

**Expected (SAU KHI UPGRADE):**
```
Dạ em hiểu rồi ạ! Với văn phòng nhỏ 10m², em gợi ý 2 mẫu này:

🌟 Bàn Làm Việc Compact GL-120 (4,500,000đ)
   ✅ Kích thước 120x60cm - VỪA VẶN cho không gian nhỏ
   ✅ Gỗ MDF - BỀN, DỄ VỆ SINH
   ✅ Có ngăn kéo - TIẾT KIỆM KHÔNG GIAN
   
   👉 Phù hợp: Văn phòng < 12m²

🎯 Gợi ý: Chọn GL-120 vì kích thước tối ưu!
```

---

### **Test 4: Comparison Query**

**Query:**
```
"So sánh bàn F42 và G100"
```

**Expected (HIỆN TẠI):**
```
Dạ đây là 2 sản phẩm ạ:

[Card 1: Bàn F42]
[Card 2: Bàn G100]
```

**Vấn đề:**
- ❌ Không so sánh chi tiết
- ❌ Không gợi ý nên chọn cái nào

**Expected (SAU KHI UPGRADE):**
```
📊 So sánh 2 sản phẩm:

Bàn F42 (5tr):
- Kích thước: 120x60cm (nhỏ gọn)
- Chất liệu: MDF
- Phù hợp: Văn phòng nhỏ, WFH

Bàn G100 (7tr):
- Kích thước: 140x70cm (rộng hơn)
- Chất liệu: Gỗ cao cấp
- Phù hợp: Văn phòng lớn, nhiều tài liệu

🎯 Gợi ý: Chọn F42 nếu không gian nhỏ, G100 nếu cần bền đẹp!
```

---

### **Test 5: Use Case Query**

**Query:**
```
"Ghế cho lập trình viên ngồi nhiều giờ"
```

**Expected (HIỆN TẠI):**
```
Dạ đây là các ghế ạ:

[Random chairs]
```

**Vấn đề:**
- ❌ Không hiểu "ngồi nhiều giờ" = cần ergonomic
- ❌ Trả về cả ghế thường (không phù hợp)

**Expected (SAU KHI UPGRADE):**
```
Dạ với lập trình viên ngồi nhiều giờ, em khuyên:

🌟 Ghế Công Thái Học ErgoMax (8tr)
   ✅ Thiết kế ergonomic - HỖ TRỢ LƯNG
   ✅ Tựa đầu điều chỉnh - GIẢM MỎI CỔ
   ✅ Tay vịn 4D - THOẢI MÁI
   
   👉 Phù hợp: Ngồi 8+ giờ/ngày

🎯 Đáng đầu tư cho sức khỏe!
```

---

## 📊 Checklist Test

### **Chatbot HIỆN TẠI:**
- [ ] Test simple search - "Tìm bàn làm việc"
- [ ] Test price filter - "Ghế dưới 3 triệu"
- [ ] Test complex query - "Bàn cho văn phòng nhỏ 10m²"
- [ ] Test comparison - "So sánh F42 và G100"
- [ ] Test use case - "Ghế cho lập trình viên"

### **Ghi Nhận:**
- Chatbot trả lời như thế nào?
- Có tư vấn chi tiết không?
- Có hiểu ngữ cảnh không?
- Có gợi ý phù hợp không?

---

## 🎯 Kết Luận Sau Test

### **Nếu chatbot HIỆN TẠI:**
- ✅ Show được products
- ❌ Không tư vấn chi tiết
- ❌ Không hiểu complex queries
- ❌ Không so sánh thông minh

→ **CẦN UPGRADE VectorDB!**

### **Sau khi UPGRADE:**
- ✅ Show products + tư vấn chi tiết
- ✅ Hiểu ngữ cảnh (văn phòng nhỏ, ngồi nhiều giờ)
- ✅ So sánh thông minh
- ✅ Gợi ý dựa trên nhu cầu

→ **CHATBOT CHUYÊN NGHIỆP!**

---

## 📸 Screenshot Để So Sánh

**Hãy chụp màn hình:**
1. Response cho "Bàn cho văn phòng nhỏ 10m²" (TRƯỚC)
2. Response sau khi upgrade (SAU)

→ Thấy rõ sự khác biệt!

---

## 🚀 Next Steps

**Sau khi test xong:**
1. Confirm cần upgrade
2. Run Phase 1: Embed products
3. Run Phase 2-4: Update chatbot
4. Test lại với same queries
5. So sánh kết quả!

---

**Happy Testing!** 🧪
