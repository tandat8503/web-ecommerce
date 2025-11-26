# Test GHN Endpoints bằng GET Method

## 🎯 Mục đích

Đã thêm hỗ trợ **GET method** cho tất cả các endpoint GHN để test dễ dàng hơn trong browser hoặc Postman.

---

## 📋 Các Endpoint GET

### 1. Get Provinces (Đã có sẵn GET)
```
GET /api/shipping/provinces
```

**Test:**
```bash
curl http://localhost:5000/api/shipping/provinces
```

Hoặc mở trong browser:
```
http://localhost:5000/api/shipping/provinces
```

---

### 2. Get Districts (Thêm GET)
```
GET /api/shipping/districts?provinceId=202
```

**Test:**
```bash
curl "http://localhost:5000/api/shipping/districts?provinceId=202"
```

**Browser:**
```
http://localhost:5000/api/shipping/districts?provinceId=202
```

**Response:**
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

---

### 3. Get Wards (Thêm GET)
```
GET /api/shipping/wards?districtId=1451
```

**Test:**
```bash
curl "http://localhost:5000/api/shipping/wards?districtId=1451"
```

**Browser:**
```
http://localhost:5000/api/shipping/wards?districtId=1451
```

**Response:**
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

---

### 4. Calculate Shipping Fee (Thêm GET)
```
GET /api/shipping/calculate-fee?toDistrictId=1451&toWardCode=1A0401&weight=1000&length=20&width=20&height=20
```

**Test:**
```bash
curl "http://localhost:5000/api/shipping/calculate-fee?toDistrictId=1451&toWardCode=1A0401&weight=1000&length=20&width=20&height=20&serviceTypeId=2&insuranceValue=500000"
```

**Browser:**
```
http://localhost:5000/api/shipping/calculate-fee?toDistrictId=1451&toWardCode=1A0401&weight=1000&length=20&width=20&height=20&serviceTypeId=2&insuranceValue=500000
```

**Query Params:**
- `toDistrictId` (required): ID quận/huyện nhận hàng
- `toWardCode` (required): Mã phường/xã nhận hàng
- `weight` (optional): Trọng lượng (gram), mặc định 1000
- `length` (optional): Chiều dài (cm), mặc định 20
- `width` (optional): Chiều rộng (cm), mặc định 20
- `height` (optional): Chiều cao (cm), mặc định 20
- `serviceTypeId` (optional): Loại dịch vụ (2: Standard, 5: Express), mặc định 2
- `insuranceValue` (optional): Giá trị đơn hàng, mặc định 0

**Response:**
```json
{
  "success": true,
  "message": "Tính phí vận chuyển thành công",
  "data": {
    "totalFee": 30000,
    "serviceFee": 25000,
    "total": 30000
  }
}
```

---

### 5. Get Available Services (Thêm GET)
```
GET /api/shipping/available-services?toDistrictId=1451&toWardCode=1A0401
```

**Test:**
```bash
curl "http://localhost:5000/api/shipping/available-services?toDistrictId=1451&toWardCode=1A0401"
```

**Browser:**
```
http://localhost:5000/api/shipping/available-services?toDistrictId=1451&toWardCode=1A0401
```

**Query Params:**
- `toDistrictId` (required): ID quận/huyện nhận hàng
- `toWardCode` (optional): Mã phường/xã nhận hàng
- `shopId` (optional): Shop ID cụ thể

---

### 6. Get Lead Time (Thêm GET)
```
GET /api/shipping/leadtime?toDistrictId=1451&toWardCode=1A0401&serviceId=53321
```

**Test:**
```bash
curl "http://localhost:5000/api/shipping/leadtime?toDistrictId=1451&toWardCode=1A0401&serviceId=53321"
```

**Browser:**
```
http://localhost:5000/api/shipping/leadtime?toDistrictId=1451&toWardCode=1A0401&serviceId=53321
```

**Query Params:**
- `toDistrictId` (required): ID quận/huyện nhận hàng
- `toWardCode` (optional): Mã phường/xã nhận hàng
- `serviceId` (required): ID dịch vụ

---

### 7. Get Tracking (Đã có sẵn GET)
```
GET /api/shipping/tracking/:ghnOrderCode
```

**Test:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/shipping/tracking/GHN123456789
```

---

## 🧪 Test Script

Tạo file `test-ghn-get.sh`:

```bash
#!/bin/bash

API_URL="http://localhost:5000/api/shipping"

echo "=== Test GHN Endpoints với GET Method ==="
echo ""

echo "1. Get Provinces"
curl -s "${API_URL}/provinces" | jq '.'
echo ""

echo "2. Get Districts (HCM - provinceId=202)"
curl -s "${API_URL}/districts?provinceId=202" | jq '.'
echo ""

echo "3. Get Wards (Quận 1 - districtId=1451)"
curl -s "${API_URL}/wards?districtId=1451" | jq '.'
echo ""

echo "4. Calculate Shipping Fee"
curl -s "${API_URL}/calculate-fee?toDistrictId=1451&toWardCode=1A0401&weight=1000" | jq '.'
echo ""

echo "5. Get Available Services"
curl -s "${API_URL}/available-services?toDistrictId=1451&toWardCode=1A0401" | jq '.'
echo ""

echo "6. Get Lead Time"
curl -s "${API_URL}/leadtime?toDistrictId=1451&toWardCode=1A0401&serviceId=53321" | jq '.'
echo ""

echo "=== Test hoàn tất ==="
```

Chạy:
```bash
chmod +x test-ghn-get.sh
./test-ghn-get.sh
```

---

## 📝 Lưu ý

1. **Hỗ trợ cả POST và GET:**
   - Tất cả endpoints đều hỗ trợ cả POST (body) và GET (query)
   - Frontend vẫn dùng POST như bình thường
   - GET chỉ để test dễ dàng hơn

2. **Query Params là String:**
   - Tất cả query params đều là string
   - Backend tự động parse sang number khi cần

3. **URL Encoding:**
   - Khi test trong browser, URL sẽ tự động encode
   - Khi dùng curl, nhớ đặt URL trong dấu ngoặc kép

4. **Ví dụ URL đầy đủ:**
   ```
   http://localhost:5000/api/shipping/calculate-fee?toDistrictId=1451&toWardCode=1A0401&weight=1000&length=20&width=20&height=20&serviceTypeId=2&insuranceValue=500000
   ```

---

## ✅ Kết quả

Bây giờ bạn có thể:
- ✅ Test tất cả endpoints bằng GET trong browser
- ✅ Copy/paste URL để test nhanh
- ✅ Không cần Postman để test cơ bản
- ✅ Frontend vẫn dùng POST như bình thường (không ảnh hưởng)

