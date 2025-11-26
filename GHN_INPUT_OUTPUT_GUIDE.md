# GHN API - Hướng Dẫn Input/Output Params

## 📋 Tổng quan

Tài liệu này liệt kê chi tiết **Input params** cần thiết và **Output params** hữu ích cho từng endpoint GHN, cùng cách sử dụng hợp lý.

---

## 1. Get Provinces - Lấy danh sách tỉnh/thành phố

### 📥 Input Params
**Không cần input** - Endpoint này trả về tất cả tỉnh/thành phố

### 📤 Output Params

| Param | Type | Useful | Mô tả |
|-------|------|--------|-------|
| `code` | string | ⭐⭐⭐ | **Mã tỉnh/thành phố** - Dùng cho dropdown frontend, lưu vào database |
| `name` | string | ⭐⭐⭐ | **Tên tỉnh/thành phố** - Hiển thị cho user |

### 💡 Cách sử dụng

```javascript
// Frontend: Lấy danh sách tỉnh
const response = await getGHNProvinces();
const provinces = response.data.data; // [{ code: "202", name: "Thành phố Hồ Chí Minh" }]

// Lưu vào dropdown
provinces.forEach(p => {
  dropdown.addOption(p.code, p.name);
});

// Khi user chọn tỉnh
const selectedProvince = provinces.find(p => p.code === selectedCode);
// selectedProvince.code = "202" → Dùng để gọi Get Districts
```

**Lưu ý:**
- `code` là string (ví dụ: "202")
- Dùng `code` để gọi Get Districts (cần convert sang number)

---

## 2. Get Districts - Lấy danh sách quận/huyện

### 📥 Input Params

| Param | Type | Required | Mô tả |
|-------|------|----------|-------|
| `provinceId` | number | ✅ YES | **ID tỉnh/thành phố** - Lấy từ Get Provinces (convert `code` string → number) |

### 📤 Output Params

| Param | Type | Useful | Mô tả |
|-------|------|--------|-------|
| `code` | string | ⭐⭐ | Mã quận/huyện (string) - Dùng cho dropdown frontend |
| `name` | string | ⭐⭐⭐ | **Tên quận/huyện** - Hiển thị cho user, lưu vào database |
| `districtId` | number | ⭐⭐⭐ | **ID quận/huyện (GHN)** - **QUAN TRỌNG**: Dùng để tính phí và tạo đơn GHN |

### 💡 Cách sử dụng

```javascript
// Frontend: Lấy danh sách quận/huyện
const provinceCode = "202"; // Từ Get Provinces
const provinceId = parseInt(provinceCode); // Convert string → number

const response = await getGHNDistricts(provinceId);
const districts = response.data.data; 
// [{ code: "1451", name: "Quận 1", districtId: 1451 }]

// Lưu vào dropdown
districts.forEach(d => {
  dropdown.addOption(d.code, d.name);
});

// Khi user chọn quận
const selectedDistrict = districts.find(d => d.code === selectedCode);
// selectedDistrict.districtId = 1451 → Dùng để tính phí và tạo đơn
// selectedDistrict.name = "Quận 1" → Lưu vào database Address
```

**Lưu ý:**
- `code` (string) dùng cho dropdown
- `districtId` (number) dùng cho GHN API (tính phí, tạo đơn)
- **Phải lưu cả `name` và `districtId` vào database Address**

---

## 3. Get Wards - Lấy danh sách phường/xã

### 📥 Input Params

| Param | Type | Required | Mô tả |
|-------|------|----------|-------|
| `districtId` | number | ✅ YES | **ID quận/huyện** - Lấy từ Get Districts (`districtId` field) |

### 📤 Output Params

| Param | Type | Useful | Mô tả |
|-------|------|--------|-------|
| `code` | string | ⭐⭐ | Mã phường/xã (string) - Dùng cho dropdown frontend |
| `name` | string | ⭐⭐⭐ | **Tên phường/xã** - Hiển thị cho user, lưu vào database |
| `wardCode` | string | ⭐⭐⭐ | **Mã phường/xã (GHN)** - **QUAN TRỌNG**: Dùng để tính phí và tạo đơn GHN |

