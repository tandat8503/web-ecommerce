# 📧 LUỒNG DỮ LIỆU: ADMIN CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG → GỬI EMAIL CHO USER

## 📋 TỔNG QUAN

Khi admin cập nhật trạng thái đơn hàng, hệ thống sẽ:
1. ✅ Cập nhật trạng thái trong database
2. ✅ Gửi WebSocket thông báo real-time cho user
3. ✅ **Gửi email chi tiết đơn hàng đến Gmail của user**

---

## 🎯 LUỒNG DỮ LIỆU CHI TIẾT

### **BƯỚC 1: Admin cập nhật trạng thái đơn hàng (Frontend)**

**File**: `frontend/src/pages/admin/order/useAdminOrders.js`

```270:297:frontend/src/pages/admin/order/useAdminOrders.js
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      // Tìm đơn hàng trong danh sách để kiểm tra payment status
      const order = orders.find(o => o.id === orderId);
      
      // Kiểm tra: Nếu chuyển sang CONFIRMED và thanh toán bằng VNPay
      if (newStatus === 'CONFIRMED' && order?.paymentMethod === 'VNPAY') {
        // Kiểm tra paymentStatus phải là PAID
        if (order?.paymentStatus !== 'PAID') {
          const paymentStatusLabel = order?.paymentStatus === 'FAILED' 
            ? 'thất bại' 
            : 'chưa thanh toán';
          toast.error(`Không thể xác nhận đơn hàng. Thanh toán VNPay ${paymentStatusLabel}. Vui lòng đợi khách hàng thanh toán thành công.`);
          return; // Dừng lại, không gọi API
        }
      }

      setUpdatingId(orderId); // Hiển thị loading
      await updateOrder(orderId, { status: newStatus });
      toast.success("Cập nhật trạng thái thành công");
      fetchOrders(); // Refresh danh sách
    } catch (err) {
      toast.error(err.response?.data?.message || "Có lỗi khi cập nhật");
      fetchOrders(); // Refresh để đảm bảo UI đồng bộ
    } finally {
      setUpdatingId(null);
    }
  };
```

**Luồng:**
1. Admin chọn trạng thái mới từ dropdown (ví dụ: `CONFIRMED`, `PROCESSING`, `DELIVERED`)
2. Validate: Kiểm tra thanh toán VNPay đã thành công chưa (nếu chuyển sang `CONFIRMED`)
3. Gọi API `updateOrder(orderId, { status: newStatus })`

**API Call**: `PUT /api/admin/orders/:id`

---

### **BƯỚC 2: Backend xử lý cập nhật trạng thái (Controller)**

**File**: `backend/controller/adminOrderController.js`

#### **2.1. Validate và cập nhật trạng thái**

