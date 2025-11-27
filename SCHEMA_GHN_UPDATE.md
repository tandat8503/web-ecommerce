# ✅ CẬP NHẬT SCHEMA PRISMA ĐỂ TÍCH HỢP GHN

## 📋 Tổng quan

Đã cập nhật model `Address` trong `schema.prisma` để lưu các mã địa chỉ từ GHN API, phục vụ cho việc tính phí vận chuyển.

---

## ✅ Các field đã thêm vào model Address

### Các field mới:
1. **`provinceId`** (Int?, optional)
   - Mã ProvinceID từ GHN API
   - Database column: `province_id`
   - Dùng để tính phí vận chuyển

2. **`districtId`** (Int?, optional)
   - Mã DistrictID từ GHN API
   - Database column: `district_id`
   - Dùng để tính phí vận chuyển

3. **`wardCode`** (String?, optional)
   - Mã WardCode từ GHN API
   - Database column: `ward_code`
   - Dùng để tính phí vận chuyển

### Schema sau khi cập nhật:

```prisma
model Address {
  id            Int         @id @default(autoincrement())
  userId        Int         @map("user_id")
  fullName      String      @map("full_name")
  phone         String
  streetAddress String      @map("street_address")
  ward          String
  district      String
  city          String
  // GHN Integration - Mã địa chỉ từ GHN API để tính phí vận chuyển
  provinceId    Int?        @map("province_id")       // ProvinceID từ GHN API
  districtId    Int?        @map("district_id")       // DistrictID từ GHN API
  wardCode      String?     @map("ward_code")         // WardCode từ GHN API
  addressType   AddressType @default(HOME) @map("address_type")
  isDefault     Boolean     @default(false) @map("is_default")
  note          String?
  createdAt     DateTime    @default(now()) @map("created_at")
  updatedAt     DateTime    @updatedAt @map("updated_at")
  user          User        @relation(fields: [userId], references: [id], onDelete: NoAction)

  @@index([userId], map: "addresses_user_id_fkey")
  @@map("addresses")
}
```

---

## 📝 Các bước tiếp theo

### 1. Tạo Migration
Chạy lệnh sau để tạo migration file:

```bash
cd backend
npx prisma migrate dev --name add_ghn_address_fields
```

### 2. Kiểm tra Migration
Migration sẽ tạo 3 cột mới trong bảng `addresses`:
- `province_id` (INT, NULL)
- `district_id` (INT, NULL)
- `ward_code` (VARCHAR, NULL)

### 3. Generate Prisma Client
Sau khi migration thành công, Prisma sẽ tự động generate client mới. Nếu cần generate thủ công:

```bash
npx prisma generate
```

---

## 🔄 Backward Compatibility

### Tại sao các field là optional (nullable)?
- Các địa chỉ cũ trong database không có mã GHN
- Không muốn phá vỡ dữ liệu hiện tại
- Có thể cập nhật dần dần khi user chỉnh sửa địa chỉ

### Xử lý địa chỉ cũ:
- Nếu `provinceId`, `districtId`, `wardCode` là `null` → Không thể tính phí vận chuyển tự động
- Có thể yêu cầu user cập nhật địa chỉ để có mã GHN
- Hoặc fallback về tính phí cố định

---

## ✅ Kết luận

**Schema đã được cập nhật thành công!** 

Các field mới sẽ cho phép:
- ✅ Lưu mã địa chỉ từ GHN API
- ✅ Tính phí vận chuyển chính xác
- ✅ Tương thích ngược với dữ liệu cũ (nullable fields)

**Bước tiếp theo:** Tạo migration và áp dụng vào database.

---

**Ngày cập nhật:** 2025-11-26

