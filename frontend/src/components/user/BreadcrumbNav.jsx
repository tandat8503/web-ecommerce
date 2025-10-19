import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getProductById } from '../../api/adminProducts';
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
  // Ví dụ: '/san-pham' -> 'Tất cả sản phẩm'
  const routeMap = {
    '/san-pham': 'Tất cả sản phẩm',
    '/ban': 'Bàn',
    '/ghe': 'Ghế',
    '/tu': 'Tủ',
    '/sofa': 'Sofa',
    '/gioi-thieu': 'Giới thiệu',
  };

  // Kiểm tra nếu đang ở trang chi tiết sản phẩm
  const isProductDetail = location.pathname.startsWith('/san-pham/') && location.pathname !== '/san-pham';

  // Lấy tên trang hiện tại từ routeMap, nếu không có thì dùng 'Trang'
  const currentPage = routeMap[location.pathname] || 'Trang';

  // Effect để load tên sản phẩm khi ở trang chi tiết
  useEffect(() => {
    if (isProductDetail) {
      const productId = location.pathname.split('/')[2]; // Lấy ID từ URL
      loadProductName(productId);
    }
  }, [location.pathname, isProductDetail]);

  // Function để load tên sản phẩm
  const loadProductName = async (productId) => {
    try {
      const response = await getProductById(productId);
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
        
        {/* Item 2: Link "Tất cả sản phẩm" - chỉ hiển thị khi ở trang chi tiết */}
        {isProductDetail && (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link 
                  to="/san-pham" 
                  className="hover:text-blue-600 transition-colors duration-200 font-medium"
                >
                  Tất cả sản phẩm
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            
            {/* Item 3: "Chi tiết sản phẩm" - không click được */}
            <BreadcrumbItem>
              <BreadcrumbPage className="text-gray-600 font-medium">
                Chi tiết sản phẩm
              </BreadcrumbPage>
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
