# 🎯 FLOW MARKETING - TỪ TẠO MÃ ĐẾN USER SỬ DỤNG

## 📋 FLOW HIỆN TẠI

### Bước 1: Admin Tạo Mã Mới

**Trang Admin**: `/admin/coupons` hoặc `/admin/coupon-management`

```
Admin tạo mã mới:
- Code: NEWYEAR2025
- Name: Giảm 20% Tết Nguyên Đán
- Discount: 20%
- Minimum: 500,000đ
- Usage Limit: 1000 lượt
- Per User: 3 lần
- Start: 2025-01-01
- End: 2025-01-31
```

**Kết quả**: Mã được lưu vào database (bảng `coupons`)

---

### Bước 2: ❓ User Biết Mã Như Thế Nào?

Đây là vấn đề! Hiện tại có **3 cách**:

#### Cách 1: Marketing Channels (Phổ biến nhất)
```
Admin tạo mã → Share qua:
├─ 📧 Email Marketing
│  └─ "Chúc mừng năm mới! Dùng mã NEWYEAR2025 giảm 20%"
├─ 📱 SMS
│  └─ "Mã giảm giá NEWYEAR2025 - Giảm 20% đơn từ 500k"
├─ 📢 Social Media (Facebook, Zalo, Instagram)
│  └─ Post ảnh banner với mã NEWYEAR2025
├─ 🎯 Website Banner
│  └─ Popup/Banner trên homepage
└─ 🔔 Push Notification
   └─ "Mã mới: NEWYEAR2025 - Giảm 20%!"
```

**User journey**:
```
1. User nhận email/SMS/thấy banner
2. User nhớ mã: NEWYEAR2025
3. User vào checkout
4. User NHẬP MÃ vào ô input
5. System validate → Apply discount
```

**⚠️ Vấn đề**: 
- Frontend CHƯA CÓ ô input để nhập mã
- Chỉ có dropdown (mà dropdown trống vì không có UserCoupon)

---

#### Cách 2: Hiển Thị Trong App (Tốt hơn)

**Tạo trang "Khuyến Mãi"**: `/promotions` hoặc `/coupons`

```jsx
// Frontend: Promotions Page
<div className="promotions-page">
  <h1>Mã Giảm Giá Đang Có</h1>
  
  {publicCoupons.map(coupon => (
    <div className="coupon-card">
      <div className="coupon-code">{coupon.code}</div>
      <div className="coupon-name">{coupon.name}</div>
      <div className="coupon-discount">
        Giảm {coupon.discountType === 'PERCENT' 
          ? `${coupon.discountValue}%` 
          : formatPrice(coupon.discountValue)}
      </div>
      <div className="coupon-condition">
        Đơn tối thiểu: {formatPrice(coupon.minimumAmount)}
      </div>
      <Button onClick={() => copyCouponCode(coupon.code)}>
        Copy Mã
      </Button>
    </div>
  ))}
</div>
```

**User journey**:
```
1. User vào /promotions
2. User thấy mã NEWYEAR2025
3. User click "Copy Mã"
4. User vào checkout
5. User paste mã vào ô input
6. System validate → Apply discount
```

---

#### Cách 3: Auto-Show Trong Checkout (Tốt nhất)

**Hiển thị tất cả mã available trong dropdown**

```jsx
// Frontend: Checkout
<Select placeholder="Chọn mã giảm giá">
  {/* User's coupons */}
  <Select.OptGroup label="Mã của bạn">
    {userOwnedCoupons.map(coupon => (
      <Select.Option value={coupon.code}>
        {coupon.code} - {coupon.name}
      </Select.Option>
    ))}
  </Select.OptGroup>
  
  {/* Public coupons */}
  <Select.OptGroup label="Mã công khai">
    {publicCoupons.map(coupon => (
      <Select.Option value={coupon.code}>
        {coupon.code} - {coupon.name}
      </Select.Option>
    ))}
  </Select.OptGroup>
</Select>
```

