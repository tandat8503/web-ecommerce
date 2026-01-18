import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

// Vietnamese names for realistic data
const vietnameseFirstNames = ['Minh', 'Hương', 'Tuấn', 'Linh', 'Hà', 'Nam', 'Thu', 'Phương', 'Trang', 'Đức', 'An', 'Bình', 'Châu', 'Dũng', 'Hải', 'Khánh', 'Long', 'Mai', 'Ngọc', 'Quân'];
const vietnameseLastNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Phan', 'Vũ', 'Đặng', 'Bùi', 'Đỗ'];

// Comment templates
const commentTemplates = [
    'Sản phẩm rất đẹp, chất lượng tốt!',
    'Mình rất hài lòng với sản phẩm này',
    'Giao hàng nhanh, đóng gói cẩn thận',
    'Giá hợp lý, chất lượng tốt',
    'Sản phẩm đúng như mô tả',
    'Shop tư vấn nhiệt tình, sẽ ủng hộ tiếp',
    'Sản phẩm đẹp, giống hình',
    'Chất liệu tốt, màu sắc đẹp',
    'Rất đáng mua, recommend cho mọi người',
    'Giá cả phải chăng, chất lượng ok',
    'Sản phẩm tốt, shop nhiệt tình',
    'Đóng gói cẩn thận, giao hàng nhanh',
    'Chất lượng sản phẩm vượt mong đợi',
    'Mua lần 2 rồi, sản phẩm ổn',
    'Shop uy tín, sẽ mua lại',
];

const replyTemplates = [
    'Cảm ơn bạn đã ủng hộ shop ạ! ❤️',
    'Thank you! Chúc bạn sử dụng sản phẩm vui vẻ ạ',
    'Cảm ơn feedback của bạn nhé!',
    'Shop rất vui khi bạn hài lòng ạ!',
    'Cảm ơn bạn nhiều! Hẹn gặp lại lần sau ❤️',
];

// Review templates
const reviewTitles = [
    'Sản phẩm tuyệt vời',
    'Rất hài lòng',
    'Đúng như mô tả',
    'Chất lượng tốt',
    'Giá trị tốt',
    'Recommend mạnh',
    'Sẽ mua lại',
    'Ưng ý',
    'Đẹp quá',
    'Ok luôn',
];

const reviewComments = [
    'Mình đã sử dụng sản phẩm được 1 tuần, rất hài lòng với chất lượng. Thiết kế đẹp, chắc chắn, đúng như những gì mình mong đợi.',
    'Sản phẩm tốt, đóng gói cẩn thận, giao hàng nhanh. Shop tư vấn nhiệt tình. Sẽ tiếp tục ủng hộ.',
    'Chất lượng vượt mong đợi so với giá tiền. Màu sắc đẹp, form dáng chuẩn. Rất đáng để mua.',
    'Nhận hàng đúng như mô tả, không có gì để chê. Sử dụng rất tốt, gia đình mình đều thích.',
    'Lần đầu mua online mà rất ưng ý. Sản phẩm chất lượng, ship nhanh, đóng gói kỹ càng.',
    'Đã dùng qua nhiều loại nhưng loại này là ưng ý nhất. Chất liệu tốt, bền, đẹp.',
    'Giá cả hợp lý, chất lượng xứng đáng. Shop phục vụ tốt, giao hàng đúng hẹn.',
    'Mua về làm quà tặng, người nhận rất thích. Sản phẩm đẹp, sang trọng.',
    'Dùng rất ok, không hối hận khi mua. Sẽ giới thiệu cho bạn bè.',
    'Chất lượng tốt trong tầm giá. Thiết kế đẹp, hiện đại. Recommend cho mọi người.',
];

function randomDate(start, end) {
    return faker.date.between({ from: start, to: end });
}

function randomVietnameseName() {
    const firstName = vietnameseFirstNames[Math.floor(Math.random() * vietnameseFirstNames.length)];
    const lastName = vietnameseLastNames[Math.floor(Math.random() * vietnameseLastNames.length)];
    return { firstName, lastName };
}

