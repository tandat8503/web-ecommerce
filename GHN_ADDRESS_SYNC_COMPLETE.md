# ✅ HOÀN THÀNH ĐỒNG BỘ LOGIC GHN CHO ĐỊA CHỈ

## 📋 Tổng quan

Đã đồng bộ logic lấy và lưu mã GHN cho địa chỉ ở **TẤT CẢ** các nơi trong hệ thống để đảm bảo tính phí vận chuyển hoạt động chính xác.

---

## ✅ Các nơi đã đồng bộ

### **1. Trang Quản lý Địa chỉ** (`/profile/address`)

**Files:**
- `frontend/src/pages/user/profile/address/useAddress.js`
- `frontend/src/pages/user/profile/address/AddressForm.jsx`

**Logic:**
- ✅ Dùng `useGHNPlaces()` hook để lấy danh sách Tỉnh/Quận/Phường
- ✅ Lưu mã GHN (`provinceId`, `districtId`, `wardCode`) vào database
- ✅ Validate có mã GHN trước khi lưu

### **2. Trang Checkout** (`/checkout`)

**Files:**
- `frontend/src/pages/user/checkout/useCheckout.js`
- `frontend/src/pages/user/checkout/Checkout.jsx`

**Logic:**
- ✅ Dùng `useGHNPlaces()` hook để lấy danh sách Tỉnh/Quận/Phường
- ✅ Lưu mã GHN khi tạo địa chỉ mới trong checkout
- ✅ Validate có mã GHN trước khi lưu
- ✅ Kiểm tra địa chỉ có mã GHN trước khi tính phí vận chuyển

### **3. Backend API**

**Files:**
- `backend/controller/addressController.js`
- `backend/prisma/schema.prisma`

**Logic:**
- ✅ Nhận và lưu `provinceId`, `districtId`, `wardCode` vào database
- ✅ Trả về các mã GHN khi lấy danh sách địa chỉ

---

## 🔄 Logic đồng bộ - CHI TIẾT

### **State quản lý mã GHN (đồng bộ giữa các nơi):**

```javascript
const [selectedCodes, setSelectedCodes] = useState({
  provinceCode: "",   // ProvinceID từ GHN (number → string)
  districtCode: "",   // DistrictID từ GHN (number → string)
  wardCode: ""        // WardCode từ GHN (string)
});
```

### **Handler khi chọn Tỉnh/Quận/Phường (logic giống nhau):**

```javascript
// ✅ CHỌN TỈNH - Logic đồng bộ
const handleProvinceChange = (code) => {
  const province = provinces.find(p => 
    String(p.code) === code || String(p.ProvinceID) === code
  );
  if (!province) return;
  
  const provinceCode = String(province.code || province.ProvinceID);
  const provinceName = province.name || province.ProvinceName;
  
  // Reset districts và wards
  setSelectedCodes({ provinceCode, districtCode: "", wardCode: "" });
  setForm({ ...form, city: provinceName, district: "", ward: "" });
  
  // Load quận/huyện từ GHN API
  fetchDistricts(provinceCode);
};

// ✅ CHỌN QUẬN - Logic đồng bộ
const handleDistrictChange = (code) => {
  const district = districts.find(d => 
    String(d.code) === code || String(d.DistrictID) === code
  );
  if (!district) return;
  
  const districtCode = String(district.code || district.DistrictID);
  const districtName = district.name || district.DistrictName;
  
  // Reset wards
  setSelectedCodes({ ...selectedCodes, districtCode, wardCode: "" });
  setForm({ ...form, district: districtName, ward: "" });
  
  // Load phường/xã từ GHN API
  fetchWards(districtCode);
};

// ✅ CHỌN PHƯỜNG - Logic đồng bộ
const handleWardChange = (code) => {
  const ward = wards.find(w => 
    String(w.code) === code || String(w.WardCode) === code
  );
  if (!ward) return;
  
  const wardCodeValue = String(ward.code || ward.WardCode);
  const wardName = ward.name || ward.WardName;
  
  setSelectedCodes({ ...selectedCodes, wardCode: wardCodeValue });
  setForm({ ...form, ward: wardName });
};
```

### **Lưu địa chỉ với mã GHN (logic đồng bộ):**

```javascript
// ✅ VALIDATE có mã GHN trước khi lưu
if (!selectedCodes.provinceCode || !selectedCodes.districtCode || !selectedCodes.wardCode) {
  return toast.error("Vui lòng chọn lại Tỉnh/Quận/Phường từ dropdown để có mã GHN");
}

// ✅ Chuẩn bị data với mã GHN
const addressData = {
  ...formData,
  addressType: formData.addressType?.toUpperCase() || "HOME",
  // ✅ MÃ GHN (QUAN TRỌNG)
  provinceId: selectedCodes.provinceCode ? Number(selectedCodes.provinceCode) : null,
  districtId: selectedCodes.districtCode ? Number(selectedCodes.districtCode) : null,
  wardCode: selectedCodes.wardCode || null,
};

// Gọi API
await addAddress(addressData);  // hoặc updateAddress(id, addressData)
```

### **Kiểm tra địa chỉ có mã GHN (để tính phí vận chuyển):**

