# QUY TRÌNH NGHIỆP VỤ: ĐẶT HÀNG VÀ QUẢN LÝ ĐƠN HÀNG

## 📋 PHẦN 1: USER ĐẶT HÀNG

### BƯỚC 1: User chọn sản phẩm từ giỏ hàng
**Mô tả:** User chọn các sản phẩm muốn đặt hàng từ giỏ hàng (ShoppingCart)

**Dữ liệu cần:**
- `cartItemIds`: Array các ID của cart items được chọn
- `addressId`: ID địa chỉ giao hàng
- `paymentMethod`: Phương thức thanh toán (COD, MOMO, VNPAY)
- `customerNote`: Ghi chú của khách hàng (optional)

**Validation:**
- Phải có ít nhất 1 sản phẩm được chọn
- Địa chỉ giao hàng phải tồn tại và thuộc về user

---

### BƯỚC 2: Kiểm tra tồn kho và tính giá
**Mô tả:** Duyệt qua từng sản phẩm trong giỏ hàng để:
- Kiểm tra tồn kho còn đủ không
- Tính giá (ưu tiên variant.price, nếu không có thì dùng product.price)
- Tính tổng tiền

**Logic:**
```
Với mỗi item trong cartItems:
  - stock = variant?.stockQuantity ?? product.stockQuantity
  - Nếu item.quantity > stock → Báo lỗi "Sản phẩm chỉ còn X sản phẩm"
  - unitPrice = variant?.price ?? product.price
  - totalPrice = unitPrice × quantity
  - subtotal += totalPrice
```

**Lưu ý:**
- Nếu sản phẩm có variant → dùng stockQuantity và price của variant
- Nếu không có variant → dùng stockQuantity và price của product

---

### BƯỚC 3: Tính tổng đơn hàng
**Mô tả:** Tính tổng tiền cuối cùng của đơn hàng

**Công thức:**
```
subtotal = Tổng tiền các sản phẩm
shippingFee = Phí vận chuyển (hiện tại = 0)
discountAmount = Giảm giá từ coupon (hiện tại = 0)
totalAmount = subtotal + shippingFee - discountAmount
```

---

### BƯỚC 4: Tạo mã đơn hàng và mã giao dịch
**Mô tả:** 
- Tạo mã đơn hàng: `<maKH><YYYYMMDD><SEQ3>`
  - VD: `00120251030001` (user 001, ngày 30/10/2025, đơn thứ 1)
- Tạo mã giao dịch: `TXN{timestamp}{random}`

---

### BƯỚC 5: Tạo đơn hàng trong TRANSACTION
**Mô tả:** Tất cả các bước sau phải thực hiện trong 1 transaction để đảm bảo tính toàn vẹn dữ liệu

**5.1. Tạo Order (bảng orders)**
```javascript
{
  orderNumber: "00120251030001",
  userId: 1,
  status: "PENDING",
  paymentStatus: "PENDING",
  subtotal: 1000000,
  shippingFee: 0,
  discountAmount: 0,
  totalAmount: 1000000,
  shippingAddress: { ... }, // JSON từ bảng addresses
  paymentMethod: "COD",
  customerNote: "..."
}
```

**5.2. Tạo Payment (bảng payments)**
```javascript
{
  orderId: 1,
  paymentMethod: "COD",
  paymentStatus: "PENDING",
  amount: 1000000,
  transactionId: "TXN..."
}
```

**5.3. Tạo OrderItem (bảng order_items)**
- Lưu thông tin chi tiết từng sản phẩm trong đơn
- Lưu tên, SKU, giá tại thời điểm đặt hàng (để không bị ảnh hưởng khi giá thay đổi sau này)

**5.4. Lưu lịch sử trạng thái đầu tiên (bảng order_status_history)**
```javascript
{
  orderId: 1,
  status: "PENDING",
  createdAt: "2025-10-30 10:00:00"
}
```

**5.5. Trừ tồn kho**
- Với mỗi item: trừ `quantity` khỏi `stockQuantity`
- Nếu có variant → trừ variant.stockQuantity
- Nếu không có variant → trừ product.stockQuantity

**5.6. Xóa sản phẩm đã đặt khỏi giỏ hàng**
- Xóa các cart items đã được chọn để đặt hàng

---

### BƯỚC 6: Trả về kết quả
**Mô tả:** Lấy đơn hàng đầy đủ (kèm orderItems, user, payments) và trả về cho frontend

---

## 📋 PHẦN 2: USER XEM ĐƠN HÀNG

### BƯỚC 1: Danh sách đơn hàng
**API:** `GET /api/orders?page=1&limit=10&status=PENDING`

**Chức năng:**
- Lấy danh sách đơn hàng của user hiện tại
- Phân trang: page, limit
- Lọc theo trạng thái: status (PENDING, CONFIRMED, PROCESSING, DELIVERED, CANCELLED)
- Sắp xếp: mới nhất trước (createdAt DESC)

**Dữ liệu trả về:**
- `items`: Danh sách đơn hàng (kèm orderItems, product, variant)
- `total`: Tổng số đơn hàng
- `page`: Trang hiện tại
- `limit`: Số lượng mỗi trang

