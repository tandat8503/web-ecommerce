# 🐛 DEBUG GUIDE - Coupon Not Granted on Registration

## ❓ Vấn Đề
User đăng ký mới nhưng không nhận được mã giảm giá WELCOME200K

## ✅ Đã Kiểm Tra & Fix

### 1. Coupon Tồn Tại Trong Database
```bash
node scripts/check-coupon.js
```
✅ Kết quả: WELCOME200K tồn tại, active, và còn hạn

### 2. Function grantWelcomeCoupon() Hoạt Động
```bash
# Tạo test user
node scripts/create-test-user.js

# Test grant coupon
node scripts/test-grant-welcome.js <userId>
```
✅ Kết quả: Function hoạt động tốt khi gọi trực tiếp

### 3. Cải Thiện Logging
**File**: `backend/controller/authController.js`

**Thay đổi**: Thêm detailed logging để track:
- ✅ Success case: Log couponId và expiresAt
- ⚠️ Null case: Log warning khi function return null
- ❌ Error case: Log full error với stack trace

## 🧪 Cách Test

### Test 1: Đăng Ký Tài Khoản Mới
1. Vào frontend: http://localhost:5173/auth
2. Đăng ký tài khoản mới
3. **Kiểm tra backend logs** để xem:
   - `✅ [SUCCESS] User registered`
   - `ℹ️  [INFO] Welcome coupon granted successfully` (nếu thành công)
   - `⚠️  [WARN] Welcome coupon not granted (returned null)` (nếu return null)
   - `❌ [ERROR] Failed to grant welcome coupon` (nếu có lỗi)

### Test 2: Kiểm Tra Database
```bash
# Kiểm tra user coupons
node scripts/check-user-coupons.js
```

### Test 3: Kiểm Tra Frontend
1. Đăng nhập với tài khoản vừa tạo
2. Vào: http://localhost:5173/my-coupons
3. Kiểm tra tab "Có thể dùng"
4. Phải thấy mã WELCOME200K

## 🔍 Các Trường Hợp Return Null

Function `grantWelcomeCoupon()` sẽ return `null` trong các trường hợp:

### 1. Coupon Không Tồn Tại
```javascript
if (!welcomeCoupon) {
  logger.warn('Welcome coupon not found or inactive');
  return null;
}
```
**Nguyên nhân**:
- Coupon chưa được seed
- Coupon bị inactive
- Coupon hết hạn (endDate < now)
- Coupon chưa đến thời gian (startDate > now)

**Fix**: Chạy `node scripts/seed-coupons.js`

### 2. User Đã Nhận Mã Này Rồi
```javascript
if (existingUserCoupon) {
  return null; // Đã nhận rồi
}
```
**Nguyên nhân**: User đã có mã này trong database

**Fix**: Đây là behavior đúng, mỗi user chỉ nhận 1 lần

## 🐛 Possible Bugs

### Bug 1: Timing Issue
**Mô tả**: Function được gọi trước khi user được commit vào database

**Kiểm tra**: Xem logs có error về foreign key constraint không

**Fix**: Code hiện tại đã đúng - user được tạo xong (await) trước khi gọi grantWelcomeCoupon

### Bug 2: Silent Error
**Mô tả**: Error bị catch nhưng không log đầy đủ

**Fix**: ✅ Đã fix - thêm detailed logging với stack trace

### Bug 3: Database Connection
**Mô tả**: Prisma client chưa kết nối đúng

**Kiểm tra**: 
```bash
# Test database connection
curl http://localhost:5000/api/test-db
```

## 📊 Expected Logs (Success Case)

```
✅ [SUCCESS] 2025-12-28T08:00:00.000Z User registered { userId: 10, email: 'test@example.com' }
ℹ️  [INFO] 2025-12-28T08:00:00.100Z Welcome coupon granted successfully { 
  userId: 10, 
  couponId: 3,
  expiresAt: 2026-01-27T08:00:00.000Z
}
```

## 📊 Expected Logs (Null Case)

```
✅ [SUCCESS] 2025-12-28T08:00:00.000Z User registered { userId: 10, email: 'test@example.com' }
⚠️  [WARN] 2025-12-28T08:00:00.100Z Welcome coupon not granted (returned null) { userId: 10 }
```

## 📊 Expected Logs (Error Case)

```
✅ [SUCCESS] 2025-12-28T08:00:00.000Z User registered { userId: 10, email: 'test@example.com' }
❌ [ERROR] 2025-12-28T08:00:00.100Z Failed to grant welcome coupon (non-blocking) { 
  userId: 10, 
  error: 'Foreign key constraint failed',
  stack: '...'
}
```

## 🔧 Next Steps

1. **Đăng ký tài khoản mới** và quan sát backend logs
2. **Xác định** log nào xuất hiện (success/warn/error)
3. **Dựa vào log** để xác định root cause
4. **Report** kết quả để tiếp tục debug

---

**Created**: 2025-12-28
**Status**: 🔍 DEBUGGING IN PROGRESS
