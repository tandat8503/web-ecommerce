# 📚 HƯỚNG DẪN CODE CHỨC NĂNG - E-COMMERCE PROJECT

**Version:** 1.0.0  
**Date:** 2025-12-28  
**Author:** AI Assistant

---

## 📋 MỤC LỤC

1. [Tổng quan Project](#1-tổng-quan-project)
2. [Kiến trúc hệ thống](#2-kiến-trúc-hệ-thống)
3. [Cấu trúc Database](#3-cấu-trúc-database)
4. [Cấu trúc Backend](#4-cấu-trúc-backend)
5. [Cấu trúc Frontend](#5-cấu-trúc-frontend)
6. [Hướng dẫn code các chức năng](#6-hướng-dẫn-code-các-chức-năng)
7. [Best Practices](#7-best-practices)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. TỔNG QUAN PROJECT

### 1.1. Mô tả
Đây là một **E-commerce Website** hoàn chỉnh với các tính năng:
- 🛒 **Shopping Cart & Checkout**: Giỏ hàng, thanh toán COD/VNPay
- 📦 **Order Management**: Quản lý đơn hàng (Admin & User)
- 💳 **Payment Integration**: Tích hợp VNPay, COD
- 🚚 **Shipping Integration**: Tích hợp GHN API
- 🎫 **Coupon System**: Hệ thống mã giảm giá
- ⭐ **Review & Comment**: Đánh giá và bình luận sản phẩm
- 🤖 **AI Chatbot**: Chatbot tư vấn sản phẩm và pháp lý
- 🔔 **Real-time Notifications**: Thông báo real-time với Socket.IO
- 👤 **User Management**: Quản lý người dùng, địa chỉ
- 📊 **Admin Dashboard**: Dashboard quản trị

### 1.2. Tech Stack

#### **Backend:**
- **Runtime:** Node.js v16+
- **Framework:** Express.js v5.1.0
- **Database:** MySQL (Prisma ORM v6.16.2)
- **Authentication:** JWT + Google OAuth
- **Payment:** VNPay SDK
- **Shipping:** GHN API
- **Real-time:** Socket.IO v4.8.1
- **Upload:** Cloudinary
- **Security:** Helmet, CORS, Rate Limiting

#### **Frontend:**
- **Framework:** React 18.3.1 + Vite
- **Routing:** React Router DOM v7.9.2
- **State Management:** Zustand v5.0.8
- **UI Library:** Radix UI + TailwindCSS v4.1.13
- **Forms:** React Hook Form + Zod
- **HTTP Client:** Axios v1.12.2
- **Real-time:** Socket.IO Client v4.8.1
- **Charts:** Ant Design Charts, Recharts

#### **AI Service:**
- **Runtime:** Python 3.10+
- **Framework:** FastAPI
- **LLM:** Google Gemini Pro
- **Vector DB:** ChromaDB
- **Database:** MySQL (aiomysql)

---

## 2. KIẾN TRÚC HỆ THỐNG

### 2.1. Sơ đồ tổng quan

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT SIDE                          │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           React Frontend (Port 3000/5173)            │  │
│  │  - Pages: Home, Products, Cart, Checkout, Orders    │  │
│  │  - Admin: Dashboard, Products, Orders, Users        │  │
│  │  - State: Zustand (Auth, Cart, Notifications)       │  │
│  │  - Socket.IO Client (Real-time notifications)       │  │
│  └──────────────────────────────────────────────────────┘  │
│                            ↕                                │
└─────────────────────────────────────────────────────────────┘
                             ↕
┌─────────────────────────────────────────────────────────────┐
│                        SERVER SIDE                          │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Express Backend (Port 5000)                  │  │
│  │  - REST API: /api/auth, /api/products, /api/orders  │  │
│  │  - Middleware: Auth, Validation, Rate Limit          │  │
│  │  - Socket.IO Server (Real-time events)              │  │
│  │  - Services: Payment, Shipping, Email                │  │
│  └──────────────────────────────────────────────────────┘  │
│                            ↕                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          AI Service (Port 8000)                      │  │
│  │  - FastAPI: /chat, /legal/consult                    │  │
│  │  - Gemini Pro: Product recommendations               │  │
│  │  - ChromaDB: Legal document search                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                            ↕                                │
└─────────────────────────────────────────────────────────────┘
                             ↕
┌─────────────────────────────────────────────────────────────┐
│                     DATA & EXTERNAL                         │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   MySQL     │  │  Cloudinary │  │   VNPay     │        │
│  │  Database   │  │   (Images)  │  │  (Payment)  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐                         │
│  │     GHN     │  │  ChromaDB   │                         │
│  │ (Shipping)  │  │  (Vectors)  │                         │
│  └─────────────┘  └─────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

### 2.2. Data Flow

#### **User Flow (Mua hàng):**
```
User → Browse Products → Add to Cart → Checkout → Payment → Order Created
  ↓                         ↓              ↓          ↓           ↓
Frontend              Shopping Cart   Address    VNPay/COD   Email + Notification
  ↓                         ↓              ↓          ↓           ↓
Backend API          Cart Controller  GHN API   Payment     Socket.IO
  ↓                         ↓              ↓      Service         ↓
Database              MySQL (cart)   Shipping   MySQL       Admin Dashboard
```

#### **Admin Flow (Quản lý đơn hàng):**
```
Admin → View Orders → Update Status → Confirm/Cancel → User Notification
  ↓          ↓              ↓              ↓                ↓
Dashboard  API          Controller      Database      Socket.IO + Email
```

---

## 3. CẤU TRÚC DATABASE

### 3.1. Các bảng chính

#### **User & Authentication:**
- `users`: Thông tin người dùng
- `addresses`: Địa chỉ giao hàng
- `login_history`: Lịch sử đăng nhập
- `password_resets`: Token reset password
- `otp_verifications`: OTP xác thực email

#### **Products:**
- `products`: Sản phẩm
- `product_variants`: Biến thể sản phẩm (màu, kích thước)
- `product_images`: Hình ảnh sản phẩm
- `product_reviews`: Đánh giá sản phẩm
- `product_comments`: Bình luận sản phẩm
- `categories`: Danh mục
- `brands`: Thương hiệu

#### **Shopping & Orders:**
- `shopping_cart`: Giỏ hàng
- `wishlist`: Danh sách yêu thích
- `orders`: Đơn hàng
- `order_items`: Chi tiết sản phẩm trong đơn
- `order_status_history`: Lịch sử trạng thái đơn
- `payments`: Thanh toán

#### **Promotions:**
- `coupons`: Mã giảm giá
- `coupon_usage`: Lịch sử sử dụng coupon
- `user_coupons`: Coupon của user

#### **Others:**
- `notifications`: Thông báo
- `banners`: Banner quảng cáo

### 3.2. Quan hệ chính

```prisma
User (1) ──→ (N) Address
User (1) ──→ (N) Order
User (1) ──→ (N) ShoppingCart
User (1) ──→ (N) Wishlist
User (1) ──→ (N) ProductReview

Product (1) ──→ (N) ProductVariant
Product (1) ──→ (N) ProductImage
Product (1) ──→ (N) OrderItem
Product (N) ──→ (1) Category
Product (N) ──→ (1) Brand

Order (1) ──→ (N) OrderItem
Order (1) ──→ (N) Payment
Order (1) ──→ (N) OrderStatusHistory
Order (N) ──→ (1) User

Coupon (1) ──→ (N) CouponUsage
Coupon (1) ──→ (N) UserCoupon
```

### 3.3. Enums quan trọng

```prisma
enum UserRole {
  CUSTOMER
  ADMIN
}

enum OrderStatus {
  PENDING      // Chờ xác nhận
  CONFIRMED    // Đã xác nhận
  PROCESSING   // Đang xử lý
  DELIVERED    // Đã giao
  CANCELLED    // Đã hủy
}

enum PaymentStatus {
  PENDING      // Chờ thanh toán
  PAID         // Đã thanh toán
  FAILED       // Thất bại
}

enum PaymentMethod {
  COD          // Thanh toán khi nhận hàng
  VNPAY        // Thanh toán online
}

enum PromotionType {
  GENERAL           // Mã giảm giá chung
  FIRST_ORDER       // Mã cho đơn hàng đầu tiên
  FIRST_REVIEW      // Mã cho đánh giá đầu tiên
  SHIPPING          // Mã miễn phí ship
  SEASONAL          // Mã theo mùa
}
```

---

## 4. CẤU TRÚC BACKEND

### 4.1. Cấu trúc thư mục

```
backend/
├── config/              # Cấu hình
│   ├── prisma.js       # Prisma client
│   ├── socket.js       # Socket.IO config
│   ├── cloudinary.js   # Cloudinary config
│   └── ...
├── controller/          # Controllers (Business logic)
│   ├── authController.js
│   ├── orderController.js
│   ├── paymentController.js
│   ├── shoppingCartController.js
│   └── ...
├── routes/             # Routes (API endpoints)
│   ├── index.js        # Route aggregator
│   ├── authRoutes.js
│   ├── orderRoutes.js
│   └── ...
├── middleware/         # Middleware
│   ├── auth.js         # JWT authentication
│   ├── validate.js     # Validation
│   └── ...
├── services/           # External services
│   ├── payment/
│   │   └── vnpayService.js
│   ├── shipping/
│   │   └── ghnService.js
│   └── email/
│       └── emailService.js
├── validators/         # Input validation schemas
│   ├── authValidator.js
│   ├── orderValidator.js
│   └── ...
├── utils/              # Utilities
│   ├── generateToken.js
│   └── ...
├── prisma/
│   ├── schema.prisma   # Database schema
│   └── seed.js         # Seed data
└── server.js           # Entry point
```

### 4.2. API Endpoints

#### **Authentication (`/api/auth`):**
```javascript
POST   /api/auth/register              // Đăng ký
POST   /api/auth/login                 // Đăng nhập
POST   /api/auth/google                // Đăng nhập Google
POST   /api/auth/verify-email          // Xác thực email
POST   /api/auth/resend-otp            // Gửi lại OTP
GET    /api/auth/me                    // Lấy thông tin user
```

#### **Products (`/api/products`):**
```javascript
GET    /api/products                   // Lấy danh sách sản phẩm
GET    /api/products/:id               // Lấy chi tiết sản phẩm
GET    /api/products/slug/:slug        // Lấy sản phẩm theo slug
GET    /api/products/search            // Tìm kiếm sản phẩm
```

#### **Shopping Cart (`/api/cart`):**
```javascript
GET    /api/cart                       // Lấy giỏ hàng
POST   /api/cart                       // Thêm vào giỏ
PUT    /api/cart/:id                   // Cập nhật số lượng
DELETE /api/cart/:id                   // Xóa khỏi giỏ
DELETE /api/cart                       // Xóa toàn bộ giỏ
```

#### **Orders (`/api/orders`):**
```javascript
GET    /api/orders                     // Lấy danh sách đơn hàng
GET    /api/orders/:id                 // Lấy chi tiết đơn hàng
POST   /api/orders                     // Tạo đơn hàng
PUT    /api/orders/:id/cancel          // Hủy đơn hàng
```

#### **Payment (`/api/payment`):**
```javascript
POST   /api/payment/vnpay/create       // Tạo payment URL VNPay
GET    /api/payment/vnpay/return       // VNPay return URL
POST   /api/payment/vnpay/callback     // VNPay IPN callback
GET    /api/payment/:orderId/status    // Lấy trạng thái thanh toán
```

#### **Admin - Orders (`/api/admin/orders`):**
```javascript
GET    /api/admin/orders               // Lấy tất cả đơn hàng
GET    /api/admin/orders/:id           // Chi tiết đơn hàng
PUT    /api/admin/orders/:id/status    // Cập nhật trạng thái
```

#### **Admin - Products (`/api/admin/products`):**
```javascript
GET    /api/admin/products             // Lấy tất cả sản phẩm
POST   /api/admin/products             // Tạo sản phẩm
PUT    /api/admin/products/:id         // Cập nhật sản phẩm
DELETE /api/admin/products/:id         // Xóa sản phẩm
```

### 4.3. Middleware Flow

```
Request → Rate Limiter → CORS → Body Parser → Routes → Auth Middleware → Validator → Controller → Response
```

**Ví dụ protected route:**
```javascript
// routes/orderRoutes.js
import { authenticate } from '../middleware/auth.js'
import { validateCreateOrder } from '../validators/orderValidator.js'
import { createOrder } from '../controller/orderController.js'

router.post('/orders', 
  authenticate,           // Kiểm tra JWT token
  validateCreateOrder,    // Validate input
  createOrder            // Controller xử lý
)
```

---

## 5. CẤU TRÚC FRONTEND

### 5.1. Cấu trúc thư mục

```
frontend/src/
├── api/                    # API calls
│   ├── auth.js
│   ├── products.js
│   ├── orders.js
│   └── ...
├── components/             # Reusable components
│   ├── ui/                # UI components (Radix UI)
│   ├── ProductCard.jsx
│   ├── Header.jsx
│   └── ...
├── pages/                  # Pages
│   ├── user/
│   │   ├── Home.jsx
│   │   ├── ProductDetail.jsx
│   │   ├── checkout/
│   │   │   ├── Checkout.jsx
│   │   │   └── useCheckout.js
│   │   └── ...
│   └── admin/
│       ├── Dashboard.jsx
│       ├── OrderManagement.jsx
│       └── ...
├── layout/                 # Layouts
│   ├── UserLayout.jsx
│   └── AdminLayout.jsx
├── stores/                 # Zustand stores
│   ├── authStore.js
│   └── notificationStore.js
├── hooks/                  # Custom hooks
│   ├── useAuth.js
│   └── ...
├── routes/                 # Route config
│   └── router.jsx
├── utils/                  # Utilities
│   ├── formatPrice.js
│   └── ...
└── App.jsx                 # Root component
```

### 5.2. State Management (Zustand)

#### **Auth Store:**
```javascript
// stores/authStore.js
import { create } from 'zustand'

const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  
  setAuth: (user, token) => {
    localStorage.setItem('token', token)
    set({ user, token })
  },
  
  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null })
  }
}))
```

#### **Notification Store:**
```javascript
// stores/notificationStore.js
const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,
  
  addNotification: (notification) => set((state) => ({
    notifications: [notification, ...state.notifications],
    unreadCount: state.unreadCount + 1
  })),
  
  markAsRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ),
    unreadCount: state.unreadCount - 1
  }))
}))
```

### 5.3. Routing

```javascript
// routes/router.jsx
import { createBrowserRouter } from 'react-router-dom'

const router = createBrowserRouter([
  {
    path: '/',
    element: <UserLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'products', element: <Products /> },
      { path: 'products/:slug', element: <ProductDetail /> },
      { path: 'cart', element: <Cart /> },
      { path: 'checkout', element: <Checkout /> },
      { path: 'orders', element: <Orders /> },
      { path: 'orders/:id', element: <OrderDetail /> },
    ]
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'products', element: <ProductManagement /> },
      { path: 'orders', element: <OrderManagement /> },
      { path: 'users', element: <UserManagement /> },
    ]
  }
])
```

---

## 6. HƯỚNG DẪN CODE CÁC CHỨC NĂNG

### 6.1. Tạo chức năng mới - CRUD Product

#### **Bước 1: Tạo API endpoint (Backend)**

**File:** `backend/controller/productController.js`
```javascript
import prisma from '../config/prisma.js'

// GET /api/products - Lấy danh sách sản phẩm
export const getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 12, categoryId, search } = req.query
    
    // Build where clause
    const where = {}
    if (categoryId) where.categoryId = Number(categoryId)
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } }
      ]
    }
    
    // Pagination
    const skip = (Number(page) - 1) * Number(limit)
    
    // Query
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          brand: true,
          images: true,
          variants: true
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.count({ where })
    ])
    
    res.json({
      success: true,
      data: products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

// POST /api/admin/products - Tạo sản phẩm mới
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      categoryId,
      brandId,
      price,
      salePrice
    } = req.body
    
    // Generate slug
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    
    // Create product
    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        categoryId: Number(categoryId),
        brandId: Number(brandId),
        price: Number(price),
        salePrice: salePrice ? Number(salePrice) : null,
        status: 'ACTIVE'
      },
      include: {
        category: true,
        brand: true
      }
    })
    
    res.status(201).json({
      success: true,
      message: 'Tạo sản phẩm thành công',
      data: product
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}
```

**File:** `backend/routes/productRoutes.js`
```javascript
import express from 'express'
import { getProducts } from '../controller/productController.js'
import { createProduct } from '../controller/adminProductController.js'
import { authenticate, isAdmin } from '../middleware/auth.js'

const router = express.Router()

// Public routes
router.get('/products', getProducts)

// Admin routes
router.post('/admin/products', authenticate, isAdmin, createProduct)

export default router
```

#### **Bước 2: Tạo API call (Frontend)**

**File:** `frontend/src/api/products.js`
```javascript
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Get token from localStorage
const getAuthHeader = () => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Lấy danh sách sản phẩm
export const getProducts = async (params) => {
  const response = await axios.get(`${API_URL}/products`, { params })
  return response.data
}

// Tạo sản phẩm mới (Admin)
export const createProduct = async (data) => {
  const response = await axios.post(
    `${API_URL}/admin/products`,
    data,
    { headers: getAuthHeader() }
  )
  return response.data
}
```

#### **Bước 3: Tạo UI Component (Frontend)**

**File:** `frontend/src/pages/admin/ProductManagement.jsx`
```javascript
import { useState, useEffect } from 'react'
import { getProducts, createProduct } from '@/api/products'
import { toast } from 'react-toastify'

export default function ProductManagement() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  // Load products
  useEffect(() => {
    loadProducts()
  }, [])
  
  const loadProducts = async () => {
    try {
      setLoading(true)
      const data = await getProducts()
      setProducts(data.data)
    } catch (error) {
      toast.error('Không thể tải sản phẩm')
    } finally {
      setLoading(false)
    }
  }
  
  const handleCreate = async (formData) => {
    try {
      await createProduct(formData)
      toast.success('Tạo sản phẩm thành công')
      setShowCreateModal(false)
      loadProducts()
    } catch (error) {
      toast.error('Không thể tạo sản phẩm')
    }
  }
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Quản lý sản phẩm</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Tạo sản phẩm
        </button>
      </div>
      
      {loading ? (
        <div>Đang tải...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
      
      {showCreateModal && (
        <CreateProductModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}
```

---

### 6.2. Tích hợp Socket.IO (Real-time Notifications)

#### **Backend Setup:**

**File:** `backend/config/socket.js`
```javascript
import { Server } from 'socket.io'

let io

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: ['http://localhost:5173', 'https://your-frontend.com'],
      credentials: true
    }
  })
  
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id)
    
    // Join user room
    socket.on('join', (userId) => {
      socket.join(`user_${userId}`)
      console.log(`User ${userId} joined room`)
    })
    
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id)
    })
  })
  
  return io
}

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized')
  }
  return io
}

// Emit notification to specific user
export const emitToUser = (userId, event, data) => {
  const io = getIO()
  io.to(`user_${userId}`).emit(event, data)
}

// Emit to all admins
export const emitToAdmins = (event, data) => {
  const io = getIO()
  io.to('admin').emit(event, data)
}
```

**File:** `backend/controller/orderController.js`
```javascript
import { emitToUser, emitToAdmins } from '../config/socket.js'

export const createOrder = async (req, res) => {
  try {
    // ... create order logic ...
    
    // Emit notification to user
    emitToUser(userId, 'order:created', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      message: 'Đơn hàng của bạn đã được tạo thành công'
    })
    
    // Emit notification to admins
    emitToAdmins('order:new', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: user.firstName + ' ' + user.lastName
    })
    
    res.json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
```

#### **Frontend Setup:**

**File:** `frontend/src/components/InitUserSocket.jsx`
```javascript
import { useEffect } from 'react'
import { io } from 'socket.io-client'
import { toast } from 'react-toastify'
import useAuthStore from '@/stores/authStore'
import useNotificationStore from '@/stores/notificationStore'

export default function InitUserSocket() {
  const user = useAuthStore(state => state.user)
  const addNotification = useNotificationStore(state => state.addNotification)
  
  useEffect(() => {
    if (!user) return
    
    const socket = io('http://localhost:5000', {
      transports: ['websocket']
    })
    
    socket.on('connect', () => {
      console.log('Socket connected')
      socket.emit('join', user.id)
    })
    
    // Listen for order created
    socket.on('order:created', (data) => {
      toast.success(data.message)
      addNotification({
        title: 'Đơn hàng mới',
        message: data.message,
        type: 'ORDER_CREATED'
      })
    })
    
    // Listen for order status update
    socket.on('order:status_updated', (data) => {
      toast.info(`Đơn hàng ${data.orderNumber} đã ${data.status}`)
      addNotification({
        title: 'Cập nhật đơn hàng',
        message: `Đơn hàng ${data.orderNumber} đã ${data.status}`,
        type: 'ORDER_STATUS'
      })
    })
    
    return () => {
      socket.disconnect()
    }
  }, [user])
  
  return null
}
```

---

### 6.3. Tích hợp VNPay Payment

Chi tiết đầy đủ xem tại: `LUU_THANH_TOAN_VNPAY_COD_FLOW.md`

**Tóm tắt flow:**
1. User chọn VNPay → Frontend gọi `createOrder()`
2. Backend tạo order với `paymentStatus: PENDING`
3. Frontend gọi `createVNPayPayment(orderId)`
4. Backend tạo payment URL từ VNPay SDK
5. Frontend redirect user đến VNPay
6. User thanh toán trên VNPay
7. VNPay gọi callback (IPN) → Backend cập nhật DB
8. VNPay redirect về frontend → Hiển thị kết quả

---

### 6.4. Tích hợp GHN Shipping

**File:** `backend/services/shipping/ghnService.js`
```javascript
import axios from 'axios'

const GHN_API_URL = 'https://dev-online-gateway.ghn.vn/shiip/public-api'
const GHN_TOKEN = process.env.GHN_TOKEN
const GHN_SHOP_ID = process.env.GHN_SHOP_ID

// Tính phí vận chuyển
export const calculateShippingFee = async ({
  toDistrictId,
  toWardCode,
  weight,
  length,
  width,
  height,
  serviceTypeId = 2
}) => {
  try {
    const response = await axios.post(
      `${GHN_API_URL}/v2/shipping-order/fee`,
      {
        service_type_id: serviceTypeId,
        from_district_id: 1542, // District của shop
        to_district_id: toDistrictId,
        to_ward_code: toWardCode,
        weight,
        length,
        width,
        height,
        insurance_value: 0
      },
      {
        headers: {
          'Token': GHN_TOKEN,
          'ShopId': GHN_SHOP_ID
        }
      }
    )
    
    return {
      success: true,
      fee: response.data.data.total,
      serviceTypeId
    }
  } catch (error) {
    throw new Error('Không thể tính phí vận chuyển')
  }
}

// Lấy danh sách tỉnh/thành
export const getProvinces = async () => {
  const response = await axios.get(
    `${GHN_API_URL}/master-data/province`,
    { headers: { 'Token': GHN_TOKEN } }
  )
  return response.data.data
}

// Lấy danh sách quận/huyện
export const getDistricts = async (provinceId) => {
  const response = await axios.post(
    `${GHN_API_URL}/master-data/district`,
    { province_id: provinceId },
    { headers: { 'Token': GHN_TOKEN } }
  )
  return response.data.data
}

// Lấy danh sách phường/xã
export const getWards = async (districtId) => {
  const response = await axios.post(
    `${GHN_API_URL}/master-data/ward`,
    { district_id: districtId },
    { headers: { 'Token': GHN_TOKEN } }
  )
  return response.data.data
}
```

**Sử dụng trong Order Controller:**
```javascript
import { calculateShippingFee } from '../services/shipping/ghnService.js'

export const createOrder = async (req, res) => {
  // ... get address ...
  
  // Tính phí ship
  const shippingFee = await calculateShippingFee({
    toDistrictId: address.districtId,
    toWardCode: address.wardCode,
    weight: totalWeight,
    length: 30,
    width: 20,
    height: 10
  })
  
  // ... create order with shippingFee.fee ...
}
```

---

## 7. BEST PRACTICES

### 7.1. Backend Best Practices

#### **1. Error Handling:**
```javascript
// ✅ GOOD - Consistent error handling
export const getProduct = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: Number(req.params.id) }
    })
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      })
    }
    
    res.json({ success: true, data: product })
  } catch (error) {
    console.error('Error in getProduct:', error)
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    })
  }
}

// ❌ BAD - No error handling
export const getProduct = async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: Number(req.params.id) }
  })
  res.json(product)
}
```

#### **2. Input Validation:**
```javascript
// ✅ GOOD - Validate with express-validator
import { body, validationResult } from 'express-validator'

export const validateCreateProduct = [
  body('name').trim().notEmpty().withMessage('Tên sản phẩm không được để trống'),
  body('price').isFloat({ min: 0 }).withMessage('Giá phải là số dương'),
  body('categoryId').isInt().withMessage('Category ID không hợp lệ'),
  
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      })
    }
    next()
  }
]
```

#### **3. Database Transactions:**
```javascript
// ✅ GOOD - Use transaction for multiple operations
export const createOrder = async (req, res) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create order
      const order = await tx.order.create({ data: orderData })
      
      // 2. Create order items
      await tx.orderItem.createMany({ data: orderItems })
      
      // 3. Update stock
      for (const item of orderItems) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stockQuantity: { decrement: item.quantity } }
        })
      }
      
      // 4. Clear cart
      await tx.shoppingCart.deleteMany({
        where: { userId, id: { in: cartItemIds } }
      })
      
      return order
    })
    
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
```

#### **4. Authentication:**
```javascript
// middleware/auth.js
import jwt from 'jsonwebtoken'

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập'
      })
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token không hợp lệ'
    })
  }
}

export const isAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Không có quyền truy cập'
    })
  }
  next()
}
```

### 7.2. Frontend Best Practices

#### **1. Custom Hooks:**
```javascript
// ✅ GOOD - Reusable hook
// hooks/useProducts.js
import { useState, useEffect } from 'react'
import { getProducts } from '@/api/products'

export function useProducts(filters = {}) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true)
        const data = await getProducts(filters)
        setProducts(data.data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    loadProducts()
  }, [JSON.stringify(filters)])
  
  return { products, loading, error }
}

// Usage
function ProductList() {
  const { products, loading, error } = useProducts({ categoryId: 1 })
  
  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  
  return (
    <div>
      {products.map(p => <ProductCard key={p.id} product={p} />)}
    </div>
  )
}
```

#### **2. Error Boundary:**
```javascript
// components/ErrorBoundary.jsx
import { Component } from 'react'

class ErrorBoundary extends Component {
  state = { hasError: false }
  
  static getDerivedStateFromError(error) {
    return { hasError: true }
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo)
  }
  
  render() {
    if (this.state.hasError) {
      return <div>Đã có lỗi xảy ra. Vui lòng thử lại.</div>
    }
    
    return this.props.children
  }
}
```

#### **3. Loading States:**
```javascript
// ✅ GOOD - Clear loading states
function ProductDetail() {
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadProduct()
  }, [])
  
  if (loading) {
    return <ProductSkeleton />
  }
  
  if (!product) {
    return <NotFound />
  }
  
  return <ProductView product={product} />
}
```

---

## 8. TROUBLESHOOTING

### 8.1. Common Issues

#### **Issue 1: CORS Error**
```
Error: CORS policy blocked
```

**Solution:**
```javascript
// backend/server.js
app.use(cors({
  origin: ['http://localhost:5173', 'https://your-frontend.com'],
  credentials: true
}))
```

#### **Issue 2: JWT Token Expired**
```
Error: jwt expired
```

**Solution:**
```javascript
// Frontend - Refresh token or redirect to login
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

#### **Issue 3: Database Connection Failed**
```
Error: P1001 - Can't reach database server
```

**Solution:**
```bash
# Check MySQL is running
mysql -u root -p

# Check .env file
DATABASE_URL="mysql://user:password@localhost:3306/database_name"

# Test connection
cd backend && npx prisma db pull
```

#### **Issue 4: Socket.IO Not Connecting**
```
Error: WebSocket connection failed
```

**Solution:**
```javascript
// Frontend - Add fallback transports
const socket = io('http://localhost:5000', {
  transports: ['websocket', 'polling']
})

// Backend - Check CORS
io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    credentials: true
  }
})
```

---

## 📚 TÀI LIỆU THAM KHẢO

### Tài liệu chi tiết các luồng:
- `LUU_THANH_TOAN_VNPAY_COD_FLOW.md` - Luồng thanh toán VNPay & COD
- `LUU_CHECKOUT_ORDER_FLOW.md` - Luồng checkout và đặt hàng
- `LUU_CRUD_CART_FLOW.md` - Luồng quản lý giỏ hàng
- `LUU_ADMIN_ORDER_MANAGEMENT_FLOW.md` - Luồng quản lý đơn hàng (Admin)
- `LUU_ORDER_STATUS_EMAIL_FLOW.md` - Luồng gửi email thông báo
- `LUU_QUEN_MAT_KHAU_FLOW.md` - Luồng quên mật khẩu

### Tài liệu kỹ thuật:
- `DATABASE_PHYSICAL_DESCRIPTION.md` - Mô tả database
- `SOCKET_FLOW_DIAGRAM.md` - Sơ đồ Socket.IO
- `AI_LEGAL_CHATBOT_REPORT.md` - Báo cáo AI Chatbot
- `QUICK_START_PRODUCTION.md` - Hướng dẫn deploy

---

## 🎯 NEXT STEPS

Bạn muốn tôi hướng dẫn chi tiết về chức năng nào?

1. **Tạo chức năng mới** (CRUD, API, UI)
2. **Tích hợp payment gateway** (VNPay, Momo, ...)
3. **Tích hợp shipping** (GHN, GHTK, ...)
4. **Real-time features** (Socket.IO, notifications)
5. **Authentication & Authorization** (JWT, OAuth, roles)
6. **File upload** (Cloudinary, S3)
7. **Email service** (Nodemailer, SendGrid)
8. **Testing** (Jest, React Testing Library)
9. **Deployment** (Docker, Vercel, Railway)
10. **Performance optimization** (Caching, lazy loading)

**Hãy cho tôi biết bạn muốn code chức năng gì, tôi sẽ hướng dẫn chi tiết từng bước!** 🚀
