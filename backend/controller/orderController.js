import prisma from "../config/prisma.js";
import logger from '../utils/logger.js';
import { emitNewOrder, emitOrderStatusUpdate } from '../config/socket.js';
import { calculateShippingFee as ghnCalculateShippingFee } from '../services/shipping/ghnService.js';
import { sendOrderConfirmationEmail } from '../services/Email/EmailServices.js';
import {
  validateAndApplyCoupon,
  markCouponAsUsed,
  grantFirstOrderCoupon
} from '../services/couponService.js';

const DEFAULT_SHIPPING_FEE = 30000;
const DEFAULT_WEIGHT_PER_ITEM = 500; // gram
const DEFAULT_DIMENSION_CM = 30;

const mmToCm = (value) => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return null;
  return Math.max(DEFAULT_DIMENSION_CM, Math.ceil(parsed / 10));
};

/**
 * Tính toán metrics vận chuyển từ danh sách cartItems
 * Sử dụng kích thước thực tế từ product_variant (width, depth, height)
 * 
 * Logic:
 * - Lấy kích thước lớn nhất cho mỗi chiều khi có nhiều sản phẩm
 * - GHN yêu cầu: length >= width >= height
 * - Chuyển đổi từ mm (trong DB) sang cm (GHN yêu cầu)
 */
const buildShipmentMetrics = (cartItems) => {
  const metrics = {
    weight: 0,
    length: DEFAULT_DIMENSION_CM,
    width: DEFAULT_DIMENSION_CM,
    height: DEFAULT_DIMENSION_CM,
  };

  cartItems.forEach((item) => {
    const quantity = item.quantity || 1;
    metrics.weight += DEFAULT_WEIGHT_PER_ITEM * quantity;

    // ✅ Sử dụng kích thước từ product_variant nếu có
    const variant = item.variant;
    if (variant) {
      // Chuyển đổi từ mm sang cm
      // variant.width = chiều rộng (mm) → dùng làm length (chiều dài)
      // variant.depth = chiều sâu (mm) → dùng làm width (chiều rộng)
      // variant.height = chiều cao (mm) → dùng làm height (chiều cao)
      const lengthCm = mmToCm(variant.width);
      const widthCm = mmToCm(variant.depth);
      const heightCm = mmToCm(variant.height);

      // Lấy kích thước lớn nhất cho mỗi chiều (khi có nhiều sản phẩm)
      if (lengthCm) metrics.length = Math.max(metrics.length, lengthCm);
      if (widthCm) metrics.width = Math.max(metrics.width, widthCm);
      if (heightCm) metrics.height = Math.max(metrics.height, heightCm);
    }
  });

  if (metrics.weight === 0) {
    metrics.weight = DEFAULT_WEIGHT_PER_ITEM;
  }

  // GHN giới hạn 30kg cho dịch vụ chuẩn
  metrics.weight = Math.min(metrics.weight, 30000);

  // Đảm bảo length >= width >= height (yêu cầu của GHN)
  const dimensions = [metrics.length, metrics.width, metrics.height].sort((a, b) => b - a);
  metrics.length = dimensions[0];
  metrics.width = dimensions[1];
  metrics.height = dimensions[2];

  return metrics;
};

/**
 * Tạo mã đơn hàng: <maKH><YYYYMMDD><SEQ3>
 * - maKH: userId padStart(3)
 * - YYYYMMDD: ngày đặt hàng
 * - SEQ3: số thứ tự đơn của user trong ngày (001, 002, ...)
 */
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
    return `${userCode}${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Date.now().toString().slice(-3)}`;

  }
};

