import React, { useRef } from 'react';
import { Card } from '../../../../components/ui/card';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useProductDetailContext } from '../ProductDetailContext';

/**
 * Component hiển thị hình ảnh sản phẩm
 * - Ảnh chính lớn phía trên
 * - Thumbnails nhỏ bên dưới với nút < > để scroll
 * - Lấy data từ Context, không cần nhận props
 */
const ProductImages = () => {
  // ============================================
  // LẤY DATA TỪ CONTEXT - Không cần nhận props
  // ============================================
  const { 
    product,              // Thông tin sản phẩm (để lấy tên hiển thị alt)
    allImages,            // Mảng tất cả hình ảnh của sản phẩm
    currentImage,         // URL ảnh chính đang hiển thị
    selectedImageIndex,   // Index của ảnh được chọn (để highlight thumbnail)
    handleImageSelect     // Hàm xử lý khi click vào thumbnail
  } = useProductDetailContext();

  /**
   * Hàm chuyển đến ảnh trước (nút <)
   * - Nếu đang ở ảnh đầu tiên (index = 0) → Không làm gì
   * - Nếu không → Chuyển về ảnh trước đó (index - 1)
   */
  const handlePrevious = () => {
    if (selectedImageIndex > 0) {
      handleImageSelect(selectedImageIndex - 1);
    }
  };

  /**
   * Hàm chuyển đến ảnh tiếp theo (nút >)
   * - Nếu đang ở ảnh cuối cùng → Không làm gì
   * - Nếu không → Chuyển sang ảnh tiếp theo (index + 1)
   */
  const handleNext = () => {
    if (selectedImageIndex < allImages.length - 1) {
      handleImageSelect(selectedImageIndex + 1);
    }
  };

  return (
    <div className="space-y-4">
      {/* ============================================
          1. ẢNH CHÍNH - Hiển thị ảnh lớn với nút < > để chuyển ảnh
          ============================================ */}
      <Card className="aspect-square overflow-hidden p-0 bg-white relative group">
        {/* Nếu có ảnh: Hiển thị ảnh (object-contain: Giữ tỷ lệ, không cắt)
            Nếu không: Hiển thị placeholder */}
        {currentImage ? (
          <img 
            src={currentImage} 
            alt={product.name} 
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
            <span>Không có ảnh</span>
          </div>
        )}

        {/* NÚT < > TRÊN ẢNH CHÍNH - Chỉ hiển thị khi có nhiều hơn 1 ảnh */}
        {allImages?.length > 1 && (
          <>
            {/* NÚT < - Chuyển về ảnh trước
                - Hiển thị khi hover vào ảnh (group-hover:opacity-100)
                - Disable khi đang ở ảnh đầu tiên (selectedImageIndex === 0)
            */}
            <button
              onClick={handlePrevious}
              disabled={selectedImageIndex === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/80 hover:bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* NÚT > - Chuyển sang ảnh tiếp theo
                - Hiển thị khi hover vào ảnh (group-hover:opacity-100)
                - Disable khi đang ở ảnh cuối cùng
            */}
            <button
              onClick={handleNext}
              disabled={selectedImageIndex === allImages.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/80 hover:bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* INDICATOR - Hiển thị vị trí ảnh hiện tại (Ví dụ: 2/5) */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white text-sm">
              {selectedImageIndex + 1} / {allImages.length}
            </div>
          </>
        )}
      </Card>

      {/* ============================================
          2. THUMBNAILS - Ảnh nhỏ bên dưới để chọn nhanh
          ============================================ */}
      {/* Chỉ hiển thị khi có nhiều hơn 1 ảnh */}
      {allImages?.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {/* Map qua từng ảnh trong allImages để tạo thumbnail
              - key: Để React track element
              - onClick: Click → chọn ảnh này làm ảnh chính
              - flex-shrink-0: Không co lại khi container nhỏ
              - w-16 h-16: Kích thước 64x64px (mobile)
              - sm:w-20 sm:h-20: Kích thước 80x80px (desktop)
              - selectedImageIndex === index: Ảnh được chọn → viền đen
              - object-cover: Cắt ảnh vừa khung
              - cursor-pointer: Hiển thị con trỏ chuột khi hover
          */}
          {allImages.map((image, index) => (
            <button
              key={image.id || index}
              onClick={() => handleImageSelect(index)}
              className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded border-2 transition-all cursor-pointer ${
                selectedImageIndex === index 
                  ? "border-black"
                  : "border-gray-200 hover:border-gray-400"
              }`}
            >
              <img
                src={image.url}
                alt={`Ảnh ${index + 1}`}
                className="w-full h-full object-cover rounded"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImages;
