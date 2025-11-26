# GHN API Documentation - Chi tiết Input/Output

## 📋 Mục lục
1. [Base URLs](#base-urls)
2. [Endpoint GHN gốc](#endpoint-ghn-gốc)
3. [Endpoint Backend Wrapper](#endpoint-backend-wrapper)
4. [Chi tiết Input/Output](#chi-tiết-inputoutput)

---

## Base URLs

### Production
```
https://online-gateway.ghn.vn/shiip/public-api
```

### Development (Test)
```
https://dev-online-gateway.ghn.vn/shiip/public-api
```

### Lưu ý về URL:
- **Master Data API** (Province, District, Ward): Không có `/v2`
  - Format: `{BASE_URL}/master-data/{endpoint}`
  
- **Shipping Order API** (Fee, Create, Detail, Cancel, etc.): Có `/v2`
  - Format: `{BASE_URL}/v2/shipping-order/{endpoint}`

---

## Endpoint GHN gốc

### 1. Master Data APIs

#### 1.1. Get Province
**GHN Endpoint:** `GET /master-data/province`

**Headers:**
```
Content-Type: application/json
token: {GHN_TOKEN}
```

**Input:** Không cần params

**Output (GHN):**
```json
{
  "code": 200,
  "message": "Success",
  "data": [
    {
      "ProvinceID": 202,
      "ProvinceName": "Thành phố Hồ Chí Minh"
    },
    {
      "ProvinceID": 201,
      "ProvinceName": "Thành phố Hà Nội"
    }
  ]
}
```

---

#### 1.2. Get District
**GHN Endpoint:** `POST /master-data/district`

**Headers:**
```
Content-Type: application/json
token: {GHN_TOKEN}
```

**Input (Body):**
```json
{
  "province_id": 202
}
```

**Output (GHN):**
```json
{
  "code": 200,
  "message": "Success",
  "data": [
    {
      "DistrictID": 1451,
      "ProvinceID": 202,
      "DistrictName": "Quận 1"
    },
    {
      "DistrictID": 1452,
      "ProvinceID": 202,
      "DistrictName": "Quận 2"
    }
  ]
}
```

---

#### 1.3. Get Ward
**GHN Endpoint:** `POST /master-data/ward`

**Headers:**
```
Content-Type: application/json
token: {GHN_TOKEN}
```

**Input (Body):**
```json
{
  "district_id": 1451
}
```

**Output (GHN):**
```json
{
  "code": 200,
  "message": "Success",
  "data": [
    {
      "WardCode": "1A0401",
      "DistrictID": 1451,
      "WardName": "Phường Bến Nghé"
    },
    {
      "WardCode": "1A0402",
      "DistrictID": 1451,
      "WardName": "Phường Đa Kao"
    }
  ]
}
```

---

### 2. Calculate Fee APIs

#### 2.1. Calculate Shipping Fee
**GHN Endpoint:** `POST /v2/shipping-order/fee`

**Headers:**
```
Content-Type: application/json
token: {GHN_TOKEN}
ShopId: {GHN_SHOP_ID}
```

**Input (Body):**
```json
{
  "service_type_id": 2,
  "from_district_id": 1442,
  "from_ward_code": "21211",
  "to_district_id": 1820,
  "to_ward_code": "030712",
  "length": 30,
  "width": 40,
  "height": 20,
  "weight": 3000,
  "insurance_value": 0,
  "cod_amount": 0
}
```

**Giải thích params:**
- `service_type_id` (number): Loại dịch vụ (2: Standard, 5: Express)
- `from_district_id` (number): District ID địa chỉ gửi hàng
- `from_ward_code` (string): Ward Code địa chỉ gửi hàng
- `to_district_id` (number): District ID địa chỉ nhận hàng
- `to_ward_code` (string): Ward Code địa chỉ nhận hàng
- `length`, `width`, `height` (number): Kích thước (cm)
- `weight` (number): Trọng lượng (gram)
- `insurance_value` (number): Giá trị đơn hàng (để tính bảo hiểm)
- `cod_amount` (number): Số tiền thu hộ (nếu COD)

**Output (GHN):**
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "total": 30000,
    "service_fee": 25000,
    "insurance_fee": 0,
    "pick_station_fee": 0,
    "coupon_value": 0,
    "r2s_fee": 0,
    "return_again_fee": 0,
    "document_return": 0,
    "double_check": 0,
    "cod_fee": 0,
    "pick_remote_areas_fee": 0,
    "deliver_remote_areas_fee": 0,
    "cod_failed_fee": 0
  }
}
```

---

#### 2.2. Get Available Services
**GHN Endpoint:** `POST /v2/shipping-order/available-services`

**Headers:**
```
Content-Type: application/json
token: {GHN_TOKEN}
ShopId: {GHN_SHOP_ID}
```

**Input (Body):**
```json
{
  "from_district_id": 1442,
  "to_district_id": 1820,
  "to_ward_code": "030712"
}
```

**Output (GHN):**
```json
{
  "code": 200,
  "message": "Success",
  "data": [
    {
      "service_id": 53321,
      "service_type_id": 2,
      "short_name": "Tiêu chuẩn",
      "service_type_name": "Chuyển phát tiêu chuẩn"
    },
    {
      "service_id": 53320,
      "service_type_id": 5,
      "short_name": "Nhanh",
      "service_type_name": "Chuyển phát nhanh"
    }
  ]
}
```

---

#### 2.3. Calculate Lead Time
**GHN Endpoint:** `POST /v2/shipping-order/leadtime`

**Headers:**
```
Content-Type: application/json
token: {GHN_TOKEN}
ShopId: {GHN_SHOP_ID}
```

**Input (Body):**
```json
{
  "from_district_id": 1442,
  "from_ward_code": "21211",
  "to_district_id": 1820,
  "to_ward_code": "030712",
  "service_id": 53321
}
```

**Output (GHN):**
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "leadtime": 1717081200,
    "order_date": "2024-05-29",
    "timestamp": 1716994800
  }
}
```

---

### 3. Order Management APIs

#### 3.1. Create Shipping Order
**GHN Endpoint:** `POST /v2/shipping-order/create`

**Headers:**
```
Content-Type: application/json
token: {GHN_TOKEN}
ShopId: {GHN_SHOP_ID}
```

**Input (Body):**
```json
{
  "payment_type_id": 1,
  "note": "Giao giờ hành chính",
  "required_note": "CHOXEMHANGKHONGTHU",
  "from_name": "Cửa hàng ABC",
  "from_phone": "0123456789",
  "from_address": "123 Đường XYZ",
  "from_ward_name": "Phường ABC",
  "from_district_name": "Quận 1",
  "from_province_name": "Hồ Chí Minh",
  "to_name": "Nguyễn Văn A",
  "to_phone": "0987654321",
  "to_address": "456 Đường DEF",
  "to_ward_code": "1A0401",
  "to_district_id": 1451,
  "to_ward_name": "Phường Bến Nghé",
  "to_district_name": "Quận 1",
  "to_province_name": "Hồ Chí Minh",
  "cod_amount": 500000,
  "weight": 1000,
  "length": 20,
  "width": 20,
  "height": 20,
  "insurance_value": 500000,
  "service_type_id": 2,
  "service_id": 0,
  "client_order_code": "ORDER123",
  "items": [
    {
      "name": "Sản phẩm A",
      "code": "SP001",
      "quantity": 1,
      "price": 500000,
      "weight": 1000
    }
  ]
}
```

**Output (GHN):**
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "order_code": "GHN123456789",
    "sort_code": "ABC123",
    "trans_type": "standard",
    "ward_encode": "1A0401",
    "district_encode": "1451",
    "total_fee": 30000,
    "expected_delivery_time": "2024-05-30T00:00:00"
  }
}
```

---

#### 3.2. Get Order Detail
**GHN Endpoint:** `GET /v2/shipping-order/detail`

**Headers:**
```
Content-Type: application/json
token: {GHN_TOKEN}
ShopId: {GHN_SHOP_ID}
```

**Input (Query Params):**
```
order_code: GHN123456789
```

**Output (GHN):**
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "order_code": "GHN123456789",
    "status": "ready_to_pick",
    "created_date": "2024-05-29T10:00:00",
    "updated_date": "2024-05-29T10:30:00",
    "current_status": "ready_to_pick",
    "cod_amount": 500000,
    "total_fee": 30000,
    "expected_delivery_time": "2024-05-30T00:00:00"
  }
}
```

