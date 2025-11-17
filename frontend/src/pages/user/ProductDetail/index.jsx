import React from 'react';
import { useParams } from 'react-router-dom'; 
import BreadcrumbNav from '../../../components/user/BreadcrumbNav'; 
import { Skeleton } from '../../../components/ui/skeleton'; 
import { Card } from '../../../components/ui/card'; 
import { ProductDetailProvider, useProductDetailContext } from './ProductDetailContext'; // Context để chia sẻ state
import ProductImages from './components/ProductImages'; // Component hiển thị hình ảnh sản phẩm
import ProductInfo from './components/ProductInfo'; // Component hiển thị thông tin sản phẩm và nút hành động
import ProductDetails from './components/ProductDetails'; // Component hiển thị thông tin chi tiết sản phẩm
import FeaturedProducts from './components/FeaturedProducts'; // Component hiển thị sản phẩm nổi bật
import ProductComments from './components/ProductComment'; // Component hiển thị bình luận sản phẩm

/**
 * Component nội dung - Hiển thị chi tiết sản phẩm
 * Component này lấy data từ Context thay vì nhận props
 */
const ProductDetailContent = () => {
  // ============================================
  // LẤY DATA TỪ CONTEXT - Ngắn gọn, dễ hiểu
  // ============================================
  const { product, loading, error } = useProductDetailContext();

  // ============================================
  // TRẠNG THÁI LOADING - Hiển thị skeleton
  // ============================================
  // Khi đang load data từ API, hiển thị skeleton để người dùng biết đang tải
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-8xl mx-auto space-y-8">
            {/* Skeleton cho breadcrumb */}
            <Skeleton className="h-12 w-full" />
            {/* Grid layout giống với layout thật */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Cột trái - Skeleton cho hình ảnh */}
              <div className="lg:col-span-6 space-y-4">
                {/* Skeleton cho ảnh chính - hình vuông */}
                <Skeleton className="aspect-square w-full" />
                {/* Skeleton cho thumbnails - 4 ảnh nhỏ */}
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="w-16 h-16 rounded-md" />
                  ))}
                </div>
              </div>
              {/* Cột phải - Skeleton cho thông tin sản phẩm */}
              <div className="lg:col-span-6 space-y-4">
                <Skeleton className="h-12 w-3/4" /> {/* Tên sản phẩm */}
                <Skeleton className="h-8 w-1/2" />  {/* Giá */}
                <Skeleton className="h-10 w-full" /> {/* Nút */}
                <Skeleton className="h-32 w-full" /> {/* Mô tả */}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // TRẠNG THÁI LỖI - Hiển thị thông báo lỗi
  // ============================================
  // Nếu có lỗi từ API hoặc không tìm thấy sản phẩm
  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <Card className="p-12 text-center">
            {/* Hiển thị thông báo lỗi - màu đỏ */}
            <div className="text-red-500 text-lg mb-4">{error || 'Không tìm thấy sản phẩm'}</div>
            {/* Hướng dẫn người dùng */}
            <p className="text-gray-600">Vui lòng kiểm tra lại đường dẫn hoặc quay lại trang trước.</p>
          </Card>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER CHÍNH - Hiển thị trang chi tiết sản phẩm
  // ============================================
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ============================================
          PHẦN 1: HEADER - Breadcrumb Navigation
          ============================================ */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-8xl mx-auto px-4 py-6">
          {/* Component hiển thị đường dẫn breadcrumb (Trang chủ > Danh mục > Sản phẩm) */}
          <BreadcrumbNav />
        </div>
      </div>

      {/* ============================================
          PHẦN 2: PHẦN TRÊN - Hình ảnh + Thông tin sản phẩm
          ============================================ */}
      <div className="w-full px-4 py-8 bg-gray-100">
        <div className="max-w-8xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Cột trái - Hình ảnh sản phẩm (chiếm 6/12 cột trên desktop) */}
          <div className="lg:col-span-6">
            {/* Component tự lấy data từ Context - Không cần truyền props */}
            <ProductImages />
          </div>

          {/* Cột phải - Thông tin sản phẩm và nút hành động (chiếm 6/12 cột trên desktop) */}
          {/* Component tự lấy data từ Context - Không cần truyền props */}
          <ProductInfo />
        </div>
      </div>

      {/* ============================================
          PHẦN 3: PHẦN DƯỚI - Thông tin chi tiết + Sản phẩm nổi bật
          ============================================ */}
      <div className="w-full px-4 py-8 bg-blue-50">
        <div className="max-w-8xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Cột trái - Thông tin chi tiết sản phẩm (chiếm 9/12 cột trên desktop) */}
          <div className="lg:col-span-9">
            {/* Component tự lấy data từ Context - Không cần truyền props */}
            <ProductDetails />
            
            {/* 🆕 Component bình luận sản phẩm */}
            <ProductComments productId={product.id} />
          </div>

          {/* Cột phải - Sản phẩm nổi bật (chiếm 3/12 cột trên desktop) */}
          <div className="lg:col-span-3">
            {/* Component tự lấy data từ Context - Không cần truyền props */}
            <FeaturedProducts />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * ========================================
 * COMPONENT CHÍNH - Wrapper với Context Provider
 * ========================================
 * 
 * Component này:
 * - Lấy ID sản phẩm từ URL
 * - Bọc ProductDetailContent bằng Context Provider
 * - Provider sẽ load data và chia sẻ cho các component con
 */
const ProductDetail = () => {
  const { id } = useParams(); // Lấy ID sản phẩm từ URL

  return (
    <ProductDetailProvider productId={id}>
      <ProductDetailContent />
    </ProductDetailProvider>
  );
};

export default ProductDetail;
