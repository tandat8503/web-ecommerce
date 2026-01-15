// controller/couponController.js
import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';
import { validateAndApplyCoupon } from '../services/couponService.js';

/**
 * Get user's coupons
 * GET /api/coupons/my-coupons
 */
export const getUserCoupons = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status } = req.query; // available, used, expired
        const now = new Date();

        const userCoupons = await prisma.userCoupon.findMany({
            where: { userId },
            include: {
                coupon: true
            },
            orderBy: { createdAt: 'desc' }
        });

        //mã giảm giá có thể sử dụng theo logic sau:
        //1. mã giảm giá có thể sử dụng khi chưa hết hạn
        //2. mã giảm giá có thể sử dụng khi chưa đạt đến số lượng sử dụng
        //3. mã giảm giá có thể sử dụng khi chưa hết hạn
        const filteredCoupons = userCoupons.filter(uc => {
            const coupon = uc.coupon;
            const isGloballyExpired = now > coupon.endDate;
            const isReachedLimit = coupon.usageLimit && coupon.usedCount >= coupon.usageLimit;
            const isInactive = !coupon.isActive;
            const isUserExpired = now > uc.expiresAt;
            
            if (status === 'available') {
                return !uc.isUsed && !isUserExpired && !isGloballyExpired && !isReachedLimit && !isInactive;
            } else if (status === 'used') {
                return uc.isUsed;
            } else if (status === 'expired') {
                // Return coupons that are NOT used but are either user-expired or globally invalid
                return !uc.isUsed && (isUserExpired || isGloballyExpired || isReachedLimit || isInactive);
            }
            return true;
        });

        return res.json({
            success: true,
            data: filteredCoupons
        });
    } catch (error) {
        logger.error('Get user coupons error', { error: error.message });
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách mã giảm giá'
        });
    }
};

/**
 * Validate coupon
 * POST /api/coupons/validate
 */
export const validateCoupon = async (req, res) => {
    try {
        const userId = req.user.id;
        const { couponCode, subtotal, shippingFee } = req.body;

        const result = await validateAndApplyCoupon(
            userId,
            couponCode,
            Number(subtotal),
            Number(shippingFee)
        );

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.message
            });
        }

        return res.json({
            success: true,
            data: {
                code: result.coupon.code,
                name: result.coupon.name,
                discountAmount: result.discountAmount,
                discountShipping: result.discountShipping,
                totalDiscount: result.totalDiscount,
                applyToShipping: result.coupon.applyToShipping
            }
        });
    } catch (error) {
        logger.error('Validate coupon error', { error: error.message });
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi kiểm tra mã giảm giá'
        });
    }
};
