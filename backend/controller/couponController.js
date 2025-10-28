// Import các thư viện cần thiết
import prisma from '../config/prisma.js'; // Prisma client để kết nối database

// ===========================
// USER COUPON CONTROLLER
// ===========================

/**
 * Kiểm tra mã giảm giá có hợp lệ không
 */
export const validateCoupon = async (req, res) => {
  // Tạo context object để log và debug
  const context = { path: 'user.coupon.validate', body: req.body };
  try {
    console.log('START', context);
    
    const userId = req.user.id; // Lấy ID user từ token
    const { couponCode, subtotal } = req.body;

    // Kiểm tra mã giảm giá có được gửi lên không
    if (!couponCode) {
      return res.status(400).json({
        message: "Mã giảm giá là bắt buộc"
      });
    }

    // Tìm mã giảm giá trong database
    const coupon = await prisma.coupon.findFirst({
      where: {
        code: couponCode,                    // Mã giảm giá khớp
        isActive: true,                      // Mã đang hoạt động
        startDate: { lte: new Date() },      // Đã bắt đầu hiệu lực
        endDate: { gte: new Date() }         // Chưa hết hạn
      }
    });

    // Kiểm tra mã có tồn tại và hợp lệ không
    if (!coupon) {
      return res.status(400).json({
        valid: false,
        message: "Mã giảm giá không hợp lệ hoặc đã hết hạn"
      });
    }

    // Kiểm tra đã hết lượt sử dụng chưa
    if (coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({
        valid: false,
        message: "Mã giảm giá đã hết lượt sử dụng"
      });
    }

    // Kiểm tra giá trị đơn hàng có đạt tối thiểu không
    if (subtotal < coupon.minimumAmount) {
      return res.status(400).json({
        valid: false,
        message: `Đơn hàng phải có giá trị tối thiểu ${coupon.minimumAmount.toLocaleString('vi-VN')} VND để sử dụng mã này`,
        minimumAmount: coupon.minimumAmount,
        currentAmount: subtotal,
        requiredAmount: coupon.minimumAmount - subtotal
      });
    }

    // Kiểm tra user đã sử dụng mã này chưa (mặc định mỗi user chỉ dùng 1 lần)
    const userUsage = await prisma.couponUsage.findFirst({
      where: {
        couponId: coupon.id,
        userId: userId
      }
    });

    if (userUsage) {
      return res.status(400).json({
        valid: false,
        message: "Bạn đã sử dụng mã giảm giá này rồi"
      });
    }

    // Tính toán số tiền giảm giá
    let discountAmount = 0;
    
    if (coupon.discountType === 'PERCENT') {
      // Giảm theo phần trăm: (subtotal * discountValue) / 100
      discountAmount = (subtotal * coupon.discountValue) / 100;
    } else {
      // Giảm theo số tiền cố định
      discountAmount = coupon.discountValue;
    }

    // Đảm bảo số tiền giảm không vượt quá tổng tiền đơn hàng
    if (discountAmount > subtotal) {
      discountAmount = subtotal;
    }

    // Tính số tiền cuối cùng sau khi giảm giá
    const finalAmount = subtotal - discountAmount;

    console.log('END', { ...context, couponId: coupon.id, discountAmount: discountAmount });
    res.status(200).json({
      valid: true,
      message: "Mã giảm giá hợp lệ",
      coupon: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minimumAmount: coupon.minimumAmount,
        usageLimit: coupon.usageLimit,
        usedCount: coupon.usedCount,
        remainingUses: coupon.usageLimit - coupon.usedCount
      },
      discount: {
        discountAmount: discountAmount,
        finalAmount: finalAmount,
        savings: discountAmount
      }
    });

  } catch (error) {
    console.error('Validate coupon error:', error);
    res.status(500).json({
      message: "Lỗi server",
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

/**
 * Lấy danh sách mã giảm giá có thể sử dụng
 */
export const getAvailableCoupons = async (req, res) => {
  // Tạo context object để log và debug
  const context = { path: 'user.coupon.available', query: req.query };
  try {
    console.log('START', context);
    
    const userId = req.user.id; // Lấy ID user từ token
    const { subtotal = 0 } = req.query; // Giá trị đơn hàng hiện tại

    // Lấy tất cả mã giảm giá đang hoạt động và trong thời gian hiệu lực
    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,                       // Mã đang hoạt động
        startDate: { lte: new Date() },       // Đã bắt đầu hiệu lực
        endDate: { gte: new Date() }          // Chưa hết hạn
      },
      orderBy: { discountValue: 'desc' }     // Sắp xếp theo giá trị giảm giá giảm dần
    });

    // Lọc các mã chưa hết lượt sử dụng
    const activeCoupons = coupons.filter(coupon => {
      return coupon.usedCount < coupon.usageLimit;
    });

    // Lọc các mã phù hợp với giá trị đơn hàng
    const availableCoupons = activeCoupons.filter(coupon => {
      return subtotal >= coupon.minimumAmount;
    });

    // Tính toán discount cho từng mã
    const couponsWithDiscount = availableCoupons.map(coupon => {
      let discountAmount = 0;
      
      if (coupon.discountType === 'PERCENT') {
        // Giảm theo phần trăm
        discountAmount = (subtotal * coupon.discountValue) / 100;
      } else {
        // Giảm theo số tiền cố định
        discountAmount = coupon.discountValue;
      }

      // Đảm bảo số tiền giảm không vượt quá tổng tiền
      if (discountAmount > subtotal) {
        discountAmount = subtotal;
      }

      return {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minimumAmount: coupon.minimumAmount,
        usageLimit: coupon.usageLimit,
        usedCount: coupon.usedCount,
        remainingUses: coupon.usageLimit - coupon.usedCount,
        estimatedDiscount: discountAmount,
        finalAmount: subtotal - discountAmount
      };
    });

    console.log('END', { ...context, totalCount: couponsWithDiscount.length });
    res.status(200).json({
      message: "Lấy danh sách mã giảm giá thành công",
      coupons: couponsWithDiscount,
      totalCount: couponsWithDiscount.length
    });

  } catch (error) {
    console.error('Get available coupons error:', error);
    res.status(500).json({
      message: "Lỗi server",
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

/**
 * Lấy lịch sử sử dụng mã giảm giá của user
 */
export const getUserCouponHistory = async (req, res) => {
  // Tạo context object để log và debug
  const context = { path: 'user.coupon.history', query: req.query };
  try {
    console.log('START', context);
    
    const userId = req.user.id; // Lấy ID user từ token
    const { page = 1, limit = 10 } = req.query;

    // Tính toán skip cho phân trang
    const skip = (Number(page) - 1) * Number(limit);

    // Thực hiện 2 query song song để tối ưu performance
    const [couponUsages, totalCount] = await Promise.all([
      // Query 1: Lấy lịch sử sử dụng mã giảm giá với phân trang
      prisma.couponUsage.findMany({
        where: { userId: userId },
        include: {
          coupon: {
            select: {
              id: true,
              code: true,
              name: true,
              discountType: true,
              discountValue: true
            }
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
              createdAt: true
            }
          }
        },
        orderBy: { usedAt: 'desc' }, // Sắp xếp theo thời gian sử dụng (mới nhất trước)
        skip: skip, // Bỏ qua các bản ghi của trang trước
        take: Number(limit) // Lấy đúng số lượng bản ghi của trang hiện tại
      }),
      // Query 2: Đếm tổng số lượt sử dụng
      prisma.couponUsage.count({ where: { userId: userId } })
    ]);

    // Tạo response payload với thông tin phân trang
    const payload = {
      message: "Lấy lịch sử mã giảm giá thành công",
      couponUsages: couponUsages,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalCount / Number(limit)),
        totalCount: totalCount,
        hasNext: (Number(page) * Number(limit)) < totalCount,
        hasPrev: Number(page) > 1
      }
    };

    console.log('END', { ...context, totalCount: payload.pagination.totalCount });
    res.status(200).json(payload);

  } catch (error) {
    console.error('Get user coupon history error:', error);
    res.status(500).json({
      message: "Lỗi server",
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};