// Tạo đơn hàng từ giỏ hàng (viết theo các bước rõ ràng, dễ đọc)
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

    // BƯỚC 4: Tính tổng đơn
    const discountAmount = 0; // bản cơ bản: chưa áp dụng giảm giá
    //tổng tiền cuối cùng của đơn hàng = tổng tiền của đơn hàng + phí ship - giảm giá
    const totalAmount = subtotal + shippingFee - discountAmount;

    // BƯỚC 5: Tạo mã đơn hàng và mã giao dịch thanh toán
    const orderNumber = await generateOrderNumber(userId);//tạo mã đơn hàng
    //tạo mã giao dịch thanh toán
    const transactionId = `TXN${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

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

    // BƯỚC 7: Lấy đơn hàng đầy đủ để trả về cho FE
    const orderDetails = await prisma.order.findUnique({
      where: { id: created.id },
      include: {
        orderItems: { include: { product: true, variant: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        payments: true
      }
    });

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

    // BƯỚC 10: Tặng mã giảm giá cho đơn hàng đầu tiên (non-blocking)
    // TODO: Tính năng tạm thời tắt - Chỉ giữ lại mã chào mừng người dùng mới
    // grantFirstOrderCoupon(userId).catch(err => {
    //   logger.error('Failed to grant first order coupon (non-blocking)', {
    //     userId,
    //     orderId: created.id,
    //     error: err.message
    //   });
    // });

    return res.status(201).json({ message: "Tạo đơn hàng thành công", order: orderDetails });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Danh sách đơn hàng (phân trang, lọc theo trạng thái)
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const where = { userId };
    if (status) where.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { orderItems: { include: { product: true, variant: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit)
      }),
      prisma.order.count({ where })
    ]);

    // ✅ Parse shippingAddress từ JSON string thành object cho mỗi order
    const itemsWithParsedAddress = items.map(order => {
      let parsedShippingAddress = order.shippingAddress;
      try {
        if (typeof order.shippingAddress === 'string') {
          parsedShippingAddress = JSON.parse(order.shippingAddress);
        }
      } catch (e) {
        logger.warn('Failed to parse shippingAddress', { orderId: order.id, error: e.message });
      }
      return { ...order, shippingAddress: parsedShippingAddress };
    });

    return res.json({ items: itemsWithParsedAddress, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Chi tiết đơn hàng (chỉ được xem đơn của chính mình)
export const getOrderById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { status: statusFilter } = req.query || {};
    if (!id || isNaN(id)) return res.status(400).json({ message: "ID đơn hàng không hợp lệ" });

    // Lấy chi tiết đơn hàng (bao gồm adminNote - ghi chú của admin)
    const order = await prisma.order.findFirst({
      where: { id: Number(id), userId },
      include: {
        orderItems: { include: { product: true, variant: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        payments: { orderBy: { createdAt: 'desc' } },
        statusHistory: { orderBy: { createdAt: "asc" } }
      }
      // Không dùng select cho Order nên tất cả fields (bao gồm adminNote) đều được trả về
    });

    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    if (statusFilter && String(order.status) !== String(statusFilter)) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng với trạng thái yêu cầu" });
    }

    // Dựng timeline từ lịch sử thay đổi trạng thái (chính xác 100%)
    const paidPayment = order.payments.find((p) => p.paymentStatus === "PAID");

    // Tìm thời gian của từng status trong history (lấy lần xuất hiện cuối cùng để chính xác)
    const getStatusTime = (targetStatus) => {
      // Tìm tất cả các record có status này và lấy record mới nhất
      const historyItems = order.statusHistory.filter(h => h.status === targetStatus);
      if (historyItems.length === 0) return null;
      // Lấy record có thời gian mới nhất (vì đã orderBy createdAt asc, nên phần tử cuối là mới nhất)
      const latestItem = historyItems[historyItems.length - 1];
      return latestItem.createdAt;
    };

    //tạo timeline từ lịch sử thay đổi trạng thái
    const timeline = {
      //thời gian tạo đơn hàng
      pendingAt: order.createdAt,
      //thời gian xác nhận đơn hàng
      confirmedAt: getStatusTime("CONFIRMED"),
      //thời gian đang giao hàng
      processingAt: getStatusTime("PROCESSING"),
      //thời gian nhận hàng
      deliveredAt: getStatusTime("DELIVERED"),
      //thời gian hủy đơn hàng
      cancelledAt: getStatusTime("CANCELLED"),
      //thời gian thanh toán đơn hàng
      paymentConfirmedAt: paidPayment?.paidAt || null
    };

    // ✅ Parse shippingAddress từ JSON string thành object
    let parsedShippingAddress = order.shippingAddress;
    try {
      if (typeof order.shippingAddress === 'string') {
        parsedShippingAddress = JSON.parse(order.shippingAddress);
      }
    } catch (e) {
      logger.warn('Failed to parse shippingAddress', { orderId: order.id, error: e.message });
    }

    const payment = order.payments.find((p) => p.paymentMethod === order.paymentMethod) || order.payments[0] || null;
    const summaryStatus = order.paymentStatus || payment?.paymentStatus || "PENDING";
    //tạo summary thanh toán
    const paymentSummary = (() => {
      if (!payment) {
        return {
          method: order.paymentMethod,//phương thức thanh toán
          status: order.paymentStatus || "PENDING",//trạng thái thanh toán
          paidAt: null//thời gian thanh toán
        };
      }
      //thanh toán cod
      if (order.paymentMethod === "COD") {
        const status =
          order.status === "DELIVERED"
            ? "PAID"
            : order.status === "CANCELLED"
              ? "FAILED"
              : "PENDING";
        return {
          method: "COD",
          status,
          paidAt: status === "PAID" ? (payment.paidAt || timeline.deliveredAt || null) : null,
          transactionId: payment.transactionId//mã giao dịch thanh toán
        };
      }
      if (order.paymentMethod === "VNPAY") {
        return {
          method: "VNPAY",
          status: summaryStatus,
          paidAt: payment.paidAt || null,
          transactionId: payment.transactionId || null,
          paymentUrl: payment.paymentUrl || null
        };
      }
      return {
        method: order.paymentMethod,
        status: summaryStatus,
        paidAt: payment.paidAt || null,
        transactionId: payment.transactionId || null,
        paymentUrl: payment.paymentUrl || null
      };
    })();

    return res.status(200).json({
      message: "Lấy chi tiết đơn hàng thành công",
      order: {
        ...order,
        shippingAddress: parsedShippingAddress, // Parse shippingAddress
        timeline,
        paymentSummary
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Hủy đơn (PENDING → CANCELLED) và hoàn trả tồn kho
export const cancelOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    if (!id || isNaN(id)) return res.status(400).json({ message: "ID đơn hàng không hợp lệ" });

    const order = await prisma.order.findFirst({
      where: { id: Number(id), userId },
      include: { orderItems: true }
    });
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    if (order.status !== "PENDING") return res.status(400).json({ message: "Chỉ có thể hủy đơn hàng đang chờ xử lý" });

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "CANCELLED",
          paymentStatus: order.paymentStatus === "PAID" ? "PAID" : "FAILED"
        }
      });

      // Lưu lịch sử thay đổi trạng thái
      await tx.orderStatusHistory.create({
        data: { orderId: order.id, status: "CANCELLED" }
      });

      // Chỉ cập nhật payment status cho COD
      if (order.paymentMethod === "COD") {
        await tx.payment.updateMany({
          where: { orderId: order.id },
          data: {
            paymentStatus: order.paymentStatus === "PAID" ? "PAID" : "FAILED",
            paidAt: order.paymentStatus === "PAID" ? order.paidAt || new Date() : null
          }
        });
      }

      // KHÔNG hoàn trả tồn kho vì đơn ở PENDING chưa trừ tồn kho
      // Tồn kho chỉ được trừ khi admin xác nhận đơn (CONFIRMED)
    });

    // Lấy thông tin đơn hàng đã cập nhật để emit socket
    const updatedOrder = await prisma.order.findUnique({
      where: { id: order.id },
      select: { id: true, orderNumber: true, status: true, userId: true }
    });

    // Gửi socket event để admin nhận được cập nhật real-time
    if (updatedOrder) {
      emitOrderStatusUpdate(updatedOrder.userId, {
        id: updatedOrder.id, // ⚠️ PHẢI LÀ 'id' (socket.js dùng orderData.id)
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        statusLabel: 'Đã hủy'
      });
    }

    return res.status(200).json({ message: "Hủy đơn hàng thành công" });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Xác nhận đã nhận hàng (PROCESSING → DELIVERED)
export const confirmReceivedOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    if (!id || isNaN(id)) return res.status(400).json({ message: "ID đơn hàng không hợp lệ" });

    const order = await prisma.order.findFirst({
      where: { id: Number(id), userId },
      select: {
        id: true,
        status: true,
        userId: true,
        paymentMethod: true, // Cần để tự động cập nhật paymentStatus cho COD
        paymentStatus: true  // Cần để kiểm tra trạng thái thanh toán hiện tại
      }
    });
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    if (order.status !== "PROCESSING") {
      return res.status(400).json({ message: "Chỉ xác nhận khi đơn đang ở trạng thái Đang xử lý" });
    }

    await prisma.$transaction(async (tx) => {
      // Nếu là đơn COD và user xác nhận đã nhận hàng → tự động set paymentStatus = PAID
      const updateData = { status: "DELIVERED" };
      if (order.paymentMethod === 'COD') {
        updateData.paymentStatus = 'PAID';
      }

      await tx.order.update({ where: { id: order.id }, data: updateData });
      await tx.orderStatusHistory.create({
        data: { orderId: order.id, status: "DELIVERED" }
      });
    });

    // Lấy thông tin đơn hàng đã cập nhật để emit socket
    const updatedOrder = await prisma.order.findUnique({
      where: { id: order.id },
      select: { id: true, orderNumber: true, status: true, userId: true }
    });

    // Gửi socket event để admin nhận được cập nhật real-time từ phía user
    if (updatedOrder) {
      emitOrderStatusUpdate(updatedOrder.userId, {
        id: updatedOrder.id, // ⚠️ PHẢI LÀ 'id' (socket.js dùng orderData.id)
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        statusLabel: 'Đã giao'
      });
    }

    return res.status(200).json({ message: "Đã xác nhận nhận hàng" });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};




