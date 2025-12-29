# 🔧 COUPON SYSTEM - DISABLED AUTO-GRANT FEATURES

## ✅ Thay Đổi

### Tính Năng Giữ Lại
✅ **WELCOME200K** - Mã chào mừng người dùng mới
- Tự động tặng khi đăng ký
- Giảm 200,000đ cho đơn từ 2,000,000đ
- Hết hạn sau 30 ngày

### Tính Năng Tạm Tắt

❌ **FIRST300K** - Mã đơn hàng đầu tiên
- ~~Tự động tặng sau đơn hàng đầu tiên~~
- Code đã được comment

❌ **REVIEW100K** - Mã review đầu tiên
- ~~Tự động tặng sau review đầu tiên~~
- Code đã được comment

---

## 📝 Files Đã Sửa

### 1. orderController.js
**Location**: `backend/controller/orderController.js`

**Before**:
```javascript
// BƯỚC 10: Tặng mã giảm giá cho đơn hàng đầu tiên
grantFirstOrderCoupon(userId).catch(err => {
  logger.error('Failed to grant first order coupon', {...});
});
```

**After**:
```javascript
// BƯỚC 10: Tặng mã giảm giá cho đơn hàng đầu tiên (non-blocking)
// TODO: Tính năng tạm thời tắt - Chỉ giữ lại mã chào mừng người dùng mới
// grantFirstOrderCoupon(userId).catch(err => {
//   logger.error('Failed to grant first order coupon (non-blocking)', {
//     userId,
//     orderId: created.id,
//     error: err.message
//   });
// });
```

---

### 2. productReviewController.js
**Location**: `backend/controller/productReviewController.js`

**Before**:
```javascript
// Tặng mã giảm giá cho review đầu tiên
grantFirstReviewCoupon(userId).catch(err => {
  logger.error('Failed to grant first review coupon', {...});
});
```

**After**:
```javascript
// Tặng mã giảm giá cho review đầu tiên (non-blocking)
// TODO: Tính năng tạm thời tắt - Chỉ giữ lại mã chào mừng người dùng mới
// grantFirstReviewCoupon(userId).catch(err => {
//   logger.error('Failed to grant first review coupon (non-blocking)', {
//     userId,
//     reviewId: review.id,
//     error: err.message
//   });
// });
```

---

## 🎯 Hành Vi Hiện Tại

### User Journey
```
1. Đăng ký → ✅ Nhận WELCOME200K (200k, đơn từ 2tr)
2. Đặt hàng lần 1 → ❌ KHÔNG nhận FIRST300K
3. Review sản phẩm → ❌ KHÔNG nhận REVIEW100K
4. Đặt hàng lần 2 → Dùng WELCOME200K
```

### Coupons Available
- ✅ **WELCOME200K** - Auto-grant khi đăng ký
- ⚪ **FREESHIP30K** - Public coupon (user tự nhập)
- ⚪ **SUMMER15** - Public coupon (user tự nhập)

---

## 🔄 Để Bật Lại Tính Năng

### Bật lại FIRST300K
**File**: `backend/controller/orderController.js`

Uncomment dòng 386-392:
```javascript
// Bỏ comment 2 dấu // ở đầu mỗi dòng
grantFirstOrderCoupon(userId).catch(err => {
  logger.error('Failed to grant first order coupon (non-blocking)', {
    userId,
    orderId: created.id,
    error: err.message
  });
});
```

### Bật lại REVIEW100K
**File**: `backend/controller/productReviewController.js`

Uncomment dòng 177-183:
```javascript
// Bỏ comment 2 dấu // ở đầu mỗi dòng
grantFirstReviewCoupon(userId).catch(err => {
  logger.error('Failed to grant first review coupon (non-blocking)', {
    userId,
    reviewId: review.id,
    error: err.message
  });
});
```

---

## ⚠️ Lưu Ý

### Services Vẫn Hoạt Động
Các function trong `couponService.js` vẫn hoạt động bình thường:
- ✅ `grantWelcomeCoupon()` - Đang được dùng
- ⚪ `grantFirstOrderCoupon()` - Không được gọi
- ⚪ `grantFirstReviewCoupon()` - Không được gọi
- ✅ `validateAndApplyCoupon()` - Đang được dùng
- ✅ `markCouponAsUsed()` - Đang được dùng

### Database Không Thay Đổi
- Bảng `coupons` vẫn có đầy đủ 5 mã
- Bảng `user_coupons` chỉ tạo record cho WELCOME200K
- Bảng `coupon_usages` vẫn track usage bình thường

### Frontend Không Thay Đổi
- UI vẫn hiển thị dropdown chọn mã
- Validation vẫn hoạt động
- Apply coupon vẫn hoạt động
- Chỉ khác là user sẽ có ít mã hơn

---

## 🧪 Testing

### Test 1: Đăng Ký User Mới
```
1. Đăng ký tài khoản mới
2. Vào /my-coupons
3. ✅ Phải thấy WELCOME200K
4. ❌ KHÔNG thấy FIRST300K
5. ❌ KHÔNG thấy REVIEW100K
```

### Test 2: Đặt Hàng
```
1. Đặt hàng lần đầu
2. Kiểm tra backend logs
3. ❌ KHÔNG thấy log "First order coupon granted"
4. Vào /my-coupons
5. ❌ KHÔNG có mã mới
```

### Test 3: Review
```
1. Tạo review cho sản phẩm
2. Kiểm tra backend logs
3. ❌ KHÔNG thấy log "First review coupon granted"
4. Vào /my-coupons
5. ❌ KHÔNG có mã mới
```

---

**Updated**: 2025-12-29
**Status**: ✅ **COMPLETED**
**Active Features**: Welcome Coupon Only
