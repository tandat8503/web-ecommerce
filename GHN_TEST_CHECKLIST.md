# GHN Integration Test Checklist

## 📋 Hướng dẫn Test

File này chứa checklist để test tích hợp GHN một cách thủ công trên frontend và backend.

---

## 🔧 Backend Tests

### 1. Test Script Tự Động

Chạy script test tự động:

```bash
cd backend
node scripts/test-ghn-integration.js
```

Hoặc với environment variables:

```bash
API_URL=http://localhost:5000/api \
TEST_TOKEN=your_token_here \
TEST_GHN_ORDER_CODE=GHN123456789 \
node scripts/test-ghn-integration.js
```

**Kết quả mong đợi:**
- ✅ Tất cả tests pass (trừ các test cần auth nếu không có token)
- ✅ Không có lỗi 401 (Unauthorized) - nghĩa là GHN_TOKEN đúng
- ✅ Không có lỗi 400 (Bad Request) - nghĩa là params đúng format

---

### 2. Test Manual với Postman/Thunder Client

#### Test 1: Get Provinces
```
GET http://localhost:5000/api/shipping/provinces
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách tỉnh/thành phố thành công",
  "data": [
    {
      "code": "202",
      "name": "Thành phố Hồ Chí Minh"
    }
  ]
}
```

**Checklist:**
- [ ] Status code = 200
- [ ] `success` = true
- [ ] `data` là array
- [ ] Mỗi item có `code` và `name`

---

#### Test 2: Get Districts
```
POST http://localhost:5000/api/shipping/districts
Content-Type: application/json

{
  "provinceId": 202
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách quận/huyện thành công",
  "data": [
    {
      "code": "1451",
      "name": "Quận 1",
      "districtId": 1451
    }
  ]
}
```

**Checklist:**
- [ ] Status code = 200
- [ ] `success` = true
- [ ] `data` là array
- [ ] Mỗi item có `code`, `name`, và `districtId`
- [ ] Test với `provinceId` không hợp lệ → 400

---

#### Test 3: Get Wards
```
POST http://localhost:5000/api/shipping/wards
Content-Type: application/json

{
  "districtId": 1451
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách phường/xã thành công",
  "data": [
    {
      "code": "1A0401",
      "name": "Phường Bến Nghé",
      "wardCode": "1A0401"
    }
  ]
}
```

**Checklist:**
- [ ] Status code = 200
- [ ] `success` = true
- [ ] `data` là array
- [ ] Mỗi item có `code`, `name`, và `wardCode`
- [ ] Test với `districtId` không hợp lệ → 400

---

#### Test 4: Calculate Shipping Fee
```
POST http://localhost:5000/api/shipping/calculate-fee
Content-Type: application/json

{
  "toDistrictId": 1451,
  "toWardCode": "1A0401",
  "weight": 1000,
  "length": 20,
  "width": 20,
  "height": 20,
  "serviceTypeId": 2,
  "insuranceValue": 500000
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Tính phí vận chuyển thành công",
  "data": {
    "totalFee": 30000,
    "serviceFee": 25000,
    ...
  }
}
```

**Checklist:**
- [ ] Status code = 200
- [ ] `success` = true
- [ ] `data.totalFee` là số > 0
- [ ] Test với thiếu params → 400
- [ ] Test với `toDistrictId`/`toWardCode` không hợp lệ → lỗi từ GHN

---

#### Test 5: Get Available Services
```
POST http://localhost:5000/api/shipping/available-services
Content-Type: application/json

{
  "toDistrictId": 1451,
  "toWardCode": "1A0401"
}
```

**Checklist:**
- [ ] Status code = 200
- [ ] `success` = true
- [ ] `data` là array (có thể rỗng)
- [ ] Mỗi service có `service_id`, `service_type_id`, `short_name`

---

#### Test 6: Get Lead Time
```
POST http://localhost:5000/api/shipping/leadtime
Content-Type: application/json

{
  "toDistrictId": 1451,
  "toWardCode": "1A0401",
  "serviceId": 53321
}
```

