import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';

/**
 * Tạo mã giảm giá mới
 */
export const createCoupon = async (req, res) => {
  const context = { path: 'admin.coupon.create' };
  try {
    logger.start(context.path, { code: req.body.code });

    // Lấy dữ liệu từ request body
    const {
      code,           // Mã giảm giá (ví dụ: WELCOME10)
      name,           // Tên mã giảm giá (ví dụ: Chào mừng khách hàng mới)
      discountType,   // Loại giảm giá: PERCENT hoặc AMOUNT
      discountValue,  // Giá trị giảm giá (10% hoặc 50000 VND)
      minimumAmount,  // Giá trị đơn hàng tối thiểu để sử dụng mã
      usageLimit,     // Giới hạn số lần sử dụng
      startDate,      // Ngày bắt đầu hiệu lực
      endDate,        // Ngày kết thúc hiệu lực
      isActive        // Trạng thái hoạt động (string "true"/"false" hoặc boolean)
    } = req.body;

    // Kiểm tra mã giảm giá đã tồn tại chưa
    const existingCoupon = await prisma.coupon.findFirst({
      where: { code: code }
    });

    if (existingCoupon) {
      return res.status(400).json({
        message: "Mã giảm giá đã tồn tại"
      });
    }

    // ✅ Sửa: Xử lý isActive linh hoạt hơn
    const isActiveValue = isActive === "true" || isActive === true;

    // Tạo mã giảm giá mới trong database
    const coupon = await prisma.coupon.create({
      data: {
        code,
        name,
        discountType,
        discountValue,
        minimumAmount,
        usageLimit,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: isActiveValue
      }
    });

    logger.success('Coupon created', { couponId: coupon.id, code: coupon.code });
    logger.end(context.path, { couponId: coupon.id });

    res.status(201).json({
      message: "Tạo mã giảm giá thành công",
      data: coupon
    });

  } catch (error) {
    logger.error('Failed to create coupon', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      message: "Lỗi server",
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

/**
 * Lấy danh sách mã giảm giá với phân trang và tìm kiếm
 */
export const getCoupons = async (req, res) => {
  const context = { path: "admin.coupons.list", query: req.query };
  try {
    const { page = 1, limit = 10, q, status } = req.query;

    // Xây dựng điều kiện WHERE
    const where = {};

    // Tìm kiếm theo mã hoặc tên
    if (q) {
      where.OR = [
        { code: { contains: q } },
        { name: { contains: q } }
      ];
    }

    // Lọc theo trạng thái
    if (status === 'true') {
      where.isActive = true;
      where.startDate = { lte: new Date() };
      where.endDate = { gte: new Date() };
    } else if (status === 'false') {
      where.isActive = false;
    }

    const [items, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (Number(page) - 1) * Number(limit),//bỏ qua số trang
        take: Number(limit),//lấy ra số lượng bản ghi trên mỗi trang
      }),
      prisma.coupon.count({ where }),//đếm số lượng mã giảm giá
    ]);

    const payload = { items, total, page: Number(page), limit: Number(limit) };
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: process.env.NODE_ENV !== "production" ? error.message : undefined,
    });
  }
};

/**
 * Lấy chi tiết mã giảm giá theo ID
 */
