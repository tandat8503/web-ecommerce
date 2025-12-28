# Checkout & Order System - Hệ Thống Thanh Toán & Đơn Hàng

## 📋 Tổng Quan

Hệ thống thanh toán và đơn hàng bao gồm:
- Quản lý địa chỉ giao hàng
- Tính phí vận chuyển (GHN API)
- Áp dụng mã giảm giá
- Nhiều phương thức thanh toán (COD, VNPay)
- Tạo và theo dõi đơn hàng
- Cập nhật trạng thái đơn hàng
- Tích hợp vận chuyển GHN

---

## 🗄️ Database Schema

### Order Model
```prisma
model Order {
  id                Int           @id @default(autoincrement())
  orderNumber       String        @unique @map("order_number") @db.VarChar(50)
  userId            Int           @map("user_id")
  user              User          @relation(fields: [userId], references: [id])
  
  // Order Details
  status            OrderStatus   @default(PENDING)
  paymentMethod     PaymentMethod @map("payment_method")
  paymentStatus     PaymentStatus @default(UNPAID) @map("payment_status")
  
  // Pricing
  subtotal          Decimal       @db.Decimal(10, 2)
  shippingFee       Decimal       @default(0) @db.Decimal(10, 2) @map("shipping_fee")
  discountAmount    Decimal       @default(0) @db.Decimal(10, 2) @map("discount_amount")
  totalAmount       Decimal       @db.Decimal(10, 2) @map("total_amount")
  
  // Shipping Info
  recipientName     String        @map("recipient_name") @db.VarChar(100)
  recipientPhone    String        @map("recipient_phone") @db.VarChar(20)
  shippingAddress   String        @map("shipping_address") @db.Text
  province          String        @db.VarChar(100)
  district          String        @db.VarChar(100)
  ward              String        @db.VarChar(100)
  
  // GHN Integration
  provinceId        Int?          @map("province_id")
  districtId        Int?          @map("district_id")
  wardCode          String?       @map("ward_code") @db.VarChar(20)
  ghnOrderCode      String?       @unique @map("ghn_order_code") @db.VarChar(50)
  
  // Additional Info
  customerNote      String?       @map("customer_note") @db.Text
  adminNote         String?       @map("admin_note") @db.Text
  
  // Coupon
  couponCode        String?       @map("coupon_code") @db.VarChar(50)
  
  // Timestamps
  orderDate         DateTime      @default(now()) @map("order_date")
  confirmedAt       DateTime?     @map("confirmed_at")
  shippedAt         DateTime?     @map("shipped_at")
  deliveredAt       DateTime?     @map("delivered_at")
  cancelledAt       DateTime?     @map("cancelled_at")
  
  createdAt         DateTime      @default(now()) @map("created_at")
  updatedAt         DateTime      @updatedAt @map("updated_at")
  
  // Relations
  items             OrderItem[]
  couponUsages      CouponUsage[]
  
  @@map("orders")
  @@index([userId])
  @@index([orderNumber])
  @@index([status])
}

model OrderItem {
  id            Int      @id @default(autoincrement())
  orderId       Int      @map("order_id")
  order         Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  productId     Int      @map("product_id")
  product       Product  @relation(fields: [productId], references: [id])
  
  variantId     Int?     @map("variant_id")
  variant       ProductVariant? @relation(fields: [variantId], references: [id])
  
  // Snapshot data (giá tại thời điểm đặt hàng)
  productName   String   @map("product_name") @db.VarChar(255)
  variantInfo   String?  @map("variant_info") @db.VarChar(255)
  price         Decimal  @db.Decimal(10, 2)
  quantity      Int
  subtotal      Decimal  @db.Decimal(10, 2)
  
  createdAt     DateTime @default(now()) @map("created_at")
  
  @@map("order_items")
  @@index([orderId])
}

enum OrderStatus {
  PENDING       // Chờ xác nhận
  CONFIRMED     // Đã xác nhận
  PROCESSING    // Đang xử lý
  SHIPPING      // Đang giao hàng
  DELIVERED     // Đã giao hàng
  CANCELLED     // Đã hủy
  RETURNED      // Đã trả hàng
}

enum PaymentMethod {
  COD           // Thanh toán khi nhận hàng
  VNPAY         // VNPay
  MOMO          // MoMo
  BANK_TRANSFER // Chuyển khoản
}

enum PaymentStatus {
  UNPAID        // Chưa thanh toán
  PAID          // Đã thanh toán
  REFUNDED      // Đã hoàn tiền
}
```

