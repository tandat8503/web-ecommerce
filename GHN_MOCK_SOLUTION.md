# Giải Pháp Mock Service cho GHN

## 🎯 Vấn đề

1. **GHN không có môi trường test thật sự**
   - Dev API (`dev-online-gateway.ghn.vn`) vẫn tạo đơn thật
   - Vẫn bị giới hạn số lượng đơn

2. **Bị giới hạn số lượng đơn tạo**
   - Không thể test nhiều lần
   - Mỗi lần test = 1 đơn thật trên GHN

3. **Không thể chuyển POST sang GET**
   - GHN API yêu cầu POST cho các endpoint đó
   - GET có giới hạn độ dài URL
   - POST phù hợp hơn cho dữ liệu phức tạp

---

## ✅ Giải Pháp: Mock Service

Đã tạo **Mock Service** để test mà không cần gọi GHN API thật.

### Cách sử dụng:

#### 1. Bật Mock Service

Thêm vào file `backend/.env`:

```env
# Bật mock service (không gọi GHN API thật)
GHN_USE_MOCK=true

# Hoặc dùng dev API của GHN (vẫn tạo đơn thật nhưng ít giới hạn hơn)
GHN_IS_PRODUCTION=false
```

#### 2. Mock Service sẽ:

- ✅ **Không gọi GHN API thật** → Không bị giới hạn
- ✅ **Trả về dữ liệu giả** → Test logic code dễ dàng
- ✅ **Tạo mã đơn giả** → Test flow tạo đơn không giới hạn
- ✅ **Tính phí giả** → Test UI hiển thị phí vận chuyển

---

## 📋 So sánh các phương án

| Phương án | Ưu điểm | Nhược điểm |
|-----------|---------|------------|
| **Mock Service** | ✅ Không giới hạn<br>✅ Test nhanh<br>✅ Không tốn tiền | ❌ Dữ liệu không thật<br>❌ Không test được GHN API thật |
| **GHN Dev API** | ✅ Dữ liệu thật<br>✅ Test được API thật | ❌ Vẫn bị giới hạn<br>❌ Vẫn tạo đơn thật |
| **GHN Production** | ✅ Dữ liệu thật<br>✅ Đầy đủ tính năng | ❌ Bị giới hạn nhiều<br>❌ Tốn tiền<br>❌ Không nên test |

---

## 🔧 Cấu hình

### Option 1: Dùng Mock Service (Khuyến nghị cho Development)

```env
# backend/.env
GHN_USE_MOCK=true
GHN_TOKEN=not_needed_when_mock
GHN_SHOP_ID=not_needed_when_mock
```

**Khi nào dùng:**
- ✅ Development
- ✅ Testing logic code
- ✅ Testing UI/UX
- ✅ Không cần dữ liệu thật từ GHN

---

### Option 2: Dùng GHN Dev API

```env
# backend/.env
GHN_USE_MOCK=false
GHN_IS_PRODUCTION=false
GHN_TOKEN=your_dev_token
GHN_SHOP_ID=your_dev_shop_id
```

**Khi nào dùng:**
- ✅ Test tích hợp với GHN API thật
- ✅ Verify API response format
- ✅ Test với dữ liệu thật từ GHN

**Lưu ý:**
- Vẫn tạo đơn thật trên GHN (nhưng không giao hàng)
- Vẫn bị giới hạn số lượng đơn

---

### Option 3: Dùng GHN Production (Chỉ khi deploy)

```env
# backend/.env
GHN_USE_MOCK=false
GHN_IS_PRODUCTION=true
GHN_TOKEN=your_production_token
GHN_SHOP_ID=your_production_shop_id
```

**Khi nào dùng:**
- ✅ Production environment
- ✅ Đơn hàng thật của khách

---

## 🧪 Test với Mock Service

### 1. Bật Mock Service

```bash
# backend/.env
GHN_USE_MOCK=true
```

### 2. Chạy backend

```bash
cd backend
npm run dev
```

### 3. Test các API

```bash
# Test get provinces
curl http://localhost:5000/api/shipping/provinces

# Test calculate fee
curl -X POST http://localhost:5000/api/shipping/calculate-fee \
  -H "Content-Type: application/json" \
  -d '{
    "toDistrictId": 1451,
    "toWardCode": "1A0401",
    "weight": 1000
  }'
```

### 4. Kiểm tra logs

Bạn sẽ thấy log:
```
⚠️ [WARN] GHN: Đang sử dụng MOCK SERVICE - Không gọi API GHN thật!
```

---

## 📊 Mock Data

Mock service trả về:

### Provinces
- Hồ Chí Minh (202)
- Hà Nội (201)
- Đồng Nai (203)
- Bình Dương (204)

### Districts (HCM)
- Quận 1 (1451)
- Quận 2 (1452)
- Quận 3 (1453)
- Quận 4 (1454)
- Quận 5 (1455)

### Wards (Quận 1)
- Phường Bến Nghé (1A0401)
- Phường Đa Kao (1A0402)
- Phường Bến Thành (1A0403)
- Phường Nguyễn Thái Bình (1A0404)

### Shipping Fee
- Phí cơ bản: 20,000 VNĐ
- Phí theo trọng lượng: 5,000 VNĐ/1kg
- Tổng = 20,000 + (weight/1000 * 5,000)

### Order Code
- Format: `GHN{timestamp}{random}`
- Ví dụ: `GHN1703123456789123`

---

## ⚠️ Lưu ý

1. **Mock Service chỉ dùng cho Development/Testing**
   - Không dùng trong Production
   - Dữ liệu không phải từ GHN thật

2. **Khi deploy Production:**
   - Set `GHN_USE_MOCK=false`
   - Set `GHN_IS_PRODUCTION=true`
   - Dùng token và shop ID thật

3. **Test với GHN thật:**
   - Dùng `GHN_IS_PRODUCTION=false` (dev API)
   - Hoặc test trực tiếp trên Production (cẩn thận!)

---

## 🔄 Workflow đề xuất

### Development
```env
GHN_USE_MOCK=true  # Dùng mock để test nhanh
```

### Staging/Pre-production
```env
GHN_USE_MOCK=false
GHN_IS_PRODUCTION=false  # Dùng dev API để test tích hợp
```

### Production
```env
GHN_USE_MOCK=false
GHN_IS_PRODUCTION=true  # Dùng production API
```

---

## 📝 Tùy chỉnh Mock Data

Nếu muốn thay đổi mock data, sửa file:
```
backend/services/shipping/ghnServiceMock.js
```

Ví dụ: Thêm tỉnh mới, thay đổi công thức tính phí, etc.

---

## ✅ Kết luận

**Không thể chuyển POST sang GET**, nhưng có giải pháp tốt hơn:

1. ✅ **Mock Service** - Test không giới hạn, không tốn tiền
2. ✅ **GHN Dev API** - Test với API thật (vẫn bị giới hạn)
3. ✅ **Feature Flag** - Dễ dàng switch giữa mock và real

**Khuyến nghị:** Dùng Mock Service cho development, GHN Dev API cho staging, Production API cho production.

