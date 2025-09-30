import prisma from "../config/prisma.js";

/**
 * Lấy danh sách khách hàng (có phân trang + tìm kiếm)
 */
export const getCustomers = async (req, res) => {
 const context = { path: "admin.customers.list", query: req.query };
  try {
    console.log("START", context);

    // Lấy query params: page, limit, q
    const { page = 1, limit = 10, q } = req.query;

    // Điều kiện tìm kiếm: theo tên, email hoặc số điện thoại
    const where = q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined;

    // Lấy data + tổng số khách hàng cùng lúc
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
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
          _count: { select: { orders: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Trả về payload
    const payload = {
      items,
      total,
      page: Number(page),
      limit: Number(limit),
    };

    console.log("END", { ...context, total: payload.total });
    return res.json(payload);
  } catch (error) {
    console.error("ERROR", { ...context, error: error.message });
    return res.status(500).json({
      message: "Lỗi server",
      error:
        process.env.NODE_ENV !== "production" ? error.message : undefined,
    });
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