### 💡 Cách sử dụng

```javascript
// Frontend: Lấy danh sách phường/xã
const districtId = 1451; // Từ Get Districts (districtId field)

const response = await getGHNWards(districtId);
const wards = response.data.data; 
// [{ code: "1A0401", name: "Phường Bến Nghé", wardCode: "1A0401" }]

// Lưu vào dropdown
wards.forEach(w => {
  dropdown.addOption(w.code, w.name);
});

// Khi user chọn phường
const selectedWard = wards.find(w => w.code === selectedCode);
// selectedWard.wardCode = "1A0401" → Dùng để tính phí và tạo đơn
// selectedWard.name = "Phường Bến Nghé" → Lưu vào database Address
```

**Lưu ý:**
- `code` (string) dùng cho dropdown
- `wardCode` (string) dùng cho GHN API (tính phí, tạo đơn)
- **Phải lưu cả `name` và `wardCode` vào database Address**

---

## 4. Calculate Shipping Fee - Tính phí vận chuyển

### 📥 Input Params

| Param | Type | Required | Mô tả |
|-------|------|----------|-------|
| `toDistrictId` | number | ✅ YES | **ID quận/huyện nhận hàng** - Lấy từ Address.ghnDistrictId |
| `toWardCode` | string | ✅ YES | **Mã phường/xã nhận hàng** - Lấy từ Address.ghnWardCode |
| `weight` | number | ❌ NO | Trọng lượng (gram), mặc định 1000g |
| `length` | number | ❌ NO | Chiều dài (cm), mặc định 20cm |
| `width` | number | ❌ NO | Chiều rộng (cm), mặc định 20cm |
| `height` | number | ❌ NO | Chiều cao (cm), mặc định 20cm |
| `serviceTypeId` | number | ❌ NO | Loại dịch vụ (2: Standard, 5: Express), mặc định 2 |
| `insuranceValue` | number | ❌ NO | Giá trị đơn hàng (để tính bảo hiểm), mặc định 0 |

### 📤 Output Params

| Param | Type | Useful | Mô tả |
|-------|------|--------|-------|
| `totalFee` | number | ⭐⭐⭐ | **Tổng phí vận chuyển (VNĐ)** - **QUAN TRỌNG**: Hiển thị cho user, tính vào tổng đơn hàng |
| `serviceFee` | number | ⭐⭐ | Phí dịch vụ cơ bản (VNĐ) - Thông tin chi tiết |
| `insuranceFee` | number | ⭐ | Phí bảo hiểm (VNĐ) - Nếu có insuranceValue |
| `total` | number | ⭐⭐⭐ | Tổng phí (alias của totalFee) - Dùng để hiển thị |

### 💡 Cách sử dụng

```javascript
// Frontend: Tính phí vận chuyển khi user chọn địa chỉ
const address = selectedAddress; // Address có ghnDistrictId và ghnWardCode

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
displayShippingFee(shippingFee);

// Tính tổng đơn hàng
const orderTotal = cartTotal + shippingFee;
```

**Lưu ý:**
- **Bắt buộc có `ghnDistrictId` và `ghnWardCode`** trong Address
- Nếu Address cũ không có → Phí vận chuyển = 0
- `totalFee` là số tiền thật (VNĐ), dùng để tính tổng đơn hàng

---

## 5. Get Available Services - Lấy danh sách dịch vụ

### 📥 Input Params

| Param | Type | Required | Mô tả |
|-------|------|----------|-------|
| `toDistrictId` | number | ✅ YES | **ID quận/huyện nhận hàng** |
| `toWardCode` | string | ❌ NO | Mã phường/xã nhận hàng (tùy chọn, chính xác hơn nếu có) |
| `shopId` | number | ❌ NO | Shop ID cụ thể (nếu có nhiều shop) |

### 📤 Output Params

