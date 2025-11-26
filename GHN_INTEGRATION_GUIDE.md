# Hướng Dẫn Tích Hợp GHN (Giao Hàng Nhanh)

## 📋 Tổng Quan

Tài liệu này hướng dẫn cách tích hợp dịch vụ vận chuyển GHN (Giao Hàng Nhanh) vào hệ thống Web Ecommerce.

## 🔑 Bước 1: Đăng Ký và Lấy Thông Tin API từ GHN

1. **Đăng ký tài khoản GHN:**
   - Truy cập: https://khachhang.ghn.vn/
   - Đăng ký hoặc đăng nhập vào tài khoản

2. **Lấy thông tin API (Token và Shop ID):**
   - Sau khi đăng nhập, chọn mục **"Chủ cửa hàng"** (hoặc "Quản lý cửa hàng")
   - Tìm phần **"Token API"** hoặc **"API Integration"**
   - Nhấn **"Xem"** hoặc **"Hiển thị"** để xem Token API
   - Lưu lại 2 thông tin quan trọng:
     - **Token API** (GHN_TOKEN): Mã token dài để xác thực API
     - **Shop ID** (GHN_SHOP_ID): ID cửa hàng (ví dụ: 6132900 - có thể thấy trong bảng "Quản lý cửa hàng")
   
   **Lưu ý:** 
   - Shop ID có thể thấy ngay trong bảng "Quản lý cửa hàng" (cột ID)
   - Token API thường ở phần cài đặt riêng, có thể cần tìm trong menu "Cài đặt" hoặc "Tích hợp"

3. **Lấy thông tin địa chỉ kho hàng:**
   - Cần có thông tin địa chỉ kho hàng của bạn:
     - Tỉnh/Thành phố
     - Quận/Huyện (và District ID từ GHN)
     - Phường/Xã (và Ward Code từ GHN)
     - Địa chỉ chi tiết

## ⚙️ Bước 2: Cấu Hình Environment Variables

Thêm các biến môi trường sau vào file `.env` trong thư mục `backend`:

```env
# GHN Configuration - Lấy từ web GHN (Bước 1)
GHN_TOKEN=your_ghn_token_here          # ⚠️ Lấy từ web GHN (Token API)
GHN_SHOP_ID=your_shop_id_here          # ⚠️ Lấy từ web GHN (Token API)
GHN_API_URL=https://dev-online-gateway.ghn.vn/shiip/public-api/v2
GHN_IS_PRODUCTION=false

# Thông tin kho hàng (địa chỉ gửi hàng) - Tự set giá trị
GHN_FROM_DISTRICT_ID=your_district_id  # ⚠️ Lấy từ API GHN (xem bước 3)
GHN_FROM_NAME=Tên cửa hàng             # ✅ Tự set (tên cửa hàng/kho hàng của bạn)
GHN_FROM_PHONE=Số điện thoại           # ✅ Tự set (số điện thoại kho hàng)
GHN_FROM_ADDRESS=Địa chỉ chi tiết      # ✅ Tự set (địa chỉ chi tiết kho hàng)
GHN_FROM_WARD=Tên phường/xã            # ✅ Tự set (tên phường/xã kho hàng)
GHN_FROM_DISTRICT=Tên quận/huyện       # ✅ Tự set (tên quận/huyện kho hàng)
GHN_FROM_PROVINCE=Tên tỉnh/thành phố   # ✅ Tự set (tên tỉnh/thành phố kho hàng)
```

**Nguồn giá trị:**
- **Lấy từ web GHN (Bước 1):**
  - `GHN_TOKEN`: Token API từ trang quản trị GHN
  - `GHN_SHOP_ID`: Shop ID từ trang quản trị GHN
  
- **Lấy từ API GHN (sau Bước 1, xem Bước 3):**
  - `GHN_FROM_DISTRICT_ID`: Gọi API `/api/shipping/districts` để lấy District ID của kho hàng

