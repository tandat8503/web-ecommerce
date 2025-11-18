import prisma from '../config/prisma.js';
import momoService from '../services/payment/momoMockService.js';
import logger from '../utils/logger.js';

// Frontend URL (hardcode giống momoMockService.js)
const frontendUrl = "http://localhost:5173";

// ============================================
// TẠO PAYMENT URL
// ============================================
/**
 * POST /api/payment/momo/create
 * Tạo payment URL từ MoMo để user thanh toán
 */
export const createMoMoPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.body;

    // Kiểm tra orderId
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp Order ID'
      });
    }

    // Tìm đơn hàng
    const order = await prisma.order.findFirst({
      where: { id: Number(orderId), userId },
      include: { payments: true, orderItems: { include: { product: true } } }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    // Kiểm tra payment method
    if (order.paymentMethod !== 'MOMO') {
      return res.status(400).json({
        success: false,
        message: 'Phương thức thanh toán không phải MoMo'
      });
    }

    logger.info('MoMo payment request received', {
      userId,
      orderId,
      orderNumber: order.orderNumber,
      amount: Number(order.totalAmount)
    });

    // Tìm hoặc tạo payment record
    let payment = order.payments[0];
    
    // Nếu chưa có payment, tạo mới
    if (!payment) {
      logger.debug('Creating new payment record', { orderId: order.id });
      payment = await prisma.payment.create({
        data: {
          orderId: order.id,
          paymentMethod: 'MOMO',
          paymentStatus: 'PENDING',
          amount: order.totalAmount,
          transactionId: `MOMO_${order.orderNumber}_${Date.now()}` // Tạm thời, sẽ update sau
        }
      });
      logger.success('Payment record created', { paymentId: payment.id });
    }

    // Nếu đã có payment URL và chưa hết hạn, trả về URL cũ
    if (payment?.paymentUrl && payment?.expiresAt) {
      const now = new Date();
      if (now < new Date(payment.expiresAt)) {
        logger.debug('Reusing existing payment URL');
        return res.json({
          success: true,
          data: {
            paymentUrl: payment.paymentUrl,
            orderId: order.id,
            amount: Number(order.totalAmount)
          }
        });
      }
    }

    // Tạo mô tả đơn hàng
    const orderInfo = order.orderItems
      .slice(0, 3)
      .map(item => item.product.name)
      .join(', ') || `Đơn hàng ${order.orderNumber}`;

    logger.debug('Calling MoMo API', { orderNumber: order.orderNumber });
    
    // Gọi MoMo API để tạo payment URL
    const paymentData = await momoService.createPayment(
      order.orderNumber,
      order.totalAmount,
      orderInfo
    );

    logger.success('MoMo payment created', {
      hasPaymentUrl: !!paymentData.paymentUrl,
      momoOrderId: paymentData.momoOrderId
    });

    // Lưu thông tin vào database
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        requestId: paymentData.requestId,           // Request ID từ MoMo
        paymentUrl: paymentData.paymentUrl,         // Payment URL
        momoOrderId: paymentData.momoOrderId,       // Order ID từ MoMo
        expiresAt: paymentData.expiresAt,           // Thời gian hết hạn
        partnerCode: "MOMO",                        // Partner code (hardcode)
      }
    });

    logger.success('Payment URL saved to database', { 
      paymentId: payment.id,
      paymentUrl: paymentData.paymentUrl,
      expiresAt: paymentData.expiresAt
    });

    // Log chi tiết để dễ debug
    console.log('[MoMo] Payment info', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentId: payment.id,
      momoOrderId: paymentData.momoOrderId,
      paymentUrl: paymentData.paymentUrl,
      expiresAt: paymentData.expiresAt
    });

    return res.json({
      success: true,
      message: 'Tạo payment URL thành công',
      data: {
        paymentUrl: paymentData.paymentUrl, // URL này frontend redirect để hiển thị giao diện QR MoMo
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: Number(order.totalAmount),
        expiresAt: paymentData.expiresAt
      }
    });

  } catch (error) {
    logger.error('Failed to create MoMo payment', {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: error.message || 'Không thể tạo payment URL',
      error: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
};

// ============================================
// XỬ LÝ CALLBACK TỪ MOMO
// ============================================
/**
 * POST /api/payment/momo/callback
 * Nhận callback từ MoMo sau khi user thanh toán
 */
export const handleMoMoCallback = async (req, res) => {
  try {
    const callbackData = req.body;
    const { signature, orderId: momoOrderId, amount, resultCode, message, transId } = callbackData;

    // Verify signature - tạo lại params để verify (bỏ signature ra)
    const { signature: _, ...verifyParams } = callbackData;
    if (!momoService.verifySignature(verifyParams, signature)) {
      return res.status(400).json({ resultCode: 1001, message: 'Invalid signature' });
    }

    // Tìm payment
    const payment = await prisma.payment.findUnique({
      where: { momoOrderId },
      include: { order: true }
    });

    if (!payment) {
      return res.status(404).json({ resultCode: 1002, message: 'Payment not found' });
    }

    // Kiểm tra số tiền
    if (Math.round(Number(payment.amount)) !== Math.round(Number(amount))) {
      return res.status(400).json({ resultCode: 1003, message: 'Amount mismatch' });
    }

    // Xử lý kết quả
    if (resultCode === 0) {
      // Thanh toán thành công
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { 
            paymentStatus: 'PAID',
            paidAt: new Date(),
            transactionId: transId || payment.transactionId  // Transaction ID từ MoMo
          }
        });

        await tx.order.update({
          where: { id: payment.orderId },
          data: { paymentStatus: 'PAID' }
        });
      });

      return res.json({ resultCode: 0, message: 'Success' });
    } else {
      // Thanh toán thất bại
      await prisma.payment.update({
        where: { id: payment.id },
        data: { paymentStatus: 'FAILED' }
      });

      await prisma.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: 'FAILED' }
      });

      return res.json({ resultCode, message: message || 'Payment failed' });
    }

  } catch (error) {
    logger.error('MoMo callback error', { error: error.message, stack: error.stack });
    return res.status(500).json({ resultCode: 1000, message: 'Server error' });
  }
};