**Checklist:**
- [ ] Status code = 200
- [ ] `success` = true
- [ ] `data` có `leadtime`, `order_date`, `timestamp`

---

#### Test 7: Get Tracking (cần auth)
```
GET http://localhost:5000/api/shipping/tracking/GHN123456789
Authorization: Bearer {your_token}
```

**Checklist:**
- [ ] Không có token → 401
- [ ] Có token hợp lệ → 200 hoặc 404 (nếu order code không tồn tại)
- [ ] `data` có `order_code`, `status`, `created_date`

---

## 🎨 Frontend Tests

### 1. Test Quản Lý Địa Chỉ

**URL:** `/profile/address`

**Test Cases:**

#### Test 1.1: Thêm địa chỉ mới
- [ ] Mở form thêm địa chỉ
- [ ] Chọn Tỉnh/TP → Dropdown hiển thị danh sách từ GHN
- [ ] Chọn Quận/Huyện → Dropdown hiển thị danh sách từ GHN
- [ ] Chọn Phường/Xã → Dropdown hiển thị danh sách từ GHN
- [ ] Điền đầy đủ thông tin và submit
- [ ] Kiểm tra trong Network tab: Request có `ghnDistrictId` và `ghnWardCode`
- [ ] Kiểm tra trong Database: Address có `ghnDistrictId` và `ghnWardCode`

#### Test 1.2: Sửa địa chỉ
- [ ] Click "Sửa" trên một địa chỉ đã có
- [ ] Form tự động load đúng Tỉnh/Quận/Phường đã chọn
- [ ] Thay đổi Tỉnh → Quận và Phường reset
- [ ] Thay đổi Quận → Phường reset
- [ ] Submit và kiểm tra GHN IDs được cập nhật

#### Test 1.3: Địa chỉ cũ (không có GHN IDs)
- [ ] Nếu có địa chỉ cũ (tạo trước khi tích hợp GHN)
- [ ] Khi sửa, form vẫn hiển thị đúng Tỉnh/Quận/Phường
- [ ] Sau khi submit, GHN IDs được lưu vào database

---

### 2. Test Checkout

**URL:** `/checkout`

**Test Cases:**

#### Test 2.1: Chọn địa chỉ có GHN IDs
- [ ] Chọn địa chỉ đã có `ghnDistrictId` và `ghnWardCode`
- [ ] Kiểm tra trong Network tab: Có request tính phí vận chuyển
- [ ] Phí vận chuyển hiển thị trong "Tóm tắt đơn hàng"
- [ ] Thay đổi địa chỉ → Phí vận chuyển tự động tính lại

#### Test 2.2: Chọn địa chỉ không có GHN IDs
- [ ] Chọn địa chỉ cũ (không có GHN IDs)
- [ ] Phí vận chuyển = 0 hoặc "Miễn phí"
- [ ] Không có request tính phí trong Network tab

#### Test 2.3: Thêm địa chỉ mới trong Checkout
- [ ] Click "Thêm địa chỉ mới"
- [ ] Điền form và submit
- [ ] Địa chỉ mới được chọn tự động
- [ ] Phí vận chuyển được tính ngay sau khi chọn

#### Test 2.4: Đặt hàng
- [ ] Chọn địa chỉ có GHN IDs
- [ ] Chọn phương thức thanh toán
- [ ] Click "Đặt hàng"
- [ ] Kiểm tra trong Network tab: Request tạo order có `shippingFee`
- [ ] Kiểm tra trong Database: Order có `ghnDistrictId`, `ghnWardCode`, `shippingFee`

---

### 3. Test Order Detail

**URL:** `/orders/:id`

**Test Cases:**

#### Test 3.1: Đơn hàng có GHN Order Code
- [ ] Mở đơn hàng đã được admin confirm (có `ghnOrderCode`)
- [ ] Hiển thị "Mã vận đơn GHN" trong thông tin đơn hàng
- [ ] Click link "Tra cứu" → Mở trang GHN tracking

