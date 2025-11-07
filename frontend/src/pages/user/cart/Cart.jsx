import { FaShoppingCart, FaTrash, FaPlus, FaMinus } from "react-icons/fa";
import BreadcrumbNav from "@/components/user/BreadcrumbNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { formatPrice } from "@/lib/utils";
import { useCart } from "./useCart";

/**
 * ========================================
 * CART PAGE - TRANG GIỎ HÀNG ✨
 * =======================================
 * 
 * Component này CHỈ render UI, không có logic
 * Tất cả logic được xử lý trong useCart.js hook
 */
export default function Cart() {
  // Lấy tất cả state và handlers từ custom hook useCart
  const {
    cartItems, //danh sách sản phẩm trong giỏ hàng
    cartCount, //số lượng sản phẩm trong giỏ hàng
    loading, //trạng thái đang tải dữ liệu
    updatingItems, //Set các item IDs đang được cập nhật số lượng
    selectedItems, //Set các item IDs đã được chọn bằng checkbox
    handleUpdateQuantity, //hàm cập nhật số lượng sản phẩm
    handleRemoveItem, //hàm xóa một sản phẩm khỏi giỏ hàng
    handleClearAll, //hàm xóa tất cả sản phẩm khỏi giỏ hàng
    handleSelectAll, //hàm chọn/bỏ chọn tất cả sản phẩm
    handleSelectItem, //hàm chọn/bỏ chọn một sản phẩm cụ thể
    handleDeleteSelected, //hàm xóa tất cả sản phẩm đã chọn
    handleCheckout, //hàm chuyển đến trang checkout với các sản phẩm đã chọn
    handleContinueShopping, //hàm chuyển đến trang sản phẩm
    getSelectedTotalAmount, //hàm tính tổng tiền của các sản phẩm đã chọn
    getSelectedCount, //hàm đếm số loại sản phẩm đã chọn
  } = useCart();

  // ========== RENDER LOADING ==========
  // Hiển thị khi đang tải dữ liệu giỏ hàng từ API
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <BreadcrumbNav />
        <div className="flex items-center justify-center py-16">
          <p className="text-gray-500">Đang tải giỏ hàng...</p>
        </div>
      </div>
    );
  }

  // ========== RENDER EMPTY STATE ==========
  // Hiển thị khi giỏ hàng trống (không có sản phẩm nào)
  if (cartCount === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <BreadcrumbNav />
        <div className="flex items-center justify-center py-16">
          <Card className="max-w-2xl w-full">
            <CardHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center">
                  <FaShoppingCart className="text-5xl text-gray-400" />
                </div>
              </div>
              <CardTitle className="text-2xl">Giỏ hàng trống</CardTitle>
              <CardDescription>
                Bạn chưa có sản phẩm nào trong giỏ hàng. Hãy khám phá và thêm những sản phẩm bạn yêu thích!
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 items-center pb-8">
              <Button onClick={handleContinueShopping} size="lg" className="w-full cursor-pointer">
                Mua sắm ngay
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ========== HELPER COMPONENTS ==========
  /**
   * Component render một dòng sản phẩm trong bảng giỏ hàng
   * @param {Object} item - Thông tin sản phẩm trong giỏ hàng
   */
  const CartItemRow = ({ item }) => {
    // Kiểm tra item này có đang được cập nhật số lượng không
    const isUpdating = updatingItems.has(item.id);
    // Kiểm tra item này có được chọn bằng checkbox không
    const isSelected = selectedItems.has(item.id);
    // Lấy màu sắc từ variant (ưu tiên variant.color, không có thì lấy productVariant.color)
    const color = item.variant?.color || item.productVariant?.color;
    // Lấy kích thước từ variant (ưu tiên variant.size, không có thì lấy productVariant.size)
    const size = item.variant?.size || item.productVariant?.size;
    // Lấy URL ảnh sản phẩm (ưu tiên primaryImage, không có thì lấy imageUrl, không có thì dùng placeholder)
    const imageUrl = item.product.primaryImage || item.product.imageUrl || "/placeholder-product.jpg";

    return (
      <TableRow className="hover:bg-gray-50">
        {/* Checkbox để chọn sản phẩm */}
        <TableCell className="text-center">
          <Checkbox checked={isSelected} onCheckedChange={(checked) => handleSelectItem(item.id, checked)} className="cursor-pointer" />
        </TableCell>
        
        {/* Thông tin sản phẩm (ảnh + tên) */}
        <TableCell>
          <div className="flex gap-3">
            <img src={imageUrl} alt={item.product.name} className="h-16 w-16 object-cover rounded border" />
            <h3 className="font-semibold text-sm">{item.product.name}</h3>
          </div>
        </TableCell>
        
        {/* Màu sắc - hiển thị Badge nếu có, không có thì hiển thị dấu "-" */}
        <TableCell className="text-center">
          {color ? <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">{color}</Badge> : <span className="text-xs text-gray-400">-</span>}
        </TableCell>
        
        {/* Kích thước - hiển thị Badge nếu có, không có thì hiển thị dấu "-" */}
        <TableCell className="text-center">
          {size ? <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">{size}</Badge> : <span className="text-xs text-gray-400">-</span>}
        </TableCell>
        
        {/* Đơn giá - hiển thị giá cuối cùng, nếu có giá sale thì hiển thị thêm giá gốc bị gạch ngang */}
        <TableCell className="text-center">
          <p className="font-semibold text-sm">{formatPrice(item.finalPrice)}</p>
          {item.salePrice && item.salePrice !== item.unitPrice && <p className="text-xs text-gray-500 line-through">{formatPrice(item.unitPrice)}</p>}
        </TableCell>
        
        {/* Điều khiển số lượng - nút giảm, số lượng hiện tại, nút tăng */}
        <TableCell>
          <div className="flex items-center justify-center gap-2">
            {/* Nút giảm số lượng - disabled khi đang cập nhật hoặc số lượng <= 1 */}
            <Button variant="outline" size="icon" className="h-7 w-7 cursor-pointer" onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)} disabled={isUpdating || item.quantity <= 1}>
              <FaMinus className="h-3 w-3" />
            </Button>
            {/* Số lượng hiện tại */}
            <span className="min-w-[2rem] text-center font-medium text-sm">{item.quantity}</span>
            {/* Nút tăng số lượng - disabled khi đang cập nhật */}
            <Button variant="outline" size="icon" className="h-7 w-7 cursor-pointer" onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)} disabled={isUpdating}>
              <FaPlus className="h-3 w-3" />
            </Button>
          </div>
        </TableCell>
        
        {/* Thành tiền = đơn giá × số lượng */}
        <TableCell className="text-center">
          <p className="font-bold text-red-600 text-sm">{formatPrice(item.finalPrice * item.quantity)}</p>
        </TableCell>
        
        {/* Nút xóa sản phẩm khỏi giỏ hàng */}
        <TableCell className="text-center">
          <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(item.id)} className="text-red-600 hover:text-red-700 h-7 w-7 p-0 cursor-pointer">
            <FaTrash className="h-3 w-3" />
          </Button>
        </TableCell>
      </TableRow>
    );
  };

  // ========== RENDER CART ==========
  // Hiển thị giao diện giỏ hàng khi có sản phẩm
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <BreadcrumbNav />
      
      {/* Header - Checkbox chọn tất cả và các nút xóa */}
      <Card className="mt-6 mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {/* Checkbox chọn tất cả - checked khi tất cả sản phẩm đều được chọn */}
            <div className="flex items-center gap-3">
              <Checkbox checked={selectedItems.size === cartItems.length && cartItems.length > 0} onCheckedChange={handleSelectAll} className="cursor-pointer" />
              <span className="font-semibold">Chọn tất cả ({cartCount} sản phẩm)</span>
            </div>
            
            {/* Các nút xóa - chỉ hiển thị nút "Xóa (số lượng)" khi có sản phẩm được chọn */}
            <div className="flex gap-3">
              {/* Nút xóa các sản phẩm đã chọn - chỉ hiển thị khi có sản phẩm được chọn */}
              {selectedItems.size > 0 && (
                <Button variant="outline" size="sm" onClick={handleDeleteSelected} className="text-red-600 cursor-pointer">
                  <FaTrash className="mr-2 h-3 w-3" />
                  Xóa ({selectedItems.size})
                </Button>
              )}
              {/* Dialog xác nhận xóa tất cả sản phẩm */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-gray-600 cursor-pointer">
                    <FaTrash className="mr-2 h-3 w-3" />
                    Xóa tất cả
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Xóa tất cả sản phẩm?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Bạn có chắc chắn muốn xóa tất cả <span className="font-semibold">{cartCount} sản phẩm</span> khỏi giỏ hàng không? 
                      Hành động này không thể hoàn tác.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="cursor-pointer">Hủy bỏ</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearAll} className="bg-red-500 hover:bg-red-600 cursor-pointer">
                      Xóa tất cả
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid layout: 3 cột cho bảng sản phẩm, 1 cột cho tóm tắt đơn hàng */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Bảng danh sách sản phẩm trong giỏ hàng */}
        <div className="lg:col-span-3">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] text-center">Chọn</TableHead>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead className="text-center w-[100px]">Màu sắc</TableHead>
                  <TableHead className="text-center w-[100px]">Kích thước</TableHead>
                  <TableHead className="text-center">Đơn giá</TableHead>
                  <TableHead className="text-center">Số lượng</TableHead>
                  <TableHead className="text-center">Thành tiền</TableHead>
                  <TableHead className="w-[80px] text-center">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Render từng sản phẩm trong giỏ hàng */}
                {cartItems.map((item) => (
                  <CartItemRow key={item.id} item={item} />
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
        
        {/* Tóm tắt đơn hàng - sticky để luôn hiển thị khi scroll */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Tóm tắt đơn hàng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Tạm tính = tổng tiền của các sản phẩm đã chọn */}
              <div className="flex justify-between">
                <span>Tạm tính ({getSelectedCount()} sản phẩm):</span>
                <span className="font-semibold">{formatPrice(getSelectedTotalAmount())}</span>
              </div>
              
              {/* Phí vận chuyển - hiện tại miễn phí */}
              <div className="flex justify-between">
                <span>Phí vận chuyển:</span>
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Miễn phí</Badge>
              </div>
              
              {/* Tổng cộng = Tạm tính (vì phí vận chuyển miễn phí) */}
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Tổng cộng:</span>
                  <span className="text-red-600">{formatPrice(getSelectedTotalAmount())}</span>
                </div>
              </div>
              
              {/* Nút mua hàng - disabled khi không có sản phẩm nào được chọn */}
              <Button onClick={handleCheckout} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-semibold mb-3 cursor-pointer" disabled={selectedItems.size === 0}>
                Mua hàng ({selectedItems.size})
              </Button>
              
              {/* Nút tiếp tục mua sắm - chuyển đến trang sản phẩm */}
              <Button variant="outline" onClick={handleContinueShopping} className="w-full py-3 rounded-lg cursor-pointer">
                Tiếp tục mua sắm
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
