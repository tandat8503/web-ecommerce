import { generateVietQR, processWebhook, getSupportedBanks } from '../services/payment/tingeeService.js';
import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';
import { sendOrderConfirmedEmail } from '../services/Email/EmailServices.js';

/**
 * Tạo QR code
 */
export const generateQRCode = async (req, res) => {
  const context = { path: 'payment.tingee.generateQR' };
  
  try {
    logger.start(context.path, req.body);
    
    const { orderId, bankName, accountNumber } = req.body;//Lấy thông tin từ client gửi lên
    
    // Kiểm tra xem client có gửi thiếu ID đơn hàng, tên ngân hàng hay số tài khoản không
    if (!orderId || !bankName || !accountNumber) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: orderId, bankName, accountNumber'
      });
    }
    
    // Tìm đơn hàng trong db dựa trên ID đơn hàng
    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
    //Nếu không thấy đơn hàng thì báo lỗi
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }
    
    // Kiểm tra đơn hàng đã được thanh toán chưa
    //Nếu đơn hàng này đã trả tiền rồi thì không cho tạo QR nữa
    if (order.paymentStatus === 'PAID') {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng đã được thanh toán'
      });
    }
    
    // Tạo nội dung chuyển khoản tự động 
    const content = `Thanh toan don hang ${order.orderNumber}`;
    
    // Gọi hàm từ file Service để yêu cầu Tingee tạo mã QR
    const qrResult = await generateVietQR({
      bankName,//Tên ngân hàng
      accountNumber,//Số tài khoản
      amount: Number(order.totalAmount),//Số tiền
      content//Nội dung chuyển khoản
    });
    
    //Nếu Tingee trả về lỗi thì trả về lỗi đó cho client
    if (!qrResult.success) {
      throw new Error(qrResult.message || 'Lỗi khi tạo QR code');
    }
    
    // Kiểm tra xem đơn hàng này đã có bản ghi thanh toán nào trong DB chưa
    const existingPayment = await prisma.payment.findFirst({
      where: {
        orderId: order.id,//ID đơn hàng
        paymentMethod: 'TINGEE'//Phương thức thanh toán
      }
    });
    
    let payment;//Biến lưu thông tin thanh toán
    
    if (existingPayment) {
// Nếu có rồi thì cập nhật lại link QR mới và trạng thái "Chờ"      
      payment = await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          paymentUrl: qrResult.data.qrCodeImage,//URL QR code
          paymentStatus: 'PENDING'//Trạng thái thanh toán
        }
      });
    } else {
// Nếu chưa có thì tạo mới một bản ghi thanh toán với mã giao dịch duy nhất      
      const transactionId = `TINGEE_${order.orderNumber}_${Date.now()}`;
      
      payment = await prisma.payment.create({
        data: {
          orderId: order.id,
          paymentMethod: 'TINGEE',//Phương thức thanh toán
          paymentStatus: 'PENDING',//Trạng thái thanh toán
          amount: order.totalAmount,//Số tiền
          transactionId,//Mã giao dịch
          paymentUrl: qrResult.data.qrCodeImage,//URL QR code
          partnerCode: 'TINGEE'//Mã đối tác
        }
      });
    }
    
    
    logger.success('QR Code tạo thành công', {
      orderId: order.id,
      orderNumber: order.orderNumber,//Số đơn hàng
      amount: order.totalAmount,//Số tiền
      qrAccount: qrResult.data.qrAccount//Tài khoản chuyển khoản
    });
    
    logger.end(context.path, { orderId: order.id });
    //Trả về thông tin QR code cho client
    return res.json({
      success: true,
      message: 'QR Code tạo thành công',
      data: {
        qrCode: qrResult.data.qrCode,//Mã QR code
        qrCodeImage: qrResult.data.qrCodeImage,//URL QR code
        qrAccount: qrResult.data.qrAccount || accountNumber,//Tài khoản chuyển khoản
        referenceLabelCode: qrResult.data.referenceLabelCode,//Mã giao dịch
        orderNumber: order.orderNumber,//Số đơn hàng
        amount: Number(order.totalAmount),//Số tiền
        content,//Nội dung chuyển khoản
        bankName//Tên ngân hàng
      }
    });
    
  } catch (error) {
    logger.error('Lỗi khi tạo QR Code', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi tạo QR Code'
    });
  }
};

