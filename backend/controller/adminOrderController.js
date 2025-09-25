import prisma from "../config/prisma.js";


// ========================
// LẤY DANH SÁCH ĐƠN HÀNG
// ========================
export const getOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true }
        },
        orderItems: true,
        payments: true
      }
    });

    res.status(200).json({ message: "Lấy danh sách đơn hàng thành công", data: orders });
  } catch (error) {
    console.error("getOrders error:", error);
    res.status(500).json({ message: "Lỗi khi lấy danh sách đơn hàng" });
  }
};

// ========================
// LẤY CHI TIẾT ĐƠN HÀNG
// ========================
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id: Number(id) },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true }
        },
        orderItems: {
          include: { product: true, variant: true }
        },
        payments: true,
        couponUsages: {
          include: { coupon: true }
        },
        reviews: true
      }
    });

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    res.json({ message: "Lấy chi tiết đơn hàng thành công", data: order });
  } catch (error) {
    console.error("getOrderById error:", error);
    res.status(500).json({ message: "Lỗi khi lấy chi tiết đơn hàng" });
  }
};

// ========================
// CẬP NHẬT TRẠNG THÁI ĐƠN
// ========================
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus } = req.body;

    // -----------------------------
    // 1. Định nghĩa luồng chuyển đổi hợp lệ
    // -----------------------------
    const orderTransitions = {
      PENDING: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["PROCESSING", "CANCELLED"],
      PROCESSING: ["SHIPPED", "CANCELLED"],
      SHIPPED: ["DELIVERED"],
      DELIVERED: [], // Hoàn tất => không thể đổi nữa
      CANCELLED: [], // Đã hủy => không thể đổi nữa
    };

    const paymentTransitions = {
      PENDING: ["PAID", "FAILED"],
      PAID: [],   // Đã thanh toán => không thể đổi nữa
      FAILED: [], // Thanh toán thất bại => không thể đổi nữa
    };

    // -----------------------------
    // 2. Lấy đơn hàng hiện tại
    // -----------------------------
    const order = await prisma.order.findUnique({
      where: { id: Number(id) },
      select: { status: true, paymentStatus: true },
    });

    if (!order) {
      return res.status(404).json({ message: "Đơn hàng không tồn tại" });
    }

    // -----------------------------
    // 3. Kiểm tra logic chuyển trạng thái đơn hàng
    // -----------------------------
    if (status) {
      const allowedNextStatus = orderTransitions[order.status] || [];
      if (!allowedNextStatus.includes(status)) {
        return res.status(400).json({
          message: `Không thể chuyển từ trạng thái "${order.status}" sang "${status}"`,
        });
      }
    }

    // -----------------------------
    // 4. Kiểm tra logic chuyển trạng thái thanh toán
    // -----------------------------
    if (paymentStatus) {
      const allowedNextPayment = paymentTransitions[order.paymentStatus] || [];
      if (!allowedNextPayment.includes(paymentStatus)) {
        return res.status(400).json({
          message: ` Không thể chuyển từ trạng thái thanh toán "${order.paymentStatus}" sang "${paymentStatus}"`,
        });
      }
    }

    // -----------------------------
    // 5. Cập nhật dữ liệu trong DB
    // -----------------------------
    const updatedOrder = await prisma.order.update({
      where: { id: Number(id) },
      data: {
        status: status || undefined,
        paymentStatus: paymentStatus || undefined,
        updatedAt: new Date(),
      },
    });

    // -----------------------------
    // 6. Trả về kết quả
    // -----------------------------
    res.json({
      message: " Cập nhật trạng thái thành công",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("updateOrderStatus error:", error);
    res.status(500).json({ message: "Lỗi khi cập nhật trạng thái đơn hàng" });
  }
};

// ========================
// THÊM GHI CHÚ QUẢN TRỊ
// ========================
export const updateOrderNotes = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;

    const updatedOrder = await prisma.order.update({
      where: { id: Number(id) },
      data: { adminNote, updatedAt: new Date() }
    });

    res.json({ message: "Cập nhật ghi chú thành công", data: updatedOrder });
  } catch (error) {
    console.error("updateOrderNotes error:", error);
    res.status(500).json({ message: "Lỗi khi cập nhật ghi chú đơn hàng" });
  }
};
