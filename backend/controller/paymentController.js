import prisma from '../config/prisma.js';
import vnpayService from '../services/payment/vnpayService.js';
import logger from '../utils/logger.js';

// Frontend URL
const frontendUrl = "http://localhost:5173";
// Hàm phân tích ngày tháng giờ từ chuỗi VNPay
const parseVNPayDate = (value) => {
  if (!value || String(value).length !== 14) return null;// Kiểm tra chuỗi có hợp lệ không
  const str = String(value);// Chuyển đổi thành chuỗi
  const year = Number(str.substring(0, 4));// Lấy năm
  const month = Number(str.substring(4, 6)) - 1;// Lấy tháng
  const day = Number(str.substring(6, 8));// Lấy ngày
  const hour = Number(str.substring(8, 10));// Lấy giờ
  const minute = Number(str.substring(10, 12));// Lấy phút
  const second = Number(str.substring(12, 14));// Lấy giây
  return new Date(year, month, day, hour, minute, second);// Trả về ngày tháng giờ
};

// ============================================
// VNPAY THANH TOÁN
// ============================================
export const createVNPayPayment = async (req, res) => {
  try {
    const userId = req.user.id;// Lấy ID của user
    const { orderId } = req.body;// Lấy ID của đơn hàng

    if (!orderId) {// Kiểm tra ID đơn hàng có hợp lệ không
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp Order ID' });// Trả về lỗi nếu không có ID đơn hàng
    }

    // Truy vấn DB để chắc chắn đơn hàng thuộc về user hiện tại và lấy cả danh sách payment + item
    const order = await prisma.order.findFirst({
      where: { id: Number(orderId), userId },
      include: { payments: true, orderItems: { include: { product: true } } }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }
// Kiểm tra phương thức thanh toán có phải VNPay không
    if (order.paymentMethod !== 'VNPAY') {
      return res.status(400).json({ success: false, message: 'Phương thức thanh toán không phải VNPay' });
    }

    // Kiểm tra DB xem đã từng tạo bản ghi payment cho đơn này chưa
    let payment = order.payments.find((p) => p.paymentMethod === 'VNPAY');
// Nếu chưa có bản ghi payment cho đơn hàng này thì tạo bản ghi mới
    if (!payment) {
      // Chưa có session thanh toán => tạo bản ghi payment mới trong DB
      payment = await prisma.payment.create({
        data: {
          orderId: order.id,// Lấy ID của đơn hàng
          paymentMethod: 'VNPAY',// Phương thức thanh toán là VNPay
          paymentStatus: 'PENDING',// Trạng thái thanh toán là PENDING
          amount: order.totalAmount,// Lấy tổng số tiền của đơn hàng
          transactionId: `VNPAY_${order.orderNumber}_${Date.now()}`// Tạo transaction ID
        }
      });
    }

    // Nếu đã có payment URL còn hạn và trạng thái vẫn PENDING thì tái sử dụng để tránh tạo giao dịch mới
    if (payment.paymentUrl && payment.expiresAt && payment.paymentStatus === 'PENDING') {
      const now = new Date();// Lấy ngày giờ hiện tại
      if (now < new Date(payment.expiresAt)) {// Kiểm tra xem session thanh toán còn hạn không
        return res.json({
          success: true,// Trả về kết quả thành công
          data: {
            paymentUrl: payment.paymentUrl,// Lấy URL thanh toán
            orderId: order.id,// Lấy ID của đơn hàng
            amount: Number(order.totalAmount)// Lấy tổng số tiền của đơn hàng
          }
        });
      }
    }

    // Khi giao dịch trước thất bại => reset dữ liệu để cho phép tạo session thanh toán mới
    if (payment.paymentStatus === 'FAILED') {
      // Ghi xuống DB để reset trạng thái payment
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          paymentStatus: 'PENDING',// Trạng thái thanh toán là PENDING
          paymentUrl: null,// URL thanh toán là null
          transactionId: `VNPAY_${order.orderNumber}_${Date.now()}`,// Tạo transaction ID
          expiresAt: null,// Hạn sử dụng là null
          vnpayTransactionNo: null,// Mã giao dịch VNPay là null
          bankCode: null,// Mã ngân hàng là null
          responseCode: null,// Mã phản hồi là null
          payDate: null// Ngày thanh toán là null
        }
      });
    }