---

### BƯỚC 2: Chi tiết đơn hàng
**API:** `GET /api/orders/:id`

**Chức năng:**
- Lấy chi tiết 1 đơn hàng cụ thể
- Chỉ user sở hữu đơn mới được xem
- Có thể lọc theo trạng thái: `?status=PENDING`

**Dữ liệu trả về:**
- Thông tin đơn hàng đầy đủ
- `orderItems`: Chi tiết sản phẩm (kèm product, variant)
- `payments`: Thông tin thanh toán
- `statusHistory`: Lịch sử thay đổi trạng thái
- `timeline`: Thời gian của từng trạng thái (để hiển thị trên frontend)
  ```javascript
  {
    pendingAt: "2025-10-30 10:00:00",
    confirmedAt: "2025-10-30 11:00:00",
    processingAt: "2025-10-31 09:00:00",
    deliveredAt: null,
    cancelledAt: null,
    paymentConfirmedAt: "2025-10-30 11:05:00"
  }
  ```

---

## 📋 PHẦN 3: USER HỦY ĐƠN HÀNG

### BƯỚC 1: Kiểm tra điều kiện
**Mô tả:** Chỉ được hủy khi đơn ở trạng thái `PENDING`

**Validation:**
- Đơn hàng phải tồn tại và thuộc về user
- `order.status === "PENDING"` → Mới được hủy
- Nếu đã `CONFIRMED` hoặc `PROCESSING` → Không được hủy

---

### BƯỚC 2: Cập nhật trạng thái trong TRANSACTION
**2.1. Cập nhật Order**
```javascript
{
  status: "CANCELLED",
  paymentStatus: "FAILED"
}
```

**2.2. Lưu lịch sử trạng thái**
```javascript
{
  orderId: 1,
  status: "CANCELLED"
}
```

**2.3. Hoàn trả tồn kho**
- Với mỗi orderItem: cộng lại `quantity` vào `stockQuantity`
- Nếu có variant → cộng vào variant.stockQuantity
- Nếu không có variant → cộng vào product.stockQuantity

---

## 📋 PHẦN 4: USER XÁC NHẬN NHẬN HÀNG

### BƯỚC 1: Kiểm tra điều kiện
**Mô tả:** Chỉ được xác nhận khi đơn ở trạng thái `PROCESSING`

**Validation:**
- Đơn hàng phải tồn tại và thuộc về user
- `order.status === "PROCESSING"` → Mới được xác nhận

---

### BƯỚC 2: Cập nhật trạng thái trong TRANSACTION
**2.1. Cập nhật Order**
```javascript
{
  status: "DELIVERED"
}
```

**2.2. Lưu lịch sử trạng thái**
```javascript
{
  orderId: 1,
  status: "DELIVERED"
}
```

---

## 📋 PHẦN 5: ADMIN QUẢN LÝ ĐƠN HÀNG

### BƯỚC 1: Danh sách đơn hàng (Admin)
**API:** `GET /api/admin/orders?page=1&limit=10&status=PENDING&q=search`

**Chức năng:**
- Xem tất cả đơn hàng của tất cả users
- Phân trang: page, limit
- Lọc theo trạng thái: status
- Tìm kiếm: q (theo số đơn hàng hoặc tên khách hàng)

**Dữ liệu trả về:**
- `items`: Danh sách đơn hàng (kèm user, orderItems, product)
- `total`: Tổng số đơn hàng
- `statusLabel`: Label tiếng Việt của trạng thái
- `availableStatuses`: Danh sách trạng thái có thể chuyển tiếp

**Lưu ý:**
- Query product riêng để xử lý trường hợp product đã bị xóa
- Nếu product không tồn tại → trả về null, lọc bỏ khỏi danh sách

---

### BƯỚC 2: Chi tiết đơn hàng (Admin)
**API:** `GET /api/admin/orders/:id`

**Chức năng:**
- Xem chi tiết 1 đơn hàng bất kỳ
- Xem được `adminNote` (ghi chú của admin)

**Dữ liệu trả về:**
- Tương tự user nhưng không cần kiểm tra `userId`
- Có thêm `availableStatuses` để admin biết có thể chuyển sang trạng thái nào

---

### BƯỚC 3: Cập nhật trạng thái đơn hàng (Admin)
**API:** `PUT /api/admin/orders/:id`

**Mô tả:** Admin thay đổi trạng thái đơn hàng theo quy trình nghiệp vụ

**Quy trình trạng thái:**
```
PENDING → CONFIRMED hoặc CANCELLED
CONFIRMED → PROCESSING hoặc CANCELLED
PROCESSING → DELIVERED
DELIVERED → (Không thể thay đổi)
CANCELLED → (Không thể thay đổi)
```

**BƯỚC 3.1: Validate input**
- `status` là bắt buộc
- `status` phải thuộc enum: PENDING, CONFIRMED, PROCESSING, DELIVERED, CANCELLED
- Đơn hàng phải tồn tại