**User journey**:
```
1. User vào checkout
2. User mở dropdown
3. User THẤY NGAY mã NEWYEAR2025
4. User chọn mã
5. System validate → Apply discount
```

---

## 🎯 GIẢI PHÁP ĐỀ XUẤT

### Giải Pháp Ngắn Hạn (1-2 giờ)

**Thêm ô input nhập mã trong Checkout**

```jsx
// File: frontend/src/pages/user/checkout/Checkout.jsx

{/* Thêm section này */}
<Card>
  <CardHeader>
    <CardTitle>Mã Giảm Giá</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-3">
      {/* Input nhập mã */}
      <div className="flex gap-2">
        <Input
          placeholder="Nhập mã giảm giá (VD: NEWYEAR2025)"
          value={manualCouponCode}
          onChange={(e) => setManualCouponCode(e.target.value.toUpperCase())}
          disabled={validatingCoupon || appliedCoupon}
        />
        <Button 
          onClick={() => handleApplyCoupon(manualCouponCode)}
          loading={validatingCoupon}
          disabled={!manualCouponCode || appliedCoupon}
        >
          Áp dụng
        </Button>
      </div>

      {/* Hiển thị mã đã apply */}
      {appliedCoupon && (
        <div className="bg-green-50 border border-green-200 rounded p-3">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-semibold text-green-700">
                {appliedCoupon.code}
              </div>
              <div className="text-sm text-green-600">
                Giảm {formatPrice(appliedCoupon.totalDiscount)}
              </div>
            </div>
            <Button 
              size="small" 
              danger 
              onClick={handleRemoveCoupon}
            >
              Xóa
            </Button>
          </div>
        </div>
      )}

      {/* Error message */}
      {couponError && (
        <div className="text-sm text-red-600">{couponError}</div>
      )}
    </div>
  </CardContent>
</Card>
```

**Kết quả**:
- ✅ User có thể nhập mã
- ✅ Admin share mã qua email/SMS/social
- ✅ User copy-paste vào ô input
- ✅ Hoạt động ngay

---

### Giải Pháp Dài Hạn (1 tuần)

#### 1. Tạo Trang Khuyến Mãi

**File**: `frontend/src/pages/user/promotions/Promotions.jsx`

```jsx
import { useState, useEffect } from 'react';
import { Card, Button, message } from 'antd';
import { getPublicCoupons } from '@/api/coupons';
import { Copy, Gift } from 'lucide-react';

export default function Promotions() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicCoupons();
  }, []);

  const fetchPublicCoupons = async () => {
    try {
      setLoading(true);
      const response = await getPublicCoupons();
      setCoupons(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyCouponCode = (code) => {
    navigator.clipboard.writeText(code);
    message.success(`Đã copy mã ${code}`);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mã Giảm Giá</h1>
        <p className="text-gray-600">
          Sử dụng các mã giảm giá dưới đây khi thanh toán để nhận ưu đãi
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20">Đang tải...</div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-20">
          <Gift size={64} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600">Chưa có mã giảm giá nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coupons.map((coupon) => (
            <Card
              key={coupon.id}
              className="hover:shadow-lg transition-shadow"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white p-4 -m-6 mb-4 rounded-t-lg">
                <div className="text-2xl font-bold mb-1">
                  {coupon.discountType === 'PERCENT'
                    ? `${coupon.discountValue}%`
                    : formatPrice(coupon.discountValue)}
                </div>
                <div className="text-sm opacity-90">{coupon.name}</div>
              </div>

              {/* Body */}
              <div className="space-y-3">
                {/* Code */}
                <div className="bg-gray-100 p-3 rounded flex justify-between items-center">
                  <code className="font-mono font-bold text-lg text-orange-600">
                    {coupon.code}
                  </code>
                  <Button
                    icon={<Copy size={16} />}
                    onClick={() => copyCouponCode(coupon.code)}
                  >
                    Copy
                  </Button>
                </div>

                {/* Description */}
                <div className="text-sm text-gray-600">
                  {coupon.description}
                </div>

                {/* Conditions */}
                <div className="space-y-1 text-sm">
                  {coupon.minimumAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Đơn tối thiểu:</span>
                      <span className="font-semibold">
                        {formatPrice(coupon.minimumAmount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Còn lại:</span>
                    <span className="font-semibold">
                      {coupon.usageLimit - coupon.usedCount} lượt
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Hết hạn:</span>
                    <span className="font-semibold">
                      {new Date(coupon.endDate).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </div>

                {/* Action */}
                <Button
                  type="primary"
                  block
                  onClick={() => {
                    copyCouponCode(coupon.code);
                    // Redirect to checkout
                    window.location.href = '/checkout';
                  }}
                >
                  Dùng Ngay
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

#### 2. Thêm API Backend

**File**: `backend/controller/couponController.js`

```javascript
/**
 * Get public coupons
 * GET /api/coupons/public
 */