async function seedProductComments() {
    console.log('💬 Seeding Product Comments...');

    const products = await prisma.product.findMany({
        select: { id: true, createdAt: true }
    });

    const users = await prisma.user.findMany({
        where: { role: 'CUSTOMER' },
        select: { id: true }
    });

    if (users.length === 0) {
        console.log('❌ No customers found. Skipping comments.');
        return;
    }

    const adminUsers = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true }
    });

    let commentsCreated = 0;
    let repliesCreated = 0;

    // Add 3-8 comments per product
    for (const product of products) {
        const numComments = Math.floor(Math.random() * 6) + 3; // 3-8 comments

        for (let i = 0; i < numComments; i++) {
            const randomUser = users[Math.floor(Math.random() * users.length)];
            const content = commentTemplates[Math.floor(Math.random() * commentTemplates.length)];

            // Create comment 1-30 days after product creation
            const commentDate = randomDate(
                product.createdAt,
                new Date(product.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000)
            );

            try {
                const comment = await prisma.productComment.create({
                    data: {
                        userId: randomUser.id,
                        productId: product.id,
                        content: content,
                        isApproved: true,
                        createdAt: commentDate,
                        updatedAt: commentDate,
                    }
                });
                commentsCreated++;

                // 40% chance of admin reply
                if (Math.random() < 0.4 && adminUsers.length > 0) {
                    const adminUser = adminUsers[Math.floor(Math.random() * adminUsers.length)];
                    const replyContent = replyTemplates[Math.floor(Math.random() * replyTemplates.length)];

                    // Reply 1-3 days after comment
                    const replyDate = new Date(commentDate.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000);

                    await prisma.productComment.create({
                        data: {
                            userId: adminUser.id,
                            productId: product.id,
                            parentId: comment.id,
                            content: replyContent,
                            isApproved: true,
                            createdAt: replyDate,
                            updatedAt: replyDate,
                        }
                    });
                    repliesCreated++;
                }
            } catch (error) {
                // Skip if error (likely duplicate or constraint issue)
            }
        }
    }

    console.log(`✅ Created ${commentsCreated} comments and ${repliesCreated} replies`);
}

async function seedProductReviews() {
    console.log('⭐ Seeding Product Reviews...');

    // Get completed orders with products
    const completedOrders = await prisma.order.findMany({
        where: {
            status: 'DELIVERED',
            paymentStatus: 'PAID'
        },
        include: {
            orderItems: {
                include: {
                    product: true
                }
            },
            user: true
        }
    });

    let reviewsCreated = 0;

    for (const order of completedOrders) {
        // 60% chance customer reviews after receiving order
        if (Math.random() < 0.6) {
            for (const item of order.orderItems) {
                // Check if review already exists
                const existingReview = await prisma.productReview.findUnique({
                    where: {
                        productId_userId: {
                            productId: item.productId,
                            userId: order.userId
                        }
                    }
                });

                if (!existingReview) {
                    // Review 1-14 days after order creation
                    const reviewDate = new Date(
                        order.createdAt.getTime() +
                        (Math.random() * 14 * 24 * 60 * 60 * 1000)
                    );

                    const rating = Math.random() < 0.7
                        ? (Math.random() < 0.5 ? 5 : 4) // 70% are 4-5 stars
                        : Math.floor(Math.random() * 3) + 3; // 30% are 3-5 stars

                    try {
                        await prisma.productReview.create({
                            data: {
                                productId: item.productId,
                                userId: order.userId,
                                orderId: order.id,
                                rating: rating,
                                title: reviewTitles[Math.floor(Math.random() * reviewTitles.length)],
                                comment: reviewComments[Math.floor(Math.random() * reviewComments.length)],
                                isApproved: true,
                                isVerified: true,
                                createdAt: reviewDate,
                                updatedAt: reviewDate,
                            }
                        });
                        reviewsCreated++;
                    } catch (error) {
                        // Skip if duplicate
                    }
                }
            }
        }
    }

    console.log(`✅ Created ${reviewsCreated} product reviews`);
}

