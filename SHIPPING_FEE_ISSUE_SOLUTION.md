# ❓ Vấn đề: Phí vận chuyển hiển thị "Cần cập nhật mã GHN"

## 🔍 Nguyên nhân

Trạng thái "Cần cập nhật mã GHN" xuất hiện khi địa chỉ giao hàng **chưa có mã GHN** (`districtId` và `wardCode`).

### **Tại sao địa chỉ thiếu mã GHN?**

1. **Địa chỉ cũ:** Địa chỉ được tạo **trước khi tích hợp GHN** → Chỉ có tên (city, district, ward), không có mã GHN
2. **Địa chỉ mới tạo nhưng không dùng GHN dropdown:** User tạo địa chỉ bằng cách nhập tay → Không có mã GHN

---

## ✅ Giải pháp

### **Cách 1: Cập nhật địa chỉ hiện tại (Khuyến nghị)**

1. Vào trang **"Hồ sơ"** (Profile)
2. Chọn tab **"Địa chỉ"**
3. Click nút **"Sửa"** trên địa chỉ đang dùng
4. Trong form sửa:
   - Chọn lại **Tỉnh/TP** từ dropdown (sẽ tự động load quận/huyện)
   - Chọn lại **Quận/Huyện** từ dropdown (sẽ tự động load phường/xã)
   - Chọn lại **Phường/Xã** từ dropdown
   - Click **"Cập nhật địa chỉ"**
5. Quay lại trang **Checkout** → Phí vận chuyển sẽ tự động được tính

**Lưu ý:** Khi chọn từ dropdown GHN, hệ thống sẽ tự động lưu mã GHN (`provinceId`, `districtId`, `wardCode`) vào database.

---

### **Cách 2: Tạo địa chỉ mới**

1. Vào trang **"Hồ sơ"** → **"Địa chỉ"**
2. Click **"Thêm địa chỉ mới"**
3. Điền thông tin và **chọn từ dropdown GHN** (Tỉnh/Quận/Phường)
4. Click **"Thêm địa chỉ mới"**
5. Quay lại **Checkout** và chọn địa chỉ mới

---

## 🔧 Kiểm tra địa chỉ có mã GHN

### **Cách kiểm tra trong Frontend:**

Mở **Developer Console** (F12) khi ở trang checkout, sẽ thấy log:

```javascript
🔍 Selected Address: {
  id: 1,
  city: "Thành phố Hồ Chí Minh",
  district: "Quận Gò Vấp",
  ward: "Phường 17",
  provinceId: null,      // ⚠️ Thiếu mã GHN
  districtId: null,      // ⚠️ Thiếu mã GHN
  wardCode: null,        // ⚠️ Thiếu mã GHN
  hasGHNCodes: false
}
```

### **Địa chỉ ĐÃ CÓ mã GHN sẽ hiển thị:**

```javascript
🔍 Selected Address: {
  id: 1,
  city: "Thành phố Hồ Chí Minh",
  district: "Quận Gò Vấp",
  ward: "Phường 17",
  provinceId: 202,           // ✅ Có mã GHN
  districtId: 1456,          // ✅ Có mã GHN
  wardCode: "21708",         // ✅ Có mã GHN
  hasGHNCodes: true
}
```

---

## 📋 Logic tính phí vận chuyển

### **Điều kiện để tính phí:**

```javascript
const canCalculateShipping =
  Boolean(selectedAddress?.districtId && selectedAddress?.wardCode) &&
  checkoutItems.length > 0;
```

**Phải có:**
- ✅ `selectedAddress.districtId` (DistrictID từ GHN)
- ✅ `selectedAddress.wardCode` (WardCode từ GHN)
- ✅ Có ít nhất 1 sản phẩm trong giỏ hàng

**Nếu thiếu một trong hai mã GHN → Hiển thị "Cần cập nhật mã GHN"**

---

## 🛠️ Tự động cập nhật mã GHN (Tùy chọn - Cho Admin)

Nếu có nhiều địa chỉ cũ cần cập nhật, có thể tạo script tự động:

```javascript
// Script tự động tìm và cập nhật mã GHN từ tên địa chỉ
// (Cần implement logic tìm kiếm từ GHN API)
```

**Tuy nhiên, cách này không khuyến nghị vì:**
- Có thể không chính xác 100% (tên có thể khác nhau)
- Tốt nhất là user tự chọn lại từ dropdown để đảm bảo chính xác

---

## 📝 Checklist

- [ ] Kiểm tra địa chỉ hiện tại có `districtId` và `wardCode` không
- [ ] Nếu thiếu → Vào "Hồ sơ" → "Địa chỉ" → "Sửa" địa chỉ
- [ ] Chọn lại Tỉnh/Quận/Phường từ dropdown GHN
- [ ] Lưu địa chỉ
- [ ] Quay lại checkout → Phí vận chuyển sẽ được tính tự động

---

## 🎯 Kết quả mong đợi

Sau khi cập nhật địa chỉ với mã GHN:

1. ✅ Trang checkout sẽ tự động tính phí vận chuyển
2. ✅ Hiển thị số tiền cụ thể (VD: "25.000₫")
3. ✅ Tổng cộng = Tạm tính + Phí vận chuyển
4. ✅ Có thể đặt hàng thành công

---

**Ngày tạo:** 2025-01-30  
**Status:** ✅ Đã có giải pháp