```javascript
// ✅ Kiểm tra địa chỉ có đủ mã GHN
const canCalculateShipping = Boolean(
  selectedAddress?.districtId && 
  selectedAddress?.wardCode
);

// ✅ Nếu thiếu mã GHN → Hiển thị thông báo
if (!canCalculateShipping && selectedAddress && checkoutItems.length > 0) {
  const missingFields = [];
  if (!selectedAddress.districtId) missingFields.push('districtId');
  if (!selectedAddress.wardCode) missingFields.push('wardCode');
  
  setShippingFeeError(
    `Địa chỉ chưa có mã GHN (thiếu: ${missingFields.join(', ')}). ` +
    `Vui lòng vào "Hồ sơ" → "Địa chỉ" → "Sửa" địa chỉ này để cập nhật.`
  );
}
```

---

## 🔧 Cải thiện đã thực hiện

### **1. Đồng bộ logic lưu mã GHN**

**Trước:**
- `useAddress.js`: Có logic lưu mã GHN
- `useCheckout.js`: Logic lưu mã GHN khác nhau

**Sau:**
- ✅ Cả hai dùng cùng logic: Lấy từ `selectedCodes` → Chuyển sang `provinceId/districtId/wardCode`
- ✅ Cả hai validate có mã GHN trước khi lưu

### **2. Cải thiện validation**

**Thêm:**
- ✅ Kiểm tra có mã GHN trước khi lưu địa chỉ
- ✅ Thông báo lỗi rõ ràng nếu thiếu mã GHN
- ✅ Hướng dẫn user cách cập nhật địa chỉ

### **3. Cải thiện debug**

**Thêm:**
- ✅ Debug log trong development mode để kiểm tra địa chỉ có mã GHN
- ✅ Log chi tiết khi lưu địa chỉ với mã GHN

### **4. Fix warnings**

**Đã fix:**
- ✅ Thêm `DialogDescription` để fix warning về accessibility
- ✅ Chỉ log trong development mode

---

## 📊 Flow hoạt động (Đồng bộ)

### **Khi user tạo/sửa địa chỉ:**

```
1. User chọn Tỉnh/TP từ dropdown GHN
   ↓
2. handleProvinceChange(code)
   → Lưu provinceCode vào selectedCodes
   → Gọi fetchDistricts(provinceCode) từ useGHNPlaces
   ↓
3. User chọn Quận/Huyện từ dropdown GHN
   ↓
4. handleDistrictChange(code)
   → Lưu districtCode vào selectedCodes
   → Gọi fetchWards(districtCode) từ useGHNPlaces
   ↓
5. User chọn Phường/Xã từ dropdown GHN
   ↓
6. handleWardChange(code)
   → Lưu wardCode vào selectedCodes
   ↓
7. User submit form
   ↓
8. Validate có mã GHN đầy đủ
   ↓
9. Lấy mã GHN từ selectedCodes:
   - provinceId = Number(selectedCodes.provinceCode)
   - districtId = Number(selectedCodes.districtCode)
   - wardCode = selectedCodes.wardCode (string)
   ↓
10. Gửi lên backend kèm tên địa chỉ
    ↓
11. Backend lưu cả tên VÀ mã GHN vào database
```

### **Khi user checkout và tính phí vận chuyển:**

```
1. Load địa chỉ từ database
   ↓
2. Kiểm tra địa chỉ có mã GHN (districtId, wardCode)
   ↓
3. Nếu có mã GHN:
   ✅ Tính phí vận chuyển từ GHN API
   ✅ Hiển thị phí vận chuyển
   ↓
4. Nếu không có mã GHN:
   ⚠️ Hiển thị "Cần cập nhật mã GHN"
   ⚠️ Hướng dẫn user vào "Hồ sơ" → "Địa chỉ" → "Sửa"
```

---

## ✅ Checklist hoàn thành

- [x] Đồng bộ logic lưu mã GHN giữa `useAddress` và `useCheckout`
- [x] Cả hai đều validate có mã GHN trước khi lưu
- [x] Cả hai đều dùng cùng logic handler (handleProvinceChange, handleDistrictChange, handleWardChange)
- [x] Backend nhận và lưu đúng `provinceId`, `districtId`, `wardCode`
- [x] Checkout kiểm tra địa chỉ có mã GHN trước khi tính phí
- [x] Thêm debug log để kiểm tra địa chỉ có mã GHN
- [x] Fix warnings về DialogDescription
- [x] Cải thiện thông báo lỗi khi thiếu mã GHN

---

## 🎯 Kết quả

Sau khi đồng bộ:

1. ✅ **Logic nhất quán** giữa Profile và Checkout
2. ✅ **Địa chỉ luôn được lưu với mã GHN** (nếu user chọn từ dropdown)
3. ✅ **Tính phí vận chuyển hoạt động chính xác** khi địa chỉ có mã GHN
4. ✅ **Thông báo rõ ràng** khi địa chỉ thiếu mã GHN
5. ✅ **Dễ dàng maintain** vì logic đồng bộ

---

## 📝 Lưu ý

### **Địa chỉ cũ (không có mã GHN):**

- ✅ Vẫn hiển thị và sử dụng được
- ⚠️ Không thể tính phí vận chuyển
- ✅ **Giải pháp:** Vào "Hồ sơ" → "Địa chỉ" → "Sửa" → Chọn lại Tỉnh/Quận/Phường từ dropdown

### **Địa chỉ mới:**

- ✅ **BẮT BUỘC** chọn từ dropdown GHN
- ✅ Tự động lưu mã GHN
- ✅ Có thể tính phí vận chuyển ngay

---

**Ngày hoàn thành:** 2025-01-30  
**Status:** ✅ ĐÃ ĐỒNG BỘ HOÀN TOÀN