#### Test 3.2: Đơn hàng chưa có GHN Order Code
- [ ] Mở đơn hàng mới (chưa được admin confirm)
- [ ] Không hiển thị "Mã vận đơn GHN"

---

### 4. Test Admin Order Management

**URL:** `/admin/orders`

**Test Cases:**

#### Test 4.1: Confirm Order
- [ ] Admin confirm một đơn hàng
- [ ] Kiểm tra trong Network tab: Có request tạo GHN shipping order
- [ ] Kiểm tra trong Database: Order có `ghnOrderCode`
- [ ] Kiểm tra trong Logs: GHN API được gọi thành công

#### Test 4.2: Cancel Order
- [ ] Admin cancel một đơn hàng đã có `ghnOrderCode`
- [ ] Kiểm tra trong Network tab: Có request cancel GHN order
- [ ] Kiểm tra trong Logs: GHN cancel API được gọi

---

## 🐛 Common Issues & Solutions

### Issue 1: 401 Unauthorized từ GHN API
**Nguyên nhân:**
- `GHN_TOKEN` không đúng
- Header không đúng format (phải là `token`, không phải `Token`)

**Giải pháp:**
- Kiểm tra `GHN_TOKEN` trong `.env`
- Kiểm tra `ghnService.js` - header phải là `'token': GHN_TOKEN`

---

### Issue 2: 400 Bad Request - "Vui lòng cung cấp provinceId"
**Nguyên nhân:**
- Request body không đúng format
- `provinceId` gửi lên là string thay vì number

**Giải pháp:**
- Kiểm tra frontend gửi `provinceId` là number
- Kiểm tra backend parse đúng

---

### Issue 3: Phí vận chuyển = 0
**Nguyên nhân:**
- Địa chỉ không có GHN IDs
- GHN API trả về lỗi (nhưng không hiển thị)

**Giải pháp:**
- Kiểm tra địa chỉ có `ghnDistrictId` và `ghnWardCode`
- Kiểm tra Console logs để xem lỗi từ GHN API
- Kiểm tra Network tab để xem response từ API

---

### Issue 4: Dropdown Tỉnh/Quận/Phường không load
**Nguyên nhân:**
- API endpoint không đúng
- CORS issue
- Backend chưa chạy

**Giải pháp:**
- Kiểm tra Network tab: Request có được gửi không?
- Kiểm tra Console: Có lỗi JavaScript không?
- Kiểm tra Backend logs: API có được gọi không?

---

### Issue 5: GHN Order Code không được tạo
**Nguyên nhân:**
- Admin confirm order nhưng GHN API fail
- `ghnShopId` không đúng
- Địa chỉ không có GHN IDs

**Giải pháp:**
- Kiểm tra Backend logs khi admin confirm
- Kiểm tra `GHN_SHOP_ID` trong `.env`
- Kiểm tra Order có `ghnDistrictId` và `ghnWardCode` không

---

## 📊 Test Coverage

### Backend APIs
- [x] Get Provinces
- [x] Get Districts
- [x] Get Wards
- [x] Calculate Shipping Fee
- [x] Get Available Services
- [x] Get Lead Time
- [x] Get Tracking (với auth)
- [x] Cancel Shipping (với auth)
- [x] Error Handling

### Frontend Features
- [x] Address Management (Add/Edit với GHN IDs)
- [x] Checkout (Tính phí vận chuyển)
- [x] Order Detail (Hiển thị tracking code)
- [x] Admin Order Management (Tạo/cancel GHN order)

### Database
- [x] Address table có `ghnDistrictId`, `ghnWardCode`
- [x] Order table có `ghnOrderCode`, `ghnShopId`, `ghnDistrictId`, `ghnWardCode`, `shippingFee`

---

## ✅ Sign-off

Sau khi test xong, đánh dấu các mục đã test và ghi chú nếu có lỗi:

**Tester:** _________________

**Date:** _________________

**Notes:**
- 
- 
- 

