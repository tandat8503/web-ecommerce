# 🎟️ HỆ THỐNG COUPON - CÁC LOẠI KHUYẾN MÃI & CƠ CHẾ

## 📋 TỔNG QUAN

Hệ thống coupon hỗ trợ **2 loại giảm giá chính**:
1. **Giảm giá đơn hàng** (AMOUNT hoặc PERCENT)
2. **Giảm phí vận chuyển** (AMOUNT hoặc PERCENT)

---

## 🎁 CÁC LOẠI COUPON HIỆN TẠI

### 1. WELCOME200K - Mã Chào Mừng
**Loại**: Tự động tặng khi đăng ký

**Thông tin**:
- 💰 Giảm: **200,000đ**
- 📦 Áp dụng: Giảm giá đơn hàng
- 🛒 Điều kiện: Đơn hàng tối thiểu **2,000,000đ**
- ⏰ Hết hạn: 30 ngày sau khi nhận
- 🔢 Giới hạn: Mỗi user chỉ nhận **1 lần**

**Cơ chế**:
```javascript
// Tự động tặng khi user đăng ký
register() → grantWelcomeCoupon(userId)
  → Tạo UserCoupon với expiresAt = now + 30 days
```

**Công thức tính**:
```
Discount = 200,000đ (cố định)
Total = Subtotal + ShippingFee - Discount
```

---

### 2. FIRST300K - Mã Đơn Hàng Đầu Tiên
**Loại**: Tự động tặng sau đơn hàng đầu tiên

**Thông tin**:
- 💰 Giảm: **300,000đ**
- 📦 Áp dụng: Giảm giá đơn hàng
- 🛒 Điều kiện: Đơn hàng tối thiểu **500,000đ**
- ⏰ Hết hạn: 30 ngày sau khi nhận
- 🔢 Giới hạn: Mỗi user chỉ nhận **1 lần**

**Cơ chế**:
```javascript
// Tự động tặng sau khi đơn hàng đầu tiên thành công
createOrder() → grantFirstOrderCoupon(userId)
  → Kiểm tra: orderCount === 0
  → Tạo UserCoupon
```

**Công thức tính**:
```
Discount = 300,000đ (cố định)
Total = Subtotal + ShippingFee - Discount
```

---

### 3. REVIEW100K - Mã Review Đầu Tiên
**Loại**: Tự động tặng sau review đầu tiên

**Thông tin**:
- 💰 Giảm: **100,000đ**
- 📦 Áp dụng: Giảm giá đơn hàng
- 🛒 Điều kiện: Đơn hàng tối thiểu **200,000đ**
- ⏰ Hết hạn: 30 ngày sau khi nhận
- 🔢 Giới hạn: Mỗi user chỉ nhận **1 lần**

**Cơ chế**:
```javascript
// Tự động tặng sau khi tạo review đầu tiên
createReview() → grantFirstReviewCoupon(userId)
  → Kiểm tra: reviewCount === 0
  → Tạo UserCoupon
```

**Công thức tính**:
```
Discount = 100,000đ (cố định)
Total = Subtotal + ShippingFee - Discount
```

---

### 4. FREESHIP30K - Miễn Phí Vận Chuyển
**Loại**: Public coupon (không tự động tặng)

**Thông tin**:
- 💰 Giảm: **30,000đ**
- 🚚 Áp dụng: **Giảm phí vận chuyển**
- 🛒 Điều kiện: Không yêu cầu đơn tối thiểu
- ⏰ Hết hạn: 1 năm (từ ngày seed)
- 🔢 Giới hạn: 
  - Tổng: 10,000 lượt
  - Mỗi user: **5 lần**

**Cơ chế**:
```javascript
// User phải tự nhập mã hoặc chọn từ danh sách
applyToShipping = true
discountType = AMOUNT
discountValue = 30,000đ
```

**Công thức tính**:
```
DiscountShipping = min(30,000đ, ShippingFee)
Total = Subtotal + (ShippingFee - DiscountShipping)
```

**Ví dụ**:
- ShippingFee = 50,000đ → Discount = 30,000đ → Còn 20,000đ
- ShippingFee = 25,000đ → Discount = 25,000đ → Miễn phí ship

---

### 5. SUMMER15 - Giảm 15% Mùa Hè
**Loại**: Seasonal coupon (không tự động tặng)

**Thông tin**:
- 💰 Giảm: **15%**
- 📦 Áp dụng: Giảm giá đơn hàng
- 🛒 Điều kiện: Đơn hàng tối thiểu **1,000,000đ**
- ⏰ Hết hạn: 1 năm (từ ngày seed)
- 🔢 Giới hạn:
  - Tổng: 5,000 lượt
  - Mỗi user: **3 lần**

**Cơ chế**:
```javascript
// User phải tự nhập mã hoặc chọn từ danh sách
discountType = PERCENT
discountValue = 15%
```

