import prisma from "../config/prisma.js";

/**
 * ================================
 * LẤY DANH SÁCH THÔNG SỐ KỸ THUẬT
 * (Phân trang + Tìm kiếm)
 * ================================
 */
export const getAllSpecifications = async (req, res) => {
  try {
    //  Lấy các query params: page, limit, keyword, productId
    const { page = 1, limit = 10, keyword, productId } = req.query;

    //  Tạo điều kiện lọc (where)
    const where = {
      ...(productId ? { productId: Number(productId) } : {}),
      ...(keyword
        ? {
            OR: [
              { specName: { contains: keyword } },
              { displayName: { contains: keyword } },
              { specValue: { contains: keyword } },
              {
                product: {
                  OR: [
                    { name: { contains: keyword } },
                    { sku: { contains: keyword} },
                  ],
                },
              },
            ],
          }
        : {}),
    };

    //  Thực hiện 2 query song song: danh sách + tổng count
    const [items, total] = await Promise.all([
      prisma.productSpecification.findMany({
        where,
        orderBy: [{ productId: "asc" }, { sortOrder: "desc" }],
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: {
          product: {
            select: { id: true, name: true, sku: true },
          },
        },
      }),
      prisma.productSpecification.count({ where }),
    ]);

    //  Trả kết quả
    res.json({
      code: 200,
      message: "Lấy danh sách thông số kỹ thuật thành công",
      data: {
        specifications: items,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("❌ getAllSpecifications error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

/**
 * 2. Lấy thông số kỹ thuật theo ID
 */
export const getSpecificationById = async (req, res) => {
  try {
    const { id } = req.params;

    const spec = await prisma.productSpecification.findUnique({
      where: { id: Number(id) },
      include: {
        product: {
          select: { id: true, name: true, sku: true },
        },
      },
    });

    if (!spec) {
      return res.status(404).json({ message: "Không tìm thấy thông số kỹ thuật" });
    }

    res.json({
      code: 200,
      message: "Lấy thông số kỹ thuật thành công",
      data: spec,
    });
  } catch (error) {
    console.error("❌ getSpecificationById error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

/**
 * 3. Thêm mới thông số kỹ thuật
 */
export const createSpecification = async (req, res) => {
  try {
    const { productId, specName, specValue, specUnit, displayName, sortOrder } = req.body;

    // Kiểm tra dữ liệu bắt buộc
    if (!productId || !specName || !specValue || !displayName) {
      return res.status(400).json({ message: "Thiếu dữ liệu bắt buộc" });
    }

    // Kiểm tra sản phẩm có tồn tại
    const product = await prisma.product.findUnique({
      where: { id: Number(productId) },
    });
    if (!product) {
      return res.status(404).json({ message: "Sản phẩm không tồn tại" });
    }

    // Kiểm tra trùng specName trong cùng product
    const existed = await prisma.productSpecification.findUnique({
      where: {
        productId_specName: {
          productId: Number(productId),
          specName,
        },
      },
    });
    if (existed) {
      return res.status(400).json({ message: "Thông số đã tồn tại cho sản phẩm này" });
    }

    const newSpec = await prisma.productSpecification.create({
      data: {
        productId: Number(productId),
        specName,
        specValue,
        specUnit,
        displayName,
        sortOrder: sortOrder ? Number(sortOrder) : 0,  //  Ép kiểu về Int
      },
    });

    res.json({
      code: 201,
      message: "Thêm thông số kỹ thuật thành công",
      data: newSpec,
    });
  } catch (error) {

    console.error("❌ createSpecification error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

/**
 * 4. Cập nhật thông số kỹ thuật theo ID
 */
export const updateSpecification = async (req, res) => {
  try {
    const { id } = req.params;
    const { specName, specValue, specUnit, displayName, sortOrder } = req.body;

    const spec = await prisma.productSpecification.findUnique({
      where: { id: Number(id) },
    });

    if (!spec) {
      return res.status(404).json({ message: "Thông số kỹ thuật không tồn tại" });
    }

    // Nếu đổi tên specName thì kiểm tra trùng trong cùng product
    if (specName && specName !== spec.specName) {
      const existed = await prisma.productSpecification.findUnique({
        where: {
          productId_specName: {
            productId: spec.productId,
            specName,
          },
        },
      });
      if (existed) {
        return res.status(400).json({ message: "Tên thông số đã tồn tại trong sản phẩm này" });
      }
    }

    const updatedSpec = await prisma.productSpecification.update({
      where: { id: Number(id) },
      data: {
        specName: specName ?? spec.specName,
        specValue: specValue ?? spec.specValue,
        specUnit: specUnit ?? spec.specUnit,
        displayName: displayName ?? spec.displayName,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : spec.sortOrder, //  Ép kiểu về Int
      },
    });

    res.json({
      code: 200,
      message: "Cập nhật thông số kỹ thuật thành công",
      data: updatedSpec,
    });
  } catch (error) {
    console.error("❌ updateSpecification error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

/**
 * 5. Xóa thông số kỹ thuật theo ID
 */
export const deleteSpecification = async (req, res) => {
  try {
    const { id } = req.params;

    const spec = await prisma.productSpecification.findUnique({
      where: { id: Number(id) },
    });

    if (!spec) {
      return res.status(404).json({ message: "Thông số kỹ thuật không tồn tại" });
    }

    await prisma.productSpecification.delete({
      where: { id: Number(id) },
    });

    res.json({
      code: 200,
      message: "Xóa thông số kỹ thuật thành công",
    });
  } catch (error) {
    console.error("❌ deleteSpecification error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