| Param | Type | Useful | Mô tả |
|-------|------|--------|-------|
| `service_id` | number | ⭐⭐⭐ | **ID dịch vụ** - **QUAN TRỌNG**: Dùng để tính leadtime và tạo đơn |
| `service_type_id` | number | ⭐⭐ | Loại dịch vụ (2: Standard, 5: Express) |
| `short_name` | string | ⭐⭐ | Tên ngắn dịch vụ - Hiển thị cho user |
| `service_type_name` | string | ⭐⭐ | Tên đầy đủ dịch vụ - Hiển thị cho user |

### 💡 Cách sử dụng

```javascript
// Frontend: Lấy danh sách dịch vụ khả dụng
const address = selectedAddress;

const response = await getGHNAvailableServices({
  toDistrictId: address.ghnDistrictId,
  toWardCode: address.ghnWardCode
});

const services = response.data.data;
// [
//   { service_id: 53321, service_type_id: 2, short_name: "Tiêu chuẩn", ... },
//   { service_id: 53320, service_type_id: 5, short_name: "Nhanh", ... }
// ]

// Hiển thị cho user chọn
services.forEach(s => {
  serviceDropdown.addOption(s.service_id, s.short_name);
});

// Khi user chọn dịch vụ
const selectedService = services.find(s => s.service_id === selectedId);
// selectedService.service_id → Dùng để tính leadtime
```

**Lưu ý:**
- Dùng để cho user chọn loại dịch vụ (Standard/Express)
- `service_id` cần để tính leadtime và tạo đơn

---

## 6. Get Lead Time - Tính thời gian giao hàng

### 📥 Input Params

| Param | Type | Required | Mô tả |
|-------|------|----------|-------|
| `toDistrictId` | number | ✅ YES | **ID quận/huyện nhận hàng** |
| `toWardCode` | string | ❌ NO | Mã phường/xã nhận hàng |
| `serviceId` | number | ✅ YES | **ID dịch vụ** - Lấy từ Get Available Services |

### 📤 Output Params

| Param | Type | Useful | Mô tả |
|-------|------|--------|-------|
| `leadtime` | number | ⭐⭐⭐ | **Timestamp thời gian giao dự kiến** - **QUAN TRỌNG**: Hiển thị cho user khi nào nhận được hàng |
| `order_date` | string | ⭐ | Ngày đặt hàng (YYYY-MM-DD) - Thông tin bổ sung |
| `timestamp` | number | ⭐ | Timestamp hiện tại - Thông tin bổ sung |

### 💡 Cách sử dụng

```javascript
// Frontend: Tính thời gian giao hàng
const address = selectedAddress;
const serviceId = selectedService.service_id; // Từ Get Available Services

const response = await getGHNLeadTime({
  toDistrictId: address.ghnDistrictId,
  toWardCode: address.ghnWardCode,
  serviceId: serviceId
});

const leadtime = response.data.data.leadtime; // Unix timestamp
const deliveryDate = new Date(leadtime * 1000); // Convert sang Date

// Hiển thị cho user
displayDeliveryDate(deliveryDate); // "Dự kiến giao: 30/05/2024"
```

**Lưu ý:**
- `leadtime` là Unix timestamp (seconds), cần * 1000 để convert sang JavaScript Date
- Dùng để hiển thị "Dự kiến giao hàng: ..." cho user

---

## 7. Get Tracking - Lấy thông tin vận đơn

### 📥 Input Params

| Param | Type | Required | Mô tả |
|-------|------|----------|-------|
| `ghnOrderCode` | string | ✅ YES | **Mã đơn hàng GHN** - Lấy từ Order.ghnOrderCode (sau khi admin confirm) |

### 📤 Output Params

| Param | Type | Useful | Mô tả |
|-------|------|--------|-------|
| `order_code` | string | ⭐⭐⭐ | Mã đơn hàng GHN - Hiển thị cho user |
| `status` | string | ⭐⭐⭐ | **Trạng thái đơn hàng** - **QUAN TRỌNG**: Hiển thị trạng thái vận chuyển |
| `created_date` | string | ⭐⭐ | Ngày tạo đơn - Thông tin bổ sung |
| `updated_date` | string | ⭐⭐ | Ngày cập nhật - Thông tin bổ sung |
| `current_status` | string | ⭐⭐ | Trạng thái hiện tại - Thông tin bổ sung |
| `total_fee` | number | ⭐ | Tổng phí vận chuyển - Thông tin bổ sung |

