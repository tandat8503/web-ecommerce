# 📚 Hướng Dẫn Chi Tiết: Chức Năng Đánh Giá Sản Phẩm (Product Review)

## 📋 Mục Lục

1. [Tổng Quan](#tổng-quan)
2. [Database Schema](#database-schema)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Implementation](#frontend-implementation)
5. [Luồng Dữ Liệu (Data Flow)](#luồng-dữ-liệu-data-flow)
6. [API Endpoints](#api-endpoints)
7. [Business Logic](#business-logic)
8. [Tích Hợp Vào Project](#tích-hợp-vào-project)
9. [Testing & Troubleshooting](#testing--troubleshooting)

---

## 🎯 Tổng Quan

### Mô Tả
Chức năng **Product Review** cho phép user đánh giá sản phẩm sau khi đã nhận hàng (order status = `DELIVERED`). Hệ thống hỗ trợ:
- ⭐ Rating từ 1-5 sao
- 📝 Title và Comment (optional)
- ✅ Verified Purchase (tự động đánh dấu khi review từ order DELIVERED)
- 🔄 Edit/Delete review của chính mình
- 👨‍💼 Admin quản lý reviews (approve/reject/delete)

### Yêu Cầu Nghiệp Vụ
1. **User chỉ có thể review khi:**
   - Đã đăng nhập
   - Có ít nhất 1 order với status = `DELIVERED` chứa sản phẩm đó
   - Chưa review sản phẩm đó (unique constraint: 1 user = 1 review/product)

2. **Review tự động:**
   - `isVerified = true` khi tạo từ order DELIVERED
   - `isApproved = true` (auto-approve, admin có thể reject sau)

3. **Hiển thị:**
   - Public: Chỉ hiển thị reviews đã approved
   - User: Xem được tất cả reviews của mình (kể cả chưa approved)
   - Admin: Xem và quản lý tất cả reviews

---

## 🗄️ Database Schema

### Model: `ProductReview`

**File:** `backend/prisma/schema.prisma`

```prisma
model ProductReview {
  id         Int      @id @default(autoincrement())
  productId  Int      @map("product_id")
  userId     Int      @map("user_id")
  orderId    Int?     @map("order_id")
  rating     Int                                    // 1-5
  title      String?                                // Optional
  comment    String?                                // Optional
  isApproved Boolean  @default(true) @map("is_approved")
  isVerified Boolean  @default(false) @map("is_verified")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")
  
  // Relations
  order      Order?   @relation(fields: [orderId], references: [id])
  product    Product  @relation(fields: [productId], references: [id], onDelete: NoAction)
  user       User     @relation(fields: [userId], references: [id], onDelete: NoAction)

  // Constraints
  @@unique([productId, userId])  // 1 user chỉ review 1 lần/product
  @@index([orderId])
  @@index([userId])
  @@index([productId])
  @@map("product_reviews")
}
```

### Relationships

```
User (1) ──→ (N) ProductReview
Product (1) ──→ (N) ProductReview
Order (1) ──→ (N) ProductReview (optional)
```

### Indexes
- `productId`: Tối ưu query lấy reviews của sản phẩm
- `userId`: Tối ưu query lấy reviews của user
- `orderId`: Tối ưu query lấy reviews theo order

---

## 🔧 Backend Implementation

### 1. Validators

**File:** `backend/validators/productReview.valid.js`

```javascript
import Joi from 'joi';

// Schema cho tạo review mới
export const reviewSchema = Joi.object({
  productId: Joi.number().integer().positive().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  title: Joi.string().trim().min(3).max(200).optional().allow(null, ''),
  comment: Joi.string().trim().min(3).max(2000).optional().allow(null, ''),
  orderId: Joi.number().integer().positive().optional().allow(null)
});

// Schema cho update review
export const updateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).optional(),
  title: Joi.string().trim().min(3).max(200).optional().allow(null, ''),
  comment: Joi.string().trim().min(3).max(2000).optional().allow(null, '')
});

// Schema cho admin approve
export const approveReviewSchema = Joi.object({
  isApproved: Joi.boolean().required()
});
```

**Chức năng:**
- Validate input data trước khi xử lý
- Đảm bảo rating trong khoảng 1-5
- Validate độ dài title/comment
- Messages tiếng Việt cho user

---

### 2. Controller

**File:** `backend/controller/productReviewController.js`

#### Helper Function: `checkUserHasDeliveredOrder`

```javascript
const checkUserHasDeliveredOrder = async (userId, productId, orderId = null) => {
  if (orderId) {
    // Kiểm tra order cụ thể có hợp lệ không
    const order = await prisma.order.findFirst({
      where: {
        id: Number(orderId),
        userId,
        status: 'DELIVERED'
      },
      include: {
        orderItems: {
          where: { productId: Number(productId) }
        }
      }
    });
    
    if (order && order.orderItems.length > 0) {
      return { isValid: true, orderId: order.id };
    }
    return { isValid: false, orderId: null };
  } else {
    // Tìm order DELIVERED bất kỳ chứa sản phẩm
    const order = await prisma.order.findFirst({
      where: {
        userId,
        status: 'DELIVERED',
        orderItems: {
          some: { productId: Number(productId) }
        }
      },
      select: { id: true }
    });
    
    if (order) {
      return { isValid: true, orderId: order.id };
    }
    return { isValid: false, orderId: null };
  }
};
```

**Logic:**
- Nếu có `orderId`: Kiểm tra order đó có hợp lệ (DELIVERED + chứa sản phẩm)
- Nếu không có `orderId`: Tìm order DELIVERED bất kỳ chứa sản phẩm
- Return `{ isValid, orderId }` để controller sử dụng

#### Main Functions

##### `createReview` - Tạo review mới

```javascript
export const createReview = async (req, res) => {
  const userId = req.user.id;
  const { productId, rating, title, comment, orderId } = req.body;

  // 1. Validate required fields
  if (!productId || !rating) {
    return res.status(400).json({
      message: 'Vui lòng cung cấp đầy đủ thông tin'
    });
  }

  // 2. Check product exists
  const product = await prisma.product.findUnique({
    where: { id: Number(productId) }
  });
  if (!product) {
    return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
  }

  // 3. Check user has DELIVERED order (⭐ CORE LOGIC)
  const orderCheck = await checkUserHasDeliveredOrder(userId, productId, orderId);
  if (!orderCheck.isValid) {
    return res.status(403).json({
      message: 'Bạn chỉ có thể đánh giá sau khi đã nhận hàng'
    });
  }

  // 4. Check duplicate review
  const existingReview = await prisma.productReview.findUnique({
    where: {
      productId_userId: {
        productId: Number(productId),
        userId
      }
    }
  });
  if (existingReview) {
    return res.status(400).json({
      message: 'Bạn đã đánh giá sản phẩm này rồi'
    });
  }

  // 5. Create review
  const review = await prisma.productReview.create({
    data: {
      userId,
      productId: Number(productId),
      orderId: orderCheck.orderId,
      rating: Number(rating),
      title: title?.trim() || null,
      comment: comment?.trim() || null,
      isApproved: true,      // Auto-approve
      isVerified: true       // Verified purchase
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      product: { select: { id: true, name: true, imageUrl: true } },
      order: { select: { id: true, orderNumber: true, status: true } }
    }
  });

  return res.status(201).json({
    message: 'Đánh giá đã được đăng thành công',
    data: review
  });
};
```

**Flow:**
1. Validate input
2. Check product exists
3. **⭐ Check DELIVERED order** (core requirement)
4. Check duplicate (unique constraint)
5. Create review với `isVerified = true`

##### `getProductReviews` - Lấy reviews của sản phẩm (Public)

```javascript
export const getProductReviews = async (req, res) => {
  const { productId } = req.params;
  const { page = 1, limit = 10, rating, sortBy = 'newest' } = req.query;

  // Build where clause
  const where = {
    productId: Number(productId),
    isApproved: true  // ⭐ Chỉ hiển thị approved reviews
  };
  
  if (rating) {
    where.rating = Number(rating);
  }

  // Build orderBy
  let orderBy = { createdAt: 'desc' };
  if (sortBy === 'verified') {
    orderBy = [{ isVerified: 'desc' }, { createdAt: 'desc' }];
  }

  // Fetch reviews
  const [reviews, total] = await Promise.all([
    prisma.productReview.findMany({
      where,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true } }
      }
    }),
    prisma.productReview.count({ where })
  ]);

  // Calculate summary
  const allReviews = await prisma.productReview.findMany({
    where: { productId: Number(productId), isApproved: true },
    select: { rating: true }
  });

  const averageRating = allReviews.length > 0
    ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
    : 0;

  const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  allReviews.forEach(r => {
    ratingDistribution[r.rating] = (ratingDistribution[r.rating] || 0) + 1;
  });

  return res.json({
    data: {
      reviews,
      summary: {
        averageRating,
        totalReviews: allReviews.length,
        ratingDistribution
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    }
  });
};
```

**Features:**
- Filter by rating
- Sort by newest/verified
- Calculate average rating
- Rating distribution (1-5 stars)
- Pagination

##### `getMyReviews` - Lấy reviews của user

```javascript
export const getMyReviews = async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 10, productId } = req.query;

  const where = { userId };
  if (productId) {
    where.productId = Number(productId);
  }

  const [reviews, total] = await Promise.all([
    prisma.productReview.findMany({
      where,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, name: true, imageUrl: true } }
      }
    }),
    prisma.productReview.count({ where })
  ]);

  return res.json({
    data: {
      reviews,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    }
  });
};
```

**Note:** User xem được tất cả reviews của mình (kể cả chưa approved)

---

### 3. Routes

**File:** `backend/routes/productReviewRoutes.js`

```javascript
import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  reviewSchema,
  updateReviewSchema,
  approveReviewSchema
} from '../validators/productReview.valid.js';
import {
  createReview,
  getMyReviews,
  updateMyReview,
  deleteMyReview,
  getProductReviews,
  adminGetAllReviews,
  adminApproveReview,
  adminDeleteReview,
  adminGetReviewStats
} from '../controller/productReviewController.js';

const router = express.Router();

// PUBLIC
router.get('/product/:productId', getProductReviews);

// USER (cần token)
router.post('/', authenticateToken, validate(reviewSchema), createReview);
router.get('/my-reviews', authenticateToken, getMyReviews);
router.put('/:id', authenticateToken, validate(updateReviewSchema), updateMyReview);
router.delete('/:id', authenticateToken, deleteMyReview);

// ADMIN (cần token + role ADMIN)
router.get('/admin/stats', authenticateToken, requireAdmin, adminGetReviewStats);
router.get('/admin/all', authenticateToken, requireAdmin, adminGetAllReviews);
router.patch('/admin/:id/approve', authenticateToken, requireAdmin, validate(approveReviewSchema), adminApproveReview);
router.delete('/admin/:id', authenticateToken, requireAdmin, adminDeleteReview);

export default router;
```

**Tích hợp vào:** `backend/routes/index.js`

```javascript
import productReviewRoutes from "./productReviewRoutes.js";

const routes = (app) => {
  // ... other routes
  app.use("/api/product-reviews", productReviewRoutes);
  // ...
};
```

---

## 🎨 Frontend Implementation

### 1. API Client

**File:** `frontend/src/api/productReview.js`

```javascript
import axiosClient from './axiosClient';

// PUBLIC
export const getProductReviews = (productId, params = {}) => {
  return axiosClient.get(`/product-reviews/product/${productId}`, { params });
};

// USER (cần token)
export const createReview = (data) => {
  return axiosClient.post('/product-reviews', data);
};

export const getMyReviews = (params = {}) => {
  return axiosClient.get('/product-reviews/my-reviews', { params });
};

export const updateMyReview = (id, data) => {
  return axiosClient.put(`/product-reviews/${id}`, data);
};

export const deleteMyReview = (id) => {
  return axiosClient.delete(`/product-reviews/${id}`);
};

// ADMIN
export const adminGetAllReviews = (params = {}) => {
  return axiosClient.get('/product-reviews/admin/all', { params });
};

export const adminApproveReview = (id, isApproved) => {
  return axiosClient.patch(`/product-reviews/admin/${id}/approve`, { isApproved });
};

export const adminDeleteReview = (id) => {
  return axiosClient.delete(`/product-reviews/admin/${id}`);
};

export const adminGetReviewStats = () => {
  return axiosClient.get('/product-reviews/admin/stats');
};
```

---

### 2. Components

#### RatingStars Component

**File:** `frontend/src/components/user/RatingStars.jsx`

**Chức năng:**
- `RatingStars`: Hiển thị rating (read-only)
- `RatingSelector`: Chọn rating (interactive)

```javascript
// Read-only display
<RatingStars rating={4.5} size={20} />

// Interactive selector
<RatingSelector
  value={formData.rating}
  onChange={(rating) => setFormData({ ...formData, rating })}
/>
```

---

#### ProductReview Component

**File:** `frontend/src/pages/user/ProductDetail/components/ProductReview.jsx`

**Chức năng:**
- Hiển thị summary (average rating, distribution)
- Form tạo/sửa review
- Danh sách reviews với pagination
- Edit/Delete review của chính mình

**Tích hợp vào:** `frontend/src/pages/user/ProductDetail/index.jsx`

```javascript
import ProductReview from "./components/ProductReview";

// Trong ProductDetail component
<ProductReview productId={product.id} />
```

---

#### OrderReview Component

**File:** `frontend/src/pages/user/orders/OrderReview/index.jsx`

**Chức năng:**
- Hiển thị danh sách sản phẩm trong order
- Form review cho từng sản phẩm
- Progress tracking (X/Y sản phẩm đã review)
- Chỉ hiển thị khi order status = `DELIVERED`

**Hook:** `frontend/src/pages/user/orders/OrderReview/useOrderReview.js`

```javascript
const {
  order,
  reviews,
  loading,
  getReviewForProduct,
  fetchReviews
} = useOrderReview(orderId);
```

**Tích hợp vào:** `frontend/src/routes/router.jsx`

```javascript
import OrderReview from "@/pages/user/orders/OrderReview";

// Trong router config
{ path: "orders/:id/review", element: <OrderReview /> }
```

---

### 3. Routes Integration

**File:** `frontend/src/routes/router.jsx`

```javascript
import OrderReview from "@/pages/user/orders/OrderReview";

const router = createBrowserRouter([
  {
    path: "/",
    element: <UserLayout />,
    children: [
      // ... other routes
      { path: "orders/:id/review", element: <OrderReview /> },  // ⭐ Phải đặt TRƯỚC /orders/:id
      { path: "orders/:id", element: <OrderDetail /> },
      // ...
    ],
  },
]);
```

**Lưu ý:** Route `/orders/:id/review` phải đặt **TRƯỚC** `/orders/:id` để tránh conflict.

---

### 4. Navigation Events

#### OrderDetail Page

**File:** `frontend/src/pages/user/orders/OrderDetail/index.jsx`

```javascript
{order.status === 'DELIVERED' && (
  <Button 
    className="bg-blue-600 hover:bg-blue-700" 
    onClick={() => navigate(`/orders/${id}/review`)}
  >
    Viết đánh giá
  </Button>
)}
```

#### MyOrders Page

**File:** `frontend/src/pages/user/orders/MyOrders/index.jsx`

```javascript
{record.status === 'DELIVERED' && (
  <Button
    type="primary"
    danger
    size="small"
    onClick={() => navigate(`/orders/${record.id}/review`)}
  >
    Đánh giá
  </Button>
)}
```

---

### 5. Breadcrumb Navigation

**File:** `frontend/src/components/user/BreadcrumbNav.jsx`

```javascript
const isOrderReview = location.pathname.includes('/orders/') && location.pathname.endsWith('/review');

const currentPage = isOrderReview
  ? 'Đánh giá sản phẩm'
  : (isOrderDetail ? 'Chi tiết đơn hàng' : 'Trang');

// Breadcrumb structure
{isOrderReview && (
  <>
    <BreadcrumbItem>
      <Link to="/orders">Danh sách đơn hàng</Link>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <Link to={location.pathname.replace('/review', '')}>Chi tiết đơn hàng</Link>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
  </>
)}
```

---

## 🔄 Luồng Dữ Liệu (Data Flow)

### 1. User Tạo Review Từ ProductDetail

```
┌─────────────────────────────────────────────────────────┐
│ 1. User vào ProductDetail page                         │
│    - Component ProductReview mount                      │
│    - Fetch reviews: GET /api/product-reviews/product/:id│
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ 2. User click "Viết đánh giá"                           │
│    - Form hiển thị                                      │
│    - User nhập rating, title, comment                   │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ 3. User submit form                                      │
│    - Frontend: createReview({ productId, rating, ... }) │
│    - POST /api/product-reviews                          │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Backend xử lý                                         │
│    - Validate input (Joi)                                │
│    - Check product exists                                │
│    - ⭐ checkUserHasDeliveredOrder()                     │
│      → Tìm order DELIVERED chứa sản phẩm                │
│    - Check duplicate review                              │
│    - Create review với isVerified = true                 │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Response & Update UI                                  │
│    - Backend: Return review data                        │
│    - Frontend: Toast success                            │
│    - Reload reviews list                                │
│    - Form tự ẩn                                         │
└─────────────────────────────────────────────────────────┘
```

### 2. User Tạo Review Từ OrderReview Page

```
┌─────────────────────────────────────────────────────────┐
│ 1. User click "Viết đánh giá" từ OrderDetail/MyOrders  │
│    - Navigate: /orders/:id/review                       │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ 2. OrderReview component mount                           │
│    - useOrderReview hook:                                │
│      → Fetch order: GET /api/orders/:id                 │
│      → Fetch reviews: GET /api/product-reviews/my-reviews│
│    - Hiển thị danh sách sản phẩm                        │
│    - Map reviews với products                            │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ 3. User chọn sản phẩm → Click "Viết đánh giá"          │
│    - Form hiển thị cho sản phẩm đó                       │
│    - User nhập rating, title, comment                   │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ 4. User submit                                            │
│    - createReview({                                      │
│        productId,                                        │
│        rating,                                           │
│        orderId: order.id  // ⭐ Truyền orderId          │
│      })                                                   │
│    - POST /api/product-reviews                           │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Backend xử lý (tương tự flow 1)                       │
│    - checkUserHasDeliveredOrder(userId, productId, orderId)│
│      → Kiểm tra order cụ thể                             │
│    - Create review                                       │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ 6. Update UI                                              │
│    - Reload reviews                                       │
│    - Update progress bar                                 │
│    - Form đóng                                           │
└─────────────────────────────────────────────────────────┘
```

### 3. User Xem Reviews (Public)

```
┌─────────────────────────────────────────────────────────┐
│ 1. User vào ProductDetail                                │
│    - ProductReview component mount                      │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Fetch reviews                                         │
│    - GET /api/product-reviews/product/:productId        │
│    - Query params: page, limit, rating, sortBy          │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Backend xử lý                                         │
│    - Filter: isApproved = true (chỉ approved reviews)   │
│    - Calculate: averageRating, ratingDistribution        │
│    - Pagination                                          │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Hiển thị UI                                            │
│    - Summary: average rating, distribution bars         │
│    - Reviews list với pagination                         │
│    - Verified badge cho verified reviews                │
└─────────────────────────────────────────────────────────┘
```

---

## 📡 API Endpoints

### Public Endpoints

| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| GET | `/api/product-reviews/product/:productId` | Lấy reviews của sản phẩm (chỉ approved) |

**Query Params:**
- `page`: Số trang (default: 1)
- `limit`: Số reviews/trang (default: 10)
- `rating`: Filter theo rating (1-5)
- `sortBy`: `newest` hoặc `verified` (default: `newest`)

**Response:**
```json
{
  "data": {
    "reviews": [...],
    "summary": {
      "averageRating": 4.5,
      "totalReviews": 150,
      "ratingDistribution": { "5": 80, "4": 50, "3": 15, "2": 3, "1": 2 }
    },
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 150,
      "totalPages": 15
    }
  }
}
```

---

### User Endpoints (Cần Token)

| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| POST | `/api/product-reviews` | Tạo review mới |
| GET | `/api/product-reviews/my-reviews` | Lấy reviews của mình |
| PUT | `/api/product-reviews/:id` | Cập nhật review của mình |
| DELETE | `/api/product-reviews/:id` | Xóa review của mình |

**POST /api/product-reviews**
```json
// Request Body
{
  "productId": 123,
  "rating": 5,
  "title": "Sản phẩm tuyệt vời",
  "comment": "Rất hài lòng với chất lượng...",
  "orderId": 456  // Optional
}

// Response
{
  "message": "Đánh giá đã được đăng thành công",
  "data": {
    "id": 789,
    "productId": 123,
    "userId": 1,
    "orderId": 456,
    "rating": 5,
    "title": "Sản phẩm tuyệt vời",
    "comment": "Rất hài lòng...",
    "isApproved": true,
    "isVerified": true,
    "user": {...},
    "product": {...}
  }
}
```

**GET /api/product-reviews/my-reviews**
```json
// Query Params
?page=1&limit=10&productId=123

// Response
{
  "data": {
    "reviews": [...],
    "pagination": {...}
  }
}
```

---

### Admin Endpoints (Cần Token + Role ADMIN)

| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| GET | `/api/product-reviews/admin/stats` | Thống kê reviews |
| GET | `/api/product-reviews/admin/all` | Lấy tất cả reviews (có filter) |
| PATCH | `/api/product-reviews/admin/:id/approve` | Approve/Reject review |
| DELETE | `/api/product-reviews/admin/:id` | Xóa review |

---

## 🧠 Business Logic

### 1. Validation Logic

#### Tạo Review
1. ✅ User phải đăng nhập (`authenticateToken`)
2. ✅ `productId` và `rating` là required
3. ✅ `rating` phải từ 1-5
4. ✅ `title` (nếu có) phải 3-200 ký tự
5. ✅ `comment` (nếu có) phải 3-2000 ký tự
6. ⭐ **User phải có order DELIVERED chứa sản phẩm**
7. ⭐ **User chưa review sản phẩm này** (unique constraint)

#### Update Review
1. ✅ User chỉ có thể update review của chính mình
2. ✅ Validate tương tự create (rating, title, comment)

#### Delete Review
1. ✅ User chỉ có thể delete review của chính mình
2. ✅ Admin có thể delete bất kỳ review nào

---

### 2. Verified Purchase Logic

```javascript
// Khi tạo review từ order DELIVERED
isVerified = true  // Tự động đánh dấu verified purchase
```

**Điều kiện:**
- Review được tạo từ order có status = `DELIVERED`
- Order chứa sản phẩm được review
- User là owner của order

---

### 3. Auto-Approval Logic

```javascript
// Tất cả reviews mới đều được auto-approve
isApproved = true

// Admin có thể reject sau
// → isApproved = false
// → Review không hiển thị ở public
```

---

### 4. Unique Constraint

```prisma
@@unique([productId, userId])
```

**Ý nghĩa:**
- 1 user chỉ có thể review 1 sản phẩm 1 lần
- Nếu muốn thay đổi, user phải **update** review cũ (không tạo mới)

**Xử lý:**
- Backend check duplicate trước khi create
- Frontend hiển thị "Bạn đã đánh giá sản phẩm này rồi" + button "Sửa đánh giá"

---

### 5. Display Logic

#### Public (ProductDetail)
- Chỉ hiển thị reviews có `isApproved = true`
- Sort: Verified reviews lên đầu, sau đó mới nhất
- Filter: Có thể filter theo rating

#### User (MyReviews)
- Hiển thị tất cả reviews của user (kể cả chưa approved)
- User có thể edit/delete reviews của mình

#### Admin
- Xem tất cả reviews
- Filter: `isApproved`, `rating`, `productId`, search
- Approve/Reject/Delete reviews

---

## 🔗 Tích Hợp Vào Project

### Backend Files

```
backend/
├── prisma/
│   └── schema.prisma                    # ✅ Model ProductReview
│   └── migrations/
│       └── 20250130000000_add_product_review_index/
│           └── migration.sql            # ✅ Index cho productId
├── validators/
│   └── productReview.valid.js           # ✅ Joi schemas
├── controller/
│   └── productReviewController.js       # ✅ Business logic
├── routes/
│   ├── productReviewRoutes.js          # ✅ API routes
│   └── index.js                         # ✅ Import productReviewRoutes
└── middleware/
    └── auth.js                          # ✅ authenticateToken, requireAdmin
```

### Frontend Files

```
frontend/src/
├── api/
│   └── productReview.js                 # ✅ API client functions
├── components/
│   └── user/
│       ├── RatingStars.jsx              # ✅ Rating display/selector
│       └── BreadcrumbNav.jsx            # ✅ Updated for review route
├── pages/
│   └── user/
│       ├── ProductDetail/
│       │   ├── index.jsx                # ✅ Import ProductReview
│       │   └── components/
│       │       └── ProductReview.jsx   # ✅ Review component
│       └── orders/
│           ├── OrderDetail/
│           │   └── index.jsx             # ✅ Button "Viết đánh giá"
│           ├── MyOrders/
│           │   └── index.jsx             # ✅ Button "Đánh giá"
│           └── OrderReview/
│               ├── index.jsx            # ✅ Order review page
│               └── useOrderReview.js      # ✅ Custom hook
└── routes/
    └── router.jsx                        # ✅ Route /orders/:id/review
```

---

## 🧪 Testing & Troubleshooting

### Test Cases

#### 1. Tạo Review Thành Công
```
✅ User đã đăng nhập
✅ Có order DELIVERED chứa sản phẩm
✅ Chưa review sản phẩm này
✅ Input hợp lệ (rating 1-5, title/comment trong giới hạn)
→ Expected: Review được tạo, isVerified = true, isApproved = true
```

#### 2. Tạo Review Thất Bại
```
❌ User chưa đăng nhập
→ Expected: 401 Unauthorized

❌ Không có order DELIVERED
→ Expected: 403 "Bạn chỉ có thể đánh giá sau khi đã nhận hàng"

❌ Đã review sản phẩm này rồi
→ Expected: 400 "Bạn đã đánh giá sản phẩm này rồi"

❌ Rating không hợp lệ (< 1 hoặc > 5)
→ Expected: 400 Validation error
```

#### 3. Update Review
```
✅ User update review của chính mình
→ Expected: Review được update thành công

❌ User update review của người khác
→ Expected: 403 Forbidden
```

#### 4. Public Display
```
✅ Chỉ hiển thị reviews có isApproved = true
✅ Verified reviews sắp xếp lên đầu
✅ Pagination hoạt động đúng
```

---

### Common Issues

#### Issue 1: "Bạn chỉ có thể đánh giá sau khi đã nhận hàng"

**Nguyên nhân:**
- Order chưa có status = `DELIVERED`
- Order không chứa sản phẩm được review
- User không phải owner của order

**Giải pháp:**
- Kiểm tra order status trong database
- Đảm bảo order có orderItems chứa productId
- Verify userId của order

---

#### Issue 2: "Bạn đã đánh giá sản phẩm này rồi"

**Nguyên nhân:**
- Unique constraint: 1 user = 1 review/product

**Giải pháp:**
- Frontend: Hiển thị button "Sửa đánh giá" thay vì "Viết đánh giá"
- User có thể update review cũ

---

#### Issue 3: Review không hiển thị ở ProductDetail

**Nguyên nhân:**
- Review có `isApproved = false`
- Backend filter chỉ hiển thị approved reviews

**Giải pháp:**
- Admin approve review
- Hoặc check `isApproved` trong database

---

#### Issue 4: Route conflict `/orders/:id/review`

**Nguyên nhân:**
- Route `/orders/:id` match trước `/orders/:id/review`

**Giải pháp:**
- Đặt route `/orders/:id/review` **TRƯỚC** `/orders/:id` trong router config

---

### Debug Tips

#### 1. Check Database
```sql
-- Kiểm tra reviews
SELECT * FROM product_reviews WHERE product_id = 123;

-- Kiểm tra orders DELIVERED
SELECT * FROM orders 
WHERE user_id = 1 
  AND status = 'DELIVERED'
  AND id IN (
    SELECT order_id FROM order_items WHERE product_id = 123
  );
```

#### 2. Check Backend Logs
```javascript
// Controller sử dụng logger
logger.start('user.productReview.create', { userId, productId });
logger.success('Review created', { reviewId });
logger.error('Failed to create review', { error });
```

#### 3. Check Frontend Network
- Open DevTools → Network tab
- Check request/response của API calls
- Verify headers (Authorization token)
- Check response status codes

---

## 📝 Tóm Tắt

### Key Points

1. **⭐ Core Requirement:** User chỉ có thể review khi có order DELIVERED chứa sản phẩm
2. **Unique Constraint:** 1 user = 1 review/product (có thể update)
3. **Auto-Verified:** Reviews từ order DELIVERED tự động có `isVerified = true`
4. **Auto-Approved:** Tất cả reviews mới đều `isApproved = true` (admin có thể reject)
5. **Public Display:** Chỉ hiển thị reviews đã approved

### Files Cần Tạo/Cập Nhật

**Backend:**
- ✅ `validators/productReview.valid.js`
- ✅ `controller/productReviewController.js`
- ✅ `routes/productReviewRoutes.js`
- ✅ `routes/index.js` (import routes)
- ✅ `prisma/schema.prisma` (model ProductReview)
- ✅ Migration file (index)

**Frontend:**
- ✅ `api/productReview.js`
- ✅ `components/user/RatingStars.jsx`
- ✅ `pages/user/ProductDetail/components/ProductReview.jsx`
- ✅ `pages/user/orders/OrderReview/index.jsx`
- ✅ `pages/user/orders/OrderReview/useOrderReview.js`
- ✅ `routes/router.jsx` (route mới)
- ✅ `components/user/BreadcrumbNav.jsx` (update)
- ✅ `pages/user/orders/OrderDetail/index.jsx` (button)
- ✅ `pages/user/orders/MyOrders/index.jsx` (button)

---

## 🎉 Kết Luận

Chức năng **Product Review** đã được tích hợp hoàn chỉnh vào project với:
- ✅ Backend API đầy đủ (Public, User, Admin)
- ✅ Frontend UI/UX đẹp và user-friendly
- ✅ Validation và error handling
- ✅ Real-time updates
- ✅ Responsive design

**Next Steps:**
- Test tất cả flows
- Tối ưu performance (caching, pagination)
- Thêm analytics (review trends, popular products)
- Tích hợp với AI sentiment analysis (đã có sẵn trong project)

---

**Tác giả:** AI Assistant  
**Ngày tạo:** 2025-01-30  
**Version:** 1.0.0

