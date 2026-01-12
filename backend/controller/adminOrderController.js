import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';
import { emitOrderStatusUpdate } from '../config/socket.js';
import {
  sendOrderConfirmedEmail,
  sendOrderShippingEmail,
  sendOrderDeliveredEmail,
  sendOrderCancelledEmail
} from '../services/Email/EmailServices.js';

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
    const whereConditions = [];
    
    // Luôn filter để chỉ lấy orders có paymentMethod hợp lệ (COD hoặc VNPAY)
    // Tránh lỗi khi database có dữ liệu cũ với paymentMethod rỗng
    whereConditions.push({
      paymentMethod: {
        in: ['COD', 'VNPAY', 'TINGEE']
      }
    });
    
    // Lọc theo trạng thái (nếu có)
    if (status && status.trim() !== '') {
      const statusValue = status.trim().toUpperCase();
      // Validate status value
      const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'DELIVERED', 'CANCELLED'];
      if (validStatuses.includes(statusValue)) {
        whereConditions.push({ status: statusValue });
      }
    }
    
    // Tìm kiếm theo số đơn hàng hoặc tên khách hàng (nếu có)
    if (q && q.trim() !== '') {
      const searchTerm = q.trim();
      whereConditions.push({
        OR: [
          { orderNumber: { contains: searchTerm } },
          { user: { firstName: { contains: searchTerm } } },
          { user: { lastName: { contains: searchTerm } } }
        ]
      });
    }
    
    // Kết hợp tất cả điều kiện với AND
    const finalWhere = whereConditions.length > 0 
      ? (whereConditions.length === 1 ? whereConditions[0] : { AND: whereConditions })
      : undefined;
    
    // Log để debug (chỉ trong development)
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Order filter query', { 
        status, 
        q, 
        finalWhere: JSON.stringify(finalWhere, null, 2) 
      });
    }

    // Query đồng thời: lấy danh sách đơn và tổng số đơn
    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where: finalWhere,
        orderBy: { createdAt: 'desc' }, // Sắp xếp mới nhất trước
        skip: (Number(page) - 1) * Number(limit), // Bỏ qua số đơn ở trang trước
        take: Number(limit), // Lấy số đơn mỗi trang
        include: {
          user: { select: { id: true, firstName: true, lastName: true, phone: true } },
          payments: {
            where: {
              // Chỉ lấy payments có paymentMethod hợp lệ (COD hoặc VNPAY)
              // Loại bỏ những bản ghi có paymentMethod rỗng hoặc null
              paymentMethod: {
                in: ['COD', 'VNPAY', 'TINGEE']
              }
            },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              paymentMethod: true,
              paymentStatus: true,
              transactionId: true,
              bankCode: true,
              responseCode: true,
              paidAt: true
            }
          },
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
      prisma.order.count({ where: finalWhere }) // Đếm tổng số đơn
    ]);

    // đoạn code này để parse shippingAddress từ JSON string thành object cho mỗi order
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

    // Lấy bankCode từ payments (nếu có)
    let bankInfo = null;
    if (order.payments && order.payments.length > 0) {
      const payment = order.payments[0]; // Lấy payment đầu tiên
      if (payment.bankCode) {
        bankInfo = {
          bankCode: payment.bankCode
        };
      }
    }

    const orderWithSafeItems = {
      ...order,
      shippingAddress: parsedShippingAddress, // Parse shippingAddress
      orderItems: orderItemsWithProducts,
      bankInfo // Thêm thông tin bankCode từ payments
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

    // Lấy thông tin đơn hàng hiện tại
    const currentOrder = await prisma.order.findUnique({
      where: { id },
      select: { 
        status: true,
        userId: true, // Cần để gửi WebSocket
        paymentMethod: true, // Cần để tự động cập nhật paymentStatus cho COD
        paymentStatus: true, // Cần để kiểm tra trạng thái thanh toán hiện tại
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
//Admin không được nhảy các trạng thái không hợp lệ
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

        // Trừ tồn kho cho từng item,currentStock: số lượng sản phẩm hiện có trong kho
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
      // Nếu chuyển sang DELIVERED và là đơn COD → tự động set paymentStatus = PAID
      const updateData = { status };
      if (status === 'DELIVERED' && currentOrder.paymentMethod === 'COD') {
        updateData.paymentStatus = 'PAID';
        logger.info('Tự động cập nhật paymentStatus = PAID cho đơn COD đã giao', { orderId: id });
      }
      
      const order = await tx.order.update({
        where: { id },
        data: updateData
      });

      // 3. Lưu lịch sử thay đổi trạng thái
      await tx.orderStatusHistory.create({
        data: { orderId: id, status }
      });

      return order;
    });

    // Gửi WebSocket thông báo đến user
    emitOrderStatusUpdate(currentOrder.userId, {
      id: updated.id, // ⚠️ PHẢI LÀ 'id' chứ không phải 'orderId' (socket.js dùng orderData.id)
      orderNumber: updated.orderNumber,
      status: updated.status,
      statusLabel: getStatusLabel(updated.status) // ✅ Thêm statusLabel
    });

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
      }
    } catch (emailError) {
      // Nếu lỗi khi gửi email, log nhưng không ảnh hưởng đến response
      logger.warn('Failed to send order status email', {
        orderId: id,
        status,
        error: emailError.message
      });
    }

    logger.success('Order status updated', { id, oldStatus: currentOrder.status, newStatus: updated.status });
    logger.end(context.path, { id });
    return res.json(updated);
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
        paymentStatus: true,
        userId: true,
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
          paymentStatus: currentOrder.paymentStatus === 'PAID' ? 'PAID' : 'FAILED' // Giữ PAID nếu đã thanh toán thành công
        }
      });

      // 2. Lưu lịch sử thay đổi trạng thái
      await tx.orderStatusHistory.create({
        data: { orderId: id, status: 'CANCELLED' }
      });

      // 3. Hoàn trả tồn kho chỉ khi đơn đã ở CONFIRMED (đã trừ tồn kho)
      // Nếu đơn ở PENDING (chưa trừ tồn kho), không cần hoàn trả
      if (currentOrder.status === 'CONFIRMED') {
        const orderItems = await tx.orderItem.findMany({
          where: { orderId: id },
          include: {
            variant: {
              select: { id: true }
            }
          }
        });

        for (const item of orderItems) {
          if (item.variantId && item.variant) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stockQuantity: { increment: item.quantity } }
            });
            logger.info('Hoàn trả tồn kho khi hủy đơn', { 
              variantId: item.variantId, 
              quantity: item.quantity 
            });
          }
        }
      }

      return order;
    });

    // Gửi WebSocket thông báo đến user
    emitOrderStatusUpdate(currentOrder.userId, {
      id: updated.id, // ⚠️ PHẢI LÀ 'id' chứ không phải 'orderId' (socket.js dùng orderData.id)
      orderNumber: updated.orderNumber,
      status: 'CANCELLED',
      statusLabel: getStatusLabel('CANCELLED') // ✅ Thêm statusLabel
    });

    // Gửi email thông báo hủy đơn cho user
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

        // Lấy lý do hủy từ request body (nếu có)
        const reason = req.body.reason || 'Đơn hàng đã bị hủy bởi quản trị viên.';

        await sendOrderCancelledEmail({
          email: orderForEmail.user.email,
          order: orderData,
          reason: reason
        });
        logger.info('Order cancelled email sent', { orderId: id, email: orderForEmail.user.email });
      }
    } catch (emailError) {
      // Nếu lỗi khi gửi email, log nhưng không ảnh hưởng đến response
      logger.warn('Failed to send order cancelled email', {
        orderId: id,
        error: emailError.message
      });
    }

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
 * - Thống kê theo khoảng thời gian: 7d, 30d, 90d, 1y, all
 * - Tổng số đơn, doanh thu
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
      case 'all': startDate = null; break; // Lấy toàn bộ đơn hàng
      default: startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Query đồng thời: tổng số đơn, doanh thu
    const whereCondition = startDate ? { createdAt: { gte: startDate } } : {};
    const whereConditionPaid = startDate 
      ? { createdAt: { gte: startDate }, paymentStatus: 'PAID' }
      : { paymentStatus: 'PAID' };
    
    const [totalOrders, totalRevenue] = await Promise.all([
      // Đếm tổng số đơn trong khoảng thời gian (hoặc toàn bộ nếu period = 'all')
      prisma.order.count({ where: whereCondition }),
      // Tính tổng doanh thu (chỉ đơn đã thanh toán)
      prisma.order.aggregate({
        where: whereConditionPaid,
        _sum: { totalAmount: true }
      })
    ]);

    // Format dữ liệu thống kê
    const stats = {
      period, // thời gian đơn hàng hiện
      totalOrders, // tổng số đơn
      totalRevenue: totalRevenue._sum.totalAmount || 0, // tổng doanh thu
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

/**
 * Lấy thống kê doanh thu theo danh mục sản phẩm (dùng để vẽ Rose Chart)
 * 
 * Query params:
 * - period: Khoảng thời gian thống kê (mặc định: '30d')
 *   + '7d': 7 ngày gần nhất
 *   + '30d': 30 ngày gần nhất (khuyến nghị)
 *   + '90d': 90 ngày gần nhất (3 tháng)
 *   + '1y': 1 năm gần nhất
 *   + 'all': Toàn bộ lịch sử
 * 
 * Response: { data: [{ category: "Tên danh mục", revenue: 1000000 }, ...] }
 * - category: Tên danh mục sản phẩm (vd: "Ghế văn phòng", "Bàn làm việc")
 * - revenue: Tổng doanh thu của danh mục đó (VNĐ)
 * - Dữ liệu đã sắp xếp theo revenue giảm dần (bán chạy nhất trước)
 */
export const getRevenueByCategory = async (req, res) => {
  const context = { path: 'admin.orders.revenueByCategory' };
  try {
    logger.start(context.path, { period: req.query.period });

    const { period = '30d' } = req.query; // Mặc định lấy 30 ngày gần nhất

    // BƯỚC 1: Tính ngày bắt đầu dựa theo period
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '7d':  // 7 ngày gần nhất (tuần này)
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); 
        break;
      case '30d': // 30 ngày gần nhất (tháng này) - KHUYẾN NGHỊ
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); 
        break;
      case '90d': // 90 ngày gần nhất (quý này)
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); 
        break;
      case '1y':  // 1 năm gần nhất
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); 
        break;
      case 'all': // Toàn bộ lịch sử (từ khi shop hoạt động)
        startDate = null; 
        break;
      default:    // Nếu không truyền gì, mặc định 30 ngày
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // BƯỚC 2: Tạo điều kiện where cho query
    const whereCondition = startDate 
      ? { createdAt: { gte: startDate }, paymentStatus: 'PAID' } // Lấy đơn từ startDate đến hiện tại
      : { paymentStatus: 'PAID' };                               // Lấy toàn bộ (nếu period = 'all')

    // BƯỚC 3: Lấy tất cả đơn hàng đã thanh toán trong khoảng thời gian
    // Chỉ lấy thông tin cần thiết: orderItems -> product -> category.name
    const paidOrders = await prisma.order.findMany({
      where: whereCondition,
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                category: { select: { name: true } } // Chỉ lấy tên danh mục
              }
            }
          }
        }
      }
    });

    // BƯỚC 4: Gom doanh thu theo danh mục
    // Dùng Map để cộng dồn doanh thu của cùng 1 danh mục
    const revenueMap = new Map();

    for (const order of paidOrders) {//lấy tất cả đơn hàng đã thanh toán trong khoảng thời gian
      for (const item of order.orderItems) {//lấy tất cả các sản phẩm trong đơn hàng
        // Chỉ tính những item có sản phẩm và danh mục (bỏ qua sản phẩm đã xóa)
        if (item.product?.category) {//nếu sản phẩm có danh mục
          const categoryName = item.product.category.name;//lấy tên danh mục
          const itemRevenue = Number(item.totalPrice) || 0; //lấy tổng số tiền của sản phẩm trong bảng orderItem
          
          // Cộng dồn vào tổng doanh thu của danh mục
          const currentRevenue = revenueMap.get(categoryName) || 0;
          //đơn đầu tiên thì currentRevenue = 0, itemRevenue là tổng số tiền của sản phẩm trong bảng orderItem
          revenueMap.set(categoryName, currentRevenue + itemRevenue);
        }
      }
    }

    // BƯỚC 5: Chuyển Map thành mảng và sắp xếp ,
