# 📚 Giải thích Schema Prisma - Chi tiết từng dòng

## 🎯 Mục đích
File `schema.prisma` định nghĩa cấu trúc database (tables, columns, relationships)

---

## 📋 CẤU TRÚC FILE

### PHẦN 1: Generator & Datasource (Dòng 1-11)

```prisma
generator client {
  provider = "prisma-client-js"
}
```
- **Chức năng**: Tạo Prisma Client (thư viện để query database)
- **provider**: Dùng JavaScript client
- **Khi nào chạy**: Khi chạy `npx prisma generate`

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```
- **Chức năng**: Cấu hình kết nối database
- **provider**: Dùng MySQL database
- **url**: Lấy từ biến môi trường `DATABASE_URL` trong file `.env`
- **Ví dụ DATABASE_URL**: `mysql://user:password@localhost:3306/database`

---

## 📦 CÁC MODEL QUAN TRỌNG CHO SOCKET.IO

### 1. MODEL User (Dòng 16-49)

```prisma
model User {
  id              Int       @id @default(autoincrement())
```
- **id**: Primary key, tự động tăng (1, 2, 3, ...)
- **Lấy từ đâu**: Database tự động tạo khi insert user mới
- **Dùng trong Socket.IO**: `userId` trong `emitOrderStatusUpdate(userId, ...)`

```prisma
  email           String    @unique
```
- **email**: Email của user, phải duy nhất (không trùng)
- **Lấy từ đâu**: User nhập khi đăng ký

```prisma
  role            UserRole  @default(CUSTOMER)
```
- **role**: Vai trò (CUSTOMER hoặc ADMIN)
- **Lấy từ đâu**: Mặc định là CUSTOMER, admin có thể set ADMIN
- **Dùng trong Socket.IO**: Phân biệt user thường và admin

```prisma
  orders           Order[]
```
- **orders**: Quan hệ 1-nhiều với bảng Order
- **Ý nghĩa**: Một user có thể có nhiều đơn hàng
- **Dùng trong Socket.IO**: Lấy `userId` từ `order.userId` để biết user nào sở hữu đơn hàng

---

### 2. MODEL Order (Dòng 335-363)

```prisma
model Order {
  id               Int           @id @default(autoincrement())
```
- **id**: ID đơn hàng, tự động tăng
- **Lấy từ đâu**: Database tự động tạo
- **Dùng trong Socket.IO**: `orderData.id` trong `emitOrderStatusUpdate()`

```prisma
  orderNumber      String        @unique @map("order_number")
```
- **orderNumber**: Mã đơn hàng (ví dụ: "00120251030001")
- **Lấy từ đâu**: Hàm `generateOrderNumber()` trong `orderController.js` tạo ra
- **Dùng trong Socket.IO**: `orderData.orderNumber` để hiển thị cho user

```prisma
  userId           Int           @map("user_id")
```
- **userId**: ID của user sở hữu đơn hàng
- **Lấy từ đâu**: Từ `req.user.id` khi user tạo đơn hàng
- **Dùng trong Socket.IO**: 
  - Lấy từ DB: `order.userId` 
  - Truyền vào: `emitOrderStatusUpdate(userId, ...)`

```prisma
  status           OrderStatus   @default(PENDING)
```
- **status**: Trạng thái đơn hàng (PENDING, CONFIRMED, PROCESSING, DELIVERED, CANCELLED)
- **Lấy từ đâu**: 
  - Mặc định: PENDING khi tạo đơn
  - Admin update: Từ `req.body.status` trong `adminOrderController.js`
- **Dùng trong Socket.IO**: `orderData.status` để gửi đến user

```prisma
  user             User                @relation(fields: [userId], references: [id])
```
- **user**: Quan hệ với bảng User
- **Ý nghĩa**: Mỗi đơn hàng thuộc về một user
- **Dùng trong Socket.IO**: Query `order.userId` để lấy userId

```prisma
  statusHistory    OrderStatusHistory[]
```
- **statusHistory**: Lịch sử thay đổi trạng thái
- **Ý nghĩa**: Lưu lại mọi lần thay đổi trạng thái (để hiển thị timeline)
- **Dùng trong Socket.IO**: Không dùng trực tiếp, nhưng có thể dùng để hiển thị timeline

---

### 3. MODEL OrderStatusHistory (Dòng 392-402)

```prisma
model OrderStatusHistory {
  id        Int         @id @default(autoincrement())
  orderId   Int         @map("order_id")
  status    OrderStatus
  createdAt DateTime    @default(now()) @map("created_at")
```
- **Chức năng**: Lưu lịch sử mỗi lần thay đổi trạng thái
- **Lấy từ đâu**: Tự động tạo khi admin update order status
- **Dùng trong Socket.IO**: Không dùng, nhưng dùng để hiển thị timeline cho user

---

## 🔄 LUỒNG DỮ LIỆU TRONG SOCKET.IO

### Khi admin update order status:

```
1. Admin gọi API: PUT /api/admin/orders/:id
   ↓
2. adminOrderController.js → updateOrder()
   ↓
3. Update database:
   - UPDATE orders SET status = 'CONFIRMED' WHERE id = 10
   - INSERT INTO order_status_history (orderId, status) VALUES (10, 'CONFIRMED')
   ↓
4. Query lại để lấy userId:
   - SELECT userId FROM orders WHERE id = 10
   → userId = 5
   ↓
5. Gọi emitOrderStatusUpdate():
   emitOrderStatusUpdate(5, {
     id: 10,                    // ← Từ DB: order.id
     orderNumber: "00120251030001", // ← Từ DB: order.orderNumber
     status: "CONFIRMED",        // ← Từ DB: order.status (vừa update)
     statusLabel: "Đã xác nhận"  // ← Convert từ status (trong controller)
   })
   ↓
6. Socket.IO gửi event đến:
   - Room "user:5" (user sở hữu đơn hàng)
   - Room "order:10" (user đang xem đơn hàng này)
   - Room "admin" (admin dashboard)
   ↓
7. Frontend nhận event → Cập nhật UI
```

---

## 📝 CÁC ENUM QUAN TRỌNG

### OrderStatus (Dòng 585-591)
```prisma
enum OrderStatus {
  PENDING      // Chờ xác nhận
  CONFIRMED    // Đã xác nhận
  PROCESSING   // Đang giao
  DELIVERED    // Đã giao
  CANCELLED    // Đã hủy
}
```
- **Lấy từ đâu**: Định nghĩa trong schema
- **Dùng trong Socket.IO**: `orderData.status` là một trong các giá trị này

---

## ✅ TÓM TẮT

### Dữ liệu Socket.IO lấy từ đâu?

1. **userId**: 
   - Từ database: `SELECT userId FROM orders WHERE id = ?`
   - Query trong `adminOrderController.js` sau khi update

2. **orderData.id**: 
   - Từ database: `order.id` (đã có sẵn sau khi update)

3. **orderData.orderNumber**: 
   - Từ database: `order.orderNumber` (đã có sẵn)

4. **orderData.status**: 
   - Từ database: `order.status` (vừa được update)

5. **orderData.statusLabel**: 
   - KHÔNG lấy từ DB
   - Convert trong controller: `getStatusLabel(status)`
   - Ví dụ: "CONFIRMED" → "Đã xác nhận"

### Cách hoạt động:

1. **Database** → Lưu dữ liệu đơn hàng
2. **Controller** → Update DB, lấy dữ liệu, gọi Socket.IO
3. **Socket.IO** → Gửi event đến các room
4. **Frontend** → Nhận event, cập nhật UI








