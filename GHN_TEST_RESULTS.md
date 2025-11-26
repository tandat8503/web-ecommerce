# Kết Quả Test GHN Endpoints

## 📋 Tóm tắt

Script test đã được cập nhật để chỉ test **2 API chính**:
1. **Get Provinces** - Lấy danh sách tỉnh/thành phố
2. **Calculate Shipping Fee** - Tính phí vận chuyển

---

## 🚀 Cách chạy test

### Bước 1: Đảm bảo backend server đang chạy

```bash
cd backend
npm run dev
```

### Bước 2: Chạy script test

```bash
cd backend
npm run test:ghn:endpoints
```

Hoặc:

```bash
cd backend
node scripts/test-ghn-endpoints.js
```

---

## 📥 Input Params

### 1. Get Provinces
**Không cần input params** - Endpoint này trả về tất cả tỉnh/thành phố

**URL:**
```
GET http://localhost:5000/api/shipping/provinces
```

---

### 2. Calculate Shipping Fee

**Input Params (Query String cho GET):**

| Param | Type | Required | Mô tả | Ví dụ |
|-------|------|----------|-------|-------|
| `toDistrictId` | number | ✅ YES | ID quận/huyện nhận hàng | `1451` |
| `toWardCode` | string | ✅ YES | Mã phường/xã nhận hàng | `1A0401` |
| `weight` | number | ❌ NO | Trọng lượng (gram), mặc định 1000 | `1000` |
| `length` | number | ❌ NO | Chiều dài (cm), mặc định 20 | `20` |
| `width` | number | ❌ NO | Chiều rộng (cm), mặc định 20 | `20` |
| `height` | number | ❌ NO | Chiều cao (cm), mặc định 20 | `20` |
| `serviceTypeId` | number | ❌ NO | Loại dịch vụ (2: Standard, 5: Express), mặc định 2 | `2` |
| `insuranceValue` | number | ❌ NO | Giá trị đơn hàng (để tính bảo hiểm), mặc định 0 | `500000` |

**URL ví dụ:**
```
GET http://localhost:5000/api/shipping/calculate-fee?toDistrictId=1451&toWardCode=1A0401&weight=1000&length=20&width=20&height=20&serviceTypeId=2&insuranceValue=500000
```

---

## 📤 Output Params

### 1. Get Provinces - Output

**Response Format:**
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

**Useful Params:**

| Param | Type | Mô tả | Cách sử dụng |
|-------|------|-------|--------------|
| `code` | string | ⭐⭐⭐ **Mã tỉnh/thành phố** | Dùng cho dropdown frontend, lưu vào database |
| `name` | string | ⭐⭐⭐ **Tên tỉnh/thành phố** | Hiển thị cho user, lưu vào database Address.city |

---

### 2. Calculate Shipping Fee - Output

**Response Format:**
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

**Useful Params:**

| Param | Type | Mô tả | Cách sử dụng |
|-------|------|-------|--------------|
| `totalFee` | number | ⭐⭐⭐ **Tổng phí vận chuyển (VNĐ)** | **QUAN TRỌNG**: Hiển thị cho user, tính vào tổng đơn hàng |
| `total` | number | ⭐⭐⭐ **Tổng phí (alias)** | Dùng để hiển thị (giống totalFee) |
| `serviceFee` | number | ⭐⭐ Phí dịch vụ cơ bản (VNĐ) | Thông tin chi tiết, có thể hiển thị breakdown |
| `insuranceFee` | number | ⭐ Phí bảo hiểm (VNĐ) | Nếu có insuranceValue > 0 |

**Các params khác:**
- `pickStationFee`, `couponValue`, `r2sFee`, etc. - Thông tin chi tiết, ít dùng

---

## 💡 Cách sử dụng hợp lý

### Flow 1: Lấy danh sách tỉnh/thành phố

