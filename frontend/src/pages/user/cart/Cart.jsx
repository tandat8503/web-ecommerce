import { FaShoppingCart, FaTrash, FaPlus, FaMinus, FaArrowLeft, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import BreadcrumbNav from "@/components/user/BreadcrumbNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatPrice } from "@/lib/utils";
import { useCart } from "./useCart";

/**
 *  CART PAGE - Trang giỏ hàng
 */
export default function Cart() {
  const {
    cartItems,
    cartCount,
    totalAmount,
    hasUnavailableItems,//kiểm tra sản phẩm có còn hàng không
    loading,
    updatingItems,
    handleUpdateQuantity,//cập nhật số lượng sản phẩm
    handleRemoveItem,//xóa sản phẩm khỏi giỏ hàng
    handleClearAll,//xóa tất cả sản phẩm trong giỏ hàng
    handleCheckout,//thanh toán đơn hàng
    handleContinueShopping,//tiếp tục mua sắm
  } = useCart();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <BreadcrumbNav />
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-gray-600">Đang tải giỏ hàng...</span>
          </div>
        </div>
      </div>
    );
  }

  if (cartCount === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <BreadcrumbNav />
          <div className="flex items-center justify-center py-20">
            <Card className="max-w-md w-full shadow-lg">
              <CardContent className="py-12 text-center">
                <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <FaShoppingCart className="text-5xl text-blue-500" />
                </div>
                <CardTitle className="text-2xl mb-2">Giỏ hàng trống</CardTitle>
                <p className="text-gray-600 mb-6">Bạn chưa có sản phẩm nào trong giỏ hàng</p>
                <Button onClick={handleContinueShopping} size="lg" className="w-full">
                  <FaShoppingCart className="mr-2" />
                  Mua sắm ngay
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <BreadcrumbNav />

        {/* Header */}
        <div className="mt-6 mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Giỏ hàng của bạn</h2>
            <p className="text-gray-600 mt-1">Có {cartCount} sản phẩm trong giỏ hàng</p>
          </div>
          {cartCount > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="cursor-pointer" variant="outline" size="sm">
                  <FaTrash className="mr-2 h-3.5 w-3.5" />
                  Xóa tất cả
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xóa tất cả sản phẩm?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Bạn có chắc chắn muốn xóa tất cả <span className="font-bold">{cartCount} sản phẩm</span> khỏi giỏ hàng?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="cursor-pointer">Hủy</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAll} className="cursor-pointer bg-red-500 hover:bg-red-600">
                    Xác nhận
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Main Content */}
        <div className="flex flex-col gap-6">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead className="text-center">Màu sắc</TableHead>
                  <TableHead className="text-center">Kích thước</TableHead>
                  <TableHead className="text-center">Đơn giá</TableHead>
                  <TableHead className="text-center">Số lượng</TableHead>
                  <TableHead className="text-center">Thành tiền</TableHead>
                  <TableHead className="text-center">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cartItems.map((item) => {
                  const isUpdating = updatingItems.has(item.id);
                  const variant = item.variant;
                  const imageUrl = item.product.primary_image || item.product.image_url || "/placeholder-product.jpg";
                  const hasDiscount = item.sale_price && item.sale_price < item.unit_price;
                  const isAvailable = item.is_available !== false; // Kiểm tra sản phẩm có còn hàng không

                  return (
                    <TableRow key={item.id} className={!isAvailable ? "opacity-60 bg-gray-50" : ""}>
                      <TableCell>
                        <div className="flex gap-3 items-start">
                          <img src={imageUrl} alt={item.product.name} className="h-16 w-16 object-cover rounded border flex-shrink-0" />
                          <div className="min-w-0 space-y-1">
                            <h3 className="font-semibold text-sm line-clamp-2">{item.product.name}</h3>
                            {hasDiscount && (
                              <Badge className="bg-red-500 text-white text-xs mt-1">
                                -{Math.round(((item.unit_price - item.sale_price) / item.unit_price) * 100)}%
                              </Badge>
                            )}
                            {!isAvailable && (
                              <Badge className="bg-orange-500 text-white text-xs mt-1">
                                {item.unavailable_reason || "Không còn bán"}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {variant?.color ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            {variant.color}
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {variant?.width && variant?.depth && variant?.height ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            {variant.width}×{variant.depth}×{variant.height}cm
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <p className="font-semibold text-sm">{formatPrice(item.final_price)}</p>
                        {hasDiscount && (
                          <p className="text-xs text-gray-500 line-through">{formatPrice(item.unit_price)}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {!isAvailable ? (
                          <div className="flex items-center justify-center">
                            <span className="text-xs text-gray-500">-</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                              disabled={isUpdating || item.quantity <= 1}
                            >
                              <FaMinus className="h-3 w-3" />
                            </Button>
                            <span className="min-w-[2rem] text-center font-medium text-sm">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                              disabled={isUpdating}
                            >
                              <FaPlus className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <p className="font-bold text-red-600 text-sm">{formatPrice(item.final_price * item.quantity)}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        {!isAvailable ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveItem(item.id)}
                            className="cursor-pointer h-8 px-3 text-xs font-semibold"
                          >
                            <FaTrash className=" mr-1 h-3 w-3" />
                            Xóa
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item.id)}
                            className="cursor-pointer text-red-600 hover:text-red-700 h-7 w-7 p-0"
                          >
                            <FaTrash className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Tóm tắt đơn hàng */}
          <div className="md:flex md:justify-end">
            <Card className="md:w-1/2 lg:w-1/3">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FaCheckCircle />
                  Tóm tắt đơn hàng
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasUnavailableItems && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                    <div className="flex items-start gap-2">
                      <span className="text-orange-600 text-lg">
                        <FaExclamationCircle />
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-orange-800">Sản phẩm không còn hàng</p>
                        <p className="text-xs text-orange-700 mt-1">
                          Vui lòng xóa các sản phẩm không còn bán hoặc hết hàng trước khi thanh toán.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tạm tính:</span>
                    <span className="font-semibold">{formatPrice(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Số lượng:</span>
                    <Badge>{cartCount} sản phẩm</Badge>
                  </div>
                </div>
                <div className="border-t pt-3 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Thành tiền:</span>
                    <span className="text-xl font-bold text-red-600">{formatPrice(totalAmount)}</span>
                  </div>
                  <Button
                    onClick={handleCheckout}
                    className="cursor-pointer w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-4 font-semibold text-sm"
                    disabled={cartCount === 0 || hasUnavailableItems}
                  >
                    <FaCheckCircle className="mr-2 " />
                    {hasUnavailableItems ? "Không thể thanh toán" : "Thanh toán"}
                  </Button>
                  <Button variant="outline" onClick={handleContinueShopping} className="cursor-pointer w-full py-4 text-sm">
                    <FaArrowLeft className="mr-2 " />
                    Tiếp tục mua sắm
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

