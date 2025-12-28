# Coupon System - Hệ Thống Mã Giảm Giá

## 📋 Tổng Quan

Hệ thống mã giảm giá tự động tặng và quản lý:
- **Auto-grant coupons**: Tự động tặng mã khi đăng ký, mua hàng, review
- **Coupon validation**: Kiểm tra điều kiện sử dụng
- **Apply at checkout**: Áp dụng mã khi thanh toán
- **Admin management**: Quản lý mã giảm giá (CRUD)
- **User coupons**: Xem danh sách mã của user

---

## 🗄️ Database Schema

### Coupon Model
```prisma
model Coupon {
  id              Int           @id @default(autoincrement())
  code            String        @unique @db.VarChar(50)
  name            String        @db.VarChar(255)
  description     String?       @db.Text
  
  // Discount Type
  promotionType   PromotionType @map("promotion_type")
  discountType    DiscountType  @map("discount_type")
  discountValue   Decimal       @db.Decimal(10, 2) @map("discount_value")
  
  // Conditions
  minimumAmount   Decimal       @default(0) @db.Decimal(10, 2) @map("minimum_amount")
  maximumDiscount Decimal?      @db.Decimal(10, 2) @map("maximum_discount")
  applyToShipping Boolean       @default(false) @map("apply_to_shipping")
  
  // Usage Limits
  usageLimit      Int           @default(1000) @map("usage_limit")
  usageLimitPerUser Int         @default(1) @map("usage_limit_per_user")
  usedCount       Int           @default(0) @map("used_count")
  
  // Validity Period
  startDate       DateTime      @map("start_date")
  endDate         DateTime      @map("end_date")
  isActive        Boolean       @default(true) @map("is_active")
  
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")
  
  // Relations
  userCoupons     UserCoupon[]
  couponUsages    CouponUsage[]
  
  @@map("coupons")
  @@index([code])
  @@index([promotionType])
}

model UserCoupon {
  id        Int      @id @default(autoincrement())
  userId    Int      @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  couponId  Int      @map("coupon_id")
  coupon    Coupon   @relation(fields: [couponId], references: [id], onDelete: Cascade)
  
  isUsed    Boolean  @default(false) @map("is_used")
  usedAt    DateTime? @map("used_at")
  expiresAt DateTime  @map("expires_at")
  
  createdAt DateTime @default(now()) @map("created_at")
  
  @@unique([userId, couponId])
  @@map("user_coupons")
  @@index([userId])
}

model CouponUsage {
  id        Int      @id @default(autoincrement())
  userId    Int      @map("user_id")
  user      User     @relation(fields: [userId], references: [id])
  
  couponId  Int      @map("coupon_id")
  coupon    Coupon   @relation(fields: [couponId], references: [id])
  
  orderId   Int      @map("order_id")
  order     Order    @relation(fields: [orderId], references: [id])
  
  createdAt DateTime @default(now()) @map("created_at")
  
  @@map("coupon_usages")
  @@index([userId])
  @@index([couponId])
}

enum PromotionType {
  GENERAL       // Mã chung
  FIRST_ORDER   // Mã đơn đầu tiên
  FIRST_REVIEW  // Mã review đầu tiên
  SHIPPING      // Mã miễn phí ship
  SEASONAL      // Mã theo mùa
}

enum DiscountType {
  AMOUNT        // Giảm theo số tiền
  PERCENT       // Giảm theo %
}
```

---

## 🔧 Backend Implementation

### 1. Service: `services/couponService.js`

#### Grant Welcome Coupon
```javascript
export const grantWelcomeCoupon = async (userId) => {
  try {
    // Tìm coupon WELCOME
    const welcomeCoupon = await prisma.coupon.findFirst({
      where: {
        code: 'WELCOME200K',
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    });

    if (!welcomeCoupon) {
      logger.warn('Welcome coupon not found');
      return null;
    }

    // Check if user already has this coupon
    const existingUserCoupon = await prisma.userCoupon.findUnique({
      where: {
        userId_couponId: {
          userId,
          couponId: welcomeCoupon.id
        }
      }
    });

    if (existingUserCoupon) {
      return null; // Already granted
    }

    // Grant coupon to user
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    const userCoupon = await prisma.userCoupon.create({
      data: {
        userId,
        couponId: welcomeCoupon.id,
        expiresAt
      },
      include: { coupon: true }
    });

    logger.info('Welcome coupon granted', { userId, couponId: welcomeCoupon.id });
    return userCoupon;
  } catch (error) {
    logger.error('Failed to grant welcome coupon', { userId, error: error.message });
    return null;
  }
};
```

