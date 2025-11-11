# ❓ Tại sao cần viết nhiều sự kiện (events) trong Socket.IO?

## 🎯 TRẢ LỜI NGẮN GỌN

**Mỗi event có mục đích riêng, giống như mỗi nút bấm trên remote có chức năng khác nhau.**

---

## 📋 PHÂN LOẠI EVENTS

### 1. **EVENTS CÓ SẴN** (Socket.IO tự tạo)

Những events này Socket.IO tự động tạo, developer chỉ cần lắng nghe:

| Event | Mục đích | Khi nào chạy |
|-------|----------|--------------|
| `'connect'` | Kết nối thành công | Khi Socket.IO client kết nối với server |
| `'disconnect'` | Mất kết nối | Khi mất kết nối (mạng lỗi, server down) |
| `'reconnect'` | Reconnect thành công | Sau khi mất kết nối và reconnect lại |
| `'connect_error'` | Lỗi kết nối | Khi không thể kết nối (server chưa start, URL sai) |

**Tại sao cần?**
- Biết được trạng thái kết nối (đã kết nối chưa? mất kết nối chưa?)
- Xử lý lỗi và reconnect tự động
- Không thể thiếu, Socket.IO tự động emit

---

### 2. **EVENTS TỰ ĐẶT** (Developer tự định nghĩa)

Những events này developer tự đặt tên để giao tiếp giữa frontend và backend:

| Event | Mục đích | Ai gửi? | Ai nhận? |
|-------|----------|---------|----------|
| `'join:user'` | User join vào room của mình | Frontend | Backend |
| `'join:order'` | User join vào room của đơn hàng | Frontend | Backend |
| `'leave:order'` | User rời khỏi room của đơn hàng | Frontend | Backend |
| `'order:status:updated'` | Backend gửi thông báo cập nhật đơn hàng | Backend | Frontend |

**Tại sao cần?**
- Mỗi event có mục đích riêng, không thể dùng chung
- Dễ hiểu, dễ maintain (tên event nói rõ mục đích)
- Linh hoạt, có thể thêm events mới khi cần

---

## 🔍 VÍ DỤ CỤ THỂ

### ❌ NẾU CHỈ DÙNG 1 EVENT:

```javascript
// ❌ KHÔNG TỐT: Dùng 1 event cho tất cả
socket.on('message', (data) => {
  if (data.type === 'connect') { ... }
  if (data.type === 'join:user') { ... }
  if (data.type === 'join:order') { ... }
  if (data.type === 'order:updated') { ... }
  if (data.type === 'disconnect') { ... }
});
```

**Vấn đề:**
- Khó đọc, khó maintain
- Phải kiểm tra `data.type` mỗi lần
- Dễ nhầm lẫn, khó debug

---

### ✅ DÙNG NHIỀU EVENTS (Cách hiện tại):

```javascript
// ✅ TỐT: Mỗi event có mục đích riêng
socket.on('connect', () => { ... });
socket.on('disconnect', (reason) => { ... });
socket.on('join:user', (userId) => { ... });
socket.on('join:order', (orderId) => { ... });
socket.on('order:status:updated', (data) => { ... });
```

**Ưu điểm:**
- Dễ đọc, dễ hiểu
- Mỗi event xử lý một việc
- Dễ debug (biết ngay event nào chạy)
- Dễ maintain (thêm/sửa/xóa event dễ dàng)

---

## 🎯 TẠI SAO CẦN NHIỀU EVENTS?

### 1. **Mỗi event có mục đích riêng**

Giống như:
- Nút "Bật TV" → Bật TV
- Nút "Tăng âm lượng" → Tăng âm lượng
- Nút "Chuyển kênh" → Chuyển kênh

Không thể dùng 1 nút cho tất cả!

---

### 2. **Dễ đọc và maintain**

```javascript
// ✅ Dễ hiểu
socket.on('order:status:updated', (data) => {
  // Rõ ràng: Event này xử lý cập nhật đơn hàng
});

// ❌ Khó hiểu
socket.on('message', (data) => {
  if (data.type === 'order:status:updated') {
    // Phải đọc code mới biết làm gì
  }
});
```

---

### 3. **Linh hoạt**

Có thể:
- Thêm event mới: `'order:cancelled'`, `'order:refunded'`
- Xóa event không dùng
- Sửa event riêng lẻ không ảnh hưởng event khác

---

### 4. **Tách biệt logic**

Mỗi event xử lý một việc:
- `'connect'` → Xử lý khi kết nối
- `'disconnect'` → Xử lý khi mất kết nối
- `'join:user'` → Xử lý khi join user room
- `'order:status:updated'` → Xử lý khi đơn hàng cập nhật

---

## 📊 SO SÁNH

### Cách 1: Dùng 1 event (KHÔNG TỐT)

```javascript
socket.on('message', (data) => {
  switch (data.type) {
    case 'connect':
      // Xử lý connect
      break;
    case 'disconnect':
      // Xử lý disconnect
      break;
    case 'join:user':
      // Xử lý join user
      break;
    case 'order:updated':
      // Xử lý order updated
      break;
  }
});
```

**Nhược điểm:**
- Phải kiểm tra `data.type` mỗi lần
- Khó đọc, khó maintain
- Dễ nhầm lẫn

---

### Cách 2: Dùng nhiều events (TỐT - Cách hiện tại)

```javascript
socket.on('connect', () => { ... });
socket.on('disconnect', (reason) => { ... });
socket.on('join:user', (userId) => { ... });
socket.on('order:status:updated', (data) => { ... });
```

**Ưu điểm:**
- Dễ đọc, dễ hiểu
- Mỗi event xử lý một việc
- Dễ debug và maintain

---

## ✅ KẾT LUẬN

### Tại sao cần nhiều events?

1. **Mỗi event có mục đích riêng** → Không thể dùng chung
2. **Dễ đọc và maintain** → Code rõ ràng, dễ hiểu
3. **Linh hoạt** → Dễ thêm/sửa/xóa
4. **Tách biệt logic** → Mỗi event xử lý một việc

### Giống như:

- **Remote TV có nhiều nút**: Mỗi nút có chức năng riêng
- **Bàn phím có nhiều phím**: Mỗi phím có ký tự riêng
- **Socket.IO có nhiều events**: Mỗi event có mục đích riêng

---

## 🎯 TÓM TẮT

**Cần nhiều events vì:**
- Mỗi event có mục đích riêng
- Dễ đọc, dễ maintain
- Linh hoạt, dễ mở rộng
- Tách biệt logic

**Không thể dùng 1 event cho tất cả vì:**
- Khó đọc, khó maintain
- Phải kiểm tra type mỗi lần
- Dễ nhầm lẫn, khó debug

