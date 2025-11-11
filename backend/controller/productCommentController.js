import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';

/**
 * ===========================
 * USER: Tạo bình luận sản phẩm
 * ===========================
 * User có thể bình luận nhiều lần trên cùng 1 sản phẩm
 * Hỗ trợ reply comment (parentId)
 */
export const createComment = async (req, res) => {
  const context = { path: 'user.productComment.create' };
  try {
    logger.start(context.path, { 
      userId: req.user.id, 
      productId: req.body.productId 
    });

    const userId = req.user.id;
    const { productId, content, parentId } = req.body;

    // Validate input
    if (!productId || !content) {
      logger.warn('Missing required fields', { productId, hasContent: !!content });
      return res.status(400).json({ 
        message: 'Vui lòng cung cấp đầy đủ thông tin (productId, content)' 
      });
    }

    if (!content.trim() || content.trim().length < 3) {
      logger.warn('Content too short', { contentLength: content.trim().length });
      return res.status(400).json({ 
        message: 'Nội dung bình luận phải có ít nhất 3 ký tự' 
      });
    }

    if (content.length > 1000) {
      logger.warn('Content too long', { contentLength: content.length });
      return res.status(400).json({ 
        message: 'Nội dung bình luận không được vượt quá 1000 ký tự' 
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

    // Nếu có parentId, kiểm tra comment cha có tồn tại không
    if (parentId) {
      const parentComment = await prisma.productComment.findUnique({
        where: { id: Number(parentId) },
        select: { id: true, productId: true }
      });

      if (!parentComment) {
        logger.warn('Parent comment not found', { parentId });
        return res.status(404).json({ message: 'Không tìm thấy bình luận cha' });
      }

      // Đảm bảo reply cùng sản phẩm
      if (parentComment.productId !== Number(productId)) {
        logger.warn('Parent comment product mismatch', { 
          parentProductId: parentComment.productId, 
          productId 
        });
        return res.status(400).json({ 
          message: 'Bình luận cha không thuộc sản phẩm này' 
        });
      }
    }

    // Tạo bình luận
    const comment = await prisma.productComment.create({
      data: {
        userId,
        productId: Number(productId),
        parentId: parentId ? Number(parentId) : null,
        content: content.trim(),
        isApproved: false // Mặc định chưa duyệt, admin sẽ approve
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    });

    logger.success('Comment created', { 
      commentId: comment.id, 
      productId, 
      userId,
      isReply: !!parentId 
    });
    logger.end(context.path, { commentId: comment.id });

    return res.status(201).json({
      message: 'Bình luận của bạn đã được gửi và đang chờ duyệt',
      data: comment
    });

  } catch (error) {
    logger.error('Failed to create comment', {
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
 * PUBLIC: Lấy danh sách bình luận của sản phẩm
 * ===========================
 * Chỉ hiển thị comments đã được approve
 * Hỗ trợ phân trang
 */
export const getProductComments = async (req, res) => {
  const context = { path: 'public.productComment.list' };
  try {
    logger.start(context.path, { productId: req.params.productId });

    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Kiểm tra sản phẩm có tồn tại không
    const product = await prisma.product.findUnique({
      where: { id: Number(productId) },
      select: { id: true }
    });

    if (!product) {
      logger.warn('Product not found', { productId });
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }

    // Lấy comments (chỉ approved, sắp xếp theo thời gian mới nhất)
    const [comments, total] = await Promise.all([
      prisma.productComment.findMany({
        where: {
          productId: Number(productId),
          isApproved: true,
          parentId: null // Chỉ lấy comments gốc (không phải reply)
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
          // Lấy luôn các reply (nếu có)
          replies: {
            where: { isApproved: true },
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
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      }),
      prisma.productComment.count({
        where: {
          productId: Number(productId),
          isApproved: true,
          parentId: null
        }
      })
    ]);

    logger.success('Product comments fetched', { 
      productId, 
      total, 
      count: comments.length 
    });
    logger.end(context.path, { total });

    return res.json({
      message: 'Lấy danh sách bình luận thành công',
      data: {
        comments,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });

  } catch (error) {
    logger.error('Failed to fetch product comments', {
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
 * USER: Lấy bình luận của chính mình
 * ===========================
 */
export const getMyComments = async (req, res) => {
  const context = { path: 'user.productComment.my' };
  try {
    logger.start(context.path, { userId: req.user.id });

    const userId = req.user.id;
    const { page = 1, limit = 10, productId } = req.query;

    const where = { userId };
    if (productId) {
      where.productId = Number(productId);
    }

    const [comments, total] = await Promise.all([
      prisma.productComment.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              imageUrl: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      }),
      prisma.productComment.count({ where })
    ]);

    logger.success('My comments fetched', { userId, total, count: comments.length });
    logger.end(context.path, { total });

    return res.json({
      message: 'Lấy danh sách bình luận của bạn thành công',
      data: {
        comments,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });

  } catch (error) {
    logger.error('Failed to fetch my comments', {
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
 * USER: Cập nhật bình luận của mình
 * ===========================
 * Chỉ cho phép sửa nếu chưa được approve
 */
export const updateMyComment = async (req, res) => {
  const context = { path: 'user.productComment.update' };
  try {
    logger.start(context.path, { 
      userId: req.user.id, 
      commentId: req.params.id 
    });

    const userId = req.user.id;
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim() || content.trim().length < 3) {
      logger.warn('Invalid content', { hasContent: !!content });
      return res.status(400).json({ 
        message: 'Nội dung bình luận phải có ít nhất 3 ký tự' 
      });
    }

    if (content.length > 1000) {
      logger.warn('Content too long', { contentLength: content.length });
      return res.status(400).json({ 
        message: 'Nội dung bình luận không được vượt quá 1000 ký tự' 
      });
    }

    // Kiểm tra comment có tồn tại và thuộc về user không
    const comment = await prisma.productComment.findFirst({
      where: {
        id: Number(id),
        userId
      }
    });

    if (!comment) {
      logger.warn('Comment not found or unauthorized', { commentId: id, userId });
      return res.status(404).json({ 
        message: 'Không tìm thấy bình luận hoặc bạn không có quyền chỉnh sửa' 
      });
    }

    // Không cho phép sửa nếu đã được approve
    if (comment.isApproved) {
      logger.warn('Cannot edit approved comment', { commentId: id });
      return res.status(400).json({ 
        message: 'Không thể chỉnh sửa bình luận đã được duyệt' 
      });
    }

    // Cập nhật
    const updated = await prisma.productComment.update({
      where: { id: Number(id) },
      data: { 
        content: content.trim(),
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
        }
      }
    });

    logger.success('Comment updated', { commentId: id, userId });
    logger.end(context.path, { commentId: id });

    return res.json({
      message: 'Cập nhật bình luận thành công',
      data: updated
    });

  } catch (error) {
    logger.error('Failed to update comment', {
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
 * USER: Xóa bình luận của mình
 * ===========================
 * Chỉ cho phép xóa nếu chưa được approve
 */
export const deleteMyComment = async (req, res) => {
  const context = { path: 'user.productComment.delete' };
  try {
    logger.start(context.path, { 
      userId: req.user.id, 
      commentId: req.params.id 
    });

    const userId = req.user.id;
    const { id } = req.params;

    // Kiểm tra comment có tồn tại và thuộc về user không
    const comment = await prisma.productComment.findFirst({
      where: {
        id: Number(id),
        userId
      }
    });

    if (!comment) {
      logger.warn('Comment not found or unauthorized', { commentId: id, userId });
      return res.status(404).json({ 
        message: 'Không tìm thấy bình luận hoặc bạn không có quyền xóa' 
      });
    }

    // Không cho phép xóa nếu đã được approve
    if (comment.isApproved) {
      logger.warn('Cannot delete approved comment', { commentId: id });
      return res.status(400).json({ 
        message: 'Không thể xóa bình luận đã được duyệt. Vui lòng liên hệ admin.' 
      });
    }

    // Xóa comment và các reply của nó
    await prisma.$transaction(async (tx) => {
      // Xóa các reply trước
      await tx.productComment.deleteMany({
        where: { parentId: Number(id) }
      });

      // Xóa comment chính
      await tx.productComment.delete({
        where: { id: Number(id) }
      });
    });

    logger.success('Comment deleted', { commentId: id, userId });
    logger.end(context.path, { commentId: id });

    return res.json({
      message: 'Xóa bình luận thành công'
    });

  } catch (error) {
    logger.error('Failed to delete comment', {
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
 * ADMIN: Lấy tất cả bình luận (có filter)
 * ===========================
 */
export const adminGetAllComments = async (req, res) => {
  const context = { path: 'admin.productComment.list' };
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

    if (q) {
      where.OR = [
        { content: { contains: q } },
        { user: { firstName: { contains: q } } },
        { user: { lastName: { contains: q } } }
      ];
    }

    const [comments, total] = await Promise.all([
      prisma.productComment.findMany({
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
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      }),
      prisma.productComment.count({ where })
    ]);

    logger.success('Admin comments fetched', { total, count: comments.length });
    logger.end(context.path, { total });

    return res.json({
      message: 'Lấy danh sách bình luận thành công',
      data: {
        items: comments,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });

  } catch (error) {
    logger.error('Failed to fetch all comments', {
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
 * ADMIN: Approve/Reject bình luận
 * ===========================
 */
export const adminApproveComment = async (req, res) => {
  const context = { path: 'admin.productComment.approve' };
  try {
    logger.start(context.path, { 
      commentId: req.params.id,
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

    // Kiểm tra comment có tồn tại không
    const comment = await prisma.productComment.findUnique({
      where: { id: Number(id) }
    });

    if (!comment) {
      logger.warn('Comment not found', { commentId: id });
      return res.status(404).json({ message: 'Không tìm thấy bình luận' });
    }

    // Cập nhật trạng thái
    const updated = await prisma.productComment.update({
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
        }
      }
    });

    logger.success('Comment approval status updated', { 
      commentId: id, 
      isApproved: updated.isApproved 
    });
    logger.end(context.path, { commentId: id });

    return res.json({
      message: updated.isApproved 
        ? 'Duyệt bình luận thành công' 
        : 'Từ chối bình luận thành công',
      data: updated
    });

  } catch (error) {
    logger.error('Failed to update comment approval', {
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
 * ADMIN: Xóa bình luận
 * ===========================
 */
export const adminDeleteComment = async (req, res) => {
  const context = { path: 'admin.productComment.delete' };
  try {
    logger.start(context.path, { 
      commentId: req.params.id,
      admin: req.user.id 
    });

    const { id } = req.params;

    // Kiểm tra comment có tồn tại không
    const comment = await prisma.productComment.findUnique({
      where: { id: Number(id) }
    });

    if (!comment) {
      logger.warn('Comment not found', { commentId: id });
      return res.status(404).json({ message: 'Không tìm thấy bình luận' });
    }

    // Xóa comment và các reply của nó
    await prisma.$transaction(async (tx) => {
      // Xóa các reply trước
      await tx.productComment.deleteMany({
        where: { parentId: Number(id) }
      });

      // Xóa comment chính
      await tx.productComment.delete({
        where: { id: Number(id) }
      });
    });

    logger.success('Admin deleted comment', { commentId: id });
    logger.end(context.path, { commentId: id });

    return res.json({
      message: 'Xóa bình luận thành công'
    });

  } catch (error) {
    logger.error('Failed to delete comment', {
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
 * ADMIN: Lấy thống kê bình luận
 * ===========================
 */
export const adminGetCommentStats = async (req, res) => {
  const context = { path: 'admin.productComment.stats' };
  try {
    logger.start(context.path, { admin: req.user.id });

    const [
      totalComments,
      approvedComments,
      pendingComments,
      todayComments
    ] = await Promise.all([
      prisma.productComment.count(),
      prisma.productComment.count({ where: { isApproved: true } }),
      prisma.productComment.count({ where: { isApproved: false } }),
      prisma.productComment.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ]);

    const stats = {
      totalComments,
      approvedComments,
      pendingComments,
      todayComments
    };

    logger.success('Comment stats fetched', stats);
    logger.end(context.path, stats);

    return res.json({
      message: 'Lấy thống kê bình luận thành công',
      data: stats
    });

  } catch (error) {
    logger.error('Failed to fetch comment stats', {
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

