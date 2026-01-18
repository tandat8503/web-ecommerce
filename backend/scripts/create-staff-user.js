// Script to create a STAFF user for testing role-based access control
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createStaffUser() {
    try {
        console.log('🔧 Creating STAFF user for testing...\n');

        const email = 'staff@example.com';
        const password = 'Staff@123'; // Default password

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            console.log(`ℹ️  User with email ${email} already exists`);
            console.log(`   Role: ${existingUser.role}`);
            console.log(`   ID: ${existingUser.id}`);

            if (existingUser.role !== 'STAFF') {
                console.log('\n📝 Updating role to STAFF...');
                const updated = await prisma.user.update({
                    where: { id: existingUser.id },
                    data: { role: 'STAFF' }
                });
                console.log('✅ Role updated successfully!');
                console.log(`   Email: ${updated.email}`);
                console.log(`   Role: ${updated.role}`);
            }

            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new STAFF user
        const staffUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                firstName: 'Staff',
                lastName: 'Member',
                role: 'STAFF',
                isActive: true,
                phoneNumber: '0123456789'
            }
        });

        console.log('✅ STAFF user created successfully!\n');
        console.log('📋 Login credentials:');
        console.log(`   Email: ${staffUser.email}`);
        console.log(`   Password: ${password}`);
        console.log(`   Role: ${staffUser.role}`);
        console.log(`   ID: ${staffUser.id}`);
        console.log('\n🔒 Permissions:');
        console.log('   ✓ Dashboard (view)');
        console.log('   ✓ Quản lý đơn hàng (full access)');
        console.log('   ✗ Other admin features (no access)');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createStaffUser();