### 💡 Cách sử dụng

```javascript
// Frontend: Lấy thông tin tracking
const order = currentOrder; // Order có ghnOrderCode

if (order.ghnOrderCode) {
  const response = await getGHNShippingTracking(order.ghnOrderCode);
  const tracking = response.data.data;
  
  // Hiển thị trạng thái
  displayTrackingStatus(tracking.status); // "ready_to_pick", "delivering", "delivered"
  
  // Hiển thị mã vận đơn
  displayOrderCode(tracking.order_code); // "GHN123456789"
  
  // Link tra cứu
  const trackingUrl = `https://donhang.ghn.vn/?order_code=${tracking.order_code}`;
  displayTrackingLink(trackingUrl);
}
```

**Lưu ý:**
- Chỉ có đơn hàng đã được admin confirm mới có `ghnOrderCode`
- `status` có thể map sang trạng thái hiển thị cho user

---

## 📊 Tóm tắt Input/Output quan trọng

### Input Params quan trọng nhất:

1. **`provinceId`** (number) - Get Districts
2. **`districtId`** (number) - Get Wards  
3. **`toDistrictId`** (number) - Calculate Fee, Available Services, Lead Time
4. **`toWardCode`** (string) - Calculate Fee, Available Services, Lead Time
5. **`serviceId`** (number) - Get Lead Time

### Output Params quan trọng nhất:

1. **`districtId`** (number) - Từ Get Districts → Lưu vào Address.ghnDistrictId
2. **`wardCode`** (string) - Từ Get Wards → Lưu vào Address.ghnWardCode
3. **`totalFee`** (number) - Từ Calculate Fee → Hiển thị và tính tổng đơn hàng
4. **`service_id`** (number) - Từ Available Services → Dùng cho Lead Time
5. **`leadtime`** (number) - Từ Lead Time → Hiển thị ngày giao dự kiến
6. **`status`** (string) - Từ Tracking → Hiển thị trạng thái vận chuyển

---

## 🔄 Flow sử dụng hợp lý

### Flow 1: User chọn địa chỉ → Tính phí vận chuyển

```
1. User chọn Tỉnh → Get Provinces → Lấy code
2. User chọn Quận → Get Districts(provinceId) → Lấy districtId
3. User chọn Phường → Get Wards(districtId) → Lấy wardCode
4. Lưu Address với: name, districtId, wardCode
5. Khi checkout → Calculate Fee(toDistrictId, toWardCode) → Hiển thị totalFee
```

### Flow 2: Admin confirm đơn → Tạo GHN order

```
1. Admin confirm Order
2. Backend tự động:
   - Lấy Address.ghnDistrictId, Address.ghnWardCode
   - Gọi Create Shipping Order
   - Lưu ghnOrderCode vào Order
3. User xem Order Detail → Hiển thị ghnOrderCode và link tracking
```

---

## ✅ Best Practices

1. **Luôn lưu GHN IDs vào database:**
   - Address: `ghnDistrictId`, `ghnWardCode`
   - Order: `ghnOrderCode`, `ghnShopId`

2. **Validate trước khi tính phí:**
   - Kiểm tra Address có `ghnDistrictId` và `ghnWardCode` không
   - Nếu không có → Phí vận chuyển = 0 hoặc yêu cầu user cập nhật địa chỉ

3. **Hiển thị thông tin rõ ràng:**
   - Phí vận chuyển: Format số tiền (30,000 VNĐ)
   - Thời gian giao: Format ngày (30/05/2024)
   - Trạng thái: Map sang tiếng Việt dễ hiểu

4. **Error handling:**
   - Nếu API fail → Hiển thị "Không thể tính phí, vui lòng thử lại"
   - Không block user đặt hàng nếu không tính được phí