```228:344:backend/controller/adminOrderController.js
export const updateOrder = async (req, res) => {
  const context = { path: 'admin.orders.update' };
  try {
    logger.start(context.path, { id: req.params.id, status: req.body.status });
    
    const id = Number(req.params.id);
    const { status } = req.body;

    // Validate: Trạng thái là bắt buộc
    if (!status) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }

    // Validate: Trạng thái phải hợp lệ
    const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }

    // Lấy thông tin đơn hàng hiện tại
    const currentOrder = await prisma.order.findUnique({
      where: { id },
      select: { 
        status: true,
        userId: true, // Cần để gửi WebSocket
        orderItems: {
          select: {
            productId: true,
            variantId: true,
            quantity: true // Cần để hoàn trả tồn kho
          }
        }
      }
    });

    if (!currentOrder) {
      logger.warn('Đơn hàng không tồn tại', { id });
      return res.status(404).json({ message: 'Đơn hàng không tồn tại' });
    }

    // Không cho phép cập nhật đơn đã giao hoặc đã hủy
    if (currentOrder.status === 'DELIVERED' || currentOrder.status === 'CANCELLED') {
      return res.status(400).json({ 
        message: `Không thể cập nhật đơn hàng với trạng thái: ${currentOrder.status}` 
      });
    }

    // Không cho phép chọn trạng thái hiện tại
    if (status === currentOrder.status) {
      return res.status(400).json({ 
        message: `Đơn hàng đã có trạng thái: ${status}` 
      });
    }

    // Kiểm tra quy tắc chuyển trạng thái
    // Lưu ý: Không cho phép hủy đơn ở đây, phải dùng API cancelOrder riêng
    const statusTransitions = {
      PENDING: ['CONFIRMED'],        // Chờ xác nhận → Đã xác nhận
      CONFIRMED: ['PROCESSING'],     // Đã xác nhận → Đang giao
      PROCESSING: ['DELIVERED']      // Đang giao → Đã giao
    };

    const allowedStatuses = statusTransitions[currentOrder.status] || [];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ 
        message: `Không thể chuyển trạng thái từ ${currentOrder.status} sang ${status}` 
      });
    }

    // Cập nhật trong transaction để đảm bảo tính toàn vẹn dữ liệu
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Nếu chuyển sang CONFIRMED (từ PENDING), trừ tồn kho
      if (status === 'CONFIRMED' && currentOrder.status === 'PENDING') {
        // Lấy orderItems với variant để trừ tồn kho
        const orderItems = await tx.orderItem.findMany({
          where: { orderId: id },
          include: {
            variant: {
              select: { id: true, stockQuantity: true }
            }
          }
        });

        // Trừ tồn kho cho từng item
        for (const item of orderItems) {
          if (item.variantId && item.variant) {
            const currentStock = item.variant.stockQuantity;
            if (currentStock < item.quantity) {
              throw new Error(`Sản phẩm "${item.productName}" chỉ còn ${currentStock} sản phẩm, không đủ để xác nhận đơn hàng`);
            }
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stockQuantity: { decrement: item.quantity } }
            });
            logger.info('Trừ tồn kho khi xác nhận đơn', { 
              variantId: item.variantId, 
              quantity: item.quantity,
              oldStock: currentStock,
              newStock: currentStock - item.quantity
            });
          }
        }
      }

      // 2. Cập nhật trạng thái đơn hàng
      const order = await tx.order.update({
        where: { id },
        data: { status }
      });

      // 3. Lưu lịch sử thay đổi trạng thái
      await tx.orderStatusHistory.create({
        data: { orderId: id, status }
      });

      return order;
    });
```

**Các bước xử lý:**
1. ✅ Validate trạng thái mới có hợp lệ không
2. ✅ Kiểm tra quy tắc chuyển trạng thái (PENDING → CONFIRMED → PROCESSING → DELIVERED)
3. ✅ Nếu chuyển sang `CONFIRMED`: Trừ tồn kho (nếu đủ)
4. ✅ **Transaction**: Cập nhật trạng thái + Lưu lịch sử
5. ✅ Trả về đơn hàng đã cập nhật

#### **2.2. Gửi WebSocket thông báo real-time**

```346:352:backend/controller/adminOrderController.js
    // Gửi WebSocket thông báo đến user
    emitOrderStatusUpdate(currentOrder.userId, {
      id: updated.id, // ⚠️ PHẢI LÀ 'id' chứ không phải 'orderId' (socket.js dùng orderData.id)
      orderNumber: updated.orderNumber,
      status: updated.status,
      statusLabel: getStatusLabel(updated.status) // ✅ Thêm statusLabel
    });
```

**Luồng:**
- Gửi WebSocket event `order:status:updated` đến user (userId)
- User nhận thông báo real-time trên frontend

---

### **BƯỚC 3: Lấy dữ liệu đơn hàng đầy đủ để gửi email**

```354:406:backend/controller/adminOrderController.js
    // Gửi email thông báo cho user khi trạng thái thay đổi
    try {
      // Lấy đầy đủ thông tin đơn hàng để gửi email
      const orderForEmail = await prisma.order.findUnique({
        where: { id },
        include: {
          orderItems: {
            select: {
              productName: true,
              variantName: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
            }
          },
          user: {
            select: {
              email: true,
            }
          }
        }
      });

      if (orderForEmail?.user?.email) {
        // Parse shippingAddress từ JSON string thành object
        let shippingAddressParsed = orderForEmail.shippingAddress;
        try {
          if (typeof orderForEmail.shippingAddress === 'string') {
            shippingAddressParsed = JSON.parse(orderForEmail.shippingAddress);
          }
        } catch (e) {
          logger.warn('Failed to parse shippingAddress for email', { orderId: id });
        }

        // Format shippingAddress thành string cho email
        const shippingAddressString = typeof shippingAddressParsed === 'object' 
          ? `${shippingAddressParsed.fullName || ''}\n${shippingAddressParsed.phone || ''}\n${shippingAddressParsed.streetAddress || ''}\n${shippingAddressParsed.ward || ''}, ${shippingAddressParsed.district || ''}, ${shippingAddressParsed.city || ''}`
          : orderForEmail.shippingAddress;

        // Format orderItems cho email
        const emailOrderItems = orderForEmail.orderItems.map(item => ({
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
        }));

        const orderData = {
          ...orderForEmail,
          orderItems: emailOrderItems,
          shippingAddress: shippingAddressString,
        };
```

