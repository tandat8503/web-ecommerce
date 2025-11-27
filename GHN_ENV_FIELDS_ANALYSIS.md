# 📋 Phân Tích Các Field Environment Variables GHN

## Tổng Quan

Dựa trên các field bạn đã thêm vào `.env`, đây là phân tích chi tiết về từng field và quyết định có nên giữ hay loại bỏ.

---

## 📌 Các Field Bắt Buộc (Không thể loại bỏ)

### 1. `GHN_TOKEN`
- **Mục đích:** Xác thực với GHN API
- **Cần cho:** Tất cả API calls
- **Quyết định:** ✅ **GIỮ** - Bắt buộc

### 2. `GHN_SHOP_ID`
- **Mục đích:** ID cửa hàng trên GHN
- **Cần cho:** Tính phí vận chuyển, tạo đơn hàng
- **Quyết định:** ✅ **GIỮ** - Bắt buộc

### 3. `GHN_FROM_DISTRICT_ID` (hoặc `GHN_WAREHOUSE_DISTRICT_ID`)
- **Mục đích:** ID quận/huyện của kho hàng (theo mã GHN)
- **Cần cho:** Tính phí vận chuyển (tính từ kho đến địa chỉ khách)
- **Quyết định:** ✅ **GIỮ** - Bắt buộc

---

## 🤔 Các Field Tùy Chọn (Có thể loại bỏ TẠM THỜI)

### 4. `GHN_FROM_NAME` - Tên người gửi
- **Mục đích:** Tên người/cửa hàng gửi hàng
- **Cần cho:** ⚠️ Chỉ cần khi **TẠO ĐƠN HÀNG VẬN CHUYỂN** (chưa implement)
- **Hiện tại:** ❌ Chưa dùng trong code
- **Quyết định:** 
  - Nếu **CHỈ tính phí**: ❌ **CÓ THỂ LOẠI BỎ**
  - Nếu **SẼ tạo đơn hàng**: ✅ **NÊN GIỮ**

### 5. `GHN_FROM_PHONE` - Số điện thoại người gửi
- **Mục đích:** SĐT liên hệ kho hàng
- **Cần cho:** ⚠️ Chỉ cần khi **TẠO ĐƠN HÀNG VẬN CHUYỂN**
- **Hiện tại:** ❌ Chưa dùng trong code
- **Quyết định:**
  - Nếu **CHỈ tính phí**: ❌ **CÓ THỂ LOẠI BỎ**
  - Nếu **SẼ tạo đơn hàng**: ✅ **NÊN GIỮ**

### 6. `GHN_FROM_ADDRESS` - Địa chỉ chi tiết kho hàng
- **Mục đích:** Số nhà, tên đường kho hàng
- **Cần cho:** ⚠️ Chỉ cần khi **TẠO ĐƠN HÀNG VẬN CHUYỂN**
- **Hiện tại:** ❌ Chưa dùng trong code
- **Quyết định:**
  - Nếu **CHỈ tính phí**: ❌ **CÓ THỂ LOẠI BỎ**
  - Nếu **SẼ tạo đơn hàng**: ✅ **NÊN GIỮ**

### 7. `GHN_FROM_WARD` - Tên phường/xã kho hàng
- **Mục đích:** Tên phường/xã (để hiển thị/convenience)
- **Cần cho:** ⚠️ Chỉ cần khi **TẠO ĐƠN HÀNG VẬN CHUYỂN** (cần `WardCode`, không phải tên)
- **Hiện tại:** ❌ Chưa dùng trong code
- **Quyết định:**
  - Nếu **CHỈ tính phí**: ❌ **CÓ THỂ LOẠI BỎ**
  - Nếu **SẼ tạo đơn hàng**: ⚠️ **KHÔNG CẦN** (vì đã có `GHN_FROM_DISTRICT_ID` để lấy WardCode)

### 8. `GHN_FROM_DISTRICT` - Tên quận/huyện kho hàng
- **Mục đích:** Tên quận/huyện (để hiển thị/convenience)
- **Cần cho:** ❌ Không cần, vì đã có `GHN_FROM_DISTRICT_ID`
- **Hiện tại:** ❌ Chưa dùng trong code
- **Quyết định:** ❌ **CÓ THỂ LOẠI BỎ** (redundant với `GHN_FROM_DISTRICT_ID`)

