# GHN API Methods - GET vs POST

## 📋 Tổng quan

Trong tích hợp GHN, có **7 API dùng POST** và **2 API dùng GET**.

---

## 🔵 API dùng POST (7 endpoints)

### 1. Master Data APIs

#### 1.1. Get Districts
```
POST /master-data/district
```
**Body:**
```json
{
  "province_id": 202
}
```
**Lý do dùng POST:** GHN yêu cầu gửi `province_id` trong body để lọc districts theo tỉnh.

---

#### 1.2. Get Wards
```
POST /master-data/ward
```
**Body:**
```json
{
  "district_id": 1451
}
```
**Lý do dùng POST:** GHN yêu cầu gửi `district_id` trong body để lọc wards theo quận/huyện.

---

### 2. Shipping Order APIs

#### 2.1. Calculate Shipping Fee
```
POST /v2/shipping-order/fee
```
**Body:**
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
**Lý do dùng POST:** Cần gửi nhiều thông tin (kích thước, trọng lượng, địa chỉ) trong body để tính phí.

---

#### 2.2. Get Available Services
```
POST /v2/shipping-order/available-services
```
**Body:**
```json
{
  "shop_id": 885,
  "from_district": 1442,
  "to_district": 1820,
  "to_ward": "030712"
}
```
**Lý do dùng POST:** Cần gửi thông tin địa chỉ gửi/nhận để GHN trả về danh sách dịch vụ khả dụng.

---

#### 2.3. Get Lead Time
```
POST /v2/shipping-order/leadtime
```
**Body:**
```json
{
  "from_district_id": 1442,
  "from_ward_code": "21211",
  "to_district_id": 1820,
  "to_ward_code": "030712",
  "service_id": 53321
}
```
**Lý do dùng POST:** Cần gửi thông tin địa chỉ và service_id để tính thời gian giao hàng.

---

#### 2.4. Create Shipping Order
```
POST /v2/shipping-order/create
```
**Body:**
```json
{
  "payment_type_id": 1,
  "note": "Giao giờ hành chính",
  "required_note": "CHOXEMHANGKHONGTHU",
  "from_name": "Cửa hàng ABC",
  "from_phone": "0123456789",
  "from_address": "123 Đường XYZ",
  "to_name": "Nguyễn Văn A",
  "to_phone": "0987654321",
  "to_address": "456 Đường DEF",
  "to_ward_code": "1A0401",
  "to_district_id": 1451,
  "cod_amount": 500000,
  "weight": 1000,
  "length": 20,
  "width": 20,
  "height": 20,
  "insurance_value": 500000,
  "service_type_id": 2,
  "items": [...]
}
```
**Lý do dùng POST:** Tạo đơn hàng mới cần gửi toàn bộ thông tin đơn hàng trong body.

---

#### 2.5. Cancel Shipping Order
```
POST /v2/shipping-order/cancel
```
**Body:**
```json
{
  "order_codes": ["GHN123456789"]
}
```
**Lý do dùng POST:** Cần gửi danh sách mã đơn hàng cần hủy trong body (có thể hủy nhiều đơn cùng lúc).

---

## 🟢 API dùng GET (2 endpoints)

### 1. Get Provinces
```
GET /master-data/province
```
**Lý do dùng GET:** Không cần params, chỉ cần lấy toàn bộ danh sách tỉnh/thành phố.

---

### 2. Get Order Detail
```
GET /v2/shipping-order/detail?order_code=GHN123456789
```
**Lý do dùng GET:** Chỉ cần truyền `order_code` qua query parameter để lấy thông tin đơn hàng.

---

## 📊 Tóm tắt

| Method | Số lượng | Endpoints |
|--------|----------|-----------|
| **POST** | **7** | Get Districts, Get Wards, Calculate Fee, Available Services, Lead Time, Create Order, Cancel Order |
| **GET** | **2** | Get Provinces, Get Order Detail |

---

## 💡 Lý do GHN dùng POST cho nhiều API

1. **Bảo mật:** POST không expose params trong URL (query string)
2. **Dữ liệu phức tạp:** Nhiều API cần gửi nhiều thông tin (địa chỉ, kích thước, trọng lượng, etc.)
3. **Tiêu chuẩn REST:** POST phù hợp cho các thao tác tạo mới hoặc tính toán phức tạp
4. **Không cache:** POST requests thường không bị cache bởi browser/proxy

---

## 🔍 So sánh với Backend Wrapper

Backend của bạn cũng dùng POST cho các endpoint tương ứng:

```javascript
// Backend routes
router.post('/districts', ...)           // → POST /master-data/district
router.post('/wards', ...)               // → POST /master-data/ward
router.post('/calculate-fee', ...)        // → POST /v2/shipping-order/fee
router.post('/available-services', ...)  // → POST /v2/shipping-order/available-services
router.post('/leadtime', ...)            // → POST /v2/shipping-order/leadtime
router.post('/cancel/:ghnOrderCode', ...) // → POST /v2/shipping-order/cancel

// GET endpoints
router.get('/provinces', ...)            // → GET /master-data/province
router.get('/tracking/:ghnOrderCode', ...) // → GET /v2/shipping-order/detail
```

---

## ✅ Kết luận

**Tất cả 7 API quan trọng của GHN đều dùng POST**, chỉ có 2 API đơn giản dùng GET:
- Get Provinces (không cần params)
- Get Order Detail (chỉ cần order_code)

Việc dùng POST là hợp lý vì:
- ✅ Bảo mật hơn (không expose data trong URL)
- ✅ Hỗ trợ dữ liệu phức tạp
- ✅ Phù hợp với RESTful best practices