// Lấy thông tin đơn hàng
    const orderInfo =
      order.orderItems // Lấy danh sách sản phẩm
        .slice(0, 3) // Lấy 3 sản phẩm đầu tiên
        .map((item) => item.product.name) // Lấy tên sản phẩm
        .join(', ') || `Đơn hàng ${order.orderNumber}`; // Nối tên sản phẩm bằng dấu phẩy

        // Lấy IP của client
    const clientIp =
      req.headers['x-forwarded-for'] || // Lấy IP từ header
      req.connection?.remoteAddress || // Lấy IP từ connection
      req.socket?.remoteAddress || // Lấy IP từ socket
      req.ip || // Lấy IP từ ip
      '127.0.0.1'; // IP mặc định là 127.0.0.1

    // Tạo payment URL
    const paymentData = await vnpayService.createPayment(
      order.orderNumber,// Lấy số đơn hàng
      Number(order.totalAmount),// Lấy tổng số tiền của đơn hàng
      orderInfo,// Lấy thông tin đơn hàng
      clientIp// Lấy IP của client
    );

    // Lưu xuống DB thông tin session thanh toán mới (URL + hạn sử dụng) để frontend redirect user
    await prisma.payment.update({
      where: { id: payment.id },// Lấy ID của payment
      data: {
        transactionId: paymentData.transactionId,// Lấy transaction ID
        paymentUrl: paymentData.paymentUrl,// Lấy URL thanh toán
        expiresAt: paymentData.expiresAt,// Lấy hạn sử dụng
        partnerCode: 'VNPAY'// Mã đối tác là VNPay
      }
    });

    return res.json({// Trả về kết quả thành công
      success: true,// Trả về kết quả thành công
      message: 'Tạo payment URL thành công',// Thông báo thành công
      data: {
        paymentUrl: paymentData.paymentUrl,// Lấy URL thanh toán
        orderId: order.id,// Lấy ID của đơn hàng
        orderNumber: order.orderNumber,// Lấy số đơn hàng
        amount: Number(order.totalAmount),// Lấy tổng số tiền của đơn hàng
        expiresAt: paymentData.expiresAt// Lấy hạn sử dụng
      }
    });
  } catch (error) {
    logger.error('Failed to create VNPay payment', { error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: error.message || 'Không thể tạo payment URL',
      error: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
};

// ============================================
// XỬ LÝ CALLBACK VNPAY Hàm Callback (IPN) là để đảm bảo dữ liệu đơn hàng luôn được cập nhật kể cả khi khách tắt máy
// ============================================
export const handleVNPayCallback = async (req, res) => {
  try {
    // Lấy payload từ body hoặc query
    const payload = Object.keys(req.body || {}).length ? req.body : req.query;
    // Xác thực payload
    const verifyResult = vnpayService.verifyCallback(payload);
    // Kiểm tra xem xác thực có thành công không
    if (!verifyResult.isSuccess) {
      return res.status(400).json({// Trả về lỗi nếu xác thực không thành công
        RspCode: '97',
        Message: verifyResult.message || 'Invalid signature'// Thông báo lỗi
      });
    }

    // Tìm bản ghi payment tương ứng trong DB để cập nhật trạng thái
    const payment = await prisma.payment.findFirst({
      where: {
        paymentMethod: 'VNPAY',// Phương thức thanh toán là VNPay
        transactionId: verifyResult.transactionId// Lấy transaction ID từ VNPay
      },
      include: { order: true }// Lấy thông tin đơn hàng từ DB
    });

    if (!payment) {
      return res.status(404).json({// Trả về lỗi nếu không tìm thấy payment
        RspCode: '01',// Mã phản hồi là 01
        Message: 'Payment not found'// Thông báo lỗi
      });
    }

    if (
      verifyResult.amount &&// Kiểm tra số tiền có hợp lệ không
      // Kiểm tra số tiền có khớp với số tiền trong payment không
      Math.round(Number(payment.amount)) !== Math.round(Number(verifyResult.amount))
    ) {
      return res.status(400).json({// Trả về lỗi nếu số tiền không khớp
        RspCode: '04',// Mã phản hồi là 04
        Message: 'Amount invalid'// Thông báo lỗi
      });
    }

    if (verifyResult.responseCode === '00') {// Kiểm tra mã phản hồi có phải là 00 không
      // Dùng transaction để đảm bảo cập nhật payment + order đồng thời trong DB
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id }, // Lấy ID của payment
          data: {
            paymentStatus: 'PAID',// Trạng thái thanh toán là PAID => Thanh toán thành công
            paidAt: new Date(),// Lấy ngày giờ hiện tại
            // KHÔNG cập nhật lại transactionId bằng mã giao dịch của VNPay
            // để luôn giữ nguyên vnp_TxnRef ban đầu (dùng để đối chiếu ở return)
            vnpayTransactionNo: verifyResult.transactionNo || payment.vnpayTransactionNo,// Lấy mã giao dịch VNPay
            bankCode: verifyResult.bankCode || payment.bankCode,// Lấy mã ngân hàng
            responseCode: verifyResult.responseCode,// Lấy mã phản hồi
            payDate: parseVNPayDate(verifyResult.payDate) || payment.payDate// Lấy ngày thanh toán
          }
        });

        await tx.order.update({
          where: { id: payment.orderId }, // Lấy ID của đơn hàng
          data: { paymentStatus: 'PAID' } // Trạng thái thanh toán là PAID => Thanh toán thành công
        });
      });

      return res.json({ RspCode: '00', Message: 'Success' });// Trả về kết quả thành công
    }

    // Trường hợp thất bại cũng cần transaction để giữ DB nhất quán
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id }, // Lấy ID của payment
        data: {
          paymentStatus: 'FAILED',// Trạng thái thanh toán là FAILED => Thanh toán thất bại
          responseCode: verifyResult.responseCode,// Lấy mã phản hồi
          payDate: parseVNPayDate(verifyResult.payDate) || payment.payDate// Lấy ngày thanh toán
        }
      });
      // Cập nhật trạng thái thanh toán của đơn hàng
      await tx.order.update({
        where: { id: payment.orderId }, // Lấy ID của đơn hàng
        data: { paymentStatus: 'FAILED' } // Trạng thái thanh toán là FAILED => Thanh toán thất bại
      });
    });

    return res.json({// Trả về kết quả thành công
      RspCode: verifyResult.responseCode || '99',// Lấy mã phản hồi
      Message: 'Payment failed'// Thông báo lỗi
    });
  } catch (error) {
    logger.error('VNPay callback error', { error: error.message, stack: error.stack });
    return res.status(500).json({
      RspCode: '99',
      Message: 'Server error'
    });
  }
};