---

## 🔧 Backend Implementation

### 1. Controller: `controller/orderController.js`

#### Create Order
```javascript
import { validateAndApplyCoupon, markCouponAsUsed } from '../services/couponService.js';
import { calculateShippingFee } from '../services/shipping/shippingService.js';

export const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      recipientName,
      recipientPhone,
      shippingAddress,
      province,
      district,
      ward,
      provinceId,
      districtId,
      wardCode,
      paymentMethod,
      customerNote,
      couponCode
    } = req.body;

    // Validate required fields
    if (!recipientName || !recipientPhone || !shippingAddress || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc'
      });
    }

    // Get cart items
    const cartItems = await prisma.shoppingCart.findMany({
      where: { userId },
      include: {
        product: true,
        variant: true
      }
    });

    if (cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Giỏ hàng trống'
      });
    }

    // Validate stock
    for (const item of cartItems) {
      const availableStock = item.variant 
        ? item.variant.stockQuantity 
        : item.product.stockQuantity;
      
      if (item.quantity > availableStock) {
        return res.status(400).json({
          success: false,
          message: `Sản phẩm "${item.product.name}" chỉ còn ${availableStock} trong kho`
        });
      }
    }

    // Calculate subtotal
    const subtotal = cartItems.reduce((sum, item) => {
      const price = item.variant?.price || item.product.price;
      return sum + (Number(price) * item.quantity);
    }, 0);

    // Calculate shipping fee
    let shippingFee = 0;
    if (districtId && wardCode) {
      const shippingResult = await calculateShippingFee({
        toDistrictId: Number(districtId),
        toWardCode: String(wardCode),
        weight: cartItems.reduce((sum, item) => sum + (item.quantity * 500), 0), // 500g per item
        serviceTypeId: 2 // Standard
      });
      
      shippingFee = shippingResult.success ? shippingResult.shippingFee : 30000;
    } else {
      shippingFee = 30000; // Default
    }

    // Apply coupon if provided
    let discountAmount = 0;
    let discountShipping = 0;
    let validatedCoupon = null;

    if (couponCode) {
      const couponResult = await validateAndApplyCoupon(
        userId,
        couponCode,
        subtotal,
        shippingFee
      );

      if (!couponResult.success) {
        return res.status(400).json({
          success: false,
          message: couponResult.message
        });
      }

      discountAmount = couponResult.discountAmount || 0;
      discountShipping = couponResult.discountShipping || 0;
      validatedCoupon = couponResult.coupon;
    }

    // Calculate total
    const finalShippingFee = Math.max(0, shippingFee - discountShipping);
    const totalAmount = subtotal + finalShippingFee - discountAmount;

    // Generate order number
    const orderNumber = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Create order with transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          status: 'PENDING',
          paymentMethod,
          paymentStatus: paymentMethod === 'COD' ? 'UNPAID' : 'UNPAID',
          subtotal,
          shippingFee: finalShippingFee,
          discountAmount: discountAmount + discountShipping,
          totalAmount,
          recipientName,
          recipientPhone,
          shippingAddress,
          province,
          district,
          ward,
          provinceId: provinceId ? Number(provinceId) : null,
          districtId: districtId ? Number(districtId) : null,
          wardCode: wardCode || null,
          customerNote,
          couponCode: couponCode || null
        }
      });

      // Create order items
      for (const item of cartItems) {
        const price = item.variant?.price || item.product.price;
        const variantInfo = item.variant 
          ? `${item.variant.color || ''} ${item.variant.size || ''}`.trim()
          : null;

        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: item.productId,
            variantId: item.variantId,
            productName: item.product.name,
            variantInfo,
            price: Number(price),
            quantity: item.quantity,
            subtotal: Number(price) * item.quantity
          }
        });

        // Update stock
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockQuantity: { decrement: item.quantity } }
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: { decrement: item.quantity } }
          });
        }
      }

      // Mark coupon as used
      if (validatedCoupon) {
        await markCouponAsUsed(userId, validatedCoupon.id, newOrder.id);
      }

      // Clear cart
      await tx.shoppingCart.deleteMany({
        where: { userId }
      });

      return newOrder;
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId,
        title: 'Đơn hàng đã được tạo',
        message: `Đơn hàng #${orderNumber} đã được tạo thành công`,
        type: 'ORDER'
      }
    });

    logger.info('Order created', { orderId: order.id, orderNumber, userId });

    return res.status(201).json({
      success: true,
      message: 'Đặt hàng thành công',
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount
      }
    });
  } catch (error) {
    logger.error('Create order error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo đơn hàng'
    });
  }
};
```

#### Get User Orders
```javascript
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 10, 
      status 
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where = { userId };
    
    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  primaryImage: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.order.count({ where })
    ]);

    return res.json({
      success: true,
      data: {
        orders,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Get user orders error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách đơn hàng'
    });
  }
};
```

#### Get Order Detail
```javascript
export const getOrderDetail = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: Number(id) },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                primaryImage: true
              }
            },
            variant: {
              select: {
                id: true,
                color: true,
                size: true,
                imageUrl: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    // Check ownership
    if (order.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền xem đơn hàng này'
      });
    }

    return res.json({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error('Get order detail error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy chi tiết đơn hàng'
    });
  }
};
```

#### Cancel Order
```javascript
export const cancelOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { reason } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: Number(id) },
      include: { items: true }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    if (order.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền hủy đơn hàng này'
      });
    }

    // Only allow cancel if PENDING or CONFIRMED
    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Không thể hủy đơn hàng ở trạng thái này'
      });
    }

    await prisma.$transaction(async (tx) => {
      // Update order status
      await tx.order.update({
        where: { id: Number(id) },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          adminNote: reason || 'Khách hàng hủy đơn'
        }
      });

      // Restore stock
      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockQuantity: { increment: item.quantity } }
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: { increment: item.quantity } }
          });
        }
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId,
        title: 'Đơn hàng đã hủy',
        message: `Đơn hàng #${order.orderNumber} đã được hủy`,
        type: 'ORDER'
      }
    });

    logger.info('Order cancelled', { orderId: order.id, userId });

    return res.json({
      success: true,
      message: 'Đã hủy đơn hàng thành công'
    });
  } catch (error) {
    logger.error('Cancel order error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi hủy đơn hàng'
    });
  }
};
```

### 2. Admin Order Controller: `controller/adminOrderController.js`

#### Update Order Status
```javascript
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái không hợp lệ'
      });
    }

    const order = await prisma.order.findUnique({
      where: { id: Number(id) }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    const updateData = { status, adminNote };
    
    // Update timestamps based on status
    if (status === 'CONFIRMED') updateData.confirmedAt = new Date();
    if (status === 'SHIPPING') updateData.shippedAt = new Date();
    if (status === 'DELIVERED') {
      updateData.deliveredAt = new Date();
      updateData.paymentStatus = 'PAID'; // Auto mark as paid when delivered
    }
    if (status === 'CANCELLED') updateData.cancelledAt = new Date();

    const updatedOrder = await prisma.order.update({
      where: { id: Number(id) },
      data: updateData
    });

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: order.userId,
        title: 'Cập nhật đơn hàng',
        message: `Đơn hàng #${order.orderNumber} đã chuyển sang trạng thái: ${getStatusText(status)}`,
        type: 'ORDER'
      }
    });

    logger.info('Order status updated', { orderId: order.id, status });

    return res.json({
      success: true,
      message: 'Cập nhật trạng thái thành công',
      data: updatedOrder
    });
  } catch (error) {
    logger.error('Update order status error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật trạng thái'
    });
  }
};

