## Tổng quan luồng thanh toán VNPay trong dự án

File này giải thích **từng bước** luồng thanh toán VNPay trong dự án (FE + BE), và mô tả **chức năng của từng hàm chính** liên quan.

---

## 1. Các endpoint chính (backend)

File: `backend/routes/paymentRoutes.js`

- **`POST /api/payment/vnpay/create`**
  - Middleware: `authenticateToken`
  - Controller: `createVNPayPayment`
  - **Chức năng**: Tạo (hoặc tái sử dụng) session thanh toán VNPay mới cho một đơn hàng, lưu thông tin vào DB, trả về `paymentUrl` để frontend redirect người dùng sang VNPay.

- **`POST /api/payment/vnpay/callback`**
  - Controller: `handleVNPayCallback`
  - **Chức năng**: Endpoint để VNPay **gọi ngầm (IPN)** về backend, báo kết quả thanh toán. Dùng để **cập nhật trạng thái Payment + Order trong DB** một cách chính thức.

- **`GET /api/payment/vnpay/return`**
  - Controller: `handleVNPayReturn`
  - **Chức năng**: Endpoint để VNPay **redirect trình duyệt người dùng** quay lại backend sau khi thanh toán. Từ đây backend sẽ redirect tiếp sang frontend kèm theo các query param (`status`, `orderId`, `message`).

- **`GET /api/payment/status/:orderId`**
  - Middleware: `authenticateToken`
  - Controller: `getPaymentStatus`
  - **Chức năng**: Cho frontend kiểm tra **trạng thái thanh toán thực tế** trong DB cho một đơn hàng.

---

## 2. Các hàm chính (backend)

File: `backend/controller/paymentController.js`

### 2.1 `createVNPayPayment(req, res)`

**Được gọi khi**: Frontend gọi `POST /api/payment/vnpay/create` (sau khi user chọn thanh toán VNPay và bấm “Thanh toán”).

**Chức năng**:
- Kiểm tra `orderId` có trong body và user đã đăng nhập (`req.user.id`).
- Lấy đơn hàng từ DB:
  - Đảm bảo đơn hàng thuộc về user hiện tại.
  - Lấy kèm `payments` (các lần thanh toán trước) và `orderItems` (sản phẩm trong đơn).
- Kiểm tra phương thức thanh toán của đơn phải là `VNPAY`.
- Kiểm tra trong DB xem:
  - Đã có `payment` VNPay cho đơn này chưa.
  - Nếu **chưa có**:
    - Tạo bản ghi `Payment` mới với trạng thái `PENDING`, `amount = totalAmount`, `transactionId` tạm.
  - Nếu **đã có**:
    - Nếu `paymentUrl` còn hạn và trạng thái là `PENDING` → **tái sử dụng URL cũ**, trả về luôn cho FE.
    - Nếu trạng thái là `FAILED` → **reset** bản ghi:
      - Đặt lại `paymentStatus = PENDING`.
      - Xoá URL, mã giao dịch VNPay cũ, thời gian hết hạn, ngày thanh toán…
      - Tạo `transactionId` mới.
- Chuẩn bị thông tin đơn hàng (`orderInfo`) và IP client.
- Gọi `vnpayService.createPayment(orderNumber, amount, orderInfo, clientIp)`:
  - Hàm này sẽ tương tác với thư viện `vnpay` và trả về:
    - `paymentUrl`: URL trang thanh toán VNPay.
    - `transactionId`: mã giao dịch gửi lên VNPay.
    - `expiresAt`: thời gian hết hạn session thanh toán.
- Cập nhật lại bản ghi `Payment` trong DB với thông tin trả về từ VNPay.
- Trả JSON xuống cho FE, bao gồm `paymentUrl`, `orderId`, `orderNumber`, `amount`, `expiresAt`.

**Kết quả**: FE nhận được `paymentUrl` và **redirect người dùng sang trang VNPay**.

---

### 2.2 `handleVNPayCallback(req, res)`

**Được gọi khi**: VNPay **gửi IPN (callback)** tới backend sau khi user thanh toán.

- Route: `POST /api/payment/vnpay/callback`

**Chức năng**:
- Đọc toàn bộ payload mà VNPay gửi về từ `req.body` hoặc `req.query`.
- Gọi `vnpayService.verifyCallback(payload)` để:
  - Xác thực chữ ký (`vnp_SecureHash`) bằng `hashSecret`.
  - Parse ra các thông tin: `transactionId`, `transactionNo`, `amount`, `responseCode`, `bankCode`, `payDate`, ...
- Nếu:
  - Xác thực thất bại → trả `{ RspCode: '97' }` (Invalid signature).
- Tìm bản ghi `Payment` trong DB:
  - Dựa vào `paymentMethod = 'VNPAY'` và `transactionId = verifyResult.transactionId`.
  - Nếu không tìm thấy → trả `{ RspCode: '01' }` (Payment not found).
