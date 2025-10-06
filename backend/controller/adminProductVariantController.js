import prisma from "../config/prisma.js";

/**
 * ===========================
 * HÀM TẠO SKU ,hàm này radom ra mã tự động
 * ===========================
 * - Cấu trúc: BRAND-PRODUCTID-COLOR-SIZE-0001
 * - Ví dụ: CAS-12-RED-M-0001
 */
const generateMeaningfulSKU = async (productId, color, size) => {
  // Lấy thông tin sản phẩm + brand
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { brand: true },
  });
  if (!product) throw new Error("Sản phẩm không tồn tại để sinh SKU");

  //  Tạo mã thương hiệu (brandCode) 3 ký tự
  const brandCode = (product.brand?.name || product.name)
    .toUpperCase()// Chuyển thành chữ hoa
    .normalize("NFD")// Chuẩn hoá Unicode
    .replace(/[\u0300-\u036f]/g, "") // bỏ dấu tiếng Việt
    .replace(/[^A-Z0-9]/g, "") // bỏ ký tự đặc biệt
    .slice(0, 3);// Lấy 3 ký tự đầu

  //  Chuẩn hoá color & size
  const colorCode = color
    ? color.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "")
    : "NOCOLOR";

  const sizeCode = size
    ? size.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "")
    : "NOSIZE";

  //  Đếm số biến thể hiện tại của sản phẩm để tạo số thứ tự
  const count = await prisma.productVariant.count({
    where: { productId },
  });

  const sequence = String(count + 1).padStart(4, "0"); // 0001, 0002,...

  //  Gộp thành SKU cuối
  return `${brandCode}-${productId}-${colorCode}-${sizeCode}-${sequence}`;
};



// ===========================
//  TẠO BIẾN THỂ SẢN PHẨM
// ===========================
export const createProductVariant = async (req, res) => {
  try {
    const { productId, name, price, stockQuantity, size, color, isActive } = req.body;

    //  Kiểm tra product tồn tại
    const product = await prisma.product.findUnique({
      where: { id: Number(productId) },
    });
    if (!product) {
      return res.status(404).json({ message: "Sản phẩm không tồn tại" });
    }

    //  Kiểm tra trùng biến thể (theo product + size + color)
    const existingVariant = await prisma.productVariant.findFirst({
      where: {
        productId: Number(productId),
        size: size || null,
        color: color || null,
      },
    });
    if (existingVariant) {
      return res.status(400).json({ message: "Biến thể với màu & size này đã tồn tại" });
    }

    //  Tạo SKU có ý nghĩa
    const sku = await generateMeaningfulSKU(Number(productId), color, size);

    //  Tạo mới biến thể
    const variant = await prisma.productVariant.create({
      data: {
        productId: Number(productId),
        sku,
        name,
        price: price ? parseFloat(price) : null,
        stockQuantity: stockQuantity ? Number(stockQuantity) : 0,
        size,
        color,
        isActive: isActive !== undefined ? isActive : true, 

      },
    });

    res.status(201).json({ message: "Tạo biến thể thành công", data: variant });
  } catch (error) {
    console.error("❌ Lỗi createProductVariant:", error);
    res.status(500).json({ message: "Lỗi khi tạo biến thể", error: error.message });
  }
};



