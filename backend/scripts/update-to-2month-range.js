import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Target date range: Nov 1, 2025 to Jan 18, 2026
const START_DATE = new Date('2025-11-01T00:00:00.000Z');
const END_DATE = new Date('2026-01-18T23:59:59.999Z');

function randomDate(start, end) {
    const startTime = start.getTime();
    const endTime = end.getTime();
    const randomTime = startTime + Math.random() * (endTime - startTime);
    return new Date(randomTime);
}

async function updateOrderDates() {
    console.log('📅 Updating order dates to 2-month range (Nov 2025 - Jan 18, 2026)...\n');

    // Get all orders
    const orders = await prisma.order.findMany({
        include: {
            orderItems: true,
            payments: true,
            statusHistory: true,
            reviews: true,
            couponUsages: true,
            user: true,
        },
        orderBy: { createdAt: 'asc' }
    });

    console.log(`Found ${orders.length} orders to update`);

    let updated = 0;
    let deleted = 0;

    for (const order of orders) {
        const oldDate = new Date(order.createdAt);

        // If order is way outside our range, delete it
        if (oldDate < new Date('2025-10-01') || oldDate > new Date('2026-02-01')) {
            try {
                // Delete related records first
                await prisma.couponUsage.deleteMany({ where: { orderId: order.id } });
                await prisma.productReview.deleteMany({ where: { orderId: order.id } });
                await prisma.orderStatusHistory.deleteMany({ where: { orderId: order.id } });
                await prisma.payment.deleteMany({ where: { orderId: order.id } });
                await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
                await prisma.order.delete({ where: { id: order.id } });
                deleted++;
                continue;
            } catch (error) {
                console.error(`Error deleting order ${order.id}:`, error.message);
                continue;
            }
        }

        // Generate new date within our 2-month range
        const newCreatedAt = randomDate(START_DATE, END_DATE);

        try {
            // Update order
            await prisma.order.update({
                where: { id: order.id },
                data: {
                    createdAt: newCreatedAt,
                    updatedAt: newCreatedAt,
                }
            });

            // Update order items
            for (const item of order.orderItems) {
                await prisma.orderItem.update({
                    where: { id: item.id },
                    data: { createdAt: newCreatedAt }
                });
            }

            // Update payments (paid 0-3 hours after order)
            for (const payment of order.payments) {
                const paymentDate = new Date(newCreatedAt.getTime() + Math.random() * 3 * 60 * 60 * 1000);
                const paidAt = payment.paymentStatus === 'PAID'
                    ? paymentDate
                    : null;

                await prisma.payment.update({
                    where: { id: payment.id },
                    data: {
                        createdAt: paymentDate,
                        paidAt: paidAt,
                        payDate: paidAt,
                    }
                });
            }

            // Update order status history
            for (const history of order.statusHistory) {
                const historyDate = new Date(newCreatedAt.getTime() + Math.random() * 24 * 60 * 60 * 1000);
                await prisma.orderStatusHistory.update({
                    where: { id: history.id },
                    data: { createdAt: historyDate }
                });
            }

            // Update reviews (1-10 days after order for delivered orders)
            for (const review of order.reviews) {
                if (order.status === 'DELIVERED') {
                    const reviewDate = new Date(newCreatedAt.getTime() + (Math.random() * 10 + 1) * 24 * 60 * 60 * 1000);
                    await prisma.productReview.update({
                        where: { id: review.id },
                        data: {
                            createdAt: reviewDate,
                            updatedAt: reviewDate,
                        }
                    });
                }
            }

            // Update coupon usages
            for (const usage of order.couponUsages) {
                await prisma.couponUsage.update({
                    where: { id: usage.id },
                    data: { usedAt: newCreatedAt }
                });
            }

            updated++;

            if (updated % 10 === 0) {
                console.log(`Progress: ${updated}/${orders.length} orders updated`);
            }
        } catch (error) {
            console.error(`Error updating order ${order.id}:`, error.message);
        }
    }

    console.log(`\n✅ Updated ${updated} orders`);
    console.log(`🗑️  Deleted ${deleted} orders outside range`);
}

