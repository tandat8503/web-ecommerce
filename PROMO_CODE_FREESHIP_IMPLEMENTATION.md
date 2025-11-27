# 🎟️ HƯỚNG DẪN IMPLEMENT MÃ KHUYẾN MÃI MIỄN PHÍ VẬN CHUYỂN

## 📋 Tổng quan

Tài liệu này hướng dẫn chi tiết cách implement tính năng **mã khuyến mãi miễn phí vận chuyển (Free Shipping Promo Code)** vào hệ thống e-commerce.

### **Mục tiêu:**
- User có thể nhập mã khuyến mãi trong trang checkout
- Mã khuyến mãi có thể miễn phí vận chuyển
- Áp dụng giảm giá vào phí vận chuyển
- Validate mã khuyến mãi trước khi áp dụng
- Lưu mã đã sử dụng vào order

---

## 🏗️ Kiến trúc Solution

### **Approach 1: Sử dụng DiscountType = "FREESHIP" (Recommended)**

**Ưu điểm:**
- Rõ ràng, dễ hiểu
- Không cần lưu giá trị cụ thể
- Tự động áp dụng 100% phí vận chuyển

**Cách hoạt động:**
- Thêm `FREESHIP` vào enum `DiscountType`
- Khi áp dụng mã: `shippingFee = 0`
- Không cần `discountValue` vì luôn miễn phí 100%

### **Approach 2: Sử dụng DiscountType = "AMOUNT" với giá trị động**

**Ưu điểm:**
- Linh hoạt, có thể miễn phí một phần
- Không cần thay đổi enum

**Cách hoạt động:**
- Dùng `AMOUNT` với `discountValue` = phí vận chuyển
- Tính: `finalShippingFee = shippingFee - discountValue`

**Recommendation:** Dùng **Approach 1** vì rõ ràng và dễ maintain hơn.

---

## 📊 Database Schema

### **1. Cập nhật Enum DiscountType**

File: `backend/prisma/schema.prisma`

```prisma
enum DiscountType {
  PERCENT    // Giảm % (ví dụ: 10%)
  AMOUNT     // Giảm số tiền cố định (ví dụ: 50000 VND)
  FREESHIP   // ✅ MỚI: Miễn phí vận chuyển
}
```

### **2. Cập nhật Order Model**

Thêm trường để lưu mã khuyến mãi đã sử dụng:

```prisma
model Order {
  // ... existing fields ...
  couponCode    String?   @map("coupon_code")        // ✅ Mã khuyến mãi đã áp dụng
  couponId      Int?      @map("coupon_id")          // ✅ FK đến coupons table
  discountAmount Decimal? @map("discount_amount") @db.Decimal(12, 2) // ✅ Số tiền được giảm
  shippingFee   Decimal   @map("shipping_fee") @db.Decimal(12, 2)    // Phí vận chuyển (sau khi áp dụng mã)
  
  // Relations
  coupon  Coupon? @relation(fields: [couponId], references: [id])
  
  // ... rest of model ...
}
```

### **3. Migration**

Sau khi cập nhật schema:

```bash
cd backend
npx prisma migrate dev --name add_freeship_coupon_and_order_fields
```

---

## 🔧 Backend Implementation

### **1. Cập nhật Enum DiscountType**

File: `backend/prisma/schema.prisma`

Tìm enum `DiscountType` và thêm:

```prisma
enum DiscountType {
  PERCENT
  AMOUNT
  FREESHIP   // ✅ THÊM MỚI
}
```

### **2. Tạo API Validate & Apply Coupon**

File: `backend/controller/couponController.js` (TẠO MỚI)

