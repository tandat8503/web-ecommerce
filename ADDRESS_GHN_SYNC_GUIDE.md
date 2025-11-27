# 🔄 ĐỒNG BỘ LOGIC GHN CHO ĐỊA CHỈ

## 📋 Tổng quan

Tài liệu này mô tả cách đồng bộ logic lấy và lưu mã GHN cho địa chỉ ở **TẤT CẢ** các nơi trong hệ thống.

---

## ✅ Nơi sử dụng địa chỉ GHN

1. **Trang quản lý địa chỉ** (`/profile/address`)
   - File: `frontend/src/pages/user/profile/address/useAddress.js`
   - Component: `AddressForm.jsx`
   - Hook: `useGHNPlaces`

2. **Trang Checkout** (`/checkout`)
   - File: `frontend/src/pages/user/checkout/useCheckout.js`
   - Component: `Checkout.jsx`
   - Hook: `useGHNPlaces`

3. **Backend API**
   - Controller: `backend/controller/addressController.js`
   - Schema: `backend/prisma/schema.prisma`

---

## 🔄 Logic chung - ĐỒNG BỘ

### **1. Lấy danh sách Tỉnh/Quận/Phường**

**Hook chung:** `useGHNPlaces()` 
- File: `frontend/src/hooks/useGHNPlaces.js`
- Dùng ở: `useAddress.js`, `useCheckout.js`

```javascript
const { provinces, districts, wards, fetchDistricts, fetchWards } = useGHNPlaces();
```

### **2. State quản lý mã GHN**

**Format chuẩn:**
```javascript
const [selectedCodes, setSelectedCodes] = useState({
  provinceCode: "",   // ProvinceID từ GHN (number → string)
  districtCode: "",   // DistrictID từ GHN (number → string)
  wardCode: ""        // WardCode từ GHN (string)
});
```

### **3. Handler khi chọn Tỉnh/Quận/Phường**

**Logic đồng bộ:**

```javascript
// ✅ CHỌN TỈNH
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
  
  // Load quận/huyện
  fetchDistricts(provinceCode);
};

// ✅ CHỌN QUẬN
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
  
  // Load phường/xã
  fetchWards(districtCode);
};

// ✅ CHỌN PHƯỜNG
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

### **4. Lưu địa chỉ với mã GHN**

**Format data gửi lên backend:**

```javascript
const addressData = {
  // Thông tin cơ bản
  fullName: form.fullName,
  phone: form.phone,
  streetAddress: form.streetAddress,
  city: form.city,           // Tên tỉnh
  district: form.district,   // Tên quận
  ward: form.ward,           // Tên phường
  addressType: form.addressType?.toUpperCase() || "HOME",
  isDefault: isDefault || false,
  note: form.note || null,
  
  // ✅ MÃ GHN (QUAN TRỌNG)
  provinceId: selectedCodes.provinceCode ? Number(selectedCodes.provinceCode) : null,
  districtId: selectedCodes.districtCode ? Number(selectedCodes.districtCode) : null,
  wardCode: selectedCodes.wardCode || null,
};

// Gọi API
await addAddress(addressData);  // hoặc updateAddress(id, addressData)
```

---

## 🔍 Kiểm tra địa chỉ có mã GHN

### **Cách 1: Kiểm tra trong code**

```javascript
const canCalculateShipping = Boolean(
  selectedAddress?.districtId && 
  selectedAddress?.wardCode
);
```

### **Cách 2: Debug log**

```javascript
console.log('🔍 Selected Address:', {
  id: address.id,
  city: address.city,
  districtId: address.districtId,  // Phải có giá trị
  wardCode: address.wardCode,      // Phải có giá trị
  hasGHNCodes: Boolean(address.districtId && address.wardCode)
});
```

---

## ⚠️ Lưu ý quan trọng

### **1. Địa chỉ cũ (không có mã GHN)**

- ✅ Vẫn hiển thị được
- ⚠️ Không thể tính phí vận chuyển
- ✅ Cần cập nhật lại bằng cách:
  - Vào "Hồ sơ" → "Địa chỉ" → "Sửa"
  - Chọn lại Tỉnh/Quận/Phường từ dropdown GHN
  - Lưu lại

### **2. Địa chỉ mới**

- ✅ **BẮT BUỘC** chọn từ dropdown GHN
- ✅ Tự động lưu mã GHN
- ✅ Có thể tính phí vận chuyển ngay

### **3. Validation trước khi lưu**

```javascript
// ✅ KIỂM TRA đã chọn đầy đủ mã GHN
if (!selectedCodes.provinceCode || !selectedCodes.districtCode || !selectedCodes.wardCode) {
  return toast.error("Vui lòng chọn lại Tỉnh/Quận/Phường từ dropdown để có mã GHN");
}
```

---

## 📊 Data Flow

```
1. User chọn Tỉnh/TP
   ↓
2. handleProvinceChange(code)
   → Lưu provinceCode vào selectedCodes
   → Gọi fetchDistricts(provinceCode)
   ↓
3. User chọn Quận/Huyện
   ↓
4. handleDistrictChange(code)
   → Lưu districtCode vào selectedCodes
   → Gọi fetchWards(districtCode)
   ↓
5. User chọn Phường/Xã
   ↓
6. handleWardChange(code)
   → Lưu wardCode vào selectedCodes
   ↓
7. User submit form
   ↓
8. Lấy mã GHN từ selectedCodes:
   - provinceId = Number(selectedCodes.provinceCode)
   - districtId = Number(selectedCodes.districtCode)
   - wardCode = selectedCodes.wardCode (string)
   ↓
9. Gửi lên backend kèm tên địa chỉ
   ↓
10. Backend lưu cả tên VÀ mã GHN vào database
```

---

## 🔧 Checklist đồng bộ

- [x] `useGHNPlaces` hook được dùng ở cả 2 nơi (useAddress, useCheckout)
- [x] `selectedCodes` state có format giống nhau
- [x] Handler functions (`handleProvinceChange`, `handleDistrictChange`, `handleWardChange`) logic giống nhau
- [x] Logic lưu mã GHN giống nhau (từ `selectedCodes` → `provinceId/districtId/wardCode`)
- [x] Backend nhận và lưu đúng `provinceId`, `districtId`, `wardCode`
- [x] Checkout kiểm tra địa chỉ có mã GHN trước khi tính phí

---

## 🎯 Kết quả

Sau khi đồng bộ:

1. ✅ Địa chỉ được lưu với mã GHN đầy đủ
2. ✅ Tính phí vận chuyển hoạt động chính xác
3. ✅ Logic nhất quán giữa Profile và Checkout
4. ✅ Dễ dàng maintain và extend

---

**Ngày cập nhật:** 2025-01-30  
**Status:** ✅ Đã đồng bộ

