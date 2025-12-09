import { Server } from 'socket.io';
import logger from '../utils/logger.js';
import prisma from './prisma.js';

/**
 *  WEBSOCKET SERVER - Real-time Order Updates, New Order Notifications
 * 
 * MỤC ĐÍCH:
 * - Khi admin cập nhật trạng thái đơn hàng trong database
 * - Tự động gửi thông báo đến user qua WebSocket (real-time)
 * - User nhận được update ngay lập tức, không cần refresh trang
 * 
 * DỮ LIỆU LẤY TỪ ĐÂU?
 * - KHÔNG lấy trực tiếp từ database
 * - Nhận dữ liệu từ controller (adminOrderController.js) sau khi update DB thành công
 * - Controller gọi hàm emitOrderStatusUpdate() và truyền dữ liệu vào
 */

let io = null; // Biến toàn cục lưu Socket.IO server instance

/**
 * HÀM 1: initializeSocket()
 * 
 * CHỨC NĂNG TỔNG: Khởi tạo Socket.IO server, cho phép frontend kết nối và xử lý các event
 * 
 * Làm gì:
 * - Tạo Socket.IO server
 * - Cho phép frontend kết nối (CORS)
 * - Lắng nghe client kết nối và xử lý: join:user, join:admin, join:order
 * 
 * Khi nào chạy: Khi backend server khởi động (trong server.js)
 * 
 * @param {http.Server} server - HTTP server từ Express
 * @returns {Server} Socket.IO server instance
 */
export const initializeSocket = (server) => {
  // Tạo Socket.IO server
  // server: HTTP server từ Express (đã có sẵn)
  io = new Server(server, {
    cors: {
      // Cho phép frontend từ các origin này kết nối
      origin: [
        'http://localhost:5173',              // Frontend local (Vite dev server)
        'https://web-ecommerce-rosy.vercel.app' // Frontend production
      ],
      methods: ['GET', 'POST'],
      credentials: true // Cho phép gửi cookies (để xác thực)
    },
    // Hỗ trợ cả WebSocket và polling (fallback nếu WebSocket không dùng được)
    transports: ['websocket', 'polling']
  });

  /**
   * io.on('connection', ...) - Xử lý khi client kết nối
   * 
   * socket.id là gì?
   * - socket.id: ID duy nhất TỰ ĐỘNG được tạo bởi Socket.IO
   * - KHÔNG phải ID từ database hay frontend gửi lên
   * - Socket.IO tự động tạo khi client kết nối (ví dụ: "abc123xyz")
   * - Mỗi client kết nối có một socket.id khác nhau
   * - Dùng để nhận biết từng kết nối riêng biệt
   
   * Lưu ý:
   * - socket.id ≠ userId (ID người dùng trong database)
   * - socket.id chỉ để quản lý kết nối WebSocket
   * - userId dùng để phân biệt người dùng (từ database)
   */
  io.on('connection', (socket) => {
    console.log(' Client connected:', socket.id); // socket.id tự động có sẵn, không cần tạo

    /**
     * socket.on('join:user', ...) - User join room
     * 
     * CHỨC NĂNG: Thêm user vào room riêng của họ để nhận thông báo đơn hàng
     * 
     * ID lấy ở đâu: userId từ frontend gửi lên (socket.emit('join:user', userId))
     * - Frontend lấy userId từ localStorage hoặc token sau khi đăng nhập
     * 
     * Ví dụ: User ID = 5 → Join room "user:5" → Chỉ nhận thông báo đơn hàng của user 5
     */
    socket.on('join:user', (userId) => {
      const userRoom = `user:${userId}`; // userId từ frontend gửi lên
      socket.join(userRoom);
      console.log(' User joined room:', userRoom);
    });

    /**
     * socket.on('join:admin', ...) - Admin join room
     * 
     * CHỨC NĂNG: Thêm admin vào room "admin" để nhận tất cả thông báo đơn hàng
     * 
     * ID: Không cần ID, tất cả admin join cùng 1 room "admin"
     * 
     * Ví dụ: Admin join room "admin" → Nhận thông báo tất cả đơn hàng mới/cập nhật
     */
    socket.on('join:admin', () => {
      socket.join('admin');
      console.log(' Admin joined room');
    });

    /**
     * socket.on('join:order', ...) - Join order room
     * 
     * CHỨC NĂNG: Thêm user vào room của đơn hàng cụ thể để nhận update real-time
     * 
     * ID lấy ở đâu: orderId từ frontend gửi lên (socket.emit('join:order', orderId))
     * - Frontend lấy orderId từ URL (ví dụ: /orders/10 → orderId = 10)
     * 
     * Ví dụ: User xem đơn hàng #10 → Join room "order:10" → Nhận update ngay khi admin thay đổi
     */
    socket.on('join:order', (orderId) => {
      const orderRoom = `order:${orderId}`; // orderId từ frontend gửi lên
      socket.join(orderRoom);
      console.log('📦 Joined order room:', orderRoom);
    });

    /**
     * socket.on('disconnect', ...) - Xử lý khi client ngắt kết nối
     * 
     * Giải thích:
     * - 'disconnect' là event built-in của Socket.IO (tự động trigger)
     * - Không cần client gửi event này
     * 
     * Khi nào chạy:
     * - Client đóng tab, refresh trang, mất kết nối mạng
     * 
     * Lưu ý:
     * - Socket.IO tự động remove client khỏi tất cả rooms
     * - Không cần gọi socket.leave() thủ công
     */
    socket.on('disconnect', () => {
      console.log(' Client disconnected:', socket.id);
    });
  });

  console.log(' Socket.IO server initialized');
  return io;
};

