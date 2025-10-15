// Import các thư viện cần thiết
import prisma from "../config/prisma.js"; // Prisma client để kết nối database

// =======================
// LẤY DANH SÁCH ĐƠN HÀNG VỚI PHÂN TRANG VÀ TÌM KIẾM (ADMIN)
// =======================
export const getOrders = async (req, res) => {
  // Tạo context object để log và debug
  const context = { path: 'admin.orders.list', query: req.query };
  try {
    console.log('START', context);
    
    // Lấy các tham số từ query string với giá trị mặc định
    const { page = 1, limit = 10, status, paymentStatus, q, userId } = req.query;
    
    // Xây dựng điều kiện WHERE động dựa trên các filter
    const and = []; // Mảng chứa các điều kiện AND
    if (status) and.push({ status }); // Lọc theo trạng thái đơn hàng
    if (paymentStatus) and.push({ paymentStatus }); // Lọc theo trạng thái thanh toán
    if (userId) and.push({ userId: Number(userId) }); // Lọc theo user ID
    if (q) {
      // Tìm kiếm theo tên user hoặc order number
      and.push({
        OR: [
          { orderNumber: { contains: q, mode: 'insensitive' } },
          { user: { firstName: { contains: q, mode: 'insensitive' } } },
          { user: { lastName: { contains: q, mode: 'insensitive' } } }
        ]
      });
    }
    const where = and.length ? { AND: and } : undefined; // Nếu có điều kiện thì tạo WHERE clause

    // Thực hiện 2 query song song để tối ưu performance
    const [items, total] = await Promise.all([
      // Query 1: Lấy danh sách đơn hàng với phân trang
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' }, // Sắp xếp theo thời gian tạo (mới nhất trước)
        skip: (Number(page) - 1) * Number(limit), // Bỏ qua các bản ghi của trang trước
        take: Number(limit), // Lấy đúng số lượng bản ghi của trang hiện tại
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true }
          },
          orderItems: {
            include: {
              product: { select: { id: true, name: true, imageUrl: true } },
              variant: { select: { id: true, name: true, sku: true } }
            }
          },
          payments: true,
          couponUsages: {
            include: { coupon: { select: { code: true, discountType: true, discountValue: true } } }
          }
        }
      }),
      // Query 2: Đếm tổng số đơn hàng thỏa mãn điều kiện
      prisma.order.count({ where })
    ]);

    // Tạo response payload với thông tin phân trang
    const payload = { items, total, page: Number(page), limit: Number(limit) };
    console.log('END', { ...context, total: payload.total });
    return res.json(payload);
  } catch (error) {
    // Xử lý lỗi và log
    console.error('ERROR', { ...context, error: error.message });
    const payload = { message: 'Server error' };
    // Chỉ hiển thị chi tiết lỗi trong môi trường development
    if (process.env.NODE_ENV !== 'production') payload.error = error.message;
    return res.status(500).json(payload);
  }
};

// =======================
// LẤY CHI TIẾT ĐƠN HÀNG (ADMIN)
// =======================
export const getOrderById = async (req, res) => {
  // Tạo context object để log và debug
  const context = { path: 'admin.orders.getById', params: req.params };
  try {
    console.log('START', context);
    
    // Lấy ID từ URL params và chuyển đổi sang number
    const { id } = req.params;
    
    // Tìm đơn hàng theo ID với đầy đủ thông tin liên quan
    const order = await prisma.order.findUnique({
      where: { id: Number(id) },
      include: {
        user: {
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            email: true, 
            phone: true,
            addresses: {
              where: { isDefault: true },
              select: { id: true, address: true, city: true, district: true, ward: true }
            }
          }
        },
        orderItems: {
          include: { 
            product: { 
              select: { 
                id: true, 
                name: true, 
                imageUrl: true, 
                price: true,
                category: { select: { name: true } },
                brand: { select: { name: true } }
              } 
            }, 
            variant: { 
              select: { 
                id: true, 
                name: true, 
                sku: true,
                price: true
              } 
            } 
          }
        },
        payments: {
          orderBy: { createdAt: 'desc' } // Sắp xếp theo thời gian tạo (mới nhất trước)
        },
        couponUsages: {
          include: { 
            coupon: { 
              select: { 
                code: true, 
                discountType: true, 
                discountValue: true,
                description: true
              } 
            } 
          }
        },
        reviews: {
          include: {
            user: { select: { firstName: true, lastName: true } }
          }
        }
      }
    });

    // Kiểm tra đơn hàng có tồn tại không
    if (!order) {
      console.warn('NOT_FOUND', context);
      return res.status(404).json({ message: 'Order not found' });
    }

    console.log('END', { ...context, id });
    return res.json(order);
  } catch (error) {
    // Xử lý lỗi và log
    console.error('ERROR', { ...context, error: error.message });
    const payload = { message: 'Server error' };
    if (process.env.NODE_ENV !== 'production') payload.error = error.message;
    return res.status(500).json(payload);
  }
};