#### Grant First Order Coupon
```javascript
export const grantFirstOrderCoupon = async (userId) => {
  try {
    // Check if this is first order
    const orderCount = await prisma.order.count({
      where: { userId, status: { not: 'CANCELLED' } }
    });

    if (orderCount > 0) {
      return null; // Not first order
    }

    // Find FIRST_ORDER coupon
    const firstOrderCoupon = await prisma.coupon.findFirst({
      where: {
        promotionType: 'FIRST_ORDER',
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    });

    if (!firstOrderCoupon) {
      logger.warn('First order coupon not found');
      return null;
    }

    // Check if already granted
    const existingUserCoupon = await prisma.userCoupon.findUnique({
      where: {
        userId_couponId: {
          userId,
          couponId: firstOrderCoupon.id
        }
      }
    });

    if (existingUserCoupon) {
      return null;
    }

    // Grant coupon
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const userCoupon = await prisma.userCoupon.create({
      data: {
        userId,
        couponId: firstOrderCoupon.id,
        expiresAt
      },
      include: { coupon: true }
    });

    logger.info('First order coupon granted', { userId, couponId: firstOrderCoupon.id });
    return userCoupon;
  } catch (error) {
    logger.error('Failed to grant first order coupon', { userId, error: error.message });
    return null;
  }
};
```

#### Grant First Review Coupon
```javascript
export const grantFirstReviewCoupon = async (userId) => {
  try {
    // Check if this is first review
    const reviewCount = await prisma.productReview.count({
      where: { userId }
    });

    if (reviewCount > 1) {
      return null; // Not first review
    }

    // Find FIRST_REVIEW coupon
    const firstReviewCoupon = await prisma.coupon.findFirst({
      where: {
        promotionType: 'FIRST_REVIEW',
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    });

    if (!firstReviewCoupon) {
      logger.warn('First review coupon not found');
      return null;
    }

    // Check if already granted
    const existingUserCoupon = await prisma.userCoupon.findUnique({
      where: {
        userId_couponId: {
          userId,
          couponId: firstReviewCoupon.id
        }
      }
    });

    if (existingUserCoupon) {
      return null;
    }

    // Grant coupon
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const userCoupon = await prisma.userCoupon.create({
      data: {
        userId,
        couponId: firstReviewCoupon.id,
        expiresAt
      },
      include: { coupon: true }
    });

    logger.info('First review coupon granted', { userId, couponId: firstReviewCoupon.id });
    return userCoupon;
  } catch (error) {
    logger.error('Failed to grant first review coupon', { userId, error: error.message });
    return null;
  }
};
```

