# 🎟️ CƠ CHẾ COUPON HIỆN TẠI - VẤN ĐỀ & GIẢI PHÁP

## ❓ VẤN ĐỀ HIỆN TẠI

### Cơ Chế Hiện Tại (Có Vấn Đề)

Hệ thống coupon hiện tại có **2 loại coupon**:

#### 1. Auto-Grant Coupons (Tự động tặng)
**Ví dụ**: WELCOME200K

**Cơ chế**:
```
1. Admin tạo coupon WELCOME200K trong bảng `coupons`
2. User đăng ký
3. Backend tự động tạo record trong `user_coupons`:
   - userId = user mới
   - couponId = WELCOME200K
   - expiresAt = now + 30 days
4. User có mã trong /my-coupons
5. User có thể dùng mã
```

**✅ Hoạt động tốt**: User tự động nhận mã khi đăng ký

---

#### 2. Public Coupons (Mã công khai)
**Ví dụ**: FREESHIP30K, SUMMER15

**Cơ chế HIỆN TẠI (CÓ VẤN ĐỀ)**:
```
1. Admin tạo coupon FREESHIP30K trong bảng `coupons`
2. User vào checkout
3. User chọn mã từ dropdown
4. ❌ DROPDOWN TRỐNG vì:
   - Frontend fetch: GET /api/coupons/my-coupons
   - Backend query: WHERE userId = currentUser
   - Không có record trong `user_coupons` cho user này
   - Return: [] (empty array)
5. ❌ User KHÔNG THỂ chọn mã
```

**❌ VẤN ĐỀ**: 
- Public coupons không tự động có trong `user_coupons`
- User không thể thấy và chọn mã
- Chỉ có thể dùng nếu user tự nhập code (nhưng UI không có input)

---

## 🔍 PHÂN TÍCH CHI TIẾT

### Database Structure

#### Bảng `coupons` - Định nghĩa Coupon
```sql
CREATE TABLE coupons (
  id INT PRIMARY KEY,
  code VARCHAR(50) UNIQUE,
  name VARCHAR(255),
  promotionType ENUM('GENERAL', 'FIRST_ORDER', 'FIRST_REVIEW', 'SHIPPING', 'SEASONAL'),
  discountType ENUM('AMOUNT', 'PERCENT'),
  discountValue DECIMAL(10,2),
  minimumAmount DECIMAL(12,2),
  usageLimit INT,              -- Tổng số lượt dùng
  usageLimitPerUser INT,       -- Mỗi user dùng tối đa bao nhiêu lần
  isActive BOOLEAN,
  startDate DATETIME,
  endDate DATETIME
);
```

**Ví dụ**:
```sql
INSERT INTO coupons VALUES (
  4, 'FREESHIP30K', 'Miễn phí vận chuyển',
  'SHIPPING', 'AMOUNT', 30000, 0,
  10000,  -- Tổng 10,000 lượt
  5,      -- Mỗi user dùng tối đa 5 lần
  true, '2025-01-01', '2026-01-01'
);
```

#### Bảng `user_coupons` - User Sở Hữu Coupon
```sql
CREATE TABLE user_coupons (
  id INT PRIMARY KEY,
  userId INT,
  couponId INT,
  isUsed BOOLEAN DEFAULT false,
  expiresAt DATETIME,
  UNIQUE(userId, couponId)
);
```

**Ví dụ** (Auto-grant):
```sql
-- User 1 đăng ký → Tự động tạo
INSERT INTO user_coupons VALUES (1, 1, 3, false, '2026-01-27');
```

**❌ Vấn đề**: Public coupons KHÔNG có record trong bảng này!

---

## 💡 GIẢI PHÁP

### Option 1: Thêm Input Nhập Mã (Đơn Giản)

**Ưu điểm**:
- ✅ Đơn giản, không cần thay đổi database
- ✅ User có thể nhập bất kỳ mã nào
- ✅ Phù hợp với marketing (share code qua SMS, email)

**Nhược điểm**:
- ❌ User phải biết mã (không tự discover)
- ❌ UX không tốt (phải gõ tay)

**Implementation**:
```jsx
// Frontend: Checkout.jsx
<div>
  <Input 
    placeholder="Nhập mã giảm giá" 
    value={couponCode}
    onChange={(e) => setCouponCode(e.target.value)}
  />
  <Button onClick={() => handleApplyCoupon(couponCode)}>
    Áp dụng
  </Button>
</div>
```

**Backend**: Không cần thay đổi - `validateAndApplyCoupon()` đã hỗ trợ

---

### Option 2: Hiển Thị Public Coupons (Phức Tạp Hơn)

**Ưu điểm**:
- ✅ User thấy tất cả mã available
- ✅ UX tốt hơn (chọn từ dropdown)
- ✅ Tăng conversion rate

**Nhược điểm**:
- ❌ Cần thay đổi logic backend
- ❌ Phức tạp hơn trong validation