**Công thức tính**:
```
Discount = Subtotal × 15%
Total = Subtotal + ShippingFee - Discount
```

**Ví dụ**:
- Subtotal = 2,000,000đ → Discount = 300,000đ
- Subtotal = 5,000,000đ → Discount = 750,000đ

---

## 🔧 CƠ CHẾ HOẠT ĐỘNG

### 1. Cấu Trúc Database

#### Bảng `coupons` - Định nghĩa Coupon
```sql
- id: ID coupon
- code: Mã coupon (WELCOME200K, FIRST300K, ...)
- name: Tên hiển thị
- description: Mô tả
- promotionType: GENERAL | FIRST_ORDER | FIRST_REVIEW | SHIPPING | SEASONAL
- discountType: AMOUNT | PERCENT
- discountValue: Giá trị giảm (200000 hoặc 15)
- applyToShipping: true/false (áp dụng cho ship hay đơn hàng)
- minimumAmount: Đơn tối thiểu
- usageLimit: Tổng số lượt dùng
- usedCount: Đã dùng bao nhiêu lượt
- usageLimitPerUser: Mỗi user dùng tối đa bao nhiêu lần
- startDate: Ngày bắt đầu
- endDate: Ngày kết thúc
- isActive: Còn hoạt động không
```

#### Bảng `user_coupons` - User Sở Hữu Coupon
```sql
- id: ID
- userId: User nào
- couponId: Coupon nào
- isUsed: Đã dùng chưa
- receivedAt: Ngày nhận
- usedAt: Ngày dùng (null nếu chưa dùng)
- expiresAt: Ngày hết hạn (30 ngày sau receivedAt)
```

#### Bảng `coupon_usages` - Lịch Sử Sử Dụng
```sql
- id: ID
- userId: User nào
- couponId: Coupon nào
- orderId: Đơn hàng nào
- discountAmount: Giảm bao nhiêu
- usedAt: Ngày dùng
```

---

### 2. Flow Tự Động Tặng Coupon

#### Flow 1: Đăng Ký → WELCOME200K
```
1. User đăng ký tài khoản
2. authController.register()
3. Tạo user thành công
4. Gọi grantWelcomeCoupon(userId) (non-blocking)
5. Tìm coupon code = 'WELCOME200K'
6. Kiểm tra user chưa có mã này
7. Tạo UserCoupon với expiresAt = now + 30 days
8. User nhận được mã
```

#### Flow 2: Đơn Hàng Đầu → FIRST300K
```
1. User đặt hàng
2. orderController.createOrder()
3. Tạo order thành công
4. Gọi grantFirstOrderCoupon(userId) (non-blocking)
5. Kiểm tra: orderCount === 0 (đơn đầu tiên)
6. Tìm coupon promotionType = 'FIRST_ORDER'
7. Kiểm tra user chưa có mã này
8. Tạo UserCoupon
9. User nhận được mã
```

#### Flow 3: Review Đầu → REVIEW100K
```
1. User tạo review
2. productReviewController.createReview()
3. Tạo review thành công
4. Gọi grantFirstReviewCoupon(userId) (non-blocking)
5. Kiểm tra: reviewCount === 0 (review đầu tiên)
6. Tìm coupon promotionType = 'FIRST_REVIEW'
7. Kiểm tra user chưa có mã này
8. Tạo UserCoupon
9. User nhận được mã
```

---

### 3. Flow Áp Dụng Coupon

#### Bước 1: User Chọn Coupon
```
Frontend: Checkout page
1. Fetch user coupons: GET /api/coupons/my-coupons?status=available
2. Hiển thị dropdown với các mã available
3. User chọn mã
4. Gọi handleApplyCoupon(couponCode)
```

#### Bước 2: Validate Coupon
```
Frontend → Backend: POST /api/coupons/validate
Body: {
  couponCode: "WELCOME200K",
  subtotal: 2500000,
  shippingFee: 50000
}

Backend: validateAndApplyCoupon()
1. Tìm coupon theo code
2. Kiểm tra isActive
3. Kiểm tra startDate, endDate
4. Kiểm tra usageLimit (tổng)
5. Kiểm tra user có mã này không (UserCoupon)
6. Kiểm tra isUsed
7. Kiểm tra expiresAt
8. Kiểm tra usageLimitPerUser
9. Kiểm tra minimumAmount
10. Tính discount

Response: {
  success: true,
  data: {
    code: "WELCOME200K",
    name: "Chào mừng khách hàng mới",
    discountAmount: 200000,
    discountShipping: 0,
    totalDiscount: 200000,
    applyToShipping: false
  }
}
```

#### Bước 3: Apply Discount
```
Frontend:
1. Nhận response từ validate
2. Set appliedCoupon = response.data
3. Tính lại summary:
   - Subtotal = sum of items
   - ShippingFee = from GHN API
   - Discount = appliedCoupon.totalDiscount
   - Total = Subtotal + ShippingFee - Discount
4. Hiển thị discount trong UI
```

