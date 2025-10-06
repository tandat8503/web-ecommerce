# 🗑️ TEST TÍNH NĂNG XÓA NHIỀU ẢNH

## ✅ **TÍNH NĂNG MỚI ĐÃ THÊM:**

### **1. Checkbox Selection**
- **Checkbox header**: Chọn/bỏ chọn tất cả ảnh
- **Checkbox từng dòng**: Chọn/bỏ chọn ảnh riêng lẻ
- **Indeterminate state**: Hiển thị trạng thái chọn một phần

### **2. Button Xóa Nhiều Ảnh**
- **Hiển thị có điều kiện**: Chỉ hiện khi có ảnh được chọn
- **Hiển thị số lượng**: "Xóa X ảnh"
- **Icon và màu sắc**: Icon thùng rác, màu đỏ (danger)

### **3. Modal Xác Nhận**
- **Title**: "Xác nhận xóa ảnh"
- **Nội dung**: Hiển thị số lượng ảnh sẽ xóa
- **Icon**: Icon thùng rác lớn màu đỏ
- **Buttons**: "Hủy" và "Xóa X ảnh"
- **Loading state**: Disable khi đang xóa

### **4. Logic Xử Lý**
- **Select/Deselect**: Toggle selection cho từng ảnh
- **Select All**: Chọn/bỏ chọn tất cả ảnh
- **Delete Multiple**: Xóa từng ảnh một cách tuần tự
- **Clear Selection**: Xóa selection sau khi xóa thành công

## 🚀 **CÁCH SỬ DỤNG:**

### **Bước 1: Khởi động hệ thống**
```bash
# Backend
cd web-ecommerce/backend
npm run dev

# Frontend
cd web-ecommerce/frontend
npm run dev
```

### **Bước 2: Test chọn ảnh**
1. Truy cập: `http://localhost:3000/admin/product-images`
2. Chọn sản phẩm từ dropdown
3. **Test chọn ảnh riêng lẻ**:
   - Click checkbox ở đầu mỗi dòng ảnh
   - Xem ảnh được chọn (checkbox được check)
   - Click lại để bỏ chọn

### **Bước 3: Test chọn tất cả ảnh**
1. **Test chọn tất cả**:
   - Click checkbox ở header (cột đầu tiên)
   - Xem tất cả ảnh được chọn
   - Click lại để bỏ chọn tất cả

2. **Test chọn một phần**:
   - Chọn một vài ảnh (không phải tất cả)
   - Xem checkbox header ở trạng thái indeterminate (dấu gạch ngang)

### **Bước 4: Test xóa nhiều ảnh**
1. **Chọn ảnh để xóa**:
   - Chọn 2-3 ảnh bằng checkbox
   - Xem button "Xóa X ảnh" xuất hiện ở header

2. **Test xóa nhiều ảnh**:
   - Click button "Xóa X ảnh"
   - Xem Modal xác nhận xuất hiện
   - Xem nội dung Modal hiển thị đúng số lượng ảnh
   - Click "Xóa X ảnh" trong Modal
   - Xem ảnh được xóa thành công
   - Xem selection được clear

### **Bước 5: Test các trường hợp khác**
1. **Test không chọn ảnh**:
   - Không chọn ảnh nào
   - Xem button "Xóa X ảnh" không hiển thị

2. **Test hủy xóa**:
   - Chọn ảnh và click "Xóa X ảnh"
   - Click "Hủy" trong Modal
   - Xem Modal đóng và ảnh không bị xóa

3. **Test xóa 1 ảnh**:
   - Chọn 1 ảnh
   - Click "Xóa X ảnh"
   - Xem Modal hiển thị "Xóa 1 ảnh"

## 🔍 **KIỂM TRA UI/UX:**

### **1. Checkbox Header**
- ✅ Hiển thị checkbox ở cột đầu tiên
- ✅ Checked khi tất cả ảnh được chọn
- ✅ Indeterminate khi chọn một phần
- ✅ Unchecked khi không có ảnh nào được chọn

### **2. Checkbox Từng Dòng**
- ✅ Hiển thị checkbox ở mỗi dòng ảnh
- ✅ Checked khi ảnh được chọn
- ✅ Unchecked khi ảnh không được chọn

### **3. Button Xóa Nhiều Ảnh**
- ✅ Chỉ hiển thị khi có ảnh được chọn
- ✅ Hiển thị đúng số lượng ảnh
- ✅ Màu đỏ (danger) và có icon thùng rác
- ✅ Disabled khi đang upload

### **4. Modal Xác Nhận**
- ✅ Title: "Xác nhận xóa ảnh"
- ✅ Icon thùng rác lớn màu đỏ
- ✅ Hiển thị đúng số lượng ảnh
- ✅ Buttons: "Hủy" và "Xóa X ảnh"
- ✅ Loading state khi đang xóa

## 🐛 **TROUBLESHOOTING:**

### **Nếu có lỗi:**

1. **"Checkbox không hoạt động"**
   - Kiểm tra `handleSelectImage` function
   - Kiểm tra `selectedImages` state
   - Kiểm tra `onChange` handler

2. **"Button không hiển thị"**
   - Kiểm tra `selectedImages.length > 0`
   - Kiểm tra conditional rendering
   - Kiểm tra state update

3. **"Modal không hiển thị"**
   - Kiểm tra `deleteModalVisible` state
   - Kiểm tra `handleDeleteMultiple` function
   - Kiểm tra Modal component

4. **"Xóa không hoạt động"**
   - Kiểm tra `confirmDeleteMultiple` function
   - Kiểm tra API call `deleteProductImage`
   - Kiểm tra error handling

5. **"Selection không clear"**
   - Kiểm tra `setSelectedImages([])` trong `confirmDeleteMultiple`
   - Kiểm tra `fetchImages` có clear selection không

## 📋 **CHECKLIST HOÀN THÀNH:**

- [ ] ✅ Thêm state cho selection
- [ ] ✅ Thêm functions xử lý selection
- [ ] ✅ Thêm column checkbox vào Table
- [ ] ✅ Thêm button xóa nhiều ảnh
- [ ] ✅ Thêm Modal xác nhận
- [ ] ✅ Thêm clear selection logic
- [ ] 🔄 Test chọn ảnh riêng lẻ
- [ ] 🔄 Test chọn tất cả ảnh
- [ ] 🔄 Test xóa nhiều ảnh
- [ ] 🔄 Test hủy xóa
- [ ] 🔄 Test UI/UX

## 🎯 **KẾT QUẢ MONG ĐỢI:**

Sau khi hoàn thành, bạn sẽ có:
- ✅ **Checkbox selection** hoạt động mượt mà
- ✅ **Button xóa nhiều ảnh** hiển thị có điều kiện
- ✅ **Modal xác nhận** với UI/UX đẹp
- ✅ **Xóa nhiều ảnh** hoạt động ổn định
- ✅ **Clear selection** sau khi xóa
- ✅ **Error handling** tốt

## 🎉 **TÓM TẮT TÍNH NĂNG:**

1. **Selection**: Checkbox để chọn ảnh riêng lẻ hoặc tất cả
2. **Button**: Hiển thị có điều kiện với số lượng ảnh
3. **Modal**: Xác nhận trước khi xóa với UI đẹp
4. **Logic**: Xóa tuần tự và clear selection
5. **UX**: Loading state và error handling

**Chúc bạn thành công! 🎉**
