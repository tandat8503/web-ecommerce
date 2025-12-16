# MÔ TẢ DỮ LIỆU Ở MỨC VẬT LÝ TRONG DATABASE

Tài liệu này mô tả chi tiết cấu trúc dữ liệu ở mức vật lý của tất cả các bảng trong hệ thống e-commerce.

**Ký hiệu:**
- **K**: Key (Khóa chính)
- **U**: Unique (Duy nhất)
- **M**: Mandatory (Bắt buộc)
- **x**: Có thuộc tính này

---

## 3.1. BẢNG NGƯỜI DÙNG VÀ XÁC THỰC

### 3.1.1. Bảng users

| Thuộc tính | Kiểu | K | U | M | Diễn giải |
|------------|------|---|---|---|-----------|
| id | int | x | x | x | Mã người dùng |
| email | varchar(255) | | x | x | Email đăng nhập, duy nhất |
| password | varchar(255) | | | | Mật khẩu (có thể null nếu đăng nhập bằng Google) |
| first_name | varchar(255) | | | x | Tên |
| last_name | varchar(255) | | | x | Họ |
| phone | varchar(20) | | x | | Số điện thoại, duy nhất |
| avatar | varchar(500) | | | | URL ảnh đại diện |
| avatar_public_id | varchar(255) | | | | Public ID của ảnh trên Cloudinary |
| google_id | varchar(255) | | x | | ID từ Google OAuth, duy nhất |
| role | enum('CUSTOMER','ADMIN') | | | x | Vai trò người dùng (mặc định: CUSTOMER) |
| is_active | tinyint(1) | | | x | Trạng thái hoạt động (1: hoạt động, 0: vô hiệu hóa, mặc định: 1) |
| is_verified | tinyint(1) | | | x | Trạng thái xác thực email (1: đã xác thực, 0: chưa xác thực, mặc định: 0) |
| email_verified_at | timestamp | | | | Thời điểm xác thực email |
| last_login_at | timestamp | | | | Thời điểm đăng nhập cuối cùng |
| created_at | timestamp | | | x | Ngày tạo |
| updated_at | timestamp | | | x | Ngày cập nhật |

**Mô tả:** Bảng users lưu trữ thông tin tài khoản người dùng trong hệ thống, bao gồm thông tin đăng nhập, xác thực và quyền hạn.

**Ràng buộc dữ liệu:**
- `id`: Mã người dùng, tự tăng, duy nhất, khóa chính.
- `email`: Email đăng nhập, bắt buộc, duy nhất, không được trùng.
- `password`: Mật khẩu đã được mã hóa, có thể null nếu đăng nhập bằng Google.
- `first_name`, `last_name`: Tên và họ, bắt buộc.
- `phone`: Số điện thoại, duy nhất, có thể null.
- `google_id`: ID từ Google OAuth, duy nhất, có thể null.
- `role`: Vai trò người dùng, mặc định là CUSTOMER, có thể là ADMIN.
- `is_active`: Trạng thái hoạt động, mặc định là true (1).
- `is_verified`: Trạng thái xác thực email, mặc định là false (0).

---

### 3.1.2. Bảng otp_verifications

| Thuộc tính | Kiểu | K | U | M | Diễn giải |
|------------|------|---|---|---|-----------|
| id | int | x | x | x | Mã OTP |
| user_id | int | | | | Mã người dùng, tham chiếu đến bảng users |
| email | varchar(255) | | | x | Email nhận OTP |
| otp_code | varchar(10) | | | x | Mã OTP (6-10 ký tự) |
| type | enum('EMAIL_VERIFICATION','PASSWORD_RESET') | | | x | Loại OTP |
| is_used | tinyint(1) | | | x | Trạng thái sử dụng (1: đã dùng, 0: chưa dùng, mặc định: 0) |
| expires_at | timestamp | | | x | Thời điểm hết hạn |
| attempts | int | | | x | Số lần thử nhập sai (mặc định: 0) |
| max_attempts | int | | | x | Số lần thử tối đa (mặc định: 3) |
| created_at | timestamp | | | x | Ngày tạo |
| updated_at | timestamp | | | x | Ngày cập nhật |

**Mô tả:** Bảng otp_verifications lưu trữ mã OTP (One-Time Password) dùng để xác thực email hoặc đặt lại mật khẩu.

**Ràng buộc dữ liệu:**
- `id`: Mã OTP, tự tăng, duy nhất, khóa chính.
- `user_id`: Mã người dùng, tham chiếu đến bảng users, có thể null (khi chưa có tài khoản).
- `email`: Email nhận OTP, bắt buộc.
- `otp_code`: Mã OTP, bắt buộc, thường là 6-10 ký tự số.
- `type`: Loại OTP, bắt buộc, có thể là EMAIL_VERIFICATION hoặc PASSWORD_RESET.
- `is_used`: Trạng thái sử dụng, mặc định là false (0).
- `expires_at`: Thời điểm hết hạn, bắt buộc, thường là 5-15 phút sau khi tạo.
- `attempts`: Số lần thử nhập sai, mặc định là 0.
- `max_attempts`: Số lần thử tối đa, mặc định là 3.

---

### 3.1.3. Bảng password_resets

| Thuộc tính | Kiểu | K | U | M | Diễn giải |
|------------|------|---|---|---|-----------|
| id | int | x | x | x | Mã reset password |
| user_id | int | | | x | Mã người dùng, tham chiếu đến bảng users |
| token | varchar(255) | | x | x | Token đặt lại mật khẩu, duy nhất |
| expires_at | timestamp | | | x | Thời điểm hết hạn |
| is_used | tinyint(1) | | | x | Trạng thái sử dụng (1: đã dùng, 0: chưa dùng, mặc định: 0) |
| created_at | timestamp | | | x | Ngày tạo |
| updated_at | timestamp | | | x | Ngày cập nhật |

**Mô tả:** Bảng password_resets lưu trữ token đặt lại mật khẩu cho người dùng.