### 9. `GHN_FROM_PROVINCE` - Tên tỉnh/thành phố kho hàng
- **Mục đích:** Tên tỉnh/thành phố (để hiển thị/convenience)
- **Cần cho:** ❌ Không cần, vì có thể lấy từ `GHN_FROM_DISTRICT_ID`
- **Hiện tại:** ❌ Chưa dùng trong code
- **Quyết định:** ❌ **CÓ THỂ LOẠI BỎ** (redundant)

---

## 🎯 Kết Luận & Khuyến Nghị

### Kịch bản 1: CHỈ dùng tính phí vận chuyển (hiện tại)

**Giữ lại:**
```env
GHN_TOKEN=...
GHN_SHOP_ID=...
GHN_FROM_DISTRICT_ID=1457
GHN_API_URL=https://dev-online-gateway.ghn.vn/shiip/public-api/v2
```

**Có thể loại bỏ:**
```env
GHN_FROM_NAME=...
GHN_FROM_PHONE=...
GHN_FROM_ADDRESS=...
GHN_FROM_WARD=...
GHN_FROM_DISTRICT=...
GHN_FROM_PROVINCE=...
```

### Kịch bản 2: SẼ tích hợp tạo đơn hàng vận chuyển (tương lai)

**Nên giữ:**
```env
GHN_TOKEN=...
GHN_SHOP_ID=...
GHN_FROM_DISTRICT_ID=1457
GHN_FROM_NAME=Nội Thất Văn Phòng
GHN_FROM_PHONE=0937446327
GHN_FROM_ADDRESS=127 Hồng Hà
# Ward/District/Province có thể lấy từ API, không cần lưu text
```

**Lưu ý:** 
- Khi tạo đơn hàng, cần `WardCode` (string), không phải tên text
- Có thể lấy `WardCode` từ API khi biết `GHN_FROM_DISTRICT_ID`
- Vì vậy các field text về ward/district/province không cần thiết

---

## 📝 Khuyến Nghị

### Nếu chỉ dùng tính phí (hiện tại):
**Loại bỏ tất cả các field text**, chỉ giữ:
- `GHN_TOKEN`
- `GHN_SHOP_ID`
- `GHN_FROM_DISTRICT_ID`
- `GHN_API_URL`

### Nếu sẽ tích hợp đầy đủ:
**Giữ lại:**
- `GHN_FROM_NAME` ✅
- `GHN_FROM_PHONE` ✅
- `GHN_FROM_ADDRESS` ✅
- Loại bỏ: `GHN_FROM_WARD`, `GHN_FROM_DISTRICT`, `GHN_FROM_PROVINCE` (vì có thể lấy từ API)

---

## 🧪 Test Script

Đã tạo script test tại: `backend/scripts/test-ghn-api.js`

Chạy test:
```bash
cd backend
npm run test-ghn
```

Script sẽ:
1. ✅ Kiểm tra các biến môi trường
2. ✅ Test API lấy tỉnh/thành phố
3. ✅ Test API lấy quận/huyện
4. ✅ Test API lấy phường/xã
5. ✅ Test API tính phí vận chuyển (với nhiều trường hợp)
6. ✅ Đưa ra nhận xét về các field

---

## 💡 Lưu Ý Quan Trọng

1. **`GHN_FROM_DISTRICT_ID` là đủ** để tính phí vận chuyển
2. **Các field text** (name, phone, address) chỉ cần khi **tạo đơn hàng vận chuyển**
3. **Các field text về địa chỉ** (ward, district, province) là **redundant** vì có thể lấy từ API
4. **Nên loại bỏ** các field redundant để giữ `.env` gọn gàng

---

**Khuyến nghị cuối cùng:** Loại bỏ tất cả các field text, chỉ giữ các field ID và credentials cần thiết. Khi cần tạo đơn hàng sau này, có thể thêm lại các field cần thiết (name, phone, address).

