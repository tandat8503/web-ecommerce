import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generateDataSummary() {
    console.log('📊 E-COMMERCE DATABASE SUMMARY');
    console.log('='.repeat(60));

    // Date Range
    const oldestOrder = await prisma.order.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true }
    });

    const newestOrder = await prisma.order.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
    });

    if (oldestOrder && newestOrder) {
        const days = Math.ceil((newestOrder.createdAt - oldestOrder.createdAt) / (1000 * 60 * 60 * 24));
        console.log(`\n📅 DATE RANGE: ${days} days (Nov 2025 - Jan 18, 2026)`);
    }

    // User Stats
    console.log('\n👥 USERS:');
    const totalUsers = await prisma.user.count();
    const customers = await prisma.user.count({ where: { role: 'CUSTOMER' } });
    const admins = await prisma.user.count({ where: { role: 'ADMIN' } });
    console.log(`   Total: ${totalUsers} (${customers} customers, ${admins} admins)`);

    // Product Stats
    console.log('\n🛍️  PRODUCTS:');
    const totalProducts = await prisma.product.count();
    const activeProducts = await prisma.product.count({ where: { status: 'ACTIVE' } });
    const variants = await prisma.productVariant.count();
    const images = await prisma.productImage.count();
    console.log(`   Products: ${totalProducts} (${activeProducts} active)`);
    console.log(`   Variants: ${variants} (avg ${(variants / totalProducts).toFixed(1)} per product)`);
    console.log(`   Images: ${images} (avg ${(images / totalProducts).toFixed(1)} per product)`);

    // Engagement Stats
    console.log('\n💬 ENGAGEMENT:');
    const comments = await prisma.productComment.count({ where: { parentId: null } });
    const replies = await prisma.productComment.count({ where: { NOT: { parentId: null } } });
    const reviews = await prisma.productReview.count();
    const avgReviewRating = await prisma.productReview.aggregate({
        _avg: { rating: true }
    });
    console.log(`   Comments: ${comments} (+ ${replies} replies)`);
    console.log(`   Reviews: ${reviews} (avg rating: ${avgReviewRating._avg.rating?.toFixed(2) || 'N/A'}⭐)`);

    // Products with comments
    const productsWithComments = await prisma.product.count({
        where: { comments: { some: {} } }
    });
    console.log(`   Products with comments: ${productsWithComments}/${totalProducts} (${((productsWithComments / totalProducts) * 100).toFixed(1)}%)`);

    // Order Stats
    console.log('\n📦 ORDERS:');
    const totalOrders = await prisma.order.count();
    const ordersByStatus = await prisma.$queryRaw`
    SELECT status, COUNT(*) as count 
    FROM orders 
    GROUP BY status
  `;

    console.log(`   Total: ${totalOrders}`);
    ordersByStatus.forEach(row => {
        console.log(`   ${row.status}: ${row.count}`);
    });

    // Revenue Stats
    const revenueStats = await prisma.order.aggregate({
        _sum: { totalAmount: true },
        _avg: { totalAmount: true },
        where: { paymentStatus: 'PAID' }
    });

    const totalRevenue = revenueStats._sum.totalAmount || 0;
    const avgOrderValue = revenueStats._avg.totalAmount || 0;

    console.log(`\n💰 REVENUE:`);
    console.log(`   Total Revenue: ${parseInt(totalRevenue).toLocaleString('vi-VN')}đ`);
    console.log(`   Avg Order Value: ${parseInt(avgOrderValue).toLocaleString('vi-VN')}đ`);

    // Payment Methods
    const paymentMethods = await prisma.$queryRaw`
    SELECT payment_method, COUNT(*) as count 
    FROM orders 
    GROUP BY payment_method
  `;

    console.log(`\n💳 PAYMENT METHODS:`);
    paymentMethods.forEach(row => {
        const percentage = ((row.count / totalOrders) * 100).toFixed(1);
        console.log(`   ${row.payment_method}: ${row.count} (${percentage}%)`);
    });

    // Orders by Month
    const ordersByMonth = await prisma.$queryRaw`
    SELECT 
      DATE_FORMAT(created_at, '%Y-%m') as month,
      COUNT(*) as count,
      SUM(total_amount) as revenue
    FROM orders
    WHERE payment_status = 'PAID'
    GROUP BY month
    ORDER BY month
  `;

    console.log(`\n📊 ORDERS BY MONTH:`);
    const monthNames = {
        '2025-11': 'Nov 2025',
        '2025-12': 'Dec 2025',
        '2026-01': 'Jan 2026',
    };

    ordersByMonth.forEach(row => {
        const monthName = monthNames[row.month] || row.month;
        const revenue = parseInt(row.revenue || 0);
        console.log(`   ${monthName}: ${row.count} orders, ${revenue.toLocaleString('vi-VN')}đ`);
    });

    // Promotion Stats
    console.log(`\n🎫 PROMOTIONS:`);
    const totalCoupons = await prisma.coupon.count();
    const activeCoupons = await prisma.coupon.count({
        where: {
            isActive: true,
            endDate: { gte: new Date() }
        }
    });
    const couponUsages = await prisma.couponUsage.count();
    const userCoupons = await prisma.userCoupon.count();

    console.log(`   Total Coupons: ${totalCoupons} (${activeCoupons} active)`);
    console.log(`   User Coupons: ${userCoupons}`);
    console.log(`   Times Used: ${couponUsages}`);

    // Other Stats
    console.log(`\n📋 OTHER:`);
    const wishlist = await prisma.wishlist.count();
    const cart = await prisma.shoppingCart.count();
    const notifications = await prisma.notification.count();
    const unreadNotifications = await prisma.notification.count({ where: { isRead: false } });

    console.log(`   Wishlist Items: ${wishlist}`);
    console.log(`   Shopping Cart: ${cart}`);
    console.log(`   Notifications: ${notifications} (${unreadNotifications} unread)`);

    // Dashboard Readiness Check
    console.log(`\n✅ DASHBOARD READINESS CHECK:`);
    const checks = [
        { name: 'Orders > 100', status: totalOrders > 100, value: totalOrders },
        { name: 'Date range > 30 days', status: oldestOrder && newestOrder && ((newestOrder.createdAt - oldestOrder.createdAt) / (1000 * 60 * 60 * 24)) > 30, value: `${Math.ceil((newestOrder.createdAt - oldestOrder.createdAt) / (1000 * 60 * 60 * 24))} days` },
        { name: 'Products with comments > 50%', status: (productsWithComments / totalProducts) > 0.5, value: `${((productsWithComments / totalProducts) * 100).toFixed(1)}%` },
        { name: 'Reviews > 30', status: reviews > 30, value: reviews },
        { name: 'All months have data', status: ordersByMonth.length >= 2, value: `${ordersByMonth.length} months` },
    ];

    checks.forEach(check => {
        const icon = check.status ? '✅' : '❌';
        console.log(`   ${icon} ${check.name}: ${check.value}`);
    });

    const allPassed = checks.every(c => c.status);

    console.log('\n' + '='.repeat(60));
    if (allPassed) {
        console.log('🎉 READY! Dashboard có đủ dữ liệu để hiển thị.');
    } else {
        console.log('⚠️  Cần bổ sung thêm dữ liệu cho một số metrics.');
    }
    console.log('='.repeat(60));
}

async function main() {
    try {
        await generateDataSummary();
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
