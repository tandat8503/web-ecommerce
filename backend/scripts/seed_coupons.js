// scripts/seed_promotions.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding promotions...');

    // Xóa dữ liệu cũ (nếu có)
    await prisma.userCoupon.deleteMany({});
    await prisma.couponUsage.deleteMany({});
    await prisma.coupon.deleteMany({
        where: {
            promotionType: {
                in: ['FIRST_ORDER', 'FIRST_REVIEW', 'SHIPPING_DISCOUNT']
            }
        }
    });

    const now = new Date();
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

    // 1. Mã giảm giá 300k cho đơn hàng đầu tiên
    const firstOrderCoupon = await prisma.coupon.create({
        data: {
            code: 'FIRST300K',
            name: 'Giảm 300k cho đơn hàng đầu tiên',
            description: 'Mã giảm giá 300.000đ dành cho khách hàng mua hàng lần đầu',
            promotionType: 'FIRST_ORDER',
            discountType: 'AMOUNT',
            discountValue: 300000,
            applyToShipping: false,
            minimumAmount: 500000, // Đơn tối thiểu 500k
            usageLimit: 10000,
            usageLimitPerUser: 1,
            startDate: now,
            endDate: oneYearLater,
            isActive: true
        }
    });
    console.log('✅ Created FIRST_ORDER coupon:', firstOrderCoupon.code);

    // 2. Mã giảm giá 100k cho đánh giá đầu tiên
    const firstReviewCoupon = await prisma.coupon.create({
        data: {
            code: 'REVIEW100K',
            name: 'Giảm 100k khi đánh giá sản phẩm',
            description: 'Mã giảm giá 100.000đ dành cho khách hàng đánh giá sản phẩm lần đầu',
            promotionType: 'FIRST_REVIEW',
            discountType: 'AMOUNT',
            discountValue: 100000,
            applyToShipping: false,
            minimumAmount: 200000, // Đơn tối thiểu 200k
            usageLimit: 10000,
            usageLimitPerUser: 1,
            startDate: now,
            endDate: oneYearLater,
            isActive: true
        }
    });
    console.log('✅ Created FIRST_REVIEW coupon:', firstReviewCoupon.code);

    // 3. Các mã giảm phí vận chuyển
    const shippingCoupons = [
        {
            code: 'FREESHIP30K',
            name: 'Miễn phí vận chuyển 30k',
            description: 'Giảm 30.000đ phí vận chuyển cho đơn hàng từ 300k',
            discountValue: 30000,
            minimumAmount: 300000
        },
        {
            code: 'FREESHIP50K',
            name: 'Miễn phí vận chuyển 50k',
            description: 'Giảm 50.000đ phí vận chuyển cho đơn hàng từ 500k',
            discountValue: 50000,
            minimumAmount: 500000
        },
        {
            code: 'FREESHIP100K',
            name: 'Miễn phí vận chuyển 100k',
            description: 'Giảm 100.000đ phí vận chuyển cho đơn hàng từ 1 triệu',
            discountValue: 100000,
            minimumAmount: 1000000
        }
    ];

    for (const couponData of shippingCoupons) {
        const coupon = await prisma.coupon.create({
            data: {
                ...couponData,
                promotionType: 'SHIPPING_DISCOUNT',
                discountType: 'AMOUNT',
                applyToShipping: true,
                usageLimit: 1000,
                usageLimitPerUser: 10, // Mỗi user dùng được 10 lần
                startDate: now,
                endDate: oneYearLater,
                isActive: true
            }
        });
        console.log('✅ Created SHIPPING_DISCOUNT coupon:', coupon.code);
    }

    // 4. Một số mã giảm giá chung
    const generalCoupons = [
        {
            code: 'SUMMER2025',
            name: 'Giảm 10% mùa hè 2025',
            description: 'Giảm 10% cho đơn hàng từ 1 triệu',
            discountType: 'PERCENT',
            discountValue: 10,
            minimumAmount: 1000000
        },
        {
            code: 'WELCOME200K',
            name: 'Chào mừng khách hàng mới',
            description: 'Giảm 200.000đ cho đơn hàng từ 2 triệu',
            discountType: 'AMOUNT',
            discountValue: 200000,
            minimumAmount: 2000000
        }
    ];

    for (const couponData of generalCoupons) {
        const coupon = await prisma.coupon.create({
            data: {
                ...couponData,
                promotionType: 'GENERAL',
                applyToShipping: false,
                usageLimit: 500,
                usageLimitPerUser: 3,
                startDate: now,
                endDate: oneYearLater,
                isActive: true
            }
        });
        console.log('✅ Created GENERAL coupon:', coupon.code);
    }

    console.log('');
    console.log('🎉 Promotion seeding completed!');
    console.log('');
    console.log('📊 Summary:');
    console.log('- FIRST_ORDER: 1 coupon (300k)');
    console.log('- FIRST_REVIEW: 1 coupon (100k)');
    console.log('- SHIPPING_DISCOUNT: 3 coupons');
    console.log('- GENERAL: 2 coupons');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error('❌ Seed error:', e);
        await prisma.$disconnect();
        process.exit(1);
    });