// ============================================
// XỬ LÝ RETURN VNPAY ,đưa khách hàng quay trở lại website của mình sau khi thanh toán xong để xem kết quả thanh toán fe
// ============================================
export const handleVNPayReturn = async (req, res) => {
  try {
    // Xác thực payload
    const verifyResult = vnpayService.verifyCallback(req.query);
    // Kiểm tra xem xác thực có thành công không

    if (!verifyResult.isSuccess) {
      return res.redirect(`${frontendUrl}/payment/result?error=invalid_signature`);// Trả về lỗi nếu xác thực không thành công
    }

    // Tìm payment trong DB dựa trên transactionId mà VNPay gửi về
    const payment = await prisma.payment.findFirst({
      where: {
        paymentMethod: 'VNPAY',// Phương thức thanh toán là VNPay
        transactionId: verifyResult.transactionId// Lấy transaction ID
      },
      include: { order: true }// Lấy thông tin đơn hàng
    });

    if (!payment) {
      return res.redirect(`${frontendUrl}/payment/result?error=payment_not_found`);// Trả về lỗi nếu không tìm thấy payment
    }

    // Xử lý cập nhật trạng thái thanh toán
    if (verifyResult.responseCode === '00') {// Kiểm tra mã phản hồi có phải là 00 không
      if (payment.paymentStatus !== 'PAID') {// Kiểm tra trạng thái thanh toán có phải là PAID không
        // Transaction đảm bảo payment + order được cập nhật đồng bộ trong DB
        await prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: payment.id }, // Lấy ID của payment
            data: {
              paymentStatus: 'PAID',// Trạng thái thanh toán là PAID => Thanh toán thành công
              paidAt: new Date(),// Lấy ngày giờ hiện tại => Thanh toán thành công
            // KHÔNG cập nhật lại transactionId bằng mã giao dịch của VNPay
            // để luôn giữ nguyên vnp_TxnRef ban đầu (dùng để đối chiếu ở callback/return)
              vnpayTransactionNo: verifyResult.transactionNo || payment.vnpayTransactionNo,// Lấy mã giao dịch VNPay
              bankCode: verifyResult.bankCode || payment.bankCode,// Lấy mã ngân hàng
              responseCode: verifyResult.responseCode,// Lấy mã phản hồi
              payDate: parseVNPayDate(verifyResult.payDate) || payment.payDate// Lấy ngày thanh toán
            }
          });

          await tx.order.update({
            where: { id: payment.orderId }, // Lấy ID của đơn hàng
            data: { paymentStatus: 'PAID' } // Trạng thái thanh toán là PAID => Thanh toán thành công
          });
        });
      }

      // Redirect về frontend với delay để đảm bảo người dùng đã thấy trang VNPay
      // VNPay đã hiển thị trang kết quả của họ trước khi redirect về đây
      return res.redirect(
        `${frontendUrl}/payment/result?status=success&orderId=${payment.orderId}`// Trả về URL thanh toán thành công với ID đơn hàng
      );
    }

    // Xử lý trường hợp thất bại
    if (payment.paymentStatus !== 'FAILED') {
      // Transaction đảm bảo rollback đồng bộ nếu một trong hai thao tác DB lỗi
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id }, // Lấy ID của payment
          data: {
            paymentStatus: 'FAILED',// Trạng thái thanh toán là FAILED => Thanh toán thất bại
            responseCode: verifyResult.responseCode,// Lấy mã phản hồi
            payDate: parseVNPayDate(verifyResult.payDate) || payment.payDate// Lấy ngày thanh toán
          }
        });

        await tx.order.update({
          where: { id: payment.orderId }, // Lấy ID của đơn hàng
          data: { paymentStatus: 'FAILED' } // Trạng thái thanh toán là FAILED => Thanh toán thất bại
        });
      });
    }

    const message = verifyResult.responseCode === '24' ? 'Giao dịch bị hủy' : 'Thanh toán thất bại';// Lấy thông báo lỗi nếu giao dịch bị hủy hoặc thanh toán thất bại
    // Redirect về frontend - VNPay đã hiển thị trang kết quả của họ trước khi redirect về đây
    return res.redirect(
      `${frontendUrl}/payment/result?status=failed&orderId=${payment.orderId}&message=${encodeURIComponent(
        message
      )}`// Trả về URL thanh toán thất bại với ID đơn hàng và thông báo lỗi
    );
  } catch (error) {
    logger.error('VNPay return error', { error: error.message, stack: error.stack });
    return res.redirect(`${frontendUrl}/payment/result?error=server_error`);// Trả về lỗi nếu có lỗi
  }
};

