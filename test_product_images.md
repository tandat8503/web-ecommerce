# 🖼️ TEST CHỨC NĂNG QUẢN LÝ ẢNH SẢN PHẨM

## ✅ **CÁC FILE ĐÃ TẠO/CẬP NHẬT:**

### **Frontend:**
1. ✅ `AdminProductImages.jsx` - Trang quản lý ảnh sản phẩm
2. ✅ `router.jsx` - Thêm route `/admin/product-images`
3. ✅ `adminProductImages.js` - Cập nhật API functions
4. ✅ `Sidebar.jsx` - Đã có menu "Quản lý hình ảnh"

### **Backend:**
1. ✅ `adminProductImageRoutes.js` - Routes cho product images
2. ✅ `adminProductImageController.js` - Controller xử lý logic
3. ✅ `index.js` - Đã đăng ký routes `/api/admin/product-images`

## 🚀 **CÁCH KIỂM TRA:**

### **Bước 1: Khởi động hệ thống**
```bash
# Backend
cd web-ecommerce/backend
npm run dev

# Frontend  
cd web-ecommerce/frontend
npm run dev
```

### **Bước 2: Truy cập trang admin**
1. Mở browser: `http://localhost:3000`
2. Đăng nhập với tài khoản admin
3. Vào Admin Panel
4. Click menu "Quản lý hình ảnh" (icon FaImage)

### **Bước 3: Test các chức năng**

#### **3.1. Chọn sản phẩm**
- Dropdown "Chọn sản phẩm để quản lý ảnh"
- Chọn một sản phẩm có sẵn
- Xem thông tin sản phẩm hiển thị

#### **3.2. Upload ảnh mới**
- Click "Upload ảnh"
- Chọn file ảnh từ máy tính
- Xem ảnh được upload thành công

#### **3.3. Quản lý ảnh**
- Xem danh sách ảnh trong bảng
- Click "Đặt làm ảnh chính" (icon ngôi sao)
- Click "Sửa" để chỉnh sửa thông tin ảnh
- Click "Xóa" để xóa ảnh

#### **3.4. Sắp xếp ảnh**
- Kéo thả ảnh để sắp xếp thứ tự
- Xem thứ tự được cập nhật

## 🔍 **KIỂM TRA BACKEND API:**

### **Test API endpoints:**
```bash
# Lấy danh sách ảnh của sản phẩm
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/admin/product-images/1

# Upload ảnh mới
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/image.jpg" \
  -F "productId=1" \
  -F "isPrimary=true" \
  http://localhost:5000/api/admin/product-images/1

# Set ảnh chính
curl -X PATCH \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"imageId": 1}' \
  http://localhost:5000/api/admin/product-images/1/set-primary
```

## 🐛 **TROUBLESHOOTING:**

### **Lỗi thường gặp:**

1. **"Không thể truy cập trang"**
   - Kiểm tra route đã được thêm vào router chưa
   - Kiểm tra component import đúng chưa

2. **"Lỗi 401 Unauthorized"**
   - Kiểm tra token authentication
   - Đăng nhập lại với tài khoản admin

3. **"Lỗi upload ảnh"**
   - Kiểm tra backend có chạy không
   - Kiểm tra Cloudinary config
   - Kiểm tra file upload middleware

4. **"Không hiển thị ảnh"**
   - Kiểm tra API response format
   - Kiểm tra imageUrl có đúng không

## 📋 **CHECKLIST HOÀN THÀNH:**

- [ ] ✅ Tạo AdminProductImages component
- [ ] ✅ Thêm route vào router
- [ ] ✅ Cập nhật API functions
- [ ] ✅ Backend routes đã có sẵn
- [ ] ✅ Dependencies đã cài đặt
- [ ] ✅ Sidebar menu đã có
- [ ] 🔄 Test upload ảnh
- [ ] 🔄 Test quản lý ảnh
- [ ] 🔄 Test sắp xếp ảnh
- [ ] 🔄 Test set ảnh chính

## 🎉 **KẾT QUẢ MONG ĐỢI:**

Sau khi hoàn thành, bạn sẽ có:
- ✅ Trang quản lý ảnh sản phẩm đầy đủ chức năng
- ✅ Upload ảnh mới cho sản phẩm
- ✅ Quản lý ảnh (sửa, xóa, set ảnh chính)
- ✅ Sắp xếp thứ tự ảnh bằng drag & drop
- ✅ Giao diện đẹp và thân thiện
- ✅ Tích hợp hoàn chỉnh với hệ thống admin

**Chúc bạn thành công! 🚀**