```javascript
import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';

/**
 * Validate mã khuyến mãi
 * API: POST /api/coupons/validate
 * 
 * Body: {
 *   code: string,
 *   subtotal: number,      // Tổng tiền sản phẩm (chưa tính ship)
 *   shippingFee: number    // Phí vận chuyển
 * }
 * 
 * Response: {
 *   success: boolean,
 *   valid: boolean,
 *   coupon: {...},
 *   discountAmount: number,
 *   finalShippingFee: number,
 *   message: string
 * }
 */
export const validateCoupon = async (req, res) => {
  const context = { path: 'coupon.validate' };
  try {
    logger.start(context.path, { code: req.body.code });
    
    const { code, subtotal = 0, shippingFee = 0 } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Vui lòng nhập mã khuyến mãi'
      });
    }
    
    // Tìm mã khuyến mãi
    const coupon = await prisma.coupon.findFirst({
      where: {
        code: code.toUpperCase().trim(),
        isActive: true
      }
    });
    
    if (!coupon) {
      return res.status(404).json({
        success: true,
        valid: false,
        message: 'Mã khuyến mãi không tồn tại hoặc đã hết hiệu lực'
      });
    }
    
    // Kiểm tra thời gian hiệu lực
    const now = new Date();
    if (now < coupon.startDate || now > coupon.endDate) {
      return res.status(400).json({
        success: true,
        valid: false,
        message: 'Mã khuyến mãi chưa có hiệu lực hoặc đã hết hạn'
      });
    }
    
    // Kiểm tra số lần sử dụng
    if (coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({
        success: true,
        valid: false,
        message: 'Mã khuyến mãi đã hết lượt sử dụng'
      });
    }
    
    // Kiểm tra giá trị đơn hàng tối thiểu
    if (subtotal < Number(coupon.minimumAmount)) {
      return res.status(400).json({
        success: true,
        valid: false,
        message: `Đơn hàng tối thiểu ${Number(coupon.minimumAmount).toLocaleString('vi-VN')}đ để sử dụng mã này`
      });
    }
    
    // Tính toán số tiền được giảm
    let discountAmount = 0;
    let finalShippingFee = shippingFee;
    
    if (coupon.discountType === 'PERCENT') {
      // Giảm % từ tổng tiền
      discountAmount = (subtotal * Number(coupon.discountValue)) / 100;
    } else if (coupon.discountType === 'AMOUNT') {
      // Giảm số tiền cố định
      discountAmount = Number(coupon.discountValue);
    } else if (coupon.discountType === 'FREESHIP') {
      // ✅ Miễn phí vận chuyển
      discountAmount = shippingFee;
      finalShippingFee = 0;
    }
    
    // Đảm bảo discountAmount không vượt quá shippingFee (nếu là FREESHIP)
    if (coupon.discountType === 'FREESHIP') {
      discountAmount = Math.min(discountAmount, shippingFee);
    }
    
    logger.success('Coupon validated', { 
      couponId: coupon.id, 
      code: coupon.code,
      discountType: coupon.discountType,
      discountAmount 
    });
    
    res.status(200).json({
      success: true,
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue
      },
      discountAmount: Number(discountAmount),
      finalShippingFee: Number(finalShippingFee),
      message: 'Mã khuyến mãi hợp lệ'
    });
    
  } catch (error) {
    logger.error('Failed to validate coupon', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      valid: false,
      message: 'Lỗi server khi kiểm tra mã khuyến mãi'
    });
  }
};
```

### **3. Tạo Routes cho Coupon**

File: `backend/routes/couponRoutes.js` (TẠO MỚI)

```javascript
import express from 'express';
import { validateCoupon } from '../controller/couponController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public route - Validate mã khuyến mãi (cần đăng nhập để áp dụng)
router.post('/validate', authenticate, validateCoupon);

export default router;
```

File: `backend/routes/index.js`

```javascript
// ... existing imports ...
import couponRoutes from './couponRoutes.js';

// ... existing routes ...
app.use('/api/coupons', couponRoutes);
```

### **4. Cập nhật Order Controller**

File: `backend/controller/orderController.js`

Cập nhật hàm `createOrder` để lưu mã khuyến mãi:

```javascript
export const createOrder = async (req, res) => {
  // ... existing code ...
  
  const {
    addressId,
    paymentMethod,
    customerNote,
    cartItemIds,
    couponCode,        // ✅ THÊM MỚI
    discountAmount     // ✅ THÊM MỚI
  } = req.body;
  
  // ... existing validation ...
  
  // ✅ Validate và lấy coupon nếu có
  let coupon = null;
  let finalShippingFee = shippingFee;
  let finalDiscountAmount = 0;
  
  if (couponCode) {
    try {
      // Validate lại coupon trước khi tạo order
      const couponRecord = await prisma.coupon.findFirst({
        where: {
          code: couponCode.toUpperCase().trim(),
          isActive: true,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() }
        }
      });
      
      if (couponRecord && couponRecord.usedCount < couponRecord.usageLimit) {
        coupon = couponRecord;
        
        // Tính lại discount
        if (coupon.discountType === 'FREESHIP') {
          finalDiscountAmount = shippingFee;
          finalShippingFee = 0;
        } else if (coupon.discountType === 'AMOUNT') {
          finalDiscountAmount = Math.min(Number(coupon.discountValue), shippingFee);
          finalShippingFee = Math.max(0, shippingFee - finalDiscountAmount);
        } else if (coupon.discountType === 'PERCENT') {
          // PERCENT thường không áp dụng cho shipping, nhưng có thể giảm từ subtotal
          finalDiscountAmount = (subtotal * Number(coupon.discountValue)) / 100;
        }
      }
    } catch (error) {
      logger.warn('Invalid coupon code in order', { couponCode, error: error.message });
      // Không block order nếu coupon không hợp lệ, chỉ bỏ qua
    }
  }
  
  // Tính tổng tiền cuối cùng
  const finalTotal = subtotal + finalShippingFee - finalDiscountAmount;
  
  // Tạo order
  const order = await prisma.order.create({
    data: {
      // ... existing fields ...
      shippingFee: finalShippingFee,
      totalAmount: finalTotal,
      couponCode: coupon?.code || null,        // ✅ THÊM MỚI
      couponId: coupon?.id || null,            // ✅ THÊM MỚI
      discountAmount: finalDiscountAmount > 0 ? finalDiscountAmount : null  // ✅ THÊM MỚI
    }
  });
  
  // ✅ Tăng số lần sử dụng coupon
  if (coupon) {
    await prisma.coupon.update({
      where: { id: coupon.id },
      data: { usedCount: { increment: 1 } }
    });
    
    // Ghi lại lịch sử sử dụng
    await prisma.couponUsage.create({
      data: {
        couponId: coupon.id,
        userId: userId,
        orderId: order.id
      }
    });
  }
  
  // ... rest of code ...
};
```

### **5. Validator cho Coupon**

File: `backend/validators/coupon.valid.js` (CẬP NHẬT)

```javascript
// ... existing code ...

discountType: Joi.string()
  .valid('PERCENT', 'AMOUNT', 'FREESHIP')  // ✅ THÊM FREESHIP
  .required()
  .messages({
    'any.only': 'Loại giảm giá phải là PERCENT, AMOUNT hoặc FREESHIP'
  }),

// ✅ FREESHIP không cần discountValue hoặc có thể để null
discountValue: Joi.when('discountType', {
  is: 'FREESHIP',
  then: Joi.number().optional().allow(null),
  otherwise: Joi.number().positive().required()
}),
```

---

## 🎨 Frontend Implementation

### **1. Tạo API Client**

File: `frontend/src/api/coupon.js` (TẠO MỚI)

```javascript
import axiosClient from './axiosClient';

/**
 * Validate mã khuyến mãi
 * @param {Object} data - { code, subtotal, shippingFee }
 * @returns {Promise} - Response từ server
 */
export const validateCoupon = async (data) => {
  return await axiosClient.post('/coupons/validate', data);
};
```

### **2. Cập nhật Checkout Hook**

File: `frontend/src/pages/user/checkout/useCheckout.js`

Thêm state và logic:

```javascript
import { validateCoupon } from '@/api/coupon';

export function useCheckout() {
  // ... existing state ...
  
  // ✅ Thêm state cho mã khuyến mãi
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState(null);
  
  // ✅ Hàm validate và áp dụng mã khuyến mãi
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Vui lòng nhập mã khuyến mãi');
      return;
    }
    
    if (!selectedAddress) {
      toast.error('Vui lòng chọn địa chỉ giao hàng trước');
      return;
    }
    
    if (!canCalculateShipping) {
      toast.error('Vui lòng cập nhật địa chỉ để tính phí vận chuyển');
      return;
    }
    
    try {
      setValidatingCoupon(true);
      setCouponError(null);
      
      const response = await validateCoupon({
        code: couponCode.trim(),
        subtotal: summary.subtotal,
        shippingFee: shippingFee
      });
      
      if (response.data.success && response.data.valid) {
        setAppliedCoupon(response.data.coupon);
        setDiscountAmount(response.data.discountAmount);
        setShippingFee(response.data.finalShippingFee); // Cập nhật phí ship
        toast.success(response.data.message || 'Áp dụng mã khuyến mãi thành công!');
      } else {
        setCouponError(response.data.message || 'Mã khuyến mãi không hợp lệ');
        toast.error(response.data.message || 'Mã khuyến mãi không hợp lệ');
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Không thể kiểm tra mã khuyến mãi';
      setCouponError(message);
      toast.error(message);
    } finally {
      setValidatingCoupon(false);
    }
  };
  
  // ✅ Hàm xóa mã khuyến mãi
  const handleRemoveCoupon = () => {
    // Tính lại phí vận chuyển ban đầu
    // (Cần gọi lại API tính phí vận chuyển hoặc lưu giá trị cũ)
    setCouponCode('');
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponError(null);
    // Phí vận chuyển sẽ được tính lại tự động qua useEffect
  };
  
  // ✅ Cập nhật summary để trừ discount
  const summary = useMemo(() => {
    const subtotal = checkoutItems.reduce((sum, item) => {
      const price = Number(item?.final_price ?? item?.product?.price ?? 0);
      return sum + price * item.quantity;
    }, 0);
    
    const fee = Number(shippingFee) || 0;
    const discount = Number(discountAmount) || 0;
    
    return { 
      subtotal, 
      shippingFee: fee, 
      discount,  // ✅ THÊM MỚI
      total: subtotal + fee - discount  // ✅ TRỪ DISCOUNT
    };
  }, [checkoutItems, shippingFee, discountAmount]); // ✅ THÊM discountAmount vào deps
  
  // ✅ Khi đặt hàng, gửi thông tin coupon
  const handlePlaceOrder = async () => {
    // ... existing validation ...
    
    const res = await createOrder({
      addressId: selectedAddressId,
      paymentMethod,
      customerNote: customerNote.trim() || undefined,
      cartItemIds,
      couponCode: appliedCoupon?.code || undefined,  // ✅ THÊM MỚI
      discountAmount: discountAmount || undefined     // ✅ THÊM MỚI
    });
    
    // ... rest of code ...
  };
  
  return {
    // ... existing returns ...
    
    // ✅ Coupon state
    couponCode,
    appliedCoupon,
    discountAmount,
    validatingCoupon,
    couponError,
    
    // ✅ Coupon actions
    setCouponCode,
    handleApplyCoupon,
    handleRemoveCoupon,
  };
}
```

### **3. Cập nhật Checkout UI**

File: `frontend/src/pages/user/checkout/Checkout.jsx`

Thêm UI cho mã khuyến mãi:

```jsx
import { FaTag, FaTimes } from 'react-icons/fa';

export default function Checkout() {
  const {
    // ... existing props ...
    
    // ✅ Coupon props
    couponCode,
    appliedCoupon,
    discountAmount,
    validatingCoupon,
    couponError,
    setCouponCode,
    handleApplyCoupon,
    handleRemoveCoupon,
  } = useCheckout();
  
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* ... existing address section ... */}
      
      {/* 🛒 SẢN PHẨM + THANH TOÁN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 space-y-6">
          {/* ... existing products section ... */}
          
          {/* ✅ MÃ KHUYẾN MÃI */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FaTag className="text-orange-500" />
                Mã khuyến mãi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {appliedCoupon ? (
                // ✅ Đã áp dụng mã
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                  <div className="flex items-center gap-2">
                    <FaTag className="text-green-600" />
                    <div>
                      <div className="font-semibold text-green-800">
                        {appliedCoupon.code} - {appliedCoupon.name}
                      </div>
                      {appliedCoupon.discountType === 'FREESHIP' && (
                        <div className="text-sm text-green-600">
                          Miễn phí vận chuyển
                        </div>
                      )}
                      {discountAmount > 0 && (
                        <div className="text-sm text-green-600">
                          Đã giảm: {formatPrice(discountAmount)}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveCoupon}
                    className="text-red-600 hover:text-red-700"
                  >
                    <FaTimes />
                  </Button>
                </div>
              ) : (
                // ✅ Chưa áp dụng mã
                <div className="flex gap-2">
                  <Input
                    placeholder="Nhập mã khuyến mãi"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleApplyCoupon();
                      }
                    }}
                    disabled={validatingCoupon || !canCalculateShipping}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleApplyCoupon}
                    disabled={validatingCoupon || !couponCode.trim() || !canCalculateShipping}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    {validatingCoupon ? 'Đang kiểm tra...' : 'Áp dụng'}
                  </Button>
                </div>
              )}
              
              {couponError && (
                <p className="text-sm text-red-500 mt-2">{couponError}</p>
              )}
              
              {!canCalculateShipping && (
                <p className="text-sm text-gray-500 mt-2">
                  ⚠️ Vui lòng chọn địa chỉ giao hàng để sử dụng mã khuyến mãi
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* ... rest of sections ... */}
        </div>
        
        {/* 💰 TÓM TẮT ĐƠN HÀNG */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Tóm tắt đơn hàng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Tạm tính</span>
                <span className="font-semibold">{formatPrice(summary.subtotal)}</span>
              </div>
              
              <div className="flex justify-between text-sm items-center">
                <span>Phí vận chuyển</span>
                {/* ... existing shipping fee display ... */}
              </div>
              
              {/* ✅ Hiển thị discount nếu có */}
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Giảm giá</span>
                  <span className="font-semibold">-{formatPrice(discountAmount)}</span>
                </div>
              )}
              
              <div className="flex justify-between border-t pt-3 font-bold">
                <span>Tổng cộng</span>
                <span className="text-orange-600 text-lg">
                  {formatPrice(summary.total)}
                </span>
              </div>
              
              {/* ... rest of order summary ... */}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

---

## 📝 Tạo Mã Khuyến Mãi Free Shipping (Admin)

### **Cách 1: Qua Admin Panel (Nếu đã có)**

Tạo mã với:
- **Code:** `FREESHIP2025`
- **Name:** `Miễn phí vận chuyển năm 2025`
- **Discount Type:** `FREESHIP`
- **Discount Value:** `0` (hoặc để trống)
- **Minimum Amount:** `500000` (ví dụ: đơn tối thiểu 500k)
- **Usage Limit:** `1000`
- **Start Date:** Ngày bắt đầu
- **End Date:** Ngày kết thúc

### **Cách 2: Qua Script/Database**

```sql
INSERT INTO coupons (
  code, 
  name, 
  discount_type, 
  discount_value, 
  minimum_amount, 
  usage_limit,
  start_date,
  end_date,
  is_active
) VALUES (
  'FREESHIP2025',
  'Miễn phí vận chuyển năm 2025',
  'FREESHIP',
  0,
  500000,
  1000,
  '2025-01-01',
  '2025-12-31',
  true
);
```

---

## ✅ Checklist Implementation

### **Backend:**
- [ ] Thêm `FREESHIP` vào enum `DiscountType`
- [ ] Tạo migration cho enum mới
- [ ] Thêm `couponCode`, `couponId`, `discountAmount` vào Order model
- [ ] Tạo migration cho Order fields
- [ ] Tạo `couponController.js` với hàm `validateCoupon`
- [ ] Tạo `couponRoutes.js` và thêm vào `index.js`
- [ ] Cập nhật `orderController.js` để lưu coupon và tăng `usedCount`
- [ ] Cập nhật validator để hỗ trợ `FREESHIP`
- [ ] Test API validate coupon

### **Frontend:**
- [ ] Tạo `frontend/src/api/coupon.js`
- [ ] Thêm state cho coupon vào `useCheckout.js`
- [ ] Thêm hàm `handleApplyCoupon` và `handleRemoveCoupon`
- [ ] Cập nhật `summary` để trừ discount
- [ ] Cập nhật `handlePlaceOrder` để gửi couponCode
- [ ] Thêm UI mã khuyến mãi vào `Checkout.jsx`
- [ ] Test UI và flow hoàn chỉnh

### **Testing:**
- [ ] Test mã FREESHIP hợp lệ
- [ ] Test mã FREESHIP đã hết hạn
- [ ] Test mã FREESHIP đã hết lượt dùng
- [ ] Test mã FREESHIP với đơn hàng không đủ minimumAmount
- [ ] Test apply và remove coupon
- [ ] Test tạo order với coupon
- [ ] Test `usedCount` tăng đúng

---

## 🎯 Flow hoạt động

### **1. User nhập mã khuyến mãi:**

```
User nhập mã "FREESHIP2025"
   ↓
