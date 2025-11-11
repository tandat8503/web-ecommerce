import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';

//hàm lấy danh sách trạng thái có thể chọn tiếp theo (không cho chọn ngược)
// Logic: Mỗi trạng thái chỉ có thể chuyển sang các trạng thái phía sau, không thể quay lại
const getAvailableStatuses = (currentStatus) => {
  const orderTransitions = {
    PENDING: ["CONFIRMED", "CANCELLED"],        // Chờ xác nhận → Đã xác nhận hoặc Hủy
    CONFIRMED: ["PROCESSING", "CANCELLED"],     // Đã xác nhận → Đang giao hoặc Hủy (không thể quay về PENDING)
    PROCESSING: ["DELIVERED"],                  // Đang giao → Đã giao (không thể quay về CONFIRMED)
    DELIVERED: [],                              // Đã giao → Không thể thay đổi (trạng thái cuối cùng)
    CANCELLED: []                               // Đã hủy → Không thể thay đổi (trạng thái cuối cùng)
  };
  return orderTransitions[currentStatus] || [];
};

//hàm lấy label trạng thái dựa vào status của đơn hàng để hiển thị cho người dùng
const getStatusLabel = (status) => {
  const statusLabels = {
    PENDING: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    PROCESSING: "Đang giao",
    DELIVERED: "Đã giao",
    CANCELLED: "Đã hủy"
  };
  return statusLabels[status] || status;
};

//hàm hoàn trả tồn kho cho đơn hàng khi hủy đơn hàng
const restoreStockForOrder = async (tx, orderItems) => {
  for (const item of orderItems) {
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
};

//hàm lấy danh sách đơn hàng cho admin
export const listOrders = async (req, res) => {
  const context = { path: 'admin.orders.list' };
  try {
    logger.start(context.path, { query: req.query });
    
    const { page = 1, limit = 10, status, q } = req.query;
    
    const conditions = [];//điều kiện lọc đơn hàng
    if (status) conditions.push({ status });//điều kiện lọc theo trạng thái
    if (q) {//điều kiện lọc theo số đơn hàng hoặc tên khách hàng
      conditions.push({
        OR: [
          { orderNumber: { contains: q } },//điều kiện lọc theo số đơn hàng
          { user: { firstName: { contains: q } } },//điều kiện lọc theo tên khách hàng
          { user: { lastName: { contains: q } } }//điều kiện lọc theo họ khách hàng
        ]
      });
    }
    const where = conditions.length ? { AND: conditions } : undefined;//điều kiện lọc đơn hàng

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: {
          user: { select: { id: true, firstName: true, lastName: true, phone: true } },
          orderItems: {
            include: {
              product: { select: { id: true, name: true, imageUrl: true } }
            }
          }
        }
      }),
      prisma.order.count({ where })
    ]);

    // Format dữ liệu cho frontend dễ xử lý
    const formattedItems = items.map(order => ({
      ...order,
      statusLabel: getStatusLabel(order.status),
      availableStatuses: getAvailableStatuses(order.status).map(s => ({
        value: s,
        label: getStatusLabel(s)
      }))
    }));

    const payload = { 
      items: formattedItems, 
      total, //tổng số đơn hàng
      page: Number(page), //trang hiện tại
      limit: Number(limit) //số lượng đơn hàng trên mỗi trang
    };
    
    logger.success('Orders fetched', { total: payload.total, count: formattedItems.length });
    logger.end(context.path, { total: payload.total });
    return res.json(payload);
  } catch (error) {
    logger.error('Failed to fetch orders', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ message: 'Server error', error: process.env.NODE_ENV !== 'production' ? error.message : undefined });
  }
};
//hàm lấy chi tiết đơn hàng cho admin
export const getOrder = async (req, res) => {
  const context = { path: 'admin.orders.get' };
  try {
    logger.start(context.path, { id: req.params.id });
    
    const id = Number(req.params.id);
    
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true }
        },
        orderItems: {
          include: { 
            product: { select: { id: true, name: true, imageUrl: true, price: true } },
            variant: { 
              select: { 
                id: true, 
                width: true, 
                depth: true, 
                height: true, 
                color: true, 
                material: true 
              } 
            }
          }
        }
      }
    });

    if (!order) {
      logger.warn('Order not found', { id });
      return res.status(404).json({ message: 'Not found' });
    }

    // Format dữ liệu cho frontend dễ xử lý
    const formattedOrder = {
      ...order,
      statusLabel: getStatusLabel(order.status),
      availableStatuses: getAvailableStatuses(order.status).map(s => ({
        value: s,
        label: getStatusLabel(s)
      }))
    };

    logger.success('Order fetched', { id });
    logger.end(context.path, { id });
    return res.json(formattedOrder);
  } catch (error) {
    logger.error('Failed to fetch order', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ message: 'Server error', error: process.env.NODE_ENV !== 'production' ? error.message : undefined });
  }
};

