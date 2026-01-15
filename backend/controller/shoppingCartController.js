import prisma from "../config/prisma.js";
import logger from "../utils/logger.js";



/**
 *  GET CART - Lấy giỏ hàng của user
 */
export const getCart = async (req, res) => {
  try {
    
    const user_id = req.user.id;
    const cartItems = await prisma.shoppingCart.findMany({
      where: { userId: user_id }, // Lọc theo user_id
      include: { 
        product: {
          include: {
            images: {
              where: { isPrimary: true },
              take: 1
            }
          }
        },
        variant: true
      },
      orderBy: { createdAt: 'desc' } // Sắp xếp mới nhất trước
    });

    // ========================================
    // Tính toán giá và format response
    // ========================================
    let total_amount = 0; // Tổng tiền toàn bộ giỏ hàng
    let has_unavailable_items = false; // sản phẩm không còn tồn kho hoặc không còn bán
    
    const processedItems = cartItems.map(item => {
      const unit_price = item.product.price;//giá gốc
      const sale_price = item.product.salePrice;//giá khuyến mãi
      const final_price = sale_price || unit_price;//giá cuối cùng ưu tiên giá khuyến mãi,không có thì dùng unit_price
      const item_total = final_price * item.quantity; // Tổng tiền của item này = giá cuối cùng * số lượng
      
      // Kiểm tra sản phẩm có còn khả dụng không
      const is_product_available = item.product.status === 'ACTIVE';
      const is_variant_available = item.variant ? item.variant.isActive : true;
      const has_stock = item.variant ? item.variant.stockQuantity >= item.quantity : true;
      const is_available = is_product_available && is_variant_available && has_stock;//kiểm tra sản phẩm có còn tồn kho và còn bán
      
      // Chỉ cộng vào tổng tiền nếu sản phẩm còn khả dụng
      if (is_available) {
        total_amount += item_total; // Cộng dồn vào tổng tiền
      } else {
        has_unavailable_items = true;// có sản phẩm không còn tồn kho hoặc không còn bán
      }

      // Format response theo chuẩn snake_case (giống DB)
      return {
        id: item.id, // ID của cart item (bảng shopping_cart)
        product_id: item.productId, // ID sản phẩm
        variant_id: item.variantId, // ID biến thể
        quantity: item.quantity, // Số lượng
        unit_price: Number(unit_price), // Giá đơn vị
        sale_price: sale_price ? Number(sale_price) : null, // Giá sale (nếu có)
        final_price: Number(final_price), // Giá cuối cùng
        total_price: Number(item_total), // Tổng tiền của item này
        is_available, // Sản phẩm có còn khả dụng không
        unavailable_reason: !is_available ? (
          !is_product_available ? 'Sản phẩm không còn bán' :
          !is_variant_available ? 'Biến thể sản phẩm không còn bán' :
          'Không đủ hàng trong kho'
        ) : null,
        
        // Thông tin sản phẩm (từ bảng products)
        product: {
          id: item.product.id,//ID sản phẩm
          name: item.product.name,//Tên sản phẩm
          slug: item.product.slug,//Slug sản phẩm
          image_url: item.product.imageUrl,//URL ảnh sản phẩm
          primary_image: item.product.images[0]?.imageUrl, // Ảnh chính
          price: Number(item.product.price),//Giá gốc
          sale_price: sale_price ? Number(sale_price) : null,//Giá khuyến mãi
          status: item.product.status // Trạng thái sản phẩm (ACTIVE, INACTIVE, OUT_OF_STOCK)
        },
        
        // Thông tin biến thể (từ bảng product_variants)
        variant: item.variant ? {
          id: item.variant.id,
          width: item.variant.width, // Chiều rộng (cm)
          depth: item.variant.depth, // Chiều sâu (cm)
          height: item.variant.height, // Chiều cao (cm)
          height_max: item.variant.heightMax, // Chiều cao tối đa (cm) - cho ghế điều chỉnh
          color: item.variant.color, // Màu sắc
          material: item.variant.material, // Chất liệu
          warranty: item.variant.warranty, // Bảo hành
          weight_capacity: item.variant.weightCapacity ? Number(item.variant.weightCapacity) : null, // Tải trọng (kg)
          dimension_note: item.variant.dimensionNote, // Ghi chú kích thước
          stock_quantity: item.variant.stockQuantity, // Tồn kho
          min_stock_level: item.variant.minStockLevel, // Mức tồn kho tối thiểu
          is_active: item.variant.isActive // Trạng thái active
        } : null
      };
    });

    // Trả về response
    res.status(200).json({
      message: "Lấy giỏ hàng thành công",
      cart: processedItems,
      total_amount: Number(total_amount.toFixed(2)), // Làm tròn 2 chữ số thập phân
      has_unavailable_items // sản phẩm không còn tồn kho hoặc không còn bán
    });
    
  } catch (error) {
    logger.error('Get cart error:', error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

/**
 * ADD TO CART - Thêm sản phẩm vào giỏ hàng
 
 */
export const addToCart = async (req, res) => {
  try {
    // Lấy user_id từ token
    const user_id = req.user.id;
    
    // Lấy dữ liệu từ request body
    // Frontend gửi: { productId, variantId, quantity }
    // Backend map sang: { product_id, variant_id, quantity }
    const { productId: product_id, variantId: variant_id, quantity = 1 } = req.body;

    logger.info('Add to cart:', { user_id, product_id, variant_id, quantity });

    // ========================================
    // BƯỚC 1: Validate - variant_id BẮT BUỘC
    // ========================================
    // Tại sao BẮT BUỘC?
    // - Trong DB schema: shopping_cart.variant_id có thể NULL
    // - NHƯNG trong thực tế: Mỗi sản phẩm PHẢI có biến thể cụ thể
    // - VD: Ghế phải chọn màu sắc, kích thước cụ thể
    if (!variant_id) {
      return res.status(400).json({ 
        message: "Vui lòng chọn biến thể sản phẩm (màu sắc, kích thước)" 
      });
    }

    // ========================================
    // BƯỚC 2: Kiểm tra sản phẩm và variant tồn tại
    // ========================================
    // Query bảng products JOIN với product_variants
    const product = await prisma.product.findUnique({
      where: { 
        id: Number(product_id),
        status: 'ACTIVE' // Chỉ lấy sản phẩm đang bán 
      },
      include: {
        variants: {
          where: { 
            id: Number(variant_id),
            isActive: true // Chỉ lấy variant đang active
          }
        }
      }
    });

    // Kiểm tra sản phẩm có tồn tại không
    if (!product) {
      return res.status(404).json({ 
        message: "Sản phẩm không tồn tại hoặc đã ngừng bán" 
      });
    }

    // Kiểm tra variant có tồn tại không
    if (!product.variants || product.variants.length === 0) {
      return res.status(400).json({ 
        message: "Biến thể sản phẩm không tồn tại hoặc đã ngừng bán" 
      });
    }

    // Lấy variant và tồn kho
    const variant = product.variants[0];//lấy variant đầu tiên trong mảng variants vì mỗi sản phẩm chỉ có 1 variant
    const stock_quantity = variant.stockQuantity; // Column: stock_quantity trong bảng product_variants

    // ========================================
    // BƯỚC 3: Kiểm tra tồn kho
    // ========================================
    //  ĐÚNG: CHỈ kiểm tra tồn kho của variant CỤ THỂ này
    // VD: Ghế màu đỏ có 10 cái → stock_quantity = 10
    if (stock_quantity < quantity) {
      return res.status(400).json({ 
        message: `Chỉ còn ${stock_quantity} sản phẩm trong kho. Bạn đang muốn thêm ${quantity} sản phẩm.`,
        available_stock: stock_quantity 
      });
    }

    // ========================================
    // BƯỚC 4: Kiểm tra đã có trong giỏ chưa
    // ========================================
    // Query bảng shopping_cart với unique constraint: [user_id, product_id, variant_id]
    const existingCartItem = await prisma.shoppingCart.findFirst({
      where: {
        userId: user_id,
        productId: Number(product_id),
        variantId: Number(variant_id)
      }
    });

    let cartItem;

    if (existingCartItem) {
      // ========================================
      // Trường hợp 1: ĐÃ CÓ trong giỏ → Cộng dồn số lượng
      // ========================================
      const new_quantity = existingCartItem.quantity + quantity;
      
      // Kiểm tra tổng số lượng không vượt quá tồn kho
      if (new_quantity > stock_quantity) {
        const remaining = stock_quantity - existingCartItem.quantity;
        return res.status(400).json({ 
          message: `Bạn đã có ${existingCartItem.quantity} sản phẩm trong giỏ hàng. Chỉ có thể thêm tối đa ${remaining} sản phẩm nữa vì tồn kho chỉ còn ${stock_quantity}.`,
          available_stock: stock_quantity,
          current_quantity: existingCartItem.quantity
        });
      }

      // UPDATE bảng shopping_cart: Cập nhật quantity
      cartItem = await prisma.shoppingCart.update({
        where: { id: existingCartItem.id },
        data: { quantity: new_quantity }
      });

      logger.info('Updated cart item:', { id: cartItem.id, new_quantity });
      
    } else {
      // ========================================
      // Trường hợp 2: CHƯA CÓ trong giỏ → Tạo mới
      // ========================================
      // INSERT vào bảng shopping_cart
      cartItem = await prisma.shoppingCart.create({
        data: {
          userId: user_id,        // FK → users.id
          productId: Number(product_id),   // FK → products.id
          variantId: Number(variant_id),   // FK → product_variants.id
          quantity                // Số lượng
        }
      });

      logger.info('Created cart item:', { id: cartItem.id });
    }

    // ========================================
    // BƯỚC 5: Trả về response
    // ========================================
    res.status(201).json({
      message: existingCartItem 
        ? "Đã cập nhật số lượng sản phẩm trong giỏ hàng" 
        : "Đã thêm sản phẩm vào giỏ hàng",
      cart_item: {
        id: cartItem.id,
        product_id: cartItem.productId,
        variant_id: cartItem.variantId,
        quantity: cartItem.quantity
      }
    });

  } catch (error) {
    logger.error('Add to cart error:', error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

/**
 *  UPDATE CART ITEM - Cập nhật số lượng sản phẩm
 * Body: { quantity }
 */
export const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cartItemId } = req.params;
    const { quantity } = req.body;

    // Validation
    if (!cartItemId || isNaN(cartItemId)) {
      return res.status(400).json({ message: "ID giỏ hàng không hợp lệ" });
    }

    if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) {
      return res.status(400).json({ message: "Số lượng phải là số nguyên dương" });
    }

    // Lấy cart item
    const cartItem = await prisma.shoppingCart.findFirst({
      where: {
        id: Number(cartItemId),
        userId
      },
      include: {
        product: {
          include: {
            variants: { where: { isActive: true } }
          }
        },
        variant: true
      }
    });

    if (!cartItem) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm trong giỏ hàng" });
    }

    // ========================================
    // Kiểm tra tồn kho (stock_quantity từ bảng product_variants)
    // ========================================
    let stock_quantity = 0;
    
    if (cartItem.variantId && cartItem.variant) {
      //  ĐÚNG: Cart item có variant_id cụ thể
      // → CHỈ kiểm tra tồn kho của variant ĐÓ
      // VD: Ghế màu đỏ có 10 cái → stock_quantity = 10
      stock_quantity = cartItem.variant.stockQuantity;
      logger.debug('Check stock for specific variant:', { 
        variant_id: cartItem.variantId, 
        stock: stock_quantity 
      });
    } else {
      //  LỖI LOGIC CŨ: Không nên tính tổng tất cả variants
      //  ĐÚNG: Nếu cart item KHÔNG có variant_id → Báo lỗi
      // Vì trong DB schema, mỗi cart item PHẢI có variant_id cụ thể
      return res.status(400).json({ 
        message: "Sản phẩm phải có biến thể cụ thể (màu sắc, kích thước)" 
      });
    }

    if (quantity > stock_quantity) {
      return res.status(400).json({ 
        message: `Không thể cập nhật số lượng thành ${quantity}. Tồn kho chỉ còn ${stock_quantity} sản phẩm.`,
        available_stock: stock_quantity 
      });
    }

    // Cập nhật số lượng
    const updatedItem = await prisma.shoppingCart.update({
      where: { id: Number(cartItemId) },
      data: { quantity }
    });

    res.status(200).json({
      message: "Đã cập nhật số lượng sản phẩm",
      cartItem: {
        id: updatedItem.id,
        productId: updatedItem.productId,
        variantId: updatedItem.variantId,
        quantity: updatedItem.quantity
      }
    });

  } catch (error) {
    logger.error('Update cart item error:', error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

/**
 *  REMOVE FROM CART - Xóa sản phẩm khỏi giỏ hàng
 */
export const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cartItemId } = req.params;

    if (!cartItemId || isNaN(cartItemId)) {
      return res.status(400).json({ message: "ID giỏ hàng không hợp lệ" });
    }

    const cartItem = await prisma.shoppingCart.findFirst({
      where: {
        id: Number(cartItemId),
        userId
      },
      include: {
        product: {
          select: { id: true, name: true }
        }
      }
    });

    if (!cartItem) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm trong giỏ hàng" });
    }

    await prisma.shoppingCart.delete({
      where: { id: Number(cartItemId) }
    });

    res.status(200).json({
      message: `Đã xóa "${cartItem.product.name}" khỏi giỏ hàng`,
      removedItem: {
        id: cartItem.id,
        productName: cartItem.product.name
      }
    });

  } catch (error) {
    logger.error('Remove from cart error:', error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

/**
 *  CLEAR CART - Xóa tất cả sản phẩm trong giỏ hàng
 */
export const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cartCount = await prisma.shoppingCart.count({
      where: { userId }
    });

    if (cartCount === 0) {
      return res.status(400).json({ message: "Giỏ hàng đã trống" });
    }

    await prisma.shoppingCart.deleteMany({
      where: { userId }
    });

    res.status(200).json({
      message: `Đã xóa ${cartCount} sản phẩm khỏi giỏ hàng`,
      removedCount: cartCount
    });

  } catch (error) {
    logger.error('Clear cart error:', error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

/**
 *  GET CART COUNT - Lấy số lượng sản phẩm trong giỏ hàng
 */
export const getCartCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await prisma.shoppingCart.count({
      where: { userId }
    });

    res.status(200).json({
      message: "Lấy số lượng giỏ hàng thành công",
      totalQuantity: count
    });

  } catch (error) {
    logger.error('Get cart count error:', error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