#### Validate and Apply Coupon
```javascript
export const validateAndApplyCoupon = async (userId, couponCode, subtotal, shippingFee) => {
  try {
    // Find coupon
    const coupon = await prisma.coupon.findUnique({
      where: { code: couponCode }
    });

    if (!coupon) {
      return { success: false, message: 'Mã giảm giá không tồn tại' };
    }

    // Check active
    if (!coupon.isActive) {
      return { success: false, message: 'Mã giảm giá đã bị vô hiệu hóa' };
    }

    // Check validity period
    const now = new Date();
    if (now < coupon.startDate || now > coupon.endDate) {
      return { success: false, message: 'Mã giảm giá đã hết hạn' };
    }

    // Check usage limit
    if (coupon.usedCount >= coupon.usageLimit) {
      return { success: false, message: 'Mã giảm giá đã hết lượt sử dụng' };
    }

    // Check user has this coupon
    const userCoupon = await prisma.userCoupon.findUnique({
      where: {
        userId_couponId: {
          userId,
          couponId: coupon.id
        }
      }
    });

    if (!userCoupon) {
      return { success: false, message: 'Bạn chưa sở hữu mã giảm giá này' };
    }

    // Check if already used
    if (userCoupon.isUsed) {
      return { success: false, message: 'Mã giảm giá đã được sử dụng' };
    }

    // Check expiration
    if (now > userCoupon.expiresAt) {
      return { success: false, message: 'Mã giảm giá của bạn đã hết hạn' };
    }

    // Check user usage count
    const userUsageCount = await prisma.couponUsage.count({
      where: { userId, couponId: coupon.id }
    });

    if (userUsageCount >= coupon.usageLimitPerUser) {
      return { success: false, message: 'Bạn đã sử dụng hết số lần cho phép' };
    }

    // Check minimum amount
    if (subtotal < Number(coupon.minimumAmount)) {
      return {
        success: false,
        message: `Đơn hàng tối thiểu ${Number(coupon.minimumAmount).toLocaleString('vi-VN')}đ`
      };
    }

    // Calculate discount
    let discountAmount = 0;
    let discountShipping = 0;

    if (coupon.applyToShipping) {
      // Discount on shipping
      if (coupon.discountType === 'AMOUNT') {
        discountShipping = Math.min(Number(coupon.discountValue), shippingFee);
      } else if (coupon.discountType === 'PERCENT') {
        discountShipping = Math.min(
          (shippingFee * Number(coupon.discountValue)) / 100,
          shippingFee
        );
      }
    } else {
      // Discount on order
      if (coupon.discountType === 'AMOUNT') {
        discountAmount = Number(coupon.discountValue);
      } else if (coupon.discountType === 'PERCENT') {
        discountAmount = (subtotal * Number(coupon.discountValue)) / 100;
        
        // Apply maximum discount if set
        if (coupon.maximumDiscount) {
          discountAmount = Math.min(discountAmount, Number(coupon.maximumDiscount));
        }
      }
    }

    return {
      success: true,
      coupon,
      userCoupon,
      discountAmount,
      discountShipping,
      totalDiscount: discountAmount + discountShipping
    };
  } catch (error) {
    logger.error('Failed to validate coupon', { userId, couponCode, error: error.message });
    return { success: false, message: 'Lỗi khi kiểm tra mã giảm giá' };
  }
};
```

#### Mark Coupon as Used
```javascript
export const markCouponAsUsed = async (userId, couponId, orderId) => {
  try {
    await prisma.$transaction(async (tx) => {
      // Update UserCoupon
      await tx.userCoupon.update({
        where: {
          userId_couponId: {
            userId,
            couponId
          }
        },
        data: {
          isUsed: true,
          usedAt: new Date()
        }
      });

      // Increment usedCount
      await tx.coupon.update({
        where: { id: couponId },
        data: {
          usedCount: { increment: 1 }
        }
      });

      // Create CouponUsage record
      await tx.couponUsage.create({
        data: {
          userId,
          couponId,
          orderId
        }
      });
    });

    logger.info('Coupon marked as used', { userId, couponId, orderId });
  } catch (error) {
    logger.error('Failed to mark coupon as used', { userId, couponId, orderId, error: error.message });
    throw error;
  }
};
```

### 2. Controller: `controller/couponController.js`

#### Get User Coupons
```javascript
export const getUserCoupons = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query; // available, used, expired

    const where = { userId };
    const now = new Date();

    if (status === 'available') {
      where.isUsed = false;
      where.expiresAt = { gte: now };
    } else if (status === 'used') {
      where.isUsed = true;
    } else if (status === 'expired') {
      where.isUsed = false;
      where.expiresAt = { lt: now };
    }

    const userCoupons = await prisma.userCoupon.findMany({
      where,
      include: {
        coupon: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      success: true,
      data: userCoupons
    });
  } catch (error) {
    logger.error('Get user coupons error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách mã giảm giá'
    });
  }
};
```

#### Validate Coupon
```javascript
export const validateCoupon = async (req, res) => {
  try {
    const userId = req.user.id;
    const { couponCode, subtotal, shippingFee } = req.body;

    const result = await validateAndApplyCoupon(
      userId,
      couponCode,
      Number(subtotal),
      Number(shippingFee)
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    return res.json({
      success: true,
      data: {
        code: result.coupon.code,
        name: result.coupon.name,
        discountAmount: result.discountAmount,
        discountShipping: result.discountShipping,
        totalDiscount: result.totalDiscount,
        applyToShipping: result.coupon.applyToShipping
      }
    });
  } catch (error) {
    logger.error('Validate coupon error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi kiểm tra mã giảm giá'
    });
  }
};
```

### 3. Admin Controller: `controller/adminCouponManagementController.js`

