# HƯỚNG DẪN CẤU HÌNH NÚT ZALO LIÊN HỆ

## 🎯 CHỨC NĂNG

Nút Zalo nổi (Floating Zalo Button) hiển thị ở góc dưới bên phải màn hình, cho phép khách hàng liên hệ trực tiếp qua Zalo.

---

## ✅ ĐÃ TRIỂN KHAI

### **1. Component ZaloButton**
- **File:** `frontend/src/components/user/ZaloButton.jsx`
- **Vị trí:** Góc dưới bên phải màn hình
- **Tính năng:**
  - Icon Zalo màu xanh (#0068FF)
  - Hiệu ứng hover và scale
  - Animation pulse (nhấp nháy)
  - Tooltip hiển thị khi hover
  - Click để mở chat Zalo

### **2. Tích hợp vào UserLayout**
- **File:** `frontend/src/layout/user/UserLayout.jsx`
- Hiển thị trên **tất cả trang user**

---

## 📋 CẤU HÌNH SỐ ĐIỆN THOẠI ZALO

### **Bước 1: Mở file ZaloButton.jsx**

```bash
d:\web-ecommerce\frontend\src\components\user\ZaloButton.jsx
```

### **Bước 2: Thay đổi số điện thoại**

Tìm dòng:

```javascript
const ZALO_PHONE = '84906060606'; // Thay bằng số Zalo thực tế của bạn
```

Thay bằng số Zalo của bạn (định dạng quốc tế):

```javascript
const ZALO_PHONE = '84xxxxxxxxx'; // Ví dụ: 84906060606
```

**Lưu ý:**
- Bỏ số 0 đầu tiên
- Thêm mã quốc gia 84 (Việt Nam)
- Ví dụ: `0906060606` → `84906060606`

---

## 🎨 TÙY CHỈNH GIAO DIỆN

### **1. Thay đổi vị trí**

Mặc định: Góc dưới bên phải

```javascript
<div className="fixed bottom-6 right-6 z-50">
```

**Góc dưới bên trái:**
```javascript
<div className="fixed bottom-6 left-6 z-50">
```

**Góc trên bên phải:**
```javascript
<div className="fixed top-20 right-6 z-50">
```

### **2. Thay đổi màu sắc**

Màu mặc định: Xanh Zalo (#0068FF)

```javascript
className="... bg-[#0068FF] hover:bg-[#0052CC] ..."
```

**Màu xanh lá:**
```javascript
className="... bg-green-500 hover:bg-green-600 ..."
```

**Màu đỏ:**
```javascript
className="... bg-red-500 hover:bg-red-600 ..."
```

### **3. Thay đổi kích thước**

Kích thước mặc định: 56px (w-14 h-14)

```javascript
className="... w-14 h-14 ..."
```

**Lớn hơn:**
```javascript
className="... w-16 h-16 ..." // 64px
```

**Nhỏ hơn:**
```javascript
className="... w-12 h-12 ..." // 48px
```

---

## 🧪 KIỂM TRA

### **1. Kiểm tra hiển thị**

1. Mở trang web (bất kỳ trang user nào)
2. Xem góc dưới bên phải
3. Nút Zalo màu xanh với hiệu ứng nhấp nháy

### **2. Kiểm tra chức năng**

1. Hover chuột vào nút → Hiển thị tooltip
2. Click vào nút → Mở Zalo chat trong tab mới
3. Kiểm tra số điện thoại đúng chưa

### **3. Kiểm tra responsive**

- **Desktop:** Hiển thị bình thường
- **Tablet:** Hiển thị bình thường
- **Mobile:** Hiển thị nhỏ hơn một chút nhưng vẫn dễ click

---

## 🔧 TÙY CHỈNH NÂNG CAO

### **1. Ẩn trên một số trang**

Nếu muốn ẩn nút Zalo trên một số trang cụ thể:

```javascript
import { useLocation } from 'react-router-dom';

const ZaloButton = () => {
  const location = useLocation();
  
  // Ẩn trên trang checkout
  if (location.pathname === '/checkout') {
    return null;
  }
  
  // ... rest of code
};
```

### **2. Thêm số lượng tin nhắn chưa đọc**

```javascript
<div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
  3
</div>
```

### **3. Thay đổi icon**

Nếu muốn dùng icon khác, thay thế SVG:

```javascript
import { MessageCircle } from 'lucide-react';

// Trong JSX:
<MessageCircle className="w-7 h-7" />
```

---

## 📱 LINK ZALO

### **Cách hoạt động:**

Khi click nút, sẽ mở link:
```
https://zalo.me/84906060606
```

### **Hành vi:**

- **Desktop:** Mở Zalo Web hoặc ứng dụng Zalo (nếu đã cài)
- **Mobile:** Mở ứng dụng Zalo trực tiếp
- **Chưa cài Zalo:** Chuyển đến trang tải Zalo

---

## 🎯 BEST PRACTICES

### **1. Vị trí**
- ✅ Góc dưới bên phải (phổ biến nhất)
- ✅ Không che khuất nội dung quan trọng
- ✅ Dễ dàng nhìn thấy và click

### **2. Kích thước**
- ✅ Đủ lớn để dễ click (tối thiểu 48x48px)
- ✅ Không quá lớn làm mất thẩm mỹ

### **3. Màu sắc**
- ✅ Dùng màu xanh Zalo chính thức (#0068FF)
- ✅ Tương phản với background

### **4. Animation**
- ✅ Hiệu ứng pulse để thu hút chú ý
- ✅ Không quá chói mắt

---

## 🚀 NÂNG CẤP TRONG TƯƠNG LAI

### **1. Multi-channel contact**

Thêm nhiều kênh liên hệ:

```javascript
<div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
  <ZaloButton />
  <FacebookButton />
  <PhoneButton />
</div>
```

### **2. Chat widget tích hợp**

Tích hợp Zalo OA (Official Account) widget:

```javascript
<script src="https://sp.zalo.me/plugins/sdk.js"></script>
<div class="zalo-chat-widget" data-oaid="YOUR_OA_ID"></div>
```

### **3. Analytics**

Theo dõi số lượng click:

```javascript
const handleZaloClick = () => {
  // Google Analytics
  gtag('event', 'click', {
    event_category: 'Contact',
    event_label: 'Zalo Button'
  });
  
  window.open(`https://zalo.me/${ZALO_PHONE}`, '_blank');
};
```

---

## ✅ HOÀN TẤT!

Bây giờ khách hàng có thể liên hệ với bạn qua Zalo dễ dàng chỉ với 1 click! 🎉

### **Checklist:**

- [x] Tạo component ZaloButton
- [x] Tích hợp vào UserLayout
- [x] Cấu hình số điện thoại
- [ ] Test trên desktop
- [ ] Test trên mobile
- [ ] Kiểm tra link Zalo hoạt động

---

## 📞 HỖ TRỢ

Nếu có vấn đề, kiểm tra:

1. **Console log:** Xem có lỗi JavaScript không
2. **Network tab:** Xem link Zalo có đúng không
3. **Số điện thoại:** Đảm bảo định dạng đúng (84xxxxxxxxx)
4. **Zalo app:** Đảm bảo đã cài Zalo trên thiết bị test

---

**Chúc bạn thành công!** 🚀