async function updateRelatedData() {
    console.log('\n📝 Updating related data dates...');

    // Update product comments to be within range
    const comments = await prisma.productComment.findMany({
        where: {
            parentId: null, // Only root comments
        }
    });

    let commentsUpdated = 0;
    for (const comment of comments) {
        const newDate = randomDate(START_DATE, END_DATE);

        try {
            await prisma.productComment.update({
                where: { id: comment.id },
                data: {
                    createdAt: newDate,
                    updatedAt: newDate,
                }
            });

            // Update replies (1-3 days after parent comment)
            const replies = await prisma.productComment.findMany({
                where: { parentId: comment.id }
            });

            for (const reply of replies) {
                const replyDate = new Date(newDate.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000);
                await prisma.productComment.update({
                    where: { id: reply.id },
                    data: {
                        createdAt: replyDate,
                        updatedAt: replyDate,
                    }
                });
            }

            commentsUpdated++;
        } catch (error) {
            // Skip errors
        }
    }

    console.log(`✅ Updated ${commentsUpdated} comments`);

    // Update notifications
    const notifications = await prisma.notification.findMany();
    let notificationsUpdated = 0;

    for (const notif of notifications) {
        const newDate = randomDate(START_DATE, END_DATE);

        try {
            await prisma.notification.update({
                where: { id: notif.id },
                data: { createdAt: newDate }
            });
            notificationsUpdated++;
        } catch (error) {
            // Skip errors
        }
    }

    console.log(`✅ Updated ${notificationsUpdated} notifications`);

    // Update wishlist
    const wishlists = await prisma.wishlist.findMany();
    let wishlistUpdated = 0;

    for (const item of wishlists) {
        const newDate = randomDate(START_DATE, END_DATE);

        try {
            await prisma.wishlist.update({
                where: { id: item.id },
                data: { createdAt: newDate }
            });
            wishlistUpdated++;
        } catch (error) {
            // Skip errors
        }
    }

    console.log(`✅ Updated ${wishlistUpdated} wishlist items`);
}

async function showFinalStats() {
    console.log('\n📊 Final Statistics:');
    console.log('===================');

    const orders = await prisma.order.findMany({
        orderBy: { createdAt: 'asc' }
    });

    if (orders.length === 0) {
        console.log('❌ No orders found');
        return;
    }

    const oldestOrder = orders[0];
    const newestOrder = orders[orders.length - 1];

    const daysDiff = Math.ceil((newestOrder.createdAt - oldestOrder.createdAt) / (1000 * 60 * 60 * 24));

    console.log(`📦 Total orders: ${orders.length}`);
    console.log(`📅 Oldest: ${oldestOrder.createdAt.toISOString()}`);
    console.log(`📅 Newest: ${newestOrder.createdAt.toISOString()}`);
    console.log(`📊 Date range: ${daysDiff} days (~${Math.ceil(daysDiff / 30)} months)`);
    console.log(`📈 Average: ${(orders.length / daysDiff).toFixed(2)} orders/day`);

    // Count by month
    const byMonth = {};
    orders.forEach(order => {
        const monthKey = order.createdAt.toISOString().substring(0, 7); // YYYY-MM
        byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
    });

    console.log('\n📊 Orders by month:');
    Object.entries(byMonth).sort().forEach(([month, count]) => {
        const monthNames = {
            '2025-11': 'Nov 2025',
            '2025-12': 'Dec 2025',
            '2026-01': 'Jan 2026',
        };
        console.log(`   ${monthNames[month] || month}: ${count} orders`);
    });
}

async function main() {
    console.log('🔄 Updating database to 2-month date range\n');
    console.log(`Target range: ${START_DATE.toISOString()} to ${END_DATE.toISOString()}\n`);

    try {
        await updateOrderDates();
        await updateRelatedData();
        await showFinalStats();

        console.log('\n✅ Date range update completed successfully!');
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
