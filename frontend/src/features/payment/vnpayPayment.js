/**
 * ========================================
 * VNPAY PAYMENT UTILS
 * ========================================
 * Xử lý thanh toán VNPay - Ngắn gọn, dễ hiểu
 */

/**
 * Xử lý thanh toán VNPay
 * @param {number} orderId - ID đơn hàng
 * @param {Function} createVNPayPayment - API function để tạo payment URL
 * @param {Function} onError - Callback khi có lỗi
 * @returns {Promise<void>}
 */
export const handleVNPayPayment = async (orderId, createVNPayPayment, onError) => {
  try {
    // Gọi API tạo payment URL (đã được tối ưu ở backend)
    const response = await createVNPayPayment(orderId);
    const paymentData = response.data;

    // Kiểm tra response
    if (paymentData?.success && paymentData?.data?.paymentUrl) {
      // Redirect đến VNPay ngay lập tức (không delay)
      // Sử dụng window.location.replace để tránh lưu vào history
      window.location.replace(paymentData.data.paymentUrl);
    } else {
      throw new Error(paymentData?.message || 'Không tạo được payment URL');
    }
  } catch (error) {
    // Xử lý lỗi
    const errorMessage = error.response?.data?.message || error.message || 'Không thể tạo thanh toán VNPay';
    if (onError) {
      onError(errorMessage);
    } else {
      console.error('VNPay payment error:', errorMessage);
    }
    throw error;
  }
};

/**
 * Kiểm tra kết quả thanh toán từ URL (sau khi VNPay redirect về)
 * @param {URLSearchParams} searchParams - Query params từ URL
 * @returns {Object} - { status: 'success' | 'failed' | 'pending', orderId, message }
 */
export const parseVNPayResult = (searchParams) => {
  const status = searchParams.get('status');
  const orderId = searchParams.get('orderId');
  const message = searchParams.get('message');
  const error = searchParams.get('error');

  if (error) {
    return {
      status: 'error',
      orderId: orderId || null,
      message: error === 'invalid_signature' ? 'Chữ ký không hợp lệ' :
               error === 'payment_not_found' ? 'Không tìm thấy giao dịch' :
               error === 'server_error' ? 'Lỗi server' : 'Có lỗi xảy ra'
    };
  }

  if (status === 'success') {
    return {
      status: 'success',
      orderId: orderId || null,
      message: message || 'Thanh toán thành công'
    };
  }

  if (status === 'failed') {
    return {
      status: 'failed',
      orderId: orderId || null,
      message: message || 'Thanh toán thất bại'
    };
  }

  return {
    status: 'pending',
    orderId: orderId || null,
    message: 'Đang xử lý...'
  };
};