/**
 * HÀM 2: emitOrderStatusUpdate()
 * 
 * CHỨC NĂNG TỔNG: Gửi thông báo cập nhật trạng thái đơn hàng đến user và admin qua WebSocket
 * 
 * Làm gì:
 * - Gửi thông báo đến 3 room: user:{userId}, order:{orderId}, admin
 * - User nhận được update đơn hàng của họ
 * - Admin nhận được tất cả update
 * 
 * Khi nào chạy: Sau khi admin cập nhật đơn hàng thành công (trong adminOrderController.js)
 * 
 * ID lấy ở đâu:
 * - userId: Từ order.userId trong database (lấy từ currentOrder.userId trong controller)
 * - orderId: Từ orderData.id (lấy từ order đã update trong database)
 * 
 * LƯU Ý VỀ orderData:
 * - "orderData" là TÊN THAM SỐ TỰ ĐẶT (có thể đổi thành "data", "order", "orderInfo", ...)
 * - Nhưng OBJECT truyền vào phải có các field: id, orderNumber, status (và có thể có statusLabel)
 * - Controller gọi: emitOrderStatusUpdate(userId, { id, orderNumber, status })
 * 
 * @param {number} userId - ID của user sở hữu đơn hàng (từ DB: order.userId)
 * @param {Object} orderData - Dữ liệu đơn hàng đã cập nhật (tên tự đặt, nhưng phải có: id, orderNumber, status)
 */