**Ràng buộc dữ liệu:**
- `id`: Mã reset password, tự tăng, duy nhất, khóa chính.
- `user_id`: Mã người dùng, tham chiếu đến bảng users, bắt buộc.
- `token`: Token đặt lại mật khẩu, bắt buộc, duy nhất, thường là chuỗi ngẫu nhiên dài.
- `expires_at`: Thời điểm hết hạn, bắt buộc, thường là 1 giờ sau khi tạo.
- `is_used`: Trạng thái sử dụng, mặc định là false (0).

---

### 3.1.4. Bảng addresses

| Thuộc tính | Kiểu | K | U | M | Diễn giải |
|------------|------|---|---|---|-----------|
| id | int | x | x | x | Mã địa chỉ |
| user_id | int | | | x | Mã người dùng, tham chiếu đến bảng users |
| full_name | varchar(255) | | | x | Tên người nhận |
| phone | varchar(20) | | | x | Số điện thoại người nhận |
| street_address | varchar(255) | | | x | Tên đường, địa chỉ chi tiết |
| ward | varchar(100) | | | x | Phường/Xã |
| district | varchar(100) | | | x | Quận/Huyện |
| city | varchar(100) | | | x | Thành phố |
| province_id | int | | | | ProvinceID từ GHN API (để tính phí vận chuyển) |
| district_id | int | | | | DistrictID từ GHN API (để tính phí vận chuyển) |
| ward_code | varchar(20) | | | | WardCode từ GHN API (để tính phí vận chuyển) |
| address_type | enum('HOME','OFFICE') | | | x | Loại địa chỉ (nhà riêng, công ty, mặc định: HOME) |
| is_default | tinyint(1) | | | x | Trạng thái địa chỉ mặc định (1: mặc định, 0: không phải, mặc định: 0) |
| note | varchar(500) | | | | Ghi chú về địa chỉ |
| created_at | timestamp | | | x | Ngày tạo |
| updated_at | timestamp | | | x | Ngày cập nhật |

**Mô tả:** Bảng addresses lưu trữ thông tin về địa chỉ giao hàng của người dùng trong hệ thống. Hỗ trợ tích hợp GHN API để tính phí vận chuyển.

**Ràng buộc dữ liệu:**
- `id`: Mã địa chỉ, tự tăng, duy nhất, khóa chính.
- `user_id`: Mã người dùng, tham chiếu đến bảng users, bắt buộc.
- `full_name`: Tên người nhận, bắt buộc, không quá 255 ký tự.
- `phone`: Số điện thoại của người nhận, bắt buộc, đúng định dạng số điện thoại.
- `street_address`: Tên đường, bắt buộc, không quá 255 ký tự.
- `ward`, `district`, `city`: Các thành phần của địa chỉ, bắt buộc.
- `province_id`, `district_id`, `ward_code`: Mã địa chỉ từ GHN API, có thể null, dùng để tính phí vận chuyển.
- `address_type`: Loại địa chỉ, bắt buộc, mặc định là HOME.
- `is_default`: Trạng thái địa chỉ mặc định, bắt buộc, mặc định là false (0).

---

### 3.1.5. Bảng login_history

| Thuộc tính | Kiểu | K | U | M | Diễn giải |
|------------|------|---|---|---|-----------|
| id | int | x | x | x | Mã lịch sử đăng nhập |
| user_id | int | | | x | Mã người dùng, tham chiếu đến bảng users |
| login_method | enum('EMAIL_PASSWORD','GOOGLE') | | | x | Phương thức đăng nhập |
| ip_address | varchar(45) | | | | Địa chỉ IP |
| user_agent | varchar(500) | | | | Thông tin trình duyệt |
| is_successful | tinyint(1) | | | x | Trạng thái đăng nhập (1: thành công, 0: thất bại, mặc định: 1) |
| failure_reason | varchar(255) | | | | Lý do thất bại (nếu có) |
| created_at | timestamp | | | x | Ngày tạo |

**Mô tả:** Bảng login_history lưu trữ lịch sử đăng nhập của người dùng, bao gồm phương thức đăng nhập, IP, và kết quả.

**Ràng buộc dữ liệu:**
- `id`: Mã lịch sử đăng nhập, tự tăng, duy nhất, khóa chính.
- `user_id`: Mã người dùng, tham chiếu đến bảng users, bắt buộc.
- `login_method`: Phương thức đăng nhập, bắt buộc, có thể là EMAIL_PASSWORD hoặc GOOGLE.
- `ip_address`: Địa chỉ IP, có thể null.
- `user_agent`: Thông tin trình duyệt, có thể null.
- `is_successful`: Trạng thái đăng nhập, mặc định là true (1).
- `failure_reason`: Lý do thất bại, có thể null.

---

### 3.1.6. Bảng user_sessions

| Thuộc tính | Kiểu | K | U | M | Diễn giải |
|------------|------|---|---|---|-----------|
| id | int | x | x | x | Mã session |
| user_id | int | | | x | Mã người dùng, tham chiếu đến bảng users |
| session_token | varchar(255) | | x | x | Token session, duy nhất |
| refresh_token | varchar(255) | | x | | Token refresh, duy nhất |
| device_info | varchar(500) | | | | Thông tin thiết bị |
| ip_address | varchar(45) | | | | Địa chỉ IP |
| is_active | tinyint(1) | | | x | Trạng thái hoạt động (1: hoạt động, 0: vô hiệu hóa, mặc định: 1) |
| expires_at | timestamp | | | x | Thời điểm hết hạn |
| created_at | timestamp | | | x | Ngày tạo |
| updated_at | timestamp | | | x | Ngày cập nhật |

**Mô tả:** Bảng user_sessions lưu trữ thông tin session đăng nhập của người dùng, bao gồm token và refresh token.

**Ràng buộc dữ liệu:**
- `id`: Mã session, tự tăng, duy nhất, khóa chính.
- `user_id`: Mã người dùng, tham chiếu đến bảng users, bắt buộc.
- `session_token`: Token session, bắt buộc, duy nhất.
- `refresh_token`: Token refresh, duy nhất, có thể null.
- `device_info`: Thông tin thiết bị, có thể null.
- `ip_address`: Địa chỉ IP, có thể null.
- `is_active`: Trạng thái hoạt động, mặc định là true (1).
- `expires_at`: Thời điểm hết hạn, bắt buộc.