export const getPublicCoupons = async (req, res) => {
  try {
    const now = new Date();

    const publicCoupons = await prisma.coupon.findMany({
      where: {
        promotionType: { in: ['GENERAL', 'SHIPPING', 'SEASONAL'] },
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
        usedCount: { lt: prisma.raw('usage_limit') }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      success: true,
      data: publicCoupons
    });
  } catch (error) {
    logger.error('Get public coupons error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách mã giảm giá'
    });
  }
};
```

**File**: `backend/routes/couponRoutes.js`

```javascript
import express from 'express';
import {
  getUserCoupons,
  validateCoupon,
  getPublicCoupons  // ← Thêm
} from '../controller/couponController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public route - Không cần authenticate
router.get('/public', getPublicCoupons);

// Protected routes
router.use(authenticate);
router.get('/my-coupons', getUserCoupons);
router.post('/validate', validateCoupon);

export default router;
```

#### 3. Thêm Link Vào Menu

**File**: `frontend/src/layout/user/UserHeader.jsx`

```jsx
// Thêm vào navigation
<Link to="/promotions" className="nav-link">
  <Gift size={20} />
  <span>Khuyến Mãi</span>
</Link>
```

#### 4. Thêm Route

**File**: `frontend/src/routes/router.jsx`

```jsx
import Promotions from '@/pages/user/promotions/Promotions';

// Thêm vào routes
{
  path: "/",
  element: <UserLayout />,
  children: [
    // ... existing routes
    { path: "promotions", element: <Promotions /> },
  ]
}
```

---

## 🎯 FLOW HOÀN CHỈNH

### Flow Marketing Campaign

```
1. Admin tạo mã NEWYEAR2025 trên /admin/coupons
   ↓
2. Admin share mã qua:
   - Email: "Mã NEWYEAR2025 giảm 20%"
   - Facebook: Post banner với mã
   - SMS: "Dùng NEWYEAR2025 giảm 20%"
   ↓
3. User nhận thông tin
   ↓
4. User vào website:
   
   Option A: Vào /promotions
   - Thấy tất cả mã available
   - Click "Copy" mã NEWYEAR2025
   - Click "Dùng Ngay" → Redirect checkout
   - Paste mã vào ô input
   
   Option B: Vào checkout trực tiếp
   - Nhập mã NEWYEAR2025 vào ô input
   - Click "Áp dụng"
   ↓
5. System validate mã
   ↓
6. Apply discount
   ↓
7. User đặt hàng thành công
```

---

## 📝 TÓM TẮT

### Hiện Tại
❌ Admin tạo mã → User KHÔNG BIẾT → Không dùng được

### Sau Khi Fix (Ngắn Hạn)
✅ Admin tạo mã → Share qua email/SMS → User nhập vào ô input → Dùng được

### Sau Khi Fix (Dài Hạn)
✅ Admin tạo mã → User vào /promotions → Thấy và copy mã → Dùng được
✅ Admin tạo mã → Share marketing → User nhập checkout → Dùng được

---

**Created**: 2025-12-29
**Status**: 📋 **READY TO IMPLEMENT**
