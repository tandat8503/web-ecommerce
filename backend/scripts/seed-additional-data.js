import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

function randomDate(start, end) {
    return faker.date.between({ from: start, to: end });
}

async function fixAndSeedNotifications() {
    console.log('🔔 Fixing and seeding notifications...');

    const users = await prisma.user.findMany({
        where: { role: 'CUSTOMER' },
        select: { id: true, createdAt: true }
    });

    let notificationsCreated = 0;

    const welcomeNotifications = [
        { title: 'Chào mừng đến với cửa hàng! 🎉', message: 'Cảm ơn bạn đã đăng ký. Hãy khám phá các sản phẩm tuyệt vời của chúng tôi!' },
        { title: 'Mã giảm giá chào mừng 🎁', message: 'Bạn nhận được mã giảm giá 100.000đ cho đơn hàng đầu tiên!' },
    ];

    const promotionNotifications = [
        { title: 'Flash Sale 12h hôm nay! ⚡', message: 'Giảm giá lên đến 50% cho các sản phẩm nội thất. Nhanh tay đặt hàng!' },
        { title: 'Khuyến mãi cuối tuần 🎊', message: 'Freeship toàn quốc cho đơn hàng từ 500.000đ' },
        { title: 'Sản phẩm mới ra mắt! 🆕', message: 'Bộ sưu tập nội thất hiện đại mới nhất đã có mặt tại cửa hàng' },
        { title: 'Mã giảm giá đặc biệt 💝', message: 'Nhận ngay mã giảm 200.000đ cho đơn hàng từ 2.000.000đ' },
    ];

    for (const user of users) {
        // Welcome notification when user registers
        try {
            await prisma.notification.create({
                data: {
                    userId: user.id,
                    type: 'system',
                    title: welcomeNotifications[0].title,
                    message: welcomeNotifications[0].message,
                    isRead: true,
                    createdAt: user.createdAt,
                }
            });
            notificationsCreated++;
        } catch (error) {
            // Skip if duplicate
        }

        // Random promotion notifications (2-5 per user)
        const numPromos = Math.floor(Math.random() * 4) + 2;
        for (let i = 0; i < numPromos; i++) {
            const promo = promotionNotifications[Math.floor(Math.random() * promotionNotifications.length)];
            const promoDate = randomDate(user.createdAt, new Date());

            try {
                await prisma.notification.create({
                    data: {
                        userId: user.id,
                        type: 'promotion',
                        title: promo.title,
                        message: promo.message,
                        isRead: Math.random() < 0.3, // 30% read
                        createdAt: promoDate,
                    }
                });
                notificationsCreated++;
            } catch (error) {
                // Skip if error
            }
        }
    }

    console.log(`✅ Created ${notificationsCreated} notifications`);
}

async function distributeOrdersEvenly() {
    console.log('📦 Checking order distribution...');

    const orders = await prisma.order.findMany({
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' }
    });

    if (orders.length === 0) {
        console.log('❌ No orders found');
        return;
    }

    const startDate = new Date(orders[0].createdAt);
    const endDate = new Date(orders[orders.length - 1].createdAt);
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    console.log(`📊 Current orders: ${orders.length}`);
    console.log(`📅 Date range: ${totalDays} days`);
    console.log(`📈 Average: ${(orders.length / totalDays).toFixed(2)} orders/day`);

    // Group orders by date
    const ordersByDate = {};
    orders.forEach(order => {
        const dateKey = order.createdAt.toISOString().split('T')[0];
        ordersByDate[dateKey] = (ordersByDate[dateKey] || 0) + 1;
    });

    const datesWithOrders = Object.keys(ordersByDate).length;
    const datesWithoutOrders = totalDays - datesWithOrders;

    console.log(`✅ Days with orders: ${datesWithOrders}`);
    console.log(`❌ Days without orders: ${datesWithoutOrders}`);
    console.log(`📊 Coverage: ${((datesWithOrders / totalDays) * 100).toFixed(1)}%`);
}

async function main() {
    console.log('🌱 Running additional seeding tasks...\n');

    try {
        await fixAndSeedNotifications();
        await distributeOrdersEvenly();

        console.log('\n✅ Additional seeding completed!');
        console.log('\n📊 Run check-database-status.js to see final results.');
    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
