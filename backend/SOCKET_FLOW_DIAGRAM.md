# 🔄 Sơ đồ luồng hoạt động Socket.IO - Chi tiết

## 📊 TỔNG QUAN

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Frontend  │         │   Backend    │         │  Database   │
│   (User)    │         │   (Server)   │         │   (MySQL)   │
└─────────────┘         └──────────────┘         └─────────────┘
      │                        │                        │
      │                        │                        │
      │  1. Kết nối WebSocket  │                        │
      │───────────────────────>│                        │
      │                        │                        │
      │  2. Join room "user:5" │                        │
      │───────────────────────>│                        │
      │                        │                        │
      │                        │                        │
      │                        │  3. Admin update order │
      │                        │<───────────────────────│
      │                        │                        │
      │                        │  4. Update DB         │
      │                        │───────────────────────>│
      │                        │                        │
      │                        │  5. Query userId       │
      │                        │<───────────────────────│
      │                        │                        │
      │                        │  6. Emit event        │
      │                        │                        │
      │  7. Nhận event         │                        │
      │<───────────────────────│                        │
      │                        │                        │
      │  8. Cập nhật UI        │                        │
      │                        │                        │
```

---

## 🔍 CHI TIẾT TỪNG BƯỚC

### BƯỚC 1: Frontend kết nối WebSocket

**File**: `frontend/src/utils/socket.js`

```javascript
const socket = initializeSocket(userId);
```

**Chạy khi nào**: 
- User vào trang đơn hàng (MyOrders hoặc OrderDetail)
- Component mount lần đầu

**Làm gì**:
- Tạo kết nối WebSocket đến backend
- Tự động reconnect nếu mất kết nối

---

### BƯỚC 2: Frontend join room

**File**: `frontend/src/utils/socket.js`

```javascript
socket.emit('join:user', userId);
```

**Chạy khi nào**: Sau khi kết nối thành công

**Làm gì**:
- Gửi event `join:user` với userId
- Backend nhận event và join client vào room `user:{userId}`

**Ví dụ**:
- User ID = 5 → Join room `user:5`
- User ID = 10 → Join room `user:10`

---

### BƯỚC 3: Admin cập nhật đơn hàng

**File**: `frontend/src/pages/admin/order/AdminOrders.jsx`

**Chạy khi nào**: Admin click nút "Cập nhật trạng thái"

**Làm gì**:
- Gọi API: `PUT /api/admin/orders/:id`
- Gửi data: `{ status: "CONFIRMED" }`

---

### BƯỚC 4: Backend update database

**File**: `backend/controller/adminOrderController.js`

```javascript
const updated = await prisma.$transaction(async (tx) => {
  // Update order status
  await tx.order.update({
    where: { id },
    data: { status }
  });
  
  // Lưu lịch sử
  await tx.orderStatusHistory.create({
    data: { orderId: id, status }
  });
});
```

**Chạy khi nào**: Nhận request từ admin

**Làm gì**:
1. Update bảng `orders`: SET status = 'CONFIRMED'
2. Insert vào bảng `order_status_history`: Lưu lịch sử

**Dữ liệu lấy từ đâu**:
- `id`: Từ URL params (`req.params.id`)
- `status`: Từ request body (`req.body.status`)

---

### BƯỚC 5: Backend query userId

**File**: `backend/controller/adminOrderController.js`

```javascript
const orderWithUser = await prisma.order.findUnique({
  where: { id: updated.id },
  select: { userId: true }
});
```

**Chạy khi nào**: Sau khi update order thành công

**Làm gì**:
- Query database: `SELECT userId FROM orders WHERE id = ?`
- Lấy userId để biết user nào sở hữu đơn hàng

**Dữ liệu lấy từ đâu**:
- Từ bảng `orders` trong database
- Field `userId` đã có sẵn (lưu khi tạo đơn hàng)

---

### BƯỚC 6: Backend emit event

**File**: `backend/controller/adminOrderController.js`

```javascript
emitOrderStatusUpdate(orderWithUser.userId, {
  id: updated.id,
  orderNumber: updated.orderNumber,
  status: updated.status,
  statusLabel: getStatusLabel(updated.status)
});
```

**Chạy khi nào**: Sau khi query userId thành công

**Làm gì**:
- Gọi hàm `emitOrderStatusUpdate()` trong `socket.js`
- Truyền userId và orderData

**Dữ liệu lấy từ đâu**:
- `userId`: Từ database (bước 5)
- `id`: Từ `updated.id` (sau khi update)
- `orderNumber`: Từ `updated.orderNumber` (có sẵn)
- `status`: Từ `updated.status` (vừa update)
- `statusLabel`: Convert từ status (hàm `getStatusLabel()`)

---

### BƯỚC 7: Socket.IO gửi event

**File**: `backend/config/socket.js`

```javascript
io.to(userRoom).emit('order:status:updated', { ... });
```

**Chạy khi nào**: Trong hàm `emitOrderStatusUpdate()`

**Làm gì**:
- Gửi event `order:status:updated` đến các room:
  - `user:{userId}`: User sở hữu đơn hàng
  - `order:{orderId}`: User đang xem đơn hàng này
  - `admin`: Admin dashboard

**Dữ liệu gửi đi**:
```javascript
{
  orderId: 10,
  orderNumber: "00120251030001",
  status: "CONFIRMED",
  statusLabel: "Đã xác nhận",
  updatedAt: "2025-01-30T10:30:00.000Z"
}
```

---

### BƯỚC 8: Frontend nhận event

**File**: `frontend/src/pages/user/OrderDetail.jsx`

```javascript
onOrderStatusUpdate((data) => {
  if (data.orderId === Number(id)) {
    message.success(`Đơn hàng ${data.orderNumber} đã được cập nhật`);
    fetchDetail(); // Refresh data
  }
});
```

**Chạy khi nào**: Khi nhận được event `order:status:updated`

**Làm gì**:
1. Kiểm tra có phải đơn hàng đang xem không
2. Hiển thị thông báo
3. Refresh data từ API

---

## 🎯 TÓM TẮT DỮ LIỆU

### Dữ liệu lấy từ Database:
- ✅ `userId` - Từ bảng `orders` (field `userId`)
- ✅ `order.id` - Từ bảng `orders` (field `id`)
- ✅ `order.orderNumber` - Từ bảng `orders` (field `order_number`)
- ✅ `order.status` - Từ bảng `orders` (field `status`)

### Dữ liệu KHÔNG lấy từ Database:
- ❌ `statusLabel` - Convert từ `status` bằng hàm `getStatusLabel()`
- ❌ `updatedAt` - Tạo mới bằng `new Date().toISOString()`

---

## 🔑 KEY POINTS

1. **Socket.IO KHÔNG query database trực tiếp**
   - Chỉ nhận dữ liệu từ controller
   - Controller mới là nơi query database

2. **Dữ liệu flow**:
   ```
   Database → Controller → Socket.IO → Frontend
   ```

3. **Room system**:
   - Mỗi user có room riêng: `user:{userId}`
   - Mỗi order có room riêng: `order:{orderId}`
   - Admin có room chung: `admin`

4. **Real-time update**:
   - Không cần polling (gọi API liên tục)
   - Tự động nhận update khi có thay đổi

