async function seedWishlist() {
    console.log('❤️ Seeding Wishlist...');

    const users = await prisma.user.findMany({
        where: { role: 'CUSTOMER' },
        select: { id: true }
    });

    const products = await prisma.product.findMany({
        select: { id: true }
    });

    let wishlistCreated = 0;

    // Each user has 0-10 wishlist items
    for (const user of users) {
        const numItems = Math.floor(Math.random() * 11);

        const shuffledProducts = products.sort(() => 0.5 - Math.random());
        const selectedProducts = shuffledProducts.slice(0, numItems);

        for (const product of selectedProducts) {
            try {
                await prisma.wishlist.create({
                    data: {
                        userId: user.id,
                        productId: product.id,
                        createdAt: randomDate(new Date('2025-01-01'), new Date()),
                    }
                });
                wishlistCreated++;
            } catch (error) {
                // Skip duplicates
            }
        }
    }

    console.log(`✅ Created ${wishlistCreated} wishlist items`);
}

async function seedProductImages() {
    console.log('🖼️ Seeding Product Images...');

    const products = await prisma.product.findMany({
        include: {
            images: true
        }
    });

    let imagesCreated = 0;

    for (const product of products) {
        // If product has less than 3 images, add more
        if (product.images.length < 3) {
            const numImagesToAdd = 3 - product.images.length;

            for (let i = 0; i < numImagesToAdd; i++) {
                try {
                    await prisma.productImage.create({
                        data: {
                            productId: product.id,
                            imageUrl: product.imageUrl || 'https://via.placeholder.com/800x600',
                            imagePublicId: null,
                            isPrimary: false,
                            sortOrder: product.images.length + i + 1,
                        }
                    });
                    imagesCreated++;
                } catch (error) {
                    // Skip if error
                }
            }
        }
    }

    console.log(`✅ Created ${imagesCreated} product images`);
}

async function seedNotifications() {
    console.log('🔔 Seeding Notifications...');

    const users = await prisma.user.findMany({
        where: { role: 'CUSTOMER' },
        include: {
            orders: {
                orderBy: { createdAt: 'desc' },
                take: 5
            }
        }
    });

    let notificationsCreated = 0;

    const notificationTypes = [
        { type: 'order', title: 'Đơn hàng mới', message: 'Đơn hàng #{orderNumber} đã được tạo thành công' },
        { type: 'order', title: 'Xác nhận đơn hàng', message: 'Đơn hàng #{orderNumber} đã được xác nhận' },
        { type: 'order', title: 'Đang giao hàng', message: 'Đơn hàng #{orderNumber} đang được giao đến bạn' },
        { type: 'order', title: 'Giao hàng thành công', message: 'Đơn hàng #{orderNumber} đã được giao thành công' },
        { type: 'promotion', title: 'Khuyến mãi mới', message: 'Bạn có mã giảm giá mới! Hãy sử dụng ngay.' },
        { type: 'system', title: 'Chào mừng', message: 'Chào mừng bạn đến với cửa hàng!' },
    ];

    for (const user of users) {
        for (const order of user.orders) {
            const notifType = notificationTypes[Math.floor(Math.random() * 4)]; // Order notifications

            try {
                await prisma.notification.create({
                    data: {
                        userId: user.id,
                        type: notifType.type,
                        title: notifType.title,
                        message: notifType.message.replace('{orderNumber}', order.orderNumber),
                        isRead: Math.random() < 0.5,
                        createdAt: new Date(order.createdAt.getTime() + Math.random() * 60000),
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

async function main() {
    console.log('🌱 Starting comprehensive database seeding...\n');

    try {
        await seedProductComments();
        await seedProductReviews();
        await seedWishlist();
        await seedProductImages();
        await seedNotifications();

        console.log('\n✅ Seeding completed successfully!');
        console.log('\n📊 Run check-database-status.js to see the results.');
    } catch (error) {
        console.error('❌ Error during seeding:', error);
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
