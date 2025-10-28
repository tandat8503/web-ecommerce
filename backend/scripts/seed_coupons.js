import prisma from "../config/prisma.js";

/**
 * Tạo sample data cho mã giảm giá
 * Chạy script này để có dữ liệu demo
 */
export const seedCoupons = async () => {
  try {
    console.log("🌱 Bắt đầu tạo sample data cho mã giảm giá...");

    // Xóa dữ liệu cũ (nếu có)
    await prisma.couponUsage.deleteMany();
    await prisma.coupon.deleteMany();

    // Tạo các mã giảm giá theo chiến lược Foundation
    const coupons = [
      // 1. MÃ CHÀO MỪNG - Tăng conversion
      {
        code: "WELCOME10",
        name: "Chào mừng khách hàng mới",
        discountType: "PERCENT",
        discountValue: 10,
        minimumAmount: 500000,
        usageLimit: 1000,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        isActive: true
      },

      // 2. MÃ QUAY LẠI - Tăng retention
      {
        code: "RETURN15",
        name: "Cảm ơn khách hàng quay lại",
        discountType: "PERCENT",
        discountValue: 15,
        minimumAmount: 1000000,
        usageLimit: 500,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        isActive: true
      },

      // 3. MÃ VIP - Tăng loyalty
      {
        code: "VIP20",
        name: "Ưu đãi khách VIP",
        discountType: "PERCENT",
        discountValue: 20,
        minimumAmount: 2000000,
        usageLimit: 200,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        isActive: true
      },

      // 4. MÃ MIỄN PHÍ SHIP
      {
        code: "FREESHIP",
        name: "Miễn phí vận chuyển",
        discountType: "AMOUNT",
        discountValue: 30000,
        minimumAmount: 1000000,
        usageLimit: 1000,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        isActive: true
      },

      // 5. MÃ THEO SẢN PHẨM - Ghế văn phòng
      {
        code: "CHAIR15",
        name: "Giảm giá ghế văn phòng",
        discountType: "PERCENT",
        discountValue: 15,
        minimumAmount: 800000,
        usageLimit: 300,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        isActive: true
      },

      // 6. MÃ THEO SẢN PHẨM - Bàn làm việc
      {
        code: "DESK20",
        name: "Giảm giá bàn làm việc",
        discountType: "PERCENT",
        discountValue: 20,
        minimumAmount: 1500000,
        usageLimit: 200,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        isActive: true
      },

      // 7. MÃ COMBO - Set văn phòng
      {
        code: "OFFICESET",
        name: "Combo nội thất văn phòng",
        discountType: "PERCENT",
        discountValue: 25,
        minimumAmount: 3000000,
        usageLimit: 100,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        isActive: true
      },

      // 8. MÃ FLASH SALE - Tạo urgency
      {
        code: "FLASH50",
        name: "Flash Sale 50%",
        discountType: "PERCENT",
        discountValue: 50,
        minimumAmount: 2000000,
        usageLimit: 50,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        isActive: true
      },

      // 9. MÃ SINH VIÊN
      {
        code: "STUDENT",
        name: "Ưu đãi sinh viên",
        discountType: "PERCENT",
        discountValue: 20,
        minimumAmount: 300000,
        usageLimit: 500,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        isActive: true
      },

      // 10. MÃ STARTUP
      {
        code: "STARTUP30",
        name: "Hỗ trợ startup",
        discountType: "PERCENT",
        discountValue: 30,
        minimumAmount: 5000000,
        usageLimit: 50,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        isActive: true
      },

      // 11. MÃ ĐÃ HẾT HẠN (để test)
      {
        code: "EXPIRED10",
        name: "Mã đã hết hạn",
        discountType: "PERCENT",
        discountValue: 10,
        minimumAmount: 500000,
        usageLimit: 100,
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-12-31"),
        isActive: true
      },

      // 12. MÃ ĐÃ HẾT LƯỢT SỬ DỤNG (để test)
      {
        code: "LIMITED5",
        name: "Mã giới hạn 5 lần",
        discountType: "PERCENT",
        discountValue: 15,
        minimumAmount: 1000000,
        usageLimit: 5,
        usedCount: 5, // Đã hết lượt
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        isActive: true
      }
    ];

    // Tạo các mã giảm giá
    for (const couponData of coupons) {
      await prisma.coupon.create({
        data: couponData
      });
    }

    console.log(`✅ Đã tạo thành công ${coupons.length} mã giảm giá!`);
    console.log("\n📋 Danh sách mã giảm giá đã tạo:");
    
    coupons.forEach((coupon, index) => {
      console.log(`${index + 1}. ${coupon.code} - ${coupon.name} (${coupon.discountValue}${coupon.discountType === 'PERCENT' ? '%' : 'k'})`);
    });

    console.log("\n🎯 Các mã giảm giá theo chiến lược Foundation:");
    console.log("• WELCOME10 - Chào mừng khách hàng mới (10%)");
    console.log("• RETURN15 - Cảm ơn khách quay lại (15%)");
    console.log("• VIP20 - Ưu đãi khách VIP (20%)");
    console.log("• FREESHIP - Miễn phí ship (30k)");

    console.log("\n🚀 Các mã giảm giá mở rộng:");
    console.log("• CHAIR15, DESK20 - Theo sản phẩm");
    console.log("• OFFICESET - Combo");
    console.log("• FLASH50 - Flash sale");
    console.log("• STUDENT, STARTUP30 - Theo khách hàng");

    console.log("\n🧪 Mã test:");
    console.log("• EXPIRED10 - Mã hết hạn");
    console.log("• LIMITED5 - Mã hết lượt sử dụng");

  } catch (error) {
    console.error("❌ Lỗi khi tạo sample data:", error);
    throw error;
  }
};

/**
 * Chạy script tạo sample data
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  seedCoupons()
    .then(() => {
      console.log("\n🎉 Hoàn thành tạo sample data!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Lỗi:", error);
      process.exit(1);
    });
}
