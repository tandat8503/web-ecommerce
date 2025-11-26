import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';
import { emitOrderStatusUpdate } from '../config/socket.js';

/**
 * Helper: Convert status code sang label tiếng Việt
 */
const getStatusLabel = (status) => {
  const labels = {
    PENDING: 'Chờ xác nhận',
    CONFIRMED: 'Đã xác nhận',
    PROCESSING: 'Đang giao',
    DELIVERED: 'Đã giao',
    CANCELLED: 'Đã hủy'
  };
  return labels[status] || status;
};

/**
 * Lấy danh sách đơn hàng cho admin
 * - Phân trang: page, limit
 * - Lọc theo trạng thái: status
 * - Tìm kiếm: q (theo số đơn hàng hoặc tên khách hàng)
 */
export const listOrders = async (req, res) => {
  const context = { path: 'admin.orders.list' };
  try {
    logger.start(context.path, { query: req.query });
    
    // Lấy tham số từ query string
    const { page = 1, limit = 10, status, q } = req.query;
    
    // Xây dựng điều kiện lọc
    const conditions = [];
    if (status) conditions.push({ status }); // Lọc theo trạng thái
    if (q) {
      // Tìm kiếm theo số đơn hàng hoặc tên khách hàng
      conditions.push({
        OR: [
          { orderNumber: { contains: q } },
          { user: { firstName: { contains: q } } },
          { user: { lastName: { contains: q } } }
        ]
      });
    }
    const where = conditions.length ? { AND: conditions } : undefined;

    // Query đồng thời: lấy danh sách đơn và tổng số đơn
    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' }, // Sắp xếp mới nhất trước
        skip: (Number(page) - 1) * Number(limit), // Bỏ qua số đơn ở trang trước
        take: Number(limit), // Lấy số đơn mỗi trang
        include: {
          user: { select: { id: true, firstName: true, lastName: true, phone: true } },
          orderItems: {
            select: {
              id: true,
              productId: true,
              variantId: true,
              productName: true,
              productSku: true,
              variantName: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true
            }
          }
        }
      }),
      prisma.order.count({ where }) // Đếm tổng số đơn
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

    const payload = { items: itemsWithParsedAddress, total, page: Number(page), limit: Number(limit) };
    logger.success('Orders fetched', { total });
    logger.end(context.path, { total });
    return res.json(payload);
  } catch (error) {
    logger.error('Failed to fetch orders', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ 
      message: 'Server error', 
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined 
    });
  }
};

/**
 * Lấy chi tiết 1 đơn hàng
 * - Bao gồm: thông tin user, orderItems (có product, variant), payments, lịch sử trạng thái
 */
export const getOrder = async (req, res) => {
  const context = { path: 'admin.orders.get' };
  try {
    logger.start(context.path, { id: req.params.id });
    
    const id = Number(req.params.id);
    
    // Lấy order và orderItems riêng để xử lý trường hợp product/variant bị xóa
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        orderItems: true, // Lấy orderItems không include product/variant
        payments: true,
        statusHistory: { orderBy: { createdAt: 'asc' } }
      }
    });
    
    if (!order) {
      logger.warn('Order not found', { id });
      return res.status(404).json({ message: 'Not found' });
    }

    // Lấy product và variant cho từng orderItem (xử lý null)
    const orderItemsWithProducts = await Promise.all(
      order.orderItems.map(async (item) => {
        let product = null;
        let variant = null;

        // Lấy product nếu tồn tại
        if (item.productId) {
          try {
            product = await prisma.product.findUnique({
              where: { id: item.productId },
              select: { id: true, name: true, imageUrl: true, price: true }
            });
          } catch (err) {
            // Product không tồn tại, giữ null
            logger.warn('Product not found for orderItem', { productId: item.productId, orderItemId: item.id });
          }
        }

        // Lấy variant nếu tồn tại
        if (item.variantId) {
          try {
            variant = await prisma.productVariant.findUnique({
              where: { id: item.variantId },
              select: { id: true, name: true, price: true }
            });
          } catch (err) {
            // Variant không tồn tại, giữ null
            logger.warn('Variant not found for orderItem', { variantId: item.variantId, orderItemId: item.id });
          }
        }

        return {
          ...item,
          product,
          variant
        };
      })
    );

    // ✅ Parse shippingAddress từ JSON string thành object
    let parsedShippingAddress = order.shippingAddress;
    try {
      if (typeof order.shippingAddress === 'string') {
        parsedShippingAddress = JSON.parse(order.shippingAddress);
      }
    } catch (e) {
      logger.warn('Failed to parse shippingAddress', { orderId: order.id, error: e.message });
    }

    const orderWithSafeItems = {
      ...order,
      shippingAddress: parsedShippingAddress, // Parse shippingAddress
      orderItems: orderItemsWithProducts
    };
    
    logger.success('Order fetched', { id });
    logger.end(context.path, { id });
    return res.json(orderWithSafeItems);
  } catch (error) {
    logger.error('Failed to fetch order', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ 
      message: 'Server error', 
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined 
    });
  }
};

