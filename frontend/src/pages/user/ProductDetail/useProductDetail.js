import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPublicProductById } from '../../../api/adminProducts';
import { getPublicProductVariants } from '../../../api/adminproductVariant';
import { getPublicProductImages } from '../../../api/adminProductImages';
import { getPublicProducts } from '../../../api/adminProducts';
import useCartStore from '../../../stores/cartStore';
import { addToCart as addToCartAPI } from '../../../api/cart';
import { useAuth } from '../../../hooks/useAuth';
import { 
  onProductUpdated, 
  onProductDeleted,
  onVariantCreated,
  onVariantUpdated,
  onVariantDeleted
} from '../../../utils/socket';

/**
 * ========================================
 * USE PRODUCT DETAIL HOOK - XỬ LÝ LOGIC PRODUCT DETAIL ✨
 * ========================================
 * 
 * Hook này chứa TẤT CẢ logic cho trang ProductDetail
 * Component ProductDetail chỉ cần import và sử dụng
 */
export function useProductDetail(productId) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // =======================
  // STATE
  // =======================
  const [product, setProduct] = useState(null);// Thông tin sản phẩm chính
  const [variants, setVariants] = useState([]);// Danh sách variants (màu sắc, kích thước)
  const [productImages, setProductImages] = useState([]);// Danh sách hình ảnh từ bảng product_images
  const [featuredProducts, setFeaturedProducts] = useState([]);// Danh sách sản phẩm nổi bật (sidebar)
  const [loading, setLoading] = useState(true);// Trạng thái đang load (true/false)
  const [error, setError] = useState(null);// Thông báo lỗi (null nếu không có lỗi)
  
  // Selection state
  const [selectedVariant, setSelectedVariant] = useState(null);// Variant đã được chọn (kết hợp màu sắc + kích thước)
  const [selectedColor, setSelectedColor] = useState('');// Màu sắc đã được chọn
  const [selectedDimensions, setSelectedDimensions] = useState('');// Kích thước đã được chọn
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);// Index của hình ảnh đang được chọn
  const [quantity, setQuantity] = useState(1);// Số lượng sản phẩm muốn mua

  // =======================
  // EFFECTS
  // =======================
  
  // Hàm load dữ liệu từ API
  const loadProductData = useCallback(async () => {
    if (!productId) return;// Nếu không có productId thì không load dữ liệu
    
    try {
      setLoading(true);// Set trạng thái đang load (true/false)
      setError(null);// Set thông báo lỗi (null nếu không có lỗi)
      
      const [productRes, variantsRes, imagesRes, featuredRes] = await Promise.all([
        getPublicProductById(productId),// API 1: Thông tin sản phẩm
        getPublicProductVariants({ productId }),// API 2: Variants  
        getPublicProductImages(productId),// API 3: Hình ảnh sản phẩm
        getPublicProducts({ page: 1, limit: 5, isFeatured: true })// API 4: Sản phẩm nổi bật (sidebar)
      ]);
      // Kiểm tra nếu không có dữ liệu thì set thông báo lỗi
      if (!productRes.data) {
        setError('Không tìm thấy sản phẩm');
        return;
      }
      
      setProduct(productRes.data);// Set thông tin sản phẩm
      setVariants(variantsRes.data?.variants || []);// Set danh sách variants (màu sắc, kích thước)
      setProductImages(imagesRes.data?.items || []);// Set danh sách hình ảnh sản phẩm
      setFeaturedProducts(featuredRes.data?.items || []);// Set danh sách sản phẩm nổi bật (sidebar)
      
    } catch (err) {
      console.error('Error loading product data:', err);
      setError('Không thể tải thông tin sản phẩm');
    } finally {
      setLoading(false);// Set trạng thái đang load (true/false)
    }
  }, [productId]);// Phụ thuộc vào productId để load dữ liệu

  // Load data khi productId thay đổi
  useEffect(() => {
    loadProductData();
  }, [loadProductData]);

  // Socket real-time: Cập nhật product khi admin thay đổi
  useEffect(() => {
    if (!product) return;

    // Sản phẩm cập nhật → Cập nhật product hiện tại hoặc redirect nếu bị tắt
    const unsubscribeUpdated = onProductUpdated((updatedProduct) => {
      if (updatedProduct.id === product.id) {
        console.log('🔄 Socket: Product updated trong detail page', updatedProduct);
        
        // Nếu sản phẩm bị tắt (INACTIVE hoặc OUT_OF_STOCK) → Redirect
        if (updatedProduct.status !== 'ACTIVE') {
          console.log('❌ Product bị tắt (status:', updatedProduct.status, '), redirect về trang chủ');
          setError('Sản phẩm này đã bị tạm dừng hoặc hết hàng');
          setProduct(null);
          setVariants([]);
          setProductImages([]);
          setTimeout(() => {
            navigate('/san-pham');
          }, 2000);
        } else {
          // Cập nhật product nếu vẫn ACTIVE
          setProduct(prev => ({ ...prev, ...updatedProduct }));
        }
      }
      // Cập nhật trong featured products nếu có
      setFeaturedProducts(prev => prev.map(p => 
        p.id === updatedProduct.id ? updatedProduct : p
      ));
    });

    // Sản phẩm xóa → Redirect về trang chủ
    const unsubscribeDeleted = onProductDeleted((data) => {
      if (data.id === product.id) {
        console.log('🗑️ Socket: Product deleted trong detail page', data.id);
        setError('Sản phẩm này đã bị xóa');
        setProduct(null);
        setVariants([]);
        setProductImages([]);
        setTimeout(() => {
          navigate('/san-pham');
        }, 2000);
      }
      // Xóa khỏi featured products nếu có
      setFeaturedProducts(prev => prev.filter(p => p.id !== data.id));
    });

    return () => {
      unsubscribeUpdated();
      unsubscribeDeleted();
    };
  }, [product, navigate]);

  // Socket real-time: Cập nhật variants khi admin CRUD
  useEffect(() => {
    if (!product) return;// nếu không có product thì không cập nhật variants.

    // Biến thể mới → Thêm vào danh sách nếu thuộc product hiện tại
    const unsubscribeVariantCreated = onVariantCreated((newVariant) => {
      if (newVariant.productId === product.id) {// nếu biến thể mới được tạo thuộc với product hiện tại thì cập nhật.
        console.log('🆕 Socket: Variant created trong detail page', newVariant);
        setVariants(prev => {
          const exists = prev.some(v => v.id === newVariant.id);
          if (exists) {
            // Đã có → Cập nhật lại
            return prev.map(v => v.id === newVariant.id ? newVariant : v);
          }
          // Chưa có → Thêm vào danh sách (chỉ thêm nếu isActive = true)
          if (newVariant.isActive) {// nếu biến thể mới được tạo là active thì thêm vào danh sách.
            return [...prev, newVariant];// thêm biến thể mới vào danh sách.
          }
          return prev; // trả về danh sách đã cập nhật.
        });
      }
    });

    // Biến thể cập nhật → Cập nhật trong danh sách
    const unsubscribeVariantUpdated = onVariantUpdated((updatedVariant) => {
      if (updatedVariant.productId === product.id) {// nếu biến thể mới được cập nhật thuộc với product hiện tại thì cập nhật.
        console.log('🔄 Socket: Variant updated trong detail page', updatedVariant);
        setVariants(prev => {
          const exists = prev.some(v => v.id === updatedVariant.id);
          if (exists) {
            // Đã có → Cập nhật hoặc xóa nếu bị tắt
            if (updatedVariant.isActive) {
              return prev.map(v => v.id === updatedVariant.id ? updatedVariant : v);
            } else {
              // Nếu variant bị tắt → Xóa khỏi danh sách
              return prev.filter(v => v.id !== updatedVariant.id);
            }
          } else if (updatedVariant.isActive) {
            // Chưa có nhưng đang active → Thêm vào danh sách
            return [...prev, updatedVariant];
          }
          return prev;
        });
        
        // Nếu variant đang được chọn bị cập nhật → Cập nhật selectedVariant
        setSelectedVariant(prev => {
          if (prev && prev.id === updatedVariant.id) {
            return updatedVariant.isActive ? updatedVariant : null;
          }
          return prev;
        });
      }
    });

    // Biến thể xóa → Xóa khỏi danh sách
    const unsubscribeVariantDeleted = onVariantDeleted((data) => {
      if (data.productId === product.id) {
        console.log('🗑️ Socket: Variant deleted trong detail page', data.id);
        setVariants(prev => {
          const filtered = prev.filter(v => v.id !== data.id);
          
          // Nếu variant đang được chọn bị xóa → Tự động chọn variant đầu tiên còn lại
          setSelectedVariant(currentSelected => {
            if (currentSelected && currentSelected.id === data.id) {
              return filtered.length > 0 ? filtered[0] : null;
            }
            return currentSelected;
          });
          
          return filtered;
        });
      }
    });

    return () => {
      unsubscribeVariantCreated();
      unsubscribeVariantUpdated();
      unsubscribeVariantDeleted();
    };
  }, [product]);

  // 
  useEffect(() => {
    if (variants.length > 0 && !selectedVariant) {
      const first = variants[0];
      setSelectedVariant(first);
      setSelectedColor(first.color || '');
      
      const dimStr = first.width && first.depth && first.height
        ? `${first.width}x${first.depth}x${first.height}`
        : '';
      setSelectedDimensions(dimStr);
    }
  }, [variants, selectedVariant]);

  // =======================
  // COMPUTED VALUES
  // =======================
  
  // Merge và sort images
  const allImages = useMemo(() => {
    const images = [];
    const seenUrls = new Set();
    
    productImages.forEach(img => {
      if (img.imageUrl && !seenUrls.has(img.imageUrl)) {
        seenUrls.add(img.imageUrl);
        images.push({ 
          url: img.imageUrl, 
          isMain: img.isPrimary || false,
          id: img.id,
          sortOrder: img.sortOrder || 0
        });
      }
    });
    
    if (product?.imageUrl && !seenUrls.has(product.imageUrl)) {
      images.push({ 
        url: product.imageUrl, 
        isMain: !productImages.some(img => img.isPrimary),
        id: 'main',
        sortOrder: -1
      });
    }
    
    return images.sort((a, b) => {
      if (a.isMain && !b.isMain) return -1;
      if (!a.isMain && b.isMain) return 1;
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });
  }, [product, productImages]);

  const currentImage = useMemo(() => {
    return allImages[selectedImageIndex]?.url || product?.imageUrl;
  }, [allImages, selectedImageIndex, product]);

  // Unique colors và dimensions
  const uniqueColors = useMemo(() => {
    return variants
      .map(v => v.color)
      .filter((color, index, self) => color && self.indexOf(color) === index);
  }, [variants]);

  const uniqueDimensions = useMemo(() => {
    return variants
      .map(v => {
        if (v.width && v.depth && v.height) {
          return `${v.width}x${v.depth}x${v.height}`;
        }
        return null;
      })
      .filter((dim, index, self) => dim && self.indexOf(dim) === index);
  }, [variants]);

  const dimensionsByColor = useMemo(() => {
    return variants.reduce((acc, v) => {
      if (v.color && v.width && v.depth && v.height) {
        const key = v.color;
        const dim = `${v.width}x${v.depth}x${v.height}`;
        if (!acc[key]) acc[key] = [];
        if (!acc[key].includes(dim)) {
          acc[key].push(dim);
        }
      }
      return acc;
    }, {});
  }, [variants]);

  const availableDimensions = useMemo(() => {
    if (selectedColor && dimensionsByColor[selectedColor]?.length) {
      return dimensionsByColor[selectedColor];
    }
    return uniqueDimensions;
  }, [selectedColor, dimensionsByColor, uniqueDimensions]);

  // Stock calculation
  const displayStock = useMemo(() => {
    if (selectedVariant?.stockQuantity !== undefined) {
      return selectedVariant.stockQuantity;
    }
    if (variants.length > 0) {
      return variants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0);
    }
    return 0;
  }, [selectedVariant, variants]);

  const isInStock = displayStock > 0;
  const isLowStock = displayStock > 0 && displayStock < 5;

  // =======================
  // HANDLERS
  // =======================
  
  // Helper: Tìm variant khớp
  const findMatchingVariant = (color, dimensions) => {
    return variants.find(v => {
      const colorMatch = !color || v.color === color;
      const dimStr = v.width && v.depth && v.height
        ? `${v.width}x${v.depth}x${v.height}`
        : '';
      const dimMatch = !dimensions || dimStr === dimensions;
      return colorMatch && dimMatch;
    });
  };

  // Helper: Tạo dimension string
  const getDimensionStr = (v) => {
    return v.width && v.depth && v.height
      ? `${v.width}x${v.depth}x${v.height}`
      : '';
  };

  // Helper: Điều chỉnh quantity theo stock
  const adjustQuantityByStock = (stock) => {
    if (quantity > stock && stock > 0) {
      setQuantity(stock);
    } else if (stock === 0) {
      setQuantity(1);
    }
  };

  const handleColorChange = (color) => {
    setSelectedColor(color);
    
    const matching = findMatchingVariant(color, selectedDimensions);
    const newVariant = matching || variants.find(v => v.color === color) || null;
    setSelectedVariant(newVariant);
    
    if (newVariant) {
      setSelectedDimensions(getDimensionStr(newVariant));
      adjustQuantityByStock(newVariant.stockQuantity || 0);
    }
  };

  const handleDimensionsChange = (dimensions) => {
    setSelectedDimensions(dimensions);
    
    const matching = findMatchingVariant(selectedColor, dimensions);
    setSelectedVariant(matching || null);
    
    if (matching) {
      adjustQuantityByStock(matching.stockQuantity || 0);
    }
  };

  const handleImageSelect = (index) => {
    setSelectedImageIndex(index);
  };

  const handleQuantityChange = (newQuantity) => {
    const MAX_PER_ACTION = 10; // BE giới hạn max số lượng sản phẩm mỗi lần thêm vào giỏ hàng  là 10

    // Giới hạn dưới
    if (newQuantity < 1) {
      setQuantity(1);
      return;
    }

    // Giới hạn trên theo tồn kho & giới hạn BE
    const maxAllowed = Math.min(displayStock || MAX_PER_ACTION, MAX_PER_ACTION);//lấy số lượng sản phẩm tồn kho hoặc số lượng sản phẩm mỗi lần thêm vào giỏ hàng là 10
//nếu số lượng sản phẩm muốn thêm vào giỏ hàng lớn hơn số lượng sản phẩm tồn kho hoặc số lượng sản phẩm mỗi lần thêm vào giỏ hàng là 10 thì set số lượng sản phẩm muốn thêm vào giỏ hàng là số lượng sản phẩm tồn kho hoặc số lượng sản phẩm mỗi lần thêm vào giỏ hàng là 10
    if (newQuantity > maxAllowed) {
      setQuantity(maxAllowed);
      if (maxAllowed < (displayStock || MAX_PER_ACTION)) {
        alert(`Chỉ được chọn tối đa ${MAX_PER_ACTION} sản phẩm mỗi lần thêm vào giỏ hàng`);
      } else {
        alert(`Chỉ còn ${displayStock} sản phẩm trong kho`);
      }
      return;
    }

    setQuantity(newQuantity);
  };

  const handleBuyNow = async (e) => {
    // Ngăn chặn event bubbling để tránh trigger các event khác
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Kiểm tra đăng nhập trước khi mua hàng
    if (!isAuthenticated) {
      // Lưu URL hiện tại để redirect về sau khi đăng nhập
      const currentPath = window.location.pathname;
      navigate(`/auth?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }
    
    // Validation cơ bản trước khi mua ngay
    if (!isInStock) {
      alert('Sản phẩm đã hết hàng');
      return;
    }
    if (variants.length > 0 && !selectedVariant) {
      alert('Vui lòng chọn màu sắc và kích thước sản phẩm');
      return;
    }
    
    try {
      // BƯỚC 1: Gọi API trực tiếp để lấy cartItemId từ response
      const response = await addToCartAPI({
        productId: Number(productId),
        variantId: selectedVariant?.id ? Number(selectedVariant.id) : null,
        quantity: quantity
      });
      
      // BƯỚC 2: Lấy cartItemId từ response (backend trả về cart_item với snake_case)
      const cartItemId = response?.data?.cart_item?.id;
      
      // BƯỚC 3: Refresh cart trong store để UI cập nhật (CHỈ refresh, KHÔNG gọi API lại)
      // Sử dụng fetchCart thay vì addToCart để tránh gọi API 2 lần
      const { fetchCart } = useCartStore.getState();
      fetchCart().catch(err => console.error('Lỗi refresh cart:', err));
      
      // BƯỚC 4: Chuyển đến trang checkout với CHỈ sản phẩm này
      // URL: /checkout?selected=<cartItemId>
      if (cartItemId) {
        navigate(`/checkout?selected=${cartItemId}`);
      } else {
        // Fallback: nếu không có cartItemId, vẫn redirect với selected rỗng
        // Checkout sẽ hiển thị thông báo không có sản phẩm
        navigate('/checkout');
      }
      
    } catch (error) {
      console.error('Lỗi khi mua ngay:', error);
      alert('Có lỗi xảy ra, vui lòng thử lại');
    }
  };

  // =======================
  // RETURN
  // =======================
  return {
    // Data
    product,// Thông tin sản phẩm chính
    variants,// Danh sách variants (màu sắc, kích thước)
    productImages,// Danh sách hình ảnh từ bảng product_images
    featuredProducts,// Danh sách sản phẩm nổi bật (sidebar)
    selectedVariant,// Variant đã được chọn (kết hợp màu sắc + kích thước)
    
    // State
    loading,// Trạng thái đang load (true/false)
    error,// Thông báo lỗi (null nếu không có lỗi)
    selectedColor,// Màu sắc đã được chọn
    selectedDimensions,// Kích thước đã được chọn
    selectedImageIndex,// Index của hình ảnh đang được chọn
    quantity,// Số lượng sản phẩm muốn mua
    
    // Computed
    allImages,// Danh sách tất cả hình ảnh (đã merge + sort)
    currentImage,// URL hình ảnh hiện tại đang hiển thị
    uniqueColors,// Danh sách màu sắc unique (không trùng)
    uniqueDimensions,// Danh sách kích thước unique (không trùng)
    availableDimensions,// Kích thước khả dụng theo màu đã chọn
    displayStock,// Số lượng tồn kho hiển thị
    isInStock,// Trạng thái còn hàng (true/false)
    isLowStock,// Trạng thái sắp hết hàng (true/false)
    
    // Handlers
    handleColorChange,// Xử lý khi chọn màu sắc
    handleDimensionsChange,// Xử lý khi chọn kích thước
    handleImageSelect,// Xử lý khi chọn hình ảnh
    handleQuantityChange,// Xử lý khi thay đổi số lượng
    handleBuyNow,// Xử lý khi click "Mua ngay"
    
    // Actions
    refetch: loadProductData// Hàm reload lại dữ liệu (có thể gọi từ component)
  };
}
