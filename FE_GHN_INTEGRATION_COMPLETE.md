# ✅ HOÀN THÀNH TÍCH HỢP GHN VÀO FRONTEND

## 📋 Tổng quan

Đã hoàn thành tích hợp GHN API vào Frontend để thay thế `provinces.open-api.vn` và lưu mã GHN vào database.

---

## ✅ Các file đã tạo/cập nhật

### 1. ✅ **Hook mới**: `frontend/src/hooks/useGHNPlaces.js`
**Chức năng:**
- Lấy danh sách tỉnh/quận/phường từ GHN API qua backend
- Transform data để tương thích với code hiện tại
- API endpoints:
  - `GET /api/ghn/provinces` → Trả về `{ ProvinceID, ProvinceName }`
  - `GET /api/ghn/districts?province_id={id}` → Trả về `{ DistrictID, DistrictName }`
  - `GET /api/ghn/wards?district_id={id}` → Trả về `{ WardCode, WardName }`

**Transform data:**
- GHN format → Format tương thích: `{ code, name, id, ...originalFields }`
- ProvinceID → `code` và `id`
- DistrictID → `code` và `id`
- WardCode → `code` và `id` (string)

---

### 2. ✅ **Cập nhật**: `frontend/src/pages/user/profile/address/useAddress.js`

**Thay đổi:**
- ❌ `import { useVietnamesePlaces }` 
- ✅ `import { useGHNPlaces }`

**Cập nhật `handleSubmit`:**
- Thêm mã GHN vào data khi submit:
  ```javascript
  data.provinceId = Number(selectedCodes.provinceCode);
  data.districtId = Number(selectedCodes.districtCode);
  data.wardCode = selectedCodes.wardCode; // String
  ```

**Cập nhật hàm `edit`:**
- **Nếu có mã GHN từ database** → Dùng luôn, load districts/wards
- **Nếu không có mã GHN** → Fallback tìm từ tên (cho địa chỉ cũ)

**Cập nhật handlers:**
- `handleProvinceChange`: Hỗ trợ cả `ProvinceID` và `code`
- `handleDistrictChange`: Hỗ trợ cả `DistrictID` và `code`
- `handleWardChange`: Hỗ trợ cả `WardCode` và `code`

---

### 3. ✅ **Cập nhật**: `frontend/src/pages/user/profile/address/AddressForm.jsx`

**Thay đổi:**
- Cập nhật các `onChange` handlers để hỗ trợ format GHN:
  - `province.name` hoặc `province.ProvinceName`
  - `district.name` hoặc `district.DistrictName`
  - `ward.name` hoặc `ward.WardName`

---

### 4. ✅ **Cập nhật**: `backend/controller/addressController.js`

**Cập nhật `addAddress`:**
```javascript
const { 
  // ... các field cũ
  provinceId,    // ✅ Mới thêm
  districtId,    // ✅ Mới thêm
  wardCode       // ✅ Mới thêm
} = req.body;

await prisma.address.create({
  data: {
    // ... các field cũ
    provinceId: provinceId ? Number(provinceId) : null,
    districtId: districtId ? Number(districtId) : null,
    wardCode: wardCode || null,
  },
});
```

**Cập nhật `updateAddress`:**
- Tương tự, nhận và cập nhật `provinceId`, `districtId`, `wardCode`

---

### 5. ✅ **Cập nhật Checkout**: `frontend/src/pages/user/checkout/useCheckout.js` & `Checkout.jsx`

- ❌ Loại bỏ `useVietnamesePlaces` → ✅ Sử dụng `useGHNPlaces`
- Tạo API mới `frontend/src/api/shipping.js` để gọi `POST /api/ghn/calculate-shipping-fee`
- `useCheckout`:
  - Tính `shippingFee` real-time dựa trên địa chỉ đã chọn và danh sách sản phẩm
  - Sử dụng helper `buildShippingMetrics` (ước lượng trọng lượng & kích thước) gửi cho GHN
  - Fallback phí ship mặc định `30.000đ` nếu không tính được
  - Khi thêm địa chỉ mới trong checkout, tự động lưu `provinceId/districtId/wardCode`