```javascript
// Frontend
const response = await getGHNProvinces();
const provinces = response.data.data;

// Lưu vào dropdown
provinces.forEach(p => {
  dropdown.addOption(p.code, p.name);
});

// Khi user chọn
const selectedProvince = provinces.find(p => p.code === selectedCode);
// selectedProvince.code = "202" → Dùng để gọi Get Districts
// selectedProvince.name = "Thành phố Hồ Chí Minh" → Lưu vào Address.city
```

---

### Flow 2: Tính phí vận chuyển

```javascript
// Frontend: Khi user chọn địa chỉ có GHN IDs
const address = selectedAddress; // Có ghnDistrictId và ghnWardCode

// Tính tổng trọng lượng từ giỏ hàng
const totalWeight = cartItems.reduce((sum, item) => {
  return sum + (item.quantity * (item.product.weight || 500)); // 500g mặc định
}, 0);

// Tính kích thước (ước tính)
const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
const estimatedLength = Math.ceil(Math.cbrt(totalItems)) * 20;

// Gọi API tính phí
const response = await calculateGHNShippingFee({
  toDistrictId: address.ghnDistrictId,
  toWardCode: address.ghnWardCode,
  weight: totalWeight || 1000,
  length: estimatedLength || 20,
  width: 20,
  height: 20,
  serviceTypeId: 2, // Standard
  insuranceValue: cartTotal // Tổng giá trị đơn hàng
});

const shippingFee = response.data.data.totalFee; // 30000 VNĐ

// Hiển thị cho user
displayShippingFee(shippingFee); // "30,000 VNĐ"

// Tính tổng đơn hàng
const orderTotal = cartTotal + shippingFee;
displayOrderTotal(orderTotal);
```

---

## ⚠️ Lưu ý quan trọng

### 1. Get Provinces
- ✅ Không cần input params
- ✅ Trả về array các tỉnh/thành phố
- ⚠️ Nếu lỗi 401: Kiểm tra `GHN_TOKEN` trong `.env`
- ⚠️ Nếu lỗi 500: Có thể GHN API đang lỗi hoặc token không hợp lệ

### 2. Calculate Shipping Fee
- ✅ **Bắt buộc có `toDistrictId` và `toWardCode`**
- ✅ Các params khác có giá trị mặc định
- ⚠️ Nếu Address không có GHN IDs → Không thể tính phí
- ⚠️ `totalFee` là số tiền thật (VNĐ), dùng để tính tổng đơn hàng

---

## 🔍 Test thủ công

### Test Get Provinces trong Browser:
```
http://localhost:5000/api/shipping/provinces
```

### Test Calculate Fee trong Browser:
```
http://localhost:5000/api/shipping/calculate-fee?toDistrictId=1451&toWardCode=1A0401&weight=1000
```

### Test với curl:
```bash
# Get Provinces
curl http://localhost:5000/api/shipping/provinces

# Calculate Fee
curl "http://localhost:5000/api/shipping/calculate-fee?toDistrictId=1451&toWardCode=1A0401&weight=1000&length=20&width=20&height=20&serviceTypeId=2&insuranceValue=500000"
```

---

## ✅ Checklist

- [ ] Backend server đang chạy (`npm run dev`)
- [ ] Shipping routes đã được đăng ký trong `routes/index.js`
- [ ] `GHN_TOKEN` đã được set trong `.env` (hoặc dùng `GHN_USE_MOCK=true`)
- [ ] Test Get Provinces → Trả về danh sách tỉnh/thành phố
- [ ] Test Calculate Fee → Trả về phí vận chuyển (totalFee > 0)

---

## 📊 Kết quả mong đợi

Khi test thành công, bạn sẽ thấy:

```
✅ Passed: 2
❌ Failed: 0
```

Và script sẽ hiển thị:
- ✅ Input params chi tiết
- ✅ Output params với đánh dấu params hữu ích (⭐)
- ✅ Usage guide cho từng endpoint

