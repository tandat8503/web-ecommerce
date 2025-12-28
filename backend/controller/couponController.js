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

        const where = { userId };
        const now = new Date();

        if (status === 'available') {
            where.isUsed = false;
            where.expiresAt = { gte: now };
        } else if (status === 'used') {
            where.isUsed = true;
        } else if (status === 'expired') {
            where.isUsed = false;
            where.expiresAt = { lt: now };
        }

        const userCoupons = await prisma.userCoupon.findMany({
            where,
            include: {
                coupon: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return res.json({
            success: true,
            data: userCoupons
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
