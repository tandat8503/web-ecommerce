# GHN Integration Test Guide

## 🚀 Quick Start

### 1. Test Backend APIs (Tự động)

Chạy script test tự động để kiểm tra tất cả API endpoints GHN:

```bash
cd backend
npm run test:ghn
```

Hoặc chạy trực tiếp:

```bash
cd backend
node scripts/test-ghn-integration.js
```

### 2. Test với Environment Variables

Nếu muốn test với API URL khác hoặc test các API cần auth:

```bash
cd backend

# Test với API URL khác
API_URL=http://localhost:5000/api npm run test:ghn

# Test với token (để test tracking API)
API_URL=http://localhost:5000/api \
TEST_TOKEN=your_jwt_token_here \
TEST_GHN_ORDER_CODE=GHN123456789 \
npm run test:ghn
```

---

## 📋 Test Cases

Script sẽ test các API sau:

1. ✅ **Get Provinces** - Lấy danh sách tỉnh/thành phố
2. ✅ **Get Districts** - Lấy danh sách quận/huyện
3. ✅ **Get Wards** - Lấy danh sách phường/xã
4. ✅ **Calculate Shipping Fee** - Tính phí vận chuyển
5. ✅ **Get Available Services** - Lấy danh sách dịch vụ
6. ✅ **Get Lead Time** - Tính thời gian giao hàng
7. ⚠️ **Get Tracking** - Lấy thông tin tracking (cần auth)
8. ✅ **Error Handling** - Test xử lý lỗi

---

## 📊 Kết quả mong đợi

### ✅ Success Case

```
========================================
GHN Integration Test Suite
========================================
API URL: http://localhost:5000/api
Test Token: Not provided
========================================

[TEST] 1. Get Provinces
  Found 63 provinces
  Sample: Thành phố Hồ Chí Minh (code: 202)
✓ PASSED: 1. Get Provinces

[TEST] 2. Get Districts
  Found 24 districts
  Sample: Quận 1 (code: 1451, districtId: 1451)
✓ PASSED: 2. Get Districts

...

========================================
Test Summary
========================================
✓ Passed: 7
✗ Failed: 0
⊘ Skipped: 1
========================================
```

### ❌ Error Case

Nếu có lỗi, script sẽ hiển thị:

```
✗ FAILED: 4. Calculate Shipping Fee
  Error: Expected status 200, got 401
  Status: 401
  Data: {
    "success": false,
    "message": "Unauthorized"
  }
```

---

## 🔍 Debugging

### Lỗi 401 Unauthorized

**Nguyên nhân:** GHN_TOKEN không đúng hoặc không có

**Giải pháp:**
1. Kiểm tra file `backend/.env` có `GHN_TOKEN` không
2. Kiểm tra token có đúng không (lấy từ GHN web)
3. Kiểm tra `ghnService.js` - header phải là `'token'` (chữ thường)

### Lỗi 400 Bad Request

**Nguyên nhân:** Params không đúng format

**Giải pháp:**
1. Kiểm tra `provinceId` phải là number (không phải string)
2. Kiểm tra `districtId` phải là number
3. Kiểm tra `wardCode` phải là string

### Lỗi Connection Refused

**Nguyên nhân:** Backend chưa chạy

**Giải pháp:**
```bash
cd backend
npm run dev
```

---

## 📝 Manual Testing

Xem file `GHN_TEST_CHECKLIST.md` để test frontend và các chức năng khác một cách thủ công.

---

## 🎯 Next Steps

Sau khi test xong:

1. ✅ Nếu tất cả tests pass → Tích hợp GHN hoạt động đúng
2. ❌ Nếu có tests fail → Xem error message và fix
3. 📋 Test frontend theo checklist trong `GHN_TEST_CHECKLIST.md`
4. 🐛 Report bugs nếu có

---

## 💡 Tips

- Chạy test script trước khi commit code
- Test với cả production và development GHN API
- Test với các địa chỉ khác nhau (HCM, Hà Nội, tỉnh khác)
- Test với các trường hợp edge case (địa chỉ không có GHN IDs, etc.)