// ============================================
// KIỂM TRA TRẠNG THÁI
// ============================================
/**
 * GET /api/payment/status/:orderId
 * Kiểm tra trạng thái thanh toán
 */
export const getPaymentStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    // Lấy đơn hàng + payment tương ứng từ DB để trả về cho frontend
    const order = await prisma.order.findFirst({
      where: { id: Number(orderId), userId },
      include: { payments: true }
    });

    if (!order || !order.payments[0]) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    const payment = order.payments[0];
    const responsePayload = {
      success: true,
      data: {
        paymentStatus: payment.paymentStatus,// Trạng thái thanh toán
        paymentMethod: payment.paymentMethod || order.paymentMethod,// Phương thức thanh toán
        paymentUrl: payment.paymentUrl,// URL thanh toán
        amount: Number(payment.amount),// Số tiền
        paidAt: payment.paidAt,// Ngày thanh toán
        transactionId: payment.transactionId,// Transaction ID
        orderNumber: order.orderNumber,// Số đơn hàng
        orderId: order.id,// ID đơn hàng
        expiresAt: payment.expiresAt,// Hạn sử dụng
        // VNPay specific fields
        bankCode: payment.bankCode,// Mã ngân hàng
        vnpayTransactionNo: payment.vnpayTransactionNo,// Mã giao dịch VNPay
        responseCode: payment.responseCode,// Mã phản hồi
      }
    };

    console.log('[Payment] Payment status response', responsePayload.data);

    return res.json({
      success: true,
      data: {
        paymentStatus: payment.paymentStatus,// Trạng thái thanh toán
        paymentMethod: payment.paymentMethod || order.paymentMethod,// Phương thức thanh toán
        paymentUrl: payment.paymentUrl,// URL thanh toán
        amount: Number(payment.amount),// Số tiền
        paidAt: payment.paidAt,// Ngày thanh toán
        transactionId: payment.transactionId,// Transaction ID
        bankCode: payment.bankCode,// Mã ngân hàng
        vnpayTransactionNo: payment.vnpayTransactionNo,// Mã giao dịch VNPay
        responseCode: payment.responseCode,// Mã phản hồi
      }
    });

  } catch (error) {
    return res.status(500).json({// Trả về lỗi nếu có lỗi
      success: false,// Trả về lỗi
      message: error.message,// Thông báo lỗi
    });
  }
};