- `Checkout.jsx`:
  - Hiển thị phí vận chuyển thực tế (hoặc trạng thái “Đang tính / Cần cập nhật địa chỉ”)
  - Tổng tiền = `subtotal + shippingFee`

---

## 🔄 Data Flow

### **Khi user tạo địa chỉ mới:**

```
1. User chọn Tỉnh
   ↓
2. handleProvinceChange() 
   → Lưu provinceCode vào selectedCodes
   → Gọi fetchDistricts(provinceId) từ useGHNPlaces
   ↓
3. User chọn Quận
   ↓
4. handleDistrictChange()
   → Lưu districtCode vào selectedCodes
   → Gọi fetchWards(districtId) từ useGHNPlaces
   ↓
5. User chọn Phường
   ↓
6. handleWardChange()
   → Lưu wardCode vào selectedCodes
   ↓
7. User submit form
   ↓
8. handleSubmit()
   → Lấy mã GHN từ selectedCodes:
     - provinceId = selectedCodes.provinceCode
     - districtId = selectedCodes.districtCode
     - wardCode = selectedCodes.wardCode
   → Gửi lên backend kèm tên địa chỉ
   ↓
9. Backend lưu cả tên và mã GHN vào database
```

### **Khi user sửa địa chỉ:**

```
1. Click "Sửa" → edit(addr)

2. Nếu addr có mã GHN (provinceId, districtId, wardCode):
   ✅ Dùng luôn mã GHN
   → Set selectedCodes
   → Load districts/wards từ GHN API
   → Mở dialog

3. Nếu addr không có mã GHN (địa chỉ cũ):
   ⚠️ Fallback tìm từ tên
   → Tìm province từ tên
   → Load districts
   → Tìm district từ tên
   → Load wards
   → Tìm ward từ tên
   → Mở dialog
```

---

## 📊 Data Format

### **GHN API Response → Frontend Format:**

**Provinces:**
```javascript
// GHN API trả về:
{ ProvinceID: 202, ProvinceName: "Hồ Chí Minh" }

// Transform thành:
{ 
  code: 202,           // ← ProvinceID
  id: 202,             // ← ProvinceID
  name: "Hồ Chí Minh", // ← ProvinceName
  ProvinceID: 202,     // ← Giữ nguyên
  ProvinceName: "Hồ Chí Minh"
}
```

**Districts:**
```javascript
// GHN API trả về:
{ DistrictID: 1457, DistrictName: "Quận Phú Nhuận", ProvinceID: 202 }

// Transform thành:
{ 
  code: 1457,              // ← DistrictID
  id: 1457,                // ← DistrictID
  name: "Quận Phú Nhuận",  // ← DistrictName
  provinceId: 202,
  DistrictID: 1457,
  DistrictName: "Quận Phú Nhuận"
}
```

**Wards:**
```javascript
// GHN API trả về:
{ WardCode: "21708", WardName: "Phường 9", DistrictID: 1457 }

// Transform thành:
{ 
  code: "21708",        // ← WardCode (string)
  id: "21708",          // ← WardCode
  name: "Phường 9",     // ← WardName
  districtId: 1457,
  WardCode: "21708",
  WardName: "Phường 9"
}
```

---

## ✅ Tương thích ngược

### **Địa chỉ cũ (không có mã GHN):**
- ✅ Vẫn hoạt động bình thường
- ✅ Khi sửa: Tìm mã từ tên (fallback logic)
- ✅ Khi lưu: Sẽ lưu cả mã GHN (nếu user chọn lại)

### **Địa chỉ mới (có mã GHN):**
- ✅ Load nhanh hơn (không cần tìm từ tên)
- ✅ Chính xác hơn (dùng mã trực tiếp)
- ✅ Tính phí vận chuyển chính xác

---

## 🎯 Kết quả

✅ **Hook GHN mới** đã được tạo và tích hợp
✅ **useAddress** đã được cập nhật để dùng GHN API
✅ **AddressForm** đã hỗ trợ format GHN
✅ **Backend controller** đã lưu mã GHN
✅ **Checkout** hiển thị phí ship thực tế từ GHN
✅ **Tương thích ngược** với địa chỉ cũ
✅ **Logic đúng** theo yêu cầu của project

---

**Ngày hoàn thành:** 2025-11-26  
**Status:** ✅ HOÀN THÀNH

