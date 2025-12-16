# 🛒 LUỒNG DỮ LIỆU: ĐẶT HÀNG (CHECKOUT) - USER

## 📋 TỔNG QUAN

Chức năng đặt hàng cho phép user:
- ✅ Chọn sản phẩm từ giỏ hàng
- ✅ Chọn địa chỉ giao hàng (hoặc thêm mới)
- ✅ Tính phí vận chuyển (GHN API)
- ✅ Chọn phương thức thanh toán (COD / VNPay)
- ✅ Tạo đơn hàng trong database
- ✅ Xử lý thanh toán (COD: tự động / VNPay: redirect)
- ✅ Gửi email xác nhận
- ✅ Thông báo real-time cho admin

**Kiến trúc:**
- **Frontend**: ReactJS + Zustand + Axios
- **Backend**: Node.js + Express + Prisma ORM
- **Database**: MySQL (orders, order_items, payments, order_status_history)
- **Tích hợp**: GHN API (vận chuyển), VNPay (thanh toán)

---

## 🗄️ DATABASE SCHEMA

### **Bảng `orders`**

```prisma
model Order {
  id               Int                  @id @default(autoincrement())
  orderNumber      String               @unique @map("order_number")
  userId           Int                  @map("user_id")
  status           OrderStatus          @default(PENDING)
  paymentStatus    PaymentStatus        @default(PENDING) @map("payment_status")
  subtotal         Decimal              @db.Decimal(12, 2)
  shippingFee      Decimal              @default(0.00) @map("shipping_fee") @db.Decimal(12, 2)
  discountAmount   Decimal              @default(0.00) @map("discount_amount") @db.Decimal(12, 2)
  totalAmount      Decimal              @map("total_amount") @db.Decimal(12, 2)
  shippingAddress  String               @map("shipping_address") @db.LongText
  paymentMethod    PaymentMethod        @map("payment_method")
  customerNote     String?              @map("customer_note")
  adminNote        String?              @map("admin_note")
  createdAt        DateTime             @default(now()) @map("created_at")
  updatedAt        DateTime             @updatedAt @map("updated_at")
  
  orderItems       OrderItem[]
  statusHistory    OrderStatusHistory[]
  payments         Payment[]
  user             User                 @relation(fields: [userId], references: [id])
  
  @@map("orders")
}
```

### **Bảng `order_items`**

```prisma
model OrderItem {
  id          Int             @id @default(autoincrement())
  orderId     Int             @map("order_id")
  productId   Int             @map("product_id")
  variantId   Int?            @map("variant_id")
  productName String          @map("product_name")
  productSku  String          @map("product_sku")
  variantName String?         @map("variant_name")
  quantity    Int
  unitPrice   Decimal         @map("unit_price") @db.Decimal(12, 2)
  totalPrice  Decimal         @map("total_price") @db.Decimal(12, 2)
  createdAt   DateTime        @default(now()) @map("created_at")
  
  order       Order           @relation(fields: [orderId], references: [id])
  product     Product         @relation(fields: [productId], references: [id])
  variant     ProductVariant? @relation(fields: [variantId], references: [id])
  
  @@map("order_items")
}
```

### **Bảng `payments`**

```prisma
model Payment {
  id            Int           @id @default(autoincrement())
  orderId       Int           @map("order_id")
  paymentMethod PaymentMethod @map("payment_method")
  paymentStatus PaymentStatus @default(PENDING) @map("payment_status")
  amount        Decimal       @db.Decimal(12, 2)
  transactionId String        @unique @map("transaction_id")
  paidAt        DateTime?     @map("paid_at")
  paymentUrl    String?       @map("payment_url")
  expiresAt     DateTime?     @map("expires_at")
  createdAt     DateTime      @default(now()) @map("created_at")
  
  order         Order         @relation(fields: [orderId], references: [id])
  
  @@map("payments")
}
```

---

## 🔄 LUỒNG DỮ LIỆU: ĐẶT HÀNG (TỪNG BƯỚC)

### **BƯỚC 1: User vào trang Checkout**

**File**: `frontend/src/pages/user/checkout/Checkout.jsx`

**URL**: `/checkout?selected=1,2,3` (IDs các cart items được chọn)

**Xử lý:**
1. ✅ Component mount → `useCheckout()` hook chạy
2. ✅ Load giỏ hàng từ Zustand store
3. ✅ Load danh sách địa chỉ của user
4. ✅ Tính phí vận chuyển (GHN API)

---

### **BƯỚC 2: useCheckout Hook - Khởi tạo**

**File**: `frontend/src/pages/user/checkout/useCheckout.js`

#### **2.1. Lấy sản phẩm được chọn**

