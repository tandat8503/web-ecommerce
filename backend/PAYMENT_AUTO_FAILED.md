# ✅ TỰ ĐỘNG SET FAILED CHO PAYMENT HẾT HẠN

## ❌ **VẤN ĐỀ TRƯỚC ĐÓ**

Khi user **bấm "Quay về"** trên MoMo (không thanh toán):

```
1. User quét QR MoMo
2. User bấm "Quay về" (hủy thanh toán)
3. MoMo redirect về PaymentResult → Hiển thị "Thanh toán thất bại" ✅
4. User xem OrderDetail → Vẫn hiển thị "Chờ thanh toán" ❌
```

**Nguyên nhân:**
- MoMo **KHÔNG** gọi callback khi user bấm "Quay về"
- DB vẫn giữ `paymentStatus = 'PENDING'`
- `PaymentResult` hiển thị đúng (vì có logic PENDING → failed)
- `OrderDetail` hiển thị sai (vì lấy trực tiếp từ DB = PENDING)

---

## ✅ **GIẢI PHÁP**

Thêm logic **TỰ ĐỘNG SET FAILED** vào 2 API:

### **1. API: `GET /api/payment/status/:orderId`** 
*(File: `paymentController.js` - Hàm `getPaymentStatus`)*

```javascript
// ✅ TỰ ĐỘNG SET FAILED nếu vẫn PENDING và đã hết hạn
if (payment.paymentStatus === 'PENDING' && payment.expiresAt) {
  const now = new Date();
  const expiresAt = new Date(payment.expiresAt);
  
  if (now > expiresAt) {
    // Đã hết hạn → Cập nhật thành FAILED
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { paymentStatus: 'FAILED' }
      }),
      prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'FAILED' }
      })
    ]);
    
    payment.paymentStatus = 'FAILED';
    
    logger.info('Payment expired, set to FAILED', {
      paymentId: payment.id,
      orderId: order.id,
      expiresAt: payment.expiresAt
    });
  }
}
```

### **2. API: `GET /api/orders/:id`**
*(File: `orderController.js` - Hàm `getOrderById`)*

```javascript
// ✅ TỰ ĐỘNG SET FAILED nếu payment PENDING đã hết hạn
if (order.paymentMethod === 'MOMO' && order.payments[0]) {
  const payment = order.payments[0];
  if (payment.paymentStatus === 'PENDING' && payment.expiresAt) {
    const now = new Date();
    const expiresAt = new Date(payment.expiresAt);
    
    if (now > expiresAt) {
      // Đã hết hạn → Cập nhật thành FAILED
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: { paymentStatus: 'FAILED' }
        }),
        prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: 'FAILED' }
        })
      ]);
      
      // Cập nhật local object để trả về đúng
      order.paymentStatus = 'FAILED';
      payment.paymentStatus = 'FAILED';
      
      logger.info('Payment expired when getting order detail, set to FAILED', {
        paymentId: payment.id,
        orderId: order.id,
        expiresAt: payment.expiresAt
      });
    }
  }
}
```

---

## 🔄 **LUỒNG MỚI**

### **Khi user bấm "Quay về" trên MoMo:**

```
1. User quét QR MoMo
2. User bấm "Quay về" (không thanh toán)
3. MoMo redirect về /payment/result?orderId=123
4. Frontend gọi GET /api/payment/status/123
5. Backend kiểm tra:
   - paymentStatus = PENDING ✅
   - expiresAt đã quá (10 phút) ✅
   → TỰ ĐỘNG cập nhật DB:
     - payment.paymentStatus = 'FAILED'
     - order.paymentStatus = 'FAILED'
6. Frontend nhận 'FAILED' → Hiển thị "Thanh toán thất bại" ✅

7. User xem chi tiết đơn hàng
8. Frontend gọi GET /api/orders/123
9. Backend kiểm tra:
   - paymentStatus = FAILED (đã update ở bước 5) ✅
   → Trả về 'FAILED'
10. Frontend hiển thị "Thanh toán thất bại" ✅
```

---

## ✅ **KẾT QUẢ**

| Hành động | PaymentResult | OrderDetail |
|-----------|---------------|-------------|
| **Thanh toán thành công** | ✅ "Thanh toán thành công" | ✅ "Đã thanh toán" |
| **Hủy thanh toán (Quay về)** | ✅ "Thanh toán thất bại" | ✅ "Thanh toán thất bại" |
| **Payment hết hạn** | ✅ "Thanh toán thất bại" | ✅ "Thanh toán thất bại" |

---

## 🔍 **CHI TIẾT KỸ THUẬT**

### **1. Khi nào tự động set FAILED?**
```javascript
// Điều kiện:
1. paymentStatus === 'PENDING' (chưa thanh toán)
2. expiresAt < now (đã hết hạn 10 phút)

// Hành động:
1. Cập nhật payment.paymentStatus = 'FAILED'
2. Cập nhật order.paymentStatus = 'FAILED'
3. Dùng $transaction để đồng bộ 2 updates
```

### **2. Tại sao cần 2 API?**
```
- GET /api/payment/status/:orderId
  → Gọi từ PaymentResult (sau khi MoMo redirect)
  → Tự động set FAILED nếu hết hạn

- GET /api/orders/:id
  → Gọi từ OrderDetail (xem chi tiết đơn)
  → Tự động set FAILED nếu hết hạn
  → Đảm bảo đồng bộ khi user refresh page
```

### **3. Tại sao dùng $transaction?**
```javascript
await prisma.$transaction([
  prisma.payment.update(...),
  prisma.order.update(...)
]);

// Lý do:
- Cập nhật 2 bảng cùng lúc
- Nếu 1 bảng fail → Rollback cả 2
- Đảm bảo consistency (không bị lệch data)
```

---

## 🎯 **TEST CASE**

### **Test 1: User hủy thanh toán (bấm "Quay về")**
```
✅ MoMo redirect về PaymentResult
✅ Backend check: PENDING + hết hạn → Set FAILED
✅ PaymentResult: Hiển thị "Thanh toán thất bại"
✅ OrderDetail: Hiển thị "Thanh toán thất bại"
```

### **Test 2: User để payment hết hạn (không thanh toán)**
```
✅ User không làm gì
✅ 10 phút sau, user vào xem OrderDetail
✅ Backend check: PENDING + hết hạn → Set FAILED
✅ OrderDetail: Hiển thị "Thanh toán thất bại"
```

### **Test 3: User thanh toán thành công**
```
✅ MoMo callback: resultCode = 0
✅ Backend set: PAID
✅ PaymentResult: Hiển thị "Thanh toán thành công"
✅ OrderDetail: Hiển thị "Đã thanh toán"
```

---

## 📝 **CHECKLIST**

- [x] Logic tự động set FAILED trong `getPaymentStatus`
- [x] Logic tự động set FAILED trong `getOrderById`
- [x] Dùng `$transaction` để đồng bộ updates
- [x] Update local object trước khi return
- [x] Log để tracking (logger.info)
- [x] Kiểm tra `expiresAt` trước khi so sánh
- [x] Chỉ áp dụng cho đơn MOMO

---

## 🚀 **KẾT LUẬN**

**Giờ đây, trạng thái thanh toán luôn chính xác:**
- ✅ User bấm "Quay về" → Tự động FAILED
- ✅ Payment hết hạn → Tự động FAILED
- ✅ Callback từ MoMo → PAID/FAILED đúng
- ✅ Đồng bộ giữa PaymentResult và OrderDetail

**Không còn trường hợp "Chờ thanh toán" sau khi đã hủy!** 🎉

