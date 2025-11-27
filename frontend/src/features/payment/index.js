/**
 * Payment Module - Payment Integration
 * 
 * Cấu trúc:
 * - PaymentResult.jsx: Trang hiển thị kết quả thanh toán
 * - vnpayPayment.js: Xử lý thanh toán VNPay
 * 
 * Cách sử dụng:
 * import { PaymentResult, handleVNPayPayment, parseVNPayResult } from '@/features/payment';
 */

export { default as PaymentResult } from './PaymentResult';

// Export VNPay utilities
export { handleVNPayPayment, parseVNPayResult } from './vnpayPayment';

// Re-export API functions
export { getPaymentStatus } from '@/api/payment';