---

## 3.2. BẢNG SẢN PHẨM

### 3.2.1. Bảng categories

| Thuộc tính | Kiểu | K | U | M | Diễn giải |
|------------|------|---|---|---|-----------|
| id | int | x | x | x | Mã danh mục |
| name | varchar(255) | | | x | Tên danh mục |
| slug | varchar(255) | | x | x | Đường dẫn URL, duy nhất |
| image_url | varchar(500) | | | | URL ảnh danh mục |
| image_public_id | varchar(255) | | | | Public ID của ảnh trên Cloudinary |
| is_active | tinyint(1) | | | x | Trạng thái hoạt động (1: hoạt động, 0: vô hiệu hóa, mặc định: 1) |
| created_at | timestamp | | | x | Ngày tạo |
| updated_at | timestamp | | | x | Ngày cập nhật |

**Mô tả:** Bảng categories lưu trữ thông tin danh mục sản phẩm trong hệ thống.

**Ràng buộc dữ liệu:**
- `id`: Mã danh mục, tự tăng, duy nhất, khóa chính.
- `name`: Tên danh mục, bắt buộc.
- `slug`: Đường dẫn URL, bắt buộc, duy nhất, thường là tên danh mục đã được chuyển đổi (ví dụ: "ban-hoc").
- `image_url`: URL ảnh danh mục, có thể null.
- `image_public_id`: Public ID của ảnh trên Cloudinary, có thể null.
- `is_active`: Trạng thái hoạt động, mặc định là true (1).

---

### 3.2.2. Bảng brands

| Thuộc tính | Kiểu | K | U | M | Diễn giải |
|------------|------|---|---|---|-----------|
| id | int | x | x | x | Mã thương hiệu |
| name | varchar(255) | | | x | Tên thương hiệu |
| country | varchar(100) | | | | Quốc gia |
| is_active | tinyint(1) | | | x | Trạng thái hoạt động (1: hoạt động, 0: vô hiệu hóa, mặc định: 1) |
| created_at | timestamp | | | x | Ngày tạo |
| updated_at | timestamp | | | x | Ngày cập nhật |

**Mô tả:** Bảng brands lưu trữ thông tin thương hiệu sản phẩm.

**Ràng buộc dữ liệu:**
- `id`: Mã thương hiệu, tự tăng, duy nhất, khóa chính.
- `name`: Tên thương hiệu, bắt buộc.
- `country`: Quốc gia, có thể null.
- `is_active`: Trạng thái hoạt động, mặc định là true (1).

---

### 3.2.3. Bảng products

| Thuộc tính | Kiểu | K | U | M | Diễn giải |
|------------|------|---|---|---|-----------|
| id | int | x | x | x | Mã sản phẩm |
| name | varchar(255) | | | x | Tên sản phẩm |
| slug | varchar(255) | | x | x | Đường dẫn URL, duy nhất |
| description | text | | | | Mô tả sản phẩm |
| category_id | int | | | x | Mã danh mục, tham chiếu đến bảng categories |
| brand_id | int | | | x | Mã thương hiệu, tham chiếu đến bảng brands |
| status | enum('ACTIVE','INACTIVE','OUT_OF_STOCK') | | | x | Trạng thái sản phẩm (mặc định: ACTIVE) |
| is_featured | tinyint(1) | | | x | Sản phẩm nổi bật (1: có, 0: không, mặc định: 0) |
| price | decimal(12,2) | | | x | Giá gốc |
| sale_price | decimal(12,2) | | | | Giá khuyến mãi |
| cost_price | decimal(12,2) | | | | Giá vốn |
| image_url | varchar(500) | | | | URL ảnh chính |
| image_public_id | varchar(255) | | | | Public ID của ảnh trên Cloudinary |
| meta_title | varchar(255) | | | | Tiêu đề SEO |
| meta_description | varchar(500) | | | | Mô tả SEO |
| view_count | int | | | x | Số lượt xem (mặc định: 0) |
| created_at | timestamp | | | x | Ngày tạo |
| updated_at | timestamp | | | x | Ngày cập nhật |

**Mô tả:** Bảng products lưu trữ thông tin sản phẩm trong hệ thống, bao gồm giá, mô tả, và thông tin SEO.

**Ràng buộc dữ liệu:**
- `id`: Mã sản phẩm, tự tăng, duy nhất, khóa chính.
- `name`: Tên sản phẩm, bắt buộc.
- `slug`: Đường dẫn URL, bắt buộc, duy nhất.
- `description`: Mô tả sản phẩm, có thể null, kiểu text.
- `category_id`: Mã danh mục, tham chiếu đến bảng categories, bắt buộc.
- `brand_id`: Mã thương hiệu, tham chiếu đến bảng brands, bắt buộc.
- `status`: Trạng thái sản phẩm, mặc định là ACTIVE.
- `is_featured`: Sản phẩm nổi bật, mặc định là false (0).
- `price`: Giá gốc, bắt buộc, kiểu decimal(12,2).
- `sale_price`: Giá khuyến mãi, có thể null, kiểu decimal(12,2).
- `cost_price`: Giá vốn, có thể null, kiểu decimal(12,2).
- `view_count`: Số lượt xem, mặc định là 0.

**Index:**
- Fulltext index trên `name` và `description` để tìm kiếm nhanh.

---

### 3.2.4. Bảng product_images

| Thuộc tính | Kiểu | K | U | M | Diễn giải |
|------------|------|---|---|---|-----------|
| id | int | x | x | x | Mã ảnh |
| product_id | int | | | x | Mã sản phẩm, tham chiếu đến bảng products |
| image_url | varchar(500) | | | x | URL ảnh |
| image_public_id | varchar(255) | | | | Public ID của ảnh trên Cloudinary |
| is_primary | tinyint(1) | | | x | Ảnh chính (1: có, 0: không, mặc định: 0) |
| sort_order | int | | | x | Thứ tự sắp xếp (mặc định: 0) |
| created_at | timestamp | | | x | Ngày tạo |

**Mô tả:** Bảng product_images lưu trữ danh sách ảnh của sản phẩm, hỗ trợ nhiều ảnh cho một sản phẩm.

