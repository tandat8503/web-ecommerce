import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

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