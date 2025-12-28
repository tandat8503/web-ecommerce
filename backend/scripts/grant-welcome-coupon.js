import prisma from '../config/prisma.js';

const grantWelcomeCoupon = async (userId) => {
    try {
        // Find welcome coupon
        const welcomeCoupon = await prisma.coupon.findFirst({
            where: {
                code: 'WELCOME200K',
                isActive: true,
                startDate: { lte: new Date() },
                endDate: { gte: new Date() }
            }
        });

        if (!welcomeCoupon) {
            console.log('❌ Welcome coupon not found');
            return;
        }

        console.log('✅ Found coupon:', welcomeCoupon.code);

        // Check if user already has this coupon
        const existingUserCoupon = await prisma.userCoupon.findUnique({
            where: {
                userId_couponId: {
                    userId,
                    couponId: welcomeCoupon.id
                }
            }
        });

        if (existingUserCoupon) {
            console.log('⚠️  User already has this coupon');
            return;
        }

        // Create UserCoupon
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

        const userCoupon = await prisma.userCoupon.create({
            data: {
                userId,
                couponId: welcomeCoupon.id,
                expiresAt
            },
            include: { coupon: true }
        });

        console.log('🎉 Successfully granted coupon to user!');
        console.log('UserCoupon:', userCoupon);
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
};

// Get userId from command line or use latest user
const userId = process.argv[2] ? parseInt(process.argv[2]) : null;

if (userId) {
    grantWelcomeCoupon(userId);
} else {
    // Get latest user
    prisma.user.findFirst({
        orderBy: { createdAt: 'desc' }
    }).then(user => {
        if (user) {
            console.log(`Granting coupon to latest user: ${user.email} (ID: ${user.id})`);
            grantWelcomeCoupon(user.id);
        } else {
            console.log('No users found');
            prisma.$disconnect();
        }
    });
}