**Implementation**:

#### Bước 1: Thêm API Lấy Public Coupons
```javascript
// Backend: couponController.js
export const getAvailableCoupons = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // 1. Lấy coupons user đã sở hữu
    const userCoupons = await prisma.userCoupon.findMany({
      where: {
        userId,
        isUsed: false,
        expiresAt: { gte: now }
      },
      include: { coupon: true }
    });

    // 2. Lấy public coupons (GENERAL, SHIPPING, SEASONAL)
    const publicCoupons = await prisma.coupon.findMany({
      where: {
        promotionType: { in: ['GENERAL', 'SHIPPING', 'SEASONAL'] },
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
        usedCount: { lt: prisma.raw('usage_limit') }
      }
    });

    // 3. Merge và format
    const allCoupons = [
      ...userCoupons.map(uc => ({
        ...uc.coupon,
        owned: true,
        expiresAt: uc.expiresAt
      })),
      ...publicCoupons
        .filter(pc => !userCoupons.find(uc => uc.couponId === pc.id))
        .map(pc => ({
          ...pc,
          owned: false,
          expiresAt: pc.endDate
        }))
    ];

    return res.json({
      success: true,
      data: allCoupons
    });
  } catch (error) {
    logger.error('Get available coupons error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách mã giảm giá'
    });
  }
};
```

#### Bước 2: Update Validation Logic
```javascript
// Backend: couponService.js
export const validateAndApplyCoupon = async (userId, couponCode, subtotal, shippingFee) => {
  try {
    // 1. Tìm coupon
    const coupon = await prisma.coupon.findUnique({
      where: { code: couponCode }
    });

    if (!coupon) {
      return { success: false, message: 'Mã giảm giá không tồn tại' };
    }

    // 2. Kiểm tra basic validation
    if (!coupon.isActive) {
      return { success: false, message: 'Mã giảm giá đã bị vô hiệu hóa' };
    }

    const now = new Date();
    if (now < coupon.startDate || now > coupon.endDate) {
      return { success: false, message: 'Mã giảm giá đã hết hạn' };
    }

    if (coupon.usedCount >= coupon.usageLimit) {
      return { success: false, message: 'Mã giảm giá đã hết lượt sử dụng' };
    }

    // 3. Kiểm tra minimum amount
    if (subtotal < Number(coupon.minimumAmount)) {
      return {
        success: false,
        message: `Đơn hàng tối thiểu ${Number(coupon.minimumAmount).toLocaleString('vi-VN')}đ`
      };
    }

    // 4. Kiểm tra user-specific validation
    if (coupon.promotionType === 'FIRST_ORDER' || 
        coupon.promotionType === 'FIRST_REVIEW') {
      // Coupons này BẮT BUỘC phải có trong user_coupons
      const userCoupon = await prisma.userCoupon.findUnique({
        where: {
          userId_couponId: { userId, couponId: coupon.id }
        }
      });

      if (!userCoupon) {
        return { success: false, message: 'Bạn chưa sở hữu mã giảm giá này' };
      }

      if (userCoupon.isUsed) {
        return { success: false, message: 'Mã giảm giá đã được sử dụng' };
      }

      if (now > userCoupon.expiresAt) {
        return { success: false, message: 'Mã giảm giá của bạn đã hết hạn' };
      }
    } else {
      // Public coupons - Kiểm tra usage limit per user
      const userUsageCount = await prisma.couponUsage.count({
        where: { userId, couponId: coupon.id }
      });

      if (userUsageCount >= coupon.usageLimitPerUser) {
        return { 
          success: false, 
          message: 'Bạn đã sử dụng hết số lần cho phép của mã này' 
        };
      }
    }

    // 5. Tính discount
    let discountAmount = 0;
    let discountShipping = 0;

    if (coupon.applyToShipping) {
      if (coupon.discountType === 'AMOUNT') {
        discountShipping = Math.min(Number(coupon.discountValue), shippingFee);
      } else {
        discountShipping = Math.min((shippingFee * Number(coupon.discountValue)) / 100, shippingFee);
      }
    } else {
      if (coupon.discountType === 'AMOUNT') {
        discountAmount = Number(coupon.discountValue);
      } else {
        discountAmount = (subtotal * Number(coupon.discountValue)) / 100;
      }
    }

    return {
      success: true,
      coupon,
      discountAmount,
      discountShipping,
      totalDiscount: discountAmount + discountShipping
    };
  } catch (error) {
    logger.error('Validate coupon error', { error: error.message });
    return { success: false, message: 'Lỗi khi kiểm tra mã giảm giá' };
  }
};
```