---

#### 3.3. Cancel Order
**GHN Endpoint:** `POST /v2/shipping-order/cancel`

**Headers:**
```
Content-Type: application/json
token: {GHN_TOKEN}
ShopId: {GHN_SHOP_ID}
```

**Input (Body):**
```json
{
  "order_codes": ["GHN123456789"]
}
```

**Output (GHN):**
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "order_codes": ["GHN123456789"]
  }
}
```

---

## Endpoint Backend Wrapper

Backend đã tạo các endpoint wrapper để Frontend gọi dễ dàng hơn, không cần biết về GHN token.

### Base URL Backend
```
http://localhost:5000/api/shipping
```

---

### 1. `GET /api/shipping/provinces`

**Input:** Không cần params

**Output:**
```json
{
  "success": true,
  "message": "Lấy danh sách tỉnh/thành phố thành công",
  "data": [
    {
      "code": "202",
      "name": "Thành phố Hồ Chí Minh"
    },
    {
      "code": "201",
      "name": "Thành phố Hà Nội"
    }
  ]
}
```

**Lưu ý:** Backend đã map từ `ProvinceID` → `code` (string)

---

### 2. `POST /api/shipping/districts`

**Input (Body):**
```json
{
  "provinceId": 202
}
```

**Output:**
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

**Lưu ý:** 
- `code` = DistrictID (string) - dùng cho frontend dropdown
- `districtId` = DistrictID (number) - dùng để gửi lên khi tính phí

---

### 3. `POST /api/shipping/wards`

**Input (Body):**
```json
{
  "districtId": 1451
}
```

**Output:**
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

**Lưu ý:**
- `code` = WardCode (string) - dùng cho frontend dropdown
- `wardCode` = WardCode (string) - dùng để gửi lên khi tính phí

---

### 4. `POST /api/shipping/calculate-fee`

**Input (Body):**
```json
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