- **Tự set giá trị (thông tin kho hàng của bạn):**
  - `GHN_FROM_NAME`: Tên cửa hàng/kho hàng
  - `GHN_FROM_PHONE`: Số điện thoại liên hệ
  - `GHN_FROM_ADDRESS`: Địa chỉ chi tiết (số nhà, tên đường)
  - `GHN_FROM_WARD`: Tên phường/xã (ví dụ: "Phường 1")
  - `GHN_FROM_DISTRICT`: Tên quận/huyện (ví dụ: "Quận 1")
  - `GHN_FROM_PROVINCE`: Tên tỉnh/thành phố (ví dụ: "TP. Hồ Chí Minh")

**Lưu ý:**
- `GHN_IS_PRODUCTION=false`: Dùng môi trường test (development)
- `GHN_IS_PRODUCTION=true`: Dùng môi trường production

## 🔍 Bước 3: Lấy District ID và Ward Code

GHN sử dụng District ID và Ward Code riêng, không phải tên. Bạn cần:

1. **Lấy District ID:**
   - Gọi API: `POST /api/shipping/districts` với `provinceId`
   - Tìm district tương ứng và lấy `DistrictID`

2. **Lấy Ward Code:**
   - Gọi API: `POST /api/shipping/wards` với `districtId`
   - Tìm ward tương ứng và lấy `WardCode`

3. **Lưu vào database:**
   - Khi user tạo địa chỉ, cần lưu thêm `ghnDistrictId` và `ghnWardCode`
   - Hoặc có thể tự động map từ tên sang ID (cần implement thêm)

## 🗄️ Bước 4: Chạy Migration Database

Sau khi cập nhật schema, chạy migration:

```bash
cd backend
npx prisma migrate dev --name add_ghn_fields
npx prisma generate
```

Các field mới được thêm:
- **Order model:**
  - `ghnOrderCode`: Mã đơn hàng GHN
  - `ghnShopId`: Shop ID GHN
  - `ghnDistrictId`: District ID địa chỉ nhận hàng
  - `ghnWardCode`: Ward Code địa chỉ nhận hàng
  - `shippingMethod`: Phương thức vận chuyển (GHN)

- **Address model:**
  - `ghnDistrictId`: District ID GHN
  - `ghnWardCode`: Ward Code GHN

## 🚀 Bước 5: Cách Hoạt Động

### 5.1. Tính Phí Vận Chuyển

Khi user tạo đơn hàng:
1. Hệ thống kiểm tra địa chỉ có `ghnDistrictId` và `ghnWardCode`
2. Nếu có, gọi API GHN để tính phí vận chuyển
3. Lưu phí vận chuyển vào đơn hàng
4. Nếu không có, sử dụng phí mặc định = 0

**API Endpoint:**
```
POST /api/shipping/calculate-fee
Body: {
  toDistrictId: number,
  toWardCode: string,
  weight?: number,        // gram, mặc định 1000
  length?: number,        // cm, mặc định 20
  width?: number,         // cm, mặc định 20
  height?: number,       // cm, mặc định 20
  serviceTypeId?: number, // 2: Standard, 5: Express
  insuranceValue?: number // Giá trị đơn hàng
}
```

### 5.2. Tạo Đơn Vận Chuyển

Khi admin xác nhận đơn hàng (chuyển sang CONFIRMED hoặc PROCESSING):
1. Hệ thống tự động tạo đơn vận chuyển trên GHN
2. Lưu mã đơn GHN (`ghnOrderCode`) vào database
3. Cập nhật `trackingCode` = `ghnOrderCode`

**Lưu ý:** Chỉ tạo đơn GHN nếu:
- Đơn hàng có `ghnDistrictId` và `ghnWardCode`
- Chưa có `ghnOrderCode` (chưa tạo đơn GHN)

### 5.3. Tracking Đơn Hàng

**API Endpoint:**
```
GET /api/shipping/tracking/:ghnOrderCode
```

Trả về thông tin chi tiết đơn vận chuyển từ GHN.

### 5.4. Hủy Đơn Vận Chuyển

**API Endpoint:**
```
POST /api/shipping/cancel/:ghnOrderCode
```

Hủy đơn vận chuyển trên GHN (chỉ khi đơn chưa được lấy hàng).

## 📝 Bước 6: Cập Nhật Frontend

### 6.1. Tính Phí Vận Chuyển Khi Checkout

