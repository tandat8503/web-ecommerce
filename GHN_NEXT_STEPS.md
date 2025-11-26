# Các Bước Tiếp Theo Sau Khi Đã Cập Nhật Thông Tin Cửa Hàng GHN

## ✅ Bước 1: Lấy Token API và Shop ID

### 1.1. Lấy Shop ID
- Shop ID đã có sẵn trong bảng "Quản lý cửa hàng"
- Trong hình của bạn, Shop ID là: **6132900**
- Copy số này để dùng làm `GHN_SHOP_ID`

### 1.2. Lấy Token API
1. Trong trang quản trị GHN, tìm menu **"Chủ cửa hàng"** hoặc **"Cài đặt"**
2. Tìm phần **"Token API"** hoặc **"API Integration"**
3. Nhấn **"Xem"** hoặc **"Hiển thị"** để xem Token
4. Copy Token (thường là một chuỗi dài)
5. **Lưu ý:** Token chỉ hiển thị một lần, hãy copy ngay

## ⚙️ Bước 2: Cấu Hình Environment Variables

1. Mở file `backend/.env` (nếu chưa có thì tạo mới)

2. Thêm các biến sau:

```env
# GHN Configuration - Lấy từ web GHN
GHN_TOKEN=your_token_here                    # ⚠️ Dán Token API vừa copy
GHN_SHOP_ID=6132900                          # ⚠️ Shop ID của bạn (từ bảng cửa hàng)
GHN_API_URL=https://dev-online-gateway.ghn.vn/shiip/public-api/v2
GHN_IS_PRODUCTION=false                      # false = test, true = production

# Thông tin kho hàng (từ thông tin cửa hàng bạn vừa cập nhật)
GHN_FROM_DISTRICT_ID=                        # Sẽ lấy ở bước 3
GHN_FROM_NAME=0937446327                     # Tên cửa hàng (hoặc tên bạn muốn)
GHN_FROM_PHONE=0937446327                    # Số điện thoại kho hàng
GHN_FROM_ADDRESS=127 Hồng Hà                 # Địa chỉ chi tiết (số nhà, tên đường)
GHN_FROM_WARD=Phường 9                       # Tên phường/xã
GHN_FROM_DISTRICT=Phú Nhuận                  # Tên quận/huyện
GHN_FROM_PROVINCE=Thành phố Hồ Chí Minh      # Tên tỉnh/thành phố
```

**Lưu ý:** 
- Thay `your_token_here` bằng Token API thực tế
- Điều chỉnh các thông tin `GHN_FROM_*` theo đúng thông tin cửa hàng của bạn

## 🔍 Bước 3: Lấy District ID từ API GHN

Sau khi có Token, bạn cần lấy District ID của kho hàng:

### 3.1. Khởi động server backend
```bash
cd backend
npm run dev
```

### 3.2. Gọi API để lấy danh sách tỉnh/thành phố
```bash
# Sử dụng Postman, curl, hoặc trình duyệt
GET http://localhost:5000/api/shipping/provinces
```

Tìm tỉnh/thành phố của bạn (ví dụ: "Thành phố Hồ Chí Minh") và lấy `ProvinceID`

### 3.3. Gọi API để lấy danh sách quận/huyện
```bash
POST http://localhost:5000/api/shipping/districts
Content-Type: application/json

{
  "provinceId": 202  // ProvinceID của TP.HCM (thay bằng ID thực tế)
}
```

Tìm quận/huyện của bạn (ví dụ: "Phú Nhuận") và lấy `DistrictID`

### 3.4. Cập nhật GHN_FROM_DISTRICT_ID
Cập nhật lại file `.env`:
```env
GHN_FROM_DISTRICT_ID=1451  # DistrictID vừa lấy được (thay bằng ID thực tế)
```

## 🗄️ Bước 4: Chạy Database Migration

Cập nhật database để thêm các field GHN:

```bash
cd backend
npx prisma migrate dev --name add_ghn_fields
npx prisma generate
```

**Lưu ý:** Nếu có lỗi, có thể cần kiểm tra lại schema hoặc database connection.

## 🧪 Bước 5: Test Tích Hợp

### 5.1. Test tính phí vận chuyển
```bash
POST http://localhost:5000/api/shipping/calculate-fee
Content-Type: application/json

{
  "toDistrictId": 1451,        # District ID địa chỉ nhận hàng
  "toWardCode": "1A0401",       # Ward Code địa chỉ nhận hàng
  "weight": 1000,               # Trọng lượng (gram)
  "insuranceValue": 500000      # Giá trị đơn hàng
}
```

Nếu thành công, bạn sẽ nhận được phí vận chuyển.

### 5.2. Test tạo đơn hàng với GHN
1. Tạo một đơn hàng test từ frontend
2. Chọn địa chỉ có `ghnDistrictId` và `ghnWardCode`
3. Kiểm tra xem phí vận chuyển có được tính tự động không

### 5.3. Test tạo đơn vận chuyển GHN
1. Admin xác nhận đơn hàng (chuyển sang CONFIRMED hoặc PROCESSING)
2. Kiểm tra log xem có tạo đơn GHN thành công không
3. Kiểm tra database xem `ghnOrderCode` đã được lưu chưa

## 📝 Bước 6: Cập Nhật Frontend (Tùy chọn)

Nếu muốn hiển thị phí vận chuyển khi checkout:

1. Cập nhật `frontend/src/pages/user/checkout/useCheckout.js`:
   - Gọi API tính phí khi user chọn địa chỉ
   - Hiển thị phí vận chuyển trong summary
   - Cập nhật tổng tiền

2. Cập nhật form tạo địa chỉ:
   - Lưu `ghnDistrictId` và `ghnWardCode` khi user tạo địa chỉ
   - Có thể dùng dropdown từ API GHN để user chọn

## ✅ Checklist

- [ ] Đã lấy Token API từ GHN
- [ ] Đã lấy Shop ID (6132900)
- [ ] Đã cấu hình file `.env` với Token và Shop ID
- [ ] Đã lấy District ID từ API GHN
- [ ] Đã cập nhật `GHN_FROM_DISTRICT_ID` trong `.env`
- [ ] Đã chạy database migration
- [ ] Đã test tính phí vận chuyển
- [ ] Đã test tạo đơn hàng với GHN
- [ ] Đã test tạo đơn vận chuyển khi admin xác nhận

## 🐛 Troubleshooting

### Lỗi "Token không hợp lệ"
- Kiểm tra lại Token đã copy đúng chưa
- Đảm bảo không có khoảng trắng thừa
- Token có thể đã hết hạn, cần tạo lại

### Lỗi "Shop ID không hợp lệ"
- Kiểm tra Shop ID đúng với cửa hàng đang dùng
- Đảm bảo Shop ID là số (không có ký tự đặc biệt)

### Không tính được phí vận chuyển
- Kiểm tra `GHN_FROM_DISTRICT_ID` đã đúng chưa
- Kiểm tra `toDistrictId` và `toWardCode` có hợp lệ không
- Xem log backend để biết lỗi cụ thể

## 📞 Hỗ Trợ

Nếu gặp vấn đề, kiểm tra:
1. Log backend (`console.log` hoặc file log)
2. Response từ GHN API
3. Database có đúng schema chưa

Xem thêm chi tiết trong file: `GHN_INTEGRATION_GUIDE.md`