// entries là phương thức của Map trả về một mảng các mảng con, mỗi mảng con là một cặp key-value
    const data = Array.from(revenueMap.entries())
      .map(([category, revenue]) => ({ 
        category,  // Tên danh mục (dùng cho xField trong Rose chart)
        revenue    // Doanh thu (dùng cho yField trong Rose chart)
      }))
      .sort((a, b) => b.revenue - a.revenue); // Sắp xếp giảm dần (bán chạy nhất trước)

    // BƯỚC 6: Trả về kết quả
    logger.success('Revenue by category fetched', { categories: data.length });
    logger.end(context.path, { categories: data.length });
    return res.json({ data });

  } catch (error) {
    logger.error('Failed to fetch revenue by category', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      message: 'Lỗi khi lấy thống kê doanh thu theo danh mục',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

/**
 * Lấy thống kê sản phẩm bán chạy nhất
 * 
 * Query params:
 * - period: Khoảng thời gian thống kê (mặc định: '30d')
 * - limit: Số lượng sản phẩm top (mặc định: 5)
 * 
 * Response: { data: [{ productName, totalQuantity }, ...] }
 * - productName: Tên sản phẩm
 * - totalQuantity: Tổng số lượng bán được
 */
export const getTopProducts = async (req, res) => {
  const context = { path: 'admin.orders.topProducts' };
  try {
    logger.start(context.path, { period: req.query.period, limit: req.query.limit });

    const { period = '30d', limit = 10 } = req.query;

    // BƯỚC 1: Tính ngày bắt đầu dựa theo period
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startDate = null;
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // BƯỚC 2: Tạo điều kiện where cho query
    const baseCondition = startDate ? { createdAt: { gte: startDate } } : {};
    const whereCondition = {//điều kiện lấy đơn hàng
      ...baseCondition,//điều kiện thời gian
      OR: [
        { paymentStatus: 'PAID' },//đơn hàng đã thanh toán thành công bằng VNPay
        { 
          AND: [
            { status: 'DELIVERED' },//đơn hàng đã giao thành công
            { paymentMethod: 'COD' }//đơn hàng đã thanh toán thành công bằng COD
          ]
        }
      ]
    };

    // BƯỚC 3: Lấy tất cả orderItems từ các đơn hàng đã thanh toán
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: whereCondition//điều kiện lấy đơn hàng
      },
      select: {
        productId: true,//id sản phẩm
        quantity: true,//số lượng sản phẩm
      }
    });

    // BƯỚC 4: Gom thống kê theo productId ,cộng dồn số lượng sản phẩm đã bán
    const productMap = new Map();//tạo map để lưu trữ số lượng sản phẩm đã bán

    for (const item of orderItems) {//lấy tất cả orderItems từ các đơn hàng đã thanh toán
      const productId = item.productId;//lấy id sản phẩm
      const current = productMap.get(productId) || 0;//lấy tổng số lượng sản phẩm đã bán, nếu không có thì đặt giá trị 0
      productMap.set(productId, current + item.quantity);//cộng dồn tổng số lượng sản phẩm đã bán
    }

    // BƯỚC 5: Chuyển Map thành mảng và sắp xếp
    const topProducts = Array.from(productMap.entries())
      .map(([productId, totalQuantity]) => ({ productId, totalQuantity }))//chuyển map thành mảng, mỗi mảng con là một cặp key-value
      .sort((a, b) => b.totalQuantity - a.totalQuantity)//sắp xếp theo số lượng sản phẩm đã bán giảm dần số lượng bán nhiều nhất sẽ ở đầu mảng
      .slice(0, Number(limit));//lấy top limit sản phẩm bán chạy nhất

    // BƯỚC 6: Lấy tên sản phẩm (chỉ lấy sản phẩm đang ACTIVE)
    const productIds = topProducts.map(p => p.productId);//lấy id sản phẩm
    const products = await prisma.product.findMany({
      where: { 
        id: { in: productIds },
        status: 'ACTIVE' // Chỉ lấy sản phẩm đang hoạt động
      },
      select: { id: true, name: true },
    });

    // BƯỚC 7: Map productId -> tên sản phẩm
    const productNameMap = new Map(products.map(p => [p.id, p.name]));

    // BƯỚC 8: Format dữ liệu trả về (chỉ tên và số lượng)
    // Chỉ lấy những sản phẩm thực sự tồn tại (có tên trong database)
    const data = topProducts
      .map(item => ({
        productName: productNameMap.get(item.productId),//lấy tên sản phẩm
        totalQuantity: item.totalQuantity,//số lượng sản phẩm đã bán
      }))
      .filter(item => item.productName); // Loại bỏ sản phẩm không tồn tại (undefined/null)

    logger.success('Lấy thống kê sản phẩm bán chạy nhất thành công', { count: data.length });
    logger.end(context.path, { count: data.length });
    return res.json({ data });//trả về dữ liệu thống kê sản phẩm bán chạy nhất

  } catch (error) {
    logger.error('Lỗi khi lấy thống kê sản phẩm bán chạy nhất', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      message: 'Lỗi khi lấy thống kê sản phẩm bán chạy',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};