/**
 * Cập nhật trạng thái đơn hàng
 * - Chỉ cho phép chuyển trạng thái tiến lên: PENDING → CONFIRMED → PROCESSING → DELIVERED
 * - Không cho phép hủy đơn ở đây (phải dùng API cancelOrder riêng)
 * - Gửi WebSocket thông báo đến user
 */
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

    // Lấy thông tin đơn hàng hiện tại (bao gồm thông tin GHN và địa chỉ)
    const currentOrder = await prisma.order.findUnique({
      where: { id },
      select: { 
        status: true,
        userId: true, // Cần để gửi WebSocket
        orderNumber: true,
        shippingAddress: true,
        ghnDistrictId: true,
        ghnWardCode: true,
        ghnOrderCode: true,
        shippingMethod: true,
        orderItems: {
          include: {
            product: true,
            variant: true
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
      // 1. Cập nhật trạng thái đơn hàng
      const order = await tx.order.update({
        where: { id },
        data: { status }
      });

      // 2. Lưu lịch sử thay đổi trạng thái
      await tx.orderStatusHistory.create({
        data: { orderId: id, status }
      });

      return order;
    });

    // Tạo đơn vận chuyển GHN khi đơn hàng được xác nhận (CONFIRMED hoặc PROCESSING)
    // và chưa có đơn GHN
    if ((status === 'CONFIRMED' || status === 'PROCESSING') && 
        !currentOrder.ghnOrderCode && 
        currentOrder.ghnDistrictId && 
        currentOrder.ghnWardCode) {
      try {
        // Parse shipping address
        let shippingAddress = currentOrder.shippingAddress;
        if (typeof shippingAddress === 'string') {
          try {
            shippingAddress = JSON.parse(shippingAddress);
          } catch (e) {
            logger.warn('Failed to parse shipping address', { orderId: id });
          }
        }

        // Tính tổng trọng lượng
        const totalWeight = currentOrder.orderItems.reduce((sum, item) => {
          const itemWeight = item.variant?.weightCapacity 
            ? Number(item.variant.weightCapacity) * 1000 // Convert kg to gram
            : 100; // Mặc định 100g
          return sum + (itemWeight * item.quantity);
        }, 0);

        // Tính tổng giá trị
        const totalValue = currentOrder.orderItems.reduce((sum, item) => {
          return sum + (Number(item.unitPrice) * item.quantity);
        }, 0);

        // Tạo đơn vận chuyển GHN
        const ghnServiceModule = await import('../services/shipping/ghnService.js');
        const ghnResult = await ghnServiceModule.createShippingOrder({
          orderNumber: currentOrder.orderNumber,
          shippingAddress: shippingAddress || {},
          toDistrictId: currentOrder.ghnDistrictId,
          toWardCode: currentOrder.ghnWardCode,
          items: currentOrder.orderItems.map(item => ({
            name: item.productName,
            code: item.productSku,
            quantity: item.quantity,
            price: Number(item.unitPrice),
            weight: item.variant?.weightCapacity ? Number(item.variant.weightCapacity) * 1000 : 100
          })),
          totalWeight: totalWeight || 1000,
          totalValue: totalValue,
          codAmount: updated.paymentMethod === 'COD' ? Number(updated.totalAmount) : 0,
          note: `Đơn hàng ${currentOrder.orderNumber}`
        });

        // Cập nhật thông tin GHN vào đơn hàng
        await prisma.order.update({
          where: { id },
          data: {
            ghnOrderCode: ghnResult.ghnOrderCode,
            trackingCode: ghnResult.ghnOrderCode, // Dùng mã GHN làm tracking code
            ghnShopId: process.env.GHN_SHOP_ID || null
          }
        });

        logger.info('GHN: Tạo đơn vận chuyển thành công', {
          orderId: id,
          orderNumber: currentOrder.orderNumber,
          ghnOrderCode: ghnResult.ghnOrderCode
        });
      } catch (ghnError) {
        // Log lỗi nhưng không fail toàn bộ request
        logger.error('GHN: Lỗi tạo đơn vận chuyển', {
          orderId: id,
          error: ghnError.message,
          stack: ghnError.stack
        });
        // Có thể gửi thông báo cho admin về lỗi này
      }
    }

    // Gửi WebSocket thông báo đến user
    emitOrderStatusUpdate(currentOrder.userId, {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
      statusLabel: getStatusLabel(updated.status) // ✅ Thêm statusLabel
    });

    logger.success('Order status updated', { id, oldStatus: currentOrder.status, newStatus: updated.status });
    logger.end(context.path, { id });
    
    // Lấy lại đơn hàng với thông tin GHN đã cập nhật
    const finalOrder = await prisma.order.findUnique({
      where: { id }
    });
    
    return res.json(finalOrder);
  } catch (error) {
    logger.error('Failed to update order', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ 
      message: 'Server error', 
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined 
    });
  }
};

