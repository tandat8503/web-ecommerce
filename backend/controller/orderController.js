import prisma from "../config/prisma.js";
import logger from '../utils/logger.js';
import { emitNewOrder } from '../config/socket.js';
import * as ghnService from '../services/shipping/ghnService.js';

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
    return `${userCode}${new Date().toISOString().slice(0,10).replace(/-/g,'')}${Date.now().toString().slice(-3)}`;
    
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

    // BƯỚC 3: Chuẩn hóa item và tính tiền
    let subtotal = 0;                 // tổng tiền hàng
    const orderItems = [];            // dữ liệu chi tiết đơn (phù hợp DB)
    const stockUpdates = [];          // danh sách cần trừ kho

    for (const item of cartItems) {
      // tồn kho: ưu tiên variant, 
      let stock = 0;
      if (item.variant?.stockQuantity !== undefined) {
        stock = item.variant.stockQuantity;//lấy tồn kho của variant
      } else {
        // Tính tổng stock từ tất cả variants active
        stock = item.product.variants?.reduce((sum, v) => sum + (v.stockQuantity || 0), 0) || 0;
      }
      
      if (item.quantity > stock) {
        return res.status(400).json({ message: `Sản phẩm "${item.product.name}" chỉ còn ${stock} sản phẩm` });
      }

      // đơn giá: chỉ lấy từ product (variant không có price)
      const unitPrice = Number(item.product.price);//đơn giá của sản phẩm
      const totalPrice = unitPrice * item.quantity; // tổng tiền của sản phẩm = đơn giá × số lượng
      //  tổng tiền tạm tính của đơn hàng: subtotal = subtotal tổng tiền của đơn hàng  hiện tại + tổng tiền sản phẩm
      subtotal = subtotal + totalPrice;//vd sp1: 100000, sp2: 200000, sp3: 300000 => subtotal = 100000 + 200000 + 300000 = 600000

      // thêm vào danh sách orderItems đúng cấu trúc DB
      orderItems.push({
        productId: item.productId,
        variantId: item.variantId ?? null,
        productName: item.product.name,
        productSku: item.product.slug, // Sử dụng slug thay vì SKU
        variantName: item.variant ? 
          `${item.variant.color || ''} ${item.variant.width ? `${item.variant.width}x${item.variant.depth}x${item.variant.height}mm` : ''}`.trim() 
          : null,
        quantity: item.quantity,//số lượng sản phẩm
        unitPrice,//đơn giá của sản phẩm
        totalPrice,//tổng tiền của sản phẩm
      });

      // ghi lại để trừ kho sau khi tạo đơn thành công
      stockUpdates.push({
        isVariant: !!item.variantId,//nếu có variantId thì là true, nếu không có thì là false
        id: item.variantId ?? item.productId,//nếu có variantId thì là variantId, nếu không có thì là productId
        currentStock: stock,//tồn kho hiện tại của sản phẩm
        quantity: item.quantity//số lượng sản phẩm
      });
    }

    // BƯỚC 4: Tính phí vận chuyển GHN (nếu có thông tin GHN)
    const discountAmount = 0; // bản cơ bản: chưa áp dụng giảm giá
    let shippingFee = 0;    // Mặc định phí ship 0
    
    // Tính phí vận chuyển GHN nếu có thông tin GHN trong địa chỉ
    let ghnDistrictId = null;
    let ghnWardCode = null;
    let ghnShopId = process.env.GHN_SHOP_ID || null;
    
    if (shippingAddress.ghnDistrictId && shippingAddress.ghnWardCode) {
      try {
        // Tính tổng trọng lượng từ items (mặc định 100g mỗi item nếu không có thông tin)
        const totalWeight = cartItems.reduce((sum, item) => {
          const itemWeight = item.variant?.weightCapacity 
            ? Number(item.variant.weightCapacity) * 1000 // Convert kg to gram
            : 100; // Mặc định 100g
          return sum + (itemWeight * item.quantity);
        }, 0);

        // Tính phí vận chuyển
        const feeData = await ghnService.calculateShippingFee({
          toDistrictId: shippingAddress.ghnDistrictId,
          toWardCode: shippingAddress.ghnWardCode,
          weight: totalWeight || 1000,
          insuranceValue: subtotal
        });

        shippingFee = feeData.totalFee || 0;
        ghnDistrictId = shippingAddress.ghnDistrictId;
        ghnWardCode = shippingAddress.ghnWardCode;
        
        logger.info('GHN: Tính phí vận chuyển thành công', {
          orderNumber: 'pending',
          shippingFee,
          totalWeight
        });
      } catch (ghnError) {
        // Nếu lỗi tính phí GHN, log nhưng vẫn tiếp tục với shippingFee = 0
        logger.warn('GHN: Không thể tính phí vận chuyển, sử dụng phí mặc định', {
          error: ghnError.message,
          addressId: shippingAddress.id
        });
      }
    } else {
      logger.info('GHN: Địa chỉ chưa có thông tin GHN, sử dụng phí vận chuyển mặc định');
    }

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
          customerNote,
          // Lưu thông tin GHN nếu có
          ghnDistrictId: ghnDistrictId ? parseInt(ghnDistrictId) : null,
          ghnWardCode: ghnWardCode || null,
          ghnShopId: ghnShopId || null,
          shippingMethod: (ghnDistrictId && ghnWardCode) ? 'GHN' : null
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

      // 6.4 Trừ tồn kho theo từng item
      for (const s of stockUpdates) {
        if (s.isVariant) {
          await tx.productVariant.update({ where: { id: s.id }, data: { stockQuantity: s.currentStock - s.quantity } });
        } else {
          // Nếu không có variant, không thể trừ stock vì product không có field stockQuantity
          // Trường hợp này không nên xảy ra vì đã kiểm tra ở trên
          logger.warn('Attempting to update product stock without variant', { productId: s.id });
        }
      }

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
        payments: true,
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
//thanh toán momo
      return {
        method: "MOMO",//phương thức thanh toán
        status: payment.paymentStatus || order.paymentStatus || "PENDING",//trạng thái thanh toán
        paidAt: payment.paidAt || null,//thời gian thanh toán
        transactionId: payment.transactionId || null,//mã giao dịch thanh toán
        paymentUrl: payment.paymentUrl || null//url thanh toán momo
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
      await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED", paymentStatus: "FAILED" } });

      // Lưu lịch sử thay đổi trạng thái
      await tx.orderStatusHistory.create({
        data: { orderId: order.id, status: "CANCELLED" }
      });
      
      // Chỉ cập nhật payment status cho COD (MoMo đã được xử lý trong paymentController.js)
      if (order.paymentMethod === "COD") {
        await tx.payment.updateMany({
          where: { orderId: order.id },
          data: {
            paymentStatus: "FAILED",
            paidAt: null
          }
        });
      }

      // Hoàn trả tồn kho (User chỉ được hủy khi PENDING)
      // Chỉ hoàn trả stock cho variant (product không có stockQuantity)
      for (const item of order.orderItems) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockQuantity: { increment: item.quantity } }
          });
        }
        // Nếu không có variantId, không thể hoàn trả stock vì product không có field stockQuantity
        // Trường hợp này không nên xảy ra vì đã bắt buộc chọn variant khi thêm vào giỏ
      }
    });

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

    const order = await prisma.order.findFirst({ where: { id: Number(id), userId } });
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    if (order.status !== "PROCESSING") {
      return res.status(400).json({ message: "Chỉ xác nhận khi đơn đang ở trạng thái Đang xử lý" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: order.id }, data: { status: "DELIVERED" } });
      await tx.orderStatusHistory.create({
        data: { orderId: order.id, status: "DELIVERED" }
      });
    });
    return res.status(200).json({ message: "Đã xác nhận nhận hàng" });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};




