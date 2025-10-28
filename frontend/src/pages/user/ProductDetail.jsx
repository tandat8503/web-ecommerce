import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPublicProductById, getPublicProducts } from '../../api/adminProducts';
import { getPublicProductVariants } from '../../api/adminproductVariant';
import { getPublicProductImages } from '../../api/adminProductImages';
import { Button } from '../../components/ui/button';
import { FaShare } from 'react-icons/fa';
import BreadcrumbNav from '../../components/user/BreadcrumbNav';
import { WishlistTextButton } from '../../components/user/WishlistButton';
import CartButton from '../../components/user/CartButton';
import { formatPrice } from '../../lib/utils';

/**
 * ProductDetail Component - Trang chi tiết sản phẩm
 * 
 * Mục đích: Hiển thị thông tin chi tiết sản phẩm và các biến thể
 * Chức năng:
 * - Load thông tin sản phẩm theo ID
 * - Load danh sách biến thể của sản phẩm
 * - Hiển thị options màu/size
 * - Xử lý chọn biến thể
 * - Add to cart với biến thể đã chọn
 */
const ProductDetail = () => {
  const { id } = useParams(); // Lấy productId từ URL
  const navigate = useNavigate();
  
  // State cho dữ liệu chính
  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [productImages, setProductImages] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State cho biến thể được chọn
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  
  // State cho UI
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Load dữ liệu sản phẩm và biến thể khi component mount
  useEffect(() => {
    if (id) {
      loadProductData();
    }
  }, [id]);

  // Load thông tin sản phẩm, biến thể và hình ảnh
  const loadProductData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Gọi song song 4 API (sử dụng API public)
      const [productRes, variantsRes, imagesRes, featuredRes] = await Promise.all([
        getPublicProductById(id), // Lấy sản phẩm theo ID (public API)
        getPublicProductVariants({ productId: id }), // Lấy biến thể theo productId (public API)
        getPublicProductImages(id), // Lấy hình ảnh theo productId (public API)
        getPublicProducts({ // Lấy sản phẩm nổi bật (public API)
          page: 1,
          limit: 5,
          isFeatured: true
        })
      ]);
      
      // Xử lý dữ liệu sản phẩm
      if (productRes.data) {
        setProduct(productRes.data);
      } else {
        setError('Không tìm thấy sản phẩm');
        return;
      }
      
      // Xử lý dữ liệu biến thể
      if (variantsRes.data?.data?.variants) {
        setVariants(variantsRes.data.data.variants);
        
        // Tự động chọn biến thể đầu tiên nếu có
        if (variantsRes.data.data.variants.length > 0) {
          const firstVariant = variantsRes.data.data.variants[0];
          setSelectedVariant(firstVariant);
          setSelectedColor(firstVariant.color || '');
          setSelectedSize(firstVariant.size || '');
        }
      }
      
      // Xử lý dữ liệu hình ảnh
      if (imagesRes.data?.items) {
        setProductImages(imagesRes.data.items);
      }
      
      // Xử lý dữ liệu sản phẩm nổi bật
      if (featuredRes.data?.items) {
        setFeaturedProducts(featuredRes.data.items);
      }
      
    } catch (err) {
      console.error('Error loading product data:', err);
      setError('Không thể tải thông tin sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  // Xử lý khi user chọn màu
  const handleColorChange = (color) => {
    setSelectedColor(color);
    const matchingVariant = variants.find(variant => 
      variant.color === color && variant.size === selectedSize
    );
    setSelectedVariant(matchingVariant || null);
  };

  // Xử lý khi user chọn size
  const handleSizeChange = (size) => {
    setSelectedSize(size);
    const matchingVariant = variants.find(variant => 
      variant.color === selectedColor && variant.size === size
    );
    setSelectedVariant(matchingVariant || null);
  };

  // Xử lý khi user thay đổi số lượng
  const handleQuantityChange = (newQuantity) => {
    if (newQuantity >= 1) {
      setQuantity(newQuantity);
    }
  };

  // Xử lý khi user click "Thêm vào giỏ hàng"
  const handleAddToCart = (result) => {
    console.log('Add to cart success:', result);
  };

  // Xử lý khi user chọn hình ảnh
  const handleImageSelect = (index) => {
    setSelectedImageIndex(index);
  };

  // Xử lý khi user click nút chia sẻ
  const handleShare = () => {
    console.log('Share product:', product);
  };

  // Xử lý khi user click "Mua ngay"
  const handleBuyNow = () => {
    if (variants.length > 0 && !selectedVariant) {
      alert('Vui lòng chọn màu và size');
      return;
    }
    alert(`Chuyển đến trang thanh toán với ${quantity} sản phẩm!`);
  };

  // Lấy danh sách màu unique từ variants
  const getUniqueColors = () => {
    return variants
      .map(v => v.color)
      .filter((color, index, self) => color && self.indexOf(color) === index);
  };

  // Lấy danh sách size unique từ variants
  const getUniqueSizes = () => {
    return variants
      .map(v => v.size)
      .filter((size, index, self) => size && self.indexOf(size) === index);
  };

  // Lấy giá hiển thị (ưu tiên giá biến thể, fallback về giá sản phẩm)
  const getDisplayPrice = () => {
    if (selectedVariant?.price) return selectedVariant.price;
    if (product?.salePrice && product.salePrice !== product.price) return product.salePrice;
    return product?.price || 0;
  };

  // Lấy stock hiển thị (ưu tiên stock biến thể, fallback về stock sản phẩm)
  const getDisplayStock = () => {
    if (selectedVariant?.stockQuantity !== undefined) return selectedVariant.stockQuantity;
    return product?.stockQuantity || 0;
  };

  // Lấy danh sách hình ảnh để hiển thị
  const getAllImages = () => {
    const images = [];
    
    // Thêm hình chính của sản phẩm (nếu có)
    if (product?.imageUrl) {
      images.push({ url: product.imageUrl, isMain: true, id: 'main' });
    }
    
    // Thêm các hình ảnh từ API
    if (productImages.length > 0) {
      productImages.forEach(img => {
        images.push({ 
          url: img.imageUrl, 
          isMain: img.isPrimary || false,
          id: img.id,
          sortOrder: img.sortOrder || 0
        });
      });
    }
    
    // Sắp xếp lại: ảnh chính trước, sau đó theo sortOrder
    return images.sort((a, b) => {
      if (a.isMain) return -1;
      if (b.isMain) return 1;
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });
  };

  // Lấy hình ảnh hiện tại để hiển thị
  const getCurrentImage = () => {
    const allImages = getAllImages();
    return allImages[selectedImageIndex]?.url || product?.imageUrl;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Đang tải thông tin sản phẩm...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center py-12">
            <div className="text-red-500 text-lg mb-4">{error || 'Không tìm thấy sản phẩm'}</div>
            <p className="text-gray-600">Vui lòng kiểm tra lại đường dẫn hoặc quay lại trang trước.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-8xl mx-auto px-4 py-6">
          <BreadcrumbNav />
        </div>
      </div>

      {/* DIV TRÊN - Màu xám: Hình ảnh + Thông tin sản phẩm */}
      <div className="w-full px-4 py-8 bg-gray-100">
        <div className="max-w-8xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Product Images - Cột trái (6/12) */}
          <div className="lg:col-span-6 space-y-6">
            {/* Hình ảnh chính */}
            <div className="aspect-square bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
              {getCurrentImage() ? (
                <img
                  src={getCurrentImage()}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                  <span>Không có ảnh</span>
                </div>
              )}
            </div>

            {/* Gallery hình ảnh nhỏ bên dưới */}
            {getAllImages().length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {getAllImages().map((image, index) => (
                  <button
                    key={index}
                    onClick={() => handleImageSelect(index)}
                    className={`flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-md overflow-hidden border-2 transition-all ${
                      selectedImageIndex === index
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={image.url}
                      alt={`${product.name} - Hình ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <WishlistTextButton 
                productId={Number(id)} 
                className="flex-1 cursor-pointer"
              />
              <Button
                variant="outline"
                onClick={handleShare}
                className="flex-1"
              >
                <FaShare className="mr-2 " />
                
                Chia sẻ
              </Button>
            </div>
          </div>

          {/* Product Info - Cột phải (6/12) */}
          <div className="lg:col-span-6 space-y-6">
            {/* Product Name & Brand */}
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
                {product.name}
              </h1>
              <p className="text-lg sm:text-xl text-gray-600">
                Thương hiệu: {product.brand?.name || 'N/A'}
              </p>
            </div>

            {/* Price */}
            <div className="space-y-2">
              {product.salePrice && product.salePrice !== product.price ? (
                <>
                  <div className="text-3xl sm:text-4xl font-bold text-red-600">
                    {formatPrice(product.salePrice)}
                  </div>
                  <div className="text-xl text-gray-500 line-through">
                    {formatPrice(product.price)}
                  </div>
                  <div className="text-base text-red-600 font-medium">
                    Tiết kiệm: {((product.price - product.salePrice) / product.price * 100).toFixed(0)}%
                  </div>
                </>
              ) : (
                <div className="text-3xl sm:text-4xl font-bold text-red-600">
                  {formatPrice(getDisplayPrice())}
                </div>
              )}
            </div>

            {/* Stock Status */}
            <div className="inline-flex items-center px-4 py-2 rounded-full text-base font-medium bg-green-100 text-green-800 border border-green-200">
              <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
              Còn lại: {getDisplayStock()} sản phẩm
            </div>

            {/* Variants Selection */}
            {variants.length > 0 && (
              <div className="space-y-4">
                {/* Color Selection */}
                {getUniqueColors().length > 0 && (
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-3">
                      Màu sắc:
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {getUniqueColors().map(color => (
                        <button
                          key={color}
                          onClick={() => handleColorChange(color)}
                          className={`px-5 py-3 rounded-md border text-base font-medium transition-colors ${
                            selectedColor === color
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                          }`}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Size Selection */}
                {getUniqueSizes().length > 0 && (
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-3">
                      Kích thước:
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {getUniqueSizes().map(size => (
                        <button
                          key={size}
                          onClick={() => handleSizeChange(size)}
                          className={`px-5 py-3 rounded-md border text-base font-medium transition-colors ${
                            selectedSize === size
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quantity & Add to Cart */}
            <div className="space-y-4">
              {/* Quantity Selector */}
              <div>
                <div className="flex items-center space-x-4">
                  <label className="text-base font-medium text-gray-700 whitespace-nowrap">
                    Số lượng:
                  </label>
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => handleQuantityChange(quantity - 1)}
                      disabled={quantity <= 1}
                      className="w-10 h-10 text-lg cursor-pointer"
                    >
                      -
                    </Button>
                    <span className="w-16 text-center font-medium text-lg">{quantity}</span>
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => handleQuantityChange(quantity + 1)}
                      disabled={quantity >= getDisplayStock()}
                      className="w-10 h-10 text-lg cursor-pointer"
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>

              {/* Add to Cart & Buy Now Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CartButton
                  productId={Number(id)}
                  variantId={selectedVariant?.id ? Number(selectedVariant.id) : null}
                  quantity={quantity}
                  size="lg"
                  className="py-4 text-xl font-semibold cursor-pointer"
                  onAddToCart={handleAddToCart}
                  disabled={getDisplayStock() === 0}
                  showBadge={false}
                />

                <Button
                  onClick={handleBuyNow}
                  disabled={getDisplayStock() === 0}
                  className="py-4 text-xl bg-primary hover:bg-primary/90 font-semibold cursor-pointer"
                >
                  Mua ngay
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DIV DƯỚI - Màu xanh dương: Thông tin chi tiết + Sản phẩm nổi bật */}
      <div className="w-full px-4 py-8 bg-blue-50">
        <div className="max-w-8xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Thông tin chi tiết sản phẩm - Cột trái */}
          <div className="lg:col-span-9">
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-6 border-b pb-3">
                📋 Thông tin chi tiết sản phẩm
              </h3>
              
              {/* Thông tin cơ bản */}
              <div className="space-y-4 mb-8">
                <div className="flex justify-between py-2">
                  <span className="text-gray-600 text-base">Tên sản phẩm:</span>
                  <span className="font-medium text-right text-base">{product.name}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600 text-base">Thương hiệu:</span>
                  <span className="font-medium text-base">{product.brand?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600 text-base">Danh mục:</span>
                  <span className="font-medium text-base">{product.category?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600 text-base">SKU:</span>
                  <span className="font-medium text-base">{product.sku || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600 text-base">Tồn kho:</span>
                  <span className="font-medium text-gray-900 text-base">{getDisplayStock()} sản phẩm</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600 text-base">Trạng thái:</span>
                  <span className={`font-medium text-base ${
                    product.status === 'ACTIVE' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {product.status === 'ACTIVE' ? 'Đang bán' : 
                     product.status === 'INACTIVE' ? 'Ngừng bán' : 'Hết hàng'}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600 text-base">Sản phẩm nổi bật:</span>
                  <span className="font-medium text-base">
                    {product.isFeatured ? '⭐ Có' : '❌ Không'}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600 text-base">Lượt xem:</span>
                  <span className="font-medium text-base">{product.viewCount || 0} lượt</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600 text-base">Ngày tạo:</span>
                  <span className="font-medium text-base">
                    {new Date(product.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>

              {/* Mô tả chi tiết */}
              {product.description && (
                <div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-4">
                    📝 Mô tả sản phẩm
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <p className="text-gray-700 whitespace-pre-line leading-relaxed text-base">
                      {product.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Meta Information */}
              {(product.metaTitle || product.metaDescription) && (
                <div className="mt-8">
                  <h4 className="text-xl font-semibold text-gray-900 mb-4">
                    🔍 Thông tin SEO
                  </h4>
                  <div className="space-y-3">
                    {product.metaTitle && (
                      <div>
                        <span className="text-base text-gray-600 font-medium">Meta Title:</span>
                        <p className="text-base text-gray-700 mt-1">{product.metaTitle}</p>
                      </div>
                    )}
                    {product.metaDescription && (
                      <div>
                        <span className="text-base text-gray-600 font-medium">Meta Description:</span>
                        <p className="text-base text-gray-700 mt-1">{product.metaDescription}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sản phẩm nổi bật - Cột phải */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-6">
                Top Sản Phẩm Nổi Bật
              </h3>
              
              {/* Sản phẩm nổi bật - 1 cột 1 sản phẩm */}
              <div className="space-y-4">
                {featuredProducts.length > 0 ? (
                  featuredProducts.map((featuredProduct) => (
                    <div 
                      key={featuredProduct.id}
                      className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer border border-gray-100"
                      onClick={() => navigate(`/san-pham/${featuredProduct.id}`)}
                    >
                      <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden flex-shrink-0 relative">
                        <img 
                          src={featuredProduct.imageUrl || 'https://via.placeholder.com/64x64?text=No+Image'} 
                          alt={featuredProduct.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/64x64?text=No+Image';
                          }}
                        />
                        <div className="absolute top-1 left-1 bg-white px-2 py-1 rounded text-xs font-medium text-gray-700">
                          {featuredProduct.brand?.name || 'Kho Đồ Gỗ 49'}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                          {featuredProduct.name}
                        </h4>
                        <div className="text-red-600 font-semibold text-sm">
                          {featuredProduct.salePrice && featuredProduct.salePrice !== featuredProduct.price ? (
                            <>
                              {formatPrice(featuredProduct.salePrice)}
                              <span className="text-xs text-gray-500 line-through ml-1">
                                {formatPrice(featuredProduct.price)}
                              </span>
                            </>
                          ) : (
                            formatPrice(featuredProduct.price)
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-500 text-sm">
                      Chưa có sản phẩm nổi bật
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;