```123:139:frontend/src/pages/user/checkout/useCheckout.js
  // 🛒 Lấy danh sách sản phẩm được chọn từ URL: /checkout?selected=1,2,3
  // Nếu không có selected trong URL → không lấy gì (tránh lấy tất cả giỏ hàng)
  const selectedCartItemIds = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get("selected");
    if (!raw) return [];
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }, [location.search]);

  const checkoutItems = useMemo(() => {
    // Nếu có selected trong URL → CHỈ lấy những items đó (trường hợp "Mua ngay")
    // Đây là trường hợp quan trọng: chỉ lấy sản phẩm được chọn, không lấy toàn bộ giỏ hàng
    if (selectedCartItemIds.length > 0) {
      return cartItems.filter((item) => selectedCartItemIds.includes(String(item.id)));
    }
    // Nếu không có selected → lấy tất cả giỏ hàng (trường hợp từ giỏ hàng bấm "Thanh toán")
    // Vì đã bỏ select rồi nên khi bấm "Thanh toán" sẽ lấy tất cả
    return cartItems;
  }, [cartItems, selectedCartItemIds]);
```

**Logic:**
- ✅ Nếu có `?selected=1,2,3` trong URL → Chỉ lấy các items có ID trong danh sách
- ✅ Nếu không có `selected` → Lấy tất cả items trong giỏ hàng

#### **2.2. Tính tổng tiền**

```141:148:frontend/src/pages/user/checkout/useCheckout.js
  const summary = useMemo(() => {
    const subtotal = checkoutItems.reduce((sum, item) => {
      const price = Number(item?.final_price ?? item?.product?.price ?? 0);
      return sum + price * item.quantity;
    }, 0);
    const fee = Number(shippingFee) || 0;
    return { subtotal, shippingFee: fee, discount: 0, total: subtotal + fee };
  }, [checkoutItems, shippingFee]);
```

**Tính toán:**
- `subtotal` = tổng tiền sản phẩm (final_price * quantity)
- `shippingFee` = phí vận chuyển (từ GHN API)
- `total` = subtotal + shippingFee - discount

#### **2.3. Tính phí vận chuyển (GHN API)**

```174:258:frontend/src/pages/user/checkout/useCheckout.js
  useEffect(() => {
    if (!canCalculateShipping) {
      setShippingFee(0);
      
      // Thông báo chi tiết hơn về lý do không thể tính phí
      if (selectedAddress && checkoutItems.length > 0) {
        const missingFields = [];
        if (!selectedAddress.districtId) missingFields.push('districtId');
        if (!selectedAddress.wardCode) missingFields.push('wardCode');
        
      // Log để debug - chỉ log trong development
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Không thể tính phí vận chuyển vì thiếu mã GHN:', {
          addressId: selectedAddress.id,
          address: `${selectedAddress.streetAddress}, ${selectedAddress.ward}, ${selectedAddress.district}, ${selectedAddress.city}`,
          missingFields,
          districtId: selectedAddress.districtId,
          wardCode: selectedAddress.wardCode,
        });
      }
        
        setShippingFeeError(
          `Địa chỉ chưa có mã GHN (thiếu: ${missingFields.join(', ')}). Vui lòng vào "Hồ sơ" → "Địa chỉ" → "Sửa" địa chỉ này để cập nhật.`
        );
      } else {
        setShippingFeeError(null);
      }
      
      setShippingFeeLoading(false);
      return;
    }

    let cancelled = false;
    const fetchShippingFee = async () => {
      try {
        setShippingFeeLoading(true);
        setShippingFeeError(null);
        const metrics = buildShippingMetrics(checkoutItems);

        const response = await calculateGHNShippingFee({
          toDistrictId: selectedAddress.districtId,
          toWardCode: selectedAddress.wardCode,
          weight: metrics.weight,
          length: metrics.length,
          width: metrics.width,
          height: metrics.height,
          serviceTypeId: 2,
        });

        if (cancelled) return;

        if (response.data?.success) {
          const data = response.data.data || response.data;
          const fee =
            data.shippingFee ??
            data.totalFee ??
            data.serviceFee ??
            0;
          setShippingFee(Number(fee) || 0);
        } else {
          const fallbackFee = Number(response.data?.shippingFee ?? DEFAULT_SHIPPING_FEE);
          setShippingFee(fallbackFee);
          setShippingFeeError(response.data?.message || "Không tính được phí vận chuyển. Dùng phí mặc định.");
        }
      } catch (error) {
        if (cancelled) return;
        setShippingFee(DEFAULT_SHIPPING_FEE);
        setShippingFeeError(error.response?.data?.message || "Không tính được phí vận chuyển. Đã áp dụng phí mặc định.");
      } finally {
        if (!cancelled) {
          setShippingFeeLoading(false);
        }
      }
    };

    fetchShippingFee();
    return () => {
      cancelled = true;
    };
  }, [
    selectedAddress?.districtId,
    selectedAddress?.wardCode,
    checkoutItems,
    canCalculateShipping,
  ]);
```

