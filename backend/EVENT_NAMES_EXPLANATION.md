# 📡 Giải thích Event Names trong Socket.IO

## ❓ Câu hỏi: `join:user` lấy ở đâu?

### ✅ TRẢ LỜI: KHÔNG lấy từ database, mà là TÊN EVENT do frontend tự định nghĩa

---

## 🔍 CHI TIẾT

### 1. `join:user` là gì?

- **Là tên event** (tên sự kiện) trong Socket.IO
- **Do developer tự đặt tên** (không có sẵn trong Socket.IO)
- **Quy ước giữa frontend và backend** để giao tiếp

### 2. Frontend gửi event như thế nào?

**File**: `frontend/src/utils/socket.js` (dòng 39, 55)

```javascript
// Khi kết nối thành công
socket.on('connect', () => {
  if (userId) {
    socket.emit('join:user', userId);  // ← Gửi event 'join:user' với data là userId
  }
});
```

**Giải thích**:
- `socket.emit('join:user', userId)` = Gửi event tên `'join:user'` với dữ liệu là `userId`
- `userId` lấy từ: `localStorage.getItem('user')` → parse JSON → lấy `id`

### 3. Backend nhận event như thế nào?

**File**: `backend/config/socket.js` (dòng 74-78)

```javascript
socket.on('join:user', (userId) => {
  // userId: Nhận từ frontend (không phải từ database)
  const userRoom = `user:${userId}`;
  socket.join(userRoom);
});
```

**Giải thích**:
- `socket.on('join:user', ...)` = Lắng nghe event tên `'join:user'`
- Khi nhận được, callback function chạy với `userId` là tham số

---

## 📊 LUỒNG HOẠT ĐỘNG

```
┌─────────────┐                    ┌──────────────┐
│  Frontend   │                    │   Backend    │
└─────────────┘                    └──────────────┘
      │                                   │
      │  1. User vào trang đơn hàng      │
      │     → Lấy userId từ localStorage │
      │                                   │
      │  2. socket.emit('join:user', 5)  │
      │──────────────────────────────────>│
      │                                   │
      │                                   │  3. socket.on('join:user', ...)
      │                                   │     → Nhận userId = 5
      │                                   │
      │                                   │  4. socket.join('user:5')
      │                                   │     → Client join vào room
      │                                   │
      │  5. Đã join room thành công       │
      │<──────────────────────────────────│
      │                                   │
```

---

## 🎯 CÁC EVENT NAMES KHÁC

### `join:user`
- **Frontend gửi**: `socket.emit('join:user', userId)`
- **Backend nhận**: `socket.on('join:user', (userId) => { ... })`
- **Mục đích**: User join room để nhận updates cho đơn hàng của họ

### `join:admin`
- **Frontend gửi**: `socket.emit('join:admin')`
- **Backend nhận**: `socket.on('join:admin', () => { ... })`
- **Mục đích**: Admin join room để nhận tất cả order updates

### `join:order`
- **Frontend gửi**: `socket.emit('join:order', orderId)`
- **Backend nhận**: `socket.on('join:order', (orderId) => { ... })`
- **Mục đích**: Join room cho một đơn hàng cụ thể

### `order:status:updated`
- **Backend gửi**: `io.to(room).emit('order:status:updated', data)`
- **Frontend nhận**: `socket.on('order:status:updated', (data) => { ... })`
- **Mục đích**: Gửi thông báo cập nhật trạng thái đơn hàng

---

## 📝 TÓM TẮT

### `join:user` lấy ở đâu?

1. **KHÔNG lấy từ database**
2. **Là tên event do developer tự đặt**
3. **Frontend gửi**: `socket.emit('join:user', userId)`
4. **Backend nhận**: `socket.on('join:user', (userId) => { ... })`
5. **userId lấy từ**: `localStorage.getItem('user')` trong frontend

### Tại sao dùng tên `join:user`?

- **Convention**: Quy ước đặt tên dễ hiểu
- **Format**: `action:target` (hành động:đối tượng)
- **Ví dụ**: 
  - `join:user` = Join room của user
  - `join:order` = Join room của order
  - `order:status:updated` = Order status đã được cập nhật

### Có thể đổi tên không?

**CÓ**, bạn có thể đổi thành bất kỳ tên nào, miễn là:
- Frontend và Backend dùng cùng tên
- Tên dễ hiểu, dễ nhớ

**Ví dụ**:
- `join:user` → `user:join` ✅
- `join:user` → `joinUserRoom` ✅
- `join:user` → `abc123` ✅ (nhưng không nên)

---

## ✅ KẾT LUẬN

**`join:user` là tên event do developer tự định nghĩa, không lấy từ database hay bất kỳ đâu cả. Đây là cách frontend và backend "nói chuyện" với nhau qua Socket.IO.**