/**
 * Hủy đơn hàng (API riêng cho hủy đơn)
 * - Chỉ cho phép hủy đơn ở trạng thái PENDING hoặc CONFIRMED
 * - Tự động: hoàn trả tồn kho, cập nhật paymentStatus = FAILED
 * - Gửi WebSocket thông báo đến user
 * - Lưu ý: Nếu muốn cập nhật ghi chú khi hủy, gọi riêng API updateOrderNotes
 */
export const cancelOrder = async (req, res) => {
  const context = { path: 'admin.orders.cancel' };
  try {
    logger.start(context.path, { id: req.params.id });
    
    const id = Number(req.params.id);

    // Lấy thông tin đơn hàng hiện tại
    const currentOrder = await prisma.order.findUnique({
      where: { id },
      select: { 
        status: true,
        userId: true,
        ghnOrderCode: true, // Cần để hủy đơn GHN
        orderItems: {
          select: {
            productId: true,
            variantId: true,
            quantity: true
          }
        }
      }
    });

    if (!currentOrder) {
      logger.warn('Đơn hàng không tồn tại', { id });
      return res.status(404).json({ message: 'Đơn hàng không tồn tại' });
    }

    // Chỉ cho phép hủy đơn ở trạng thái PENDING hoặc CONFIRMED
    if (currentOrder.status !== 'PENDING' && currentOrder.status !== 'CONFIRMED') {
      return res.status(400).json({ 
        message: `Chỉ có thể hủy đơn hàng ở trạng thái PENDING hoặc CONFIRMED. Trạng thái hiện tại: ${currentOrder.status}` 
      });
    }

    // Cập nhật trong transaction
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Cập nhật trạng thái đơn hàng thành CANCELLED
      const order = await tx.order.update({
        where: { id },
        data: { 
          status: 'CANCELLED',
          paymentStatus: 'FAILED' // Cập nhật trạng thái thanh toán
        }
      });

      // 2. Lưu lịch sử thay đổi trạng thái
      await tx.orderStatusHistory.create({
        data: { orderId: id, status: 'CANCELLED' }
      });

      // 3. Hoàn trả tồn kho cho các sản phẩm (xử lý trường hợp product/variant đã bị xóa)
      for (const item of currentOrder.orderItems) {
        try {
          if (item.variantId) {
            // Kiểm tra variant có tồn tại không
            const variant = await tx.productVariant.findUnique({
              where: { id: item.variantId }
            });
            if (variant) {
              await tx.productVariant.update({
                where: { id: item.variantId },
                data: { stockQuantity: { increment: item.quantity } }
              });
            } else {
              logger.warn('Variant không tồn tại khi hoàn trả tồn kho', { variantId: item.variantId, orderItemId: item.id });
            }
          } else if (item.productId) {
            // Nếu không có variantId, không thể hoàn trả stock vì product không có field stockQuantity
            // Stock được quản lý ở variant level
            logger.warn('Không thể hoàn trả stock cho product không có variant', { 
              productId: item.productId, 
              orderItemId: item.id 
            });
          }
        } catch (err) {
          // Nếu có lỗi khi hoàn trả tồn kho, log warning nhưng vẫn tiếp tục
          logger.warn('Lỗi khi hoàn trả tồn kho', { 
            productId: item.productId, 
            variantId: item.variantId, 
            error: err.message 
          });
        }
      }

      return order;
    });

    // Hủy đơn vận chuyển GHN nếu có
    if (currentOrder.ghnOrderCode) {
      try {
        const ghnServiceModule = await import('../services/shipping/ghnService.js');
        await ghnServiceModule.cancelShippingOrder(currentOrder.ghnOrderCode);
        logger.info('Đã hủy đơn vận chuyển GHN', { 
          orderId: id, 
          ghnOrderCode: currentOrder.ghnOrderCode 
        });
      } catch (ghnError) {
        // Log lỗi nhưng không fail transaction vì đơn hàng đã được hủy
        logger.error('Lỗi khi hủy đơn vận chuyển GHN', {
          orderId: id,
          ghnOrderCode: currentOrder.ghnOrderCode,
          error: ghnError.message
        });
      }
    }

    // Gửi WebSocket thông báo đến user
    emitOrderStatusUpdate(currentOrder.userId, {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      status: 'CANCELLED',
      statusLabel: getStatusLabel('CANCELLED') // ✅ Thêm statusLabel
    });

    logger.success('Order cancelled', { id, oldStatus: currentOrder.status });
    logger.end(context.path, { id });
    return res.json({ 
      message: 'Hủy đơn hàng thành công',
      order: updated 
    });
  } catch (error) {
    logger.error('Failed to cancel order', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ 
      message: 'Lỗi server', 
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined 
    });
  }
};