**Xử lý:**
- ✅ Kiểm tra địa chỉ có mã GHN (`districtId`, `wardCode`)
- ✅ Tính metrics vận chuyển: weight, length, width, height (từ kích thước sản phẩm)
- ✅ Gọi GHN API để tính phí
- ✅ Nếu lỗi → Dùng phí mặc định (30,000đ)

---

### **BƯỚC 3: User click "Đặt hàng"**

**File**: `frontend/src/pages/user/checkout/Checkout.jsx`

```409:415:frontend/src/pages/user/checkout/Checkout.jsx
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                disabled={submitting || !selectedAddress}
                onClick={handlePlaceOrder}
              >
                {submitting ? "Đang xử lý..." : "Đặt hàng"}
              </Button>
```

**Handler**: `handlePlaceOrder()` trong `useCheckout.js`

---

### **BƯỚC 4: useCheckout Hook - Xử lý đặt hàng**

**File**: `frontend/src/pages/user/checkout/useCheckout.js`

```441:494:frontend/src/pages/user/checkout/useCheckout.js
  // 🛍️ ĐẶT HÀNG
  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast.error("Vui lòng chọn địa chỉ giao hàng");
      setShowAddressForm(true);
      return;
    }
    if (checkoutItems.length === 0) {
      toast.error("Không có sản phẩm nào được chọn. Vui lòng quay lại giỏ hàng.");
      return;
    }

    try {
      setSubmitting(true);
      const cartItemIds = checkoutItems.map((item) => item.id);
      
      // Tạo order
      const res = await createOrder({
        addressId: selectedAddressId,
        paymentMethod,
        customerNote: customerNote.trim() || undefined,
        cartItemIds,
      });

      await fetchCart();
      const orderId = res.data?.order?.id;

      // Xử lý theo payment method
      if (paymentMethod === 'COD') {
        // COD: Chuyển đến trang success
        toast.success("Đặt hàng thành công!");
        navigate(orderId ? `/order-success?orderId=${orderId}` : "/order-success");
      } else if (paymentMethod === 'VNPAY') {
        // VNPay: Tạo payment URL và redirect
        try {
          await handleVNPayPayment(
            orderId,
            createVNPayPayment,
            (errorMessage) => {
              toast.error(errorMessage);
              navigate('/orders');
            }
          );
        } catch (paymentError) {
          // Error đã được xử lý trong handleVNPayPayment
          console.error('VNPay payment error:', paymentError);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể đặt hàng");
    } finally {
      setSubmitting(false);
    }
  };
```

**Xử lý:**
1. ✅ Validate: Địa chỉ phải có, phải có sản phẩm
2. ✅ Gọi API `createOrder()` với:
   - `addressId`: ID địa chỉ giao hàng
   - `paymentMethod`: "COD" hoặc "VNPAY"
   - `customerNote`: Ghi chú (optional)
   - `cartItemIds`: Mảng ID các cart items
3. ✅ Refresh giỏ hàng (xóa items đã đặt)
4. ✅ **Nếu COD**: Redirect đến trang success
5. ✅ **Nếu VNPay**: Tạo payment URL và redirect đến VNPay

---

### **BƯỚC 5: API Client - Gửi Request**

**File**: `frontend/src/api/orders.js`

```4:6:frontend/src/api/orders.js
export const createOrder = async (data) => {
  return await axiosClient.post("/orders", data);
};
```

**Request:**
- **Method**: `POST`
- **URL**: `/api/orders`
- **Body**:
  ```json
  {
    "addressId": 123,
    "paymentMethod": "COD",
    "customerNote": "Giao giờ hành chính",
    "cartItemIds": [1, 2, 3]
  }
  ```
- **Headers**: `Authorization: Bearer <token>`

---

### **BƯỚC 6: Backend Routes - Validate & Route**

**File**: `backend/routes/orderRoutes.js`

```19:19:backend/routes/orderRoutes.js
router.post("/", validate(createOrderSchema), createOrder);
```

**Xử lý:**
1. ✅ **Middleware `authenticateToken`**: Kiểm tra user đã đăng nhập
2. ✅ **Middleware `validate(createOrderSchema)`**: Validate request body

**Validator Schema** (`backend/validators/order.valid.js`):

