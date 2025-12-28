// services/promotionService.js
import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';

/**
 * Service xử lý logic tự động tặng mã giảm giá
 */

/**
 * Tặng mã giảm giá 300k cho người dùng mua hàng lần đầu
 * @param {number} userId - ID người dùng
 * @returns {Promise<Object|null>} UserCoupon đã tạo hoặc null
 */
export const grantFirstOrderCoupon = async (userId) => {
    try {
        // Kiểm tra xem user đã có đơn hàng nào chưa
        const orderCount = await prisma.order.count({
            where: { userId, status: { not: 'CANCELLED' } }
        });

        // Nếu đây không phải đơn đầu tiên, không tặng mã
        if (orderCount > 0) {
            return null;
        }

        // Tìm coupon FIRST_ORDER (300k)
        const firstOrderCoupon = await prisma.coupon.findFirst({
            where: {
                promotionType: 'FIRST_ORDER',
                isActive: true,
                startDate: { lte: new Date() },
                endDate: { gte: new Date() }
            }
        });

        if (!firstOrderCoupon) {
            logger.warn('First order coupon not found or inactive');
            return null;
        }

        // Kiểm tra xem user đã nhận mã này chưa
        const existingUserCoupon = await prisma.userCoupon.findUnique({
            where: {
                userId_couponId: {
                    userId,
                    couponId: firstOrderCoupon.id
                }
            }
        });

        if (existingUserCoupon) {
            return null; // Đã nhận rồi
        }

        // Tạo UserCoupon mới (tặng mã cho user)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // Hết hạn sau 30 ngày

        const userCoupon = await prisma.userCoupon.create({
            data: {
                userId,
                couponId: firstOrderCoupon.id,
                expiresAt
            },
            include: {
                coupon: true
            }
        });

        logger.info('First order coupon granted', { userId, couponId: firstOrderCoupon.id });
        return userCoupon;
    } catch (error) {
        logger.error('Failed to grant first order coupon', { userId, error: error.message });
        return null;
    }
};

/**
 * Tặng mã giảm giá 100k cho người dùng đánh giá sản phẩm lần đầu
 * @param {number} userId - ID người dùng
 * @returns {Promise<Object|null>} UserCoupon đã tạo hoặc null
 */
export const grantFirstReviewCoupon = async (userId) => {
    try {
        // Kiểm tra xem user đã có review nào chưa
        const reviewCount = await prisma.productReview.count({
            where: { userId }
        });

        // Nếu đây không phải review đầu tiên, không tặng mã
        if (reviewCount > 1) {
            return null;
        }

        // Tìm coupon FIRST_REVIEW (100k)
        const firstReviewCoupon = await prisma.coupon.findFirst({
            where: {
                promotionType: 'FIRST_REVIEW',
                isActive: true,
                startDate: { lte: new Date() },
                endDate: { gte: new Date() }
            }
        });

        if (!firstReviewCoupon) {
            logger.warn('First review coupon not found or inactive');
            return null;
        }

        // Kiểm tra xem user đã nhận mã này chưa
        const existingUserCoupon = await prisma.userCoupon.findUnique({
            where: {
                userId_couponId: {
                    userId,
                    couponId: firstReviewCoupon.id
                }
            }
        });

        if (existingUserCoupon) {
            return null; // Đã nhận rồi
        }

        // Tạo UserCoupon mới (tặng mã cho user)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // Hết hạn sau 30 ngày

        const userCoupon = await prisma.userCoupon.create({
            data: {
                userId,
                couponId: firstReviewCoupon.id,
                expiresAt
            },
            include: {
                coupon: true
            }
        });

        logger.info('First review coupon granted', { userId, couponId: firstReviewCoupon.id });
        return userCoupon;
    } catch (error) {
        logger.error('Failed to grant first review coupon', { userId, error: error.message });
        return null;
    }
};

/**
 * Validate và áp dụng coupon cho đơn hàng
 * @param {number} userId - ID người dùng
 * @param {string} couponCode - Mã coupon
 * @param {number} subtotal - Tổng tiền hàng
 * @param {number} shippingFee - Phí vận chuyển
 * @returns {Promise<Object>} Kết quả validate và discount
 */
