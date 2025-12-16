# 💳 LUỒNG DỮ LIỆU THANH TOÁN VNPAY VÀ COD

Tài liệu này giải thích chi tiết cách dữ liệu đi trong hệ thống khi user thanh toán bằng **VNPay** và **COD (Cash on Delivery)**.

---

## 📋 MỤC LỤC

1. [Tổng quan](#tổng-quan)
2. [Luồng thanh toán COD](#luồng-thanh-toán-cod)
3. [Luồng thanh toán VNPay](#luồng-thanh-toán-vnpay)
4. [So sánh COD vs VNPay](#so-sánh-cod-vs-vnpay)
5. [Database Schema](#database-schema)

---

## 🎯 TỔNG QUAN

### **Kiến trúc hệ thống:**
- **Frontend**: ReactJS + Zustand + Axios
- **Backend**: Node.js + Express + Prisma ORM
- **Database**: MySQL (orders, payments, order_items)
- **Tích hợp**: VNPay API (thanh toán online), GHN API (vận chuyển)

### **Các bảng Database chính:**
- `orders`: Thông tin đơn hàng
- `payments`: Thông tin thanh toán
- `order_items`: Chi tiết sản phẩm trong đơn
- `order_status_history`: Lịch sử thay đổi trạng thái đơn

---

## 💰 LUỒNG THANH TOÁN COD (CASH ON DELIVERY)

### **Sơ đồ luồng:**

```
┌─────────────┐
│   USER      │
│ (Frontend)  │
└──────┬──────┘
       │
       │ 1. User chọn COD và click "Đặt hàng"
       ▼
┌─────────────────────────────────────────┐
│  Checkout.jsx                           │
│  - handlePlaceOrder()                   │
│  - paymentMethod = "COD"                 │
└──────┬──────────────────────────────────┘
       │
       │ 2. Gọi API createOrder()
       ▼
┌─────────────────────────────────────────┐
│  api/orders.js                           │
│  POST /api/orders                        │
│  Body: {                                 │
│    addressId,                            │
│    paymentMethod: "COD",                  │
│    cartItemIds                           │
│  }                                       │
└──────┬──────────────────────────────────┘
       │
       │ HTTP Request (Authorization: Bearer token)
       ▼
┌─────────────────────────────────────────┐
│  Backend: orderController.js             │
│  createOrder()                           │
│                                          │
│  1. Lấy cart items + shipping address   │
│  2. Tính phí vận chuyển (GHN API)       │
│  3. Kiểm tra tồn kho                     │
│  4. Tính tiền: subtotal, shippingFee   │
│  5. Tạo mã đơn hàng                     │
│  6. TRANSACTION:                         │
│     - INSERT orders                      │
│     - INSERT payments (status: PENDING)  │
│     - INSERT order_items                 │
│     - INSERT order_status_history        │
│     - DELETE shopping_cart               │
│  7. Tạo notification cho admin          │
│  8. Emit WebSocket (order:new)          │
│  9. Gửi email xác nhận                  │
└──────┬──────────────────────────────────┘
       │
       │ Response: { order: { id, ... } }
       ▼
┌─────────────────────────────────────────┐
│  Frontend: useCheckout.js                │
│  - Nhận orderId                         │
│  - paymentMethod === "COD"              │
│  - Redirect: /order-success?orderId=123 │
└──────┬──────────────────────────────────┘
       │
       │ 3. Hiển thị trang thành công
       ▼
┌─────────────────────────────────────────┐
│  OrderSuccess.jsx                       │
│  - "Đặt hàng thành công!"               │
│  - "Chúng tôi sẽ liên hệ..."            │
└─────────────────────────────────────────┘
```

### **Chi tiết từng bước:**

#### **BƯỚC 1: User chọn COD và click "Đặt hàng"**

**File**: `frontend/src/pages/user/checkout/Checkout.jsx`

```jsx
// User chọn paymentMethod = "COD" trong form
<RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
  <RadioGroupItem value="COD">Thanh toán khi nhận hàng (COD)</RadioGroupItem>
  <RadioGroupItem value="VNPAY">Thanh toán online (VNPay)</RadioGroupItem>
</RadioGroup>

// User click "Đặt hàng"
<Button onClick={handlePlaceOrder}>Đặt hàng</Button>
```

#### **BƯỚC 2: Frontend gọi API createOrder()**

**File**: `frontend/src/pages/user/checkout/useCheckout.js`

```javascript
const handlePlaceOrder = async () => {
  // Validate
  if (!selectedAddressId) {
    toast.error("Vui lòng chọn địa chỉ giao hàng");
    return;
  }

  // Gọi API tạo đơn hàng
  const res = await createOrder({
    addressId: selectedAddressId,
    paymentMethod: "COD",  // ← COD
    customerNote: customerNote.trim() || undefined,
    cartItemIds: checkoutItems.map((item) => item.id),
  });

  const orderId = res.data?.order?.id;

  // Xử lý theo payment method
  if (paymentMethod === 'COD') {
    // COD: Chuyển đến trang success
    toast.success("Đặt hàng thành công!");
    navigate(`/order-success?orderId=${orderId}`);
  }
};
```

**API Call**: `POST /api/orders`

**Request Body**:
```json
{
  "addressId": 123,
  "paymentMethod": "COD",
  "customerNote": "Giao giờ hành chính",
  "cartItemIds": [1, 2, 3]
}
```

#### **BƯỚC 3: Backend xử lý createOrder()**

**File**: `backend/controller/orderController.js`

**Các bước xử lý:**

1. **Lấy dữ liệu đầu vào:**
   ```javascript
   const userId = req.user.id;
   const { addressId, paymentMethod, customerNote, cartItemIds } = req.body;
   ```

2. **Lấy cart items + shipping address:**
   ```javascript
   const [cartItems, shippingAddress] = await Promise.all([
     prisma.shoppingCart.findMany({
       where: { userId, id: { in: selectedIds } },
       include: { product: true, variant: true }
     }),
     prisma.address.findFirst({ where: { id: Number(addressId), userId } })
   ]);
   ```

3. **Tính phí vận chuyển (GHN API):**
   ```javascript
   const feeResult = await ghnCalculateShippingFee({
     toDistrictId: shippingAddress.districtId,
     toWardCode: shippingAddress.wardCode,
     weight: shipmentMetrics.weight,
     length: shipmentMetrics.length,
     width: shipmentMetrics.width,
     height: shipmentMetrics.height,
     serviceTypeId: 2,
   });
   ```

4. **Tính tiền:**
   ```javascript
   const subtotal = /* tổng tiền sản phẩm */;
   const shippingFee = /* phí vận chuyển */;
   const discountAmount = 0;
   const totalAmount = subtotal + shippingFee - discountAmount;
   ```

5. **Tạo mã đơn hàng:**
   ```javascript
   const orderNumber = await generateOrderNumber(userId);
   // Format: <userCode><YYYYMMDD><seq>
   // Ví dụ: 00120251030001
   ```

6. **TRANSACTION - Tạo đơn hàng trong Database:**
   ```javascript
   const created = await prisma.$transaction(async (tx) => {
     // 6.1 Tạo Order
     const order = await tx.order.create({
       data: {
         orderNumber,
         userId,
         status: "PENDING",
         paymentStatus: "PENDING",  // ← COD: PENDING (chưa thanh toán)
         subtotal,
         shippingFee,
         discountAmount,
         totalAmount,
         shippingAddress: shippingAddressString,
         paymentMethod: "COD",  // ← COD
         customerNote
       }
     });

     // 6.2 Tạo Payment
     await tx.payment.create({
       data: {
         orderId: order.id,
         paymentMethod: "COD",  // ← COD
         paymentStatus: "PENDING",  // ← COD: PENDING (chưa thanh toán)
         amount: totalAmount,
         transactionId: `TXN${Date.now()}...`
       }
     });

     // 6.3 Tạo OrderItems
     await tx.orderItem.createMany({ 
       data: orderItems.map((i) => ({ ...i, orderId: order.id })) 
     });

     // 6.4 Lưu lịch sử trạng thái
     await tx.orderStatusHistory.create({
       data: { orderId: order.id, status: "PENDING" }
     });

     // 6.5 Xóa giỏ hàng
     await tx.shoppingCart.deleteMany({ 
       where: { userId, id: { in: selectedIds } } 
     });

     return order;
   });
   ```

7. **Tạo notification cho admin:**
   ```javascript
   await prisma.notification.createMany({
     data: admins.map(admin => ({
       userId: admin.id,
       title: 'Đơn hàng mới',
       message: `Đơn hàng ${orderNumber} vừa được tạo...`,
       type: 'ORDER_NEW'
     }))
   });
   ```

8. **Emit WebSocket event:**
   ```javascript
   emitNewOrder(orderDetails);  // Admin nhận thông báo real-time
   ```

9. **Gửi email xác nhận:**
   ```javascript
   await sendOrderConfirmationEmail({
     email: orderDetails.user.email,
     order: orderDetails
   });
   ```

**Response**:
```json
{
  "message": "Tạo đơn hàng thành công",
  "order": {
    "id": 123,
    "orderNumber": "00120251030001",
    "status": "PENDING",
    "paymentStatus": "PENDING",
    "paymentMethod": "COD",
    "totalAmount": 500000,
    ...
  }
}
```

#### **BƯỚC 4: Frontend xử lý response**

**File**: `frontend/src/pages/user/checkout/useCheckout.js`

```javascript
// Nhận orderId từ response
const orderId = res.data?.order?.id;

// COD: Redirect đến trang success
if (paymentMethod === 'COD') {
  toast.success("Đặt hàng thành công!");
  navigate(`/order-success?orderId=${orderId}`);
}
```

#### **BƯỚC 5: Hiển thị trang thành công**

**File**: `frontend/src/pages/user/OrderSuccess.jsx`

```jsx
<div>
  <h1>Đặt hàng thành công!</h1>
  <p>Chúng tôi sẽ liên hệ Quý khách để xác nhận đơn hàng trong thời gian sớm nhất.</p>
  <Button onClick={() => navigate(`/orders`)}>Xem đơn hàng của tôi</Button>
</div>
```

### **Trạng thái thanh toán COD:**

- **Khi đặt hàng**: `paymentStatus = "PENDING"` (chưa thanh toán)
- **Khi admin xác nhận đơn**: `paymentStatus` vẫn là `"PENDING"` (chưa thanh toán)
- **Khi đơn được giao (DELIVERED)**: `paymentStatus = "PAID"` (đã thanh toán khi nhận hàng)
- **Nếu đơn bị hủy**: `paymentStatus = "FAILED"` (không thanh toán)

**Logic trong `getOrderById()`**:
```javascript
if (order.paymentMethod === "COD") {
  const status =
    order.status === "DELIVERED"
      ? "PAID"      // Đã giao → Đã thanh toán
      : order.status === "CANCELLED"
        ? "FAILED"  // Đã hủy → Thất bại
        : "PENDING"; // Còn lại → Chờ thanh toán
}
```

---

## 💳 LUỒNG THANH TOÁN VNPAY

### **Sơ đồ luồng:**

```
┌─────────────┐
│   USER      │
│ (Frontend)  │
└──────┬──────┘
       │
       │ 1. User chọn VNPay và click "Đặt hàng"
       ▼
┌─────────────────────────────────────────┐
│  Checkout.jsx                            │
│  - handlePlaceOrder()                     │
│  - paymentMethod = "VNPAY"                │
└──────┬──────────────────────────────────┘
       │
       │ 2. Gọi API createOrder()
       ▼
┌─────────────────────────────────────────┐
│  Backend: orderController.js              │
│  createOrder()                            │
│  - Tạo Order + Payment (status: PENDING)  │
└──────┬──────────────────────────────────┘
       │
       │ Response: { order: { id } }
       ▼
┌─────────────────────────────────────────┐
│  Frontend: useCheckout.js                 │
│  - paymentMethod === "VNPAY"             │
│  - Gọi handleVNPayPayment()              │
└──────┬──────────────────────────────────┘
       │
       │ 3. Gọi API createVNPayPayment()
       ▼
┌─────────────────────────────────────────┐
│  api/payment.js                           │
│  POST /api/payment/vnpay/create          │
│  Body: { orderId }                       │
└──────┬──────────────────────────────────┘
       │
       │ HTTP Request
       ▼
┌─────────────────────────────────────────┐
│  Backend: paymentController.js           │
│  createVNPayPayment()                    │
│                                          │
│  1. Kiểm tra order + payment             │
│  2. Tạo hoặc tái sử dụng payment        │
│  3. Gọi vnpayService.createPayment()    │
│  4. Lưu paymentUrl vào DB               │
└──────┬──────────────────────────────────┘
       │
       │ Response: { paymentUrl: "..." }
       ▼
┌─────────────────────────────────────────┐
│  Frontend: vnpayPayment.js               │
│  - Nhận paymentUrl                      │
│  - Redirect: window.location.href = ... │
└──────┬──────────────────────────────────┘
       │
       │ 4. User được redirect đến VNPay
       ▼
┌─────────────────────────────────────────┐
│  VNPay Payment Gateway                   │
│  - User nhập thông tin thanh toán       │
│  - User xác nhận thanh toán            │
└──────┬──────────────────────────────────┘
       │
       │ 5. VNPay xử lý thanh toán
       │
       ├──────────────────────────────────┐
       │                                  │
       │ 6a. IPN Callback (ngầm)          │
       ▼                                  │
┌─────────────────────────────────────────┐│
│  Backend: paymentController.js           ││
│  handleVNPayCallback()                    ││
│  POST /api/payment/vnpay/callback         ││
│                                          ││
│  1. Xác thực chữ ký (verifyCallback)     ││
│  2. Tìm payment trong DB                 ││
│  3. Kiểm tra số tiền                     ││
│  4. Cập nhật DB:                         ││
│     - payments: PAID/FAILED              ││
│     - orders: PAID/FAILED                ││
└──────────────────────────────────────────┘│
       │                                  │
       │ 6b. Return URL (redirect)       │
       ▼                                  │
┌─────────────────────────────────────────┐│
│  Backend: paymentController.js           ││
│  handleVNPayReturn()                     ││
│  GET /api/payment/vnpay/return           ││
│                                          ││
│  1. Xác thực chữ ký                      ││
│  2. Tìm payment trong DB                ││
│  3. Cập nhật DB (nếu chưa cập nhật)     ││
│  4. Redirect về frontend:                ││
│     /payment/result?status=success/...   ││
└──────┬───────────────────────────────────┘│
       │                                  │
       │ 7. Frontend nhận redirect        │
       ▼                                  │
┌─────────────────────────────────────────┐
│  PaymentResult.jsx                       │
│  - Lấy orderId từ query                 │
│  - Gọi API getPaymentStatus()           │
│  - Hiển thị kết quả (success/failed)   │
└─────────────────────────────────────────┘
```

### **Chi tiết từng bước:**

#### **BƯỚC 1-2: User chọn VNPay và tạo đơn hàng**

Tương tự như COD, nhưng `paymentMethod = "VNPAY"`.

**File**: `frontend/src/pages/user/checkout/useCheckout.js`

```javascript
const handlePlaceOrder = async () => {
  // ... tạo đơn hàng
  const res = await createOrder({
    addressId: selectedAddressId,
    paymentMethod: "VNPAY",  // ← VNPay
    cartItemIds: checkoutItems.map((item) => item.id),
  });

  const orderId = res.data?.order?.id;

  // Xử lý theo payment method
  if (paymentMethod === 'VNPAY') {
    // VNPay: Tạo payment URL và redirect
    await handleVNPayPayment(
      orderId,
      createVNPayPayment,
      (errorMessage) => {
        toast.error(errorMessage);
        navigate('/orders');
      }
    );
  }
};
```

#### **BƯỚC 3: Frontend gọi API createVNPayPayment()**

**File**: `frontend/src/features/payment/vnpayPayment.js`

```javascript
export const handleVNPayPayment = async (orderId, createVNPayPayment, onError) => {
  try {
    // Gọi API tạo payment URL
    const response = await createVNPayPayment(orderId);
    const paymentData = response.data;

    // Kiểm tra response
    if (paymentData?.success && paymentData?.data?.paymentUrl) {
      // Redirect đến VNPay để thanh toán
      window.location.href = paymentData.data.paymentUrl;
    } else {
      throw new Error(paymentData?.message || 'Không tạo được payment URL');
    }
  } catch (error) {
    // Xử lý lỗi
    onError(errorMessage);
  }
};
```

**API Call**: `POST /api/payment/vnpay/create`

**Request Body**:
```json
{
  "orderId": 123
}
```

#### **BƯỚC 4: Backend xử lý createVNPayPayment()**

**File**: `backend/controller/paymentController.js`

```javascript
export const createVNPayPayment = async (req, res) => {
  const userId = req.user.id;
  const { orderId } = req.body;

  // 1. Lấy đơn hàng từ DB
  const order = await prisma.order.findFirst({
    where: { id: Number(orderId), userId },
    include: { payments: true, orderItems: { include: { product: true } } }
  });

  // 2. Kiểm tra payment method
  if (order.paymentMethod !== 'VNPAY') {
    return res.status(400).json({ 
      success: false, 
      message: 'Phương thức thanh toán không phải VNPay' 
    });
  }

  // 3. Tìm hoặc tạo payment
  let payment = order.payments.find((p) => p.paymentMethod === 'VNPAY');
  
  if (!payment) {
    // Chưa có payment → tạo mới
    payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        paymentMethod: 'VNPAY',
        paymentStatus: 'PENDING',
        amount: order.totalAmount,
        transactionId: `VNPAY_${order.orderNumber}_${Date.now()}`
      }
    });
  }

  // 4. Nếu payment URL còn hạn → tái sử dụng
  if (payment.paymentUrl && payment.expiresAt && payment.paymentStatus === 'PENDING') {
    const now = new Date();
    if (now < new Date(payment.expiresAt)) {
      return res.json({
        success: true,
        data: {
          paymentUrl: payment.paymentUrl,
          orderId: order.id,
          amount: Number(order.totalAmount)
        }
      });
    }
  }

  // 5. Tạo payment URL từ VNPay
  const orderInfo = order.orderItems
    .slice(0, 3)
    .map((item) => item.product.name)
    .join(', ') || `Đơn hàng ${order.orderNumber}`;

  const clientIp = req.headers['x-forwarded-for'] || req.ip || '127.0.0.1';

  const paymentData = await vnpayService.createPayment(
    order.orderNumber,
    Number(order.totalAmount),
    orderInfo,
    clientIp
  );

  // 6. Lưu payment URL vào DB
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      transactionId: paymentData.transactionId,
      paymentUrl: paymentData.paymentUrl,
      expiresAt: paymentData.expiresAt,
      partnerCode: 'VNPAY'
    }
  });

  return res.json({
    success: true,
    data: {
      paymentUrl: paymentData.paymentUrl,
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: Number(order.totalAmount),
      expiresAt: paymentData.expiresAt
    }
  });
};
```

**Service VNPay** (`backend/services/payment/vnpayService.js`):

```javascript
export const createPayment = async (orderNumber, amount, orderInfo, ipAddr) => {
  const txnRef = `${orderNumber}${Date.now()}`;  // Mã giao dịch duy nhất
  
  // Tạo URL thanh toán từ VNPay SDK
  const paymentUrl = await vnpayClient.buildPaymentUrl({
    vnp_Amount: Math.round(Number(amount || 0)),
    vnp_IpAddr: ipAddr,
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: ProductCode.Other,
    vnp_ReturnUrl: VNPAY_CONFIG.returnUrl,  // URL backend nhận kết quả
    vnp_Locale: VnpLocale.VN,
    vnp_CreateDate: dateFormat(new Date()),
    vnp_ExpireDate: dateFormat(new Date(Date.now() + 15 * 60 * 1000))  // 15 phút
  });

  return {
    paymentUrl,  // URL để redirect user
    transactionId: txnRef,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000)
  };
};
```

**Response**:
```json
{
  "success": true,
  "data": {
    "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...",
    "orderId": 123,
    "orderNumber": "00120251030001",
    "amount": 500000,
    "expiresAt": "2025-01-30T10:15:00.000Z"
  }
}
```

#### **BƯỚC 5: User thanh toán trên VNPay**

User được redirect đến trang VNPay, nhập thông tin thanh toán và xác nhận.

#### **BƯỚC 6a: VNPay gọi IPN Callback (ngầm)**

**File**: `backend/controller/paymentController.js`

```javascript
export const handleVNPayCallback = async (req, res) => {
  // 1. Lấy payload từ body hoặc query
  const payload = Object.keys(req.body || {}).length ? req.body : req.query;
  
  // 2. Xác thực chữ ký
  const verifyResult = vnpayService.verifyCallback(payload);
  
  if (!verifyResult.isSuccess) {
    return res.status(400).json({
      RspCode: '97',
      Message: 'Invalid signature'
    });
  }

  // 3. Tìm payment trong DB
  const payment = await prisma.payment.findFirst({
    where: {
      paymentMethod: 'VNPAY',
      transactionId: verifyResult.transactionId
    },
    include: { order: true }
  });

  if (!payment) {
    return res.status(404).json({
      RspCode: '01',
      Message: 'Payment not found'
    });
  }

  // 4. Kiểm tra số tiền
  if (Math.round(Number(payment.amount)) !== Math.round(Number(verifyResult.amount))) {
    return res.status(400).json({
      RspCode: '04',
      Message: 'Amount invalid'
    });
  }

  // 5. Xử lý kết quả thanh toán
  if (verifyResult.responseCode === '00') {
    // THÀNH CÔNG
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          paymentStatus: 'PAID',
          paidAt: new Date(),
          transactionId: verifyResult.transactionNo || payment.transactionId,
          vnpayTransactionNo: verifyResult.transactionNo,
          bankCode: verifyResult.bankCode,
          responseCode: verifyResult.responseCode,
          payDate: parseVNPayDate(verifyResult.payDate)
        }
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: 'PAID' }
      });
    });

    return res.json({ RspCode: '00', Message: 'Success' });
  } else {
    // THẤT BẠI
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          paymentStatus: 'FAILED',
          responseCode: verifyResult.responseCode,
          payDate: parseVNPayDate(verifyResult.payDate)
        }
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: 'FAILED' }
      });
    });

    return res.json({
      RspCode: verifyResult.responseCode || '99',
      Message: 'Payment failed'
    });
  }
};
```

**Xác thực chữ ký** (`backend/services/payment/vnpayService.js`):

```javascript
export const verifyCallback = (params = {}) => {
  // 1. Lấy Secure Hash từ VNPay
  const secureHash = params.vnp_SecureHash?.toLowerCase() || '';
  
  // 2. Clone params, bỏ chữ ký
  const clone = { ...params };
  delete clone.vnp_SecureHash;
  delete clone.vnp_SecureHashType;
  
  // 3. Sắp xếp key theo A-Z
  const sorted = Object.keys(clone)
    .sort()
    .reduce((acc, key) => {
      acc[key] = encodeURIComponent(String(clone[key] ?? '')).replace(/%20/g, '+');
      return acc;
    }, {});

  // 4. Tạo chữ ký mới
  const signData = qs.stringify(sorted, { encode: false });
  const signed = crypto
    .createHmac('sha512', VNPAY_CONFIG.hashSecret)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex')
    .toLowerCase();

  // 5. So sánh chữ ký
  if (secureHash !== signed) {
    return { isSuccess: false, message: 'Invalid signature' };
  }

  // 6. Trả về kết quả
  return {
    isSuccess: true,
    transactionId: clone.vnp_TxnRef,
    transactionNo: clone.vnp_TransactionNo,
    responseCode: clone.vnp_ResponseCode,  // '00' = thành công
    bankCode: clone.vnp_BankCode,
    amount: clone.vnp_Amount ? Number(clone.vnp_Amount) / 100 : 0,
    payDate: clone.vnp_PayDate
  };
};
```

#### **BƯỚC 6b: VNPay redirect về Return URL**

**File**: `backend/controller/paymentController.js`

```javascript
export const handleVNPayReturn = async (req, res) => {
  // 1. Xác thực chữ ký
  const verifyResult = vnpayService.verifyCallback(req.query);
  
  if (!verifyResult.isSuccess) {
    return res.redirect(`${frontendUrl}/payment/result?error=invalid_signature`);
  }

  // 2. Tìm payment trong DB
  const payment = await prisma.payment.findFirst({
    where: {
      paymentMethod: 'VNPAY',
      transactionId: verifyResult.transactionId
    },
    include: { order: true }
  });

  if (!payment) {
    return res.redirect(`${frontendUrl}/payment/result?error=payment_not_found`);
  }

  // 3. Xử lý kết quả
  if (verifyResult.responseCode === '00') {
    // THÀNH CÔNG
    if (payment.paymentStatus !== 'PAID') {
      // Cập nhật DB (nếu chưa cập nhật từ IPN)
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            paymentStatus: 'PAID',
            paidAt: new Date(),
            vnpayTransactionNo: verifyResult.transactionNo,
            bankCode: verifyResult.bankCode,
            responseCode: verifyResult.responseCode,
            payDate: parseVNPayDate(verifyResult.payDate)
          }
        });

        await tx.order.update({
          where: { id: payment.orderId },
          data: { paymentStatus: 'PAID' }
        });
      });
    }

    // Redirect về frontend
    return res.redirect(
      `${frontendUrl}/payment/result?status=success&orderId=${payment.orderId}`
    );
  } else {
    // THẤT BẠI
    if (payment.paymentStatus !== 'FAILED') {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            paymentStatus: 'FAILED',
            responseCode: verifyResult.responseCode,
            payDate: parseVNPayDate(verifyResult.payDate)
          }
        });

        await tx.order.update({
          where: { id: payment.orderId },
          data: { paymentStatus: 'FAILED' }
        });
      });
    }

    const message = verifyResult.responseCode === '24' 
      ? 'Giao dịch bị hủy' 
      : 'Thanh toán thất bại';

    return res.redirect(
      `${frontendUrl}/payment/result?status=failed&orderId=${payment.orderId}&message=${encodeURIComponent(message)}`
    );
  }
};
```

#### **BƯỚC 7: Frontend hiển thị kết quả**

**File**: `frontend/src/features/payment/PaymentResult.jsx`

```javascript
export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const statusParam = searchParams.get('status');  // 'success' hoặc 'failed'

  useEffect(() => {
    if (!orderId) {
      navigate('/');
      return;
    }

    // Kiểm tra trạng thái thanh toán từ backend (chính xác nhất)
    const checkPaymentStatus = async () => {
      try {
        const response = await getPaymentStatus(orderId);
        const data = response.data?.data || response.data;

        // Hiển thị trạng thái theo DB
        if (data.paymentStatus === 'PAID') {
          setStatus('success');
        } else if (data.paymentStatus === 'FAILED') {
          setStatus('failed');
        } else {
          setStatus('failed');  // PENDING = thất bại
        }
      } catch (error) {
        setStatus(statusParam || 'failed');
      }
    };

    checkPaymentStatus();
  }, [orderId, statusParam]);

  // Hiển thị UI success/failed
  return (
    <div>
      {status === 'success' && (
        <div>
          <CheckCircle />
          <h2>Thanh toán thành công!</h2>
          <p>Mã đơn hàng: #{orderId}</p>
          <p>Số tiền: {paymentInfo.amount?.toLocaleString('vi-VN')}đ</p>
          <p>Mã giao dịch: {paymentInfo.vnpayTransactionNo}</p>
          <p>Ngân hàng: {paymentInfo.bankCode}</p>
        </div>
      )}
      {status === 'failed' && (
        <div>
          <XCircle />
          <h2>Thanh toán thất bại</h2>
          <p>{messageParam || 'Giao dịch đã bị hủy hoặc không thành công'}</p>
        </div>
      )}
    </div>
  );
}
```

**API Call**: `GET /api/payment/status/:orderId`

**Response**:
```json
{
  "success": true,
  "data": {
    "paymentStatus": "PAID",
    "paymentMethod": "VNPAY",
    "amount": 500000,
    "paidAt": "2025-01-30T10:20:00.000Z",
    "transactionId": "001202510300011234567890",
    "vnpayTransactionNo": "12345678",
    "bankCode": "NCB",
    "responseCode": "00"
  }
}
```

---

## 🔄 SO SÁNH COD VS VNPAY

| Tiêu chí | COD | VNPay |
|----------|-----|-------|
| **Khi đặt hàng** | `paymentStatus = "PENDING"` | `paymentStatus = "PENDING"` |
| **Khi thanh toán** | Không có bước thanh toán online | User thanh toán trên VNPay |
| **Cập nhật trạng thái** | Khi đơn được giao (DELIVERED) → `PAID` | Khi VNPay callback → `PAID` |
| **Payment URL** | Không có | Có (từ VNPay API) |
| **Transaction ID** | `TXN{timestamp}...` | `{orderNumber}{timestamp}` |
| **Callback** | Không có | Có (IPN + Return URL) |
| **Redirect** | `/order-success` | `/payment/result` |
| **Xác thực** | Không cần | Cần xác thực chữ ký VNPay |

---

## 🗄️ DATABASE SCHEMA

### **Bảng `orders`:**

```prisma
model Order {
  id               Int                  @id @default(autoincrement())
  orderNumber      String               @unique
  userId           Int
  status           OrderStatus          @default(PENDING)
  paymentStatus    PaymentStatus        @default(PENDING)  // PENDING, PAID, FAILED
  subtotal         Decimal
  shippingFee      Decimal
  discountAmount   Decimal
  totalAmount      Decimal
  shippingAddress  String               @db.LongText
  paymentMethod    PaymentMethod        // COD, VNPAY
  customerNote     String?
  createdAt        DateTime             @default(now())
  updatedAt        DateTime             @updatedAt
  
  orderItems       OrderItem[]
  payments         Payment[]
  statusHistory    OrderStatusHistory[]
}
```

### **Bảng `payments`:**

```prisma
model Payment {
  id                 Int           @id @default(autoincrement())
  orderId            Int
  paymentMethod      PaymentMethod  // COD, VNPAY
  paymentStatus      PaymentStatus @default(PENDING)  // PENDING, PAID, FAILED
  amount             Decimal
  transactionId      String        @unique
  paidAt             DateTime?
  paymentUrl         String?       // Chỉ có với VNPay
  expiresAt          DateTime?    // Chỉ có với VNPay
  vnpayTransactionNo String?       // Chỉ có với VNPay
  bankCode           String?       // Chỉ có với VNPay
  responseCode       String?       // Chỉ có với VNPay
  payDate            DateTime?     // Chỉ có với VNPay
  createdAt          DateTime      @default(now())
  
  order              Order         @relation(fields: [orderId], references: [id])
}
```

### **Luồng dữ liệu trong Database:**

#### **COD:**
```
1. createOrder() → INSERT orders (paymentStatus: PENDING)
                → INSERT payments (paymentStatus: PENDING, paymentMethod: COD)

2. Admin xác nhận đơn → UPDATE orders (status: CONFIRMED)
                     → paymentStatus vẫn PENDING

3. Đơn được giao → UPDATE orders (status: DELIVERED, paymentStatus: PAID)
                → UPDATE payments (paymentStatus: PAID, paidAt: now())
```

#### **VNPay:**
```
1. createOrder() → INSERT orders (paymentStatus: PENDING)
                → INSERT payments (paymentStatus: PENDING, paymentMethod: VNPAY)

2. createVNPayPayment() → UPDATE payments (paymentUrl, transactionId, expiresAt)

3. User thanh toán trên VNPay

4. VNPay callback → handleVNPayCallback()
                 → UPDATE payments (paymentStatus: PAID/FAILED, ...)
                 → UPDATE orders (paymentStatus: PAID/FAILED)

5. VNPay redirect → handleVNPayReturn()
                  → Redirect về frontend với kết quả
```

---

## 📝 TÓM TẮT

### **COD:**
1. User đặt hàng → Tạo Order + Payment (PENDING)
2. Admin xác nhận → Order status = CONFIRMED
3. Đơn được giao → Order status = DELIVERED, Payment status = PAID
4. User nhận hàng và thanh toán tiền mặt

### **VNPay:**
1. User đặt hàng → Tạo Order + Payment (PENDING)
2. Frontend gọi API tạo payment URL
3. Backend tạo payment URL từ VNPay
4. User redirect đến VNPay và thanh toán
5. VNPay gọi callback (IPN) → Cập nhật DB
6. VNPay redirect về frontend → Hiển thị kết quả

---

## 🔐 BẢO MẬT

1. **Authentication**: Tất cả routes yêu cầu `authenticateToken`
2. **Authorization**: User chỉ có thể tạo/xem đơn của chính mình
3. **Validation**: Joi schema validation cho request body
4. **Transaction**: Đảm bảo tính toàn vẹn dữ liệu (atomic operations)
5. **VNPay Signature**: Xác thực chữ ký SHA512 để tránh giả mạo

---

## 📚 TÀI LIỆU THAM KHẢO

- `PAYMENT_VNPAY_FLOW.md`: Tài liệu chi tiết về VNPay
- `LUU_CHECKOUT_ORDER_FLOW.md`: Tài liệu chi tiết về checkout
- `backend/controller/paymentController.js`: Controller xử lý thanh toán
- `backend/controller/orderController.js`: Controller xử lý đơn hàng
- `backend/services/payment/vnpayService.js`: Service VNPay
- `frontend/src/features/payment/vnpayPayment.js`: Frontend VNPay utils
- `frontend/src/features/payment/PaymentResult.jsx`: Trang kết quả thanh toán