**Ràng buộc dữ liệu:**
- `id`: Mã ảnh, tự tăng, duy nhất, khóa chính.
- `product_id`: Mã sản phẩm, tham chiếu đến bảng products, bắt buộc.
- `image_url`: URL ảnh, bắt buộc.
- `image_public_id`: Public ID của ảnh trên Cloudinary, có thể null.
- `is_primary`: Ảnh chính, mặc định là false (0).
- `sort_order`: Thứ tự sắp xếp, mặc định là 0.

---

### 3.2.5. Bảng product_variants

| Thuộc tính | Kiểu | K | U | M | Diễn giải |
|------------|------|---|---|---|-----------|
| id | int | x | x | x | Mã biến thể |
| product_id | int | | | x | Mã sản phẩm, tham chiếu đến bảng products |
| stock_quantity | int | | | x | Số lượng tồn kho (mặc định: 0) |
| min_stock_level | int | | | x | Mức tồn kho tối thiểu (mặc định: 5) |
| is_active | tinyint(1) | | | x | Trạng thái hoạt động (1: hoạt động, 0: vô hiệu hóa, mặc định: 1) |
| width | int | | | | Chiều rộng (mm) |
| depth | int | | | | Chiều sâu (mm) |
| height | int | | | | Chiều cao (mm) |
| height_max | int | | | | Chiều cao tối đa (mm) |
| warranty | varchar(100) | | | | Bảo hành |
| material | varchar(255) | | | | Chất liệu |
| weight_capacity | decimal(10,2) | | | | Trọng lượng tối đa (kg) |
| color | varchar(100) | | | | Màu sắc |
| dimension_note | varchar(500) | | | | Ghi chú về kích thước |
| created_at | timestamp | | | x | Ngày tạo |
| updated_at | timestamp | | | x | Ngày cập nhật |

**Mô tả:** Bảng product_variants lưu trữ thông tin biến thể của sản phẩm (màu sắc, kích thước, tồn kho).

**Ràng buộc dữ liệu:**
- `id`: Mã biến thể, tự tăng, duy nhất, khóa chính.
- `product_id`: Mã sản phẩm, tham chiếu đến bảng products, bắt buộc, xóa cascade.
- `stock_quantity`: Số lượng tồn kho, mặc định là 0.
- `min_stock_level`: Mức tồn kho tối thiểu, mặc định là 5.
- `is_active`: Trạng thái hoạt động, mặc định là true (1).
- `width`, `depth`, `height`: Kích thước sản phẩm (mm), có thể null.
- `weight_capacity`: Trọng lượng tối đa (kg), kiểu decimal(10,2), có thể null.

---

## 3.3. BẢNG GIỎ HÀNG VÀ YÊU THÍCH

### 3.3.1. Bảng shopping_cart

| Thuộc tính | Kiểu | K | U | M | Diễn giải |
|------------|------|---|---|---|-----------|
| id | int | x | x | x | Mã giỏ hàng |
| user_id | int | | | x | Mã người dùng, tham chiếu đến bảng users |
| product_id | int | | | x | Mã sản phẩm, tham chiếu đến bảng products |
| variant_id | int | | | | Mã biến thể, tham chiếu đến bảng product_variants |
| quantity | int | | | x | Số lượng (mặc định: 1) |
| created_at | timestamp | | | x | Ngày tạo |
| updated_at | timestamp | | | x | Ngày cập nhật |

**Mô tả:** Bảng shopping_cart lưu trữ thông tin giỏ hàng của người dùng, mỗi user có thể có nhiều sản phẩm trong giỏ hàng.

**Ràng buộc dữ liệu:**
- `id`: Mã giỏ hàng, tự tăng, duy nhất, khóa chính.
- `user_id`: Mã người dùng, tham chiếu đến bảng users, bắt buộc.
- `product_id`: Mã sản phẩm, tham chiếu đến bảng products, bắt buộc.
- `variant_id`: Mã biến thể, tham chiếu đến bảng product_variants, có thể null.
- `quantity`: Số lượng, mặc định là 1.
- **Unique constraint:** (user_id, product_id, variant_id) - Mỗi user chỉ có thể thêm một sản phẩm (với cùng variant) một lần vào giỏ hàng.

---

### 3.3.2. Bảng wishlist

| Thuộc tính | Kiểu | K | U | M | Diễn giải |
|------------|------|---|---|---|-----------|
| id | int | x | x | x | Mã yêu thích |
| user_id | int | | | x | Mã người dùng, tham chiếu đến bảng users |
| product_id | int | | | x | Mã sản phẩm, tham chiếu đến bảng products |
| created_at | timestamp | | | x | Ngày tạo |

**Mô tả:** Bảng wishlist lưu trữ danh sách sản phẩm yêu thích của người dùng.

**Ràng buộc dữ liệu:**
- `id`: Mã yêu thích, tự tăng, duy nhất, khóa chính.
- `user_id`: Mã người dùng, tham chiếu đến bảng users, bắt buộc.
- `product_id`: Mã sản phẩm, tham chiếu đến bảng products, bắt buộc.
- **Unique constraint:** (user_id, product_id) - Mỗi user chỉ có thể thêm một sản phẩm một lần vào danh sách yêu thích.

---

## 3.4. BẢNG ĐÁNH GIÁ VÀ BÌNH LUẬN

### 3.4.1. Bảng product_comments

| Thuộc tính | Kiểu | K | U | M | Diễn giải |
|------------|------|---|---|---|-----------|
| id | int | x | x | x | Mã bình luận |
| user_id | int | | | x | Mã người dùng, tham chiếu đến bảng users |
| product_id | int | | | x | Mã sản phẩm, tham chiếu đến bảng products |
| parent_id | int | | | | Mã bình luận cha (để hỗ trợ reply) |
| content | text | | | x | Nội dung bình luận |
| is_approved | tinyint(1) | | | x | Trạng thái duyệt (1: đã duyệt, 0: chưa duyệt, mặc định: 0) |
| created_at | timestamp | | | x | Ngày tạo |
| updated_at | timestamp | | | x | Ngày cập nhật |

**Mô tả:** Bảng product_comments lưu trữ bình luận của người dùng về sản phẩm, hỗ trợ tính năng reply (trả lời bình luận).