**Dữ liệu lấy từ database:**
- ✅ Thông tin đơn hàng (orderNumber, totalAmount, subtotal, shippingFee, discountAmount...)
- ✅ Chi tiết sản phẩm (`orderItems`: productName, variantName, quantity, unitPrice, totalPrice)
- ✅ **Email của user** (`user.email`)
- ✅ Địa chỉ giao hàng (`shippingAddress` - parse từ JSON)
- ✅ Phương thức thanh toán (`paymentMethod`)

**Xử lý dữ liệu:**
- Parse `shippingAddress` từ JSON string → Object → Format thành string đẹp
- Format `orderItems` để hiển thị trong email (chuyển Decimal → Number)

---

### **BƯỚC 4: Gửi email theo trạng thái**

```408:431:backend/controller/adminOrderController.js
        // Gửi email theo trạng thái
        switch (status) {
          case 'CONFIRMED':
            await sendOrderConfirmedEmail({
              email: orderForEmail.user.email,
              order: orderData
            });
            logger.info('Order confirmed email sent', { orderId: id, email: orderForEmail.user.email });
            break;
          case 'PROCESSING':
            await sendOrderShippingEmail({
              email: orderForEmail.user.email,
              order: orderData
            });
            logger.info('Order shipping email sent', { orderId: id, email: orderForEmail.user.email });
            break;
          case 'DELIVERED':
            await sendOrderDeliveredEmail({
              email: orderForEmail.user.email,
              order: orderData
            });
            logger.info('Order delivered email sent', { orderId: id, email: orderForEmail.user.email });
            break;
        }
```

**Logic:**
- `CONFIRMED` → Gọi `sendOrderConfirmedEmail()`
- `PROCESSING` → Gọi `sendOrderShippingEmail()`
- `DELIVERED` → Gọi `sendOrderDeliveredEmail()`

**Xử lý lỗi:**
```432:439:backend/controller/adminOrderController.js
    } catch (emailError) {
      // Nếu lỗi khi gửi email, log nhưng không ảnh hưởng đến response
      logger.warn('Failed to send order status email', {
        orderId: id,
        status,
        error: emailError.message
      });
    }
```

⚠️ **Quan trọng**: Nếu gửi email lỗi, hệ thống vẫn trả về thành công cho admin (email là thứ yếu, cập nhật database là chính)

---

### **BƯỚC 5: Email Service - Tạo nội dung email**

**File**: `backend/services/Email/EmailServices.js`

#### **5.1. Email "Đã xác nhận" (CONFIRMED)**

