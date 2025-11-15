import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getPublicProductById } from '../../api/adminProducts';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../ui/breadcrumb';


const BreadcrumbNav = () => {
  // Hook để lấy thông tin URL hiện tại
  const location = useLocation();
  
  // State để lưu tên sản phẩm
  const [productName, setProductName] = useState('');

  // Object mapping URL path với tên hiển thị tiếng Việt
  const routeMap = {
    '/wishlist': 'Danh sách yêu thích',
    '/cart': 'Giỏ hàng',
    '/checkout': 'Đặt hàng',
    '/order-success': 'Đặt hàng thành công',
    '/orders': 'Danh sách đơn hàng',
    '/orders/:id': 'Chi tiết đơn hàng',
    
  };

  // Kiểm tra nếu đang ở trang chi tiết sản phẩm / chi tiết đơn hàng
  const isProductDetail = location.pathname.startsWith('/san-pham/') && location.pathname !== '/san-pham';
  const isOrderDetail = location.pathname.startsWith('/orders/') && location.pathname !== '/orders';

  // Lấy tên trang hiện tại từ routeMap, nếu không có thì dùng 'Trang'
  const currentPage = isOrderDetail
    ? 'Chi tiết đơn hàng'
    : (routeMap[location.pathname] || 'Trang');

  // Effect để load tên sản phẩm khi ở trang chi tiết
  useEffect(() => {
    if (isProductDetail) {
      const productId = location.pathname.split('/')[2]; // Lấy ID từ URL
      loadProductName(productId);
    }
  }, [location.pathname, isProductDetail]);

  // Function để load tên sản phẩm (✅ Dùng API public để user không cần đăng nhập)
  const loadProductName = async (productId) => {
    try {
      const response = await getPublicProductById(productId);
      if (response.data && response.data.name) {
        setProductName(response.data.name);
      }
    } catch (error) {
      console.error('Error loading product name:', error);
      setProductName('Sản phẩm');
    }
  };

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {/* Item 1: Link "Trang chủ" - có thể click để quay lại */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link 
              to="/" 
              className="hover:text-blue-600 transition-colors duration-200 font-medium"
            >
              Trang chủ
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        
        {/* Dấu phân cách giữa các item */}
        <BreadcrumbSeparator />
        
        {/* Nếu là chi tiết đơn hàng: thêm link về danh sách đơn */}
        {isOrderDetail && (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link 
                  to="/orders" 
                  className="hover:text-blue-600 transition-colors duration-200 font-medium"
                >
                  Danh sách đơn hàng
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        )}

        {/* Item 4: Tên sản phẩm hoặc trang hiện tại - không click được, màu xanh nổi bật */}
        <BreadcrumbItem>
          <BreadcrumbPage className="text-blue-600 font-semibold">
            {isProductDetail ? (productName || 'Đang tải...') : currentPage}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default BreadcrumbNav;