//hàm cập nhật trạng thái đơn hàng (admin)
// Logic: Chỉ cho phép chuyển trạng thái tiến lên, không cho phép quay lại trạng thái cũ
export const updateOrder = async (req, res) => {
  const context = { path: 'admin.orders.update' };
  try {
    logger.start(context.path, { id: req.params.id, status: req.body.status });
    
    const id = Number(req.params.id);
    const { status } = req.body;

    // Validate: Trạng thái là bắt buộc
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    // Validate: Trạng thái phải thuộc enum OrderStatus
    const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Lấy đơn hàng hiện tại từ database
    const currentOrder = await prisma.order.findUnique({
      where: { id },
      select: { 
        status: true,
        orderItems: {
          include: {
            product: { select: { id: true, name: true, stockQuantity: true } },
            variant: { 
              select: { 
                id: true, 
                width: true, 
                depth: true, 
                height: true, 
                color: true, 
                stockQuantity: true 
              } 
            }
          }
        }
      }
    });

    if (!currentOrder) {
      logger.warn('Order not found', { id });
      return res.status(404).json({ message: 'đơn hàng không tồn tại' });
    }

    // Kiểm tra: Không cho phép cập nhật nếu đơn đã ở trạng thái cuối (DELIVERED hoặc CANCELLED)
    if (currentOrder.status === 'DELIVERED' || currentOrder.status === 'CANCELLED') {
      return res.status(400).json({ 
        message: `Không thể thay đổi trạng thái. Đơn hàng đã ở trạng thái: ${currentOrder.status}` 
      });
    }

    // Kiểm tra: Không cho phép chọn trạng thái hiện tại
    if (status === currentOrder.status) {
      return res.status(400).json({ 
        message: `đơn hàng đã ở trạng thái: ${currentOrder.status}` 
      });
    }

    // Kiểm tra: Chỉ cho phép chọn các trạng thái tiếp theo (không cho chọn ngược)
    const availableStatuses = getAvailableStatuses(currentOrder.status);
    if (!availableStatuses.includes(status)) {
      return res.status(400).json({ 
        message: `Không thể thay đổi trạng thái. Đơn hàng đã ở trạng thái: ${currentOrder.status}` 
      });
    }

    // Cập nhật trong transaction để đảm bảo tính toàn vẹn dữ liệu
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Cập nhật trạng thái đơn hàng
      const order = await tx.order.update({
        where: { id },
        data: { status }
      });

      // 2. Lưu lịch sử thay đổi trạng thái vào bảng OrderStatusHistory
      await tx.orderStatusHistory.create({
        data: { orderId: id, status }
      });

      // 3. Nếu hủy đơn → hoàn trả tồn kho cho các sản phẩm
      if (status === 'CANCELLED' && currentOrder.status !== 'CANCELLED') {
        await restoreStockForOrder(tx, currentOrder.orderItems);
      }

      return order;
    });

    logger.success('Order status updated', { 
      id: updated.id, 
      oldStatus: currentOrder.status, 
      newStatus: updated.status 
    });
    logger.end(context.path, { id: updated.id, status: updated.status });
    
    return res.json({
      id: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
      statusLabel: getStatusLabel(updated.status),
      message: `Order status updated from ${currentOrder.status} to ${updated.status}`
    });
  } catch (error) {
    logger.error('Failed to update order', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ message: 'Server error', error: process.env.NODE_ENV !== 'production' ? error.message : undefined });
  }
};


//hàm cập nhật ghi chú đơn hàng (admin)
export const updateOrderNotes = async (req, res) => {
  const context = { path: 'admin.orders.updateNotes' };
  try {
    logger.start(context.path, { id: req.params.id });
    
    const id = Number(req.params.id);
    const { notes } = req.body;

    const found = await prisma.order.findUnique({ where: { id } });
    if (!found) {
      logger.warn('Order not found', { id });
      return res.status(404).json({ message: 'Not found' });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { adminNote: notes || null }
    });

    logger.success('Order notes updated', { id: updated.id });
    logger.end(context.path, { id: updated.id });
    
    return res.json({
      id: updated.id,
      orderNumber: updated.orderNumber,
      adminNote: updated.adminNote
    });
  } catch (error) {
    logger.error('Failed to update order notes', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ message: 'Server error', error: process.env.NODE_ENV !== 'production' ? error.message : undefined });
  }
};

export const getOrderStats = async (req, res) => {
  const context = { path: 'admin.orders.stats' };
  try {
    logger.start(context.path, { period: req.query.period });
    
    const { period = '30d' } = req.query;
    
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
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const [
      totalOrders,
      totalRevenue,
      ordersByStatus,
      recentOrders,
      topProducts
    ] = await Promise.all([
      prisma.order.count({
        where: { createdAt: { gte: startDate } }
      }),
      prisma.order.aggregate({
        where: {
          createdAt: { gte: startDate },
          paymentStatus: 'PAID'
        },
        _sum: { totalAmount: true }
      }),
      prisma.order.groupBy({
        by: ['status'],
        where: { createdAt: { gte: startDate } },
        _count: { status: true }
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: startDate } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true }
          }
        }
      }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            createdAt: { gte: startDate },
            status: { not: 'CANCELLED' }
          }
        },
        _sum: { quantity: true },
        _count: { productId: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5
      })
    ]);

    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true, imageUrl: true, price: true }
        });
        return { ...item, product };
      })
    );

    const stats = {
      period,
      totalOrders,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      ordersByStatus: ordersByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {}),
      recentOrders,
      topProducts: topProductsWithDetails
    };

    logger.success('Order stats fetched', { 
      totalOrders, 
      totalRevenue: stats.totalRevenue,
      period 
    });
    logger.end(context.path, { totalOrders });
    
    return res.json(stats);
  } catch (error) {
    logger.error('Failed to fetch order stats', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ message: 'Server error', error: process.env.NODE_ENV !== 'production' ? error.message : undefined });
  }
};