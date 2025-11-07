import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import BreadcrumbNav from "@/components/user/BreadcrumbNav";
import { formatPrice } from "@/lib/utils";
import { useCheckout } from "./useCheckout";

/**
 * ========================================
 * CHECKOUT PAGE - TRANG THANH TOÁN ✨
 * =======================================
 * 
 * Component này CHỈ render UI, không có logic
 * Tất cả logic được xử lý trong useCheckout.js hook
 */
export default function Checkout() {
  const {
    addresses,
    addressId,
    selectedAddress,
    paymentMethod,
    customerNote,
    submitting,
    openAddressDialog,
    selectedItems,
    summary,
    cartLoading,
    setAddressId,
    setPaymentMethod,
    setCustomerNote,
    setOpenAddressDialog,
    onSubmit,
    handleManageAddress,
  } = useCheckout();

  // ========== HELPER COMPONENTS ==========
  const PaymentMethodOption = ({ value, label, isSelected, onChange }) => (
    <label className={`border rounded-lg p-3 cursor-pointer text-sm flex items-center gap-2 ${isSelected ? 'border-blue-600 ring-2 ring-blue-100' : ''}`}>
      <input type="radio" name="payment" value={value} checked={isSelected} onChange={onChange} />
      {label}
    </label>
  );

  const AddressOption = ({ address, isSelected, onSelect }) => (
    <label className={`flex items-start gap-3 border rounded-lg p-3 cursor-pointer ${isSelected ? 'border-blue-600 ring-2 ring-blue-100' : ''}`}>
      <input type="radio" name="address" checked={isSelected} onChange={onSelect} />
      <div className="flex-1 text-sm">
        <div className="font-semibold">
          {address.fullName} <span className="ml-2 text-gray-600">{address.phone}</span>
          {address.isDefault && <Badge className="ml-2 bg-red-500 text-white">Mặc định</Badge>}
        </div>
        <div className="text-gray-700">{address.streetAddress}, {address.ward}, {address.district}, {address.city}</div>
        {address.note && <div className="text-gray-500 mt-1 italic">{address.note}</div>}
      </div>
    </label>
  );

  // ========== RENDER ==========
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <BreadcrumbNav />

      {/* Header - Địa chỉ nhận hàng */}
      <Card className="mt-6">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="text-base font-bold">Địa chỉ nhận hàng</div>
              {selectedAddress ? (
                <div className="text-sm">
                  <div className="font-semibold">
                    {selectedAddress.fullName} <span className="ml-2 text-gray-600">{selectedAddress.phone}</span>
                  </div>
                  <div className="text-gray-700">
                    {selectedAddress.streetAddress}, {selectedAddress.ward}, {selectedAddress.district}, {selectedAddress.city}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">Chưa có địa chỉ. Vui lòng thêm địa chỉ giao hàng.</div>
              )}
            </div>
            <div>
              {selectedAddress ? (
                <Button variant="outline" className="cursor-pointer" onClick={() => setOpenAddressDialog(true)}>Thay đổi</Button>
              ) : (
                <Button variant="outline" className="cursor-pointer" onClick={handleManageAddress}>Thêm địa chỉ</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Cột trái: Sản phẩm + Thanh toán + Ghi chú */}
        <div className="lg:col-span-2 space-y-6">
          {/* Danh sách sản phẩm trong đơn */}
          <Card>
            <CardHeader>
              <CardTitle>Sản phẩm</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedItems.length === 0 ? (
                <div className="text-sm text-gray-500">Giỏ hàng trống</div>
              ) : (
                <div className="space-y-4">
                  {selectedItems.map((item) => {
                    const color = item.variant?.color || item.productVariant?.color;
                    const size = item.variant?.size || item.productVariant?.size;
                    const imageUrl = item.product.primaryImage || item.product.imageUrl || "/placeholder-product.jpg";
                    
                    return (
                      <div key={item.id} className="flex items-center justify-between gap-4 pb-4 border-b last:border-b-0">
                        <div className="flex items-center gap-3">
                          <img src={imageUrl} alt={item.product.name} className="h-16 w-16 rounded object-cover border" />
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{item.product.name}</div>
                            <div className="text-xs text-gray-500">
                              {color && <span>Màu: {color}</span>}
                              {size && <span className="ml-2">Size: {size}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-sm text-gray-600">x{item.quantity}</div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-red-600">{formatPrice(item.finalPrice * item.quantity)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Phương thức thanh toán */}
          <Card>
            <CardHeader>
              <CardTitle>Phương thức thanh toán</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <PaymentMethodOption value="COD" label="Thanh toán khi nhận hàng (COD)" isSelected={paymentMethod === "COD"} onChange={() => setPaymentMethod("COD")} />
                <PaymentMethodOption value="MOMO" label="Ví MoMo" isSelected={paymentMethod === "MOMO"} onChange={() => setPaymentMethod("MOMO")} />
                <PaymentMethodOption value="VNPAY" label="VNPAY" isSelected={paymentMethod === "VNPAY"} onChange={() => setPaymentMethod("VNPAY")} />
              </div>
            </CardContent>
          </Card>

          {/* Ghi chú cho người bán */}
          <Card>
            <CardHeader>
              <CardTitle>Ghi chú cho người bán</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi giao..."
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Cột phải: Tóm tắt thanh toán */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Tóm tắt đơn hàng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Tạm tính</span>
                  <span className="font-semibold">{formatPrice(summary.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phí vận chuyển</span>
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Miễn phí</Badge>
                </div>
                <div className="flex justify-between border-t pt-2 text-base font-bold">
                  <span>Tổng cộng</span>
                  <span className="text-red-600">{formatPrice(summary.total)}</span>
                </div>
              </div>

              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
                disabled={submitting || cartLoading || selectedItems.length === 0 || !selectedAddress}
                onClick={() => {
                  if (!selectedAddress) {
                    setOpenAddressDialog(true);
                    return;
                  }
                  onSubmit();
                }}
              >
                {submitting ? "Đang đặt hàng..." : "Đặt hàng"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog chọn địa chỉ */}
      <Dialog open={openAddressDialog} onOpenChange={setOpenAddressDialog}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Chọn địa chỉ giao hàng</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto space-y-3">
            {Array.isArray(addresses) && addresses.length > 0 ? (
              addresses.map((a) => (
                <AddressOption
                  key={a.id}
                  address={a}
                  isSelected={String(addressId) === String(a.id)}
                  onSelect={() => setAddressId(String(a.id))}
                />
              ))
            ) : (
              <div className="text-sm text-gray-500">Chưa có địa chỉ. Vui lòng thêm trong mục Hồ sơ → Địa chỉ.</div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <Button variant="outline" className="cursor-pointer" onClick={handleManageAddress}>Quản lý địa chỉ</Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="cursor-pointer" onClick={() => setOpenAddressDialog(false)}>Hủy</Button>
              <Button className="cursor-pointer" onClick={() => setOpenAddressDialog(false)}>Xác nhận</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

