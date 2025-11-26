# Các API GHN Cần Thiết Cho Web Ecommerce

## 📋 Tổng Quan

Tài liệu này liệt kê các API GHN cần thiết để tích hợp vào hệ thống ecommerce và mục đích sử dụng của từng API.

## 🔑 API Bắt Buộc

### 1. **Get Province** - Lấy danh sách tỉnh/thành phố
- **Endpoint:** `GET /master-data/province`
- **Mục đích:** 
  - Hiển thị dropdown tỉnh/thành phố khi user tạo địa chỉ
  - Lấy ProvinceID để gọi API Get District
- **Headers:** Chỉ cần `token` (không cần ShopId)
- **Đã implement:** ✅ `getProvinces()`

### 2. **Get District** - Lấy danh sách quận/huyện
- **Endpoint:** `POST /master-data/district`
- **Mục đích:**
  - Hiển thị dropdown quận/huyện khi user chọn tỉnh/thành phố
  - Lấy DistrictID để tính phí vận chuyển và tạo đơn hàng
- **Headers:** Chỉ cần `token` (không cần ShopId)
- **Body:** `{ "province_id": 202 }`
- **Đã implement:** ✅ `getDistricts()`

### 3. **Get Ward** - Lấy danh sách phường/xã
- **Endpoint:** `POST /master-data/ward`
- **Mục đích:**
  - Hiển thị dropdown phường/xã khi user chọn quận/huyện
  - Lấy WardCode để tính phí vận chuyển và tạo đơn hàng
- **Headers:** Chỉ cần `token` (không cần ShopId)
- **Body:** `{ "district_id": 1451 }`
- **Đã implement:** ✅ `getWards()`

### 4. **Calculate Fee** - Tính phí vận chuyển
- **Endpoint:** `POST /shipping-order/fee`
- **Mục đích:**
  - Tính phí vận chuyển trước khi user đặt hàng
  - Hiển thị phí vận chuyển trong checkout
  - Cập nhật tổng tiền đơn hàng
- **Headers:** Cần `token` và `ShopId`
- **Body:** 
  ```json
  {
    "from_district_id": 1451,
    "to_district_id": 1442,
    "to_ward_code": "1A0401",
    "weight": 1000,
    "length": 20,
    "width": 20,
    "height": 20,
    "service_type_id": 2
  }
  ```
- **Đã implement:** ✅ `calculateShippingFee()`

### 5. **Create Order** - Tạo đơn vận chuyển
- **Endpoint:** `POST /shipping-order/create`
- **Mục đích:**
  - Tạo đơn vận chuyển trên GHN khi admin xác nhận đơn hàng
  - Lấy mã vận đơn (ghnOrderCode) để tracking
- **Headers:** Cần `token` và `ShopId`
- **Body:** Thông tin đầy đủ về đơn hàng, địa chỉ gửi/nhận, sản phẩm
- **Đã implement:** ✅ `createShippingOrder()`

### 6. **Get Order Info** - Lấy thông tin đơn hàng (Tracking)
- **Endpoint:** `GET /shipping-order/detail`
- **Mục đích:**
  - Tracking đơn hàng cho user
  - Hiển thị trạng thái vận chuyển
  - Cập nhật trạng thái đơn hàng tự động
- **Headers:** Cần `token` và `ShopId`
- **Params:** `order_code` (ghnOrderCode)
- **Đã implement:** ✅ `getShippingOrderInfo()`

### 7. **Cancel Order** - Hủy đơn vận chuyển
- **Endpoint:** `POST /shipping-order/cancel`
- **Mục đích:**
  - Hủy đơn vận chuyển khi user/admin hủy đơn hàng
  - Chỉ hủy được khi đơn chưa được lấy hàng
- **Headers:** Cần `token` và `ShopId`
- **Body:** `{ "order_codes": ["GHN123456"] }`
- **Đã implement:** ✅ `cancelShippingOrder()`

