import { VNPay, ignoreLogger, ProductCode, VnpLocale, dateFormat } from 'vnpay';
import crypto from 'crypto'; // Thư viện xử lý mã hóa SHA512 (cần cho việc xác thực thủ công)
import qs from 'qs'; // Thư viện giúp chuyển đổi JavaScript Object thành chuỗi Query String chuẩn

// Cấu hình các thông tin cơ bản của Merchant (đối tác)
const VNPAY_CONFIG = {
  tmnCode: 'VJ57K4RO', // Mã Terminal (Mã Merchant) do VNPAY cấp
  hashSecret: 'NLVI2586C7FZMM9M59W26NEN1Z9PJU6S', // Secret Key dùng để mã hóa/xác thực giao dịch
  // URL mà VNPAY sẽ gọi lại (Callback) sau khi khách hàng thanh toán xong
  returnUrl: 'https://holley-ungaining-nonmischievously.ngrok-free.dev/api/payment/vnpay/return'
};

// const VNPAY_CONFIG = {
//   tmnCode: process.env.VNP_TMN_CODE || 'VJ57K4RO', 
//   hashSecret: process.env.VNP_HASH_SECRET || 'NLVI2586C7FZMM9M59W26NEN1Z9PJU6S',
//   returnUrl: process.env.VNP_RETURN_URL // Phải dùng biến này
// };


// Khởi tạo client VNPay
const vnpayClient = new VNPay({
  tmnCode: VNPAY_CONFIG.tmnCode, // Mã Merchant
  secureSecret: VNPAY_CONFIG.hashSecret, // Secret Key
  vnpHost: 'https://sandbox.vnpayment.vn', // URL của môi trường TEST (Sandbox)
  testMode: true, // true: Chế độ Test, false: Chế độ Production
  hashAlgorithm: 'SHA512', // Thuật toán mã hóa chữ ký
  loggerFn: ignoreLogger // Không hiển thị log trong console
});

/**
 * [Hàm 1/2] Tạo URL chuyển hướng (Redirect URL) cho khách hàng thanh toán.
 * @param {string} orderNumber - Mã đơn hàng gốc (ví dụ: ORDER-001)
 * @param {number} amount - Tổng số tiền cần thanh toán (VNĐ)
 * @param {string} orderInfo - Thông tin mô tả đơn hàng
 * @param {string} ipAddr - Địa chỉ IP của khách hàng
 */
export const createPayment = async (orderNumber, amount, orderInfo, ipAddr = '127.0.0.1') => {
  const txnRef = `${orderNumber}${Date.now()}`; // Tạo mã giao dịch duy nhất (Transaction Ref)
  const vnpAmount = Math.round(Number(amount || 0)); // Số tiền được làm tròn (chỉ để đảm bảo là số nguyên)

  // Tạo URL thanh toán
  const paymentUrl = await vnpayClient.buildPaymentUrl({
    // VNPAY yêu cầu số tiền phải nhân 100 (đơn vị là xu/cent), nhưng thư viện 'vnpay' sẽ tự xử lý việc nhân 100 này cho bạn.
    vnp_Amount: vnpAmount, // Số tiền (đã là VNĐ, thư viện sẽ tự nhân 100)
    vnp_IpAddr: (ipAddr === '::1' ? '127.0.0.1' : ipAddr) || '127.0.0.1', // Lấy IP khách hàng
    vnp_TxnRef: txnRef, // Mã giao dịch duy nhất
    vnp_OrderInfo: orderInfo || String(orderNumber), // Mô tả đơn hàng
    vnp_OrderType: ProductCode.Other, // Loại hàng hóa: Khác (Other)
    vnp_ReturnUrl: VNPAY_CONFIG.returnUrl, // URL Backend nhận kết quả sau khi khách hàng thanh toán xong
    vnp_Locale: VnpLocale.VN, // Ngôn ngữ hiển thị trên cổng thanh toán
    vnp_CreateDate: dateFormat(new Date()), // Thời gian tạo yêu cầu thanh toán
    // Thời gian hết hạn: Ngày hiện tại + 15 phút (15 * 60 * 1000 miligiây)
    vnp_ExpireDate: dateFormat(new Date(Date.now() + 15 * 60 * 1000))
  });

  return {
    paymentUrl, // URL mà Frontend sẽ dùng để chuyển hướng người dùng
    transactionId: txnRef, // Mã giao dịch để lưu vào database của bạn
    expiresAt: new Date(Date.now() + 15 * 60 * 1000) // Thời gian hết hạn giao dịch
  };
};