**Ràng buộc dữ liệu:**
- `id`: Mã bình luận, tự tăng, duy nhất, khóa chính.
- `user_id`: Mã người dùng, tham chiếu đến bảng users, bắt buộc.
- `product_id`: Mã sản phẩm, tham chiếu đến bảng products, bắt buộc.
- `parent_id`: Mã bình luận cha, tham chiếu đến bảng product_comments, có thể null (null = bình luận gốc).
- `content`: Nội dung bình luận, bắt buộc, kiểu text.
- `is_approved`: Trạng thái duyệt, mặc định là false (0).

---

### 3.4.2. Bảng product_reviews

| Thuộc tính | Kiểu | K | U | M | Diễn giải |
|------------|------|---|---|---|-----------|
| id | int | x | x | x | Mã đánh giá |
| product_id | int | | | x | Mã sản phẩm, tham chiếu đến bảng products |
| user_id | int | | | x | Mã người dùng, tham chiếu đến bảng users |
| order_id | int | | | | Mã đơn hàng, tham chiếu đến bảng orders |
| rating | int | | | x | Điểm đánh giá (1-5) |
| title | varchar(255) | | | | Tiêu đề đánh giá |
| comment | text | | | | Nội dung đánh giá |
| is_approved | tinyint(1) | | | x | Trạng thái duyệt (1: đã duyệt, 0: chưa duyệt, mặc định: 1) |
| is_verified | tinyint(1) | | | x | Trạng thái xác thực mua hàng (1: đã xác thực, 0: chưa, mặc định: 0) |
| created_at | timestamp | | | x | Ngày tạo |
| updated_at | timestamp | | | x | Ngày cập nhật |

**Mô tả:** Bảng product_reviews lưu trữ đánh giá và nhận xét của người dùng về sản phẩm, bao gồm điểm số (rating) và nội dung.

**Ràng buộc dữ liệu:**
- `id`: Mã đánh giá, tự tăng, duy nhất, khóa chính.
- `product_id`: Mã sản phẩm, tham chiếu đến bảng products, bắt buộc.
- `user_id`: Mã người dùng, tham chiếu đến bảng users, bắt buộc.
- `order_id`: Mã đơn hàng, tham chiếu đến bảng orders, có thể null (dùng để xác thực mua hàng).
- `rating`: Điểm đánh giá, bắt buộc, giá trị từ 1 đến 5.
- `title`: Tiêu đề đánh giá, có thể null.
- `comment`: Nội dung đánh giá, có thể null, kiểu text.
- `is_approved`: Trạng thái duyệt, mặc định là true (1).
- `is_verified`: Trạng thái xác thực mua hàng, mặc định là false (0).
- **Unique constraint:** (product_id, user_id) - Mỗi user chỉ có thể đánh giá một sản phẩm một lần.

---

## 3.5. BẢNG ĐƠN HÀNG

### 3.5.1. Bảng orders

| Thuộc tính | Kiểu | K | U | M | Diễn giải |
|------------|------|---|---|---|-----------|
| id | int | x | x | x | Mã đơn hàng |
| order_number | varchar(50) | | x | x | Số đơn hàng, duy nhất |
| user_id | int | | | x | Mã người dùng, tham chiếu đến bảng users |
| status | enum('PENDING','CONFIRMED','PROCESSING','DELIVERED','CANCELLED') | | | x | Trạng thái đơn hàng (mặc định: PENDING) |
| payment_status | enum('PENDING','PAID','FAILED') | | | x | Trạng thái thanh toán (mặc định: PENDING) |
| subtotal | decimal(12,2) | | | x | Tổng tiền sản phẩm |
| shipping_fee | decimal(12,2) | | | x | Phí vận chuyển (mặc định: 0.00) |
| discount_amount | decimal(12,2) | | | x | Số tiền giảm giá (mặc định: 0.00) |
| total_amount | decimal(12,2) | | | x | Tổng tiền cuối cùng |
| shipping_address | longtext | | | x | Địa chỉ giao hàng (JSON string) |
| payment_method | enum('COD','VNPAY') | | | x | Phương thức thanh toán |
| payment_reference | varchar(255) | | | | Mã tham chiếu thanh toán |
| tracking_code | varchar(100) | | | | Mã vận đơn |
| customer_note | varchar(500) | | | | Ghi chú của khách hàng |
| admin_note | varchar(500) | | | | Ghi chú của admin |
| created_at | timestamp | | | x | Ngày tạo |
| updated_at | timestamp | | | x | Ngày cập nhật |

**Mô tả:** Bảng orders lưu trữ thông tin đơn hàng của người dùng, bao gồm trạng thái, thanh toán, và địa chỉ giao hàng.

**Ràng buộc dữ liệu:**
- `id`: Mã đơn hàng, tự tăng, duy nhất, khóa chính.
- `order_number`: Số đơn hàng, bắt buộc, duy nhất, thường có format: `<userCode><YYYYMMDD><seq>`.
- `user_id`: Mã người dùng, tham chiếu đến bảng users, bắt buộc.
- `status`: Trạng thái đơn hàng, mặc định là PENDING.
- `payment_status`: Trạng thái thanh toán, mặc định là PENDING.
- `subtotal`: Tổng tiền sản phẩm, bắt buộc, kiểu decimal(12,2).
- `shipping_fee`: Phí vận chuyển, mặc định là 0.00, kiểu decimal(12,2).
- `discount_amount`: Số tiền giảm giá, mặc định là 0.00, kiểu decimal(12,2).
- `total_amount`: Tổng tiền cuối cùng, bắt buộc, kiểu decimal(12,2).
- `shipping_address`: Địa chỉ giao hàng, bắt buộc, kiểu longtext (JSON string).
- `payment_method`: Phương thức thanh toán, bắt buộc, có thể là COD hoặc VNPAY.

---

### 3.5.2. Bảng order_items

