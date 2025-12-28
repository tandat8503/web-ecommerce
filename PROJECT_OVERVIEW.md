# 🚀 E-COMMERCE PROJECT - TỔNG QUAN NHANH

**Version:** 1.0.0  
**Date:** 2025-12-28

---

## 📊 THỐNG KÊ PROJECT

### **Cấu trúc:**
```
📁 web-ecommerce/
├── 📁 backend/          # Node.js + Express + Prisma
│   ├── 24 controllers
│   ├── 24 routes
│   ├── 12 validators
│   └── 5 services
├── 📁 frontend/         # React + Vite + TailwindCSS
│   ├── 68 pages
│   ├── 37 components
│   ├── 23 API modules
│   └── 2 stores (Zustand)
└── 📁 ai/              # Python + FastAPI + Gemini
    ├── User Chatbot
    └── Legal Chatbot
```

### **Database:**
- **Tables:** 22 bảng
- **Enums:** 7 enums
- **Relations:** 30+ quan hệ

### **Features:**
- ✅ Authentication (Email/Password + Google OAuth)
- ✅ Product Management (CRUD + Variants + Images)
- ✅ Shopping Cart & Wishlist
- ✅ Checkout & Order Management
- ✅ Payment Integration (VNPay + COD)
- ✅ Shipping Integration (GHN API)
- ✅ Coupon System (5 loại coupon)
- ✅ Review & Comment System
- ✅ Real-time Notifications (Socket.IO)
- ✅ AI Chatbot (Product + Legal)
- ✅ Admin Dashboard
- ✅ Email Notifications

---

## 🎯 CHỨC NĂNG CHÍNH

### **1. Authentication & User Management**
```
📍 Files:
Backend:  controller/authController.js
          routes/authRoutes.js
Frontend: pages/auth/Login.jsx
          stores/authStore.js
API:      POST /api/auth/login
          POST /api/auth/register
          POST /api/auth/google
```

**Flow:**
```
User Input → Validation → Hash Password → Create User → Generate JWT → Return Token
```

---

### **2. Shopping Cart**
```
📍 Files:
Backend:  controller/shoppingCartController.js
          routes/shoppingCartRoutes.js
Frontend: pages/user/Cart.jsx
          api/cart.js
API:      GET    /api/cart
          POST   /api/cart
          PUT    /api/cart/:id
          DELETE /api/cart/:id
```

**Flow:**
```
Add to Cart → Check Stock → Update/Create Cart Item → Return Updated Cart
```

**Database:**
```sql
shopping_cart (
  id, userId, productId, variantId, quantity
)
```

---

### **3. Checkout & Order**
```
📍 Files:
Backend:  controller/orderController.js
          routes/orderRoutes.js
Frontend: pages/user/checkout/Checkout.jsx
          pages/user/checkout/useCheckout.js
API:      POST /api/orders
```

**Flow:**
```
1. Select Address
2. Calculate Shipping (GHN API)
3. Apply Coupon (optional)
4. Choose Payment Method (COD/VNPay)
5. Create Order (Transaction)
   ├── Create Order
   ├── Create Payment
   ├── Create Order Items
   ├── Update Stock
   └── Clear Cart
6. Send Email + Notification
7. Redirect to Success/Payment Page
```

**Database Transaction:**
```javascript
await prisma.$transaction(async (tx) => {
  const order = await tx.order.create(...)
  await tx.payment.create(...)
  await tx.orderItem.createMany(...)
  await tx.orderStatusHistory.create(...)
  await tx.shoppingCart.deleteMany(...)
  return order
})
```

---

### **4. Payment - VNPay**
```
📍 Files:
Backend:  controller/paymentController.js
          services/payment/vnpayService.js
Frontend: features/payment/vnpayPayment.js
API:      POST /api/payment/vnpay/create
          GET  /api/payment/vnpay/return
          POST /api/payment/vnpay/callback
```

**Flow:**
```
1. User chọn VNPay → Create Order (PENDING)
2. Frontend gọi createVNPayPayment(orderId)
3. Backend tạo Payment URL từ VNPay SDK
4. Frontend redirect user đến VNPay
5. User thanh toán trên VNPay
6. VNPay callback (IPN) → Update DB (PAID/FAILED)
7. VNPay return → Redirect frontend
8. Frontend hiển thị kết quả
```