/**
 * Xử lý webhook,Xử lý khi Tingee báo có tiền
 * Hàm này cực kỳ quan trọng, nó tự động xác nhận đơn hàng khi khách chuyển khoản xong.
 */
export const handleWebhook = async (req, res) => {
  const context = { path: 'payment.tingee.webhook' };
  
  try {
    logger.start(context.path, {
      headers: {
        signature: req.headers['x-signature'],
        timestamp: req.headers['x-request-timestamp']
      },
      body: req.body
    });
    
    // // 1. Gọi hàm verify bên Service để kiểm tra chữ ký bảo mật từ Tingee gửi sang
    const result = await processWebhook(req.headers, req.body);
    
    // // 2. Nếu chữ ký không hợp lệ thì trả về lỗi
    if (result.code === '09') {
      logger.warn('Invalid webhook signature', {
        signature: req.headers['x-signature'],
        timestamp: req.headers['x-request-timestamp']
      });
      
      return res.json(result);
    }
    
    
    // 3. Lấy thông tin giao dịch từ body
    const {
      transactionCode,//Mã giao dịch
      amount,//Số tiền
      content,//Nội dung chuyển khoản
      bank,//Tên ngân hàng
      accountNumber,//Số tài khoản
      transactionDate//Ngày giao dịch
    } = req.body;
    
    logger.info('Tingee webhook data:', {
      transactionCode,//Mã giao dịch
      amount,//Số tiền
      content,//Nội dung chuyển khoản
      bank,//Tên ngân hàng
      accountNumber//Số tài khoản
    });
    
    
    let order = null;
    
    // 4. Tìm đơn hàng theo số đơn hàng trong nội dung chuyển khoản
    if (content) {
      const orderNumberMatch = content.match(/don hang (\w+)/i);
      if (orderNumberMatch) {
        const orderNumber = orderNumberMatch[1];
        order = await prisma.order.findUnique({
          where: { orderNumber },
          include: {
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true
              }
            }
          }
        });
      }
    }
    
    // 5. Nếu không tìm thấy đơn hàng theo số đơn hàng trong nội dung chuyển khoản thì tìm đơn hàng theo số tiền và thời gian giao dịch gần nhất
    if (!order) {
      logger.info('Finding order by amount', { amount });
      
      // Tìm đơn hàng với số tiền khớp và trạng thái PENDING, được tạo trong 30 phút gần nhất
      const recentOrders = await prisma.order.findMany({
        where: {
          totalAmount: Number(amount),
          paymentMethod: 'TINGEE',
          paymentStatus: 'PENDING',
          createdAt: {
            gte: new Date(Date.now() - 30 * 60 * 1000) // Tìm đơn hàng trong 30 phút gần nhất
          }
        },
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      if (recentOrders.length > 0) {
        order = recentOrders[0]; // Lấy đơn hàng gần nhất
        logger.info('Found order by amount', {
          orderId: order.id,
          orderNumber: order.orderNumber,
          amount: order.totalAmount
        });
      }
    }
   // Nếu tìm nát cả DB mà không ra đơn nào khớp thì báo lỗi
    if (!order) {
      logger.warn('Không tìm thấy đơn hàng', { amount, content });
      return res.json({
        code: '00',
        message: 'Không tìm thấy đơn hàng'
      });
    }
    
    
    // 6. Kiểm tra đơn hàng đã được thanh toán chưa
    if (order.paymentStatus === 'PAID') {
      logger.info('Đơn hàng đã được thanh toán', { orderNumber });
      return res.json({
        code: '02',
        message: 'Đơn hàng đã được thanh toán'
      });
    }
    
    // 7. Kiểm tra số tiền khách chuyển có khớp 100% với giá trị đơn hàng không
    if (Number(amount) !== Number(order.totalAmount)) {
      logger.warn('Số tiền không khớp', {
        orderNumber,
        expected: order.totalAmount,
        received: amount
      });
      
      return res.json({
        code: '00',
        message: 'Số tiền không khớp'
      });
    }
    
    // 8. Cập nhật trạng thái đơn hàng thành PAID và status thành CONFIRMED
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'PAID',//Đã thanh toán
        status: 'CONFIRMED'//Đã xác nhận
      }
    });
    
    // 9.CẬP NHẬT BẢN GHI THANH TOÁN: Lưu lại mã giao dịch ngân hàng để đối soát sau này
    await prisma.payment.updateMany({
      where: {
        orderId: order.id,
        paymentStatus: 'PENDING'//Đã thanh toán
      },
      data: {
        paymentStatus: 'PAID',//Đã thanh toán
        paidAt: new Date(),//Ngày thanh toán
        vnpayTransactionNo: transactionCode,//Mã giao dịch ngân hàng
        bankCode: bank,//Tên ngân hàng
        responseCode: '00'//Mã giao dịch ngân hàng
      }
    });
    // 10. Gửi email xác nhận thanh toán thành công
    try {
      const orderForEmail = await prisma.order.findUnique({
        where: { id: order.id },
        include: {
          orderItems: {
            select: {
              productName: true,
              variantName: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
            }
          },
          user: {
            select: {
              email: true,
            }
          }
        }
      });

      if (orderForEmail?.user?.email) {
        // Parse shippingAddress từ JSON string
        let shippingAddressParsed = orderForEmail.shippingAddress;
        try {
          if (typeof orderForEmail.shippingAddress === 'string') {
            shippingAddressParsed = JSON.parse(orderForEmail.shippingAddress);
          }
        } catch (e) {
          logger.warn('Failed to parse shippingAddress for email', { orderId: order.id });
        }

        const shippingAddressString = typeof shippingAddressParsed === 'object' 
          ? `${shippingAddressParsed.fullName || ''}\n${shippingAddressParsed.phone || ''}\n${shippingAddressParsed.streetAddress || ''}\n${shippingAddressParsed.ward || ''}, ${shippingAddressParsed.district || ''}, ${shippingAddressParsed.city || ''}`
          : orderForEmail.shippingAddress;

        // Format orderItems cho email template
        const emailOrderItems = orderForEmail.orderItems.map(item => ({
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
        }));

        await sendOrderConfirmedEmail({
          email: orderForEmail.user.email,
          order: {
            ...orderForEmail,
            orderItems: emailOrderItems,
            shippingAddress: shippingAddressString,
          }
        });
        logger.info('Email xác nhận đã được gửi sau khi thanh toán Tingee', { orderId: order.id });
      }
    } catch (emailError) {
      logger.warn('Lỗi khi gửi email xác nhận Tingee:', { orderId: order.id, error: emailError.message });
    }
    logger.success('Thanh toán thành công', {
      orderId: order.id,
      orderNumber,
      transactionCode,
      amount
    });
    
    logger.end(context.path, { orderId: order.id });
    
    return res.json({
      code: '00',
      message: 'Thanh toán thành công'
    });
    
  } catch (error) {
    logger.error('Lỗi khi xử lý Webhook', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    
    return res.json({
      code: '99',
      message: error.message || 'Lỗi khi xử lý Webhook'
    });
  }
};

/**
 * Lấy danh sách ngân hàng được hỗ trợ
 */
export const getBanks = async (req, res) => {
  try {
    const banks = getSupportedBanks();
    
    return res.json({
      success: true,
      data: banks
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
