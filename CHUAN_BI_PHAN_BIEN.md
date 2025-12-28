# 🎯 CHUẨN BỊ PHẢN BIỆN - E-COMMERCE PROJECT

**Ngày phản biện:** 29/12/2025  
**Người chuẩn bị:** Student  
**Version:** 1.0.0

---

## 📋 MỤC LỤC

1. [Các câu hỏi giáo viên có thể hỏi](#1-các-câu-hỏi-giáo-viên-có-thể-hỏi)
2. [Lỗ hổng và điểm yếu của project](#2-lỗ-hổng-và-điểm-yếu-của-project)
3. [Các điểm không giống thực tế](#3-các-điểm-không-giống-thực-tế)
4. [Chuẩn bị code lại chức năng](#4-chuẩn-bị-code-lại-chức-năng)
5. [Câu trả lời mẫu](#5-câu-trả-lời-mẫu)

---

## 1. CÁC CÂU HỎI GIÁO VIÊN CÓ THỂ HỎI

### 🔴 **NHÓM 1: NGHIỆP VỤ THANH TOÁN**

#### **Câu 1.1: "Tại sao khi đặt hàng COD, bạn không trừ tồn kho ngay?"**

**⚠️ Lỗ hổng trong code:**
```javascript
// orderController.js - Line 290-291
// 6.4 KHÔNG trừ tồn kho ở đây
// Tồn kho sẽ được trừ khi admin xác nhận đơn (chuyển sang CONFIRMED)
```

**Vấn đề:**
- User có thể đặt 100 đơn hàng COD cùng lúc → Hết tồn kho
- Khi admin xác nhận, phát hiện không đủ hàng → Phải hủy đơn
- Trải nghiệm user kém, mất thời gian admin

**Thực tế nên làm:**
- **Giữ tồn kho (Reserve Stock)**: Khi đặt hàng → Trừ tồn kho tạm thời
- Nếu admin hủy → Hoàn lại tồn kho
- Nếu user hủy trong 30 phút → Hoàn lại tồn kho
- Sau 24h không xác nhận → Tự động hủy và hoàn tồn kho

**Cách fix:**
```javascript
// BƯỚC 6.4: Trừ tồn kho ngay khi đặt hàng
for (const item of orderItems) {
  if (item.variantId) {
    await tx.productVariant.update({
      where: { id: item.variantId },
      data: { stockQuantity: { decrement: item.quantity } }
    })
  }
}

// Nếu hủy đơn → Hoàn lại tồn kho
if (status === 'CANCELLED') {
  for (const item of order.orderItems) {
    await tx.productVariant.update({
      where: { id: item.variantId },
      data: { stockQuantity: { increment: item.quantity } }
    })
  }
}
```

---

#### **Câu 1.2: "VNPay callback và return có gì khác nhau? Tại sao phải có cả 2?"**

**⚠️ Điểm yếu:**
Nhiều sinh viên không hiểu rõ sự khác biệt.

**Trả lời:**
- **IPN Callback (Server-to-Server):**
  - VNPay gọi trực tiếp đến backend (không qua user)
  - Đảm bảo 100% nhận được kết quả thanh toán
  - Dùng để cập nhật database chính thức
  - User không thể can thiệp

- **Return URL (Browser Redirect):**
  - VNPay redirect user về frontend
  - Có thể bị user đóng trình duyệt → Mất kết quả
  - Chỉ dùng để hiển thị UI cho user
  - Không đáng tin cậy 100%

**Vấn đề trong code:**
```javascript
// paymentController.js - Line 276-298
// Cả callback và return đều cập nhật DB
// → Dư thừa, có thể gây race condition
```

**Thực tế nên làm:**
- **Callback**: Cập nhật DB (source of truth)
- **Return**: Chỉ hiển thị UI, đọc từ DB

---

#### **Câu 1.3: "Nếu user thanh toán VNPay thành công nhưng đóng trình duyệt trước khi redirect về, đơn hàng có được cập nhật không?"**

**Trả lời:**
- ✅ **CÓ** - Nhờ IPN Callback
- Callback chạy độc lập, không phụ thuộc trình duyệt user
- Database vẫn được cập nhật `paymentStatus = PAID`

**Nhưng:**
- User không thấy trang "Thanh toán thành công"
- Phải vào "Đơn hàng của tôi" để kiểm tra
- → Trải nghiệm kém

**Cách cải thiện:**
- Gửi email ngay khi callback thành công
- Push notification đến app mobile (nếu có)

---

### 🔴 **NHÓM 2: NGHIỆP VỤ ĐƠN HÀNG**

#### **Câu 2.1: "Tại sao user chỉ được hủy đơn ở trạng thái PENDING?"**

**⚠️ Vấn đề:**
```javascript
// orderController.js - Line 575
if (order.status !== "PENDING") 
  return res.status(400).json({ message: "Chỉ có thể hủy đơn hàng đang chờ xử lý" })
```

**Thực tế:**
- User có thể muốn hủy đơn đã CONFIRMED (đã xác nhận)
- Ví dụ: Đặt nhầm, không cần nữa, tìm được giá rẻ hơn
- E-commerce lớn (Shopee, Lazada) cho phép hủy đến khi đơn PROCESSING

**Cách fix:**
```javascript
// Cho phép hủy đến khi PROCESSING
const cancellableStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING']
if (!cancellableStatuses.includes(order.status)) {
  return res.status(400).json({ 
    message: "Không thể hủy đơn hàng đã giao hoặc đã hủy" 
  })
}

// Nếu đã CONFIRMED hoặc PROCESSING → Phải hoàn tồn kho
if (['CONFIRMED', 'PROCESSING'].includes(order.status)) {
  for (const item of order.orderItems) {
    await tx.productVariant.update({
      where: { id: item.variantId },
      data: { stockQuantity: { increment: item.quantity } }
    })
  }
}
```

---

#### **Câu 2.2: "Nếu admin xác nhận đơn (PENDING → CONFIRMED) nhưng phát hiện hết hàng thì sao?"**

**⚠️ Lỗ hổng nghiêm trọng:**
```javascript
// adminOrderController.js
// Khi CONFIRMED → Trừ tồn kho
// Nhưng KHÔNG kiểm tra tồn kho trước khi trừ!
```

**Vấn đề:**
- Tồn kho có thể âm (stockQuantity = -5)
- Không có cơ chế kiểm tra
- Admin phải tự kiểm tra thủ công

**Cách fix:**
```javascript
// Trước khi CONFIRMED, kiểm tra tồn kho
if (newStatus === 'CONFIRMED') {
  for (const item of order.orderItems) {
    const variant = await tx.productVariant.findUnique({
      where: { id: item.variantId }
    })
    
    if (variant.stockQuantity < item.quantity) {
      throw new Error(
        `Sản phẩm "${item.productName}" chỉ còn ${variant.stockQuantity} (cần ${item.quantity})`
      )
    }
  }
  
  // Sau khi kiểm tra OK → Mới trừ tồn kho
  for (const item of order.orderItems) {
    await tx.productVariant.update({
      where: { id: item.variantId },
      data: { stockQuantity: { decrement: item.quantity } }
    })
  }
}
```

---

#### **Câu 2.3: "Tại sao không có chức năng hoàn tiền (Refund)?"**

**⚠️ Thiếu chức năng quan trọng:**
- User thanh toán VNPay → Muốn hủy đơn
- Tiền đã trừ khỏi tài khoản
- Nhưng không có cách hoàn tiền

**Thực tế:**
- Phải tích hợp VNPay Refund API
- Hoặc admin chuyển khoản thủ công
- Phải có bảng `refunds` để tracking

**Cách fix:**
```javascript
// Thêm bảng Refund
model Refund {
  id            Int      @id @default(autoincrement())
  orderId       Int
  paymentId     Int
  amount        Decimal
  reason        String
  status        RefundStatus  // PENDING, APPROVED, REJECTED, COMPLETED
  refundMethod  String        // VNPAY_API, BANK_TRANSFER
  createdAt     DateTime @default(now())
  processedAt   DateTime?
  order         Order    @relation(fields: [orderId], references: [id])
  payment       Payment  @relation(fields: [paymentId], references: [id])
}

enum RefundStatus {
  PENDING
  APPROVED
  REJECTED
  COMPLETED
}
```

---

### 🔴 **NHÓM 3: BẢO MẬT & SECURITY**

#### **Câu 3.1: "Làm sao ngăn user spam đặt hàng?"**

**⚠️ Không có rate limiting cho đặt hàng:**
```javascript
// orderController.js - createOrder()
// Không kiểm tra số đơn hàng trong 1 khoảng thời gian
```

**Vấn đề:**
- User có thể đặt 1000 đơn trong 1 phút
- Spam hệ thống, làm tràn database
- Tấn công DDoS

**Cách fix:**
```javascript
// Kiểm tra số đơn trong 1 giờ
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
const recentOrders = await prisma.order.count({
  where: {
    userId,
    createdAt: { gte: oneHourAgo }
  }
})

if (recentOrders >= 10) {
  return res.status(429).json({
    message: 'Bạn đã đặt quá nhiều đơn hàng. Vui lòng thử lại sau 1 giờ.'
  })
}
```

---

#### **Câu 3.2: "Làm sao ngăn user sửa giá sản phẩm khi đặt hàng?"**

**⚠️ Lỗ hổng bảo mật:**
```javascript
// orderController.js - Line 210
const unitPrice = Number(item.product.salePrice ?? item.product.price)
```

**Vấn đề:**
- Nếu frontend gửi `unitPrice` trong request
- Backend có thể dùng nhầm giá từ frontend
- User có thể sửa giá từ 1,000,000 → 1,000

**Cách phòng tránh:**
- ✅ **LUÔN lấy giá từ database** (đã làm đúng)
- ❌ **KHÔNG BAO GIỜ tin giá từ frontend**

---

#### **Câu 3.3: "Làm sao ngăn user xem đơn hàng của người khác?"**

**✅ Đã làm đúng:**
```javascript
// orderController.js - Line 450
const order = await prisma.order.findFirst({
  where: { id: Number(id), userId }  // ← Kiểm tra userId
})
```

**Nhưng nếu giáo viên hỏi thêm:**
"Nếu user gửi request với `userId` khác thì sao?"

**Trả lời:**
- `userId` lấy từ JWT token (req.user.id)
- Không lấy từ request body/query
- User không thể giả mạo

---

### 🔴 **NHÓM 4: HIỆU SUẤT & PERFORMANCE**

#### **Câu 4.1: "Nếu có 10,000 sản phẩm, trang chủ có bị chậm không?"**

**⚠️ Vấn đề:**
```javascript
// adminProductController.js - Line 103-112
const [items, total] = await Promise.all([
  prisma.product.findMany({
    where,
    orderBy: { [sortBy]: sortOrder },
    skip,
    take: limitNum,
    include: includeBasic  // ← Include category, brand, variants
  }),
  prisma.product.count({ where })
])
```

**Vấn đề:**
- Mỗi sản phẩm include category, brand, variants
- Nếu 1 sản phẩm có 10 variants → Query rất nặng
- Chưa có caching

**Cách cải thiện:**
```javascript
// 1. Chỉ lấy field cần thiết
select: {
  id: true,
  name: true,
  slug: true,
  price: true,
  salePrice: true,
  imageUrl: true,
  category: { select: { id: true, name: true } },
  brand: { select: { id: true, name: true } }
}

// 2. Thêm Redis caching
const cacheKey = `products:page:${page}:limit:${limit}`
const cached = await redis.get(cacheKey)
if (cached) return JSON.parse(cached)

// 3. Thêm database indexing
@@index([status, createdAt])
@@index([categoryId, status])
```

---

#### **Câu 4.2: "Tại sao tính tổng stock từ variants mỗi lần query?"**

**⚠️ Không hiệu quả:**
```javascript
// adminProductController.js - Line 21-26
const calculateTotalStock = (product) => {
  return product.variants.reduce((sum, variant) => 
    sum + (variant.stockQuantity || 0), 0
  )
}
```

**Vấn đề:**
- Mỗi lần lấy danh sách sản phẩm → Tính lại tổng stock
- Nếu 100 sản phẩm, mỗi sản phẩm 10 variants → 1000 phép tính

**Cách cải thiện:**
```javascript
// Thêm field totalStock vào Product model
model Product {
  ...
  totalStock Int @default(0)  // Cache tổng stock
}

// Khi update variant → Update totalStock
await prisma.product.update({
  where: { id: productId },
  data: {
    totalStock: {
      increment: quantity  // Hoặc decrement
    }
  }
})
```

---

### 🔴 **NHÓM 5: TRẢI NGHIỆM NGƯỜI DÙNG**

#### **Câu 5.1: "Nếu user đặt hàng nhưng quên không thanh toán VNPay thì sao?"**

**⚠️ Thiếu chức năng:**
- Đơn hàng tạo ra với `paymentStatus = PENDING`
- Payment URL hết hạn sau 15 phút
- User không thể thanh toán lại

**Thực tế nên có:**
```javascript
// Cho phép tạo lại payment URL
export const retryVNPayPayment = async (req, res) => {
  const { orderId } = req.body
  
  // Kiểm tra đơn hàng
  const order = await prisma.order.findFirst({
    where: { 
      id: orderId, 
      userId: req.user.id,
      paymentStatus: 'PENDING',  // Chỉ cho phép retry nếu chưa thanh toán
      status: 'PENDING'  // Và đơn chưa bị hủy
    }
  })
  
  if (!order) {
    return res.status(400).json({ 
      message: 'Không thể thanh toán lại đơn hàng này' 
    })
  }
  
  // Tạo payment URL mới (giống createVNPayPayment)
  // ...
}
```

---

#### **Câu 5.2: "Tại sao không có chức năng tracking đơn hàng?"**

**⚠️ Thiếu chức năng quan trọng:**
- User không biết đơn hàng đang ở đâu
- Không có mã vận đơn (tracking code)
- Không tích hợp với GHN tracking API

**Cách cải thiện:**
```javascript
// Khi admin chuyển sang PROCESSING → Tạo đơn GHN
const ghnOrder = await ghnService.createOrder({
  orderId: order.id,
  orderNumber: order.orderNumber,
  // ...
})

// Lưu tracking code
await prisma.order.update({
  where: { id: order.id },
  data: {
    trackingCode: ghnOrder.order_code,
    ghnOrderId: ghnOrder.order_id
  }
})

// API tracking
export const trackOrder = async (req, res) => {
  const { trackingCode } = req.params
  
  // Gọi GHN API để lấy trạng thái
  const tracking = await ghnService.trackOrder(trackingCode)
  
  return res.json(tracking)
}
```

---

## 2. LỖ HỔNG VÀ ĐIỂM YẾU CỦA PROJECT

### 🔴 **LỖ HỔNG NGHIÊM TRỌNG (CRITICAL)**

#### **2.1. Race Condition trong thanh toán VNPay**
```javascript
// paymentController.js - Line 276-298 (Return)
// và Line 193-214 (Callback)
// CẢ HAI đều cập nhật DB → Race condition
```

**Vấn đề:**
- Callback và Return có thể chạy đồng thời
- Cả 2 đều update `paymentStatus = PAID`
- Có thể gây duplicate update hoặc deadlock

**Cách fix:**
```javascript
// Thêm lock mechanism
const payment = await prisma.payment.findFirst({
  where: { transactionId: verifyResult.transactionId }
})

// Chỉ update nếu chưa PAID
if (payment.paymentStatus !== 'PAID') {
  await prisma.$transaction(async (tx) => {
    // Update payment
    // Update order
  })
}
```

---

#### **2.2. Không kiểm tra tồn kho khi admin xác nhận đơn**
```javascript
// adminOrderController.js
// CONFIRMED → Trừ tồn kho
// Nhưng không check stockQuantity >= quantity
```

**Hậu quả:**
- Tồn kho có thể âm
- Overselling (bán quá số lượng có)

---

#### **2.3. Không có transaction timeout**
```javascript
await prisma.$transaction(async (tx) => {
  // Nhiều operations
  // Nếu 1 operation chậm → Block toàn bộ
})
```

**Cách fix:**
```javascript
await prisma.$transaction(async (tx) => {
  // ...
}, {
  timeout: 10000,  // 10 seconds
  maxWait: 5000    // Wait 5s for transaction to start
})
```

---

### 🟡 **ĐIỂM YẾU TRUNG BÌNH (MEDIUM)**

#### **2.4. Không có soft delete**
```javascript
// adminProductController.js - Line 567
await tx.product.delete({ where: { id } })
```

**Vấn đề:**
- Xóa vĩnh viễn khỏi database
- Không thể khôi phục
- Mất dữ liệu lịch sử

**Cách fix:**
```javascript
// Thêm field deletedAt
model Product {
  ...
  deletedAt DateTime?
}

// Soft delete
await prisma.product.update({
  where: { id },
  data: { deletedAt: new Date() }
})

// Query chỉ lấy sản phẩm chưa xóa
where: { deletedAt: null }
```

---

#### **2.5. Không có audit log**
- Không biết ai sửa gì, khi nào
- Không trace được lỗi
- Không có accountability

**Cách fix:**
```javascript
model AuditLog {
  id        Int      @id @default(autoincrement())
  userId    Int
  action    String   // CREATE, UPDATE, DELETE
  entity    String   // Product, Order, User
  entityId  Int
  oldValue  Json?
  newValue  Json?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}
```

---

#### **2.6. Email không có retry mechanism**
```javascript
// orderController.js - Line 367-374
await sendOrderConfirmationEmail(...)
// Nếu lỗi → Chỉ log, không retry
```

**Vấn đề:**
- Email service down → User không nhận được email
- Không có cách gửi lại

**Cách fix:**
```javascript
// Thêm email queue với Bull
const emailQueue = new Queue('email', {
  redis: { host: 'localhost', port: 6379 }
})

emailQueue.add('order-confirmation', {
  email: user.email,
  order: orderDetails
}, {
  attempts: 3,  // Retry 3 lần
  backoff: {
    type: 'exponential',
    delay: 2000
  }
})
```

---

### 🟢 **ĐIỂM YẾU NHỎ (LOW)**

#### **2.7. Không có input sanitization**
```javascript
// orderController.js - Line 129
const { customerNote } = req.body
// Không sanitize → Có thể chứa XSS
```

**Cách fix:**
```javascript
import DOMPurify from 'isomorphic-dompurify'

const customerNote = DOMPurify.sanitize(req.body.customerNote)
```

---

#### **2.8. Hardcoded frontend URL**
```javascript
// paymentController.js - Line 6
const frontendUrl = "http://localhost:5173"
```

**Cách fix:**
```javascript
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173"
```

---

## 3. CÁC ĐIỂM KHÔNG GIỐNG THỰC TẾ

### ❌ **3.1. Tồn kho không được trừ ngay khi đặt hàng**
**Thực tế:**
- Shopee, Lazada, Tiki: Trừ tồn kho ngay
- Nếu hủy → Hoàn lại

**Project của bạn:**
- Chỉ trừ khi admin xác nhận
- → User có thể đặt hàng dù hết hàng

---

### ❌ **3.2. Không có chức năng đổi/trả hàng**
**Thực tế:**
- Luật bảo vệ người tiêu dùng: Được đổi/trả trong 7-30 ngày
- E-commerce phải có chức năng này

**Project của bạn:**
- Không có
- Chỉ có hủy đơn

---

### ❌ **3.3. Không có đánh giá sản phẩm sau khi mua**
**Thực tế:**
- Chỉ người mua mới được đánh giá
- Phải có "Verified Purchase" badge

**Project của bạn:**
- Có bảng `product_reviews`
- Nhưng không kiểm tra user đã mua chưa

**Cách fix:**
```javascript
// Kiểm tra user đã mua sản phẩm chưa
const hasPurchased = await prisma.order.findFirst({
  where: {
    userId,
    status: 'DELIVERED',
    orderItems: {
      some: { productId }
    }
  }
})

if (!hasPurchased) {
  return res.status(403).json({
    message: 'Bạn chỉ có thể đánh giá sản phẩm đã mua'
  })
}
```

---

### ❌ **3.4. Không có thông báo khi sản phẩm sắp hết hàng**
**Thực tế:**
- Admin nhận cảnh báo khi stock < minStockLevel
- Tự động tạo đơn nhập hàng

**Project của bạn:**
- Có field `minStockLevel` nhưng không dùng

---

### ❌ **3.5. Phí ship cố định 30,000đ nếu GHN lỗi**
```javascript
// orderController.js - Line 12
const DEFAULT_SHIPPING_FEE = 30000
```

**Vấn đề:**
- Giao xa 500km cũng 30k
- Giao gần 5km cũng 30k
- Không hợp lý

**Cách fix:**
- Tính theo khoảng cách
- Hoặc từ chối đơn nếu không tính được phí

---

## 4. CHUẨN BỊ CODE LẠI CHỨC NĂNG

### 📝 **Các chức năng giáo viên có thể yêu cầu xóa và code lại:**

#### **4.1. Xóa chức năng thanh toán VNPay → Code lại**

**Yêu cầu có thể:**
- "Em xóa toàn bộ code VNPay đi"
- "Code lại từ đầu trong 30 phút"

**Chuẩn bị:**
1. **Hiểu rõ flow VNPay:**
   - Create payment URL
   - Handle callback (IPN)
   - Handle return
   - Verify signature

2. **Các file cần sửa:**
   - `paymentController.js` - 3 functions
   - `vnpayService.js` - 2 functions
   - `paymentRoutes.js` - 3 routes
   - Frontend: `vnpayPayment.js`, `PaymentResult.jsx`

3. **Checklist code lại:**
   ```
   ☐ Install vnpay package
   ☐ Tạo vnpayService.js
   ☐ Implement createPayment()
   ☐ Implement verifyCallback()
   ☐ Tạo paymentController.js
   ☐ Implement createVNPayPayment()
   ☐ Implement handleVNPayCallback()
   ☐ Implement handleVNPayReturn()
   ☐ Tạo routes
   ☐ Test với VNPay sandbox
   ```

---

#### **4.2. Xóa chức năng giỏ hàng → Code lại**

**Yêu cầu có thể:**
- "Em xóa toàn bộ shopping cart"
- "Code lại CRUD giỏ hàng"

**Chuẩn bị:**
1. **Các API cần implement:**
   - GET /api/cart - Lấy giỏ hàng
   - POST /api/cart - Thêm vào giỏ
   - PUT /api/cart/:id - Cập nhật số lượng
   - DELETE /api/cart/:id - Xóa item
   - DELETE /api/cart - Xóa toàn bộ

2. **Nghiệp vụ quan trọng:**
   - Kiểm tra sản phẩm tồn tại
   - Kiểm tra variant tồn tại (nếu có)
   - Kiểm tra tồn kho
   - Merge cart nếu đã có sản phẩm
   - Unique constraint: (userId, productId, variantId)

3. **Code mẫu:**
```javascript
// POST /api/cart - Thêm vào giỏ
export const addToCart = async (req, res) => {
  const userId = req.user.id
  const { productId, variantId, quantity } = req.body
  
  // 1. Kiểm tra sản phẩm
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: true }
  })
  
  if (!product || product.status !== 'ACTIVE') {
    return res.status(404).json({ message: 'Sản phẩm không tồn tại' })
  }
  
  // 2. Kiểm tra variant (nếu có)
  if (variantId) {
    const variant = product.variants.find(v => v.id === variantId)
    if (!variant || !variant.isActive) {
      return res.status(404).json({ message: 'Biến thể không tồn tại' })
    }
    
    // Kiểm tra tồn kho
    if (variant.stockQuantity < quantity) {
      return res.status(400).json({ 
        message: `Chỉ còn ${variant.stockQuantity} sản phẩm` 
      })
    }
  }
  
  // 3. Kiểm tra đã có trong giỏ chưa
  const existing = await prisma.shoppingCart.findUnique({
    where: {
      userId_productId_variantId: {
        userId,
        productId,
        variantId: variantId || null
      }
    }
  })
  
  if (existing) {
    // Update số lượng
    const updated = await prisma.shoppingCart.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity }
    })
    return res.json(updated)
  }
  
  // 4. Tạo mới
  const created = await prisma.shoppingCart.create({
    data: { userId, productId, variantId, quantity }
  })
  
  return res.status(201).json(created)
}
```

---

#### **4.3. Xóa chức năng quản lý đơn hàng (Admin) → Code lại**

**Chuẩn bị:**
1. **Các API cần implement:**
   - GET /api/admin/orders - Danh sách đơn hàng
   - GET /api/admin/orders/:id - Chi tiết đơn hàng
   - PUT /api/admin/orders/:id/status - Cập nhật trạng thái

2. **Flow cập nhật trạng thái:**
```
PENDING → CONFIRMED → PROCESSING → DELIVERED
   ↓
CANCELLED (any time)
```

3. **Nghiệp vụ quan trọng:**
   - CONFIRMED: Trừ tồn kho, kiểm tra stock
   - CANCELLED: Hoàn tồn kho (nếu đã CONFIRMED)
   - DELIVERED + COD: Tự động set paymentStatus = PAID
   - Gửi email thông báo
   - Emit Socket.IO event

---

## 5. CÂU TRẢ LỜI MẪU

### **Câu hỏi: "Em giải thích flow thanh toán VNPay từ đầu đến cuối"**

**Trả lời:**

"Dạ, flow thanh toán VNPay gồm 6 bước chính ạ:

**Bước 1: User chọn VNPay và đặt hàng**
- Frontend gọi API `POST /api/orders` với `paymentMethod = VNPAY`
- Backend tạo order với `paymentStatus = PENDING`
- Trả về `orderId` cho frontend

**Bước 2: Tạo payment URL**
- Frontend gọi `POST /api/payment/vnpay/create` với `orderId`
- Backend:
  - Lấy thông tin order từ DB
  - Gọi VNPay SDK để tạo payment URL
  - Lưu `paymentUrl` và `expiresAt` vào bảng `payments`
  - Trả về `paymentUrl` cho frontend

**Bước 3: Redirect user đến VNPay**
- Frontend redirect: `window.location.href = paymentUrl`
- User nhập thông tin thẻ và xác nhận thanh toán trên trang VNPay

**Bước 4: VNPay xử lý thanh toán**
- VNPay trừ tiền từ tài khoản user
- VNPay gọi 2 URL:
  - **IPN Callback** (server-to-server): `POST /api/payment/vnpay/callback`
  - **Return URL** (browser redirect): `GET /api/payment/vnpay/return`

**Bước 5: Backend xử lý callback**
- Xác thực chữ ký (signature) từ VNPay
- Kiểm tra số tiền khớp với order
- Nếu `responseCode = 00` (thành công):
  - Update `payments.paymentStatus = PAID`
  - Update `orders.paymentStatus = PAID`
  - Lưu `paidAt`, `vnpayTransactionNo`, `bankCode`
- Nếu thất bại:
  - Update `paymentStatus = FAILED`

**Bước 6: Hiển thị kết quả cho user**
- VNPay redirect user về `/payment/result?status=success&orderId=123`
- Frontend hiển thị trang "Thanh toán thành công"
- User có thể xem chi tiết đơn hàng

**Điểm quan trọng:**
- IPN Callback đảm bảo 100% nhận kết quả (không phụ thuộc trình duyệt)
- Return URL chỉ để hiển thị UI cho user
- Cả 2 đều verify signature để đảm bảo request từ VNPay"

---

### **Câu hỏi: "Tại sao em không trừ tồn kho ngay khi đặt hàng?"**

**Trả lời (THÀNH THẬT):**

"Dạ, em thừa nhận đây là một thiếu sót trong thiết kế ạ.

**Cách em đang làm:**
- Khi user đặt hàng → Không trừ tồn kho
- Chỉ trừ khi admin xác nhận (CONFIRMED)

**Vấn đề:**
- User có thể đặt nhiều đơn cùng lúc → Hết tồn kho
- Khi admin xác nhận, phát hiện không đủ hàng
- Phải hủy đơn → Trải nghiệm user kém

**Cách đúng nên làm:**
- Trừ tồn kho ngay khi đặt hàng (reserve stock)
- Nếu user hủy → Hoàn lại tồn kho
- Nếu quá 24h không thanh toán → Tự động hủy và hoàn tồn kho

**Em sẽ sửa như sau:**
```javascript
// Trong createOrder()
await tx.productVariant.update({
  where: { id: item.variantId },
  data: { stockQuantity: { decrement: item.quantity } }
})

// Trong cancelOrder()
await tx.productVariant.update({
  where: { id: item.variantId },
  data: { stockQuantity: { increment: item.quantity } }
})
```

**Lý do em làm sai:**
- Em nghĩ COD có thể không thanh toán → Không nên trừ tồn kho
- Nhưng thực tế, nên trừ ngay và hoàn lại nếu hủy"

---

### **Câu hỏi: "Nếu tôi yêu cầu em xóa code VNPay và code lại, em làm được không?"**

**Trả lời:**

"Dạ được ạ. Em sẽ làm theo các bước sau:

**Bước 1: Xóa code cũ (2 phút)**
- Xóa `paymentController.js` - 3 functions
- Xóa `vnpayService.js`
- Xóa routes trong `paymentRoutes.js`

**Bước 2: Cài đặt package (1 phút)**
```bash
npm install vnpay
```

**Bước 3: Tạo vnpayService.js (5 phút)**
- Import VNPay SDK
- Config: TMN_CODE, HASH_SECRET, URL, RETURN_URL
- Implement `createPayment()`: Tạo payment URL
- Implement `verifyCallback()`: Verify signature

**Bước 4: Tạo paymentController.js (10 phút)**
- `createVNPayPayment()`: Tạo payment URL
- `handleVNPayCallback()`: Xử lý IPN callback
- `handleVNPayReturn()`: Xử lý return URL

**Bước 5: Tạo routes (2 phút)**
```javascript
router.post('/vnpay/create', authenticate, createVNPayPayment)
router.post('/vnpay/callback', handleVNPayCallback)
router.get('/vnpay/return', handleVNPayReturn)
```

**Bước 6: Test (5 phút)**
- Test tạo payment URL
- Test callback với VNPay sandbox
- Kiểm tra DB được update đúng

**Tổng thời gian: ~25 phút**

Em có thể code lại được vì em hiểu rõ flow và đã làm nhiều lần ạ."

---

## 📌 CHECKLIST CHUẨN BỊ

### ✅ **Trước buổi phản biện:**

- [ ] Đọc kỹ tài liệu này 3 lần
- [ ] Hiểu rõ flow thanh toán VNPay (vẽ sơ đồ)
- [ ] Hiểu rõ flow đặt hàng (vẽ sơ đồ)
- [ ] Chuẩn bị trả lời 10 câu hỏi khó nhất
- [ ] Chuẩn bị code lại 3 chức năng chính
- [ ] Backup code hiện tại (git commit)
- [ ] Chuẩn bị môi trường dev (DB, Redis, ...)

### ✅ **Trong buổi phản biện:**

- [ ] Tự tin, nói rõ ràng
- [ ] Thừa nhận lỗi nếu có
- [ ] Giải thích cách fix
- [ ] Không bào chữa
- [ ] Ghi chú lại câu hỏi giáo viên

### ✅ **Sau buổi phản biện:**

- [ ] Fix các lỗi giáo viên chỉ ra
- [ ] Cải thiện code theo góp ý
- [ ] Viết báo cáo sửa lỗi
- [ ] Commit code đã fix

---

## 🎯 LỜI KHUYÊN CUỐI CÙNG

### **1. Thành thật là tốt nhất**
- Nếu không biết → Nói "Em chưa nghĩ đến điểm này"
- Nếu làm sai → Nói "Em thừa nhận đây là thiếu sót"
- Đừng bịa đặt hoặc bào chữa

### **2. Tập trung vào nghiệp vụ**
- Giáo viên quan tâm: "Tại sao làm vậy?"
- Không phải: "Code này dùng thư viện gì?"

### **3. Chuẩn bị code lại**
- Giáo viên thường yêu cầu xóa và code lại
- Hiểu flow > Nhớ code

### **4. Tự tin nhưng khiêm tốn**
- Tự tin khi giải thích
- Khiêm tốn khi nhận lỗi

---

**CHÚC BẠN PHẢN BIỆN THÀNH CÔNG! 🎉**

**Nhớ:**
- Đọc kỹ tài liệu này
- Vẽ sơ đồ flow
- Chuẩn bị code lại
- Tự tin và thành thật

**Good luck! 🍀**