**Xem chi tiết:** `LUU_THANH_TOAN_VNPAY_COD_FLOW.md`

---

### **5. Payment - COD**
```
Flow:
1. User chọn COD → Create Order (PENDING)
2. Frontend redirect đến Success Page
3. Admin xác nhận đơn
4. Khi giao hàng (DELIVERED) → Update paymentStatus = PAID
```

---

### **6. Admin - Order Management**
```
📍 Files:
Backend:  controller/adminOrderController.js
          routes/adminOrderRoutes.js
Frontend: pages/admin/OrderManagement.jsx
API:      GET /api/admin/orders
          PUT /api/admin/orders/:id/status
```

**Order Status Flow:**
```
PENDING → CONFIRMED → PROCESSING → DELIVERED
   ↓
CANCELLED (any time before DELIVERED)
```

**Update Status:**
```javascript
// Backend
await prisma.$transaction(async (tx) => {
  // 1. Update order status
  await tx.order.update({ 
    where: { id }, 
    data: { status } 
  })
  
  // 2. Save history
  await tx.orderStatusHistory.create({
    data: { orderId: id, status }
  })
  
  // 3. If CANCELLED → Restore stock
  if (status === 'CANCELLED') {
    for (const item of order.orderItems) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stockQuantity: { increment: item.quantity } }
      })
    }
  }
  
  // 4. If DELIVERED + COD → Mark as PAID
  if (status === 'DELIVERED' && order.paymentMethod === 'COD') {
    await tx.order.update({
      where: { id },
      data: { paymentStatus: 'PAID' }
    })
  }
})

// 5. Send email notification
await sendOrderStatusEmail(order, status)

// 6. Emit Socket.IO event
emitToUser(order.userId, 'order:status_updated', { ... })
```

**Xem chi tiết:** `LUU_ADMIN_ORDER_MANAGEMENT_FLOW.md`

---

### **7. Shipping - GHN Integration**
```
📍 Files:
Backend:  services/shipping/ghnService.js
          controller/ghnController.js
API:      POST /api/ghn/calculate-fee
          GET  /api/ghn/provinces
          GET  /api/ghn/districts/:provinceId
          GET  /api/ghn/wards/:districtId
```

**Calculate Shipping Fee:**
```javascript
const fee = await ghnService.calculateShippingFee({
  toDistrictId: address.districtId,
  toWardCode: address.wardCode,
  weight: totalWeight,      // gram
  length: 30,               // cm
  width: 20,
  height: 10,
  serviceTypeId: 2          // Standard shipping
})
```

---

### **8. Coupon System**
```
📍 Files:
Backend:  controller/couponController.js
          controller/adminCouponManagementController.js
Frontend: pages/user/MyCoupons.jsx
          pages/admin/CouponManagement.jsx
```

**Coupon Types:**
```javascript
enum PromotionType {
  GENERAL           // Mã giảm giá chung
  FIRST_ORDER       // Mã cho đơn hàng đầu tiên (300k)
  FIRST_REVIEW      // Mã cho đánh giá đầu tiên (100k)
  SHIPPING          // Mã miễn phí ship
  SEASONAL          // Mã theo mùa
}
```

**Apply Coupon:**
```javascript
// Validate coupon
const coupon = await prisma.coupon.findUnique({
  where: { code: couponCode }
})

// Check conditions
if (!coupon.isActive) throw Error('Coupon không khả dụng')
if (new Date() > coupon.endDate) throw Error('Coupon đã hết hạn')
if (subtotal < coupon.minimumAmount) throw Error('Chưa đủ điều kiện')
if (coupon.usedCount >= coupon.usageLimit) throw Error('Đã hết lượt')

// Calculate discount
let discount = 0
if (coupon.discountType === 'PERCENT') {
  discount = (subtotal * coupon.discountValue) / 100
} else {
  discount = coupon.discountValue
}

// Apply to shipping if applicable
if (coupon.applyToShipping) {
  discount += shippingFee
}
```

---