export const emitOrderStatusUpdate = (userId, orderData) => {
  // Kiểm tra Socket.IO đã được khởi tạo chưa
  if (!io) {
    console.warn(' Socket.IO chưa được khởi tạo');
    return;
  }

  // Tạo tên các room
  const userRoom = `user:${userId}`;      // userId từ controller (order.userId trong DB)
  const orderRoom = `order:${orderData.id}`; // orderData.id từ controller (order.id sau khi update DB)

  /**
   * io.to(userRoom).emit(...) - Gửi event đến user room
   * 
   * io.to().emit() là gì?
   * - io: Socket.IO server instance
   * - .to(roomName): Chỉ định room cần gửi đến
   * - .emit(eventName, data): Gửi event với dữ liệu
   * 
   * Mục đích:
   * - User nhận được update cho tất cả đơn hàng của họ (dù đang ở trang nào)
   * 
   * Ví dụ:
   * - io.to("user:5").emit('order:status:updated', {...})
   * - Gửi đến tất cả client trong room "user:5"
   * - User 5 nhận được update dù đang ở trang nào
   */
  io.to(userRoom).emit('order:status:updated', {
    orderId: orderData.id,           // ID đơn hàng (từ DB)
    orderNumber: orderData.orderNumber, // Mã đơn hàng (từ DB)
    status: orderData.status,         // Trạng thái mới (từ DB)
    statusLabel: orderData.statusLabel, // Nhãn hiển thị (đã convert)
    updatedAt: new Date().toISOString() // Thời gian cập nhật 
  });

  /**
   * io.to(orderRoom).emit(...) - Gửi event đến order room
   * 
   * Mục đích:
   * - User đang xem chi tiết đơn hàng nhận được update ngay lập tức
   * 
   * Ví dụ:
   * - User đang xem /orders/10 → Đã join room "order:10"
   * - Admin update đơn hàng #10
   * - io.to("order:10").emit('order:status:updated', {...})
   * - User nhận được update ngay trên trang /orders/10 (không cần refresh)
   */
  io.to(orderRoom).emit('order:status:updated', {
    orderId: orderData.id,//ID đơn hàng (từ DB)
    orderNumber: orderData.orderNumber,//Mã đơn hàng (từ DB)
    status: orderData.status,//Trạng thái mới (từ DB)
    statusLabel: orderData.statusLabel,//Nhãn hiển thị (đã convert)
    updatedAt: new Date().toISOString()//Thời gian cập nhật 
  });

  /**
   * io.to('admin').emit(...) - Gửi event đến admin room
   * 
   * Mục đích:
   * - Admin dashboard cập nhật danh sách đơn hàng real-time
   * 
   * Ví dụ:
   * - Admin đã join room "admin"
   * - Bất kỳ đơn hàng nào được update
   * - io.to('admin').emit('order:status:updated', {...})
   * - Admin dashboard tự động cập nhật (không cần refresh)
   */
  io.to('admin').emit('order:status:updated', {
    orderId: orderData.id,//ID đơn hàng (từ DB)
    orderNumber: orderData.orderNumber,//Mã đơn hàng (từ DB)
    status: orderData.status,//Trạng thái mới (từ DB)
    statusLabel: orderData.statusLabel,//Nhãn hiển thị (đã convert)
    updatedAt: new Date().toISOString()//Thời gian cập nhật 
  });

  console.log('📤 Đã gửi thông báo cập nhật đơn hàng:', {
    userId,//ID của user sở hữu đơn hàng (từ DB)
    orderId: orderData.id,//ID đơn hàng (từ DB)
    status: orderData.status//Trạng thái mới (từ DB)
  });
};

/**
 * HÀM 3: emitNewOrder()
 * 
 * CHỨC NĂNG TỔNG: Gửi thông báo đơn hàng mới đến admin qua WebSocket
 * 
 * Làm gì:
 * - Gửi event 'order:new' đến room "admin"
 * - Admin nhận được thông báo ngay khi có đơn hàng mới (không cần refresh)
 * 
 * Khi nào chạy: Sau khi user tạo đơn hàng thành công (trong orderController.js)
 * 
 * ID lấy ở đâu:
 * - orderData.id: ID đơn hàng vừa tạo (từ DB sau khi tạo order)
 * - orderData.userId: ID khách hàng (từ DB: order.userId)
 * - orderData.orderNumber: Mã đơn hàng (từ DB: order.orderNumber)
 * 
 * @param {Object} orderData - Dữ liệu đơn hàng mới (từ DB sau khi tạo order)
 */