#### Create Coupon
```javascript
export const createCoupon = async (req, res) => {
  try {
    const {
      code,
      name,
      description,
      promotionType,
      discountType,
      discountValue,
      minimumAmount,
      maximumDiscount,
      applyToShipping,
      usageLimit,
      usageLimitPerUser,
      startDate,
      endDate,
      isActive
    } = req.body;

    // Validate required fields
    if (!code || !name || !promotionType || !discountType || !discountValue) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc'
      });
    }

    // Check code exists
    const existingCoupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (existingCoupon) {
      return res.status(409).json({
        success: false,
        message: 'Mã giảm giá đã tồn tại'
      });
    }

    // Create coupon
    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        name,
        description,
        promotionType,
        discountType,
        discountValue: Number(discountValue),
        minimumAmount: minimumAmount ? Number(minimumAmount) : 0,
        maximumDiscount: maximumDiscount ? Number(maximumDiscount) : null,
        applyToShipping: applyToShipping || false,
        usageLimit: usageLimit || 1000,
        usageLimitPerUser: usageLimitPerUser || 1,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: isActive !== undefined ? isActive : true
      }
    });

    logger.info('Coupon created', { couponId: coupon.id, code: coupon.code });

    return res.status(201).json({
      success: true,
      message: 'Tạo mã giảm giá thành công',
      data: coupon
    });
  } catch (error) {
    logger.error('Create coupon error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo mã giảm giá'
    });
  }
};
```

### 4. Routes: `routes/couponRoutes.js`

```javascript
import express from 'express';
import {
  getUserCoupons,
  validateCoupon
} from '../controller/couponController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/my-coupons', getUserCoupons);
router.post('/validate', validateCoupon);

export default router;
```

---

## 🎨 Frontend Implementation

### 1. API Service: `src/api/coupons.js`

```javascript
import axiosClient from './axiosClient';

export const getUserCoupons = (params) => {
  return axiosClient.get('/coupons/my-coupons', { params });
};

export const validateCoupon = (data) => {
  return axiosClient.post('/coupons/validate', data);
};
```

### 2. Coupon Selection in Checkout

```jsx
// In useCheckout.js
const [userCoupons, setUserCoupons] = useState([]);
const [selectedCoupon, setSelectedCoupon] = useState(null);

// Fetch user coupons
useEffect(() => {
  const fetchCoupons = async () => {
    try {
      const response = await getUserCoupons({ status: 'available' });
      setUserCoupons(response.data.data);
    } catch (error) {
      console.error('Failed to fetch coupons');
    }
  };
  fetchCoupons();
}, []);

// Apply coupon
const handleApplyCoupon = async (couponCode) => {
  try {
    const response = await validateCoupon({
      couponCode,
      subtotal: summary.subtotal,
      shippingFee: summary.shippingFee
    });

    if (response.data.success) {
      setSelectedCoupon(response.data.data);
      toast.success('Áp dụng mã giảm giá thành công');
    }
  } catch (error) {
    toast.error(error.response?.data?.message || 'Mã không hợp lệ');
  }
};
```

### 3. Coupon List Component

```jsx
export default function CouponList() {
  const [coupons, setCoupons] = useState([]);
  const [filter, setFilter] = useState('available');

  useEffect(() => {
    const fetchCoupons = async () => {
      const response = await getUserCoupons({ status: filter });
      setCoupons(response.data.data);
    };
    fetchCoupons();
  }, [filter]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Mã Giảm Giá Của Tôi</h1>
      
      {/* Filter Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setFilter('available')}
          className={filter === 'available' ? 'font-bold' : ''}
        >
          Có thể sử dụng
        </button>
        <button
          onClick={() => setFilter('used')}
          className={filter === 'used' ? 'font-bold' : ''}
        >
          Đã sử dụng
        </button>
        <button
          onClick={() => setFilter('expired')}
          className={filter === 'expired' ? 'font-bold' : ''}
        >
          Đã hết hạn
        </button>
      </div>

      {/* Coupon Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map((userCoupon) => (
          <div key={userCoupon.id} className="border rounded p-4">
            <div className="text-2xl font-bold text-orange-600 mb-2">
              {userCoupon.coupon.code}
            </div>
            <div className="font-semibold mb-2">{userCoupon.coupon.name}</div>
            <div className="text-sm text-gray-600 mb-2">
              {userCoupon.coupon.description}
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Hết hạn:</span>{' '}
              {new Date(userCoupon.expiresAt).toLocaleDateString('vi-VN')}
            </div>
            {userCoupon.isUsed && (
              <div className="mt-2 text-sm text-green-600">✓ Đã sử dụng</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🧪 Testing

### Test Validate Coupon
```bash
curl -X POST http://localhost:5000/api/coupons/validate \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "couponCode": "WELCOME200K",
    "subtotal": 3000000,
    "shippingFee": 30000
  }'
