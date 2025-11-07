import { useNavigate } from "react-router-dom";
import { FaHeart, FaTrash, FaArrowLeft, FaShoppingBag } from "react-icons/fa";
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
import { useWishlist } from "./useWishlist";

/**
 * ========================================
 * WISHLIST PAGE - TRANG DANH SÁCH YÊU THÍCH ✨
 * =======================================
 * 
 * Component này CHỈ render UI, không có logic
 * Tất cả logic được xử lý trong useWishlist.js hook
 */
export default function Wishlist() {
  const navigate = useNavigate();
  
  // Lấy tất cả state và handlers từ custom hook
  const {
    wishlist,
    wishlistCount,
    loading,
    isInitialLoad,
    handleClearAll
  } = useWishlist();

  // ========== RENDER LOADING ==========
  if (isInitialLoad || (loading && wishlist.length === 0)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <BreadcrumbNav />
        
        <div className="flex items-center justify-between mb-8 mt-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-14 w-14 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-[320px] w-full rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ========== RENDER EMPTY STATE ==========
  if (!isInitialLoad && !loading && wishlistCount === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <BreadcrumbNav />
        
        <div className="flex items-center justify-center py-16">
          <Card className="max-w-2xl w-full">
            <CardHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center">
                  <FaHeart className="text-5xl text-red-500" />
                </div>
              </div>
              
              <CardTitle className="text-2xl">Danh sách yêu thích trống</CardTitle>
              <CardDescription>
                Bạn chưa có sản phẩm yêu thích nào. Hãy khám phá và thêm những sản phẩm bạn thích!
              </CardDescription>
            </CardHeader>
            
            <CardContent className="flex flex-col gap-3 items-center pb-8">
              <Button onClick={() => navigate("/san-pham")} size="lg" className="w-full">
                <FaShoppingBag className="mr-2" />
                Khám phá sản phẩm
              </Button>
              
              <Button onClick={() => navigate("/")} variant="ghost" className="w-full">
                <FaArrowLeft className="mr-2" />
                Quay lại trang chủ
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ========== RENDER WISHLIST ==========
  return (
    <div className="container mx-auto px-4 py-8">
      <BreadcrumbNav />

      {/* Header */}
      <Card className="mb-8 mt-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-red-500 flex items-center justify-center">
                <FaHeart className="text-xl text-white" />
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold">Danh sách yêu thích</h1>
                  <Badge>{wishlistCount} sản phẩm</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Những sản phẩm bạn yêu thích nhất ❤️
                </p>
              </div>
            </div>

            {/* Nút xóa tất cả */}
            {wishlistCount > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="cursor-pointer">
                    <FaTrash className="mr-2" />
                    Xóa tất cả
                  </Button>
                </AlertDialogTrigger>
                
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Xóa tất cả sản phẩm yêu thích?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Bạn có chắc chắn muốn xóa tất cả <span className="font-semibold">{wishlistCount} sản phẩm</span> khỏi danh sách yêu thích không? 
                      Hành động này không thể hoàn tác.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  
                  <AlertDialogFooter>
                    <AlertDialogCancel className="cursor-pointer"> Hủy bỏ</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearAll} className="bg-red-500 hover:bg-red-600 cursor-pointer">
                      Xóa tất cả
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Grid sản phẩm */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {wishlist.map((item) => (
          <ProductCard 
            key={item.id}
            product={item.product}
            showActions={true}
            showBrand={true}
            showStock={true}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Button onClick={() => navigate("/san-pham")} size="lg" className="min-w-[200px]">
          <FaShoppingBag className="mr-2" />
          Tiếp tục mua sắm
        </Button>
      </div>
    </div>
  );
}
