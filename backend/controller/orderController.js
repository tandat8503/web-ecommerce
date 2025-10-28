
import prisma from "../config/prisma.js";

/**
 * Tạo mã đơn hàng tự động từ database
 * Format: <maKH><mã SP><ngay-thang><stt đơn của KH đã đặt>
 * Ví dụ: 001LAPT241221001, 001PHON241221002...
 * 
 * @param {number} userId - ID của khách hàng từ database
 * @param {string} productSku - Mã SKU của sản phẩm đầu tiên trong đơn hàng
 * @returns {Promise<string>} - Mã đơn hàng đã tạo
 */
const generateOrderNumber = async (userId, productSku) => {
  try {
    // ===== BƯỚC 1: LẤY THÔNG TIN KHÁCH HÀNG TỪ DATABASE =====
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true }
    });

    if (!user) {
      throw new Error('Không tìm thấy thông tin khách hàng trong database');
    }

    // Lấy mã khách hàng (maKH) - format 3 chữ số
    // VD: User ID = 1 -> 001, User ID = 25 -> 025
    const userCode = String(user.id).padStart(3, '0');
    
    // ===== BƯỚC 2: LẤY MÃ SẢN PHẨM TỪ SKU =====
    // Lấy 4 ký tự đầu của mã SKU sản phẩm để đưa vào mã đơn hàng
    // VD: SKU = "LAPTOP001" -> LAPT hoặc SKU = "PHONE" -> PHON
    let productCode = 'PROD'; // Mặc định nếu không có SKU
    
    if (productSku && productSku !== 'PROD') {
      // Lấy tối đa 4 ký tự từ mã SKU và chuyển thành chữ hoa
      productCode = productSku.substring(0, 4).toUpperCase().padEnd(4, 'X').substring(0, 4);
    }
    
    // ===== BƯỚC 4: LẤY NGÀY THÁNG HIỆN TẠI =====
    const now = new Date();
    
    // Lấy 2 chữ số cuối của năm (2024 -> 24)
    const year = now.getFullYear().toString().slice(-2);
    
    // Lấy tháng (1-12, thêm số 0 nếu < 10)
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    // Lấy ngày (1-31, thêm số 0 nếu < 10)
    const day = String(now.getDate()).padStart(2, '0');
    
    // Tạo mã ngày-tháng: YYMMDD
    // VD: 24/12/21 -> 241221
    const dateCode = `${year}${month}${day}`;
    
    // ===== BƯỚC 5: ĐẾM SỐ ĐƠN HÀNG CỦA KHÁCH HÀNG ĐÃ ĐẶT TRONG NGÀY TỪ DATABASE =====
    // Đếm số đơn hàng của KH này đã đặt trong ngày hôm nay
    const todayOrderCount = await prisma.order.count({
      where: {
        userId: user.id,
        createdAt: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()), // Bắt đầu ngày hôm nay 00:00:00
          lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) // Kết thúc ngày hôm nay 23:59:59
        }
      }
    });
    
    // Tạo số thứ tự đơn hàng (3 chữ số)
    // VD: Đơn hàng thứ 1 -> 001, thứ 2 -> 002
    const orderSequence = String(todayOrderCount + 1).padStart(3, '0');
    
    // ===== BƯỚC 6: TẠO MÃ ĐƠN HÀNG HOÀN CHỈNH =====
    // Format: <maKH><masp><mã SP><ngay-thang><stt đơn>
    // VD: 001PROLAP241221001 - Đơn hàng số 001 của KH 001, SP LAP, ngày 24/12/21
    const orderNumber = `${userCode}${shopCode}${productCode}${dateCode}${orderSequence}`;
    
    console.log(`✅ Tạo mã đơn hàng thành công: ${orderNumber} cho user ${user.id} (${user.email})`);
    
    return orderNumber;
    
  } catch (error) {
    console.error('❌ Lỗi khi tạo mã đơn hàng:', error);
    
    // Fallback: Tạo mã backup nếu có lỗi
    const timestamp = Date.now().toString().slice(-8);
    const userCode = String(userId).padStart(3, '0');
    const productCode = productSku ? productSku.substring(0, 4).toUpperCase() : 'XXXX';
    return `${userCode}PRO${productCode}${timestamp}`;
  }
};

/**
 * Tạo đơn hàng mới từ giỏ hàng
 */