**BƯỚC 3.2: Kiểm tra trạng thái hiện tại**
- Không cho phép cập nhật nếu đã `DELIVERED` hoặc `CANCELLED`
- Không cho phép chọn trạng thái hiện tại
- Chỉ cho phép chọn các trạng thái tiếp theo (không cho chọn ngược)

**BƯỚC 3.3: Cập nhật trong TRANSACTION**
- Cập nhật `order.status`
- Lưu vào `order_status_history`
- Nếu hủy đơn (`CANCELLED`) → Hoàn trả tồn kho

**BƯỚC 3.4: Gửi thông báo real-time**
- Lấy `userId` từ đơn hàng
- Gửi WebSocket event đến user để thông báo cập nhật trạng thái

---

### BƯỚC 4: Cập nhật ghi chú đơn hàng (Admin)
**API:** `PUT /api/admin/orders/:id/notes`

**Chức năng:**
- Admin thêm/sửa ghi chú nội bộ cho đơn hàng
- Ghi chú này chỉ admin mới thấy, user không thấy

**Dữ liệu:**
- `notes`: Nội dung ghi chú (có thể null để xóa)

---

### BƯỚC 5: Thống kê đơn hàng (Admin)
**API:** `GET /api/admin/orders/stats?period=30d`

**Chức năng:**
- Xem thống kê đơn hàng theo khoảng thời gian
- Period: 7d, 30d, 90d, 1y

**Dữ liệu trả về:**
- `totalOrders`: Tổng số đơn hàng
- `totalRevenue`: Tổng doanh thu (chỉ tính đơn đã thanh toán)
- `ordersByStatus`: Số đơn theo từng trạng thái
- `recentOrders`: 5 đơn hàng gần nhất
- `topProducts`: 5 sản phẩm bán chạy nhất

---

## 🔄 QUY TRÌNH TRẠNG THÁI ĐƠN HÀNG

### Sơ đồ chuyển trạng thái:
```
PENDING (Chờ xác nhận)
  ├─→ CONFIRMED (Đã xác nhận) [Admin]
  └─→ CANCELLED (Đã hủy) [User hoặc Admin]

CONFIRMED (Đã xác nhận)
  ├─→ PROCESSING (Đang giao) [Admin]
  └─→ CANCELLED (Đã hủy) [Admin]

PROCESSING (Đang giao)
  └─→ DELIVERED (Đã giao) [User xác nhận hoặc Admin]

DELIVERED (Đã giao) → [Kết thúc, không thể thay đổi]

CANCELLED (Đã hủy) → [Kết thúc, không thể thay đổi]
```

### Ai được làm gì:
- **User:**
  - Hủy đơn khi `PENDING`
  - Xác nhận nhận hàng khi `PROCESSING` → `DELIVERED`
  - Xem danh sách và chi tiết đơn hàng của mình

- **Admin:**
  - Xem tất cả đơn hàng
  - Cập nhật trạng thái theo quy trình
  - Thêm ghi chú nội bộ
  - Xem thống kê

---

## 💾 CẤU TRÚC DATABASE LIÊN QUAN

### Bảng `orders`:
- `orderNumber`: Mã đơn hàng (unique)
- `status`: Trạng thái đơn hàng
- `paymentStatus`: Trạng thái thanh toán
- `subtotal`, `shippingFee`, `discountAmount`, `totalAmount`: Tiền
- `shippingAddress`: Địa chỉ giao hàng (JSON)
- `customerNote`: Ghi chú của khách hàng
- `adminNote`: Ghi chú của admin (chỉ admin thấy)

### Bảng `order_items`:
- Lưu thông tin chi tiết sản phẩm tại thời điểm đặt hàng
- `productName`, `productSku`, `variantName`: Lưu tên/SKU để không bị ảnh hưởng khi sản phẩm thay đổi
- `unitPrice`, `totalPrice`: Giá tại thời điểm đặt hàng

### Bảng `order_status_history`:
- Lưu lịch sử mỗi lần thay đổi trạng thái
- Dùng để tạo timeline hiển thị trên frontend

### Bảng `payments`:
- Mỗi Order có 1 Payment
- Lưu thông tin thanh toán: method, status, amount, transactionId

---

## ⚠️ LƯU Ý QUAN TRỌNG

1. **Transaction:** Tất cả thao tác tạo/cập nhật đơn hàng phải dùng transaction để đảm bảo tính toàn vẹn

2. **Tồn kho:** 
   - Khi tạo đơn → Trừ kho
   - Khi hủy đơn → Hoàn trả kho
   - Kiểm tra tồn kho trước khi tạo đơn

3. **Product bị xóa:**
   - OrderItem vẫn giữ thông tin (productName, productSku, unitPrice)
   - Query product riêng để xử lý trường hợp product không tồn tại

4. **Trạng thái:**
   - Chỉ cho phép chuyển tiến, không cho quay lại
   - DELIVERED và CANCELLED là trạng thái cuối, không thể thay đổi

5. **Real-time:**
   - Khi admin cập nhật trạng thái → Gửi WebSocket event đến user
   - User nhận thông báo real-time về cập nhật đơn hàng