export const validateAndApplyCoupon = async (userId, couponCode, subtotal, shippingFee) => {
    try {
        // Tìm coupon theo code
        const coupon = await prisma.coupon.findUnique({
            where: { code: couponCode }
        });

        if (!coupon) {
            return { success: false, message: 'Mã giảm giá không tồn tại' };
        }

        // Kiểm tra coupon còn active không
        if (!coupon.isActive) {
            return { success: false, message: 'Mã giảm giá đã bị vô hiệu hóa' };
        }

        // Kiểm tra thời gian
        const now = new Date();
        if (now < coupon.startDate || now > coupon.endDate) {
            return { success: false, message: 'Mã giảm giá đã hết hạn hoặc chưa đến thời gian sử dụng' };
        }

        // Kiểm tra số lần sử dụng tổng
        if (coupon.usedCount >= coupon.usageLimit) {
            return { success: false, message: 'Mã giảm giá đã hết lượt sử dụng' };
        }

        // Kiểm tra user có mã này không (trong UserCoupon)
        const userCoupon = await prisma.userCoupon.findUnique({
            where: {
                userId_couponId: {
                    userId,
                    couponId: coupon.id
                }
            }
        });

        if (!userCoupon) {
            return { success: false, message: 'Bạn chưa sở hữu mã giảm giá này' };
        }

        // Kiểm tra mã đã được sử dụng chưa
        if (userCoupon.isUsed) {
            return { success: false, message: 'Mã giảm giá đã được sử dụng' };
        }

        // Kiểm tra hạn sử dụng của user
        if (now > userCoupon.expiresAt) {
            return { success: false, message: 'Mã giảm giá của bạn đã hết hạn' };
        }

        // Kiểm tra số lần user đã dùng loại mã này
        const userUsageCount = await prisma.couponUsage.count({
            where: { userId, couponId: coupon.id }
        });

        if (userUsageCount >= coupon.usageLimitPerUser) {
            return { success: false, message: 'Bạn đã sử dụng hết số lần cho phép của mã này' };
        }

        // Kiểm tra minimum amount
        if (subtotal < Number(coupon.minimumAmount)) {
            return {
                success: false,
                message: `Đơn hàng tối thiểu ${Number(coupon.minimumAmount).toLocaleString('vi-VN')}đ để sử dụng mã này`
            };
        }

        // Tính toán discount
        let discountAmount = 0;
        let discountShipping = 0;

        if (coupon.applyToShipping) {
            // Giảm phí vận chuyển
            if (coupon.discountType === 'AMOUNT') {
                discountShipping = Math.min(Number(coupon.discountValue), shippingFee);
            } else if (coupon.discountType === 'PERCENT') {
                discountShipping = Math.min((shippingFee * Number(coupon.discountValue)) / 100, shippingFee);
            }
        } else {
            // Giảm giá đơn hàng
            if (coupon.discountType === 'AMOUNT') {
                discountAmount = Number(coupon.discountValue);
            } else if (coupon.discountType === 'PERCENT') {
                discountAmount = (subtotal * Number(coupon.discountValue)) / 100;
            }
        }

        return {
            success: true,
            coupon,
            userCoupon,
            discountAmount,
            discountShipping,
            totalDiscount: discountAmount + discountShipping
        };
    } catch (error) {
        logger.error('Failed to validate coupon', { userId, couponCode, error: error.message });
        return { success: false, message: 'Lỗi khi kiểm tra mã giảm giá' };
    }
};

/**
 * Đánh dấu coupon đã được sử dụng
 * @param {number} userId - ID người dùng
 * @param {number} couponId - ID coupon
 * @param {number} orderId - ID đơn hàng
 */
export const markCouponAsUsed = async (userId, couponId, orderId) => {
    try {
        await prisma.$transaction(async (tx) => {
            // Cập nhật UserCoupon
            await tx.userCoupon.update({
                where: {
                    userId_couponId: {
                        userId,
                        couponId
                    }
                },
                data: {
                    isUsed: true,
                    usedAt: new Date()
                }
            });

            // Tăng usedCount của Coupon
            await tx.coupon.update({
                where: { id: couponId },
                data: {
                    usedCount: { increment: 1 }
                }
            });

            // Tạo CouponUsage record
            await tx.couponUsage.create({
                data: {
                    userId,
                    couponId,
                    orderId
                }
            });
        });

        logger.info('Coupon marked as used', { userId, couponId, orderId });
    } catch (error) {
        logger.error('Failed to mark coupon as used', { userId, couponId, orderId, error: error.message });
        throw error;
    }
};

/**
 * Tặng mã chào mừng cho user mới đăng ký
 * @param {number} userId - ID người dùng
 * @returns {Promise<Object|null>} UserCoupon đã tạo hoặc null
 */
export const grantWelcomeCoupon = async (userId) => {
    try {
        // Tìm coupon GENERAL có code WELCOME (hoặc tạo sẵn trong seed)
        const welcomeCoupon = await prisma.coupon.findFirst({
            where: {
                code: 'WELCOME200K', // Mã chào mừng 200k
                isActive: true,
                startDate: { lte: new Date() },
                endDate: { gte: new Date() }
            }
        });

        if (!welcomeCoupon) {
            logger.warn('Welcome coupon not found or inactive');
            return null;
        }

        // Kiểm tra xem user đã nhận mã này chưa
        const existingUserCoupon = await prisma.userCoupon.findUnique({
            where: {
                userId_couponId: {
                    userId,
                    couponId: welcomeCoupon.id
                }
            }
        });

        if (existingUserCoupon) {
            return null; // Đã nhận rồi
        }

        // Tạo UserCoupon mới (tặng mã cho user)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // Hết hạn sau 30 ngày

        const userCoupon = await prisma.userCoupon.create({
            data: {
                userId,
                couponId: welcomeCoupon.id,
                expiresAt
            },
            include: {
                coupon: true
            }
        });

        logger.info('Welcome coupon granted', { userId, couponId: welcomeCoupon.id });
        return userCoupon;
    } catch (error) {
        logger.error('Failed to grant welcome coupon', { userId, error: error.message });
        return null;
    }
};