**Output:**
```json
{
  "success": true,
  "message": "Tính phí vận chuyển thành công",
  "data": {
    "totalFee": 30000,
    "serviceFee": 25000,
    "insuranceFee": 0,
    "pickStationFee": 0,
    "couponValue": 0,
    "r2sFee": 0,
    "returnAgainFee": 0,
    "documentReturn": 0,
    "doubleCheck": 0,
    "codFee": 0,
    "pickRemoteAreasFee": 0,
    "deliverRemoteAreasFee": 0,
    "codFailedFee": 0,
    "total": 30000
  }
}
```

---

### 5. `POST /api/shipping/available-services`

**Input (Body):**
```json
{
  "toDistrictId": 1451,
  "toWardCode": "1A0401",
  "shopId": 885
}
```

**Output:**
```json
{
  "success": true,
  "message": "Lấy danh sách dịch vụ thành công",
  "data": [
    {
      "service_id": 53321,
      "service_type_id": 2,
      "short_name": "Tiêu chuẩn",
      "service_type_name": "Chuyển phát tiêu chuẩn"
    }
  ]
}
```

---

### 6. `POST /api/shipping/leadtime`

**Input (Body):**
```json
{
  "toDistrictId": 1451,
  "toWardCode": "1A0401",
  "serviceId": 53321
}
```