| Thuộc tính | Kiểu | K | U | M | Diễn giải |
|------------|------|---|---|---|-----------|
| id | int | x | x | x | Mã chi tiết đơn hàng |
| order_id | int | | | x | Mã đơn hàng, tham chiếu đến bảng orders |
| product_id | int | | | x | Mã sản phẩm, tham chiếu đến bảng products |
| variant_id | int | | | | Mã biến thể, tham chiếu đến bảng product_variants |
| product_name | varchar(255) | | | x | Tên sản phẩm (lưu snapshot) |
| product_sku | varchar(255) | | | x | SKU sản phẩm (lưu snapshot) |
| variant_name | varchar(255) | | | | Tên biến thể (lưu snapshot) |
| quantity | int | | | x | Số lượng |
| unit_price | decimal(12,2) | | | x | Giá đơn vị |
| total_price | decimal(12,2) | | | x | Tổng tiền |
| created_at | timestamp | | | x | Ngày tạo |

**Mô tả:** Bảng order_items lưu trữ chi tiết sản phẩm trong đơn hàng, bao gồm thông tin snapshot (tên, giá) để đảm bảo dữ liệu không thay đổi sau khi đặt hàng.

**Ràng buộc dữ liệu:**
- `id`: Mã chi tiết đơn hàng, tự tăng, duy nhất, khóa chính.
- `order_id`: Mã đơn hàng, tham chiếu đến bảng orders, bắt buộc.
- `product_id`: Mã sản phẩm, tham chiếu đến bảng products, bắt buộc.
- `variant_id`: Mã biến thể, tham chiếu đến bảng product_variants, có thể null.
- `product_name`: Tên sản phẩm (snapshot), bắt buộc.
- `product_sku`: SKU sản phẩm (snapshot), bắt buộc.
- `variant_name`: Tên biến thể (snapshot), có thể null.
- `quantity`: Số lượng, bắt buộc.
- `unit_price`: Giá đơn vị, bắt buộc, kiểu decimal(12,2).
- `total_price`: Tổng tiền, bắt buộc, kiểu decimal(12,2).

---

### 3.5.3. Bảng order_status_history

| Thuộc tính | Kiểu | K | U | M | Diễn giải |
|------------|------|---|---|---|-----------|
| id | int | x | x | x | Mã lịch sử |
| order_id | int | | | x | Mã đơn hàng, tham chiếu đến bảng orders |
| status | enum('PENDING','CONFIRMED','PROCESSING','DELIVERED','CANCELLED') | | | x | Trạng thái đơn hàng |
| created_at | timestamp | | | x | Ngày tạo |

**Mô tả:** Bảng order_status_history lưu trữ lịch sử thay đổi trạng thái đơn hàng, giúp theo dõi quá trình xử lý đơn hàng.

**Ràng buộc dữ liệu:**
- `id`: Mã lịch sử, tự tăng, duy nhất, khóa chính.
- `order_id`: Mã đơn hàng, tham chiếu đến bảng orders, bắt buộc.
- `status`: Trạng thái đơn hàng, bắt buộc.
- `created_at`: Ngày tạo, bắt buộc.

---

## 3.6. BẢNG THANH TOÁN

### 3.6.1. Bảng payments

| Thuộc tính | Kiểu | K | U | M | Diễn giải |
|------------|------|---|---|---|-----------|
| id | int | x | x | x | Mã thanh toán |
| order_id | int | | | x | Mã đơn hàng, tham chiếu đến bảng orders |
| payment_method | enum('COD','VNPAY') | | | x | Phương thức thanh toán |
| payment_status | enum('PENDING','PAID','FAILED') | | | x | Trạng thái thanh toán (mặc định: PENDING) |
| amount | decimal(12,2) | | | x | Số tiền thanh toán |
| transaction_id | varchar(255) | | x | x | Mã giao dịch, duy nhất |
| paid_at | timestamp | | | | Thời điểm thanh toán |
| created_at | timestamp | | | x | Ngày tạo |
| payment_url | varchar(500) | | | | URL thanh toán (VNPay) |
| expires_at | timestamp | | | | Thời điểm hết hạn (VNPay) |
| partner_code | varchar(50) | | | | Mã đối tác (VNPay) |
| vnpay_transaction_no | varchar(100) | | x | | Mã giao dịch VNPay, duy nhất |
| bank_code | varchar(50) | | | | Mã ngân hàng (VNPay) |
| response_code | varchar(10) | | | | Mã phản hồi (VNPay) |
| pay_date | timestamp | | | | Ngày thanh toán (VNPay) |

**Mô tả:** Bảng payments lưu trữ thông tin thanh toán của đơn hàng, hỗ trợ cả COD và VNPay, bao gồm các trường riêng cho VNPay.

**Ràng buộc dữ liệu:**
- `id`: Mã thanh toán, tự tăng, duy nhất, khóa chính.
- `order_id`: Mã đơn hàng, tham chiếu đến bảng orders, bắt buộc.
- `payment_method`: Phương thức thanh toán, bắt buộc, có thể là COD hoặc VNPAY.
- `payment_status`: Trạng thái thanh toán, mặc định là PENDING.
- `amount`: Số tiền thanh toán, bắt buộc, kiểu decimal(12,2).
- `transaction_id`: Mã giao dịch, bắt buộc, duy nhất.
- `paid_at`: Thời điểm thanh toán, có thể null.
- `payment_url`: URL thanh toán (VNPay), có thể null.
- `expires_at`: Thời điểm hết hạn (VNPay), có thể null.
- `vnpay_transaction_no`: Mã giao dịch VNPay, duy nhất, có thể null.
- `bank_code`: Mã ngân hàng (VNPay), có thể null.
- `response_code`: Mã phản hồi (VNPay), có thể null (ví dụ: '00' = thành công).

---

## 3.7. BẢNG MÃ GIẢM GIÁ

### 3.7.1. Bảng coupons