## 📝 API Tùy Chọn (Có Thể Cần Sau)

### 8. **Update Order** - Cập nhật đơn hàng
- **Mục đích:** Cập nhật thông tin đơn hàng (địa chỉ, COD, ...)
- **Khi nào cần:** Khi user muốn thay đổi địa chỉ giao hàng sau khi đã tạo đơn

### 9. **Get Service** - Lấy danh sách dịch vụ vận chuyển
- **Mục đích:** Hiển thị các loại dịch vụ (Standard, Express, ...) để user chọn
- **Khi nào cần:** Khi muốn cho user chọn loại dịch vụ vận chuyển

### 10. **Get Store** - Lấy thông tin cửa hàng
- **Mục đích:** Lấy thông tin cửa hàng đã đăng ký với GHN
- **Khi nào cần:** Kiểm tra thông tin cửa hàng, địa chỉ kho hàng

## 🔄 Luồng Sử Dụng API Trong Ecommerce

### Khi User Tạo Địa Chỉ:
```
1. Get Province → Hiển thị dropdown tỉnh/thành phố
2. User chọn tỉnh → Get District → Hiển thị dropdown quận/huyện
3. User chọn quận → Get Ward → Hiển thị dropdown phường/xã
4. Lưu ProvinceID, DistrictID, WardCode vào database
```

### Khi User Checkout:
```
1. User chọn địa chỉ có DistrictID và WardCode
2. Calculate Fee → Tính phí vận chuyển
3. Hiển thị phí vận chuyển trong summary
4. Tạo đơn hàng với shippingFee đã tính
```

### Khi Admin Xác Nhận Đơn:
```
1. Admin chuyển đơn sang CONFIRMED hoặc PROCESSING
2. Create Order → Tạo đơn vận chuyển trên GHN
3. Lưu ghnOrderCode vào database
4. Cập nhật trackingCode = ghnOrderCode
```

### Khi User Tracking Đơn Hàng:
```
1. User xem chi tiết đơn hàng
2. Get Order Info → Lấy thông tin từ GHN
3. Hiển thị trạng thái vận chuyển, thời gian dự kiến
```

### Khi Hủy Đơn:
```
1. User/Admin hủy đơn hàng
2. Cancel Order → Hủy đơn vận chuyển trên GHN
3. Cập nhật trạng thái đơn hàng
```

## ⚠️ Lưu Ý Quan Trọng

1. **Token vs ShopId:**
   - Tất cả API đều cần `token` (chữ thường)
   - API Master Data (Province, District, Ward) **KHÔNG cần** ShopId
   - API Order (Create, Get, Cancel) **CẦN** ShopId

2. **Naming Convention:**
   - GHN dùng snake_case: `province_id`, `district_id`, `ward_code`
   - Backend convert sang camelCase: `provinceId`, `districtId`, `wardCode`

3. **Environment:**
   - Test: `https://dev-online-gateway.ghn.vn/shiip/public-api/v2`
   - Production: `https://online-gateway.ghn.vn/shiip/public-api/v2`

4. **Error Handling:**
   - Luôn kiểm tra `response.data.code === 200`
   - Log chi tiết lỗi để debug
   - Xử lý lỗi 401 (Token không hợp lệ) và 400 (Thiếu thông tin)

## ✅ Checklist Implementation

- [x] Get Province
- [x] Get District  
- [x] Get Ward
- [x] Calculate Fee
- [x] Create Order
- [x] Get Order Info
- [x] Cancel Order
- [ ] Update Order (tùy chọn)
- [ ] Get Service (tùy chọn)
- [ ] Get Store (tùy chọn)

## 📚 Tài Liệu Tham Khảo

- GHN API Documentation: https://api.ghn.vn/
- Get District API: https://api.ghn.vn/home/docs/detail?id=78
- Create Order API: https://api.ghn.vn/home/docs/detail?id=5



