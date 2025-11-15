import React, { createContext, useContext } from 'react';
import { useProductDetail } from './useProductDetail';

/**
 * ========================================
 * PRODUCT DETAIL CONTEXT - Chia sẻ state giữa các component
 * ========================================
 * 
 * Context này giúp:
 * - Không cần truyền props qua nhiều level
 * - Component con tự lấy data cần thiết
 * - Code ngắn gọn và dễ đọc hơn
 */

// 1. Tạo một "kho chứa" để lưu data,null là giá trị mặc định khi không có data
const ProductDetailContext = createContext(null);

// 2. Provider Component:Cung cấp data 
export const ProductDetailProvider = ({ productId, children }) => {
  // Lấy tất cả data từ hook useProductDetail
  const productData = useProductDetail(productId);
  // 3. Cung cấp data cho các component con thông qua Provider
  // value: giá trị mà các component con có thể truy cập
  // productData: chứa tất cả data từ hook useProductDetail
  // Bọc children bằng Provider và truyền data qua value
  return (
    <ProductDetailContext.Provider value={productData}>
      {children}
    </ProductDetailContext.Provider>
  );
};

// 3. Custom hook lấy data từ Context để các component con sử dụng
export const useProductDetailContext = () => {
  //Dùng useContext để lấy data từ Context và trả về cho component con  
  const context = useContext(ProductDetailContext);
  //Nếu không có data, throw lỗi để dev biết
  if (!context) {
    throw new Error('useProductDetailContext phải được dùng trong ProductDetailProvider');
  }
  //Trả về data cho component con
  return context;
};



// 1. User vào /products/123
//    ↓
// 2. UI ProductDetail lấy id=123 từ URL
//    ↓
// 3. ProductDetailProvider nhận productId=123
//    ↓
// 4. useProductDetail(123) → Load data từ API
//    ↓
// 5. Provider truyền data vào Context
//    ↓
// 6. ProductImages, ProductInfo, ProductDetails...
//    → Dùng useProductDetailContext()
//    → Lấy data trực tiếp từ Context
//    → Không cần props!