```4:56:backend/validators/order.valid.js
export const createOrderSchema = Joi.object({
  // ID địa chỉ giao hàng - bắt buộc
  addressId: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'ID địa chỉ phải là số',
      'number.integer': 'ID địa chỉ phải là số nguyên',
      'number.positive': 'ID địa chỉ phải là số dương',
      'any.required': 'ID địa chỉ là bắt buộc'
    }),

  // Phương thức thanh toán - bắt buộc, chỉ cho phép các giá trị trong enum
  paymentMethod: Joi.string()
    .valid('COD', 'VNPAY')
    .required()
    .messages({
      'any.only': 'Phương thức thanh toán phải là COD hoặc VNPAY',
      'any.required': 'Phương thức thanh toán là bắt buộc'
    }),

  // Ghi chú của khách hàng - không bắt buộc
  customerNote: Joi.string()
    .max(500)
    .optional()
    .allow(null, '')
    .messages({
      'string.max': 'Ghi chú tối đa 500 ký tự'
    }),

  // Mã giảm giá - không bắt buộc
  couponCode: Joi.string()
    .min(3)
    .max(20)
    .optional()
    .allow(null, '')
    .messages({
      'string.min': 'Mã giảm giá phải có ít nhất 3 ký tự',
      'string.max': 'Mã giảm giá tối đa 20 ký tự'
    }),

  // Danh sách ID các cart items được chọn - bắt buộc, phải là mảng số nguyên dương
  cartItemIds: Joi.array()
    .items(Joi.number().integer().positive())
    .min(1)
    .required()
    .messages({
      'array.base': 'Danh sách sản phẩm phải là mảng',
      'array.min': 'Phải chọn ít nhất 1 sản phẩm',
      'any.required': 'Danh sách sản phẩm là bắt buộc',
      'number.base': 'ID sản phẩm phải là số',
      'number.integer': 'ID sản phẩm phải là số nguyên',
      'number.positive': 'ID sản phẩm phải là số dương'
    })
});
```

---

### **BƯỚC 7: Backend Controller - Xử lý Logic**

**File**: `backend/controller/orderController.js`

#### **7.1. Lấy dữ liệu đầu vào**

```120:144:backend/controller/orderController.js
export const createOrder = async (req, res) => {
  try {
    // BƯỚC 1: Lấy dữ liệu đầu vào cơ bản
    const userId = req.user.id;
    const { addressId, paymentMethod, customerNote, cartItemIds } = req.body;

    // BƯỚC 2: Lấy giỏ hàng (chỉ item được chọn) và địa chỉ giao hàng của user
    if (!Array.isArray(cartItemIds) || cartItemIds.length === 0) {
      return res.status(400).json({ message: "Vui lòng chọn sản phẩm trong giỏ hàng để đặt" });
    }
    //lấy danh sách id của sản phẩm được chọn
    const selectedIds = cartItemIds.map((x) => Number(x)).filter((n) => !isNaN(n));
    //lấy danh sách sản phẩm trong giỏ hàng
    const [cartItems, shippingAddress] = await Promise.all([
      //lấy danh sách sản phẩm trong giỏ hàng và địa chỉ giao hàng của user
      prisma.shoppingCart.findMany({
        where: { userId, id: { in: selectedIds } },
        include: { product: true, variant: true }
      }),
      prisma.address.findFirst({ where: { id: Number(addressId), userId } })
    ]);

    // Kiểm tra điều kiện tối thiểu
    if (!cartItems.length) return res.status(400).json({ message: "Giỏ hàng trống" });
    if (!shippingAddress) return res.status(400).json({ message: "Địa chỉ không hợp lệ" });
```

**Xử lý:**
1. ✅ Lấy `userId` từ token (req.user.id)
2. ✅ Lấy cart items được chọn từ `shopping_cart` (JOIN với products, variants)
3. ✅ Lấy địa chỉ giao hàng từ `addresses`
4. ✅ Validate: Cart items và địa chỉ phải tồn tại

#### **7.2. Tính phí vận chuyển (GHN)**

```146:184:backend/controller/orderController.js
    const shipmentMetrics = buildShipmentMetrics(cartItems);

    let shippingFee = DEFAULT_SHIPPING_FEE;
    if (shippingAddress.districtId && shippingAddress.wardCode) {
      try {
        const feeResult = await ghnCalculateShippingFee({
          toDistrictId: shippingAddress.districtId,
          toWardCode: shippingAddress.wardCode,
          weight: shipmentMetrics.weight,
          length: shipmentMetrics.length,
          width: shipmentMetrics.width,
          height: shipmentMetrics.height,
          serviceTypeId: 2,
        });

        if (feeResult?.success) {
          shippingFee = feeResult.shippingFee ?? shippingFee;
        } else {
          logger.warn("GHN shipping fee fallback", {
            reason: feeResult?.error || feeResult?.details,
            userId,
            addressId,
          });
        }
      } catch (error) {
        logger.warn("GHN shipping fee error", {
          error: error.message,
          userId,
          addressId,
        });
      }
    } else {
      logger.warn("Shipping address missing GHN codes", {
        addressId,
        userId,
        districtId: shippingAddress.districtId,
        wardCode: shippingAddress.wardCode,
      });
    }
```

**Xử lý:**
- ✅ Tính metrics vận chuyển (weight, length, width, height) từ kích thước sản phẩm
- ✅ Gọi GHN API để tính phí
- ✅ Nếu lỗi → Dùng phí mặc định (30,000đ)

#### **7.3. Chuẩn hóa items và tính tiền**

