import prisma from '../config/prisma.js';

const checkUserCoupons = async () => {
    try {
        // Get latest user
        const latestUser = await prisma.user.findFirst({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                createdAt: true
            }
        });

        console.log('Latest user:', latestUser);

        if (latestUser) {
            const userCoupons = await prisma.userCoupon.findMany({
                where: { userId: latestUser.id },
                include: { coupon: true }
            });

            console.log(`\nUser coupons (${userCoupons.length}):`, userCoupons);
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
};

checkUserCoupons();
