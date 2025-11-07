# Hướng dẫn Setup FullText Search

## 📋 Tổng quan

FullText search đã được tích hợp vào hệ thống để tìm kiếm sản phẩm thông minh hơn, tìm trong cả `name` và `description` của sản phẩm.

## 🚀 Cài đặt

### Bước 1: Tạo FullText Index

Chạy script để tạo FullText index trên bảng `products`:

```bash
cd backend
npm run add-fulltext-index
```

Hoặc chạy trực tiếp:
```bash
node backend/scripts/add-fulltext-index.js
```

### Bước 2: Test FullText Search

Sau khi tạo index, test xem có hoạt động không:

```bash
cd backend
npm run test-fulltext
```

## ✅ Tính năng

### Backend
- ✅ FullText search trên cột `name` và `description`
- ✅ Relevance scoring (sắp xếp theo độ liên quan)
- ✅ BOOLEAN MODE với pattern `+word*` (tìm từ bắt đầu bằng)
- ✅ Sanitize input để tránh SQL injection
- ✅ Fallback về Prisma query thông thường nếu không có search query

### Frontend
- ✅ Admin Products: Search box với FullText search
- ✅ User Products: Search box với FullText search
- ✅ Auto search khi nhấn Enter
- ✅ Debounce search (500ms) để tối ưu performance

## 🔍 Cách sử dụng

### Admin Panel
1. Vào `/admin/products`
2. Nhập từ khóa vào ô tìm kiếm
3. Kết quả sẽ được sắp xếp theo độ liên quan

### User Page
1. Vào `/san-pham`
2. Nhập từ khóa vào ô tìm kiếm ở sidebar
3. Kết quả sẽ được sắp xếp theo độ liên quan

## 📝 Lưu ý

1. **Minimum Word Length**: MySQL mặc định là 4 ký tự. Từ ngắn hơn có thể không được index.
   - Ví dụ: "bàn" (3 ký tự) có thể không tìm được
   - Ví dụ: "ghế" (3 ký tự) có thể không tìm được
   - Giải pháp: Thay đổi `ft_min_word_len` trong MySQL config nếu cần

2. **FullText Index**: Chỉ hoạt động sau khi chạy script tạo index

3. **Performance**: FullText search nhanh hơn `LIKE` query rất nhiều, đặc biệt với dữ liệu lớn

## 🐛 Troubleshooting

### Lỗi: "FULLTEXT index not found"
- Chạy lại: `npm run add-fulltext-index`

### Lỗi: "No results found"
- Kiểm tra xem có sản phẩm trong database không
- Kiểm tra minimum word length của MySQL
- Test với từ khóa dài hơn (>= 4 ký tự)

### Lỗi: "Duplicate key name"
- Index đã tồn tại, không cần tạo lại

## 📊 So sánh

| Tính năng | LIKE Query | FullText Search |
|-----------|------------|-----------------|
| Tốc độ | Chậm với dữ liệu lớn | Nhanh |
| Relevance | Không có | Có |
| Partial match | Có | Có (với *) |
| Multi-word | Khó | Dễ |
| Index | Không cần | Cần |

## 🎯 Ví dụ Search

- `"bàn làm việc"` → Tìm sản phẩm có chứa "bàn" và "làm" và "việc"
- `"ghế"` → Tìm sản phẩm có chứa từ bắt đầu bằng "ghế"
- `"văn phòng"` → Tìm sản phẩm có chứa "văn" và "phòng"