#### Bước 4: Đặt Hàng
```
Frontend → Backend: POST /api/orders
Body: {
  addressId: 1,
  paymentMethod: "COD",
  couponCode: "WELCOME200K",  // ← Gửi mã đã chọn
  cartItemIds: [1, 2, 3]
}

Backend: createOrder()
1. Validate lại coupon (security)
2. Tạo order với discount
3. Gọi markCouponAsUsed(userId, couponCode, orderId)
   - Update UserCoupon: isUsed = true, usedAt = now
   - Update Coupon: usedCount += 1
   - Tạo CouponUsage record
4. Trả về order thành công
```

---

## 📊 CÔNG THỨC TÍNH DISCOUNT

### 1. Giảm Giá Đơn Hàng (applyToShipping = false)

#### Loại AMOUNT (Giảm cố định)
```javascript
discountAmount = coupon.discountValue
// Ví dụ: WELCOME200K → 200,000đ

Total = Subtotal + ShippingFee - discountAmount
```

#### Loại PERCENT (Giảm %)
```javascript
discountAmount = (Subtotal × coupon.discountValue) / 100
// Ví dụ: SUMMER15 với Subtotal = 2,000,000đ
// → discountAmount = 2,000,000 × 15% = 300,000đ

Total = Subtotal + ShippingFee - discountAmount
```

### 2. Giảm Phí Vận Chuyển (applyToShipping = true)

#### Loại AMOUNT (Giảm cố định)
```javascript
discountShipping = min(coupon.discountValue, ShippingFee)
// Ví dụ: FREESHIP30K với ShippingFee = 50,000đ
// → discountShipping = min(30,000đ, 50,000đ) = 30,000đ

Total = Subtotal + (ShippingFee - discountShipping)
```

#### Loại PERCENT (Giảm %)
```javascript
discountShipping = min((ShippingFee × coupon.discountValue) / 100, ShippingFee)
// Ví dụ: Giảm 50% ship với ShippingFee = 50,000đ
// → discountShipping = min(25,000đ, 50,000đ) = 25,000đ

Total = Subtotal + (ShippingFee - discountShipping)
```

---

## ✅ VALIDATION RULES

Khi user apply coupon, hệ thống kiểm tra:

1. ✅ **Coupon tồn tại**: Code có trong database không
2. ✅ **Còn active**: `isActive = true`
3. ✅ **Trong thời gian**: `now >= startDate && now <= endDate`
4. ✅ **Còn lượt dùng**: `usedCount < usageLimit`
5. ✅ **User sở hữu**: Có record trong `user_coupons`
6. ✅ **Chưa dùng**: `isUsed = false`
7. ✅ **Chưa hết hạn**: `now <= expiresAt`
8. ✅ **Chưa vượt giới hạn**: User usage count < `usageLimitPerUser`
9. ✅ **Đủ điều kiện**: `subtotal >= minimumAmount`

Nếu **TẤT CẢ** điều kiện đều pass → Coupon hợp lệ → Tính discount

---

## 🎯 USER JOURNEY

### Journey 1: User Mới
```
1. Đăng ký → Nhận WELCOME200K (200k, đơn từ 2tr)
2. Mua hàng lần 1 → Dùng WELCOME200K → Giảm 200k
3. Sau khi đơn hàng giao → Nhận FIRST300K (300k, đơn từ 500k)
4. Review sản phẩm → Nhận REVIEW100K (100k, đơn từ 200k)
5. Mua hàng lần 2 → Dùng FIRST300K → Giảm 300k
6. Mua hàng lần 3 → Dùng REVIEW100K → Giảm 100k
```

### Journey 2: User Tìm Mã Public
```
1. User vào /my-coupons → Không có mã
2. User search "mã giảm giá" → Tìm thấy FREESHIP30K
3. User nhập mã FREESHIP30K tại checkout
4. Hệ thống kiểm tra → Mã hợp lệ → Apply
5. Giảm 30k phí ship
```

---

## 📝 NOTES

### Điểm Mạnh
✅ Tự động tặng mã khi user thực hiện hành động
✅ Kiểm tra validation chặt chẽ
✅ Hỗ trợ cả giảm đơn hàng và giảm ship
✅ Giới hạn số lần dùng (tổng và per user)
✅ Expiry date cho mỗi user

### Hạn Chế Hiện Tại
⚠️ Không hỗ trợ stack nhiều mã (chỉ dùng 1 mã/đơn)
⚠️ Không có maximum discount cho PERCENT type
⚠️ Không có coupon cho specific categories/products
⚠️ Không có referral coupon

### Có Thể Mở Rộng
💡 Thêm coupon cho sinh nhật user
💡 Thêm coupon cho VIP members
💡 Thêm flash sale coupons
💡 Thêm bundle coupons (mua X tặng Y)
💡 Thêm loyalty points system

---

**Created**: 2025-12-29
**Version**: 1.0
**Status**: ✅ PRODUCTION READY