export const emitNewOrder = (orderData) => {
  // Kiểm tra Socket.IO đã được khởi tạo chưa
  if (!io) {
    console.warn('⚠️ Socket.IO chưa được khởi tạo');
    return;
  }

  /**
   * io.to('admin').emit('order:new', ...) - Gửi event đến admin room
   * 
   * Mục đích:
   * - Admin nhận được thông báo khi có đơn hàng mới
   * - Admin dashboard tự động cập nhật (không cần refresh)
   * 
   * Ví dụ:
   * - User tạo đơn hàng #10
   * - io.to('admin').emit('order:new', {...})
   * - Admin nhận được thông báo ngay lập tức
   */
  io.to('admin').emit('order:new', {
    orderId: orderData.id,                    // Từ DB: order.id sau khi tạo
    orderNumber: orderData.orderNumber,       // Từ DB: order.orderNumber
    userId: orderData.userId,                 // Từ DB: order.userId
    customerName: orderData.user ?            // Từ DB: order.user.firstName + lastName
      `${orderData.user.firstName || ''} ${orderData.user.lastName || ''}`.trim() 
      : 'Khách hàng',
    totalAmount: orderData.totalAmount,       // Từ DB: order.totalAmount
    status: orderData.status,                 // Từ DB: order.status
    createdAt: new Date().toISOString()       // Thời gian hiện tại
  });

  console.log('📦 Đã gửi thông báo đơn hàng mới:', {
    orderId: orderData.id,
    orderNumber: orderData.orderNumber,
    userId: orderData.userId
  });
};

/**
 *                    SOKET VỀ DANH MỤC
 * HÀM 4: emitCategoryCreated()
 * 
 * CHỨC NĂNG: Gửi thông báo khi có danh mục mới được tạo
 * 
 * Làm gì:
 * - Gửi event 'category:created' đến tất cả client
 * - Client nhận được sẽ tự động thêm danh mục mới vào danh sách (không cần reload)
 * 
 * Khi nào chạy: Sau khi admin tạo danh mục thành công (trong adminCategoryController.js)
 * 
 * @param {Object} categoryData - Dữ liệu danh mục vừa tạo (từ DB)
 */
export const emitCategoryCreated = (categoryData) => {
  // Kiểm tra Socket.IO đã được khởi tạo chưa
  if (!io) {
    console.warn('⚠️ Socket.IO chưa được khởi tạo');
    return;
  }

  // Gửi event đến tất cả client
  // io.emit() gửi đến TẤT CẢ client đang kết nối (không cần join room)
  io.emit('category:created', {
    id: categoryData.id,
    name: categoryData.name,
    slug: categoryData.slug,
    imageUrl: categoryData.imageUrl,
    isActive: categoryData.isActive,
    createdAt: categoryData.createdAt
  });

  // Không cần console.log để tránh spam terminal
  // console.log('✅ Đã gửi thông báo danh mục mới:', { id: categoryData.id, name: categoryData.name });
};

/**
 * HÀM 5: emitCategoryUpdated()
 * 
 * CHỨC NĂNG: Gửi thông báo khi danh mục được cập nhật
 * 
 * Làm gì:
 * - Gửi event 'category:updated' đến tất cả client
 * - Client nhận được sẽ tự động cập nhật danh mục trong danh sách
 * 
 * Khi nào chạy: Sau khi admin cập nhật danh mục thành công
 * 
 * @param {Object} categoryData - Dữ liệu danh mục đã cập nhật (từ DB)
 */
export const emitCategoryUpdated = (categoryData) => {
  if (!io) {
    console.warn('⚠️ Socket.IO chưa được khởi tạo');
    return;
  }

  io.emit('category:updated', {
    id: categoryData.id,
    name: categoryData.name,
    slug: categoryData.slug,
    imageUrl: categoryData.imageUrl,
    isActive: categoryData.isActive,
    updatedAt: categoryData.updatedAt
  });

  // Không cần console.log để tránh spam terminal
  // console.log('🔄 Đã gửi thông báo cập nhật danh mục:', { id: categoryData.id, name: categoryData.name });
};

/**
 * HÀM 6: emitCategoryDeleted()
 * 
 * CHỨC NĂNG: Gửi thông báo khi danh mục bị xóa
 * 
 * Làm gì:
 * - Gửi event 'category:deleted' đến tất cả client
 * - Client nhận được sẽ tự động xóa danh mục khỏi danh sách
 * 
 * Khi nào chạy: Sau khi admin xóa danh mục thành công
 * 
 * @param {number} categoryId - ID danh mục đã xóa
 */
export const emitCategoryDeleted = (categoryId) => {
  if (!io) {
    console.warn('⚠️ Socket.IO chưa được khởi tạo');
    return;
  }

  io.emit('category:deleted', {
    id: categoryId,
    deletedAt: new Date().toISOString()
  });

  // Không cần console.log để tránh spam terminal
  // console.log('🗑️ Đã gửi thông báo xóa danh mục:', { id: categoryId });
};

