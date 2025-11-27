# 📦 SỬ DỤNG KÍCH THƯỚC TỪ PRODUCT_VARIANT CHO TÍNH PHÍ VẬN CHUYỂN

## ✅ Tổng quan

Hệ thống **đã sử dụng kích thước từ bảng `product_variant`** để tính phí vận chuyển GHN chính xác hơn.

---

## 📊 Dữ liệu từ Product Variant

### **Các trường được sử dụng:**

| Trường trong DB | Ý nghĩa | Đơn vị | Sử dụng cho GHN |
|----------------|---------|--------|-----------------|
| `width` | Chiều rộng sản phẩm | mm | → `length` (cm) |
| `depth` | Chiều sâu sản phẩm | mm | → `width` (cm) |
| `height` | Chiều cao sản phẩm | mm | → `height` (cm) |
| `weightCapacity` | Trọng tải (chưa dùng) | kg | - |

---

## 🔄 Flow xử lý

### **1. Frontend (Checkout Page)**

**File:** `frontend/src/pages/user/checkout/useCheckout.js`

```javascript
const buildShippingMetrics = (items) => {
  // Lặp qua từng item trong giỏ hàng
  items.forEach((item) => {
    const variant = item.variant;
    
    if (variant) {
      // ✅ Sử dụng kích thước từ variant
      const lengthCm = mmToCm(variant.width);  // width → length
      const widthCm = mmToCm(variant.depth);   // depth → width
      const heightCm = mmToCm(variant.height); // height → height
      
      // Lấy kích thước lớn nhất (khi có nhiều sản phẩm)
      metrics.length = Math.max(metrics.length, lengthCm);
      metrics.width = Math.max(metrics.width, widthCm);
      metrics.height = Math.max(metrics.height, heightCm);
    }
  });
  
  // Sắp xếp: length >= width >= height (yêu cầu GHN)
  const dimensions = [length, width, height].sort((a, b) => b - a);
  
  return metrics;
};
```

**Khi nào gọi:**
- Khi user chọn địa chỉ có mã GHN (`districtId`, `wardCode`)
- Khi giỏ hàng thay đổi (thêm/bớt sản phẩm)
- Tự động tính lại phí vận chuyển

---

### **2. Backend (Tạo đơn hàng)**

**File:** `backend/controller/orderController.js`

```javascript
const buildShipmentMetrics = (cartItems) => {
  // Logic tương tự frontend
  cartItems.forEach((item) => {
    const variant = item.variant;
    
    if (variant) {
      // ✅ Sử dụng kích thước từ variant
      const lengthCm = mmToCm(variant.width);
      const widthCm = mmToCm(variant.depth);
      const heightCm = mmToCm(variant.height);
      // ...
    }
  });
  
  return metrics;
};
```

**Khi nào gọi:**
- Khi tạo đơn hàng (`createOrder`)
- Tính lại phí vận chuyển để lưu vào database
- Đảm bảo phí vận chuyển chính xác trong đơn hàng

---

## 🎯 Logic Mapping

### **Chuyển đổi đơn vị:**
- **DB lưu:** mm (millimeters)
- **GHN yêu cầu:** cm (centimeters)
- **Công thức:** `cm = ceil(mm / 10)`

### **Mapping kích thước:**
```
Variant (DB)          →  GHN API
─────────────────────────────────────
width  (1600mm)      →  length (160cm)
depth  (800mm)       →  width  (80cm)
height (750mm)       →  height (75cm)
```

### **Ví dụ thực tế:**

**Sản phẩm:** Bàn làm việc Eos EU01
- `variant.width = 1600` mm
- `variant.depth = 800` mm
- `variant.height = 750` mm

**Metrics gửi GHN:**
```javascript
{
  weight: 500,        // gram (mặc định)
  length: 160,        // cm (từ width)
  width: 80,          // cm (từ depth)
  height: 75          // cm (từ height)
}
```

---

## 📋 Xử lý trường hợp đặc biệt

### **1. Sản phẩm không có variant:**
```javascript
if (!variant) {
  // Dùng giá trị mặc định
  length: 30cm
  width: 30cm
  height: 30cm
  weight: 500g
}
```

### **2. Variant thiếu kích thước:**
```javascript
if (!variant.width) {
  // Dùng giá trị mặc định cho chiều đó
  length: max(30cm, các chiều khác)
}
```

### **3. Nhiều sản phẩm:**
```javascript
// Lấy kích thước LỚN NHẤT cho mỗi chiều
metrics.length = Math.max(metrics.length, itemLength);
metrics.width = Math.max(metrics.width, itemWidth);
metrics.height = Math.max(metrics.height, itemHeight);
```

---

## ✅ Kết quả

1. **Phí vận chuyển chính xác hơn:** Dựa trên kích thước thực tế của sản phẩm
2. **Tự động cập nhật:** Khi admin thay đổi kích thước variant, phí vận chuyển sẽ tự động tính lại
3. **Hỗ trợ nhiều sản phẩm:** Tính tổng kích thước khi đặt nhiều sản phẩm cùng lúc

---

## 📝 Lưu ý

1. **Kích thước trong DB:** Lưu bằng **mm** (millimeters)
2. **GHN API yêu cầu:** Gửi bằng **cm** (centimeters)
3. **Sắp xếp bắt buộc:** `length >= width >= height` (yêu cầu của GHN)
4. **Giới hạn trọng lượng:** Tối đa 30kg cho dịch vụ chuẩn

---

**Ngày cập nhật:** 2025-01-30  
**Status:** ✅ Đã sử dụng kích thước từ product_variant

