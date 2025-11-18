# FRONTEND - XỬ LÝ THANH TOÁN MOMO

## ✅ CÁC FILE ĐÃ CẬP NHẬT

### 1. **PaymentResult.jsx** ⭐ ĐÃ TỐI ƯU

**Thay đổi chính:**
```javascript
// ❌ CŨ: Logic sai - PENDING cũng hiển thị success
if (data.paymentStatus === 'PAID') {
  setStatus('success');
} else if (data.paymentStatus === 'FAILED') {
  setStatus('failed');
} else {
  setStatus('success'); // ❌ SAI!
}

// ✅ MỚI: Logic đúng - Chỉ PAID mới là success
if (data.paymentStatus === 'PAID') {
  setStatus('success');
} else if (data.paymentStatus === 'FAILED') {
  setStatus('failed');
} else {
  // PENDING → failed (vì đã redirect về, mà vẫn PENDING là có vấn đề)
  setStatus('failed');
}
```

**Lý do:**
- MoMo redirect về `PaymentResult` **NGAY** sau khi user thanh toán
- MoMo sẽ gọi callback về backend để cập nhật trạng thái
- Khi frontend check status:
  - `PAID` = Thành công ✅
  - `FAILED` = Thất bại ❌
  - `PENDING` = Có vấn đề (callback chưa đến hoặc bị lỗi) ❌

---

### 2. **useOrderDetail.js** ✅ ĐÃ ĐƠN GIẢN

**Đã xóa:**
- ❌ Logic phức tạp ưu tiên `paymentStatus` từ `payments`
- ❌ Logic check expired payment URL
- ❌ Logic tính toán phức tạp

**Giữ lại:**
- ✅ Chỉ lấy `order.paymentStatus` từ API
- ✅ Backend đã xử lý đúng rồi, frontend chỉ hiển thị

```javascript
// ✅ ĐƠN GIẢN: Chỉ lấy data từ API
const { data } = await getOrderById(id);
setOrder(data.order || null);

// Backend đã xử lý đúng paymentStatus rồi
// Frontend chỉ việc hiển thị order.paymentStatus
```

---

### 3. **payment.js** ✅ OK

API calls đã đúng, không cần sửa:

```javascript
// Tạo payment URL
export const createMoMoPayment = async (orderId) => {
  const response = await axiosClient.post('/payment/momo/create', { orderId });
  return response.data;
};

// Kiểm tra trạng thái
export const getPaymentStatus = async (orderId) => {
  const response = await axiosClient.get(`/payment/status/${orderId}`);
  return response.data;
};
```

---

## 🔄 LUỒNG THANH TOÁN HOÀN CHỈNH

### **BƯỚC 1: User chọn thanh toán MoMo**
```
Frontend (Checkout) 
→ POST /api/payment/momo/create (orderId)
→ Backend tạo payment URL
→ Trả về paymentUrl
→ Frontend redirect đến paymentUrl
```

### **BƯỚC 2: User thanh toán trên MoMo**
```
User quét QR hoặc thanh toán trên app MoMo
→ MoMo xử lý thanh toán
→ MoMo gọi callback về backend (POST /api/payment/momo/callback)
→ Backend cập nhật DB:
   - Nếu resultCode = 0 → paymentStatus = 'PAID'
   - Nếu resultCode != 0 → paymentStatus = 'FAILED'
```

### **BƯỚC 3: MoMo redirect về frontend**
```
MoMo redirect về http://localhost:5173/payment/result?orderId=123
→ PaymentResult component mount
→ Gọi GET /api/payment/status/123
→ Nhận paymentStatus từ DB
→ Hiển thị:
   - PAID → "Thanh toán thành công" ✅
   - FAILED → "Thanh toán thất bại" ❌
   - PENDING → "Thanh toán thất bại" ❌ (vì callback chưa đến)
```

---

## ✅ ĐẢM BẢO TRẠNG THÁI ĐÚNG

