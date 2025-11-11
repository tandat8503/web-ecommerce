# HƯỚNG DẪN API QUẢN LÝ ĐƠN HÀNG CHO ADMIN

## 📋 DANH SÁCH API CẦN THIẾT

### 1. **GET /api/admin/orders** - Danh sách đơn hàng
**Mô tả:** Xem tất cả đơn hàng của tất cả users

**Query params:**
- `page`: Số trang (mặc định: 1)
- `limit`: Số lượng mỗi trang (mặc định: 10)
- `status`: Lọc theo trạng thái (PENDING, CONFIRMED, PROCESSING, DELIVERED, CANCELLED)
- `q`: Tìm kiếm theo số đơn hàng hoặc tên khách hàng

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "orderNumber": "00120251030001",
      "status": "PENDING",
      "statusLabel": "Chờ xác nhận",
      "totalAmount": 1000000,
      "user": { "id": 1, "firstName": "Nguyễn", "lastName": "Văn A" },
      "orderItems": [...],
      "availableStatuses": [
        { "value": "CONFIRMED", "label": "Đã xác nhận" },
        { "value": "CANCELLED", "label": "Đã hủy" }
      ]
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

---

### 2. **GET /api/admin/orders/:id** - Chi tiết đơn hàng
**Mô tả:** Xem chi tiết 1 đơn hàng cụ thể

**Response:**
```json
{
  "id": 1,
  "orderNumber": "00120251030001",
  "status": "PENDING",
  "statusLabel": "Chờ xác nhận",
  "user": { ... },
  "orderItems": [...],
  "payments": [...],
  "adminNote": "Ghi chú nội bộ",
  "availableStatuses": [...]
}
```

---

### 3. **PUT /api/admin/orders/:id** - Cập nhật trạng thái đơn hàng
**Mô tả:** Admin thay đổi trạng thái đơn hàng

**Request body:**
```json
{
  "status": "CONFIRMED"
}
```

**Quy trình:**
1. Validate: status phải hợp lệ và có thể chuyển được
2. Cập nhật trong transaction:
   - Cập nhật `order.status`
   - Lưu vào `order_status_history`
   - Nếu hủy → Hoàn trả tồn kho
3. Gửi WebSocket thông báo đến user

**Response:**
```json
{
  "id": 1,
  "orderNumber": "00120251030001",
  "status": "CONFIRMED",
  "statusLabel": "Đã xác nhận",
  "message": "Order status updated from PENDING to CONFIRMED"
}
```

---

### 4. **PUT /api/admin/orders/:id/notes** - Cập nhật ghi chú
**Mô tả:** Admin thêm/sửa ghi chú nội bộ

**Request body:**
```json
{
  "notes": "Khách hàng yêu cầu giao nhanh"
}
```

**Response:**
```json
{
  "id": 1,
  "orderNumber": "00120251030001",
  "adminNote": "Khách hàng yêu cầu giao nhanh"
}
```

---

### 5. **GET /api/admin/orders/stats** - Thống kê đơn hàng
**Mô tả:** Xem thống kê doanh thu, số đơn, sản phẩm bán chạy

**Query params:**
- `period`: Khoảng thời gian (7d, 30d, 90d, 1y) - mặc định: 30d

**Response:**
```json
{
  "period": "30d",
  "totalOrders": 150,
  "totalRevenue": 50000000,
  "ordersByStatus": {
    "PENDING": 10,
    "CONFIRMED": 20,
    "PROCESSING": 30,
    "DELIVERED": 80,
    "CANCELLED": 10
  },
  "recentOrders": [...],
  "topProducts": [...]
}
```

---

## 📋 TẠO ĐƠN HÀNG CHO ADMIN (Tạo đơn thay cho user)

### 6. **POST /api/admin/orders** - Tạo đơn hàng (Admin tạo thay cho user)
**Mô tả:** Admin có thể tự tạo đơn hàng thay cho user (ví dụ: đơn hàng qua điện thoại, đơn hàng tại cửa hàng)

**Request body:**
```json
{
  "userId": 1,                    // ID của user (bắt buộc)
  "orderItems": [                 // Danh sách sản phẩm (bắt buộc)
    {
      "productId": 1,
      "variantId": null,          // Optional
      "quantity": 2
    },
    {
      "productId": 2,
      "variantId": 5,
      "quantity": 1
    }
  ],
  "addressId": 1,                 // ID địa chỉ giao hàng (bắt buộc)
  "paymentMethod": "COD",         // COD, MOMO, VNPAY (bắt buộc)
  "customerNote": "Giao nhanh",   // Optional
  "adminNote": "Đơn hàng qua điện thoại", // Optional
  "status": "CONFIRMED"           // Optional: PENDING hoặc CONFIRMED (mặc định: PENDING)
}
```

**Response:**
```json
{
  "message": "Tạo đơn hàng thành công",
  "order": {
    "id": 1,
    "orderNumber": "00120251030001",
    "status": "CONFIRMED",
    "totalAmount": 1000000,
    "orderItems": [...],
    "user": {...},
    "payments": [...],
    "statusHistory": [...]
  }
}
```

**Lưu ý:**
- Nếu `status = "CONFIRMED"` → Tự động lưu cả PENDING và CONFIRMED vào history
- Nếu `status = "CONFIRMED"` → Tự động gửi WebSocket thông báo đến user
- Tự động trừ tồn kho khi tạo đơn thành công