| Thuộc tính | Kiểu | K | U | M | Diễn giải |
|------------|------|---|---|---|-----------|
| id | int | x | x | x | Mã coupon |
| code | varchar(20) | | x | x | Mã giảm giá, duy nhất |
| name | varchar(255) | | | x | Tên mã giảm giá |
| discount_type | enum('PERCENT','AMOUNT') | | | x | Loại giảm giá (phần trăm hoặc số tiền) |
| discount_value | decimal(10,2) | | | x | Giá trị giảm giá |
| minimum_amount | decimal(12,2) | | | x | Số tiền tối thiểu để áp dụng (mặc định: 0.00) |
| usage_limit | int | | | x | Giới hạn số lần sử dụng (mặc định: 100) |
| used_count | int | | | x | Số lần đã sử dụng (mặc định: 0) |
| start_date | timestamp | | | x | Ngày bắt đầu |
| end_date | timestamp | | | x | Ngày kết thúc |
| is_active | tinyint(1) | | | x | Trạng thái hoạt động (1: hoạt động, 0: vô hiệu hóa, mặc định: 1) |
| created_at | timestamp | | | x | Ngày tạo |
| updated_at | timestamp | | | x | Ngày cập nhật |

**Mô tả:** Bảng coupons lưu trữ thông tin mã giảm giá trong hệ thống.

**Ràng buộc dữ liệu:**
- `id`: Mã coupon, tự tăng, duy nhất, khóa chính.
- `code`: Mã giảm giá, bắt buộc, duy nhất, thường là chuỗi ngắn (ví dụ: "WELCOME10").
- `name`: Tên mã giảm giá, bắt buộc.
- `discount_type`: Loại giảm giá, bắt buộc, có thể là PERCENT (phần trăm) hoặc AMOUNT (số tiền).
- `discount_value`: Giá trị giảm giá, bắt buộc, kiểu decimal(10,2).
- `minimum_amount`: Số tiền tối thiểu để áp dụng, mặc định là 0.00, kiểu decimal(12,2).
- `usage_limit`: Giới hạn số lần sử dụng, mặc định là 100.
- `used_count`: Số lần đã sử dụng, mặc định là 0.
- `start_date`, `end_date`: Ngày bắt đầu và kết thúc, bắt buộc.
- `is_active`: Trạng thái hoạt động, mặc định là true (1).

---

### 3.7.2. Bảng coupon_usage

| Thuộc tính | Kiểu | K | U | M | Diễn giải |
|------------|------|---|---|---|-----------|
| id | int | x | x | x | Mã sử dụng coupon |
| coupon_id | int | | | x | Mã coupon, tham chiếu đến bảng coupons |
| user_id | int | | | x | Mã người dùng, tham chiếu đến bảng users |
| order_id | int | | | x | Mã đơn hàng, tham chiếu đến bảng orders |
| used_at | timestamp | | | x | Thời điểm sử dụng |

**Mô tả:** Bảng coupon_usage lưu trữ lịch sử sử dụng mã giảm giá của người dùng.

**Ràng buộc dữ liệu:**
- `id`: Mã sử dụng coupon, tự tăng, duy nhất, khóa chính.
- `coupon_id`: Mã coupon, tham chiếu đến bảng coupons, bắt buộc.
- `user_id`: Mã người dùng, tham chiếu đến bảng users, bắt buộc.
- `order_id`: Mã đơn hàng, tham chiếu đến bảng orders, bắt buộc.
- `used_at`: Thời điểm sử dụng, bắt buộc, mặc định là thời điểm hiện tại.

---

## 3.8. BẢNG HỆ THỐNG

### 3.8.1. Bảng banners

| Thuộc tính | Kiểu | K | U | M | Diễn giải |
|------------|------|---|---|---|-----------|
| id | int | x | x | x | Mã banner |
| title | varchar(255) | | | x | Tiêu đề banner |
| image_url | varchar(500) | | | x | URL ảnh banner |
| banner_public_id | varchar(255) | | | | Public ID của ảnh trên Cloudinary |
| link_url | varchar(500) | | | | URL liên kết khi click |
| is_active | tinyint(1) | | | x | Trạng thái hoạt động (1: hoạt động, 0: vô hiệu hóa, mặc định: 1) |
| sort_order | int | | | x | Thứ tự sắp xếp (mặc định: 0) |
| created_at | timestamp | | | x | Ngày tạo |
| updated_at | timestamp | | | x | Ngày cập nhật |

**Mô tả:** Bảng banners lưu trữ thông tin banner quảng cáo trên website.

**Ràng buộc dữ liệu:**
- `id`: Mã banner, tự tăng, duy nhất, khóa chính.
- `title`: Tiêu đề banner, bắt buộc.
- `image_url`: URL ảnh banner, bắt buộc.
- `banner_public_id`: Public ID của ảnh trên Cloudinary, có thể null.
- `link_url`: URL liên kết khi click, có thể null.
- `is_active`: Trạng thái hoạt động, mặc định là true (1).
- `sort_order`: Thứ tự sắp xếp, mặc định là 0.

---

### 3.8.2. Bảng notifications

| Thuộc tính | Kiểu | K | U | M | Diễn giải |
|------------|------|---|---|---|-----------|
| id | int | x | x | x | Mã thông báo |
| user_id | int | | | x | Mã người dùng, tham chiếu đến bảng users |
| title | varchar(255) | | | x | Tiêu đề thông báo |
| message | text | | | x | Nội dung thông báo |
| type | varchar(50) | | | x | Loại thông báo (ví dụ: 'ORDER_NEW', 'ORDER_STATUS_UPDATE') |
| is_read | tinyint(1) | | | x | Trạng thái đọc (1: đã đọc, 0: chưa đọc, mặc định: 0) |
| created_at | timestamp | | | x | Ngày tạo |

**Mô tả:** Bảng notifications lưu trữ thông báo cho người dùng trong hệ thống.

**Ràng buộc dữ liệu:**
- `id`: Mã thông báo, tự tăng, duy nhất, khóa chính.
- `user_id`: Mã người dùng, tham chiếu đến bảng users, bắt buộc.
- `title`: Tiêu đề thông báo, bắt buộc.
- `message`: Nội dung thông báo, bắt buộc, kiểu text.
- `type`: Loại thông báo, bắt buộc, thường là chuỗi mô tả (ví dụ: 'ORDER_NEW').
- `is_read`: Trạng thái đọc, mặc định là false (0).

---

### 3.8.3. Bảng settings

