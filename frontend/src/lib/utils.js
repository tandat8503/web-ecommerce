import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"
import { toast as toastify } from "react-toastify";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format số tiền VNĐ
 * @param {number|string} price - Giá tiền
 * @returns {string} - Giá đã format (VD: "1.000.000₫")
 */
export function formatPrice(price) {
  if (!price) return "0₫";
  
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  // Format theo chuẩn Việt Nam: dấu chấm phân cách hàng nghìn, ký hiệu ₫
  return new Intl.NumberFormat('vi-VN').format(numPrice) + '₫';
}

/**
 * Toast helper - Tự động đóng toast cũ trước khi hiển thị toast mới
 * Đảm bảo chỉ có 1 toast hiển thị tại một thời điểm
 */
export const toast = {
  success: (message) => {
    toastify.dismiss(); // Đóng tất cả toast cũ
    toastify.success(message);
  },
  error: (message) => {
    toastify.dismiss(); // Đóng tất cả toast cũ
    toastify.error(message);
  },
  info: (message) => {
    toastify.dismiss(); // Đóng tất cả toast cũ
    toastify.info(message);
  },
  warning: (message) => {
    toastify.dismiss(); // Đóng tất cả toast cũ
    toastify.warning(message);
  },
};