- Kiểm tra số tiền:
  - So sánh `payment.amount` với `verifyResult.amount`.
  - Nếu lệch → trả `{ RspCode: '04' }` (Amount invalid).
- Nếu `verifyResult.responseCode === '00'` (thanh toán thành công):
  - Dùng `prisma.$transaction` để đảm bảo tính nhất quán:
    - Cập nhật bảng `payments`:
      - `paymentStatus = 'PAID'`
      - `paidAt = now`
      - Lưu `transactionId`, `vnpayTransactionNo`, `bankCode`, `responseCode`, `payDate`.
    - Cập nhật bảng `orders`: `paymentStatus = 'PAID'`.
  - Trả `{ RspCode: '00', Message: 'Success' }` cho VNPay.
- Nếu **thất bại** (responseCode khác '00'):
  - Cũng dùng transaction:
    - Cập nhật bảng `payments`: `paymentStatus = 'FAILED'`, `responseCode`, `payDate`.
    - Cập nhật bảng `orders`: `paymentStatus = 'FAILED'`.
  - Trả `{ RspCode: responseCode || '99', Message: 'Payment failed' }`.

**Kết quả**:  
Trạng thái thanh toán trong DB (`payments` + `orders`) được **chốt chính thức** theo kết quả từ VNPay, ngay cả khi user đã đóng trình duyệt.

---

### 2.3 `handleVNPayReturn(req, res)`

**Được gọi khi**: VNPay **redirect trình duyệt người dùng** về website của bạn sau khi thanh toán.

- Route: `GET /api/payment/vnpay/return`

**Chức năng**:
- Gọi lại `vnpayService.verifyCallback(req.query)` để:
  - Xác thực chữ ký từ query string.
  - Lấy `transactionId`, `transactionNo`, `responseCode`, `bankCode`, `payDate`, ...
- Nếu xác thực thất bại:
  - Redirect về frontend:
    - `/payment/result?error=invalid_signature`
- Nếu xác thực OK:
  - Tìm `payment` trong DB theo `paymentMethod = 'VNPAY'` và `transactionId = verifyResult.transactionId`.
  - Nếu không tìm thấy:
    - Redirect: `/payment/result?error=payment_not_found`.
- Nếu `responseCode === '00'` (thành công):
  - Nếu trong DB `paymentStatus` chưa là `PAID`:
    - Dùng `prisma.$transaction` để:
      - Cập nhật `payments` → `PAID`, kèm `paidAt`, `vnpayTransactionNo`, `bankCode`, `responseCode`, `payDate`.
      - Cập nhật `orders` → `PAID`.
  - Sau đó redirect về frontend:
    - `/payment/result?status=success&orderId=<payment.orderId>`
- Nếu giao dịch thất bại:
  - Nếu trong DB `paymentStatus` chưa là `FAILED`:
    - Transaction cập nhật `payments` + `orders` sang `FAILED` và lưu `responseCode`, `payDate`.
  - Chuẩn bị `message` thân thiện:
    - `responseCode === '24'` → `'Giao dịch bị hủy'`
    - Ngược lại → `'Thanh toán thất bại'`
  - Redirect về frontend:
    - `/payment/result?status=failed&orderId=<payment.orderId>&message=<encodeURIComponent(message)>`

**Kết quả**:  
User được đưa về trang kết quả trên frontend (`/payment/result`), kèm thông tin để hiển thị UI “thành công / thất bại”.

---

### 2.4 `getPaymentStatus(req, res)`

**Được gọi khi**: Frontend muốn **kiểm tra lại trạng thái thanh toán thực tế** trong DB.

- Route: `GET /api/payment/status/:orderId`

**Chức năng**:
- Lấy `userId` từ `req.user`, lấy `orderId` từ `req.params`.
- Tìm `order` trong DB (thuộc về user hiện tại), kèm theo `payments`.
- Nếu không có đơn hàng hoặc không có payment → 404.
- Lấy `payment = order.payments[0]` (payment mới nhất).
- Trả JSON chứa các thông tin:
  - `paymentStatus` (PENDING / PAID / FAILED)
  - `paymentMethod`
  - `paymentUrl`
  - `amount`
  - `paidAt`
  - `transactionId`
  - `orderNumber`, `orderId`
  - `expiresAt`
  - `bankCode`, `vnpayTransactionNo`, `responseCode`

**Kết quả**:  
Frontend có thể luôn hiển thị đúng trạng thái thanh toán **theo DB**, không phụ thuộc chỉ vào query trên URL.

---

## 3. Các hàm chính (service VNPay)

File: `backend/services/payment/vnpayService.js`

### 3.1 `createPayment(orderNumber, amount, orderInfo, ipAddr)`