// =======================
// CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG (ADMIN)
// =======================
export const updateOrderStatus = async (req, res) => {
  // Tạo context object để log và debug
  const context = { path: 'admin.orders.updateStatus', params: req.params, body: req.body };
  try {
    console.log('START', context);
    
    const { id } = req.params;
    const { status, paymentStatus, notes } = req.body;

    // LOGIC ĐẶC BIỆT: Định nghĩa luồng chuyển đổi trạng thái hợp lệ
    // Tuân thủ database schema nhưng bỏ qua SHIPPED vì web không có vận chuyển
    const orderTransitions = {
      PENDING: ["CONFIRMED", "CANCELLED"], // Chờ xác nhận → Xác nhận hoặc Hủy
      CONFIRMED: ["PROCESSING", "CANCELLED"], // Đã xác nhận → Đang xử lý hoặc Hủy
      PROCESSING: ["DELIVERED", "CANCELLED"], // Đang xử lý → Giao hàng hoặc Hủy (bỏ qua SHIPPED)
      SHIPPED: ["DELIVERED"], // Đã vận chuyển → Giao hàng (nếu có vận chuyển)
      DELIVERED: [], // Đã giao hàng → Không thể thay đổi nữa
      CANCELLED: [], // Đã hủy → Không thể thay đổi nữa
    };

    const paymentTransitions = {
      PENDING: ["PAID", "FAILED"], // Chờ thanh toán → Đã thanh toán hoặc Thất bại
      PAID: [], // Đã thanh toán → Không thể thay đổi nữa
      FAILED: ["PENDING"], // Thanh toán thất bại → Có thể thử lại
    };

    // Lấy đơn hàng hiện tại để kiểm tra trạng thái
    const currentOrder = await prisma.order.findUnique({
      where: { id: Number(id) },
      select: { 
        status: true, 
        paymentStatus: true,
        userId: true,
        orderItems: {
          include: {
            product: { select: { id: true, name: true, stockQuantity: true } }
          }
        }
      }
    });

    if (!currentOrder) {
      console.warn('ORDER_NOT_FOUND', context);
      return res.status(404).json({ message: 'Order not found' });
    }

    // LOGIC ĐẶC BIỆT: Kiểm tra logic chuyển trạng thái đơn hàng
    if (status && orderTransitions[currentOrder.status] && !orderTransitions[currentOrder.status].includes(status)) {
      console.warn('INVALID_ORDER_TRANSITION', { ...context, currentStatus: currentOrder.status, newStatus: status });
      return res.status(400).json({ 
        message: `Cannot change order status from ${currentOrder.status} to ${status}` 
      });
    }

    // LOGIC ĐẶC BIỆT: Kiểm tra logic chuyển trạng thái thanh toán
    if (paymentStatus && paymentTransitions[currentOrder.paymentStatus] && !paymentTransitions[currentOrder.paymentStatus].includes(paymentStatus)) {
      console.warn('INVALID_PAYMENT_TRANSITION', { ...context, currentPaymentStatus: currentOrder.paymentStatus, newPaymentStatus: paymentStatus });
      return res.status(400).json({ 
        message: `Cannot change payment status from ${currentOrder.paymentStatus} to ${paymentStatus}` 
      });
    }

    // LOGIC ĐẶC BIỆT: Khi hủy đơn hàng, cần cộng lại stock
    if (status === 'CANCELLED' && currentOrder.status !== 'CANCELLED') {
      console.log('RESTORING_STOCK_FOR_CANCELLED_ORDER', { ...context, orderId: id });
      
      // Cộng lại stock cho từng sản phẩm trong đơn hàng
      for (const item of currentOrder.orderItems) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              increment: item.quantity // Cộng lại số lượng đã trừ
            }
          }
        });
      }
    }

    // LOGIC ĐẶC BIỆT: Khi xác nhận đơn hàng, cần trừ stock
    if (status === 'CONFIRMED' && currentOrder.status === 'PENDING') {
      console.log('REDUCING_STOCK_FOR_CONFIRMED_ORDER', { ...context, orderId: id });
      
      // Kiểm tra stock có đủ không trước khi trừ
      for (const item of currentOrder.orderItems) {
        if (item.product.stockQuantity < item.quantity) {
          return res.status(400).json({ 
            message: `Insufficient stock for product ${item.product.name}. Available: ${item.product.stockQuantity}, Required: ${item.quantity}` 
          });
        }
      }
      
      // Trừ stock cho từng sản phẩm
      for (const item of currentOrder.orderItems) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              decrement: item.quantity // Trừ số lượng
            }
          }
        });
      }
    }

    // Cập nhật trạng thái đơn hàng với đúng field names theo database schema
    const updateData = {};
    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (notes) updateData.adminNote = notes; // Sử dụng adminNote thay vì adminNotes
    // updatedAt sẽ tự động cập nhật bởi Prisma @updatedAt

    const updatedOrder = await prisma.order.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true }
        },
        orderItems: {
          include: {
            product: { select: { id: true, name: true, imageUrl: true } },
            variant: { select: { id: true, name: true, sku: true } }
          }
        }
      }
    });

    console.log('END', { ...context, id, newStatus: status, newPaymentStatus: paymentStatus });
    return res.json(updatedOrder);
  } catch (error) {
    // Xử lý lỗi và log
    console.error('ERROR', { ...context, error: error.message });
    const payload = { message: 'Server error' };
    if (process.env.NODE_ENV !== 'production') payload.error = error.message;
    return res.status(500).json(payload);
  }
};

