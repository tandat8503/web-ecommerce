import prisma from "../config/prisma.js";
import logger from "../utils/logger.js";

// ===========================
// SHOPPING CART CONTROLLER
// ===========================

// Lấy giỏ hàng của user - hiển thị tất cả sản phẩm đã thêm vào giỏ
export const getCart = async (req, res) => {
  try {
    const userId = req.user.id; // Lấy ID user từ token đã xác thực

    // Include: lấy thêm thông tin product và variant để hiển thị đầy đủ
    const cartItems = await prisma.shoppingCart.findMany({
      where: { userId }, // Chỉ lấy giỏ hàng của user hiện tại
      include: {
        product: {
          include: {
            images: {
              where: { isPrimary: true }, // Chỉ lấy ảnh chính của sản phẩm
              take: 1
            }
          }
        },
        variant: true // Lấy thông tin biến thể (size, color, giá riêng)
      },
      orderBy: { createdAt: 'desc' } // Sắp xếp theo thời gian thêm mới nhất
    });

    // Tính toán giá cả và tổng tiền cho từng sản phẩm
    let totalAmount = 0; // Tổng tiền của toàn bộ giỏ hàng
    const processedCartItems = cartItems.map(item => {
      // Logic tính giá: ưu tiên giá variant, nếu không có thì dùng giá product
      const unitPrice = item.variant?.price || item.product.price;
      const salePrice = item.product.salePrice; // Giá khuyến mãi
      const finalPrice = salePrice || unitPrice; // Giá cuối cùng (ưu tiên sale price)
      const itemTotalPrice = finalPrice * item.quantity; // Tổng tiền của item này
      totalAmount += itemTotalPrice; // Cộng vào tổng tiền giỏ hàng

      // Trả về object đã được format sẵn cho frontend
      return {
        id: item.id, // ID của cart item
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: Number(unitPrice), // Giá đơn vị
        salePrice: salePrice ? Number(salePrice) : null, // Giá sale (nếu có)
        finalPrice: Number(finalPrice), // Giá cuối cùng
        totalPrice: Number(itemTotalPrice), // Tổng tiền của item này
        product: {
          id: item.product.id,
          name: item.product.name,
          imageUrl: item.product.imageUrl,
          primaryImage: item.product.images[0]?.imageUrl, // Ảnh chính
          stockQuantity: item.product.stockQuantity // Số lượng tồn kho
        },
        variant: item.variant ? {
          id: item.variant.id,
          width: item.variant.width,
          depth: item.variant.depth,
          height: item.variant.height,
          color: item.variant.color,
          material: item.variant.material,
          stockQuantity: item.variant.stockQuantity // Tồn kho của variant
        } : null
      };
    });

    // Trả về response với dữ liệu đã được xử lý
    res.status(200).json({
      message: "Lấy giỏ hàng thành công",
      cart: processedCartItems, // Danh sách sản phẩm đã format
      totalAmount: Number(totalAmount.toFixed(2)) // Tổng tiền (làm tròn 2 chữ số)
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// Thêm sản phẩm vào giỏ hàng - kiểm tra tồn kho và merge nếu đã có
export const addToCart = async (req, res) => {
  try {
    const userId = req.user.id; // Lấy ID user từ token
    const { productId, variantId, quantity = 1 } = req.body; // Lấy dữ liệu từ request body

   

    // Bước 1: Kiểm tra sản phẩm có tồn tại và còn active không
    const product = await prisma.product.findUnique({
      where: { 
        id: Number(productId),
        status: 'ACTIVE' // Chỉ lấy sản phẩm đang bán
      },
      include: {
        variants: variantId ? {
          where: { 
            id: Number(variantId), 
            isActive: true 
          }
        } : false
      }
    });

    

    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm hoặc sản phẩm đã ngừng bán" });
    }

    // Bước 2: Kiểm tra variant và tồn kho
    let availableStock = product.stockQuantity; // Mặc định dùng tồn kho của product
    logger.debug('Product stock checked', { productId, stock: product.stockQuantity });
    
    if (variantId) {
      logger.debug('Checking variant', { variantId });
      if (!product.variants || product.variants.length === 0) {
        logger.warn('Variant not found', { variantId });
        return res.status(400).json({ message: "Biến thể sản phẩm không tồn tại hoặc đã ngừng bán" });
      }
      availableStock = product.variants[0].stockQuantity; // Dùng tồn kho của variant
      logger.debug('Variant stock', { variantId, stock: availableStock });
    } else {
      logger.debug('Using product stock', { stock: availableStock });
    }

    // Bước 3: Kiểm tra tồn kho có đủ không
    logger.debug('Stock availability check', { availableStock, requestedQuantity: quantity });
    if (availableStock < quantity) {
      logger.warn('Not enough stock', { availableStock, requestedQuantity: quantity });
      return res.status(400).json({ 
        message: `Chỉ còn ${availableStock} sản phẩm trong kho`,
        availableStock 
      });
    }

    // Bước 4: Kiểm tra sản phẩm đã có trong giỏ hàng chưa (để merge)
    const existingCartItem = await prisma.shoppingCart.findFirst({
      where: {
        userId,
        productId: Number(productId),
        variantId: variantId ? Number(variantId) : null // Tìm theo cả productId và variantId
      }
    });

    let cartItem;
    if (existingCartItem) {
      // Nếu đã có trong giỏ: cộng dồn số lượng
      const newQuantity = existingCartItem.quantity + quantity;
      
      // Kiểm tra tổng số lượng không vượt quá tồn kho
      if (newQuantity > availableStock) {
        return res.status(400).json({ 
          message: `Tổng số lượng không được vượt quá ${availableStock}`,
          availableStock,
          currentQuantity: existingCartItem.quantity
        });
      }

      // Cập nhật số lượng trong database
      cartItem = await prisma.shoppingCart.update({
        where: { id: existingCartItem.id },
        data: { quantity: newQuantity }
      });
    } else {
      // Nếu chưa có trong giỏ: tạo mới cart item
      cartItem = await prisma.shoppingCart.create({
        data: {
          userId,
          productId: Number(productId),
          variantId: variantId ? Number(variantId) : null,
          quantity
        }
      });
    }

    // Trả về kết quả với thông tin cart item đã tạo/cập nhật
    res.status(201).json({
      message: existingCartItem ? "Đã cập nhật số lượng sản phẩm trong giỏ hàng" : "Đã thêm sản phẩm vào giỏ hàng",
      cartItem: {
        id: cartItem.id,
        productId: cartItem.productId,
        variantId: cartItem.variantId,
        quantity: cartItem.quantity
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// Cập nhật số lượng sản phẩm trong giỏ hàng - thay đổi số lượng của 1 item cụ thể
export const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.id; // Lấy ID user từ token
    const { cartItemId } = req.params; // Lấy ID cart item từ URL params
    const { quantity } = req.body; // Lấy số lượng mới từ request body

    // Validation: Kiểm tra cartItemId có hợp lệ không
    if (!cartItemId || isNaN(cartItemId)) {
      return res.status(400).json({ message: "ID giỏ hàng không hợp lệ" });
    }

    // Validation: Kiểm tra quantity có hợp lệ không
    if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) {
      return res.status(400).json({ message: "Số lượng phải là số nguyên dương" });
    }

    // Bước 1: Kiểm tra cart item có tồn tại và thuộc về user này không
    const existingCartItem = await prisma.shoppingCart.findFirst({
      where: {
        id: Number(cartItemId),
        userId // Đảm bảo chỉ user này mới có thể sửa giỏ hàng của mình
      },
      include: {
        product: true, // Lấy thông tin product để kiểm tra tồn kho
        variant: true  // Lấy thông tin variant để kiểm tra tồn kho
      }
    });

    if (!existingCartItem) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm trong giỏ hàng" });
    }

    // Bước 2: Kiểm tra tồn kho có đủ cho số lượng mới không
    const availableStock = existingCartItem.variant?.stockQuantity || existingCartItem.product.stockQuantity;
    
    if (quantity > availableStock) {
      return res.status(400).json({ 
        message: `Chỉ còn ${availableStock} sản phẩm trong kho`,
        availableStock 
      });
    }

    // Bước 3: Cập nhật số lượng trong database
    const updatedCartItem = await prisma.shoppingCart.update({
      where: { id: Number(cartItemId) },
      data: { quantity } // Thay đổi số lượng thành giá trị mới
    });

    // Trả về kết quả với thông tin đã cập nhật
    res.status(200).json({
      message: "Đã cập nhật số lượng sản phẩm trong giỏ hàng",
      cartItem: {
        id: updatedCartItem.id,
        productId: updatedCartItem.productId,
        variantId: updatedCartItem.variantId,
        quantity: updatedCartItem.quantity
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// Xóa sản phẩm khỏi giỏ hàng - xóa 1 item cụ thể
export const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id; // Lấy ID user từ token
    const { cartItemId } = req.params; // Lấy ID cart item từ URL params

    // Validation: Kiểm tra cartItemId có hợp lệ không
    if (!cartItemId || isNaN(cartItemId)) {
      return res.status(400).json({ message: "ID giỏ hàng không hợp lệ" });
    }

    // Bước 1: Kiểm tra cart item có tồn tại và thuộc về user này không
    const existingCartItem = await prisma.shoppingCart.findFirst({
      where: {
        id: Number(cartItemId),
        userId // Đảm bảo chỉ user này mới có thể xóa giỏ hàng của mình
      },
      include: {
        product: {
          select: {
            id: true,
            name: true // Chỉ lấy tên để hiển thị trong response
          }
        }
      }
    });

    if (!existingCartItem) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm trong giỏ hàng" });
    }

    // Bước 2: Xóa cart item khỏi database
    await prisma.shoppingCart.delete({
      where: { id: Number(cartItemId) }
    });

    // Trả về thông báo với tên sản phẩm đã xóa
    res.status(200).json({
      message: `Đã xóa "${existingCartItem.product.name}" khỏi giỏ hàng`,
      removedItem: {
        id: existingCartItem.id,
        productName: existingCartItem.product.name
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// Xóa tất cả sản phẩm trong giỏ hàng - làm trống hoàn toàn giỏ hàng
export const clearCart = async (req, res) => {
  try {
    const userId = req.user.id; // Lấy ID user từ token

    // Bước 1: Đếm số lượng sản phẩm trước khi xóa (để báo cáo)
    const cartCount = await prisma.shoppingCart.count({
      where: { userId } // Đếm tất cả cart items của user này
    });

    if (cartCount === 0) {
      return res.status(400).json({ message: "Giỏ hàng đã trống" });
    }

    // Bước 2: Xóa tất cả sản phẩm trong giỏ hàng của user này
    await prisma.shoppingCart.deleteMany({
      where: { userId } // Xóa tất cả cart items của user này
    });

    // Trả về thông báo với số lượng đã xóa
    res.status(200).json({
      message: `Đã xóa ${cartCount} sản phẩm khỏi giỏ hàng`,
      removedCount: cartCount
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// Lấy số lượng sản phẩm trong giỏ hàng - API cho icon giỏ hàng hiển thị số
export const getCartCount = async (req, res) => {
  try {
    const userId = req.user.id;

    // Đếm số lượng UNIQUE sản phẩm trong giỏ hàng
    const uniqueProductCount = await prisma.shoppingCart.count({
      where: { userId }
    });

    res.status(200).json({
      message: "Lấy số lượng giỏ hàng thành công",
      totalQuantity: uniqueProductCount
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};