**Được gọi từ**: `createVNPayPayment` (controller).

**Chức năng**:
- Dùng SDK `VNPay` (ở chế độ sandbox) để:
  - Tạo mã giao dịch `txnRef` duy nhất (`orderNumber + timestamp`).
  - Gọi `vnpayClient.buildPaymentUrl({...})` với:
    - Số tiền (`vnp_Amount` – thư viện tự nhân 100).
    - IP khách hàng.
    - Thông tin đơn hàng (`vnp_OrderInfo`).
    - `vnp_ReturnUrl` (chính là route `handleVNPayReturn` trên backend).
    - Thời gian tạo + thời gian hết hạn (15p).
- Trả về:
  - `paymentUrl`: URL trang thanh toán VNPay (sandbox).
  - `transactionId`: `txnRef` dùng để lưu vào DB.
  - `expiresAt`: `new Date(Date.now() + 15 phút)`.

---

### 3.2 `verifyCallback(params)`

**Được gọi từ**: cả `handleVNPayCallback` và `handleVNPayReturn`.

**Chức năng**:
- Lấy `vnp_SecureHash` từ params.
- Clone object params, bỏ các field `vnp_SecureHash` và `vnp_SecureHashType`.
- Sắp xếp key theo A–Z, encode đúng chuẩn.
- Tạo chuỗi `signData` và dùng `crypto.createHmac('sha512', hashSecret)` để tạo chữ ký mới (`signed`).
- So sánh với `secureHash`:
  - Khác nhau → `isSuccess = false`.
  - Trùng nhau → `isSuccess = true` và trả thêm:
    - `transactionId` (`vnp_TxnRef`)
    - `transactionNo` (`vnp_TransactionNo`)
    - `responseCode` (`vnp_ResponseCode`)
    - `bankCode` (`vnp_BankCode`)
    - `amount` (đã chia lại 100)
    - `rawAmount`, `orderInfo`, `payDate`.

**Kết quả**:  
Giúp controller **tin tưởng** dữ liệu VNPay gửi về là chuẩn, không bị sửa đổi.

---

## 4. Luồng frontend (tóm tắt)

File chính: `frontend/src/features/payment/PaymentResult.jsx`

### 4.1 Khi user click thanh toán VNPay

- FE gọi `POST /api/payment/vnpay/create` → nhận `paymentUrl`.
- FE redirect: `window.location.href = paymentUrl;`  
  → Người dùng được đưa tới trang VNPay (sandbox).

### 4.2 Sau khi thanh toán xong

- VNPay:
  - Gọi ngầm `POST /api/payment/vnpay/callback` → backend cập nhật DB.
  - Redirect trình duyệt về `GET /api/payment/vnpay/return` → backend redirect tiếp về:
    - `/payment/result?status=success&orderId=...`
    - hoặc `/payment/result?status=failed&orderId=...&message=...`
    - hoặc `/payment/result?error=...`

### 4.3 Trang `PaymentResult.jsx`

- Lấy `orderId`, `status`, `error`, `message` từ query string.
- Nếu không có `orderId` mà có `error` → hiển thị lỗi.
- Nếu có `orderId`:
  - Gọi API `GET /api/payment/status/:orderId` → nhận:
    - `paymentStatus`, `paymentMethod`, `amount`, `bankCode`, `vnpayTransactionNo`, `responseCode`, `paidAt`, ...
  - Nếu `paymentStatus === 'PAID'`:
    - Hiển thị UI “Thanh toán thành công”.
  - Nếu `FAILED` hoặc khác:
    - Hiển thị UI “Thanh toán thất bại” + message chi tiết.

---

## 5. Tóm tắt ý nghĩa từng nhóm hàm

- **`createVNPayPayment`**: Chuẩn bị + gọi VNPay để **bắt đầu** thanh toán (tạo URL).
- **`vnpayService.createPayment`**: Nói chuyện với SDK VNPay để dựng `paymentUrl`.
- **`handleVNPayCallback`**: Nhận thông báo **chính thức từ server VNPay** và **chốt trạng thái thanh toán trong DB**.
- **`handleVNPayReturn`**: Nhận redirect từ trình duyệt sau khi user thanh toán xong, rồi **đưa user về trang kết quả trên frontend**.
- **`getPaymentStatus`**: Cho frontend **hỏi lại DB** để chắc chắn trạng thái thanh toán thực tế.
- **`vnpayService.verifyCallback`**: Xác thực dữ liệu / chữ ký VNPay gửi về, tránh giả mạo.

Bạn có thể mở song song file này với các file code tương ứng (`paymentController.js`, `paymentRoutes.js`, `vnpayService.js`, `PaymentResult.jsx`) để đối chiếu, sẽ rất dễ hình dung toàn bộ flow. 