| Thuộc tính | Kiểu | K | U | M | Diễn giải |
|------------|------|---|---|---|-----------|
| id | int | x | x | x | Mã cài đặt |
| key_name | varchar(100) | | x | x | Tên khóa cài đặt, duy nhất |
| value | text | | | | Giá trị cài đặt |
| description | varchar(500) | | | | Mô tả cài đặt |
| created_at | timestamp | | | x | Ngày tạo |
| updated_at | timestamp | | | x | Ngày cập nhật |

**Mô tả:** Bảng settings lưu trữ các cài đặt hệ thống dạng key-value.

**Ràng buộc dữ liệu:**
- `id`: Mã cài đặt, tự tăng, duy nhất, khóa chính.
- `key_name`: Tên khóa cài đặt, bắt buộc, duy nhất (ví dụ: 'site_name', 'contact_email').
- `value`: Giá trị cài đặt, có thể null, kiểu text.
- `description`: Mô tả cài đặt, có thể null.

---

## 3.9. ENUM TYPES

### 3.9.1. UserRole
- `CUSTOMER`: Khách hàng
- `ADMIN`: Quản trị viên

### 3.9.2. OtpType
- `EMAIL_VERIFICATION`: Xác thực email
- `PASSWORD_RESET`: Đặt lại mật khẩu

### 3.9.3. AddressType
- `HOME`: Nhà riêng
- `OFFICE`: Công ty

### 3.9.4. ProductStatus
- `ACTIVE`: Đang hoạt động
- `INACTIVE`: Ngừng hoạt động
- `OUT_OF_STOCK`: Hết hàng

### 3.9.5. OrderStatus
- `PENDING`: Chờ xác nhận
- `CONFIRMED`: Đã xác nhận
- `PROCESSING`: Đang giao
- `DELIVERED`: Đã giao
- `CANCELLED`: Đã hủy

### 3.9.6. PaymentMethod
- `COD`: Thanh toán khi nhận hàng
- `VNPAY`: Thanh toán online qua VNPay

### 3.9.7. PaymentStatus
- `PENDING`: Chờ thanh toán
- `PAID`: Đã thanh toán
- `FAILED`: Thanh toán thất bại

### 3.9.8. DiscountType
- `PERCENT`: Giảm giá theo phần trăm
- `AMOUNT`: Giảm giá theo số tiền

### 3.9.9. LoginMethod
- `EMAIL_PASSWORD`: Đăng nhập bằng email và mật khẩu
- `GOOGLE`: Đăng nhập bằng Google OAuth

---

## 3.10. QUAN HỆ GIỮA CÁC BẢNG

### 3.10.1. Quan hệ User
- User → Addresses (1-n)
- User → Orders (1-n)
- User → ShoppingCart (1-n)
- User → Wishlist (1-n)
- User → ProductComments (1-n)
- User → ProductReviews (1-n)
- User → Notifications (1-n)
- User → LoginHistory (1-n)
- User → UserSessions (1-n)
- User → OtpVerifications (1-n)
- User → PasswordResets (1-n)
- User → CouponUsages (1-n)

### 3.10.2. Quan hệ Product
- Product → ProductImages (1-n)
- Product → ProductVariants (1-n)
- Product → OrderItems (1-n)
- Product → ShoppingCart (1-n)
- Product → Wishlist (1-n)
- Product → ProductComments (1-n)
- Product → ProductReviews (1-n)
- Product → Category (n-1)
- Product → Brand (n-1)

### 3.10.3. Quan hệ Order
- Order → OrderItems (1-n)
- Order → OrderStatusHistory (1-n)
- Order → Payments (1-n)
- Order → CouponUsages (1-n)
- Order → ProductReviews (1-n)
- Order → User (n-1)

### 3.10.4. Quan hệ Payment
- Payment → Order (n-1)

### 3.10.5. Quan hệ Coupon
- Coupon → CouponUsages (1-n)

---

## 3.11. INDEXES

### 3.11.1. Foreign Key Indexes
Tất cả các foreign key đều có index để tối ưu hiệu suất truy vấn:
- `addresses_user_id_fkey`
- `products_category_id_fkey`
- `products_brand_id_fkey`
- `order_items_order_id_fkey`
- `payments_order_id_fkey`
- ... (và nhiều index khác)

### 3.11.2. Fulltext Index
- `ft_product_search`: Fulltext index trên `name` và `description` của bảng `products` để tìm kiếm nhanh.

### 3.11.3. Unique Constraints
- `users.email`: Email duy nhất
- `users.phone`: Số điện thoại duy nhất
- `users.google_id`: Google ID duy nhất
- `addresses`: (user_id, product_id, variant_id) - Mỗi user chỉ có thể thêm một sản phẩm (với cùng variant) một lần vào giỏ hàng
- `wishlist`: (user_id, product_id) - Mỗi user chỉ có thể thêm một sản phẩm một lần vào danh sách yêu thích
- `product_reviews`: (product_id, user_id) - Mỗi user chỉ có thể đánh giá một sản phẩm một lần
- `orders.order_number`: Số đơn hàng duy nhất
- `payments.transaction_id`: Mã giao dịch duy nhất
- `payments.vnpay_transaction_no`: Mã giao dịch VNPay duy nhất
- `coupons.code`: Mã giảm giá duy nhất
- `settings.key_name`: Tên khóa cài đặt duy nhất

---

## 3.12. LƯU Ý QUAN TRỌNG

1. **Snapshot Data**: Bảng `order_items` lưu snapshot (tên, giá) của sản phẩm để đảm bảo dữ liệu không thay đổi sau khi đặt hàng.

2. **JSON Storage**: Bảng `orders.shipping_address` lưu địa chỉ giao hàng dạng JSON string để linh hoạt.

3. **GHN Integration**: Bảng `addresses` có các trường `province_id`, `district_id`, `ward_code` để tích hợp với GHN API tính phí vận chuyển.

4. **Soft Delete**: Một số bảng không có soft delete, sử dụng `onDelete: NoAction` để tránh xóa nhầm dữ liệu quan trọng.

5. **Cascade Delete**: Chỉ có `ProductVariant` xóa cascade khi `Product` bị xóa, các bảng khác sử dụng `NoAction`.

6. **Default Values**: Nhiều trường có giá trị mặc định để đảm bảo tính nhất quán dữ liệu.