#### Bước 3: Update markCouponAsUsed
```javascript
// Backend: couponService.js
export const markCouponAsUsed = async (userId, couponCode, orderId) => {
  try {
    const coupon = await prisma.coupon.findUnique({
      where: { code: couponCode }
    });

    if (!coupon) {
      throw new Error('Coupon not found');
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update coupon usedCount
      await tx.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } }
      });

      // 2. Create coupon usage record
      await tx.couponUsage.create({
        data: {
          userId,
          couponId: coupon.id,
          orderId,
          usedAt: new Date()
        }
      });

      // 3. Update user_coupon if exists (for auto-grant coupons)
      const userCoupon = await tx.userCoupon.findUnique({
        where: {
          userId_couponId: { userId, couponId: coupon.id }
        }
      });

      if (userCoupon) {
        await tx.userCoupon.update({
          where: { id: userCoupon.id },
          data: {
            isUsed: true,
            usedAt: new Date()
          }
        });
      }
    });

    logger.info('Coupon marked as used', { userId, couponCode, orderId });
    return true;
  } catch (error) {
    logger.error('Mark coupon as used error', { error: error.message });
    throw error;
  }
};
```

#### Bước 4: Update Frontend
```jsx
// Frontend: useCheckout.js
const fetchUserCoupons = async () => {
  try {
    setLoadingCoupons(true);
    // Thay đổi endpoint
    const response = await axiosClient.get("/coupons/available");

    if (response.data.success) {
      setUserCoupons(response.data.data || []);
    }
  } catch (error) {
    console.error("Failed to fetch coupons:", error);
    setUserCoupons([]);
  } finally {
    setLoadingCoupons(false);
  }
};
```

```jsx
// Frontend: Checkout.jsx
{userCoupons.map((coupon) => (
  <Select.Option key={coupon.id} value={coupon.code}>
    <div className="flex justify-between items-center">
      <div>
        <div className="font-semibold">{coupon.code}</div>
        <div className="text-xs text-gray-500">{coupon.name}</div>
        {coupon.owned && (
          <span className="text-xs text-green-600">Của bạn</span>
        )}
      </div>
      <div className="text-right">
        <div className="font-semibold text-orange-600">
          {coupon.discountType === 'AMOUNT'
            ? formatPrice(coupon.discountValue)
            : `${coupon.discountValue}%`
          }
        </div>
        {coupon.minimumAmount > 0 && (
          <div className="text-xs text-gray-400">
            Đơn tối thiểu {formatPrice(coupon.minimumAmount)}
          </div>
        )}
      </div>
    </div>
  </Select.Option>
))}
```

---

### Option 3: Hybrid Approach (Khuyến Nghị)

**Kết hợp cả 2 options**:

1. **Dropdown**: Hiển thị coupons user đã sở hữu + public coupons
2. **Input**: Cho phép nhập mã (cho trường hợp marketing campaign)

```jsx
// Frontend: Checkout.jsx
<div className="space-y-3">
  {/* Dropdown chọn mã */}
  <Select
    placeholder="Chọn mã giảm giá"
    value={couponCode || undefined}
    onChange={handleApplyCoupon}
  >
    {userCoupons.map((coupon) => (
      <Select.Option key={coupon.id} value={coupon.code}>
        {/* ... */}
      </Select.Option>
    ))}
  </Select>

  {/* Hoặc nhập mã */}
  <div className="text-center text-sm text-gray-500">hoặc</div>
  
  <div className="flex gap-2">
    <Input
      placeholder="Nhập mã giảm giá"
      value={manualCouponCode}
      onChange={(e) => setManualCouponCode(e.target.value)}
    />
    <Button onClick={() => handleApplyCoupon(manualCouponCode)}>
      Áp dụng
    </Button>
  </div>
</div>
```

---

## 📊 SO SÁNH CÁC GIẢI PHÁP

| Tiêu Chí | Option 1 (Input) | Option 2 (Dropdown) | Option 3 (Hybrid) |
|----------|------------------|---------------------|-------------------|
| **Độ phức tạp** | ⭐ Đơn giản | ⭐⭐⭐ Phức tạp | ⭐⭐ Trung bình |
| **UX** | ⭐⭐ Tạm được | ⭐⭐⭐⭐ Tốt | ⭐⭐⭐⭐⭐ Rất tốt |
| **Discovery** | ❌ Không | ✅ Có | ✅ Có |
| **Marketing** | ✅ Tốt | ❌ Hạn chế | ✅ Tốt |
| **Thời gian dev** | 1 giờ | 4-6 giờ | 5-7 giờ |

---

## 🎯 KHUYẾN NGHỊ

### Ngắn Hạn (1-2 giờ)
✅ **Implement Option 1**: Thêm input nhập mã
- Đơn giản, nhanh
- Đủ dùng cho MVP
- Không cần thay đổi backend

### Dài Hạn (1 tuần)
✅ **Implement Option 3**: Hybrid approach
- UX tốt nhất
- Hỗ trợ cả auto-grant và public coupons
- Linh hoạt cho marketing

---

**Created**: 2025-12-29
**Status**: 📋 **ANALYSIS COMPLETE**