export const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { addressId, paymentMethod, customerNote, couponCode } = req.body;

    // 1. Lấy giỏ hàng và địa chỉ
    const [cartItems, shippingAddress] = await Promise.all([
      prisma.shoppingCart.findMany({
        where: { userId },
        include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } }, variant: true }
      }),
      prisma.address.findFirst({ where: { id: Number(addressId), userId } })
    ]);

    if (!cartItems.length) return res.status(400).json({ message: "Giỏ hàng trống" });
    if (!shippingAddress) return res.status(400).json({ message: "Địa chỉ không hợp lệ" });

    // 2. Tính toán đơn hàng
    let subtotal = 0;
    const orderItems = [];
    const stockUpdates = [];

    for (const item of cartItems) {
      const stock = item.variant?.stockQuantity || item.product.stockQuantity;
      if (item.quantity > stock) {
        return res.status(400).json({ message: `Sản phẩm "${item.product.name}" chỉ còn ${stock} sản phẩm` });
      }

      const price = item.product.salePrice || item.variant?.price || item.product.price;
      const total = price * item.quantity;
      subtotal += total;

      orderItems.push({
        productId: item.productId,
        variantId: item.variantId,
        productName: item.product.name,
        productSku: item.variant?.sku || item.product.sku,
        variantName: item.variant?.name || null,
        quantity: item.quantity,
        unitPrice: price,
        totalPrice: total
      });

      stockUpdates.push({
        table: item.variantId ? 'ProductVariant' : 'Product',
        id: item.variantId || item.productId,
        currentStock: stock,
        quantity: item.quantity
      });
    }

    // 3. Xử lý mã giảm giá
    let discountAmount = 0;
    let couponId = null;

    if (couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: { code: couponCode, status: 'ACTIVE', startDate: { lte: new Date() }, endDate: { gte: new Date() } }
      });

      if (!coupon) return res.status(400).json({ message: "Mã giảm giá không hợp lệ" });
      if (coupon.usedCount >= coupon.usageLimit) return res.status(400).json({ message: "Mã đã hết lượt sử dụng" });
      if (subtotal < coupon.minimumAmount) return res.status(400).json({ message: `Đơn hàng phải tối thiểu ${coupon.minimumAmount}` });

      discountAmount = coupon.discountType === 'PERCENT' 
        ? (subtotal * coupon.discountValue) / 100 
        : coupon.discountValue;
      
      if (discountAmount > subtotal) discountAmount = subtotal;
      couponId = coupon.id;
    }

    // 4. Tính phí ship
    let shippingFee = 30000;
    try {
      const totalWeight = cartItems.reduce((sum, item) => sum + (0.5 * item.quantity), 0);
      const ghtkResult = await calculateGHTKShipping('TP. Hồ Chí Minh', 'Quận 8', shippingAddress.city, shippingAddress.district, totalWeight);
      shippingFee = ghtkResult.shippingFee;
    } catch (error) {
      console.error('GHTK API error:', error);
      shippingFee = subtotal >= 500000 ? 0 : 30000;
    }

    const totalAmount = subtotal + shippingFee - discountAmount;
    
    // Lấy mã SKU của sản phẩm đầu tiên trong giỏ hàng để tạo mã đơn hàng
    // cartItems[0].product.sku hoặc cartItems[0].variant.sku
    const firstProductSku = cartItems[0]?.variant?.sku || cartItems[0]?.product?.sku || 'PROD';
    
    // 5. Tạo mã đơn hàng với SKU sản phẩm từ database
    const orderNumber = await generateOrderNumber(userId, firstProductSku);

    // 6. Tạo transaction ID unique
    const transactionId = `TXN${Date.now()}${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // 7. Tạo đơn hàng và payment trong transaction
    const result = await prisma.$transaction(async (tx) => {
      // ===== TẠO ĐƠN HÀNG =====
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          subtotal,
          shippingFee,
          discountAmount,
          totalAmount,
          shippingAddress: {
            fullName: shippingAddress.fullName,
            phone: shippingAddress.phone,
            streetAddress: shippingAddress.streetAddress,
            ward: shippingAddress.ward,
            district: shippingAddress.district,
            city: shippingAddress.city,
            addressType: shippingAddress.addressType,
            note: shippingAddress.note
          },
          paymentMethod,
          customerNote
        }
      });

      // ===== TẠO PAYMENT RECORD =====
      // Tạo 1 Payment cho đơn hàng - đảm bảo 1 Order = 1 Payment
      await tx.payment.create({
        data: {
          orderId: order.id,
          paymentMethod, // Phải trùng với Order.paymentMethod
          paymentStatus: 'PENDING',
          amount: totalAmount,
          transactionId // Mã giao dịch duy nhất
        }
      });

      // ===== TẠO CHI TIẾT ĐƠN HÀNG =====
      await tx.orderItem.createMany({ 
        data: orderItems.map(item => ({ ...item, orderId: order.id })) 
      });

      // ===== TRỪ TỒN KHO =====
      for (const update of stockUpdates) {
        if (update.table === 'Product') {
          await tx.product.update({ 
            where: { id: update.id }, 
            data: { stockQuantity: update.currentStock - update.quantity } 
          });
        } else {
          await tx.productVariant.update({ 
            where: { id: update.id }, 
            data: { stockQuantity: update.currentStock - update.quantity } 
          });
        }
      }

      // ===== XỬ LÝ COUPON =====
      if (couponId) {
        await tx.coupon.update({ 
          where: { id: couponId }, 
          data: { usedCount: { increment: 1 } } 
        });
        await tx.couponUsage.create({ 
          data: { couponId, userId, orderId: order.id } 
        });
      }

      // ===== XÓA GIỎ HÀNG =====
      await tx.shoppingCart.deleteMany({ where: { userId } });
      
      return order;
    });

    // 7. Lấy thông tin đơn hàng đầy đủ
    const orderDetails = await prisma.order.findUnique({
      where: { id: result.id },
      include: {
        orderItems: { 
          include: { 
            product: { 
              include: { 
                images: { where: { isPrimary: true }, take: 1 } 
              } 
            }, 
            variant: true 
          } 
        },
        user: { 
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            email: true, 
            phone: true 
          } 
        },
        payments: true, // Include thông tin payment
        couponUsages: {
          include: { coupon: true }
        }
      }
    });

    res.status(201).json({ message: "Tạo đơn hàng thành công", order: orderDetails });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: "Lỗi server", error: process.env.NODE_ENV !== 'production' ? error.message : undefined });
  }
};

/**
 * Lấy danh sách đơn hàng của user với phân trang và lọc theo trạng thái
 * Hỗ trợ phân trang và lọc theo trạng thái đơn hàng
 */
export const getUserOrders = async (req, res) => {
  try {
    // Lấy ID của user từ token đã xác thực
    const userId = req.user.id;
    
    // Lấy các tham số từ query string: trang hiện tại, số lượng/trang, trạng thái
    const { page = 1, limit = 10, status } = req.query;

    // Tính số record cần bỏ qua để phân trang (ví dụ: trang 2, limit 10 -> skip 10)
    const skip = (Number(page) - 1) * Number(limit);
    
    // Tạo điều kiện where: chỉ lấy đơn hàng của user hiện tại
    const whereClause = { userId };
    
    // Nếu có filter theo trạng thái thì thêm vào điều kiện
    if (status) {
      whereClause.status = status;
    }

    // Thực hiện 2 query song song để tối ưu performance
    const [orders, totalCount] = await Promise.all([
      // Query 1: Lấy danh sách đơn hàng với phân trang
      prisma.order.findMany({
        where: whereClause,  // Điều kiện lọc
        include: {
          orderItems: {  // Include chi tiết sản phẩm trong đơn hàng
            include: {
              product: {  // Include thông tin sản phẩm
                include: {
                  images: { where: { isPrimary: true }, take: 1 }  // Chỉ lấy ảnh chính
                }
              },
              variant: true  // Include thông tin biến thể
            }
          }
        },
        orderBy: { createdAt: 'desc' },  // Sắp xếp theo ngày tạo mới nhất
        skip,  // Bỏ qua số record
        take: Number(limit)  // Lấy số record theo limit
      }),
      // Query 2: Đếm tổng số đơn hàng để tính phân trang
      prisma.order.count({ where: whereClause })
    ]);

    // Trả về response thành công với dữ liệu và thông tin phân trang
    res.status(200).json({
      message: "Lấy danh sách đơn hàng thành công",
      orders,  // Danh sách đơn hàng
      pagination: {  // Thông tin phân trang
        currentPage: Number(page),  // Trang hiện tại
        totalPages: Math.ceil(totalCount / Number(limit)),  // Tổng số trang
        totalCount,  // Tổng số đơn hàng
        hasNext: skip + Number(limit) < totalCount,  // Có trang tiếp theo không
        hasPrev: Number(page) > 1  // Có trang trước không
      }
    });
  } catch (error) {
    // Xử lý lỗi
    console.error('Get user orders error:', error);
    res.status(500).json({
      message: "Lỗi server",
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

/**
 * Lấy chi tiết đơn hàng theo ID
 * Chỉ cho phép user xem đơn hàng của chính mình
 */
export const getOrderById = async (req, res) => {
  try {
    // Lấy ID của user từ token đã xác thực
    const userId = req.user.id;
    
    // Lấy ID đơn hàng từ URL params
    const { id } = req.params;

    // Kiểm tra ID có hợp lệ không (phải là số)
    if (!id || isNaN(id)) {
      return res.status(400).json({ 
        message: "ID đơn hàng không hợp lệ" 
      });
    }

    // Tìm đơn hàng theo ID và kiểm tra thuộc về user hiện tại
    const order = await prisma.order.findFirst({
      where: { 
        id: Number(id),  // Chuyển ID thành số
        userId  // Đảm bảo đơn hàng thuộc về user hiện tại
      },
      include: {
        orderItems: {  // Include chi tiết sản phẩm trong đơn hàng
          include: {
            product: {  // Include thông tin sản phẩm
              include: {
                images: { where: { isPrimary: true }, take: 1 }  // Chỉ lấy ảnh chính
              }
            },
            variant: true  // Include thông tin biến thể sản phẩm
          }
        },
        user: {  // Include thông tin user đặt hàng
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        couponUsages: {  // Include thông tin mã giảm giá đã sử dụng
          include: { coupon: true }
        }
      }
    });

    // Kiểm tra đơn hàng có tồn tại không
    if (!order) {
      return res.status(404).json({ 
        message: "Không tìm thấy đơn hàng" 
      });
    }

    // Trả về thông tin đơn hàng chi tiết
    res.status(200).json({
      message: "Lấy chi tiết đơn hàng thành công",
      order
    });
  } catch (error) {
    // Xử lý lỗi
    console.error('Get order by ID error:', error);
    res.status(500).json({
      message: "Lỗi server",
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

/**
 * Hủy đơn hàng (chỉ được hủy khi status = PENDING)
 * Khi hủy đơn hàng sẽ hoàn trả lại tồn kho sản phẩm
 */
export const cancelOrder = async (req, res) => {
  try {
    // Lấy ID của user từ token đã xác thực
    const userId = req.user.id;
    
    // Lấy ID đơn hàng từ URL params
    const { id } = req.params;

    // Kiểm tra ID có hợp lệ không (phải là số)
    if (!id || isNaN(id)) {
      return res.status(400).json({ 
        message: "ID đơn hàng không hợp lệ" 
      });
    }

    // Tìm đơn hàng theo ID và kiểm tra thuộc về user hiện tại
    const order = await prisma.order.findFirst({
      where: { 
        id: Number(id),  // Chuyển ID thành số
        userId  // Đảm bảo đơn hàng thuộc về user hiện tại
      },
      include: {
        orderItems: {  // Include chi tiết sản phẩm để hoàn trả tồn kho
          include: {
            product: true,  // Include thông tin sản phẩm chính
            variant: true  // Include thông tin biến thể sản phẩm
          }
        }
      }
    });

    // Kiểm tra đơn hàng có tồn tại không
    if (!order) {
      return res.status(404).json({ 
        message: "Không tìm thấy đơn hàng" 
      });
    }

    // Kiểm tra đơn hàng có đang ở trạng thái PENDING không
    if (order.status !== 'PENDING') {
      return res.status(400).json({
        message: "Chỉ có thể hủy đơn hàng đang chờ xử lý"
      });
    }

    // ===== HỦY ĐƠN HÀNG VÀ HOÀN TRẢ TỒN KHO =====
    // Sử dụng transaction để đảm bảo tất cả operations thành công hoặc rollback
    await prisma.$transaction(async (tx) => {
      // ===== CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG =====
      // Cập nhật trạng thái đơn hàng thành CANCELLED và thanh toán thành FAILED
      await tx.order.update({
        where: { id: Number(id) },
        data: { 
          status: 'CANCELLED',  // Trạng thái: đã hủy
          paymentStatus: 'FAILED'  // Trạng thái thanh toán: thất bại
        }
      });

      // ===== HOÀN TRẢ TỒN KHO =====
      // Duyệt qua từng sản phẩm trong đơn hàng để hoàn trả tồn kho
      for (const orderItem of order.orderItems) {
        if (orderItem.variantId) {
          // Nếu có variant thì hoàn trả tồn kho variant
          await tx.productVariant.update({
            where: { id: orderItem.variantId },
            data: { 
              stockQuantity: { increment: orderItem.quantity }  // Tăng tồn kho lên
            }
          });
        } else {
          // Nếu không có variant thì hoàn trả tồn kho product chính
          await tx.product.update({
            where: { id: orderItem.productId },
            data: { 
              stockQuantity: { increment: orderItem.quantity }  // Tăng tồn kho lên
            }
          });
        }
      }
    });

    // Trả về response thành công
    res.status(200).json({
      message: "Hủy đơn hàng thành công"
    });
  } catch (error) {
    // Xử lý lỗi
    console.error('Cancel order error:', error);
    res.status(500).json({
      message: "Lỗi server",
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

/**
 * Tính phí vận chuyển với API Giao Hàng Tiết Kiệm (GHTK)
 * Sử dụng API thực tế để tính phí ship chính xác
 */
export const calculateShipping = async (req, res) => {
  try {
    // Lấy ID của user từ token đã xác thực
    const userId = req.user.id;
    
    // Lấy dữ liệu từ request body
    const { addressId, items } = req.body;

    // ===== KIỂM TRA ĐỊA CHỈ =====
    // Kiểm tra địa chỉ giao hàng có hợp lệ không
    const shippingAddress = await prisma.address.findFirst({
      where: { 
        id: Number(addressId), 
        userId 
      }
    });

    if (!shippingAddress) {
      return res.status(400).json({ 
        message: "Địa chỉ giao hàng không hợp lệ" 
      });
    }

    // ===== TÍNH GIÁ TRỊ VÀ TRỌNG LƯỢNG ĐƠN HÀNG =====
    let totalValue = 0;
    let totalWeight = 0;

    for (const item of items) {
      // Lấy thông tin sản phẩm
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      });

      if (!product) {
        return res.status(400).json({
          message: `Sản phẩm ID ${item.productId} không tồn tại`
        });
      }

      // Tính giá trị sản phẩm (ưu tiên giá khuyến mãi)
      const productPrice = product.salePrice || product.price;
      totalValue += productPrice * item.quantity;
      
      // Ước tính trọng lượng (giả sử mỗi sản phẩm 0.5kg)
      totalWeight += 0.5 * item.quantity;
    }

    // ===== TÍNH PHÍ SHIP VỚI API GHTK =====
    let shippingResult = {};

    try {
      // Gọi API GHTK để tính phí ship
      shippingResult = await calculateGHTKShipping(
        'TP. Hồ Chí Minh', // Tỉnh shop
        'Quận 8', // Quận shop
        shippingAddress.city, // Tỉnh người nhận
        shippingAddress.district, // Quận người nhận
        totalWeight
      );
    } catch (apiError) {
      console.error('GHTK API error:', apiError);
      // Fallback về logic cũ nếu API lỗi
      shippingResult = {
        shippingFee: totalValue >= 500000 ? 0 : 30000,
        estimatedDelivery: "2-3 ngày",
        shippingMethod: totalValue >= 500000 ? "FREE_SHIP" : "STANDARD"
      };
    }

    // Trả về thông tin phí vận chuyển
    res.status(200).json({
      message: "Tính phí vận chuyển thành công",
      shipping: {
        ...shippingResult,
        totalWeight: Math.round(totalWeight * 10) / 10,
        totalValue,
        shippingProvider: "GHTK",
        shippingAddress: {
          city: shippingAddress.city,
          district: shippingAddress.district,
          ward: shippingAddress.ward
        }
      }
    });

  } catch (error) {
    // Xử lý lỗi
    console.error('Calculate shipping error:', error);
    res.status(500).json({
      message: "Lỗi server",
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

/**
 * Tính phí ship với API Giao Hàng Tiết Kiệm (GHTK)
 * @param {string} pickProvince - Tỉnh lấy hàng
 * @param {string} pickDistrict - Quận lấy hàng  
 * @param {string} province - Tỉnh giao hàng
 * @param {string} district - Quận giao hàng
 * @param {number} weight - Trọng lượng (kg)
 */
const calculateGHTKShipping = async (pickProvince, pickDistrict, province, district, weight) => {
  try {
    // Tạo URL với query parameters
    const params = new URLSearchParams({
      pick_province: pickProvince,
      pick_district: pickDistrict,
      province: province,
      district: district,
      weight: weight
    });

    // Gọi API GHTK
    const response = await fetch(`https://services.giaohangtietkiem.vn/services/shipment/fee?${params}`, {
      method: 'GET',
      headers: {
        'Token': process.env.GHTK_TOKEN || 'your_ghtk_token_here',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`GHTK API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Kiểm tra response có thành công không
    if (data.success === false) {
      throw new Error(`GHTK API error: ${data.message}`);
    }

    // Trả về kết quả đã format
    return {
      shippingFee: data.fee.fee || 30000, // Phí ship từ API hoặc fallback 30k
      estimatedDelivery: data.fee.deliver_time || "2-3 ngày", // Thời gian giao hàng
      shippingMethod: "GHTK_STANDARD", // Phương thức vận chuyển
      ghtkData: data.fee // Dữ liệu gốc từ GHTK để debug
    };

  } catch (error) {
    console.error('GHTK API call failed:', error);
    throw error; // Re-throw để fallback logic xử lý
  }
};

/**
 * Kiểm tra mã giảm giá trước khi đặt hàng
 * Giúp user biết mã có hợp lệ và số tiền được giảm
 */
export const validateCoupon = async (req, res) => {
  try {
    // Lấy ID của user từ token đã xác thực
    const userId = req.user.id;
    
    // Lấy dữ liệu từ request body
    const { couponCode, subtotal } = req.body;

    // Kiểm tra mã giảm giá có được cung cấp không
    if (!couponCode) {
      return res.status(400).json({
        message: "Mã giảm giá là bắt buộc"
      });
    }

    // ===== TÌM VÀ KIỂM TRA COUPON =====
    // Tìm coupon trong database
    const coupon = await prisma.coupon.findFirst({
      where: {
        code: couponCode,
        status: 'ACTIVE',
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    });

    // Kiểm tra coupon có tồn tại không
    if (!coupon) {
      return res.status(400).json({
        valid: false,
        message: "Mã giảm giá không hợp lệ hoặc đã hết hạn"
      });
    }

    // ===== KIỂM TRA ĐIỀU KIỆN SỬ DỤNG =====
    // Kiểm tra đã hết lượt sử dụng chưa
    if (coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({
        valid: false,
        message: "Mã giảm giá đã hết lượt sử dụng"
      });
    }

    // Kiểm tra đơn hàng có đạt giá trị tối thiểu không
    if (subtotal < coupon.minimumAmount) {
      return res.status(400).json({
        valid: false,
        message: `Đơn hàng phải có giá trị tối thiểu ${coupon.minimumAmount.toLocaleString('vi-VN')} VND để sử dụng mã này`,
        minimumAmount: coupon.minimumAmount,
        currentAmount: subtotal,
        requiredAmount: coupon.minimumAmount - subtotal
      });
    }

    // ===== TÍNH TOÁN SỐ TIỀN GIẢM GIÁ =====
    let discountAmount = 0;
    
    if (coupon.discountType === 'PERCENT') {
      // Giảm theo phần trăm
      discountAmount = (subtotal * coupon.discountValue) / 100;
    } else {
      // Giảm theo số tiền cố định
      discountAmount = coupon.discountValue;
    }

    // Đảm bảo số tiền giảm không vượt quá tổng tiền
    if (discountAmount > subtotal) {
      discountAmount = subtotal;
    }

    // Tính số tiền phải trả sau khi giảm giá
    const finalAmount = subtotal - discountAmount;

    // Trả về thông tin mã giảm giá hợp lệ
    res.status(200).json({
      valid: true,
      message: "Mã giảm giá hợp lệ",
      coupon: {
        code: coupon.code,
        name: coupon.name,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minimumAmount: coupon.minimumAmount,
        usageLimit: coupon.usageLimit,
        usedCount: coupon.usedCount,
        remainingUses: coupon.usageLimit - coupon.usedCount
      },
      discount: {
        discountAmount,
        finalAmount,
        savings: discountAmount
      }
    });

  } catch (error) {
    // Xử lý lỗi
    console.error('Validate coupon error:', error);
    res.status(500).json({
      message: "Lỗi server",
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};