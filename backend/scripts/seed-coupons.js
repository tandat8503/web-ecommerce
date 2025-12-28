// scripts/seed-coupons.js
import prisma from '../config/prisma.js';

async function seedCoupons() {
    console.log('🌱 Seeding coupons...');

    const now = new Date();
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

    try {
        // 1. Welcome Coupon - 200k
        const welcomeCoupon = await prisma.coupon.upsert({
            where: { code: 'WELCOME200K' },
            update: {},
            create: {
                code: 'WELCOME200K',
                name: 'Chào mừng khách hàng mới',
                description: 'Giảm 200.000đ cho đơn hàng từ 2 triệu',
                promotionType: 'GENERAL',
                discountType: 'AMOUNT',
                discountValue: 200000,
                minimumAmount: 2000000,
                usageLimit: 10000,
                usageLimitPerUser: 1,
                startDate: now,
                endDate: oneYearLater,
                isActive: true,
                applyToShipping: false
            }
        });
        console.log('✅ Created WELCOME200K coupon');

        // 2. First Order Coupon - 300k
        const firstOrderCoupon = await prisma.coupon.upsert({
            where: { code: 'FIRST300K' },
            update: {},
            create: {
                code: 'FIRST300K',
                name: 'Giảm 300k cho đơn hàng đầu tiên',
                description: 'Tặng mã 300k sau khi hoàn thành đơn đầu',
                promotionType: 'FIRST_ORDER',
                discountType: 'AMOUNT',
                discountValue: 300000,
                minimumAmount: 500000,
                usageLimit: 10000,
                usageLimitPerUser: 1,
                startDate: now,
                endDate: oneYearLater,
                isActive: true,
                applyToShipping: false
            }
        });
        console.log('✅ Created FIRST300K coupon');

        // 3. First Review Coupon - 100k
        const firstReviewCoupon = await prisma.coupon.upsert({
            where: { code: 'REVIEW100K' },
            update: {},
            create: {
                code: 'REVIEW100K',
                name: 'Giảm 100k khi đánh giá sản phẩm',
                description: 'Tặng mã 100k sau review đầu tiên',
                promotionType: 'FIRST_REVIEW',
                discountType: 'AMOUNT',
                discountValue: 100000,
                minimumAmount: 200000,
                usageLimit: 10000,
                usageLimitPerUser: 1,
                startDate: now,
                endDate: oneYearLater,
                isActive: true,
                applyToShipping: false
            }
        });
        console.log('✅ Created REVIEW100K coupon');

        // 4. Free Shipping Coupon - 30k
        const freeShipCoupon = await prisma.coupon.upsert({
            where: { code: 'FREESHIP30K' },
            update: {},
            create: {
                code: 'FREESHIP30K',
                name: 'Miễn phí vận chuyển',
                description: 'Giảm 30k phí vận chuyển',
                promotionType: 'SHIPPING',
                discountType: 'AMOUNT',
                discountValue: 30000,
                minimumAmount: 0,
                usageLimit: 10000,
                usageLimitPerUser: 5,
                startDate: now,
                endDate: oneYearLater,
                isActive: true,
                applyToShipping: true
            }
        });
        console.log('✅ Created FREESHIP30K coupon');

        // 5. Seasonal Coupon - 15% off
        const seasonalCoupon = await prisma.coupon.upsert({
            where: { code: 'SUMMER15' },
            update: {},
            create: {
                code: 'SUMMER15',
                name: 'Giảm 15% mùa hè',
                description: 'Giảm 15% cho đơn hàng từ 1 triệu',
                promotionType: 'SEASONAL',
                discountType: 'PERCENT',
                discountValue: 15,
                minimumAmount: 1000000,
                usageLimit: 5000,
                usageLimitPerUser: 3,
                startDate: now,
                endDate: oneYearLater,
                isActive: true,
                applyToShipping: false
            }
        });
        console.log('✅ Created SUMMER15 coupon');

        console.log('\n🎉 Seeding completed successfully!');
        console.log(`Total coupons created: 5`);
    } catch (error) {
        console.error('❌ Error seeding coupons:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

seedCoupons()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
