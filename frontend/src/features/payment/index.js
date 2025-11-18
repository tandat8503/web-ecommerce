/**
 * Payment Module - MoMo Payment Integration
 * 
 * Cấu trúc:
 * - useMoMoPayment.js: Hook xử lý logic thanh toán MoMo
 * - PaymentResult.jsx: Trang hiển thị kết quả thanh toán
 * 
 * Thanh toán MoMo đã được tích hợp trực tiếp vào nút "Đặt hàng"
 * Không cần button riêng nữa!
 * 
 * Cách sử dụng:
 * import { useMoMoPayment, PaymentResult } from '@/features/payment';
 */

export { useMoMoPayment } from './useMoMoPayment';
export { default as PaymentResult } from './PaymentResult';

// Re-export API functions
export { createMoMoPayment, getPaymentStatus } from '@/api/payment';