**Output:**
```json
{
  "success": true,
  "message": "Tính thời gian giao hàng thành công",
  "data": {
    "leadtime": 1717081200,
    "order_date": "2024-05-29",
    "timestamp": 1716994800
  }
}
```

---

### 7. `GET /api/shipping/tracking/:ghnOrderCode`

**Input (Path Param):**
```
ghnOrderCode: GHN123456789
```

**Output:**
```json
{
  "success": true,
  "message": "Lấy thông tin vận đơn thành công",
  "data": {
    "order_code": "GHN123456789",
    "status": "ready_to_pick",
    "created_date": "2024-05-29T10:00:00",
    "updated_date": "2024-05-29T10:30:00",
    "current_status": "ready_to_pick",
    "cod_amount": 500000,
    "total_fee": 30000
  }
}
```

**Lưu ý:** Cần authentication token (Bearer token)

---

### 8. `POST /api/shipping/cancel/:ghnOrderCode`

**Input (Path Param):**
```
ghnOrderCode: GHN123456789
```

**Output:**
```json
{
  "success": true,
  "message": "Hủy đơn vận chuyển thành công"
}
```

**Lưu ý:** Cần authentication token (Bearer token)

---

## Environment Variables cần thiết

```env
# GHN Configuration
GHN_TOKEN=your_token_here
GHN_SHOP_ID=your_shop_id
GHN_IS_PRODUCTION=true  # true = production, false = dev

# Thông tin kho hàng (để tính phí và tạo đơn)
GHN_FROM_DISTRICT_ID=1442
GHN_FROM_WARD_CODE=21211
GHN_FROM_NAME=Tên cửa hàng
GHN_FROM_PHONE=Số điện thoại
GHN_FROM_ADDRESS=Địa chỉ chi tiết
GHN_FROM_WARD=Tên phường/xã
GHN_FROM_DISTRICT=Tên quận/huyện
GHN_FROM_PROVINCE=Tên tỉnh/thành phố
```

---

## Mapping Data Format

### Tại sao cần mapping?

- **GHN API** trả về: `{ ProvinceID: 202, ProvinceName: "Hồ Chí Minh" }`
- **Frontend** đang dùng: `{ code: "202", name: "Hồ Chí Minh" }`
- **Backend** map để không phá vỡ code frontend hiện tại

### Mapping Rules:

1. **Province:**
   - GHN: `ProvinceID` → Backend: `code` (string)
   - GHN: `ProvinceName` → Backend: `name`

2. **District:**
   - GHN: `DistrictID` → Backend: `code` (string) + `districtId` (number)
   - GHN: `DistrictName` → Backend: `name`

3. **Ward:**
   - GHN: `WardCode` → Backend: `code` (string) + `wardCode` (string)
   - GHN: `WardName` → Backend: `name`

---

## Error Handling

Tất cả các endpoint đều trả về format:

**Success:**
```json
{
  "success": true,
  "message": "Thông báo thành công",
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Thông báo lỗi"
}
```

**HTTP Status Codes:**
- `200`: Success
- `400`: Bad Request (thiếu params, params không hợp lệ)
- `401`: Unauthorized (token không hợp lệ)
- `500`: Server Error (lỗi từ GHN API hoặc server)

---

## Tài liệu tham khảo

- [GHN API Documentation](https://api.ghn.vn/home/docs)
- [GHN API Detail - Calculate Fee](https://api.ghn.vn/home/docs/detail?id=78)

---

## Lưu ý quan trọng

1. **Token Header:** GHN yêu cầu header là `token` (chữ thường), không phải `Token`
2. **ShopId:** Một số API không cần ShopId (như Get Province, Get District, Get Ward)
3. **URL Format:** 
   - Master Data: Không có `/v2`
   - Shipping Order: Có `/v2`
4. **Production vs Dev:** Kiểm tra `GHN_IS_PRODUCTION` để dùng đúng URL
5. **District ID vs Ward Code:** 
   - District: Dùng `DistrictID` (number)
   - Ward: Dùng `WardCode` (string)


