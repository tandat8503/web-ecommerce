import prisma from "../config/prisma.js";

/**
 * Lấy danh sách khách hàng
 */
export const getCustomers = async (req, res) => {
  try {
    const customers = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: { orders: true },
        },
      },
    });

    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

/**
 * Lấy chi tiết 1 khách hàng
 */
export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
        lastLoginAt: true,
        addresses: true,
        _count: {
          select: { orders: true, wishlist: true },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ message: "Không tìm thấy khách hàng" });
    }

    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

/**
 * Kích hoạt / vô hiệu hóa khách hàng
 */
export const updateCustomerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const updatedCustomer = await prisma.user.update({
      where: { id: Number(id) },
      data: { isActive },
    });

    res.json({
      message: `Khách hàng đã được ${isActive ? "kích hoạt" : "vô hiệu hóa"}`,
      customer: updatedCustomer,
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

/**
 * Lấy danh sách đơn hàng của khách hàng
 */
export const getCustomerOrders = async (req, res) => {
  try {
    const { id } = req.params;

    const orders = await prisma.order.findMany({
      where: { userId: Number(id) },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        totalAmount: true,
        createdAt: true,
        orderItems: {
          select: {
            productName: true,
            variantName: true,
            quantity: true,
            totalPrice: true,
          },
        },
      },
    });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
