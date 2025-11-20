import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';

/**
 * ===========================
 * Helper: Kiểm tra user có order DELIVERED chứa sản phẩm
 * ===========================
 */
const checkUserHasDeliveredOrder = async (userId, productId, orderId = null) => {
  if (orderId) {
    // Nếu có orderId, kiểm tra order đó có hợp lệ không
    const order = await prisma.order.findFirst({
      where: {
        id: Number(orderId),
        userId,
        status: 'DELIVERED'
      },
      include: {
        orderItems: {
          where: { productId: Number(productId) }
        }
      }
    });

    if (order && order.orderItems.length > 0) {
      return { isValid: true, orderId: order.id };
    }
    return { isValid: false, orderId: null };
  } else {
    // Nếu không có orderId, tìm order DELIVERED bất kỳ chứa sản phẩm
    const order = await prisma.order.findFirst({
      where: {
        userId,
        status: 'DELIVERED',
        orderItems: {
          some: {
            productId: Number(productId)
          }
        }
      },
      select: { id: true }
    });

    if (order) {
      return { isValid: true, orderId: order.id };
    }
    return { isValid: false, orderId: null };
  }
};

/**
 * ===========================
 * USER: Tạo đánh giá sản phẩm
 * ===========================
 * ⭐ YÊU CẦU: User phải có order DELIVERED chứa sản phẩm này
 * ⭐ Logic: Kiểm tra orderId hoặc tìm order DELIVERED của user
 */