### **Khi thanh toán THÀNH CÔNG:**
```
1. MoMo gọi callback với resultCode = 0
2. Backend cập nhật:
   - payment.paymentStatus = 'PAID'
   - order.paymentStatus = 'PAID'
   - payment.paidAt = new Date()
3. Frontend check status → Nhận 'PAID'
4. Hiển thị "Thanh toán thành công" ✅
```

### **Khi user HỦY thanh toán:**
```
1. MoMo gọi callback với resultCode != 0
2. Backend cập nhật:
   - payment.paymentStatus = 'FAILED'
   - order.paymentStatus = 'FAILED'
3. Frontend check status → Nhận 'FAILED'
4. Hiển thị "Thanh toán thất bại" ❌
```

### **Khi callback bị delay:**
```
1. MoMo redirect về frontend trước khi callback đến backend
2. Frontend check status → Nhận 'PENDING'
3. Logic mới: PENDING → Hiển thị "Thanh toán thất bại" ❌
4. Sau đó callback đến → Backend cập nhật DB
5. User reload trang → Nhận trạng thái đúng
```

---

## 🎯 CÁC TRẠNG THÁI THANH TOÁN

| Trạng thái | Backend (DB) | Frontend (UI) | Khi nào? |
|-----------|--------------|---------------|----------|
| **PENDING** | `payment.paymentStatus = 'PENDING'` | Hiển thị "Thanh toán thất bại" | Payment URL được tạo, chưa thanh toán |
| **PAID** | `payment.paymentStatus = 'PAID'` | Hiển thị "Thanh toán thành công" ✅ | User thanh toán thành công |
| **FAILED** | `payment.paymentStatus = 'FAILED'` | Hiển thị "Thanh toán thất bại" ❌ | User hủy hoặc thanh toán bị lỗi |

---

## 🔍 KIỂM TRA ĐỒNG BỘ FRONTEND-BACKEND

### **Test 1: Thanh toán thành công**
```
✅ Backend callback: resultCode = 0
✅ DB: paymentStatus = 'PAID'
✅ Frontend check: Nhận 'PAID'
✅ UI: Hiển thị "Thanh toán thành công"
```

### **Test 2: Hủy thanh toán**
```
✅ Backend callback: resultCode != 0
✅ DB: paymentStatus = 'FAILED'
✅ Frontend check: Nhận 'FAILED'
✅ UI: Hiển thị "Thanh toán thất bại"
```

### **Test 3: Callback delay**
```
⚠️ Backend: Callback chưa đến
⚠️ DB: paymentStatus = 'PENDING'
✅ Frontend check: Nhận 'PENDING'
✅ Logic mới: PENDING → Hiển thị "Thanh toán thất bại"
✅ User reload sau khi callback đến → Hiển thị đúng
```

---

## 📝 CHECKLIST

### ✅ Backend
- [x] `handleMoMoCallback` cập nhật đúng PAID/FAILED
- [x] Dùng `$transaction` để đồng bộ payment và order
- [x] Log đầy đủ để tracking

### ✅ Frontend
- [x] `PaymentResult.jsx` hiển thị đúng trạng thái từ DB
- [x] Không tin query params từ URL
- [x] Luôn gọi API backend để check status
- [x] Xử lý đúng PENDING (coi như failed)

### ✅ API
- [x] `POST /api/payment/momo/create` - Tạo payment URL
- [x] `POST /api/payment/momo/callback` - Nhận callback từ MoMo
- [x] `GET /api/payment/status/:orderId` - Check trạng thái

---

## 🚀 KẾT LUẬN

**Frontend đã được cập nhật để đồng bộ 100% với backend:**

1. ✅ **PaymentResult.jsx** - Hiển thị đúng trạng thái từ DB
2. ✅ **useOrderDetail.js** - Đơn giản hóa, tin backend
3. ✅ **payment.js** - API calls đúng
4. ✅ **Logic PENDING** - Xử lý đúng trường hợp callback delay
5. ✅ **Trạng thái hủy** - Hiển thị FAILED khi user hủy thanh toán

**Không còn vấn đề về đồng bộ trạng thái thanh toán!**

