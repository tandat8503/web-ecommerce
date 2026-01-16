// Fix payment_url column type
// Run: node scripts/fix-payment-url.js

import prisma from '../config/prisma.js';

async function fixPaymentUrlColumn() {
    try {
        console.log('Fixing payment_url column type...');

        // Execute raw SQL to change column type
        await prisma.$executeRawUnsafe(`
      ALTER TABLE payments MODIFY COLUMN payment_url TEXT;
    `);

        console.log('✅ Successfully changed payment_url to TEXT type');
        console.log('VNPay URLs can now be stored (up to 65,535 characters)');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

fixPaymentUrlColumn();
