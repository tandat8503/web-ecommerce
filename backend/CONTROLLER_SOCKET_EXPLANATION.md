# 🔍 Giải thích: Socket.IO được dùng ở đâu trong adminOrderController.js?

## 📍 VỊ TRÍ: Dòng 3 (import) và Dòng 370-384 (sử dụng)

---

## 🔍 CHI TIẾT TỪNG CHỖ

### 1. Dòng 3: Import hàm Socket.IO

```javascript
import { emitOrderStatusUpdate } from '../config/socket.js';
```

**Làm gì?**
- Import hàm `emitOrderStatusUpdate` từ file `backend/config/socket.js`
- Hàm này dùng để gửi thông báo cập nhật đơn hàng đến user qua WebSocket

**Tại sao cần import?**
- Để có thể gọi hàm `emitOrderStatusUpdate()` trong controller
- Không import thì không thể dùng được

---

### 2. Dòng 370-384: Sử dụng Socket.IO

```javascript
// BƯỚC 1: Lấy userId từ database
const orderWithUser = await prisma.order.findUnique({
  where: { id: updated.id },
  select: { userId: true }
});

// BƯỚC 2: Gửi WebSocket event
if (orderWithUser) {
  emitOrderStatusUpdate(orderWithUser.userId, {
    id: updated.id,
    orderNumber: updated.orderNumber,
    status: updated.status,
    statusLabel: getStatusLabel(updated.status)
  });
}
```

**Khi nào chạy?**
- Sau khi admin cập nhật trạng thái đơn hàng thành công
- Sau khi đã update database và lưu lịch sử

**Làm gì?**
1. Query database để lấy `userId` của đơn hàng
2. Gọi `emitOrderStatusUpdate()` để gửi thông báo đến user

---

## 📊 LUỒNG HOẠT ĐỘNG

```
1. Admin gọi API: PUT /api/admin/orders/:id
   Body: { status: "CONFIRMED" }
   ↓
2. updateOrder() function chạy
   ↓
3. Validate status (dòng 261-313)
   ↓
4. Update database (dòng 316-362)
   - UPDATE orders SET status = 'CONFIRMED'
   - INSERT INTO order_status_history
   - Restore stock nếu CANCELLED
   ↓
5. Query userId từ database (dòng 371-374) ← LẤY userId
   SELECT userId FROM orders WHERE id = ?
   ↓
6. Gọi emitOrderStatusUpdate() (dòng 378-383) ← DÙNG SOCKET.IO
   emitOrderStatusUpdate(userId, orderData)
   ↓
7. Socket.IO gửi event đến user
   ↓
8. User nhận được thông báo real-time
```

---

## 🔍 CHI TIẾT DỮ LIỆU

### Dòng 371-374: Query userId

```javascript
const orderWithUser = await prisma.order.findUnique({
  where: { id: updated.id },
  select: { userId: true }
});
```

**Làm gì?**
- Query database: `SELECT userId FROM orders WHERE id = ?`
- Lấy `userId` để biết user nào sở hữu đơn hàng

**Dữ liệu lấy từ đâu?**
- Từ bảng `orders` trong database
- Field `userId` đã có sẵn (lưu khi tạo đơn hàng)

**Kết quả:**
```javascript
orderWithUser = {
  userId: 5  // ID của user sở hữu đơn hàng
}
```

---

### Dòng 378-383: Gọi emitOrderStatusUpdate()

```javascript
emitOrderStatusUpdate(
  orderWithUser.userId,  // userId = 5 (từ DB)
  {
    id: updated.id,                    // order.id = 10 (từ DB)
    orderNumber: updated.orderNumber,  // order.orderNumber (từ DB)
    status: updated.status,            // order.status = "CONFIRMED" (từ DB, vừa update)
    statusLabel: getStatusLabel(updated.status) // "Đã xác nhận" (convert từ status)
  }
);
```

**Tham số 1: `orderWithUser.userId`**
- Lấy từ database (dòng 371-374)
- Ví dụ: `userId = 5`

**Tham số 2: Object `orderData`**
- `id`: Từ `updated.id` (sau khi update DB)
- `orderNumber`: Từ `updated.orderNumber` (có sẵn)
- `status`: Từ `updated.status` (vừa được update)
- `statusLabel`: Convert từ `status` bằng hàm `getStatusLabel()`

**Kết quả:**
- Socket.IO gửi event đến room `user:5`
- User có ID = 5 nhận được thông báo cập nhật

---

## ✅ TÓM TẮT

### Socket.IO được dùng ở đâu trong adminOrderController.js?

**Có 2 chỗ:**

1. **Dòng 3**: Import hàm
   ```javascript
   import { emitOrderStatusUpdate } from '../config/socket.js';
   ```

2. **Dòng 378-383**: Gọi hàm
   ```javascript
   emitOrderStatusUpdate(orderWithUser.userId, {
     id: updated.id,
     orderNumber: updated.orderNumber,
     status: updated.status,
     statusLabel: getStatusLabel(updated.status)
   });
   ```

### Dữ liệu lấy từ đâu?

| Dữ liệu | Lấy từ đâu |
|---------|------------|
| `userId` | Database: `SELECT userId FROM orders WHERE id = ?` |
| `id` | Từ `updated.id` (sau khi update DB) |
| `orderNumber` | Từ `updated.orderNumber` (có sẵn trong DB) |
| `status` | Từ `updated.status` (vừa được update trong DB) |
| `statusLabel` | Convert từ `status` bằng hàm `getStatusLabel()` |

### Khi nào chạy?

- Sau khi admin cập nhật trạng thái đơn hàng thành công
- Sau khi đã update database và lưu lịch sử
- Trước khi trả response về cho admin

### Mục đích?

- Gửi thông báo real-time đến user
- User nhận được update ngay lập tức, không cần refresh trang
























