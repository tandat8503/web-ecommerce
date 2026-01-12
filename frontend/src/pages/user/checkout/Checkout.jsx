import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select } from "antd";
import BreadcrumbNav from "@/components/user/BreadcrumbNav";
import { formatPrice } from "@/lib/utils";
import { useCheckout } from "./useCheckout";
import { FaHome, FaBriefcase, FaPlus, FaMinus, FaTrash } from "react-icons/fa";

export default function Checkout() {
  const {
    addresses,
    selectedAddress,
    selectedAddressId,
    checkoutItems,
    summary,
    shippingFeeLoading,
    shippingFeeError,
    canCalculateShipping,
    paymentMethod,
    customerNote,
    submitting,
    showAddressForm,
    addressForm,
    selectedCodes,
    provinces,
    districts,
    wards,
    savingAddress,
    couponCode,
    appliedCoupon,
    validatingCoupon,
    couponError,
    userCoupons,
    loadingCoupons,
    setSelectedAddressId,
    setPaymentMethod,
    setCustomerNote,
    setCouponCode,
    handleApplyCoupon,
    handleRemoveCoupon,
    handleAddressChange,
    handleProvinceChange,
    handleDistrictChange,
    handleWardChange,
    handleSaveAddress,
    handleUpdateQuantity,
    handleRemoveItem,
    updatingQuantity,
    removingItem,
    handlePlaceOrder,
    setShowAddressForm,
  } = useCheckout();

  const [openAddressDialog, setOpenAddressDialog] = React.useState(false);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <BreadcrumbNav />


      {/*  KHỐI ĐỊA CHỈ GIAO HÀNG */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Địa chỉ nhận hàng</CardTitle>
        </CardHeader>
        <CardContent>
          {!showAddressForm && selectedAddress ? (
            // ĐÃ CÓ ĐỊA CHỈ → Hiển thị thông tin + nút Thay đổi
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="font-semibold">
                  {selectedAddress.fullName} <span className="text-gray-600">| {selectedAddress.phone}</span>
                </div>
                <div className="text-sm text-gray-700">
                  {selectedAddress.streetAddress}, {selectedAddress.ward}, {selectedAddress.district},{" "}
                  {selectedAddress.city}
                </div>
              </div>
              <Button variant="outline" onClick={() => setOpenAddressDialog(true)}>
                Thay đổi
              </Button>
            </div>
          ) : (
            // ❗ CHƯA CÓ ĐỊA CHỈ → Hiển thị form nhập (giống Shopee)
            <div className="space-y-4">
              <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded">
                Bạn chưa có địa chỉ giao hàng. Vui lòng nhập thông tin bên dưới.
              </div>

              {/* Họ tên + SĐT */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Họ tên *</label>
                  <Input
                    placeholder="Nguyễn Văn A"
                    value={addressForm.fullName}
                    onChange={(e) => handleAddressChange("fullName", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Số điện thoại *</label>
                  <Input
                    placeholder="0123456789"
                    value={addressForm.phone}
                    onChange={(e) => handleAddressChange("phone", e.target.value)}
                  />
                </div>
              </div>

              {/* Tỉnh / Quận / Phường */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Tỉnh/Thành phố *</label>
                  <Select
                    placeholder="Chọn Tỉnh/TP"
                    value={selectedCodes.provinceCode || undefined}
                    onChange={handleProvinceChange}
                    className="w-full"
                    showSearch
                    filterOption={(input, option) =>
                      option?.children?.toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {provinces.map((p) => (
                      <Select.Option key={p.code} value={String(p.code)}>
                        {p.name}
                      </Select.Option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Quận/Huyện *</label>
                  <Select
                    placeholder="Chọn Quận/Huyện"
                    value={selectedCodes.districtCode || undefined}
                    onChange={handleDistrictChange}
                    disabled={!selectedCodes.provinceCode}
                    className="w-full"
                    showSearch
                    filterOption={(input, option) =>
                      option?.children?.toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {districts.map((d) => (
                      <Select.Option key={d.code} value={String(d.code)}>
                        {d.name}
                      </Select.Option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Phường/Xã *</label>
                  <Select
                    placeholder="Chọn Phường/Xã"
                    value={selectedCodes.wardCode || undefined}
                    onChange={handleWardChange}
                    disabled={!selectedCodes.districtCode}
                    className="w-full"
                    showSearch
                    filterOption={(input, option) =>
                      option?.children?.toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {wards.map((w) => (
                      <Select.Option key={w.code} value={String(w.code)}>
                        {w.name}
                      </Select.Option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Địa chỉ cụ thể */}
              <div>
                <label className="text-sm font-medium">Địa chỉ cụ thể *</label>
                <Input
                  placeholder="Số nhà, tên đường..."
                  value={addressForm.streetAddress}
                  onChange={(e) => handleAddressChange("streetAddress", e.target.value)}
                />
              </div>

              {/* Loại địa chỉ */}
              <div>
                <label className="text-sm font-medium mb-2 block">Loại địa chỉ</label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={addressForm.addressType === "HOME" ? "default" : "outline"}
                    onClick={() => handleAddressChange("addressType", "HOME")}
                  >
                    <FaHome className="mr-2" /> Nhà riêng
                  </Button>
                  <Button
                    type="button"
                    variant={addressForm.addressType === "OFFICE" ? "default" : "outline"}
                    onClick={() => handleAddressChange("addressType", "OFFICE")}
                  >
                    <FaBriefcase className="mr-2" /> Văn phòng
                  </Button>
                </div>
              </div>

              {/* Ghi chú */}
              {/* <div>
                <label className="text-sm font-medium">Ghi chú</label>
                <Textarea
                  placeholder="Ví dụ: Giao giờ hành chính"
                  value={addressForm.note}
                  onChange={(e) => handleAddressChange("note", e.target.value)}
                  rows={2}
                />
              </div> */}

              {/* Nút lưu */}
              <div className="flex justify-end gap-2">
                {addresses.length > 0 && (
                  <Button variant="outline" onClick={() => setShowAddressForm(false)}>
                    Hủy
                  </Button>
                )}
                <Button
                  className="bg-orange-500 hover:bg-orange-600"
                  onClick={handleSaveAddress}
                  disabled={savingAddress}
                >
                  {savingAddress ? "Đang lưu..." : "Lưu địa chỉ"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 🛒 SẢN PHẨM + THANH TOÁN + GHI CHÚ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Danh sách sản phẩm */}
          <Card>
            <CardHeader>
              <CardTitle>Sản phẩm đặt hàng ({checkoutItems.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {checkoutItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Không có sản phẩm nào được chọn.</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => window.location.href = '/cart'}
                  >
                    Quay lại giỏ hàng
                  </Button>
                </div>
              ) : (
                checkoutItems.map((item) => {
                  const variant = item.variant;
                  const imageUrl =
                    item.product?.primary_image || item.product?.image_url || "/placeholder-product.jpg";
                  const price = Number(item.final_price || item.product?.price || 0);
                  const isRemoving = removingItem === item.id;

                  return (
                    <div key={item.id} className="flex gap-3 py-3 border-b last:border-0">
                      <img src={imageUrl} alt={item.product?.name} className="w-16 h-16 object-cover rounded border" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.product?.name}</div>
                        <div className="text-xs text-gray-500">
                          {variant?.color && `Màu: ${variant.color}`}
                          {variant?.width && ` | ${variant.width}x${variant.depth}x${variant.height}mm`}
                        </div>
                        <div className="text-sm text-orange-600 font-semibold mt-1">
                          {formatPrice(price)} x {item.quantity}
                        </div>
                        {/* ✅ Nút cập nhật số lượng và xóa */}
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center gap-1 border rounded">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 cursor-pointer"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                              disabled={updatingQuantity || item.quantity <= 1}
                            >
                              <FaMinus className="h-3 w-3 " />
                            </Button>
                            <span className="min-w-[2rem] text-center font-medium text-sm">{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 cursor-pointer"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                              disabled={updatingQuantity || item.quantity >= (variant?.stock_quantity || 0)}
                              title={item.quantity >= (variant?.stock_quantity || 0) ? "Đã đạt giới hạn tồn kho" : ""}
                            >
                              <FaPlus className="h-3 w-3 " />
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-red-600 cursor-pointer hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={isRemoving || updatingQuantity}
                          >
                            {isRemoving ? (
                              <span className="text-xs">Đang xóa...</span>
                            ) : (
                              <>
                                <FaTrash className="h-3 w-3 mr-1" />
                                Xóa
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-orange-600">{formatPrice(price * item.quantity)}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Phương thức thanh toán */}
          <Card>
            <CardHeader>
              <CardTitle>Phương thức thanh toán</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                {["COD", "VNPAY", "TINGEE"].map((method) => {
                  const isDisabled = summary.total === 0 && method !== "COD";
                  return (
                    <label
                      key={method}
                      className={`border rounded p-3 text-sm flex items-center gap-2 transition-all ${paymentMethod === method ? "border-blue-600 bg-blue-50 shadow-sm" : "hover:border-gray-300"
                        } ${isDisabled ? "opacity-50 cursor-not-allowed bg-gray-50 border-gray-200" : "cursor-pointer"}`}
                    >
                      <input
                        type="radio"
                        value={method}
                        checked={paymentMethod === method}
                        onChange={() => !isDisabled && setPaymentMethod(method)}
                        disabled={isDisabled}
                        className={isDisabled ? "cursor-not-allowed" : "cursor-pointer"}
                      />
                      <div className="flex-1">
                        <div className={`font-semibold ${isDisabled ? "text-gray-400" : "text-gray-900"}`}>
                          {method === "COD" ? "Thanh toán khi nhận hàng (COD)" :
                            method === "VNPAY" ? "VNPay" :
                              "Chuyển khoản QR Code"}
                          {isDisabled && <span className="text-[10px] ml-2 font-normal text-red-500">(Không khả dụng cho đơn 0đ)</span>}
                        </div>
                        {method === "TINGEE" && (
                          <div className="text-xs text-gray-500 mt-1">
                            Quét mã QR để thanh toán qua ngân hàng
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Mã giảm giá */}
          <Card>
            <CardHeader>
              <CardTitle>Mã giảm giá</CardTitle>
            </CardHeader>
            <CardContent>
              {appliedCoupon ? (
                // Đã áp dụng coupon
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                    <div>
                      <div className="font-semibold text-green-700">{appliedCoupon.code}</div>
                      <div className="text-sm text-gray-600">{appliedCoupon.name}</div>
                      {appliedCoupon.applyToShipping && (
                        <div className="text-xs text-orange-600 mt-1">
                          ✓ Giảm {formatPrice(appliedCoupon.discountShipping)} phí vận chuyển
                        </div>
                      )}
                      {appliedCoupon.discountAmount > 0 && (
                        <div className="text-xs text-orange-600 mt-1">
                          ✓ Giảm {formatPrice(appliedCoupon.discountAmount)} đơn hàng
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveCoupon}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Xóa
                    </Button>
                  </div>
                </div>
              ) : (
                // Chưa áp dụng coupon - Hiển thị combobox chọn mã
                <div className="space-y-3">
                  {loadingCoupons ? (
                    <div className="text-center py-4 text-gray-500">
                      <span className="text-sm">Đang tải mã giảm giá...</span>
                    </div>
                  ) : userCoupons.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">Bạn chưa có mã giảm giá nào</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Mã giảm giá sẽ được tặng khi bạn mua hàng hoặc đánh giá sản phẩm
                      </p>
                    </div>
                  ) : (
                    <>
                      <Select
                        placeholder="Chọn mã giảm giá"
                        value={couponCode || undefined}
                        onChange={handleApplyCoupon}
                        className="w-full"
                        loading={validatingCoupon}
                        disabled={validatingCoupon}
                      >
                        {userCoupons.map((userCoupon) => (
                          <Select.Option key={userCoupon.id} value={userCoupon.coupon.code}>
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-semibold">{userCoupon.coupon.code}</div>
                                <div className="text-xs text-gray-500">{userCoupon.coupon.name}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-orange-600">
                                  {userCoupon.coupon.discountType === 'AMOUNT'
                                    ? formatPrice(userCoupon.coupon.discountValue)
                                    : `${userCoupon.coupon.discountValue}%`
                                  }
                                </div>
                                {userCoupon.coupon.minimumAmount > 0 && (
                                  <div className="text-xs text-gray-400">
                                    Đơn tối thiểu {formatPrice(userCoupon.coupon.minimumAmount)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </Select.Option>
                        ))}
                      </Select>
                      {couponError && (
                        <p className="text-sm text-red-600">{couponError}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        Chọn mã giảm giá để nhận ưu đãi cho đơn hàng của bạn
                      </p>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ghi chú */}
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

        {/* 💰 TÓM TẮT ĐƠN HÀNG */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Tóm tắt đơn hàng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Tạm tính</span>
                <span className="font-semibold">{formatPrice(summary.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span>Phí vận chuyển</span>
                {shippingFeeLoading ? (
                  <span className="text-gray-500 text-xs">Đang tính...</span>
                ) : !selectedAddress ? (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                    Chưa có địa chỉ
                  </Badge>
                ) : !canCalculateShipping ? (
                  <div className="text-right">
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 mb-1 block">
                      Cần cập nhật mã GHN
                    </Badge>
                    {shippingFeeError && (
                      <p className="text-xs text-yellow-600 mt-1 max-w-[200px]">
                        {shippingFeeError}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-right">
                    {shippingFeeError && (
                      <p className="text-xs text-red-500 mb-0.5">{shippingFeeError}</p>
                    )}
                    <span className="font-semibold">{formatPrice(summary.shippingFee)}</span>
                  </div>
                )}
              </div>

              {/* Hiển thị discount nếu có */}
              {appliedCoupon && summary.totalDiscount > 0 && (
                <>
                  {summary.discountShipping > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Giảm phí vận chuyển</span>
                      <span className="font-semibold">-{formatPrice(summary.discountShipping)}</span>
                    </div>
                  )}
                  {summary.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Giảm giá đơn hàng</span>
                      <span className="font-semibold">-{formatPrice(summary.discountAmount)}</span>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-between border-t pt-3 font-bold">
                <span>Tổng cộng</span>
                <span className="text-orange-600 text-lg">{formatPrice(summary.total)}</span>
              </div>

              {/* Nút đặt hàng - Tự động xử lý theo payment method */}
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                disabled={submitting || !selectedAddress}
                onClick={handlePlaceOrder}
              >
                {submitting ? "Đang xử lý..." : "Đặt hàng"}
              </Button>

              {!selectedAddress && (
                <p className="text-xs text-orange-600 text-center">Vui lòng nhập địa chỉ giao hàng</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 📍 DIALOG CHỌN ĐỊA CHỈ KHÁC */}
      <Dialog
        open={openAddressDialog}
        onOpenChange={(open) => {
          // Không cho phép đóng dialog bằng cách click ngoài hoặc ESC
          // Chỉ đóng khi user click nút "Hủy" hoặc "Thêm địa chỉ mới"
          if (!open) return;
          setOpenAddressDialog(open);
        }}
      >
        <DialogContent
          className="sm:max-w-[600px]"
          onEscapeKeyDown={(e) => e.preventDefault()} // Chặn ESC
          onPointerDownOutside={(e) => e.preventDefault()} // Chặn click ngoài
        >
          <DialogHeader>
            <DialogTitle>Chọn địa chỉ giao hàng</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto space-y-3">
            {addresses.map((addr) => (
              <label
                key={addr.id}
                className={`flex items-start gap-3 border rounded p-3 cursor-pointer ${addr.id === selectedAddressId ? "border-blue-600 bg-blue-50" : ""
                  }`}
              >
                <input
                  type="radio"
                  checked={addr.id === selectedAddressId}
                  onChange={() => {
                    setSelectedAddressId(addr.id);
                    setOpenAddressDialog(false);
                  }}
                />
                <div className="flex-1 text-sm">
                  <div className="font-semibold">
                    {addr.fullName} | {addr.phone}
                    {addr.isDefault && (
                      <Badge className="ml-2 bg-red-500 text-white text-xs">Mặc định</Badge>
                    )}
                  </div>
                  <div className="text-gray-700">
                    {addr.streetAddress}, {addr.ward}, {addr.district}, {addr.city}
                  </div>
                </div>
              </label>
            ))}
          </div>
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setOpenAddressDialog(false)}
            >
              Hủy
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddressForm(true);
                setOpenAddressDialog(false);
              }}
            >
              + Thêm địa chỉ mới
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