---

### QUY TRÌNH XỬ LÝ TẠO ĐƠN HÀNG CỦA ADMIN

#### BƯỚC 1: Validate input
- `userId` phải tồn tại
- `orderItems` phải có ít nhất 1 sản phẩm
- `addressId` phải tồn tại và thuộc về user
- `paymentMethod` phải hợp lệ

#### BƯỚC 2: Lấy thông tin sản phẩm
- Query product và variant từ `orderItems`
- Kiểm tra sản phẩm còn active không
- Kiểm tra variant còn active không (nếu có)

#### BƯỚC 3: Kiểm tra tồn kho và tính giá
```javascript
Với mỗi item trong orderItems:
  - stock = variant?.stockQuantity ?? product.stockQuantity
  - Nếu item.quantity > stock → Báo lỗi
  - unitPrice = variant?.price ?? product.price
  - totalPrice = unitPrice × quantity
  - subtotal += totalPrice
```

#### BƯỚC 4: Tính tổng đơn
```javascript
subtotal = Tổng tiền các sản phẩm
shippingFee = 0 (hoặc tính theo địa chỉ)
discountAmount = 0 (có thể áp dụng coupon sau)
totalAmount = subtotal + shippingFee - discountAmount
```

#### BƯỚC 5: Tạo mã đơn hàng
- Dùng hàm `generateOrderNumber(userId)` giống như user

#### BƯỚC 6: Tạo đơn hàng trong TRANSACTION
**6.1. Tạo Order**
```javascript
{
  orderNumber: "00120251030001",
  userId: 1,
  status: "CONFIRMED",  // Admin có thể set trạng thái ngay
  paymentStatus: "PENDING",
  subtotal: 1000000,
  shippingFee: 0,
  discountAmount: 0,
  totalAmount: 1000000,
  shippingAddress: { ... }, // Từ bảng addresses
  paymentMethod: "COD",
  customerNote: "...",
  adminNote: "..."  // Ghi chú của admin
}
```

**6.2. Tạo Payment**
```javascript
{
  orderId: 1,
  paymentMethod: "COD",
  paymentStatus: "PENDING",
  amount: 1000000,
  transactionId: "TXN..."
}
```

**6.3. Tạo OrderItem**
- Lưu thông tin chi tiết từng sản phẩm

**6.4. Lưu lịch sử trạng thái**
- Nếu status = "CONFIRMED" → Lưu cả PENDING và CONFIRMED
- Nếu status = "PENDING" → Chỉ lưu PENDING

**6.5. Trừ tồn kho**
- Trừ số lượng khỏi stockQuantity

**6.6. (Optional) Áp dụng coupon**
- Nếu có coupon → Tạo CouponUsage
- Cập nhật discountAmount

#### BƯỚC 7: Gửi thông báo
- Gửi WebSocket event đến user (nếu status = "CONFIRMED")

#### BƯỚC 8: Trả về kết quả
- Lấy đơn hàng đầy đủ và trả về

---

## 📊 TỔNG KẾT: ADMIN CẦN 6 API

1. ✅ **GET /api/admin/orders** - Danh sách đơn hàng
2. ✅ **GET /api/admin/orders/:id** - Chi tiết đơn hàng
3. ✅ **PUT /api/admin/orders/:id** - Cập nhật trạng thái
4. ✅ **PUT /api/admin/orders/:id/notes** - Cập nhật ghi chú
5. ✅ **GET /api/admin/orders/stats** - Thống kê
6. ✅ **POST /api/admin/orders** - Tạo đơn hàng (ĐÃ TẠO)

---

## 🔄 SO SÁNH: USER vs ADMIN TẠO ĐƠN HÀNG

| Tiêu chí | User tạo đơn | Admin tạo đơn |
|----------|--------------|---------------|
| **Nguồn dữ liệu** | Từ giỏ hàng (ShoppingCart) | Từ danh sách sản phẩm trực tiếp |
| **Trạng thái ban đầu** | Luôn là PENDING | Có thể là PENDING hoặc CONFIRMED |
| **AdminNote** | Không có | Có thể có (ghi chú nội bộ) |
| **Validation** | Kiểm tra cartItemIds | Kiểm tra productId, variantId trực tiếp |
| **Xóa giỏ hàng** | Có (xóa cart items) | Không (không liên quan giỏ hàng) |

---

## 💡 LƯU Ý KHI TẠO ĐƠN HÀNG CỦA ADMIN

1. **Admin có thể set trạng thái ngay:**
   - Có thể tạo đơn với status = "CONFIRMED" luôn
   - Nếu status = "CONFIRMED" → Lưu cả PENDING và CONFIRMED vào history

2. **Không cần giỏ hàng:**
   - Admin chọn sản phẩm trực tiếp, không cần thêm vào giỏ hàng trước

3. **Có thể thêm adminNote ngay:**
   - Ghi chú nội bộ khi tạo đơn

4. **Validation nghiêm ngặt hơn:**
   - Phải kiểm tra user tồn tại
   - Phải kiểm tra địa chỉ thuộc về user
   - Phải kiểm tra sản phẩm còn active

5. **Có thể áp dụng coupon:**
   - Admin có thể nhập mã coupon khi tạo đơn
   - Tính lại discountAmount và totalAmount