```

---

## 🚀 Flow Diagram

```
Auto-Grant Coupon Flow:
1. User đăng ký → grantWelcomeCoupon()
2. User mua đơn đầu → grantFirstOrderCoupon()
3. User review đầu → grantFirstReviewCoupon()
4. Create UserCoupon record
5. Set expiresAt = now + 30 days
6. Create notification

Apply Coupon at Checkout:
1. User chọn coupon từ dropdown
2. POST /coupons/validate
3. Backend validate:
   - Coupon exists & active?
   - User owns coupon?
   - Not used yet?
   - Not expired?
   - Minimum amount met?
4. Calculate discount
5. Return discount amount
6. Frontend update summary
7. User place order
8. markCouponAsUsed()
```

---

## 📝 Seed Data

### Script: `scripts/seed_coupons.js`

```javascript
import prisma from '../config/prisma.js';

async function seedCoupons() {
  const now = new Date();
  const oneYearLater = new Date();
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

  // Welcome Coupon
  await prisma.coupon.create({
    data: {
      code: 'WELCOME200K',
      name: 'Chào mừng khách hàng mới',
      description: 'Giảm 200.000đ cho đơn hàng từ 2 triệu',
      promotionType: 'GENERAL',
      discountType: 'AMOUNT',
      discountValue: 200000,
      minimumAmount: 2000000,
      usageLimit: 10000,
      usageLimitPerUser: 1,
      startDate: now,
      endDate: oneYearLater,
      isActive: true
    }
  });

  // First Order Coupon
  await prisma.coupon.create({
    data: {
      code: 'FIRST300K',
      name: 'Giảm 300k cho đơn hàng đầu tiên',
      description: 'Tặng mã 300k sau khi hoàn thành đơn đầu',
      promotionType: 'FIRST_ORDER',
      discountType: 'AMOUNT',
      discountValue: 300000,
      minimumAmount: 500000,
      usageLimit: 10000,
      usageLimitPerUser: 1,
      startDate: now,
      endDate: oneYearLater,
      isActive: true
    }
  });

  // First Review Coupon
  await prisma.coupon.create({
    data: {
      code: 'REVIEW100K',
      name: 'Giảm 100k khi đánh giá sản phẩm',
      description: 'Tặng mã 100k sau review đầu tiên',
      promotionType: 'FIRST_REVIEW',
      discountType: 'AMOUNT',
      discountValue: 100000,
      minimumAmount: 200000,
      usageLimit: 10000,
      usageLimitPerUser: 1,
      startDate: now,
      endDate: oneYearLater,
      isActive: true
    }
  });

  // Free Shipping
  await prisma.coupon.create({
    data: {
      code: 'FREESHIP30K',
      name: 'Miễn phí vận chuyển',
      description: 'Giảm 30k phí vận chuyển',
      promotionType: 'SHIPPING',
      discountType: 'AMOUNT',
      discountValue: 30000,
      minimumAmount: 0,
      applyToShipping: true,
      usageLimit: 10000,
      usageLimitPerUser: 5,
      startDate: now,
      endDate: oneYearLater,
      isActive: true
    }
  });

  console.log('✅ Coupons seeded successfully');
}

seedCoupons();
```

---

## ✅ Checklist

- [x] Auto-grant welcome coupon (đăng ký)
- [x] Auto-grant first order coupon (sau đơn đầu)
- [x] Auto-grant first review coupon (sau review đầu)
- [x] Coupon validation (full conditions)
- [x] Apply coupon at checkout
- [x] Mark coupon as used
- [x] User coupon list (available/used/expired)
- [x] Admin coupon CRUD
- [x] Discount calculation (amount/percent)
- [x] Apply to shipping option
- [x] Minimum amount check
- [x] Maximum discount limit
- [x] Usage limit (total & per user)
- [x] Expiration handling
- [x] Notifications