// ============================================
// XỬ LÝ REDIRECT TỪ MOMO (KHI USER HỦY HOẶC THANH TOÁN XONG)
// ============================================
/**
 * GET /api/payment/momo/result
 * Nhận redirect từ MoMo sau khi user thanh toán hoặc hủy
 * MoMo sẽ redirect về đây với query params: resultCode, orderId, message, etc.
 */
export const handleMoMoRedirect = async (req, res) => {
  try {
    const { resultCode, orderId: momoOrderId, message, amount } = req.query;

    logger.info('MoMo redirect received', {
      resultCode,
      momoOrderId,
      message,
      amount
    });

    // Tìm payment theo momoOrderId
    const payment = await prisma.payment.findUnique({
      where: { momoOrderId },
      include: { order: true }
    });

    if (!payment) {
      logger.warn('Payment not found for redirect', { momoOrderId });
      // Redirect về frontend với thông báo lỗi
      return res.redirect(`${frontendUrl}/payment/result?error=payment_not_found`);
    }

    // Nếu resultCode != 0, nghĩa là user đã hủy hoặc thanh toán thất bại
    if (resultCode && Number(resultCode) !== 0) {
      logger.info('Payment failed/cancelled from redirect', {
        resultCode,
        momoOrderId,
        message
      });

      // Update payment status thành FAILED
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            paymentStatus: 'FAILED',
            paidAt: null
          }
        });

        await tx.order.update({
          where: { id: payment.orderId },
          data: { paymentStatus: 'FAILED' }
        });
      });

      logger.success('Payment status updated to FAILED from redirect', {
        paymentId: payment.id,
        orderId: payment.orderId
      });

      // Redirect về frontend với thông báo thất bại
      return res.redirect(
        `${frontendUrl}/payment/result?status=failed&orderId=${payment.orderId}&message=${encodeURIComponent(message || 'Thanh toán thất bại')}`
      );
    }

    // Nếu resultCode === 0, thanh toán thành công (nhưng callback IPN đã xử lý rồi)
    // Chỉ redirect về frontend với thông báo thành công
    if (resultCode && Number(resultCode) === 0) {
      return res.redirect(
        `${frontendUrl}/payment/result?status=success&orderId=${payment.orderId}`
      );
    }

    // Nếu không có resultCode, redirect về frontend
    return res.redirect(
      `${frontendUrl}/payment/result?orderId=${payment.orderId}`
    );

  } catch (error) {
    logger.error('MoMo redirect error', {
      error: error.message,
      stack: error.stack
    });
    return res.redirect(
      `${frontendUrl}/payment/result?error=server_error`
    );
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
        paymentStatus: payment.paymentStatus,
        paymentUrl: payment.paymentUrl,
        amount: Number(payment.amount),
        paidAt: payment.paidAt,
        transactionId: payment.transactionId,
        orderNumber: order.orderNumber,
        orderId: order.id,
        expiresAt: payment.expiresAt
      }
    };

    console.log('[MoMo] Payment status response', responsePayload.data);

    return res.json({
      success: true,
      data: {
        paymentStatus: payment.paymentStatus,
        paymentUrl: payment.paymentUrl,
        amount: Number(payment.amount),
        paidAt: payment.paidAt
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