/**
 * HÀM 7: emitUserDeactivated() vô hiệu hóa user
 * 
 * CHỨC NĂNG: Gửi thông báo khi user bị vô hiệu hóa
 * 
 * Làm gì:
 * - Gửi event 'user:deactivated' đến room của user đó
 * - User nhận được sẽ tự động logout
 * 
 * Khi nào chạy: Sau khi admin vô hiệu hóa user (isActive = false)
 * 
 * @param {number} userId - ID của user bị vô hiệu hóa
 */
export const emitUserDeactivated = (userId) => {
  if (!io) {
    console.warn('⚠️ Socket.IO chưa được khởi tạo');
    return;
  }

  const userRoom = `user:${userId}`;
  
  console.log('🔴 Backend: Emit user:deactivated đến room:', userRoom);
  
  // Gửi event đến room của user đó
  io.to(userRoom).emit('user:deactivated', {
    userId,
    message: 'Tài khoản của bạn đã bị vô hiệu hóa',
    deactivatedAt: new Date().toISOString()
  });
  
  console.log('✅ Backend: Đã gửi event user:deactivated cho user ID:', userId);
};

/**
 * SOCKET BANNER - Gửi thông báo real-time khi admin CRUD banner
 */

// Gửi event khi tạo banner mới → Tất cả client nhận được và tự động thêm vào slider
//
export const emitBannerCreated = (bannerData) => {
  if (!io) return;//Kiểm tra Socket.IO đã được khởi tạo chưa
  io.emit('banner:created', { //Gửi event có tên  'banner:created' đến tất cả client
    id: bannerData.id,//ID banner (từ DB)
    title: bannerData.title,//Tiêu đề banner (từ DB)
    imageUrl: bannerData.imageUrl,//URL ảnh banner (từ DB)
    bannerPublicId: bannerData.bannerPublicId,//ID ảnh banner (từ DB)
    linkUrl: bannerData.linkUrl,//URL link banner (từ DB)
    isActive: bannerData.isActive,//Trạng thái banner (từ DB)
    sortOrder: bannerData.sortOrder,//Thứ tự banner (từ DB)
    createdAt: bannerData.createdAt//Thời gian tạo banner (từ DB)
  });
};

// Gửi event khi cập nhật banner → Client tự động cập nhật hoặc xóa (nếu bị tắt)
export const emitBannerUpdated = (bannerData) => {
  if (!io) return;//Kiểm tra Socket.IO đã được khởi tạo chưa
  io.emit('banner:updated', {//Gửi event có tên  'banner:updated' đến tất cả client
    id: bannerData.id,//ID banner (từ DB)
    title: bannerData.title,//Tiêu đề banner (từ DB)
    imageUrl: bannerData.imageUrl,//URL ảnh banner (từ DB)
    bannerPublicId: bannerData.bannerPublicId,//ID ảnh banner (từ DB)
    linkUrl: bannerData.linkUrl,//URL link banner (từ DB)
    isActive: bannerData.isActive,//Trạng thái banner (từ DB)
    sortOrder: bannerData.sortOrder,//Thứ tự banner (từ DB)
    updatedAt: bannerData.updatedAt//Thời gian cập nhật banner (từ DB)
  });
};

// Gửi event khi xóa banner → Client tự động xóa khỏi slider
export const emitBannerDeleted = (bannerId) => {
  if (!io) return;//Kiểm tra Socket.IO đã được khởi tạo chưa
  io.emit('banner:deleted', {//Gửi event có tên  'banner:deleted' đến tất cả client
    id: bannerId,//ID banner (từ DB)
    deletedAt: new Date().toISOString()//Thời gian xóa banner (từ DB)
  });
};

/**
 * SOCKET PRODUCT - Gửi thông báo real-time khi admin CRUD sản phẩm
 */

// Helper function để tính tổng stock từ variants
const calculateTotalStock = (product) => {
  if (!product.variants || product.variants.length === 0) {
    return 0;
  }
  return product.variants.reduce((sum, variant) => sum + (variant.stockQuantity || 0), 0);
};