/**
 * [Hàm 2/2] Xác minh tính toàn vẹn và xác thực chữ ký (Secure Hash) của dữ liệu callback từ VNPAY.
 * Dữ liệu này được gửi từ VNPAY về hàm vnp_ReturnUrl của bạn.
 * * @param {object} params - Toàn bộ Query Parameters (URLSearchParams) mà VNPAY gửi về.
 * @returns {object} Kết quả xác thực và chi tiết giao dịch.
 */
export const verifyCallback = (params = {}) => {
  // 1. Lấy Secure Hash (chữ ký bảo mật) mà VNPAY gửi về để so sánh
  const secureHash = params.vnp_SecureHash ? params.vnp_SecureHash.toLowerCase() : '';

  // 2. Chuẩn bị dữ liệu để tự mã hóa lại (Checksum)
  const clone = { ...params }; // Sao chép toàn bộ tham số nhận được
  delete clone.vnp_SecureHash; // Loại bỏ chữ ký cũ
  delete clone.vnp_SecureHashType; // Loại bỏ loại mã hóa

  // 3. Sắp xếp lại dữ liệu theo thứ tự A-Z (Yêu cầu bắt buộc của VNPAY)
  const sorted = Object.keys(clone)
    .sort() // Sắp xếp key theo A-Z
    .reduce((acc, key) => {
      // Mã hóa URL từng giá trị, và thay thế %20 bằng dấu + (Yêu cầu của VNPAY)
      acc[key] = encodeURIComponent(String(clone[key] ?? '')).replace(/%20/g, '+');
      return acc;
    }, {});

  // 4. Tạo chuỗi dữ liệu (SignData) và Chữ ký mới (Signed)
  const signData = qs.stringify(sorted, { encode: false }); // Chuyển object đã sắp xếp thành chuỗi query

  const signed = crypto
    .createHmac('sha512', VNPAY_CONFIG.hashSecret) // Dùng Secret Key để mã hóa
    .update(Buffer.from(signData, 'utf-8')) // Cập nhật dữ liệu cần mã hóa (chuỗi SignData)
    .digest('hex') // Chuyển kết quả sang định dạng hex
    .toLowerCase(); // Chuyển thành chữ thường

  // 5. So sánh chữ ký để xác thực tính toàn vẹn của dữ liệu
  if (secureHash !== signed) {
    // Nếu chữ ký VNPAY gửi về khác chữ ký tự tạo => Dữ liệu đã bị thay đổi hoặc không hợp lệ
    return { isSuccess: false, message: 'Invalid signature' };
  }

  // 6. Trả về kết quả thành công và chi tiết giao dịch
  return {
    isSuccess: true, // Xác thực chữ ký thành công
    transactionId: clone.vnp_TxnRef, // Mã giao dịch (TxnRef)
    transactionNo: clone.vnp_TransactionNo, // Mã giao dịch VNPAY cấp (TransactionNo)
    responseCode: clone.vnp_ResponseCode, // Mã phản hồi (00 là thành công)
    bankCode: clone.vnp_BankCode, // Ngân hàng thanh toán
    // Lấy số tiền về VNĐ (VNPAY trả về đã nhân 100, cần chia 100 để lấy số gốc)
    amount: clone.vnp_Amount ? Number(clone.vnp_Amount) / 100 : 0,
    rawAmount: clone.vnp_Amount || null,//số tiền gốc
    orderInfo: clone.vnp_OrderInfo,//thông tin đơn hàng
    payDate: clone.vnp_PayDate // Ngày/giờ thanh toán
  };
};

export default {
  createPayment,//tạo URL thanh toán
  verifyCallback//xác thực callback từ VNPAY về hàm vnp_ReturnUrl của bạn đã khai báo trong config VNPAY_CONFIG

};