### **9. Real-time Notifications (Socket.IO)**
```
📍 Files:
Backend:  config/socket.js
Frontend: components/InitUserSocket.jsx
          stores/notificationStore.js
```

**Events:**
```javascript
// Backend emit
emitToUser(userId, 'order:created', data)
emitToUser(userId, 'order:status_updated', data)
emitToAdmins('order:new', data)
emitToAdmins('review:new', data)

// Frontend listen
socket.on('order:created', (data) => {
  toast.success(data.message)
  addNotification(data)
})

socket.on('order:status_updated', (data) => {
  toast.info(data.message)
  updateOrderStatus(data)
})
```

**Setup:**
```javascript
// Backend
const io = new Server(server, {
  cors: { origin: 'http://localhost:5173' }
})

io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    socket.join(`user_${userId}`)
  })
})

// Frontend
const socket = io('http://localhost:5000')
socket.emit('join', user.id)
```

---

### **10. AI Chatbot**
```
📍 Files:
AI Service: ai/app.py
            ai/services/legal/improved_legal_service.py
Frontend:   pages/user/Chatbot.jsx
API:        POST http://localhost:8000/chat
            POST http://localhost:8000/legal/consult
```

**User Chatbot (Product Recommendations):**
```python
# Query products from MySQL
products = await db.fetch_products(search_query)

# Generate response with Gemini
response = await gemini.generate_content(
  f"User hỏi: {message}\nSản phẩm: {products}\nTrả lời:"
)
```

**Legal Chatbot (Document Search):**
```python
# Search in ChromaDB
results = vector_db.query(
  query_texts=[query],
  n_results=5
)

# Generate answer with context
response = await gemini.generate_content(
  f"Context: {results}\nQuestion: {query}\nAnswer:"
)
```

**Xem chi tiết:** `AI_LEGAL_CHATBOT_REPORT.md`

---

## 🗂️ DATABASE SCHEMA

### **Core Tables:**

#### **users**
```sql
id, email, password, firstName, lastName, phone, avatar,
role (CUSTOMER/ADMIN), isActive, isVerified, createdAt
```

#### **products**
```sql
id, name, slug, description, categoryId, brandId,
price, salePrice, imageUrl, status, isFeatured, viewCount
```

#### **product_variants**
```sql
id, productId, stockQuantity, color, width, height,
material, warranty, isActive
```

#### **shopping_cart**
```sql
id, userId, productId, variantId, quantity, createdAt
UNIQUE(userId, productId, variantId)
```

#### **orders**
```sql
id, orderNumber, userId, status, paymentStatus,
subtotal, shippingFee, discountAmount, totalAmount,
shippingAddress, paymentMethod, trackingCode
```

#### **order_items**
```sql
id, orderId, productId, variantId, productName,
quantity, unitPrice, totalPrice
```

#### **payments**
```sql
id, orderId, paymentMethod, paymentStatus, amount,
transactionId, paymentUrl, vnpayTransactionNo,
bankCode, responseCode, paidAt
```

#### **coupons**
```sql
id, code, name, promotionType, discountType, discountValue,
minimumAmount, usageLimit, usedCount, startDate, endDate
```

---

## 🔑 API ENDPOINTS CHÍNH

### **Authentication:**
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/google
POST   /api/auth/verify-email
GET    /api/auth/me
```

### **Products:**
```
GET    /api/products
GET    /api/products/:id
GET    /api/products/slug/:slug
GET    /api/products/search?q=...
```

### **Cart:**
```
GET    /api/cart
POST   /api/cart
PUT    /api/cart/:id
DELETE /api/cart/:id
```

### **Orders:**
```
GET    /api/orders
GET    /api/orders/:id
POST   /api/orders
PUT    /api/orders/:id/cancel
```

### **Payment:**
```
POST   /api/payment/vnpay/create
GET    /api/payment/vnpay/return
POST   /api/payment/vnpay/callback
```

### **Admin:**
```
GET    /api/admin/orders
PUT    /api/admin/orders/:id/status
GET    /api/admin/products
POST   /api/admin/products
PUT    /api/admin/products/:id
DELETE /api/admin/products/:id
```

---

## 🚀 QUICK START

### **1. Setup Environment:**
```bash
# Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials

# Frontend
cd frontend
npm install

# AI Service
cd ai
pip install -r requirements.txt
cp .env.example .env
```

### **2. Database:**
```bash
cd backend
npx prisma generate
npx prisma db push
npm run seed
```

### **3. Run Services:**
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev

# Terminal 3 - AI Service
cd ai && python3 app.py
```

### **4. Access:**
- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- AI Service: http://localhost:8000

---

## 📚 TÀI LIỆU CHI TIẾT

### **Luồng nghiệp vụ:**
- `LUU_THANH_TOAN_VNPAY_COD_FLOW.md` - Thanh toán
- `LUU_CHECKOUT_ORDER_FLOW.md` - Checkout
- `LUU_CRUD_CART_FLOW.md` - Giỏ hàng
- `LUU_ADMIN_ORDER_MANAGEMENT_FLOW.md` - Quản lý đơn
- `LUU_ORDER_STATUS_EMAIL_FLOW.md` - Email thông báo
- `LUU_QUEN_MAT_KHAU_FLOW.md` - Quên mật khẩu

### **Kỹ thuật:**
- `HUONG_DAN_CODE_CHUC_NANG.md` - Hướng dẫn code chi tiết
- `DATABASE_PHYSICAL_DESCRIPTION.md` - Mô tả database
- `SOCKET_FLOW_DIAGRAM.md` - Socket.IO
- `AI_LEGAL_CHATBOT_REPORT.md` - AI Chatbot
- `QUICK_START_PRODUCTION.md` - Deploy production

---

## 🎯 CÁC PATTERN QUAN TRỌNG

### **1. Transaction Pattern:**
```javascript
await prisma.$transaction(async (tx) => {
  // Multiple operations
  // All succeed or all fail
})
```

### **2. Authentication Pattern:**
```javascript
// Middleware
router.post('/protected', authenticate, isAdmin, controller)

// Controller
const userId = req.user.id
const userRole = req.user.role
```

### **3. Error Handling Pattern:**
```javascript
try {
  // Logic
  res.json({ success: true, data })
} catch (error) {
  console.error(error)
  res.status(500).json({ success: false, message: error.message })
}
```

### **4. Pagination Pattern:**
```javascript
const page = Number(req.query.page) || 1
const limit = Number(req.query.limit) || 12
const skip = (page - 1) * limit

const [data, total] = await Promise.all([
  prisma.model.findMany({ skip, take: limit }),
  prisma.model.count()
])

res.json({
  data,
  pagination: {
    page, limit, total,
    totalPages: Math.ceil(total / limit)
  }
})
```

---

## 🔧 TOOLS & LIBRARIES

### **Backend:**
- **Express.js** - Web framework
- **Prisma** - ORM
- **JWT** - Authentication
- **Socket.IO** - Real-time
- **Nodemailer** - Email
- **Cloudinary** - Image upload
- **VNPay SDK** - Payment
- **Axios** - HTTP client

### **Frontend:**
- **React** - UI library
- **Vite** - Build tool
- **React Router** - Routing
- **Zustand** - State management
- **Axios** - HTTP client
- **React Hook Form** - Forms
- **Zod** - Validation
- **TailwindCSS** - Styling
- **Radix UI** - Components
- **Socket.IO Client** - Real-time

### **AI:**
- **FastAPI** - Web framework
- **Google Gemini** - LLM
- **ChromaDB** - Vector database
- **aiomysql** - MySQL async client

---

## 🎓 LEARNING PATH

### **Beginner:**
1. Hiểu cấu trúc project
2. Chạy được local
3. Tạo CRUD đơn giản
4. Hiểu flow Authentication

### **Intermediate:**
5. Tích hợp payment gateway
6. Tích hợp shipping API
7. Implement real-time features
8. Handle file upload

### **Advanced:**
9. Optimize performance
10. Implement caching
11. Write tests
12. Deploy to production

---

**Xem hướng dẫn chi tiết tại:** `HUONG_DAN_CODE_CHUC_NANG.md`

**Bạn cần hỗ trợ gì? Hãy cho tôi biết!** 🚀