```186:222:backend/controller/orderController.js
    // BƯỚC 3: Chuẩn hóa item và tính tiền
    let subtotal = 0;
    const orderItems = [];

    for (const item of cartItems) {
      // Kiểm tra tồn kho (chỉ kiểm tra, không trừ)
      // Tồn kho sẽ được trừ khi admin xác nhận đơn (CONFIRMED)
      let stock = 0;
      if (item.variant?.stockQuantity !== undefined) {
        stock = item.variant.stockQuantity;
      } else {
        stock = item.product.variants?.reduce((sum, v) => sum + (v.stockQuantity || 0), 0) || 0;
      }
      
      if (item.quantity > stock) {
        return res.status(400).json({ message: `Sản phẩm "${item.product.name}" chỉ còn ${stock} sản phẩm` });
      }

      // Tính tiền
      const unitPrice = Number(item.product.salePrice ?? item.product.price);
      const totalPrice = unitPrice * item.quantity;
      subtotal = subtotal + totalPrice;

      // Thêm vào danh sách orderItems
      orderItems.push({
        productId: item.productId,
        variantId: item.variantId ?? null,
        productName: item.product.name,
        productSku: item.product.slug,
        variantName: item.variant ? 
          `${item.variant.color || ''} ${item.variant.width ? `${item.variant.width}x${item.variant.depth}x${item.variant.height}mm` : ''}`.trim() 
          : null,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
      });
    }
```

**Xử lý:**
- ✅ Kiểm tra tồn kho (chỉ kiểm tra, không trừ) → Tồn kho sẽ được trừ khi admin xác nhận đơn
- ✅ Tính giá: `unitPrice = salePrice || price`
- ✅ Tính `totalPrice = unitPrice * quantity`
- ✅ Tính `subtotal` = tổng tất cả `totalPrice`

#### **7.4. Tính tổng đơn và tạo mã**

```224:232:backend/controller/orderController.js
    // BƯỚC 4: Tính tổng đơn
    const discountAmount = 0; // bản cơ bản: chưa áp dụng giảm giá
    //tổng tiền cuối cùng của đơn hàng = tổng tiền của đơn hàng + phí ship - giảm giá
    const totalAmount = subtotal + shippingFee - discountAmount;

    // BƯỚC 5: Tạo mã đơn hàng và mã giao dịch thanh toán
    const orderNumber = await generateOrderNumber(userId);//tạo mã đơn hàng
    //tạo mã giao dịch thanh toán
    const transactionId = `TXN${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
```

**Tạo mã đơn hàng** (`generateOrderNumber()`):

```79:117:backend/controller/orderController.js
const generateOrderNumber = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });
    if (!user) throw new Error("User không tồn tại");
//lấy mã người dùng và định dạng thành 3 chữ số vd: 001
    const userCode = String(user.id).padStart(3, "0");
    const now = new Date();//lấy ngày hiện tại vd: 2025-10-30
    const year = now.getFullYear().toString();//lấy năm hiện tại vd: 2025
    const month = String(now.getMonth() + 1).padStart(2, "0");//lấy tháng hiện tại vd: 10
    const day = String(now.getDate()).padStart(2, "0");//lấy ngày hiện tại vd: 30
    const dateCode = `${year}${month}${day}`;//định dạng thành YYYYMMDD vd: 20251030

    // Tính khoảng thời gian trong ngày hiện tại vd: 2025-10-30 00:00:00 đến 2025-10-30 23:59:59
    //lấy thời gian đầu tiên của ngày hiện tại vd: 2025-10-30 00:00:00
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    //lấy thời gian cuối cùng của ngày hiện tại vd: 2025-10-31 00:00:00
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    // Đếm số đơn đã tạo bởi user trong hôm nay
    const todayCount = await prisma.order.count({
      where: {
        userId: user.id,
        createdAt: { gte: startOfDay, lt: endOfDay }//lấy thời gian đầu tiên của ngày hiện tại đến thời gian cuối cùng của ngày hiện tại
      }
    });
//lấy số thứ tự đơn của user trong ngày (001, 002, ...)
    const seq = String(todayCount + 1).padStart(3, "0");//định dạng thành 3 chữ số vd: 001