```239:263:backend/services/Email/EmailServices.js
export const sendOrderConfirmedEmail = async ({ email, order }) => {
  const orderItems = order.orderItems || [];//danh sách sản phẩm
  //gửi email xác nhận đơn hàng
  return emailTransporter.sendMail({
    from: FROM_EMAIL,
    to: email,
    subject: `Đơn hàng #${order.orderNumber} đã được xác nhận`,
    text: `Đơn hàng #${order.orderNumber} của bạn đã được xác nhận và đang được chuẩn bị.`,
    html: getOrderEmailTemplate({
      orderNumber: order.orderNumber,//số đơn hàng
      orderDate: order.createdAt,//ngày đặt hàng
      orderItems,//danh sách sản phẩm
      subtotal: order.subtotal,//tổng tiền
      shippingFee: order.shippingFee,//phí vận chuyển
      discountAmount: order.discountAmount,//giảm giá
      totalAmount: order.totalAmount,//tổng tiền
      shippingAddress: order.shippingAddress,//địa chỉ giao hàng
      paymentMethod: order.paymentMethod,//phương thức thanh toán
      status: order.status,//trạng thái đơn hàng
      statusText: 'Đơn hàng đã được xác nhận',
      message: 'Đơn hàng của bạn đã được xác nhận và đang được chuẩn bị. Chúng tôi sẽ thông báo khi đơn hàng được giao.',
      trackingCode: order.trackingCode || null,//mã vận đơn
    }),
  });
};
```

#### **5.2. Email "Đang giao" (PROCESSING)**

```268:292:backend/services/Email/EmailServices.js
export const sendOrderShippingEmail = async ({ email, order }) => {
  const orderItems = order.orderItems || [];//danh sách sản phẩm
  
  return emailTransporter.sendMail({
    from: FROM_EMAIL,
    to: email,
    subject: `Đơn hàng #${order.orderNumber} đang được giao`,
    text: `Đơn hàng #${order.orderNumber} của bạn đã được giao cho đơn vị vận chuyển.${order.trackingCode ? ` Mã vận đơn: ${order.trackingCode}` : ''}`,
    html: getOrderEmailTemplate({
      orderNumber: order.orderNumber,//số đơn hàng
      orderDate: order.createdAt,//ngày đặt hàng
      orderItems,//danh sách sản phẩm
      subtotal: order.subtotal,//tổng tiền
      shippingFee: order.shippingFee,//phí vận chuyển
      discountAmount: order.discountAmount,//giảm giá
      totalAmount: order.totalAmount,//tổng tiền
      shippingAddress: order.shippingAddress,//địa chỉ giao hàng
      paymentMethod: order.paymentMethod,//phương thức thanh toán
      status: order.status,//trạng thái đơn hàng
      statusText: 'Đơn hàng đang được giao',
      message: `Đơn hàng của bạn đã được giao cho đơn vị vận chuyển.${order.trackingCode ? ` Bạn có thể theo dõi đơn hàng bằng mã vận đơn: <strong>${order.trackingCode}</strong>` : ' Vui lòng chờ đợi trong vài ngày tới.'}`,
      trackingCode: order.trackingCode || null,//mã vận đơn
    }),
  });
};
```

#### **5.3. Email "Đã giao" (DELIVERED)**

```297:321:backend/services/Email/EmailServices.js
export const sendOrderDeliveredEmail = async ({ email, order }) => {
  const orderItems = order.orderItems || [];
  
  return emailTransporter.sendMail({
    from: FROM_EMAIL,
    to: email,
    subject: `Đơn hàng #${order.orderNumber} đã được giao thành công`,
    text: `Đơn hàng #${order.orderNumber} của bạn đã được giao thành công. Cảm ơn bạn đã mua sắm!`,
    html: getOrderEmailTemplate({
      orderNumber: order.orderNumber,
      orderDate: order.createdAt,
      orderItems,
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      discountAmount: order.discountAmount,
      totalAmount: order.totalAmount,
      shippingAddress: order.shippingAddress,
      paymentMethod: order.paymentMethod,
      status: order.status,
      statusText: 'Giao hàng thành công',
      message: 'Đơn hàng của bạn đã được giao thành công! Cảm ơn bạn đã tin dùng dịch vụ của chúng tôi. Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ với chúng tôi.',
      trackingCode: order.trackingCode || null,
    }),
  });
};
```

---

### **BƯỚC 6: Template email HTML**

**File**: `backend/services/Email/EmailServices.js`

Hàm `getOrderEmailTemplate()` tạo HTML email với:
- ✅ Header: Logo, tiêu đề
- ✅ Badge trạng thái: "Đã xác nhận", "Đang giao", "Giao hàng thành công"
- ✅ Thông tin đơn hàng: Số đơn, ngày đặt, phương thức thanh toán, mã vận đơn
- ✅ Chi tiết sản phẩm: Bảng hiển thị sản phẩm, số lượng, đơn giá, thành tiền
- ✅ Tổng kết đơn hàng: Tạm tính, phí vận chuyển, giảm giá, tổng cộng
- ✅ Địa chỉ giao hàng
- ✅ Footer: Thông tin liên hệ

**Template sử dụng:**
- HTML với inline CSS (để tương thích với nhiều email client)
- Format số tiền VNĐ: `formatPrice()`
- Format ngày tháng: `formatDate()`

---

### **BƯỚC 7: Gửi email qua Nodemailer (Gmail SMTP)**

**File**: `backend/services/Email/EmailServices.js`

```1:12:backend/services/Email/EmailServices.js
import nodemailer from 'nodemailer';