Click "Áp dụng"
   ↓
Frontend gọi POST /api/coupons/validate
   Body: { code: "FREESHIP2025", subtotal: 1000000, shippingFee: 30000 }
   ↓
Backend validate:
   - Kiểm tra mã tồn tại
   - Kiểm tra thời gian hiệu lực
   - Kiểm tra số lần sử dụng
   - Kiểm tra minimumAmount
   ↓
Nếu hợp lệ:
   Response: {
     valid: true,
     coupon: {...},
     discountAmount: 30000,
     finalShippingFee: 0
   }
   ↓
Frontend cập nhật:
   - appliedCoupon = coupon
   - discountAmount = 30000
   - shippingFee = 0
   - summary.total = subtotal + 0 - 30000
```

### **2. User đặt hàng:**

```
User click "Đặt hàng"
   ↓
Frontend gọi POST /api/orders
   Body: {
     ...orderData,
     couponCode: "FREESHIP2025",
     discountAmount: 30000
   }
   ↓
Backend:
   - Validate lại coupon
   - Tạo order với couponCode, couponId, discountAmount
   - Tăng coupon.usedCount
   - Tạo CouponUsage record
   ↓
Response: { order: {...} }
```

---

## 🔒 Validation Rules

### **Khi validate coupon:**

1. ✅ Mã phải tồn tại trong database
2. ✅ Mã phải đang active (`isActive = true`)
3. ✅ Mã phải trong thời gian hiệu lực (`startDate <= now <= endDate`)
4. ✅ Mã chưa hết lượt sử dụng (`usedCount < usageLimit`)
5. ✅ Đơn hàng đủ minimum amount (`subtotal >= minimumAmount`)
6. ✅ User đã chọn địa chỉ (để tính shippingFee)

### **Khi tạo order:**

1. ✅ Validate lại coupon (tránh race condition)
2. ✅ Nếu coupon hợp lệ → Lưu vào order và tăng `usedCount`
3. ✅ Nếu coupon không hợp lệ → Bỏ qua, không block order

---

## 📊 Database Changes Summary

### **1. Enum DiscountType:**
```prisma
enum DiscountType {
  PERCENT
  AMOUNT
  FREESHIP  // ✅ MỚI
}
```

### **2. Order Model:**
```prisma
model Order {
  // ... existing fields ...
  
  couponCode    String?   @map("coupon_code")        // ✅ MỚI
  couponId      Int?      @map("coupon_id")          // ✅ MỚI
  discountAmount Decimal? @map("discount_amount") @db.Decimal(12, 2) // ✅ MỚI
  
  coupon  Coupon? @relation(fields: [couponId], references: [id])  // ✅ MỚI
  
  // ... rest of model ...
}
```

### **3. Coupon Model (đã có sẵn):**
```prisma
model Coupon {
  // ... existing fields ...
  discountType  DiscountType  // ✅ Hỗ trợ FREESHIP
  // ... rest of model ...
}
```

---

## 🎨 UI/UX Recommendations

1. **Placement:** Đặt section mã khuyến mãi giữa "Sản phẩm" và "Thanh toán"
2. **Visual:** Hiển thị badge màu xanh khi áp dụng thành công
3. **Feedback:** Hiển thị rõ ràng số tiền được giảm
4. **Error:** Hiển thị lỗi màu đỏ, dễ đọc
5. **Accessibility:** Có thể nhấn Enter để áp dụng mã

---

## 🚀 Next Steps

Sau khi implement mã khuyến mãi miễn phí vận chuyển, có thể mở rộng:

1. ✅ Mã khuyến mãi giảm % từ tổng đơn hàng
2. ✅ Mã khuyến mãi giảm số tiền cố định
3. ✅ Mã khuyến mãi chỉ áp dụng cho sản phẩm cụ thể
4. ✅ Mã khuyến mãi chỉ áp dụng cho user cụ thể
5. ✅ Mã khuyến mãi tích lũy (combo với mã khác)

---

**Ngày tạo:** 2025-01-30  
**Version:** 1.0  
**Status:** 📝 Draft - Ready for Implementation