//định dạng thành <maKH><YYYYMMDD><SEQ3> vd: 00120251030001
    return `${userCode}${dateCode}${seq}`;
  } catch (e) {
    logger.error('Failed to generate order number', { error: e.message, stack: e.stack });
    const userCode = String(userId).padStart(3, "0");//định dạng thành 3 chữ số vd: 001
    return `${userCode}${new Date().toISOString().slice(0,10).replace(/-/g,'')}${Date.now().toString().slice(-3)}`;
    
  }
};
```

**Format**: `<userCode><YYYYMMDD><seq>`
- Ví dụ: `00120251030001` (user ID 1, ngày 30/10/2025, đơn thứ 1 trong ngày)

#### **7.5. Transaction - Tạo đơn hàng trong Database**

```234:292:backend/controller/orderController.js
    // BƯỚC 6: Tạo đơn trong transaction (đảm bảo tính toàn vẹn)
    const created = await prisma.$transaction(async (tx) => {
      // 6.1 Tạo Order
      // Format shippingAddress thành string (schema là String, không phải object)
      const shippingAddressString = JSON.stringify({
        fullName: shippingAddress.fullName,
        phone: shippingAddress.phone,
        streetAddress: shippingAddress.streetAddress,
        ward: shippingAddress.ward,
        district: shippingAddress.district,
        city: shippingAddress.city,
        addressType: shippingAddress.addressType,
        note: shippingAddress.note
      });
      
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          status: "PENDING",
          paymentStatus: "PENDING",
          subtotal,
          shippingFee,
          discountAmount,
          totalAmount,
          shippingAddress: shippingAddressString,
          paymentMethod,
          customerNote
        }
      });

      // 6.2 Tạo Payment (mỗi Order 1 Payment)
      await tx.payment.create({
        data: {
          orderId: order.id,
          paymentMethod,
          paymentStatus: "PENDING",
          amount: totalAmount,
          transactionId
          
        }
      });

      // 6.3 Tạo OrderItem hàng loạt
      await tx.orderItem.createMany({ data: orderItems.map((i) => ({ ...i, orderId: order.id })) });

      // 6.3.1 Lưu lịch sử trạng thái đầu tiên (PENDING)
      await tx.orderStatusHistory.create({
        data: { orderId: order.id, status: "PENDING" }
      });

      // 6.4 KHÔNG trừ tồn kho ở đây
      // Tồn kho sẽ được trừ khi admin xác nhận đơn (chuyển sang CONFIRMED)

      // 6.5 Xóa các item đã đặt khỏi giỏ hàng của user
      await tx.shoppingCart.deleteMany({ where: { userId, id: { in: selectedIds } } });

      return order;
    });
```

**Transaction thực hiện:**
1. ✅ **Tạo Order**: INSERT vào `orders`
2. ✅ **Tạo Payment**: INSERT vào `payments`
3. ✅ **Tạo OrderItems**: INSERT nhiều records vào `order_items`
4. ✅ **Lưu lịch sử**: INSERT vào `order_status_history` (status = PENDING)
5. ✅ **Xóa giỏ hàng**: DELETE các items đã đặt khỏi `shopping_cart`

**Lưu ý quan trọng:**
- ⚠️ **KHÔNG trừ tồn kho** ở đây → Tồn kho chỉ được trừ khi admin xác nhận đơn (CONFIRMED)

#### **7.6. Gửi thông báo real-time cho Admin**

```304:333:backend/controller/orderController.js
    // BƯỚC 8: Tạo thông báo cho admin và gửi WebSocket event
    try {
      // Lấy danh sách tất cả admin
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true }
      });

      // Tạo notification cho từng admin
      if (admins.length > 0) {
        const totalAmount = Number(orderDetails.totalAmount);
        await prisma.notification.createMany({
          data: admins.map(admin => ({
            userId: admin.id,
            title: 'Đơn hàng mới',
            message: `Đơn hàng ${orderDetails.orderNumber} vừa được tạo với tổng tiền ${totalAmount.toLocaleString('vi-VN')}đ`,
            type: 'ORDER_NEW'
          }))
        });
      }

      // Gửi WebSocket event đến admin room
      emitNewOrder(orderDetails);
    } catch (notifError) {
      // Nếu lỗi khi tạo notification, log nhưng không ảnh hưởng đến response
      logger.warn('Failed to create notification for new order', {
        orderId: created.id,
        error: notifError.message
      });
    }
```

**Xử lý:**
- ✅ Tạo notification cho tất cả admin trong database
- ✅ Gửi WebSocket event `order:new` đến admin room → Admin nhận thông báo real-time

#### **7.7. Gửi email xác nhận đơn hàng**

```335:378:backend/controller/orderController.js
    // BƯỚC 9: Gửi email xác nhận đơn hàng cho user
    try {
      if (orderDetails.user?.email) {
        // Parse shippingAddress từ JSON string thành object
        let shippingAddressParsed = orderDetails.shippingAddress;
        try {
          if (typeof orderDetails.shippingAddress === 'string') {
            shippingAddressParsed = JSON.parse(orderDetails.shippingAddress);
          }
        } catch (e) {
          logger.warn('Failed to parse shippingAddress for email', { orderId: created.id });
        }

        // Format lại orderItems cho email
        const emailOrderItems = orderDetails.orderItems.map(item => ({
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
        }));

        // Format shippingAddress thành string cho email
        const shippingAddressString = typeof shippingAddressParsed === 'object' 
          ? `${shippingAddressParsed.fullName || ''}\n${shippingAddressParsed.phone || ''}\n${shippingAddressParsed.streetAddress || ''}\n${shippingAddressParsed.ward || ''}, ${shippingAddressParsed.district || ''}, ${shippingAddressParsed.city || ''}`
          : orderDetails.shippingAddress;

        await sendOrderConfirmationEmail({
          email: orderDetails.user.email,
          order: {
            ...orderDetails,
            orderItems: emailOrderItems,
            shippingAddress: shippingAddressString,
          }
        });
        logger.info('Order confirmation email sent', { orderId: created.id, email: orderDetails.user.email });
      }
    } catch (emailError) {
      // Nếu lỗi khi gửi email, log nhưng không ảnh hưởng đến response
      logger.warn('Failed to send order confirmation email', {
        orderId: created.id,
        error: emailError.message
      });
    }

    return res.status(201).json({ message: "Tạo đơn hàng thành công", order: orderDetails });
