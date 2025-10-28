import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaHeart, FaTrash, FaArrowLeft, FaShoppingBag } from "react-icons/fa";
import useWishlistStore from "@/stores/wishlistStore";
import BreadcrumbNav from "@/components/user/BreadcrumbNav";
import ProductCard from "@/components/user/ProductCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * ========================================
 * WISHLIST PAGE - TRANG DANH SÁCH YÊU THÍCH ✨
 * =======================================
 */
export default function Wishlist() {
  // ========== ZUSTAND HOOKS ==========
  const { items: wishlist, getWishlistCount, loading, fetchWishlist, clearWishlist } = useWishlistStore();
  const wishlistCount = getWishlistCount();
  
  // ========== LOCAL STATE ==========
  const navigate = useNavigate();
  
  /**
   * State để track lần đầu load trang
   * - true: Đang load lần đầu (hiển thị skeleton)
   * - false: Đã load xong (hiển thị data hoặc empty state)
   */
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // ========== FETCH WISHLIST KHI MOUNT ==========
  useEffect(() => {
    const loadData = async () => {
      // Tạo 2 promises: fetch data và delay tối thiểu 1s
      const fetchPromise = fetchWishlist();
      const delayPromise = new Promise(resolve => setTimeout(resolve, 1000));
      
      // Đợi cả 2 promises hoàn thành
      await Promise.all([fetchPromise, delayPromise]);
      
      // Sau khi cả 2 xong, tắt skeleton
      setIsInitialLoad(false);
    };
    
    loadData();
  }, []);

  // ========== XỬ LÝ XÓA TẤT CẢ ==========
  /**
   * Xóa tất cả sản phẩm khỏi wishlist
   * Được gọi khi user confirm trong AlertDialog
   */
  const handleClearAll = async () => {
    if (wishlistCount === 0) return;
    
    try {
      await clearWishlist();
      // Toast notification đã được handle trong Zustand store
    } catch (error) {
      console.error('Clear all failed:', error);
    }
  };

  // ========== RENDER LOADING (shadcn/ui Skeleton) ==========
  /**
   * Hiển thị skeleton khi:
   * - Đang load lần đầu (isInitialLoad = true)
   * - Hoặc đang loading và chưa có data
   */
  if (isInitialLoad || (loading && wishlist.length === 0)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-pink-50 to-red-50">
        <div className="container mx-auto px-4 py-8">
          <BreadcrumbNav />
          
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-8 mt-6">
            <div className="flex items-center gap-3">
              <Skeleton className="h-14 w-14 rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
          
          {/* Products grid skeleton với shadcn/ui */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-[320px] w-full rounded-2xl" />
                <div className="space-y-3 px-2">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-6 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ========== RENDER EMPTY STATE (shadcn/ui) ==========
  /**
   * Hiển thị empty state khi:
   * - Đã load xong (isInitialLoad = false)
   * - Không đang loading
   * - Không có sản phẩm nào (wishlistCount === 0)
   */
  if (!isInitialLoad && !loading && wishlistCount === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-pink-50 to-red-50">
        <div className="container mx-auto px-4 py-8">
          <BreadcrumbNav />
          
          {/* Empty State Card với gradient đẹp */}
          <div className="flex items-center justify-center py-16">
            <Card className="max-w-2xl w-full shadow-2xl border-0 bg-white/80 backdrop-blur">
              <CardHeader className="text-center space-y-6 pb-8">
                {/* Icon với gradient background */}
                <div className="flex justify-center">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-pink-100 via-red-100 to-rose-100 flex items-center justify-center shadow-lg ring-4 ring-red-50">
                    <FaHeart className="text-6xl text-red-400 animate-pulse" />
                  </div>
                </div>
                
                <div>
                  <CardTitle className="text-3xl font-bold text-gray-800 mb-2">
                    Danh sách yêu thích trống
                  </CardTitle>
                  <CardDescription className="text-base text-gray-600">
                    Bạn chưa có sản phẩm yêu thích nào. Hãy khám phá và thêm những sản phẩm bạn thích!
                  </CardDescription>
                </div>
              </CardHeader>
              
              <CardContent className="flex flex-col gap-4 items-center pb-8">
                {/* Button với gradient hover */}
                <Button 
                  onClick={() => navigate("/san-pham")}
                  size="lg"
                  className="bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <FaShoppingBag className="mr-2" />
                  Khám phá sản phẩm
                </Button>
                
                {/* Hoặc quay lại trang chủ */}
                <Button 
                  onClick={() => navigate("/")}
                  variant="ghost"
                  className="text-gray-600 hover:text-gray-900"
                >
                  <FaArrowLeft className="mr-2" />
                  Quay lại trang chủ
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ========== RENDER WISHLIST (shadcn/ui) ==========
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-pink-50 to-red-50">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <BreadcrumbNav />

        {/* Header với gradient và Badge */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 mt-6 bg-white/80 backdrop-blur rounded-2xl p-6 shadow-lg border border-white/50">
          <div className="flex items-center gap-4">
            {/* Icon với gradient background */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center shadow-lg">
              <FaHeart className="text-2xl text-white" />
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-red-600 bg-clip-text text-transparent">
                  Danh sách yêu thích
                </h1>
                <Badge variant="secondary" className="bg-gradient-to-r from-pink-100 to-red-100 text-red-700 border-red-200 px-3 py-1 text-sm font-semibold">
                  {wishlistCount} sản phẩm
                </Badge>
              </div>
              <p className="text-gray-600 text-sm">
                Những sản phẩm bạn yêu thích nhất ❤️
              </p>
            </div>
          </div>

          {/* Nút xóa tất cả với AlertDialog */}
          {wishlistCount > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive"
                  className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                >
                  <FaTrash className="mr-2" />
                  Xóa tất cả
                </Button>
              </AlertDialogTrigger>
              
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-xl">
                    <FaTrash className="text-red-500" />
                    Xóa tất cả sản phẩm yêu thích?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-base">
                    Bạn có chắc chắn muốn xóa tất cả <span className="font-semibold text-red-600">{wishlistCount} sản phẩm</span> khỏi danh sách yêu thích không? 
                    Hành động này không thể hoàn tác.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleClearAll}
                    className="bg-red-500 hover:bg-red-600 cursor-pointer"
                  >
                    Xóa tất cả
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Grid sản phẩm với animation fade-in */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          {wishlist.map((item, index) => {
            const product = item.product;

            return (
              <div 
                key={item.id}
                className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <ProductCard 
                  product={product}
                  showActions={true}
                  showBrand={true}
                  showStock={true}
                />
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12">
          <Button 
            onClick={() => navigate("/san-pham")}
            size="lg"
            className="bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 min-w-[200px] cursor-pointer"
          >
            <FaShoppingBag className="mr-2" />
            Tiếp tục mua sắm
          </Button>
          
          <Button 
            onClick={() => navigate("/")}
            variant="outline"
            size="lg"
            className="border-2 hover:bg-white/80 min-w-[200px] cursor-pointer"
          >
            <FaArrowLeft className="mr-2" />
            Về trang chủ
          </Button>
        </div>
      </div>
    </div>
  );
}
