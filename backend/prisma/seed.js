import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
    console.log("Starting seed...");
    // 1. Tao admin
    console.log("Inserting admin user");
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: {email:'admin@ecommerce.com'},
        update:{},
        create:{
            email: 'admin@ecommerce.com',
            password: hashedPassword,
            firstName: 'Admin',
            lastName: 'Admin',
            role: 'ADMIN',
            isActive: true,
        }
    })
    console.log('Admin da tao:', admin.email);

    // 2. Tao danh muc
    console.log("Inserting categories");
    const categories = [
        {name: 'Ban lam viec',slug:'ban-lam-viec'},
        {name: 'Ban ghep',slug:'ban-ghep'},
        {name: 'Ban hoc',slug:'ban-hoc'},
        {name: 'Ghe van phong',slug:'ghe-van-phong'},
    ]
    for (const category of categories) {
        await prisma.category.upsert({
            where: {slug: category.slug},
            update:{},
            create:category,
        })
    }
    console.log("Categories inserted successfully");
}
main()
    .catch((e) => {
        console.error('❌ Lỗi khi tạo dữ liệu:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
