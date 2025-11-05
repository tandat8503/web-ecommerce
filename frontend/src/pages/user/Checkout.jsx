import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import BreadcrumbNav from "@/components/user/BreadcrumbNav";
import useCartStore from "@/stores/cartStore";
import { formatPrice } from "@/lib/utils";
import { getAddresses } from "@/api/address";
import { createOrder } from "@/api/orders";
import { createMoMoPayment } from "@/api/payment";

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { items: cartItems, totalAmount, fetchCart, loading: cartLoading } = useCartStore();

  const [addresses, setAddresses] = useState([]);//danh sách địa chỉ từ API getAddresses()
  const [addressId, setAddressId] = useState("");//id địa chỉ được chọn
  const [selectedAddress, setSelectedAddress] = useState(null);//địa chỉ được chọn
  const [paymentMethod, setPaymentMethod] = useState("COD");//phương thức thanh toán
  const [customerNote, setCustomerNote] = useState("");//ghi chú cho người bán
  const [submitting, setSubmitting] = useState(false);//trạng thái đang đặt hàng
  const [openAddressDialog, setOpenAddressDialog] = useState(false);//trạng thái mở dialog chọn địa chỉ
  // Danh sách ID cart item được chọn (nhận từ query ?selected=1,2 ở trang Giỏ hàng)
  const [selectedItemIds, setSelectedItemIds] = useState([]);

  useEffect(() => {
    fetchCart();
  }, []);

  // B1 - Đọc danh sách item được chọn từ query string
  // Ví dụ URL: /checkout?selected=10,12  => selectedItemIds = ["10","12"]
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get("selected");
    const ids = raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : [];
    setSelectedItemIds(ids);
  }, [location.search]);

  // B2 - Tải toàn bộ địa chỉ một lần
  // Đơn giản hoá: chỉ gọi 1 API getAddresses() → lấy mảng addresses
  // Sau khi có danh sách: ưu tiên chọn địa chỉ mặc định, không có thì chọn phần tử đầu tiên
  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const res = await getAddresses();
        
        const all = Array.isArray(res.data?.addresses) ? res.data.addresses : [];//lấy mảng addresses từ response
        setAddresses(all);
        if (all.length) {
          const defaultAddress = all.find((a) => a.isDefault) || all[0];//tìm địa chỉ mặc định, không có thì chọn phần tử đầu tiên
          setAddressId(String(defaultAddress.id));//set id địa chỉ được chọn
          setSelectedAddress(defaultAddress);//set địa chỉ được chọn
        }
      } catch {
        setAddresses([]);//nếu lỗi thì set mảng addresses trống
      }
    };
    fetchAddresses();//gọi hàm fetchAddresses để tải toàn bộ địa chỉ
  }, []);

  // B3 - Đồng bộ addressId -> selectedAddress để phần header hiển thị đúng
  useEffect(() => {
    if (!addressId) return;
    const found = addresses.find((a) => String(a.id) === String(addressId));
    if (found) setSelectedAddress(found);
  }, [addressId, addresses]);

  // B4 - Xác định danh sách item sẽ đặt hàng
  // Nếu có selectedItemIds: chỉ lấy các item tương ứng; nếu không: lấy toàn bộ cartItems
  const selectedItems = useMemo(() => {
    const hasSelection = selectedItemIds.length > 0;
    return hasSelection ? cartItems.filter((i) => selectedItemIds.includes(String(i.id))) : cartItems;
  }, [cartItems, selectedItemIds]);

  // B5 - Tính toán tóm tắt tiền: tạm tính, phí ship, giảm giá, tổng cộng
  const summary = useMemo(() => {
    const subtotal = selectedItems.reduce((sum, item) => sum + item.finalPrice * item.quantity, 0);
    const shippingFee = 0;
    const discountAmount = 0;
    const total = subtotal + shippingFee - discountAmount;
    return { subtotal, shippingFee, discountAmount, total };
  }, [selectedItems]);

  const onSubmit = async () => {
    // B6 - Validate: bắt buộc có địa chỉ và có item để đặt
    if (!addressId) {
      toast.error("Vui lòng chọn địa chỉ giao hàng");
      return;
    }
    if (!cartItems.length) {
      toast.error("Giỏ hàng trống");
      return;
    }
    setSubmitting(true);
    try {
      // Xác định danh sách cartItemIds gửi lên server
      // - Nếu user chọn sẵn ở Giỏ hàng → dùng selectedItemIds
      // - Nếu không chọn sẵn → đặt toàn bộ cartItems
      const idsForCheckout = (selectedItemIds.length > 0)
        ? selectedItemIds.map((id) => Number(id)).filter((n) => !isNaN(n))
        : cartItems.map((i) => Number(i.id));
      const payload = {
        addressId: Number(addressId),
        paymentMethod,
        customerNote: customerNote?.trim() || undefined,
        cartItemIds: idsForCheckout,
      };
      // Gọi API tạo đơn với payload tối giản BE yêu cầu
      const res = await createOrder(payload);
      
      // B7 - Refresh giỏ hàng để chỉ còn lại các item chưa đặt (BE đã xoá theo cartItemIds)
      await fetchCart();
      
      const orderId = res.data?.order?.id;
      
      // Nếu thanh toán bằng MoMo, tạo payment URL và redirect
      if (paymentMethod === "MOMO" && orderId) {
        try {
          toast.info("Đang tạo liên kết thanh toán MoMo...");
          
          // Đợi một chút để backend xử lý xong order và payment
          await new Promise(resolve => setTimeout(resolve, 500));
          
          console.log("🔄 Gọi API createMoMoPayment với orderId:", orderId);
          const paymentRes = await createMoMoPayment(orderId);
          
          console.log("📦 Payment Response full:", paymentRes);
          console.log("📦 Payment Response data:", paymentRes.data);
          
          // Kiểm tra nhiều format response có thể có
          const paymentUrl = paymentRes.data?.data?.paymentUrl || 
                            paymentRes.data?.paymentUrl ||
                            paymentRes.data?.payUrl;
          
          const isSuccess = paymentRes.data?.success === true || paymentRes.data?.success === undefined;
          
          console.log("🔍 Payment URL found:", paymentUrl);
          console.log("🔍 Is Success:", isSuccess);
          console.log("🔍 Full response.data:", JSON.stringify(paymentRes.data, null, 2));
          
          if (paymentUrl && typeof paymentUrl === 'string' && paymentUrl.startsWith('http')) {
            // Redirect đến MoMo payment page
            console.log("✅ Redirecting to MoMo:", paymentUrl);
            
            // Hiển thị toast và redirect ngay
            toast.info("Đang chuyển đến trang thanh toán MoMo...", {
              autoClose: 1000
            });
            
            // Dùng window.location.replace để redirect (không giữ history)
            // Hoặc window.location.href nếu muốn giữ history
            setTimeout(() => {
              window.location.replace(paymentUrl);
            }, 500); // Đợi 500ms để user thấy toast message
            
            // Set submitting = false và return ngay
            setSubmitting(false);
            return;
          } else {
            console.error("❌ Payment URL không hợp lệ:", {
              paymentUrl: paymentUrl,
              type: typeof paymentUrl,
              startsWithHttp: paymentUrl?.startsWith?.('http'),
              success: paymentRes.data?.success,
              fullResponse: paymentRes.data
            });
            throw new Error(paymentRes.data?.message || "Không thể tạo liên kết thanh toán");
          }
        } catch (paymentError) {
          console.error("❌ Lỗi tạo payment URL:", paymentError);
          console.error("📋 Error details:", {
            message: paymentError.message,
            status: paymentError.response?.status,
            statusText: paymentError.response?.statusText,
            data: paymentError.response?.data,
            orderId: orderId
          });
          
          const errorMessage = paymentError.response?.data?.message || 
                              paymentError.response?.data?.error ||
                              paymentError.message || 
                              "Không thể tạo liên kết thanh toán MoMo";
          
          toast.error(errorMessage);
          setSubmitting(false);
          
          // Vẫn redirect đến order success với orderId để user có thể xem đơn
          if (orderId) {
            setTimeout(() => {
              navigate(`/order-success?orderId=${orderId}`);
            }, 1500);
          } else {
            setTimeout(() => {
              navigate(`/order-success`);
            }, 1500);
          }
          return;
        }
      }
      
      // Nếu không phải MoMo hoặc không có payment URL, redirect đến order success
      toast.success("Đặt hàng thành công");
      if (orderId) navigate(`/order-success?orderId=${orderId}`);
      else navigate(`/order-success`);
    } catch (e) {
      toast.error(e.response?.data?.message || "Không thể tạo đơn hàng");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <BreadcrumbNav />

      {/* Header - Địa chỉ kiểu Shopee */}
      <div className="mt-6 bg-white rounded-lg shadow border p-5 flex items-start justify-between">
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
            <Button variant="outline" className="cursor-pointer" onClick={() => navigate('/profile-manager?section=address')}>Thêm địa chỉ</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Cột trái: Sản phẩm + Thanh toán + Ghi chú */}
        <div className="lg:col-span-2 space-y-6">
          {/* Danh sách sản phẩm trong đơn */}
          <Card>
            <CardContent className="p-0">
              <div className="p-6">
                <h2 className="text-lg font-bold mb-4">Sản phẩm</h2>
                {cartItems.length === 0 ? (
                  <div className="text-sm text-gray-500">Giỏ hàng trống</div>
                ) : (
                  <div className="space-y-4">
                    {selectedItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-4 pb-4 border-b last:border-b-0">
                        <div className="flex items-center gap-3">
                          <img src={item.product.primaryImage || item.product.imageUrl || "/placeholder-product.jpg"} alt={item.product.name} className="h-16 w-16 rounded object-cover border" />
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{item.product.name}</div>
                            <div className="text-xs text-gray-500">
                              {(item.variant?.color || item.productVariant?.color) && <span>Màu: {item.variant?.color || item.productVariant?.color}</span>}
                              {(item.variant?.size || item.productVariant?.size) && <span className="ml-2">Size: {item.variant?.size || item.productVariant?.size}</span>}
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
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Phương thức thanh toán */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-bold">Phương thức thanh toán</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { value: "COD", label: "Thanh toán khi nhận hàng (COD)" },
                  { value: "MOMO", label: "Ví MoMo" },
                  { value: "VNPAY", label: "VNPAY" },
                ].map((m) => (
                  <label key={m.value} className={`border rounded-lg p-3 cursor-pointer text-sm flex items-center gap-2 ${paymentMethod === m.value ? 'border-blue-600 ring-2 ring-blue-100' : ''}`}>
                    <input type="radio" name="payment" value={m.value} checked={paymentMethod === m.value} onChange={() => setPaymentMethod(m.value)} />
                    {m.label}
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Ghi chú cho người bán */}
          <Card>
            <CardContent className="p-6 space-y-2">
              <h2 className="text-lg font-bold">Ghi chú cho người bán</h2>
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
          <div className="sticky top-4">
            <Card>
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-bold">Tóm tắt đơn hàng</h2>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Tạm tính</span>
                    <span className="font-semibold">{formatPrice(summary.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Phí vận chuyển</span>
                    <span className="font-semibold text-green-600">Miễn phí</span>
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
      </div>

      {/* Dialog chọn địa chỉ kiểu Shopee */}
      <Dialog open={openAddressDialog} onOpenChange={setOpenAddressDialog}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Chọn địa chỉ giao hàng</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto space-y-3">
            {Array.isArray(addresses) && addresses.length > 0 ? (
              addresses.map((a) => (
                <label key={a.id} className={`flex items-start gap-3 border rounded-lg p-3 cursor-pointer ${String(addressId) === String(a.id) ? 'border-blue-600 ring-2 ring-blue-100' : ''}`}>
                  <input type="radio" name="address" checked={String(addressId) === String(a.id)} onChange={() => setAddressId(String(a.id))} />
                  <div className="flex-1 text-sm">
                    <div className="font-semibold">
                      {a.fullName} <span className="ml-2 text-gray-600">{a.phone}</span>
                      {a.isDefault && <span className="ml-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded">Mặc định</span>}
                    </div>
                    <div className="text-gray-700">{a.streetAddress}, {a.ward}, {a.district}, {a.city}</div>
                    {a.note && <div className="text-gray-500 mt-1 italic">{a.note}</div>}
                  </div>
                </label>
              ))
            ) : (
              <div className="text-sm text-gray-500">Chưa có địa chỉ. Vui lòng thêm trong mục Hồ sơ → Địa chỉ.</div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" className="cursor-pointer" onClick={() => navigate('/profile-manager?section=address')}>Quản lý địa chỉ</Button>
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


