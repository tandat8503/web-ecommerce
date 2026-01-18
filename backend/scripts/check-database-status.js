import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkDatabaseStatus() {
    console.log('📊 Checking database status...\n');

    try {
        const stats = {
            users: await prisma.user.count(),
            categories: await prisma.category.count(),
            brands: await prisma.brand.count(),
            products: await prisma.product.count(),
            productVariants: await prisma.productVariant.count(),
            productImages: await prisma.productImage.count(),
            productComments: await prisma.productComment.count(),
            productReviews: await prisma.productReview.count(),
            orders: await prisma.order.count(),
            orderItems: await prisma.orderItem.count(),
            payments: await prisma.payment.count(),
            coupons: await prisma.coupon.count(),
            userCoupons: await prisma.userCoupon.count(),
            couponUsages: await prisma.couponUsage.count(),
            addresses: await prisma.address.count(),
            shoppingCart: await prisma.shoppingCart.count(),
            wishlist: await prisma.wishlist.count(),
            banners: await prisma.banner.count(),
            notifications: await prisma.notification.count(),
            loginHistory: await prisma.loginHistory.count(),
        };

        console.log('Current Database Records:');
        console.log('========================');
        Object.entries(stats).forEach(([table, count]) => {
            const icon = count > 0 ? '✅' : '❌';
            console.log(`${icon} ${table.padEnd(20)}: ${count}`);
        });

        // Check date range for orders
        if (stats.orders > 0) {
            const oldestOrder = await prisma.order.findFirst({
                orderBy: { createdAt: 'asc' },
                select: { createdAt: true, orderNumber: true }
            });
            const newestOrder = await prisma.order.findFirst({
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true, orderNumber: true }
            });

            console.log('\n📅 Order Date Range:');
            console.log(`   Oldest: ${oldestOrder.createdAt.toISOString()} (${oldestOrder.orderNumber})`);
            console.log(`   Newest: ${newestOrder.createdAt.toISOString()} (${newestOrder.orderNumber})`);

            const daysDiff = Math.floor((newestOrder.createdAt - oldestOrder.createdAt) / (1000 * 60 * 60 * 24));
            console.log(`   Range: ${daysDiff} days`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkDatabaseStatus();