// Config Gmail (dễ hiểu – chỉ cần set biến môi trường EMAIL_USER, EMAIL_PASS)
const emailTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', // SMTP của Gmail
  port: 587, // Port TLS (STARTTLS) tiêu chuẩn
  secure: false, // false vì dùng TLS (nếu dùng SSL port 465 thì true)
  auth: {
    user: process.env.EMAIL_USER, // Gmail/ứng dụng email của bạn
    pass: process.env.EMAIL_PASS, // App password/ mật khẩu ứng dụng
  },
});

const FROM_EMAIL = '"Nội thất văn phòng" <tandat8503@gmail.com>';
```

**Luồng:**
1. ✅ Nodemailer kết nối đến Gmail SMTP (`smtp.gmail.com:587`)
2. ✅ Xác thực bằng `EMAIL_USER` và `EMAIL_PASS` (App Password)
3. ✅ Gửi email với:
   - `from`: `"Nội thất văn phòng" <tandat8503@gmail.com>`
   - `to`: Email của user (`orderForEmail.user.email`)
   - `subject`: Tiêu đề email (ví dụ: "Đơn hàng #ORD123 đã được xác nhận")
   - `html`: Nội dung HTML (template email)
   - `text`: Nội dung text thuần (fallback)
4. ✅ Gmail SMTP gửi email đến hộp thư của user

---

## 📊 SƠ ĐỒ LUỒNG DỮ LIỆU

```
┌─────────────────────────┐
│   ADMIN (Frontend)      │
│  - Chọn trạng thái mới  │
│  - Click "Cập nhật"     │
└───────────┬─────────────┘
            │
            │ 1. PUT /api/admin/orders/:id
            │    { status: "CONFIRMED" }
            ▼
┌──────────────────────────────────────────┐
│  adminOrderController.js                 │
│  updateOrder()                           │
│  ├─ Validate trạng thái                 │
│  ├─ Kiểm tra quy tắc chuyển trạng thái  │
│  ├─ Transaction:                        │
│  │  ├─ Trừ tồn kho (nếu CONFIRMED)      │
│  │  ├─ UPDATE orders SET status = ...   │
│  │  └─ INSERT orderStatusHistory        │
│  └─ Gửi WebSocket đến user              │
└───────────┬──────────────────────────────┘
            │
            │ 2. Lấy dữ liệu đầy đủ
            ▼
┌──────────────────────────────────────────┐
│  Database (MySQL)                        │
│  - orders (status mới)                   │
│  - orderItems (sản phẩm, giá)            │
│  - users (email)                         │
│  - shippingAddress (JSON)                │
└───────────┬──────────────────────────────┘
            │
            │ 3. Format dữ liệu
            ▼
┌──────────────────────────────────────────┐
│  adminOrderController.js                 │
│  - Parse shippingAddress (JSON → Object) │
│  - Format orderItems                     │
│  - Tạo orderData object                  │
└───────────┬──────────────────────────────┘
            │
            │ 4. Gọi email service theo status
            │    - CONFIRMED → sendOrderConfirmedEmail()
            │    - PROCESSING → sendOrderShippingEmail()
            │    - DELIVERED → sendOrderDeliveredEmail()
            ▼
┌──────────────────────────────────────────┐
│  EmailServices.js                        │
│  - sendOrderConfirmedEmail()             │
│  - sendOrderShippingEmail()              │
│  - sendOrderDeliveredEmail()             │
│  ├─ Tạo HTML email (getOrderEmailTemplate)│
│  ├─ Format số tiền VNĐ                  │
│  ├─ Format ngày tháng                   │
│  └─ emailTransporter.sendMail()         │
└───────────┬──────────────────────────────┘
            │
            │ 5. Gửi email qua Gmail SMTP
            ▼
┌──────────────────────────────────────────┐
│  Nodemailer + Gmail SMTP                 │
│  - smtp.gmail.com:587                    │
│  - Xác thực: EMAIL_USER + EMAIL_PASS     │
│  - FROM: "Nội thất văn phòng" <...>     │
│  - TO: user@example.com                  │
│  - SUBJECT: "Đơn hàng #ORD123..."        │
│  - HTML: Template email đẹp              │
└───────────┬──────────────────────────────┘
            │
            │ 6. Gmail gửi email
            ▼