function getStatusText(status) {
  const statusMap = {
    PENDING: 'Chờ xác nhận',
    CONFIRMED: 'Đã xác nhận',
    PROCESSING: 'Đang xử lý',
    SHIPPING: 'Đang giao hàng',
    DELIVERED: 'Đã giao hàng',
    CANCELLED: 'Đã hủy'
  };
  return statusMap[status] || status;
}
```

### 3. Routes: `routes/orderRoutes.js`

```javascript
import express from 'express';
import {
  createOrder,
  getUserOrders,
  getOrderDetail,
  cancelOrder
} from '../controller/orderController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createOrder);
router.get('/', getUserOrders);
router.get('/:id', getOrderDetail);
router.post('/:id/cancel', cancelOrder);

export default router;
```

---

## 🎨 Frontend Implementation

### 1. API Service: `src/api/orders.js`

```javascript
import axiosClient from './axiosClient';

export const createOrder = (data) => {
  return axiosClient.post('/orders', data);
};

export const getUserOrders = (params) => {
  return axiosClient.get('/orders', { params });
};

export const getOrderDetail = (id) => {
  return axiosClient.get(`/orders/${id}`);
};

export const cancelOrder = (id, reason) => {
  return axiosClient.post(`/orders/${id}/cancel`, { reason });
};
```

### 2. Checkout Hook: `src/pages/user/checkout/useCheckout.js`

```javascript
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCart } from '@/api/cart';
import { getUserAddresses } from '@/api/address';
import { calculateShippingFee } from '@/api/shipping';
import { createOrder } from '@/api/orders';
import { validateAndApplyCoupon } from '@/api/coupons';

