import prisma from '../config/prisma.js';

const checkCoupon = async () => {
    try {
        const coupon = await prisma.coupon.findFirst({
            where: {
                code: 'WELCOME200K',
                isActive: true,
                startDate: { lte: new Date() },
                endDate: { gte: new Date() }
            }
        });

        console.log('✅ WELCOME200K coupon:', coupon);

        if (!coupon) {
            console.log('\n❌ Coupon not found or not active!');
            console.log('Checking all coupons with code WELCOME200K...');
            const allCoupons = await prisma.coupon.findMany({
                where: { code: 'WELCOME200K' }
            });
            console.log('All WELCOME200K coupons:', allCoupons);
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
};

checkCoupon();