┌──────────────────────────────────────────┐
│   USER GMAIL                             │
│   📧 Đơn hàng #ORD123 đã được xác nhận   │
│   - Chi tiết đơn hàng                    │
│   - Danh sách sản phẩm                   │
│   - Tổng tiền                            │
│   - Địa chỉ giao hàng                    │
└──────────────────────────────────────────┘
```

---

## 🔍 CÁC TRẠNG THÁI VÀ EMAIL TƯƠNG ỨNG

| Trạng thái | Email Service | Subject | Nội dung chính |
|-----------|---------------|---------|----------------|
| **CONFIRMED** | `sendOrderConfirmedEmail()` | "Đơn hàng #XXX đã được xác nhận" | "Đơn hàng của bạn đã được xác nhận và đang được chuẩn bị" |
| **PROCESSING** | `sendOrderShippingEmail()` | "Đơn hàng #XXX đang được giao" | "Đơn hàng đã được giao cho đơn vị vận chuyển" + mã vận đơn |
| **DELIVERED** | `sendOrderDeliveredEmail()` | "Đơn hàng #XXX đã được giao thành công" | "Đơn hàng đã được giao thành công! Cảm ơn bạn đã mua sắm" |
| **CANCELLED** | `sendOrderCancelledEmail()` | "Đơn hàng #XXX đã bị hủy" | "Đơn hàng đã bị hủy" + lý do + thông tin hoàn tiền |

**Lưu ý**: Email `CANCELLED` được gửi từ API `cancelOrder()` (không phải `updateOrder()`)

---

## 📧 NỘI DUNG EMAIL CHI TIẾT

### **Thông tin hiển thị trong email:**

1. **Header:**
   - Tên cửa hàng: "Nội thất văn phòng"
   - Badge trạng thái (màu xanh)

2. **Thông tin đơn hàng:**
   - Mã đơn hàng (`orderNumber`)
   - Ngày đặt hàng (`createdAt`)
   - Phương thức thanh toán (`paymentMethod`: VNPay hoặc COD)
   - Mã vận đơn (`trackingCode`) - nếu có

3. **Chi tiết sản phẩm:**
   - Bảng hiển thị: Tên sản phẩm, biến thể, số lượng, đơn giá, thành tiền
   - Format: HTML table với CSS đẹp

4. **Tổng kết đơn hàng:**
   - Tạm tính (`subtotal`)
   - Phí vận chuyển (`shippingFee`)
   - Giảm giá (`discountAmount`) - nếu có
   - **Tổng cộng** (`totalAmount`) - in đậm, màu xanh

5. **Địa chỉ giao hàng:**
   - Format: `Họ tên\nSố điện thoại\nĐịa chỉ cụ thể\nPhường/Xã, Quận/Huyện, Tỉnh/Thành`

6. **Footer:**
   - Thông tin liên hệ
   - Hotline

---

## ⚙️ CẤU HÌNH EMAIL

### **Biến môi trường cần thiết:**

```env
EMAIL_USER=tandat8503@gmail.com
EMAIL_PASS=your_app_password_here
```

**Lưu ý**: Gmail yêu cầu **App Password** (không phải mật khẩu thường):
1. Vào Google Account → Security
2. Bật 2-Step Verification
3. Tạo App Password cho "Mail"
4. Dùng App Password làm `EMAIL_PASS`

---

## 🎯 TÓM TẮT LUỒNG

1. ✅ **Admin cập nhật trạng thái** → Frontend gọi API
2. ✅ **Backend xử lý**: Validate → Cập nhật DB → Gửi WebSocket
3. ✅ **Lấy dữ liệu đầy đủ**: Order + OrderItems + User email + ShippingAddress
4. ✅ **Format dữ liệu**: Parse JSON, format số tiền, format địa chỉ
5. ✅ **Gọi email service**: Theo trạng thái (CONFIRMED/PROCESSING/DELIVERED)
6. ✅ **Tạo HTML email**: Template với đầy đủ thông tin đơn hàng
7. ✅ **Gửi qua Gmail SMTP**: Nodemailer → Gmail → User Gmail

**Kết quả**: User nhận email chi tiết đơn hàng trong hộp thư Gmail của họ! 📧