export default function useCheckout() {
  const navigate = useNavigate();
  
  // States
  const [checkoutItems, setCheckoutItems] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [shippingFee, setShippingFee] = useState(0);
  const [shippingFeeLoading, setShippingFeeLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [customerNote, setCustomerNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Coupon states
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Selected address
  const selectedAddress = useMemo(() => {
    return addresses.find(addr => addr.id === selectedAddressId);
  }, [addresses, selectedAddressId]);

  // Calculate summary
  const summary = useMemo(() => {
    const subtotal = checkoutItems.reduce((sum, item) => {
      const price = item.variant?.price || item.product.price;
      return sum + (Number(price) * item.quantity);
    }, 0);

    const discountAmount = appliedCoupon?.discountAmount || 0;
    const discountShipping = appliedCoupon?.discountShipping || 0;
    const finalShippingFee = Math.max(0, shippingFee - discountShipping);
    const total = subtotal + finalShippingFee - discountAmount;

    return {
      subtotal,
      shippingFee,
      discountAmount,
      discountShipping,
      totalDiscount: discountAmount + discountShipping,
      finalShippingFee,
      total
    };
  }, [checkoutItems, shippingFee, appliedCoupon]);

  // Fetch cart items
  useEffect(() => {
    const fetchCart = async () => {
      try {
        const response = await getCart();
        setCheckoutItems(response.data.data.items);
      } catch (error) {
        toast.error('Lỗi khi tải giỏ hàng');
      }
    };
    fetchCart();
  }, []);

  // Fetch addresses
  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const response = await getUserAddresses();
        const addrs = response.data.data;
        setAddresses(addrs);
        
        // Auto select default address
        const defaultAddr = addrs.find(a => a.isDefault);
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
        }
      } catch (error) {
        toast.error('Lỗi khi tải địa chỉ');
      }
    };
    fetchAddresses();
  }, []);

  // Calculate shipping fee when address changes
  useEffect(() => {
    const calculateFee = async () => {
      if (!selectedAddress?.districtId || !selectedAddress?.wardCode) {
        setShippingFee(30000); // Default
        return;
      }

      setShippingFeeLoading(true);
      try {
        const response = await calculateShippingFee({
          toDistrictId: selectedAddress.districtId,
          toWardCode: selectedAddress.wardCode,
          weight: checkoutItems.reduce((sum, item) => sum + (item.quantity * 500), 0),
          serviceTypeId: 2
        });

        if (response.data.success) {
          setShippingFee(response.data.data.shippingFee);
        }
      } catch (error) {
        setShippingFee(30000);
      } finally {
        setShippingFeeLoading(false);
      }
    };

    calculateFee();
  }, [selectedAddress, checkoutItems]);

  // Validate coupon
  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Vui lòng nhập mã giảm giá');
      return;
    }

    setValidatingCoupon(true);
    try {
      const response = await validateAndApplyCoupon({
        couponCode: couponCode.trim(),
        subtotal: summary.subtotal,
        shippingFee: summary.shippingFee
      });

      if (response.data.success) {
        setAppliedCoupon(response.data.data);
        toast.success('Áp dụng mã giảm giá thành công');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Mã giảm giá không hợp lệ');
    } finally {
      setValidatingCoupon(false);
    }
  };

  // Remove coupon
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  // Place order
  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast.error('Vui lòng chọn địa chỉ giao hàng');
      return;
    }

    setSubmitting(true);
    try {
      const orderData = {
        recipientName: selectedAddress.recipientName,
        recipientPhone: selectedAddress.phone,
        shippingAddress: selectedAddress.addressLine,
        province: selectedAddress.city,
        district: selectedAddress.district,
        ward: selectedAddress.ward,
        provinceId: selectedAddress.provinceId,
        districtId: selectedAddress.districtId,
        wardCode: selectedAddress.wardCode,
        paymentMethod,
        customerNote,
        couponCode: appliedCoupon ? couponCode : null
      };

      const response = await createOrder(orderData);
      
      if (response.data.success) {
        toast.success('Đặt hàng thành công!');
        
        // Redirect based on payment method
        if (paymentMethod === 'VNPAY') {
          // Redirect to VNPay payment page
          window.location.href = response.data.data.paymentUrl;
        } else {
          navigate(`/orders/${response.data.data.orderId}`);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi đặt hàng');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    checkoutItems,
    addresses,
    selectedAddress,
    selectedAddressId,
    shippingFee,
    shippingFeeLoading,
    paymentMethod,
    customerNote,
    summary,
    submitting,
    couponCode,
    appliedCoupon,
    validatingCoupon,
    setSelectedAddressId,
    setPaymentMethod,
    setCustomerNote,
    setCouponCode,
    handleValidateCoupon,
    handleRemoveCoupon,
    handlePlaceOrder
  };
}
```

### 3. Checkout Page: `src/pages/user/checkout/Checkout.jsx`

```jsx
import useCheckout from './useCheckout';
import { formatPrice } from '@/lib/utils';

export default function Checkout() {
  const {
    checkoutItems,
    addresses,
    selectedAddressId,
    shippingFee,
    paymentMethod,
    customerNote,
    summary,
    submitting,
    setSelectedAddressId,
    setPaymentMethod,
    setCustomerNote,
    handlePlaceOrder
  } = useCheckout();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Thanh Toán</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shipping Address */}
          <div className="border rounded p-6">
            <h2 className="text-xl font-bold mb-4">Địa Chỉ Giao Hàng</h2>
            {addresses.map((addr) => (
              <label key={addr.id} className="flex items-start gap-3 p-3 border rounded mb-3 cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="address"
                  checked={selectedAddressId === addr.id}
                  onChange={() => setSelectedAddressId(addr.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="font-semibold">{addr.recipientName} | {addr.phone}</p>
                  <p className="text-gray-600">{addr.addressLine}</p>
                  <p className="text-gray-600">{addr.ward}, {addr.district}, {addr.city}</p>
                  {addr.isDefault && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Mặc định</span>
                  )}
                </div>
              </label>
            ))}
          </div>

          {/* Payment Method */}
          <div className="border rounded p-6">
            <h2 className="text-xl font-bold mb-4">Phương Thức Thanh Toán</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border rounded cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  value="COD"
                  checked={paymentMethod === 'COD'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <span>Thanh toán khi nhận hàng (COD)</span>
              </label>
              <label className="flex items-center gap-3 p-3 border rounded cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  value="VNPAY"
                  checked={paymentMethod === 'VNPAY'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <span>Thanh toán VNPay</span>
              </label>
            </div>
          </div>

          {/* Customer Note */}
          <div className="border rounded p-6">
            <h2 className="text-xl font-bold mb-4">Ghi Chú</h2>
            <textarea
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              placeholder="Ghi chú cho đơn hàng..."
              rows={3}
              className="w-full border rounded p-3"
            />
          </div>
        </div>

        {/* Right Column - Order Summary */}
        <div className="lg:col-span-1">
          <div className="border rounded p-6 sticky top-4">
            <h2 className="text-xl font-bold mb-4">Tóm Tắt Đơn Hàng</h2>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span>Tạm tính</span>
                <span className="font-semibold">{formatPrice(summary.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Phí vận chuyển</span>
                <span className="font-semibold">{formatPrice(summary.shippingFee)}</span>
              </div>
              {summary.totalDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Giảm giá</span>
                  <span className="font-semibold">-{formatPrice(summary.totalDiscount)}</span>
                </div>
              )}
            </div>
            
            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between text-lg font-bold">
                <span>Tổng cộng</span>
                <span className="text-orange-600">{formatPrice(summary.total)}</span>
              </div>
            </div>
            
            <button
              onClick={handlePlaceOrder}
              disabled={submitting}
              className="w-full bg-orange-600 text-white py-3 rounded font-semibold hover:bg-orange-700 disabled:opacity-50"
            >
              {submitting ? 'Đang xử lý...' : 'Đặt Hàng'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 🧪 Testing

### Test Create Order
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientName": "Nguyen Van A",
    "recipientPhone": "0123456789",
    "shippingAddress": "123 ABC Street",
    "province": "TP. Ho Chi Minh",
    "district": "Quan 1",
    "ward": "Phuong Ben Nghe",
    "districtId": 1542,
    "wardCode": "20308",
    "paymentMethod": "COD",
    "customerNote": "Giao hang buoi sang"
  }'
```

---

## 🚀 Flow Diagram

```
Checkout Flow:
1. User vào /checkout → Load cart items
2. Fetch user addresses → Auto select default
3. Calculate shipping fee (GHN API)
4. User chọn payment method
5. User nhập coupon (optional)
   - Validate coupon
   - Apply discount
6. User click "Đặt hàng"
7. Validate:
   - Address selected?
   - Stock available?
8. Create order (transaction):
   - Create Order record
   - Create OrderItems
   - Update stock
   - Mark coupon as used
   - Clear cart
9. Create notification
10. Redirect:
    - COD → Order detail page
    - VNPay → Payment page

Order Status Flow:
PENDING → CONFIRMED → PROCESSING → SHIPPING → DELIVERED
    ↓
CANCELLED (only from PENDING/CONFIRMED)
```

---

## ✅ Checklist

- [x] Create order with validation
- [x] Address management integration
- [x] Shipping fee calculation (GHN)
- [x] Coupon application
- [x] Multiple payment methods
- [x] Stock validation & update
- [x] Order tracking
- [x] Cancel order
- [x] Admin order management
- [x] Order status updates
- [x] Notifications
- [x] Transaction handling
- [x] Cart clearing after order