// Gửi event khi tạo sản phẩm mới → Tất cả client nhận được và tự động thêm vào danh sách
export const emitProductCreated = (productData) => {
  if (!io) return;
  
  // Tính stockQuantity từ variants nếu có
  const stockQuantity = calculateTotalStock(productData);
  
  io.emit('product:created', {
    id: productData.id,
    name: productData.name,
    slug: productData.slug,
    description: productData.description,
    categoryId: productData.categoryId,
    brandId: productData.brandId,
    status: productData.status,
    isFeatured: productData.isFeatured,
    price: productData.price,
    salePrice: productData.salePrice,
    costPrice: productData.costPrice,
    imageUrl: productData.imageUrl,
    imagePublicId: productData.imagePublicId,
    metaTitle: productData.metaTitle,
    metaDescription: productData.metaDescription,
    viewCount: productData.viewCount || 0,
    stockQuantity: stockQuantity,
    createdAt: productData.createdAt
  });
};

// Gửi event khi cập nhật sản phẩm → Client tự động cập nhật hoặc xóa (nếu bị tắt)
export const emitProductUpdated = (productData) => {
  if (!io) return;
  
  // Tính stockQuantity từ variants nếu có
  const stockQuantity = calculateTotalStock(productData);
  
  io.emit('product:updated', {
    id: productData.id,
    name: productData.name,
    slug: productData.slug,
    description: productData.description,
    categoryId: productData.categoryId,
    brandId: productData.brandId,
    status: productData.status,
    isFeatured: productData.isFeatured,
    price: productData.price,
    salePrice: productData.salePrice,
    costPrice: productData.costPrice,
    imageUrl: productData.imageUrl,
    imagePublicId: productData.imagePublicId,
    metaTitle: productData.metaTitle,
    metaDescription: productData.metaDescription,
    viewCount: productData.viewCount || 0,
    stockQuantity: stockQuantity,
    updatedAt: productData.updatedAt
  });
};

// Gửi event khi xóa sản phẩm → Client tự động xóa khỏi danh sách
export const emitProductDeleted = (productId) => {
  if (!io) return;
  io.emit('product:deleted', {
    id: productId,
    deletedAt: new Date().toISOString()
  });
};

/**
 * SOCKET PRODUCT VARIANT - Gửi thông báo real-time khi admin CRUD biến thể
 */

// Gửi event khi tạo biến thể mới → Tất cả client nhận được và tự động thêm vào danh sách
export const emitVariantCreated = (variantData) => {
  if (!io) return;
  io.emit('variant:created', {
    id: variantData.id,
    productId: variantData.productId,
    stockQuantity: variantData.stockQuantity,
    minStockLevel: variantData.minStockLevel,
    isActive: variantData.isActive,
    width: variantData.width,
    depth: variantData.depth,
    height: variantData.height,
    heightMax: variantData.heightMax,
    warranty: variantData.warranty,
    material: variantData.material,
    weightCapacity: variantData.weightCapacity,
    color: variantData.color,
    dimensionNote: variantData.dimensionNote,
    createdAt: variantData.createdAt
  });
};

// Gửi event khi cập nhật biến thể → Client tự động cập nhật
export const emitVariantUpdated = (variantData) => {
  if (!io) return;
  io.emit('variant:updated', {
    id: variantData.id,
    productId: variantData.productId,
    stockQuantity: variantData.stockQuantity,
    minStockLevel: variantData.minStockLevel,
    isActive: variantData.isActive,
    width: variantData.width,
    depth: variantData.depth,
    height: variantData.height,
    heightMax: variantData.heightMax,
    warranty: variantData.warranty,
    material: variantData.material,
    weightCapacity: variantData.weightCapacity,
    color: variantData.color,
    dimensionNote: variantData.dimensionNote,
    updatedAt: variantData.updatedAt
  });
};

// Gửi event khi xóa biến thể → Client tự động xóa khỏi danh sách
export const emitVariantDeleted = (variantId, productId) => {
  if (!io) return;
  io.emit('variant:deleted', {
    id: variantId,
    productId: productId,
    deletedAt: new Date().toISOString()
  });
};