```

**Xử lý:**
- ✅ Parse `shippingAddress` từ JSON string → Object
- ✅ Format `orderItems` cho email
- ✅ Gọi `sendOrderConfirmationEmail()` → Gửi email đến Gmail của user

---

### **BƯỚC 8: Frontend - Xử lý Response**

**File**: `frontend/src/pages/user/checkout/useCheckout.js`

```465:488:frontend/src/pages/user/checkout/useCheckout.js
      await fetchCart();
      const orderId = res.data?.order?.id;

      // Xử lý theo payment method
      if (paymentMethod === 'COD') {
        // COD: Chuyển đến trang success
        toast.success("Đặt hàng thành công!");
        navigate(orderId ? `/order-success?orderId=${orderId}` : "/order-success");
      } else if (paymentMethod === 'VNPAY') {
        // VNPay: Tạo payment URL và redirect
        try {
          await handleVNPayPayment(
            orderId,
            createVNPayPayment,
            (errorMessage) => {
              toast.error(errorMessage);
              navigate('/orders');
            }
          );
        } catch (paymentError) {
          // Error đã được xử lý trong handleVNPayPayment
          console.error('VNPay payment error:', paymentError);
        }
      }
```

**Xử lý theo payment method:**

#### **COD (Thanh toán khi nhận hàng):**
- ✅ Toast success
- ✅ Redirect đến `/order-success?orderId=123`

#### **VNPay (Thanh toán online):**
- ✅ Gọi `handleVNPayPayment()` → Tạo payment URL
- ✅ Redirect đến VNPay để thanh toán

**handleVNPayPayment()** (`frontend/src/features/payment/vnpayPayment.js`):

```15:38:frontend/src/features/payment/vnpayPayment.js
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
    const errorMessage = error.response?.data?.message || error.message || 'Không thể tạo thanh toán VNPay';
    if (onError) {
      onError(errorMessage);
    } else {
      console.error('VNPay payment error:', errorMessage);
    }
    throw error;
  }
};
```

**Luồng VNPay:**
1. ✅ Gọi API `POST /api/payment/vnpay/create` với `orderId`
2. ✅ Backend tạo payment URL từ VNPay
3. ✅ Frontend redirect đến `paymentUrl`
4. ✅ User thanh toán trên VNPay
5. ✅ VNPay redirect về frontend với kết quả

---

## 📊 SƠ ĐỒ LUỒNG DỮ LIỆU TỔNG QUAN

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (ReactJS)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │ Checkout.jsx │───▶│ useCheckout  │───▶│ cartStore    │     │
│  │  (UI)        │    │  (Hook)      │    │  (Zustand)   │     │
│  └──────────────┘    └──────┬───────┘    └──────────────┘     │
│         │                    │                                  │
│         │                    │ 1. Load cart items              │
│         │                    │ 2. Load addresses               │
│         │                    │ 3. Calculate shipping (GHN)     │
│         │                    │                                  │
│         │  User click        │                                  │
│         │  "Đặt hàng"        │                                  │
│         ▼                    │                                  │
│  ┌───────────────────────────▼──────────────────────────────┐  │
│  │ handlePlaceOrder()                                       │  │
│  │ - Validate                                                │  │
│  │ - createOrder({ addressId, paymentMethod, cartItemIds }) │  │
│  └───────────────────────────┬──────────────────────────────┘  │
│                              │                                  │
│                              │ API Call                         │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ api/orders.js                                           │   │
│  │ POST /api/orders                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
└──────────────────────────────┼──────────────────────────────────┘
                               │ HTTP Request
                               │ (Authorization: Bearer <token>)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Express.js)                         │
├─────────────────────────────────────────────────────────────────┤
│                              │                                  │
│                              │ Routes                           │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ routes/orderRoutes.js                                   │   │
│  │ - authenticateToken (middleware)                         │   │
│  │ - validate(createOrderSchema) (middleware)              │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                        │
│                         │ Controller                             │
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ controller/orderController.js                           │   │
│  │ createOrder()                                           │   │
│  │                                                          │   │
│  │ 1. Lấy cart items + shipping address                    │   │
│  │ 2. Tính phí vận chuyển (GHN API)                        │   │
│  │ 3. Kiểm tra tồn kho + Tính tiền                         │   │
│  │ 4. Tạo mã đơn hàng                                      │   │
│  │ 5. Transaction:                                         │   │
│  │    - INSERT orders                                      │   │
│  │    - INSERT payments                                    │   │
│  │    - INSERT order_items                                 │   │
│  │    - INSERT order_status_history                        │   │
│  │    - DELETE shopping_cart (items đã đặt)                │   │
│  │ 6. Tạo notification cho admin                           │   │
│  │ 7. emitNewOrder() (WebSocket)                           │   │
│  │ 8. sendOrderConfirmationEmail()                         │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                        │
│                         │ Prisma ORM                             │
│                         ▼                                        │
└─────────────────────────┼────────────────────────────────────────┘
                          │
                          │ SQL Queries
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (MySQL)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  orders                                                   │  │
│  │  - id, orderNumber, userId, status, paymentStatus        │  │
│  │  - subtotal, shippingFee, discountAmount, totalAmount    │  │
│  │  - shippingAddress (JSON string), paymentMethod          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                      │
│                          │ JOIN                                 │
│                          ▼                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │ order_items  │    │  payments    │    │order_status_ │     │
│  │              │    │              │    │  history     │     │
│  └──────────────┘    └──────────────┘    └──────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CÁC DỊCH VỤ BÊN NGOÀI                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │  GHN API     │    │  VNPay API   │    │  Gmail SMTP  │     │
│  │  (Tính phí   │    │  (Thanh toán)│    │  (Gửi email) │     │
│  │   vận chuyển)│    │              │    │              │     │
│  └──────────────┘    └──────────────┘    └──────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 TÓM TẮT LUỒNG DỮ LIỆU

### **CHECKOUT → ĐẶT HÀNG:**

1. **Frontend Load:**
   - ✅ Load giỏ hàng từ Zustand store
   - ✅ Load danh sách địa chỉ của user
   - ✅ Tính phí vận chuyển (GHN API)

2. **User Click "Đặt hàng":**
   - ✅ Validate: Địa chỉ, sản phẩm phải có
   - ✅ Gọi API `POST /api/orders` với:
     - `addressId`: ID địa chỉ
     - `paymentMethod`: "COD" hoặc "VNPAY"
     - `cartItemIds`: Mảng ID cart items

3. **Backend Xử lý:**
   - ✅ Validate request (Joi schema)
   - ✅ Lấy cart items + shipping address
   - ✅ Tính phí vận chuyển (GHN API)
   - ✅ Kiểm tra tồn kho (chỉ kiểm tra, không trừ)
   - ✅ Tính tiền: subtotal, shippingFee, totalAmount
   - ✅ Tạo mã đơn hàng: `<userCode><YYYYMMDD><seq>`
   - ✅ **Transaction**:
     - INSERT `orders`
     - INSERT `payments`
     - INSERT `order_items` (nhiều records)
     - INSERT `order_status_history` (PENDING)
     - DELETE `shopping_cart` (items đã đặt)
   - ✅ Tạo notification cho admin
   - ✅ Emit WebSocket event `order:new`
   - ✅ Gửi email xác nhận đơn hàng

4. **Frontend Xử lý Response:**
   - ✅ Refresh giỏ hàng
   - ✅ **COD**: Redirect đến `/order-success`
   - ✅ **VNPay**: Redirect đến VNPay để thanh toán

---

## 🔐 BẢO MẬT

1. ✅ **Authentication**: Tất cả routes yêu cầu `authenticateToken` middleware
2. ✅ **Authorization**: User chỉ có thể tạo đơn cho chính mình (`userId = req.user.id`)
3. ✅ **Validation**: 
   - Frontend: Kiểm tra địa chỉ, sản phẩm
   - Backend: Joi schema validation
4. ✅ **Transaction**: Đảm bảo tính toàn vẹn dữ liệu (atomic operations)

---

## 📝 LƯU Ý QUAN TRỌNG

1. ✅ **Tồn kho**: Chỉ kiểm tra, không trừ ở bước đặt hàng → Tồn kho được trừ khi admin xác nhận đơn (CONFIRMED)
2. ✅ **Giá**: Ưu tiên `salePrice`, nếu không có thì dùng `price`
3. ✅ **Mã đơn hàng**: Format `<userCode><YYYYMMDD><seq>` (ví dụ: `00120251030001`)
4. ✅ **Shipping Address**: Lưu dạng JSON string trong database
5. ✅ **Transaction**: Tất cả operations (INSERT, DELETE) được thực hiện trong transaction để đảm bảo tính toàn vẹn
6. ✅ **Email & Notifications**: Nếu lỗi khi gửi email/notification, log nhưng không ảnh hưởng đến response (đặt hàng vẫn thành công)

