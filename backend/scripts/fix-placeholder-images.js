// Fix via.placeholder.com images by replacing with placehold.co
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixPlaceholderImages() {
    try {
        console.log('🔍 Checking products with via.placeholder.com images...');

        // Find all products with via.placeholder.com
        const products = await prisma.product.findMany({
            where: {
                image_url: {
                    contains: 'via.placeholder.com'
                }
            },
            select: {
                id: true,
                name: true,
                image_url: true
            }
        });

        console.log(`Found ${products.length} products with via.placeholder.com`);

        if (products.length === 0) {
            console.log('✅ No products to fix!');
            return;
        }

        // Update each product
        for (const product of products) {
            const newUrl = product.image_url.replace('via.placeholder.com', 'placehold.co');

            await prisma.product.update({
                where: { id: product.id },
                data: { image_url: newUrl }
            });

            console.log(`✅ Updated product ${product.id}: ${product.name}`);
        }

        console.log(`\n✅ Successfully updated ${products.length} products!`);
        console.log('Note: placehold.co is more reliable than via.placeholder.com');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixPlaceholderImages();