export const createReview = async (req, res) => {
  const context = { path: 'user.productReview.create' };
  try {
    logger.start(context.path, { 
      userId: req.user.id, 
      productId: req.body.productId,
      orderId: req.body.orderId
    });

    const userId = req.user.id;
    const { productId, rating, title, comment, orderId } = req.body;

    // Validate input
    if (!productId || !rating) {
      logger.warn('Missing required fields', { productId, rating });
      return res.status(400).json({ 
        message: 'Vui lòng cung cấp đầy đủ thông tin (productId, rating)' 
      });
    }

    if (rating < 1 || rating > 5) {
      logger.warn('Invalid rating', { rating });
      return res.status(400).json({ 
        message: 'Đánh giá phải từ 1 đến 5 sao' 
      });
    }

    // Kiểm tra sản phẩm có tồn tại không
    const product = await prisma.product.findUnique({
      where: { id: Number(productId) },
      select: { id: true, name: true }
    });

    if (!product) {
      logger.warn('Product not found', { productId });
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }

    // ⭐ LOGIC ĐẶC BIỆT: Kiểm tra user có order DELIVERED chứa sản phẩm này
    const orderCheck = await checkUserHasDeliveredOrder(userId, productId, orderId);
    
    if (!orderCheck.isValid) {
      logger.warn('User does not have delivered order for product', { 
        userId, 
        productId, 
        orderId 
      });
      return res.status(403).json({ 
        message: 'Bạn chỉ có thể đánh giá sản phẩm sau khi đã nhận hàng (đơn hàng phải ở trạng thái Đã giao)' 
      });
    }

    // Kiểm tra user đã đánh giá sản phẩm này chưa
    const existingReview = await prisma.productReview.findUnique({
      where: {
        productId_userId: {
          productId: Number(productId),
          userId
        }
      }
    });

    if (existingReview) {
      logger.warn('Review already exists', { productId, userId });
      return res.status(400).json({ 
        message: 'Bạn đã đánh giá sản phẩm này rồi. Bạn có thể chỉnh sửa đánh giá của mình.' 
      });
    }

    // Tạo đánh giá với isVerified = true (vì đã kiểm tra order DELIVERED)
    const review = await prisma.productReview.create({
      data: {
        userId,
        productId: Number(productId),
        orderId: orderCheck.orderId, // Sử dụng orderId từ check
        rating: Number(rating),
        title: title?.trim() || null,
        comment: comment?.trim() || null,
        isApproved: true, // Tự động approve
        isVerified: true // ✅ Verified vì có order DELIVERED
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            imageUrl: true
          }
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true
          }
        }
      }
    });

    logger.success('Review created', { 
      reviewId: review.id, 
      productId, 
      userId,
      rating,
      orderId: review.orderId,
      isVerified: review.isVerified
    });
    logger.end(context.path, { reviewId: review.id });

    return res.status(201).json({
      message: 'Đánh giá đã được đăng thành công',
      data: review
    });

  } catch (error) {
    logger.error('Failed to create review', {
      path: context.path,
      userId: req.user?.id,
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
 * ===========================
 * PUBLIC: Lấy danh sách đánh giá của sản phẩm
 * ===========================
 * Hiển thị tất cả reviews đã được approve
 * Hỗ trợ phân trang và filter theo rating
 */
export const getProductReviews = async (req, res) => {
  const context = { path: 'public.productReview.list' };
  try {
    logger.start(context.path, { productId: req.params.productId });

    const { productId } = req.params;
    const { page = 1, limit = 10, rating } = req.query;

    // Kiểm tra sản phẩm có tồn tại không
    const product = await prisma.product.findUnique({
      where: { id: Number(productId) },
      select: { id: true }
    });

    if (!product) {
      logger.warn('Product not found', { productId });
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }

    // Xây dựng điều kiện where
    const where = {
      productId: Number(productId),
      isApproved: true // Chỉ lấy reviews đã được approve
    };

    if (rating) {
      where.rating = Number(rating);
    }

    // Lấy reviews và thống kê
    const [reviews, total, stats] = await Promise.all([
      prisma.productReview.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          }
        },
        orderBy: [
          { isVerified: 'desc' }, // Verified reviews lên đầu
          { createdAt: 'desc' }
        ],
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      }),
      prisma.productReview.count({ where }),
      // Tính thống kê rating
      prisma.productReview.groupBy({
        by: ['rating'],
        where: {
          productId: Number(productId),
          isApproved: true
        },
        _count: {
          rating: true
        }
      })
    ]);

    // Tính rating trung bình
    const allReviews = await prisma.productReview.findMany({
      where: {
        productId: Number(productId),
        isApproved: true
      },
      select: { rating: true }
    });

    const averageRating = allReviews.length > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      : 0;

    const ratingDistribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0
    };

    stats.forEach(stat => {
      ratingDistribution[stat.rating] = stat._count.rating;
    });

    logger.success('Product reviews fetched', { 
      productId, 
      total, 
      count: reviews.length,
      averageRating: averageRating.toFixed(2)
    });
    logger.end(context.path, { total });

    return res.json({
      message: 'Lấy danh sách đánh giá thành công',
      data: {
        reviews,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        },
        summary: {
          averageRating: Number(averageRating.toFixed(2)),
          totalReviews: allReviews.length,
          ratingDistribution
        }
      }
    });

  } catch (error) {
    logger.error('Failed to fetch product reviews', {
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
 * ===========================
 * USER: Lấy đánh giá của chính mình
 * ===========================
 */
export const getMyReviews = async (req, res) => {
  const context = { path: 'user.productReview.my' };
  try {
    logger.start(context.path, { userId: req.user.id });

    const userId = req.user.id;
    const { page = 1, limit = 10, productId } = req.query;

    const where = { userId };
    if (productId) {
      where.productId = Number(productId);
    }

    const [reviews, total] = await Promise.all([
      prisma.productReview.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              imageUrl: true
            }
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      }),
      prisma.productReview.count({ where })
    ]);

    logger.success('My reviews fetched', { userId, total, count: reviews.length });
    logger.end(context.path, { total });

    return res.json({
      message: 'Lấy danh sách đánh giá của bạn thành công',
      data: {
        reviews,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });

  } catch (error) {
    logger.error('Failed to fetch my reviews', {
      path: context.path,
      userId: req.user?.id,
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
 * ===========================
 * USER: Cập nhật đánh giá của mình
 * ===========================
 */
export const updateMyReview = async (req, res) => {
  const context = { path: 'user.productReview.update' };
  try {
    logger.start(context.path, { 
      userId: req.user.id, 
      reviewId: req.params.id 
    });

    const userId = req.user.id;
    const { id } = req.params;
    const { rating, title, comment } = req.body;

    // Validate rating nếu có
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      logger.warn('Invalid rating', { rating });
      return res.status(400).json({ 
        message: 'Đánh giá phải từ 1 đến 5 sao' 
      });
    }

    // Kiểm tra review có tồn tại và thuộc về user không
    const review = await prisma.productReview.findFirst({
      where: {
        id: Number(id),
        userId
      }
    });

    if (!review) {
      logger.warn('Review not found or unauthorized', { reviewId: id, userId });
      return res.status(404).json({ 
        message: 'Không tìm thấy đánh giá hoặc bạn không có quyền chỉnh sửa' 
      });
    }

    // Cập nhật
    const updated = await prisma.productReview.update({
      where: { id: Number(id) },
      data: { 
        rating: rating !== undefined ? Number(rating) : undefined,
        title: title !== undefined ? (title?.trim() || null) : undefined,
        comment: comment !== undefined ? (comment?.trim() || null) : undefined,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            imageUrl: true
          }
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true
          }
        }
      }
    });

    logger.success('Review updated', { reviewId: id, userId });
    logger.end(context.path, { reviewId: id });

    return res.json({
      message: 'Cập nhật đánh giá thành công',
      data: updated
    });

  } catch (error) {
    logger.error('Failed to update review', {
      path: context.path,
      userId: req.user?.id,
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
 * ===========================
 * USER: Xóa đánh giá của mình
 * ===========================
 */
export const deleteMyReview = async (req, res) => {
  const context = { path: 'user.productReview.delete' };
  try {
    logger.start(context.path, { 
      userId: req.user.id, 
      reviewId: req.params.id 
    });

    const userId = req.user.id;
    const { id } = req.params;

    // Kiểm tra review có tồn tại và thuộc về user không
    const review = await prisma.productReview.findFirst({
      where: {
        id: Number(id),
        userId
      }
    });

    if (!review) {
      logger.warn('Review not found or unauthorized', { reviewId: id, userId });
      return res.status(404).json({ 
        message: 'Không tìm thấy đánh giá hoặc bạn không có quyền xóa' 
      });
    }

    // Xóa review
    await prisma.productReview.delete({
      where: { id: Number(id) }
    });

    logger.success('Review deleted', { reviewId: id, userId });
    logger.end(context.path, { reviewId: id });

    return res.json({
      message: 'Xóa đánh giá thành công'
    });

  } catch (error) {
    logger.error('Failed to delete review', {
      path: context.path,
      userId: req.user?.id,
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
 * ===========================
 * ADMIN: Lấy tất cả đánh giá (có filter)
 * ===========================
 */
export const adminGetAllReviews = async (req, res) => {
  const context = { path: 'admin.productReview.list' };
  try {
    logger.start(context.path, { 
      query: req.query,
      admin: req.user.id 
    });

    const { 
      page = 1, 
      limit = 10, 
      productId, 
      isApproved,
      rating,
      q 
    } = req.query;

    // Xây dựng điều kiện where
    const where = {};

    if (productId) {
      where.productId = Number(productId);
    }

    if (isApproved !== undefined) {
      where.isApproved = isApproved === 'true';
    }

    if (rating) {
      where.rating = Number(rating);
    }

    if (q) {
      where.OR = [
        { title: { contains: q } },
        { comment: { contains: q } },
        { user: { firstName: { contains: q } } },
        { user: { lastName: { contains: q } } }
      ];
    }

    const [reviews, total] = await Promise.all([
      prisma.productReview.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true
            }
          },
          product: {
            select: {
              id: true,
              name: true,
              imageUrl: true
            }
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      }),
      prisma.productReview.count({ where })
    ]);

    logger.success('Admin reviews fetched', { total, count: reviews.length });
    logger.end(context.path, { total });

    return res.json({
      message: 'Lấy danh sách đánh giá thành công',
      data: {
        items: reviews,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });

  } catch (error) {
    logger.error('Failed to fetch all reviews', {
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
 * ===========================
 * ADMIN: Approve/Reject đánh giá
 * ===========================
 */
export const adminApproveReview = async (req, res) => {
  const context = { path: 'admin.productReview.approve' };
  try {
    logger.start(context.path, { 
      reviewId: req.params.id,
      admin: req.user.id,
      isApproved: req.body.isApproved
    });

    const { id } = req.params;
    const { isApproved } = req.body;

    if (isApproved === undefined) {
      logger.warn('Missing isApproved field');
      return res.status(400).json({ 
        message: 'Vui lòng cung cấp trạng thái duyệt (isApproved: true/false)' 
      });
    }

    // Kiểm tra review có tồn tại không
    const review = await prisma.productReview.findUnique({
      where: { id: Number(id) }
    });

    if (!review) {
      logger.warn('Review not found', { reviewId: id });
      return res.status(404).json({ message: 'Không tìm thấy đánh giá' });
    }

    // Cập nhật trạng thái
    const updated = await prisma.productReview.update({
      where: { id: Number(id) },
      data: { 
        isApproved: isApproved === true || isApproved === 'true',
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        product: {
          select: {
            id: true,
            name: true
          }
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true
          }
        }
      }
    });

    logger.success('Review approval status updated', { 
      reviewId: id, 
      isApproved: updated.isApproved 
    });
    logger.end(context.path, { reviewId: id });

    return res.json({
      message: updated.isApproved 
        ? 'Duyệt đánh giá thành công' 
        : 'Từ chối đánh giá thành công',
      data: updated
    });

  } catch (error) {
    logger.error('Failed to update review approval', {
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
 * ===========================
 * ADMIN: Xóa đánh giá
 * ===========================
 */
export const adminDeleteReview = async (req, res) => {
  const context = { path: 'admin.productReview.delete' };
  try {
    logger.start(context.path, { 
      reviewId: req.params.id,
      admin: req.user.id 
    });

    const { id } = req.params;

    // Kiểm tra review có tồn tại không
    const review = await prisma.productReview.findUnique({
      where: { id: Number(id) }
    });

    if (!review) {
      logger.warn('Review not found', { reviewId: id });
      return res.status(404).json({ message: 'Không tìm thấy đánh giá' });
    }

    // Xóa review
    await prisma.productReview.delete({
      where: { id: Number(id) }
    });

    logger.success('Admin deleted review', { reviewId: id });
    logger.end(context.path, { reviewId: id });

    return res.json({
      message: 'Xóa đánh giá thành công'
    });

  } catch (error) {
    logger.error('Failed to delete review', {
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
 * ===========================
 * ADMIN: Lấy thống kê đánh giá
 * ===========================
 */
export const adminGetReviewStats = async (req, res) => {
  const context = { path: 'admin.productReview.stats' };
  try {
    logger.start(context.path, { admin: req.user.id });

    const [
      totalReviews,
      approvedReviews,
      pendingReviews,
      todayReviews,
      averageRating,
      verifiedReviews
    ] = await Promise.all([
      prisma.productReview.count(),
      prisma.productReview.count({ where: { isApproved: true } }),
      prisma.productReview.count({ where: { isApproved: false } }),
      prisma.productReview.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      prisma.productReview.aggregate({
        where: { isApproved: true },
        _avg: { rating: true }
      }),
      prisma.productReview.count({ where: { isVerified: true } })
    ]);

    const stats = {
      totalReviews,
      approvedReviews,
      pendingReviews,
      todayReviews,
      averageRating: averageRating._avg.rating ? Number(averageRating._avg.rating.toFixed(2)) : 0,
      verifiedReviews
    };

    logger.success('Review stats fetched', stats);
    logger.end(context.path, stats);

    return res.json({
      message: 'Lấy thống kê đánh giá thành công',
      data: stats
    });

  } catch (error) {
    logger.error('Failed to fetch review stats', {
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