// ==============================
// Lấy danh sách biến thể (có phân trang + tìm kiếm)
// ==============================
export const getProductVariants = async (req, res) => {
  try {
    // Lấy query params từ request, nếu không truyền thì mặc định page=1, limit=5
    const { page = 1, limit = 5, keyword, productId } = req.query;

    // Tạo điều kiện tìm kiếm (where)
    const where = {
      // Nếu có productId thì lọc theo productId
      ...(productId ? { productId: Number(productId) } : {}),
      // Nếu có keyword thì tìm theo sku, name, color, size
      ...(keyword
        ? {
            OR: [
              { sku: { contains: keyword, } },   // Tìm theo SKU
              { name: { contains: keyword, } },  // Tìm theo tên
              { color: { contains: keyword, } }, // Tìm theo màu
              { size: { contains: keyword, } },  // Tìm theo size
            ],
          }
        : {}),
    };

    // Thực hiện 2 query song song: lấy danh sách items + đếm tổng số bản ghi
    const [items, total] = await Promise.all([
      prisma.productVariant.findMany({
        where,                            // Điều kiện lọc
        orderBy: { createdAt: "desc" },   // Sắp xếp theo ngày tạo mới nhất
        skip: (Number(page) - 1) * Number(limit), // Bỏ qua số bản ghi trước đó (phân trang)
        take: Number(limit),              // Giới hạn số bản ghi lấy ra (theo limit)
        include: {
          product: { select: { name: true, brand: true } }, // Join thêm thông tin sản phẩm & brand
        },
      }),
      prisma.productVariant.count({ where }), // Đếm tổng số bản ghi thoả mãn điều kiện
    ]);

    // Trả response cho client
    res.json({
      code: 200,
      message: "Lấy danh sách biến thể thành công",
      data: {
        variants: items, // Danh sách biến thể
        pagination: {    // Thông tin phân trang
          total,                             // Tổng số bản ghi
          page: Number(page),                // Trang hiện tại
          limit: Number(limit),              // Giới hạn số bản ghi mỗi trang
          totalPages: Math.ceil(total / limit), // Tổng số trang
        },
      },
    });
  } catch (error) {
    // Nếu có lỗi thì log ra console + trả về lỗi 500
    console.error("❌ Lỗi getProductVariants:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};




// ===========================
//  LẤY CHI TIẾT BIẾN THỂ
// ===========================
export const getProductVariantById = async (req, res) => {
  try {
    const { id } = req.params;

    const variant = await prisma.productVariant.findUnique({
      where: { id: Number(id) },
      include: { product: { select: { name: true, brand: true } } },
    });

    if (!variant) {
      return res.status(404).json({ message: "Không tìm thấy biến thể" });
    }

    res.json({ data: variant });
  } catch (error) {
    console.error("❌ Lỗi getProductVariantById:", error);
    res.status(500).json({ message: "Lỗi khi lấy chi tiết biến thể" });
  }
};



// ===========================
//  CẬP NHẬT BIẾN THỂ
// ===========================
export const updateProductVariant = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, stockQuantity, size, color, isActive } = req.body;

    //  Kiểm tra biến thể tồn tại
    const variant = await prisma.productVariant.findUnique({
      where: { id: Number(id) },
    });
    if (!variant) {
      return res.status(404).json({ message: "Biến thể không tồn tại" });
    }

    // Nếu đổi color/size, kiểm tra có bị trùng biến thể khác không
    if (size || color) {
      const duplicate = await prisma.productVariant.findFirst({
        where: {
          productId: variant.productId,
          size: size || null,
          color: color || null,
          NOT: { id: variant.id },
        },
      });
      if (duplicate) {
        return res.status(400).json({ message: "Đã tồn tại biến thể có cùng màu & size" });
      }
    }

    //  Cập nhật biến thể
    const updated = await prisma.productVariant.update({
      where: { id: Number(id) },
      data: {
        name,
        price: price ? parseFloat(price) : variant.price,
        stockQuantity: stockQuantity !== undefined ? Number(stockQuantity) : variant.stockQuantity,
        size: size ?? variant.size,
        color: color ?? variant.color,
        isActive: isActive ?? variant.isActive,
      },
    });

    res.json({ message: "Cập nhật biến thể thành công", data: updated });
  } catch (error) {
    console.error("❌ Lỗi updateProductVariant:", error);
    res.status(500).json({ message: "Lỗi khi cập nhật biến thể" });
  }
};



// ===========================
// XÓA BIẾN THỂ
// ===========================
export const deleteProductVariant = async (req, res) => {
  try {
    const { id } = req.params;

    //  Kiểm tra tồn tại
    const variant = await prisma.productVariant.findUnique({
      where: { id: Number(id) },
    });
    if (!variant) {
      return res.status(404).json({ message: "Biến thể không tồn tại" });
    }

    //  Xóa
    await prisma.productVariant.delete({
      where: { id: Number(id) },
    });

    res.json({ message: "Xóa biến thể thành công" });
  } catch (error) {
    console.error(" Lỗi deleteProductVariant:", error);
    res.status(500).json({ message: "Lỗi khi xóa biến thể" });
  }
};
