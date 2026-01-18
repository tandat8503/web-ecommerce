import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixInvalidEnums() {
    console.log('🔧 Fixing invalid enum values in database...\n');

    try {
        // Fix invalid PaymentMethod in orders table
        const fixedOrders = await prisma.$executeRaw`
      UPDATE orders 
      SET payment_method = 'COD' 
      WHERE payment_method = '' OR payment_method IS NULL OR payment_method NOT IN ('COD', 'VNPAY', 'TINGEE')
    `;
        console.log(`✅ Fixed ${fixedOrders} orders with invalid payment_method`);

        // Fix invalid PaymentMethod in payments table
        const fixedPayments = await prisma.$executeRaw`
      UPDATE payments 
      SET payment_method = 'COD' 
      WHERE payment_method = '' OR payment_method IS NULL OR payment_method NOT IN ('COD', 'VNPAY', 'TINGEE')
    `;
        console.log(`✅ Fixed ${fixedPayments} payments with invalid payment_method`);

        // Fix invalid PaymentStatus in orders table
        const fixedOrderStatus = await prisma.$executeRaw`
      UPDATE orders 
      SET payment_status = 'PENDING' 
      WHERE payment_status = '' OR payment_status IS NULL OR payment_status NOT IN ('PENDING', 'PAID', 'FAILED')
    `;
        console.log(`✅ Fixed ${fixedOrderStatus} orders with invalid payment_status`);

        // Fix invalid PaymentStatus in payments table
        const fixedPaymentStatus = await prisma.$executeRaw`
      UPDATE payments 
      SET payment_status = 'PENDING' 
      WHERE payment_status = '' OR payment_status IS NULL OR payment_status NOT IN ('PENDING', 'PAID', 'FAILED')
    `;
        console.log(`✅ Fixed ${fixedPaymentStatus} payments with invalid payment_status`);

        // Fix invalid OrderStatus
        const fixedOrderStatuses = await prisma.$executeRaw`
      UPDATE orders 
      SET status = 'PENDING' 
      WHERE status = '' OR status IS NULL OR status NOT IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'DELIVERED', 'CANCELLED')
    `;
        console.log(`✅ Fixed ${fixedOrderStatuses} orders with invalid status`);

        console.log('\n✅ All enum values fixed!');
        console.log('You can now run other scripts safely.');

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

fixInvalidEnums()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
