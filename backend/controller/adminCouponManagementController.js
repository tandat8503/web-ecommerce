// controller/adminCouponManagementController.js
import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';

/**
 * Lấy danh sách tất cả các mã giảm giá (Admin)
 */
export const getAllCoupons = async (req, res) => {
    try {
        const { page = 1, limit = 10, promotionType, isActive } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const where = {};
        if (promotionType) where.promotionType = promotionType;
        if (isActive !== undefined) where.isActive = isActive === 'true';

        const [coupons, total] = await Promise.all([
            prisma.coupon.findMany({
                where,
                include: {
                    _count: {
                        select: {
                            usages: true,
                            userCoupons: true
                        }
                    }
                },
                // usedCount đã có sẵn trong model Coupon, không cần select riêng
                orderBy: { createdAt: 'desc' },
                skip,
                take: Number(limit)
            }),
            prisma.coupon.count({ where })
        ]);

        return res.json({
            success: true,
            data: {
                coupons,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(total / Number(limit))
                }
            }
        });
    } catch (error) {
        logger.error('Failed to get coupons', { error: error.message });
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách mã giảm giá',
            error: error.message
        });
    }
};

/**
 * Tạo mã giảm giá mới (Admin)
 */
export const createCoupon = async (req, res) => {
    try {
        const {
            code,
            name,
            description,
            promotionType,
            discountType,
            discountValue,
            applyToShipping,
            minimumAmount,
            usageLimit,
            usageLimitPerUser,
            startDate,
            endDate,
            isActive
        } = req.body;

        // Validation
        if (!code || !name || !promotionType || !discountType || !discountValue || !startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc'
            });
        }

        // Kiểm tra code đã tồn tại chưa
        const existingCoupon = await prisma.coupon.findUnique({
            where: { code }
        });

        if (existingCoupon) {
            return res.status(409).json({
                success: false,
                message: 'Mã giảm giá đã tồn tại'
            });
        }

        // Tạo coupon mới
        const coupon = await prisma.coupon.create({
            data: {
                code,
                name,
                description,
                promotionType,
                discountType,
                discountValue: Number(discountValue),
                applyToShipping: applyToShipping || false,
                minimumAmount: Number(minimumAmount) || 0,
                usageLimit: Number(usageLimit) || 100,
                usageLimitPerUser: Number(usageLimitPerUser) || 1,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                isActive: isActive !== undefined ? isActive : true
            }
        });

        logger.info('Coupon created', { couponId: coupon.id, code: coupon.code });

        return res.status(201).json({
            success: true,
            message: 'Tạo mã giảm giá thành công',
            data: coupon
        });
    } catch (error) {
        logger.error('Failed to create coupon', { error: error.message });
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo mã giảm giá',
            error: error.message
        });
    }
};

/**
 * Cập nhật mã giảm giá (Admin)
 */
export const updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            discountType,
            discountValue,
            applyToShipping,
            minimumAmount,
            usageLimit,
            usageLimitPerUser,
            startDate,
            endDate,
            isActive
        } = req.body;

        const coupon = await prisma.coupon.findUnique({
            where: { id: Number(id) }
        });

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy mã giảm giá'
            });
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (discountType !== undefined) updateData.discountType = discountType;
        if (discountValue !== undefined) updateData.discountValue = Number(discountValue);
        if (applyToShipping !== undefined) updateData.applyToShipping = applyToShipping;
        if (minimumAmount !== undefined) updateData.minimumAmount = Number(minimumAmount);
        if (usageLimit !== undefined) updateData.usageLimit = Number(usageLimit);
        if (usageLimitPerUser !== undefined) updateData.usageLimitPerUser = Number(usageLimitPerUser);
        if (startDate !== undefined) updateData.startDate = new Date(startDate);
        if (endDate !== undefined) updateData.endDate = new Date(endDate);
        if (isActive !== undefined) updateData.isActive = isActive;

        const updatedCoupon = await prisma.coupon.update({
            where: { id: Number(id) },
            data: updateData
        });

        logger.info('Coupon updated', { couponId: updatedCoupon.id });

        return res.json({
            success: true,
            message: 'Cập nhật mã giảm giá thành công',
            data: updatedCoupon
        });
    } catch (error) {
        logger.error('Failed to update coupon', { error: error.message });
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật mã giảm giá',
            error: error.message
        });
    }
};

/**
 * Xóa mã giảm giá (Admin)
 */
export const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;

        const coupon = await prisma.coupon.findUnique({
            where: { id: Number(id) },
            include: {
                _count: {
                    select: {
                        usages: true
                    }
                }
            }
        });

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy mã giảm giá'
            });
        }

        // Nếu đã có người sử dụng, chỉ vô hiệu hóa thay vì xóa
        if (coupon._count.usages > 0) {
            await prisma.coupon.update({
                where: { id: Number(id) },
                data: { isActive: false }
            });

            return res.json({
                success: true,
                message: 'Mã giảm giá đã được vô hiệu hóa (đã có người sử dụng)'
            });
        }

        // Xóa hoàn toàn nếu chưa ai sử dụng
        await prisma.coupon.delete({
            where: { id: Number(id) }
        });

        logger.info('Coupon deleted', { couponId: Number(id) });

        return res.json({
            success: true,
            message: 'Xóa mã giảm giá thành công'
        });
    } catch (error) {
        logger.error('Failed to delete coupon', { error: error.message });
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa mã giảm giá',
            error: error.message
        });
    }
};

/**
 * Lấy chi tiết mã giảm giá (Admin)
 */
export const getCouponById = async (req, res) => {
    try {
        const { id } = req.params;

        const coupon = await prisma.coupon.findUnique({
            where: { id: Number(id) },
            include: {
                usages: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true
                            }
                        },
                        order: {
                            select: {
                                id: true,
                                orderNumber: true,
                                totalAmount: true
                            }
                        }
                    },
                    orderBy: { usedAt: 'desc' },
                    take: 50
                },
                _count: {
                    select: {
                        usages: true,
                        userCoupons: true
                    }
                }
            }
        });

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy mã giảm giá'
            });
        }

        return res.json({
            success: true,
            data: coupon
        });
    } catch (error) {
        logger.error('Failed to get coupon detail', { error: error.message });
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy chi tiết mã giảm giá',
            error: error.message
        });
    }
};

/**
 * Thống kê sử dụng mã giảm giá (Admin)
 */
export const getCouponStats = async (req, res) => {
    try {
        const stats = await prisma.coupon.groupBy({
            by: ['promotionType'],
            _count: {
                id: true
            },
            _sum: {
                usedCount: true
            }
        });

        const totalCoupons = await prisma.coupon.count();
        const activeCoupons = await prisma.coupon.count({
            where: { isActive: true }
        });

        return res.json({
            success: true,
            data: {
                totalCoupons,
                activeCoupons,
                byType: stats
            }
        });
    } catch (error) {
        logger.error('Failed to get coupon stats', { error: error.message });
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thống kê mã giảm giá',
            error: error.message
        });
    }
};
