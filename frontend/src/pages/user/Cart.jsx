import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaShoppingCart, FaTrash, FaPlus, FaMinus } from "react-icons/fa";
import useCartStore from "@/stores/cartStore";
import BreadcrumbNav from "@/components/user/BreadcrumbNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPrice } from "@/lib/utils";

/**
 * 🛒 CART PAGE COMPONENT - TRANG GIỎ HÀNG VIẾT T4
 */

export default function Cart() {
  const { 
    items: cartItems, //danh sách sản phẩm trong giỏ hàng từ cartStore.js
    totalQuantity: cartCount, //số lượng sản phẩm trong giỏ hàng từ store cartStore.js
    loading, //trạng thái loading từ store cartStore.js
    fetchCart, //hàm lấy danh sách sản phẩm trong giỏ hàng từ store cartStore.js
    updateCartItem, //hàm cập nhật số lượng sản phẩm trong giỏ hàng từ store cartStore.js
    removeFromCart, //hàm xóa sản phẩm khỏi giỏ hàng từ store cartStore.js
    clearCart //hàm xóa tất cả sản phẩm khỏi giỏ hàng từ store cartStore.js
  } = useCartStore();
  
  const navigate = useNavigate(); // React Router hook để điều hướng
  const [updatingItems, setUpdatingItems] = useState(new Set()); // Set các item IDs đang được cập nhật
  const [selectedItems, setSelectedItems] = useState(new Set()); // Set các item IDs đã được chọn bằng checkbox

  // Fetch giỏ hàng khi component mount
  useEffect(() => {
    fetchCart(); //gọi hàm fetchCart từ cartStore.js để lấy danh sách sản phẩm trong giỏ hàng
  }, []);

  // Cập nhật số lượng sản phẩm trong giỏ hàng
  const handleUpdateQuantity = async (cartItemId, newQuantity) => {
    if (newQuantity < 1) return; // Không cho phép số lượng < 1
    setUpdatingItems(prev => new Set(prev).add(cartItemId)); // thêm cartItemId vào danh sách "đang cập nhật"
    try {
      await updateCartItem({ cartItemId, quantity: newQuantity }); //gọi hàm updateCartItem từ cartStore.js để cập nhật số lượng sản phẩm trong giỏ hàng
    } finally {
      setUpdatingItems(prev => new Set([...prev].filter(id => id !== cartItemId))); //xóa cartItemId khỏi danh sách "đang cập nhật"
    }
  };

  // Xóa một sản phẩm khỏi giỏ hàng
  const handleRemoveItem = async (cartItemId) => {
    await removeFromCart(cartItemId); // Gọi API xóa
  };

  // Xóa tất cả sản phẩm khỏi giỏ hàng
  const handleClearAll = async () => {
    await clearCart(); // Gọi API xóa tất cả
  };

  // Chọn/bỏ chọn tất cả sản phẩm
  const handleSelectAll = (checked) => {
    setSelectedItems(checked ? new Set(cartItems.map(item => item.id)) : new Set()); //nếu checked = true thì thêm tất cả item IDs vào selectedItems, nếu checked = false thì xóa tất cả IDs khỏi selectedItems (Set rỗng)
  };

  // Chọn/bỏ chọn một sản phẩm cụ thể
  const handleSelectItem = (itemId, checked) => {
    const newSelectedItems = new Set(selectedItems); // Tạo bản sao
    if (checked) newSelectedItems.add(itemId); // Thêm vào Set
    else newSelectedItems.delete(itemId); // Xóa khỏi Set
    setSelectedItems(newSelectedItems); // Cập nhật state
  };

  // Xóa tất cả sản phẩm đã chọn
  const handleDeleteSelected = async () => {
    for (const itemId of selectedItems) { // Lặp qua các item đã chọn
      await removeFromCart(itemId); // Xóa từng item
    }
    setSelectedItems(new Set()); // Xóa tất cả selection
  };

  // Tính tổng tiền của các sản phẩm đã chọn
  const getSelectedTotalAmount = () => {
    return cartItems
      .filter(item => selectedItems.has(item.id)) // Chỉ lấy item đã chọn
      .reduce((total, item) => total + (item.finalPrice * item.quantity), 0); // Tính tổng tiền
  };

  // Đếm số loại sản phẩm đã chọn
  const getSelectedCount = () => {
    return cartItems
      .filter(item => selectedItems.has(item.id)) // Chỉ lấy item đã chọn
      .length; // Đếm số loại sản phẩm đã chọn, không phải tổng quantity
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <BreadcrumbNav />
        <div className="mt-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-4 rounded-lg">
              <div className="flex gap-4">
                <Skeleton className="h-20 w-20 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty cart state
  if (cartCount === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <BreadcrumbNav />
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <FaShoppingCart className="h-16 w-16 text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold mb-4">Giỏ hàng trống</h1>
          <Button onClick={() => navigate("/san-pham")} className="bg-blue-600 hover:bg-blue-700">
            Mua sắm ngay
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <BreadcrumbNav />
      
      {/* Header với checkbox chọn tất cả */}
      <div className="mt-6 bg-white rounded-lg shadow-lg border p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selectedItems.size === cartItems.length}
              onCheckedChange={handleSelectAll}
              className="cursor-pointer"
            />
            <span className="font-semibold ">Chọn tất cả ({cartCount} sản phẩm)</span>
          </div>
          
          <div className="flex gap-3">
            {selectedItems.size > 0 && (
              <Button variant="outline" size="sm" onClick={handleDeleteSelected} className="text-red-600 cursor-pointer">
                <FaTrash className="mr-2 h-3 w-3" />
                Xóa ({selectedItems.size})
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleClearAll} className="text-gray-600 cursor-pointer">
              <FaTrash className="mr-2 h-3 w-3" />
              Xóa tất cả
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Cart Items Table */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] text-center ">Chọn</TableHead>
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
                {cartItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-gray-50">
                    {/* Checkbox */}
                    <TableCell className="text-center">
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={(checked) => handleSelectItem(item.id, checked)}
                      />
                    </TableCell>
                    
                    {/* Product Info */}
                    <TableCell>
                      <div className="flex gap-3">
                        <img
                          src={item.product.primaryImage || item.product.imageUrl || "/placeholder-product.jpg"}
                          alt={item.product.name}
                          className="h-16 w-16 object-cover rounded border"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm">{item.product.name}</h3>
                        </div>
                      </div>
                    </TableCell>
                    
                    {/* Color */}
                    <TableCell className="text-center">
                      {(item.variant?.color || item.productVariant?.color) ? (
                        <span className="text-xs bg-blue-100 px-2 py-1 rounded text-blue-800 font-medium">
                          {item.variant?.color || item.productVariant?.color}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </TableCell>
                    
                    {/* Size */}
                    <TableCell className="text-center">
                      {(item.variant?.size || item.productVariant?.size) ? (
                        <span className="text-xs bg-green-100 px-2 py-1 rounded text-green-800 font-medium">
                          {item.variant?.size || item.productVariant?.size}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </TableCell>
                    
                    {/* Unit Price */}
                    <TableCell className="text-center">
                      <p className="font-semibold text-sm">{formatPrice(item.finalPrice)}</p>
                      {item.salePrice && item.salePrice !== item.unitPrice && (
                        <p className="text-xs text-gray-500 line-through">{formatPrice(item.unitPrice)}</p>
                      )}
                    </TableCell>
                    
                    {/* Quantity Controls */}
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          disabled={updatingItems.has(item.id) || item.quantity <= 1}
                        >
                          <FaMinus className="h-3 w-3" />
                        </Button>
                        
                        <span className="min-w-[2rem] text-center font-medium text-sm">
                          {updatingItems.has(item.id) ? <Skeleton className="h-5 w-5 mx-auto" /> : item.quantity}
                        </span>
                        
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 cursor-pointer"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          disabled={updatingItems.has(item.id)}
                        >
                          <FaPlus className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    
                    {/* Total Amount */}
                    <TableCell className="text-center">
                      <p className="font-bold text-red-600 text-sm">{formatPrice(item.finalPrice * item.quantity)}</p>
                    </TableCell>
                    
                    {/* Actions */}
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-red-600 hover:text-red-700 h-7 w-7 p-0 cursor-pointer"
                      >
                        <FaTrash className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        
        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 bg-white rounded-lg shadow border p-4">
            <h3 className="text-lg font-bold mb-4">Tóm tắt đơn hàng</h3>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span>Tạm tính ({getSelectedCount()} sản phẩm):</span>
                <span className="font-semibold">{formatPrice(getSelectedTotalAmount())}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Phí vận chuyển:</span>
                <span className="font-semibold text-green-600">Miễn phí</span>
              </div>
              
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Tổng cộng:</span>
                  <span className="text-red-600">{formatPrice(getSelectedTotalAmount())}</span>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={() => navigate("/checkout")}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-semibold mb-3 cursor-pointer"
              disabled={selectedItems.size === 0}
            >
              Mua hàng ({selectedItems.size})
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => navigate("/san-pham")}
              className="w-full py-3 rounded-lg cursor-pointer"
            >
              Tiếp tục mua sắm
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}