Cần cập nhật `useCheckout.js` để:
1. Gọi API tính phí vận chuyển khi user chọn địa chỉ
2. Hiển thị phí vận chuyển trong summary
3. Cập nhật tổng tiền

### 6.2. Hiển Thị Tracking Code

Trong trang chi tiết đơn hàng, hiển thị:
- Mã vận đơn GHN (`ghnOrderCode`)
- Link tracking (nếu có)
- Trạng thái vận chuyển từ GHN

### 6.3. Lưu GHN District ID và Ward Code

Khi user tạo địa chỉ:
1. Gọi API GHN để lấy danh sách districts/wards
2. Map từ tên sang ID/Code của GHN
3. Lưu vào database khi tạo địa chỉ

## 🔧 API Endpoints

### Public Endpoints

1. **Tính phí vận chuyển:**
   ```
   POST /api/shipping/calculate-fee
   ```

2. **Lấy danh sách tỉnh/thành phố:**
   ```
   GET /api/shipping/provinces
   ```

3. **Lấy danh sách quận/huyện:**
   ```
   POST /api/shipping/districts
   Body: { provinceId: number }
   ```

4. **Lấy danh sách phường/xã:**
   ```
   POST /api/shipping/wards
   Body: { districtId: number }
   ```

### Protected Endpoints (cần authentication)

1. **Lấy thông tin tracking:**
   ```
   GET /api/shipping/tracking/:ghnOrderCode
   ```

2. **Hủy đơn vận chuyển:**
   ```
   POST /api/shipping/cancel/:ghnOrderCode
   ```

## ⚠️ Lưu Ý Quan Trọng

1. **Môi trường Test vs Production:**
   - Development: Dùng `GHN_IS_PRODUCTION=false`
   - Production: Dùng `GHN_IS_PRODUCTION=true` và URL production

2. **Trọng lượng sản phẩm:**
   - Hiện tại mặc định 100g mỗi item nếu không có thông tin
   - Nên lưu trọng lượng sản phẩm trong database để tính chính xác

3. **Kích thước sản phẩm:**
   - Hiện tại mặc định 20x20x20 cm
   - Nên lưu kích thước sản phẩm trong database

4. **Xử lý lỗi:**
   - Nếu GHN API lỗi, hệ thống vẫn tiếp tục với phí vận chuyển = 0
   - Log lỗi để admin xử lý sau

5. **Mapping địa chỉ:**
   - Cần map từ tên địa chỉ (tỉnh/quận/phường) sang ID/Code của GHN
   - Có thể tự động hoặc yêu cầu user chọn từ dropdown

## 🐛 Troubleshooting

### Lỗi "Token không hợp lệ"
- Kiểm tra `GHN_TOKEN` trong `.env`
- Đảm bảo token chưa hết hạn

### Lỗi "Shop ID không hợp lệ"
- Kiểm tra `GHN_SHOP_ID` trong `.env`
- Đảm bảo Shop ID đúng với tài khoản

### Không tính được phí vận chuyển
- Kiểm tra `ghnDistrictId` và `ghnWardCode` trong địa chỉ
- Kiểm tra log để xem lỗi cụ thể từ GHN API

### Không tạo được đơn vận chuyển
- Kiểm tra đơn hàng đã có `ghnDistrictId` và `ghnWardCode`
- Kiểm tra thông tin kho hàng (`GHN_FROM_*`) đã đúng chưa
- Xem log để biết lỗi cụ thể

## 📚 Tài Liệu Tham Khảo

- GHN API Documentation: https://api.ghn.vn/
- GHN Customer Portal: https://khachhang.ghn.vn/

## ✅ Checklist Tích Hợp

- [ ] Đăng ký tài khoản GHN
- [ ] Lấy Token API và Shop ID
- [ ] Cấu hình environment variables
- [ ] Chạy database migration
- [ ] Test tính phí vận chuyển
- [ ] Test tạo đơn vận chuyển
- [ ] Test tracking đơn hàng
- [ ] Cập nhật frontend để hiển thị phí vận chuyển
- [ ] Cập nhật frontend để lưu GHN District ID và Ward Code
- [ ] Test toàn bộ flow từ checkout đến giao hàng