// =======================
// THỐNG KÊ ĐƠN HÀNG (ADMIN)
// =======================
export const getOrderStats = async (req, res) => {
  // Tạo context object để log và debug
  const context = { path: 'admin.orders.stats', query: req.query };
  try {
    console.log('START', context);
    
    const { period = '30d' } = req.query; // 7d, 30d, 90d, 1y
    
    // Tính toán ngày bắt đầu dựa trên period
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

    // Thực hiện các query thống kê song song
    const [
      totalOrders,
      totalRevenue,
      ordersByStatus,
      recentOrders,
      topProducts
    ] = await Promise.all([
      // Tổng số đơn hàng trong khoảng thời gian
      prisma.order.count({
        where: {
          createdAt: { gte: startDate }
        }
      }),
      
      // Tổng doanh thu trong khoảng thời gian
      prisma.order.aggregate({
        where: {
          createdAt: { gte: startDate },
          paymentStatus: 'PAID' // Chỉ tính đơn hàng đã thanh toán
        },
        _sum: { totalAmount: true }
      }),
      
      // Thống kê đơn hàng theo trạng thái
      prisma.order.groupBy({
        by: ['status'],
        where: {
          createdAt: { gte: startDate }
        },
        _count: { status: true }
      }),
      
      // 5 đơn hàng gần nhất
      prisma.order.findMany({
        where: {
          createdAt: { gte: startDate }
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true }
          }
        }
      }),
      
      // Top 5 sản phẩm bán chạy
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            createdAt: { gte: startDate },
            status: { not: 'CANCELLED' } // Không tính đơn hàng đã hủy
          }
        },
        _sum: { quantity: true },
        _count: { productId: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5
      })
    ]);

    // Lấy thông tin chi tiết của top products
    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true, imageUrl: true, price: true }
        });
        return {
          ...item,
          product
        };
      })
    );

    // Tạo response payload
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

    console.log('END', { ...context, totalOrders, totalRevenue: stats.totalRevenue });
    return res.json(stats);
  } catch (error) {
    // Xử lý lỗi và log
    console.error('ERROR', { ...context, error: error.message });
    const payload = { message: 'Server error' };
    if (process.env.NODE_ENV !== 'production') payload.error = error.message;
    return res.status(500).json(payload);
  }
};