export const getCouponById = async (req, res) => {
  const context = { path: 'admin.coupon.getById' };
  try {
    logger.start(context.path, { id: req.params.id });

    const { id } = req.params;

    // Kiểm tra ID có hợp lệ không
    if (!id || isNaN(id)) {
      return res.status(400).json({
        message: "ID mã giảm giá không hợp lệ"
      });
    }

    // Tìm mã giảm giá theo ID
    const coupon = await prisma.coupon.findFirst({
      where: { id: Number(id) }
    });

    if (!coupon) {
      return res.status(404).json({
        message: "Không tìm thấy mã giảm giá"
      });
    }

    logger.success('Coupon fetched', { couponId: coupon.id });
    logger.end(context.path, { couponId: coupon.id });

    res.status(200).json({
      message: "Lấy chi tiết mã giảm giá thành công",
      data: coupon
    });

  } catch (error) {
    logger.error('Failed to fetch coupon', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      message: "Lỗi server",
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

/**
 * Cập nhật mã giảm giá
 */
export const updateCoupon = async (req, res) => {
  const context = { path: 'admin.coupon.update' };
  try {
    logger.start(context.path, { id: req.params.id });

    const { id } = req.params;
    const {
      code,
      name,
      discountType,
      discountValue,
      minimumAmount,
      usageLimit,
      startDate,
      endDate,
      isActive
    } = req.body;

    // Kiểm tra ID có hợp lệ không
    if (!id || isNaN(id)) {
      return res.status(400).json({
        message: "ID mã giảm giá không hợp lệ"
      });
    }

    // Kiểm tra mã giảm giá có tồn tại không
    const existingCoupon = await prisma.coupon.findFirst({
      where: { id: Number(id) }
    });

    if (!existingCoupon) {
      return res.status(404).json({
        message: "Không tìm thấy mã giảm giá"
      });
    }

    // Kiểm tra mã code có bị trùng không (nếu thay đổi)
    if (code && code !== existingCoupon.code) {
      const duplicateCoupon = await prisma.coupon.findFirst({
        where: { code: code }
      });

      if (duplicateCoupon) {
        return res.status(400).json({
          message: "Mã giảm giá đã tồn tại"
        });
      }
    }

    // Tạo object data để update (chỉ update các field có giá trị)
    const updateData = {};
    if (code !== undefined && code !== '') updateData.code = code;
    if (name !== undefined && name !== '') updateData.name = name;
    if (discountType !== undefined && discountType !== '') updateData.discountType = discountType;
    if (discountValue !== undefined && discountValue !== null) updateData.discountValue = discountValue;
    if (minimumAmount !== undefined && minimumAmount !== null) updateData.minimumAmount = minimumAmount;
    if (usageLimit !== undefined && usageLimit !== null) updateData.usageLimit = usageLimit;
    if (startDate !== undefined && startDate !== '') updateData.startDate = new Date(startDate);
    if (endDate !== undefined && endDate !== '') updateData.endDate = new Date(endDate);

    // ✅ Sửa: Xử lý isActive linh hoạt hơn
    if (isActive !== undefined && isActive !== '') {
      updateData.isActive = isActive === "true" || isActive === true;
    }

    // Cập nhật mã giảm giá
    const updatedCoupon = await prisma.coupon.update({
      where: { id: Number(id) },
      data: updateData
    });

    logger.success('Coupon updated', { couponId: updatedCoupon.id });
    logger.end(context.path, { couponId: updatedCoupon.id });

    res.status(200).json({
      message: "Cập nhật mã giảm giá thành công",
      data: updatedCoupon
    });

  } catch (error) {
    logger.error('Failed to update coupon', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      message: "Lỗi server",
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

/**
 * Xóa mã giảm giá
 */
export const deleteCoupon = async (req, res) => {
  const context = { path: 'admin.coupon.delete' };
  try {
    logger.start(context.path, { id: req.params.id });

    const { id } = req.params;

    // Kiểm tra ID có hợp lệ không
    if (!id || isNaN(id)) {
      return res.status(400).json({
        message: "ID mã giảm giá không hợp lệ"
      });
    }

    // Kiểm tra mã giảm giá có tồn tại không
    const existingCoupon = await prisma.coupon.findFirst({
      where: { id: Number(id) }
    });

    if (!existingCoupon) {
      return res.status(404).json({
        message: "Không tìm thấy mã giảm giá"
      });
    }

    // Kiểm tra có đơn hàng nào đã sử dụng mã này không
    const usageCount = await prisma.couponUsage.count({
      where: { couponId: Number(id) }
    });

    if (usageCount > 0) {
      return res.status(400).json({
        message: "Không thể xóa mã giảm giá đã được sử dụng"
      });
    }

    // Xóa mã giảm giá
    await prisma.coupon.delete({
      where: { id: Number(id) }
    });

    logger.success('Coupon deleted', { couponId: id });
    logger.end(context.path, { couponId: id });

    res.status(200).json({
      message: "Xóa mã giảm giá thành công"
    });

  } catch (error) {
    logger.error('Failed to delete coupon', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      message: "Lỗi server",
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

/**
 * Share coupon to users
 * POST /api/admin/coupons/:id/share
 */
export const shareCouponToUsers = async (req, res) => {
  const context = { path: 'admin.coupon.share' };
  try {
    logger.start(context.path, { id: req.params.id, body: req.body });

    const { id } = req.params;
    const { userIds, shareToAll } = req.body;

    // ✅ Xử lý shareToAll linh hoạt (có thể là string "true" hoặc boolean)
    const shouldShareToAll = shareToAll === true || shareToAll === "true" || shareToAll === "1";

    // Validate input
    if (!shouldShareToAll && (!userIds || !Array.isArray(userIds) || userIds.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn ít nhất một người dùng'
      });
    }

    // Find coupon
    const coupon = await prisma.coupon.findUnique({
      where: { id: Number(id) }
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy mã giảm giá'
      });
    }

    // Get target users
    let targetUsers = [];
    if (shouldShareToAll) {
      // Get all active users (exclude admins)
      targetUsers = await prisma.user.findMany({
        where: {
          isActive: true,
          role: { not: 'ADMIN' }
        },
        select: { id: true }
      });
      logger.info('Share to all users', { 
        totalUsers: targetUsers.length,
        couponId: coupon.id 
      });
    } else {
      // Get specific users
      targetUsers = await prisma.user.findMany({
        where: {
          id: { in: userIds.map(id => Number(id)) },
          isActive: true
        },
        select: { id: true }
      });
      logger.info('Share to specific users', { 
        requestedCount: userIds.length,
        foundCount: targetUsers.length,
        couponId: coupon.id 
      });
    }

    if (targetUsers.length === 0) {
      logger.warn('No valid users found', { 
        shareToAll: shouldShareToAll,
        userIds: userIds || []
      });
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy người dùng hợp lệ'
      });
    }

    // ✅ Kiểm tra xem prisma.userCoupon có tồn tại không
    if (!prisma.userCoupon) {
      logger.error('prisma.userCoupon is undefined - Prisma client may need regeneration');
      return res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống: Prisma client chưa được khởi tạo đúng. Vui lòng chạy: npx prisma generate'
      });
    }

    // Calculate expiry date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Share coupon to users (create UserCoupon records)
    const createPromises = targetUsers.map(async (user) => {
      try {
        // Check if UserCoupon already exists
        const existingUserCoupon = await prisma.userCoupon.findUnique({
          where: {
            userId_couponId: {
              userId: user.id,
              couponId: coupon.id
            }
          }
        });

        if (existingUserCoupon) {
          // Update expiry date if already exists
          const updated = await prisma.userCoupon.update({
            where: {
              id: existingUserCoupon.id
            },
            data: {
              expiresAt
            }
          });
          logger.debug('Updated existing UserCoupon', { 
            userId: user.id, 
            couponId: coupon.id 
          });
          return updated;
        } else {
          // Create new UserCoupon
          const created = await prisma.userCoupon.create({
            data: {
              userId: user.id,
              couponId: coupon.id,
              expiresAt
            }
          });
          logger.debug('Created new UserCoupon', { 
            userId: user.id, 
            couponId: coupon.id 
          });
          return created;
        }
      } catch (err) {
        // Log error but continue with other users
        logger.error('Failed to share coupon to user', {
          userId: user.id,
          couponId: coupon.id,
          error: err.message,
          stack: err.stack
        });
        return null;
      }
    });

    const results = await Promise.all(createPromises);
    const successCount = results.filter(r => r !== null).length;
    const failedCount = targetUsers.length - successCount;

    if (failedCount > 0) {
      logger.warn('Some users failed to receive coupon', {
        total: targetUsers.length,
        success: successCount,
        failed: failedCount
      });
    }

    logger.success('Coupon shared to users', {
      couponId: coupon.id,
      couponCode: coupon.code,
      targetCount: targetUsers.length,
      successCount,
      failedCount,
      shareToAll: shouldShareToAll
    });
    logger.end(context.path, { couponId: coupon.id });

    return res.json({
      success: true,
      message: `Đã chia sẻ mã giảm giá cho ${successCount} người dùng${failedCount > 0 ? ` (${failedCount} thất bại)` : ''}`,
      data: {
        couponCode: coupon.code,
        totalUsers: targetUsers.length,
        sharedCount: successCount,
        failedCount
      }
    });
  } catch (error) {
    logger.error('Share coupon error', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi chia sẻ mã giảm giá'
    });
  }
};

/**
 * Get list of users for sharing
 * GET /api/admin/coupons/users
 */
export const getUsersForSharing = async (req, res) => {
  const context = { path: 'admin.coupon.getUsers' };
  try {
    logger.start(context.path, req.query);

    const { search, page = 1, limit = 50 } = req.query;

    const where = {
      isActive: true,
      role: { not: 'ADMIN' }
    };

    if (search) {
      where.OR = [
        { email: { contains: search } },
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { phone: { contains: search } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      }),
      prisma.user.count({ where })
    ]);

    logger.success('Users fetched for sharing', { total, count: users.length });
    logger.end(context.path, { total });

    return res.json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Get users for sharing error', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách người dùng'
    });
  }
};
