import React from 'react';
import { Button } from '../../../../components/ui/button';
import { useProductDetailContext } from '../ProductDetailContext';

/**
 * Component hiển thị selector cho variant (màu sắc, kích thước)
 * - Cho phép người dùng chọn màu sắc sản phẩm
 * - Cho phép người dùng chọn kích thước sản phẩm
 * - Lấy data từ Context, không cần nhận props
 */
const VariantSelector = () => {
  // ============================================
  // LẤY DATA TỪ CONTEXT - Không cần nhận props
  // ============================================
  const {
    selectedColor,        // Màu sắc đã được chọn
    selectedDimensions,   // Kích thước đã được chọn
    handleColorChange,    // Hàm xử lý khi người dùng chọn màu sắc
    handleDimensionsChange, // Hàm xử lý khi người dùng chọn kích thước
    uniqueColors,         // Danh sách các màu sắc khả dụng
    uniqueDimensions      // Danh sách các kích thước khả dụng
  } = useProductDetailContext();

  return (
    <div className="space-y-4">
      {/* ============================================
          PHẦN 1: CHỌN MÀU SẮC
          ============================================ */}
      {/* Chỉ hiển thị khi có màu sắc khả dụng */}
      {uniqueColors.length > 0 && (
        <div className="flex items-center gap-4">
          {/* Label hiển thị "Màu sắc:" - ở bên trái, width cố định */}
          <label className="text-base font-medium text-gray-700 whitespace-nowrap min-w-[100px]">
            Màu sắc:
          </label>
          {/* Container chứa các nút màu sắc - flex wrap để tự động xuống dòng khi cần */}
          <div className="flex flex-wrap gap-3 flex-1">
            {/* Map qua từng màu sắc để tạo nút */}
            {uniqueColors.map(color => (
              <Button
                key={color} // Key để React track element
                variant={selectedColor === color ? "default" : "outline"} // Nếu đã chọn thì dùng variant "default" (màu đậm), chưa chọn thì "outline" (viền)
                onClick={() => handleColorChange(color)} // Khi click thì gọi hàm handleColorChange với màu được chọn
                className="px-5 py-3 text-base font-medium" // Padding và font size
              >
                {color} {/* Hiển thị tên màu sắc */}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* ============================================
          PHẦN 2: CHỌN KÍCH THƯỚC
          ============================================ */}
      {/* Chỉ hiển thị khi có kích thước khả dụng */}
      {uniqueDimensions.length > 0 && (
        <div className="flex items-center gap-4">
          {/* Label hiển thị "Kích thước:" - ở bên trái, width cố định */}
          <label className="text-base font-medium text-gray-700 whitespace-nowrap min-w-[100px]">
            Kích thước:
          </label>
          {/* Container chứa các nút kích thước - flex wrap để tự động xuống dòng khi cần */}
          <div className="flex flex-wrap gap-3 flex-1">
            {/* Map qua từng kích thước để tạo nút */}
            {uniqueDimensions.map(dim => {
              // Tách chuỗi kích thước (ví dụ: "1200x600x720") thành mảng [width, depth, height]
              const [width, depth, height] = dim.split('x');
              // Tạo text hiển thị với ký tự x
              const displayText = `${width}x${depth}x${height}mm`;
              return (
                <Button
                  key={dim} // Key để React track element
                  variant={selectedDimensions === dim ? "default" : "outline"} // Nếu đã chọn thì dùng variant "default" (màu đậm), chưa chọn thì "outline" (viền)
                  onClick={() => handleDimensionsChange(dim)} // Khi click thì gọi hàm handleDimensionsChange với kích thước được chọn
                  className="px-5 py-3 text-base font-medium" // Padding và font size
                  title={`Chiều rộng: ${width}mm, Chiều sâu: ${depth}mm, Chiều cao: ${height}mm`} // Tooltip hiển thị khi hover
                >
                  {displayText} {/* Hiển thị kích thước dạng "1200x600x720mm" */}
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default VariantSelector;