/**
 * Cập nhật ghi chú admin cho đơn hàng
 * - Chỉ cập nhật adminNote, không thay đổi trạng thái
 */
export const updateOrderNotes = async (req, res) => {
  const context = { path: 'admin.orders.updateNotes' };
  try {
    logger.start(context.path, { id: req.params.id });
    
    const id = Number(req.params.id);
    const { notes } = req.body;

    // Kiểm tra đơn hàng có tồn tại không
    const found = await prisma.order.findUnique({ where: { id } });
    if (!found) {
      logger.warn('Order not found', { id });
      return res.status(404).json({ message: 'Not found' });
    }

    // Cập nhật ghi chú admin
    const updated = await prisma.order.update({
      where: { id },
      data: { adminNote: notes || null }
    });

    logger.success('Order notes updated', { id });
    logger.end(context.path, { id });
    return res.json(updated);
  } catch (error) {
    logger.error('Failed to update order notes', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ 
      message: 'Server error', 
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined 
    });
  }
};

/**
 * Lấy thống kê đơn hàng
 * - Thống kê theo khoảng thời gian: 7d, 30d, 90d, 1y
 * - Tổng số đơn, doanh thu, số đơn theo trạng thái
 */
export const getOrderStats = async (req, res) => {
  const context = { path: 'admin.orders.stats' };
  try {
    logger.start(context.path, { period: req.query.period });
    
    const { period = '30d' } = req.query;
    
    // Tính ngày bắt đầu dựa trên period
    const now = new Date();
    let startDate;
    switch (period) {
      case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      case '90d': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
      case '1y': startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break;
      default: startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Query đồng thời: tổng số đơn, doanh thu, số đơn theo trạng thái
    const [totalOrders, totalRevenue, ordersByStatus] = await Promise.all([
      // Đếm tổng số đơn trong khoảng thời gian
      prisma.order.count({ where: { createdAt: { gte: startDate } } }),
      // Tính tổng doanh thu (chỉ đơn đã thanh toán)
      prisma.order.aggregate({
        where: { createdAt: { gte: startDate }, paymentStatus: 'PAID' },
        _sum: { totalAmount: true }
      }),
      // Nhóm đơn theo trạng thái và đếm
      prisma.order.groupBy({
        by: ['status'],
        where: { createdAt: { gte: startDate } },
        _count: { status: true }
      })
    ]);

    // Format dữ liệu thống kê
    const stats = {
      period,
      totalOrders,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      ordersByStatus: ordersByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {})
    };

    logger.success('Order stats fetched', { totalOrders });
    logger.end(context.path, { totalOrders });
    return res.json(stats);
  } catch (error) {
    logger.error('Failed to fetch order stats', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ 
      message: 'Server error', 
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined 
    });
  }
};

