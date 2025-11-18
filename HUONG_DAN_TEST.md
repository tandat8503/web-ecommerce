# 🧪 HƯỚNG DẪN TEST - HỦY GIAO DỊCH MOMO

## ✅ **ĐÃ CẬP NHẬT**

### **Backend: `paymentController.js`**
- ✅ Thêm logic auto-set `FAILED` khi `fromResult=true` (user bấm "Quay về")
- ✅ Thêm logic auto-set `FAILED` khi payment hết hạn
- ✅ Update cả `Payment` và `Order` trong DB

### **Frontend:**
- ✅ `payment.js`: Thêm param `fromResult`
- ✅ `PaymentResult.jsx`: Gọi API với `fromResult=true`
- ✅ `useOrderDetail.js`: Check payment status khi xem OrderDetail

---

## 📋 **CÁCH TEST**

### **Test 1: User bấm "Quay về" trên MoMo**

```
1. Tạo đơn hàng với thanh toán MoMo
2. Quét QR code trên MoMo
3. Bấm nút "Quay về" (KHÔNG thanh toán)
4. MoMo redirect về: /payment/result?orderId=123

✅ KẾT QUẢ MONG ĐỢI:
- Frontend hiển thị: "Thanh toán thất bại"
- DB payments: paymentStatus = 'FAILED' ✅
- DB orders: paymentStatus = 'FAILED' ✅
```

### **Test 2: Vào trang OrderDetail sau khi hủy**

```
1. Sau khi hủy giao dịch (Test 1)
2. Vào trang: /orders/{orderId}

✅ KẾT QUẢ MONG ĐỢI:
- Hiển thị: "Trạng thái thanh toán: Thanh toán thất bại" 🔴
- Không còn hiển thị "Chờ thanh toán" 🟠
```

### **Test 3: Payment hết hạn (10 phút)**

```
1. Tạo đơn hàng với MoMo
2. KHÔNG thanh toán
3. Đợi hơn 10 phút
4. Vào trang: /orders/{orderId}

✅ KẾT QUẢ MONG ĐỢI:
- Backend tự động set FAILED
- UI hiển thị: "Thanh toán thất bại" 🔴
```

---

## 🔍 **KIỂM TRA DATABASE**

### **Trước khi test:**
```sql
SELECT id, paymentStatus, expiresAt FROM payments WHERE orderId = 123;
-- Kết quả: paymentStatus = 'PENDING'

SELECT id, paymentStatus FROM orders WHERE id = 123;
-- Kết quả: paymentStatus = 'PENDING'
```

### **Sau khi user bấm "Quay về":**
```sql
SELECT id, paymentStatus, expiresAt FROM payments WHERE orderId = 123;
-- Kết quả: paymentStatus = 'FAILED' ✅

SELECT id, paymentStatus FROM orders WHERE id = 123;
-- Kết quả: paymentStatus = 'FAILED' ✅
```

---

## 📊 **LUỒNG XỬ LÝ**

### **Khi user bấm "Quay về":**

```
1. User quét QR → Bấm "Quay về"
2. MoMo redirect: /payment/result?orderId=123
3. PaymentResult.jsx gọi: getPaymentStatus(123, true)
4. Backend nhận: fromResult=true
5. Backend check: payment.paymentStatus === 'PENDING' → Set FAILED
6. Backend update DB:
   - payments.paymentStatus = 'FAILED'
   - orders.paymentStatus = 'FAILED'
7. Frontend nhận response: paymentStatus = 'FAILED'
8. Frontend hiển thị: "Thanh toán thất bại" ✅
```

### **Khi vào OrderDetail:**

```
1. User vào: /orders/123
2. useOrderDetail gọi: getOrderById(123)
3. Nếu MOMO + PENDING → Gọi thêm: getPaymentStatus(123, false)
4. Backend check: expiresAt < now → Set FAILED
5. Backend update DB
6. Frontend nhận response mới
7. Frontend hiển thị: "Thanh toán thất bại" ✅
```

---

## 🐛 **NẾU VẪN CHƯA ĐƯỢC**

### **1. Check API endpoint:**
```bash
# Test API trực tiếp
curl -X GET "http://localhost:5000/api/payment/status/123?fromResult=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### **2. Check browser console:**
```javascript
// Mở DevTools → Console
// Xem có lỗi gì không khi gọi API
```

### **3. Check backend logs:**
```bash
cd backend
npm run dev

# Xem log:
# "Payment #123 set to FAILED (fromResult=true)" ✅
```

### **4. Fix data cũ trong DB:**
```sql
-- Update tất cả payment PENDING thành FAILED
UPDATE payments 
SET paymentStatus = 'FAILED' 
WHERE paymentStatus = 'PENDING' 
  AND paymentMethod = 'MOMO';

-- Update tất cả order PENDING thành FAILED
UPDATE orders 
SET paymentStatus = 'FAILED' 
WHERE paymentMethod = 'MOMO' 
  AND paymentStatus = 'PENDING';
```

---

## ✅ **CHECKLIST**

- [ ] Backend: `getPaymentStatus` có logic auto-set FAILED
- [ ] Frontend: `payment.js` có param `fromResult`
- [ ] Frontend: `PaymentResult.jsx` gọi API với `fromResult=true`
- [ ] Frontend: `useOrderDetail.js` check payment status
- [ ] Test: Bấm "Quay về" → DB updated → UI hiển thị FAILED
- [ ] Test: Vào OrderDetail → UI hiển thị đúng status

---

## 🎯 **KẾT LUẬN**

**Giờ khi user bấm "Quay về" trên MoMo:**
1. ✅ DB tự động update: `paymentStatus = 'FAILED'`
2. ✅ UI hiển thị: "Thanh toán thất bại" 🔴
3. ✅ Không còn "Chờ thanh toán" 🟠

**Hãy test lại và xem kết quả!** 🚀

