import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

// Tạo Prisma client
const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Set timezone Việt Nam (GMT+7) cho MySQL connection
// Đảm bảo thời gian lưu và đọc từ database đều theo múi giờ Việt Nam
// Cần set timezone ở 3 cấp độ:
// 1. MySQL Server: SET GLOBAL time_zone = '+07:00';
// 2. Database: ALTER DATABASE ecommerce_db SET time_zone = '+07:00';
// 3. Session (code này): SET time_zone = '+07:00';

if (!globalForPrisma.prisma) {
  // Set timezone cho mỗi session/connection để đảm bảo nhất quán
  prisma.$connect()
    .then(() => {
      return prisma.$executeRaw`SET time_zone = '+07:00'`;
    })
    .then(() => {
      console.log('✅ MySQL timezone set to +07:00 (Vietnam)');
    })
    .catch(err => {
      console.warn('⚠️ Failed to set MySQL timezone for session:', err.message);
      console.warn('Please ensure MySQL server timezone is set to +07:00');
    });
}

if (process.env.NODE_ENV !== 'production') 
    globalForPrisma.prisma = prisma;

export default prisma;