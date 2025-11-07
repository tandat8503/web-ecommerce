import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "@/lib/utils";
import useCartStore from "@/stores/cartStore";
import { getAddresses } from "@/api/address";
import { createOrder } from "@/api/orders";
import { createMoMoPayment } from "@/api/payment";

/**
 * ========================================
 * USE CHECKOUT HOOK - XỬ LÝ LOGIC CHECKOUT ✨
 * =======================================
 * 
 * Hook này chứa TẤT CẢ logic cho trang Checkout
 * Component Checkout.jsx chỉ cần import và sử dụng
 */
export function useCheckout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { items: cartItems, fetchCart, loading: cartLoading } = useCartStore();

  // =======================
  // STATE
  // =======================
  const [addresses, setAddresses] = useState([]); //danh sách địa chỉ từ API getAddresses()
  const [addressId, setAddressId] = useState(""); //id địa chỉ được chọn
  const [selectedAddress, setSelectedAddress] = useState(null); //địa chỉ được chọn
  const [paymentMethod, setPaymentMethod] = useState("COD"); //phương thức thanh toán
  const [customerNote, setCustomerNote] = useState(""); //ghi chú cho người bán
  const [submitting, setSubmitting] = useState(false); //trạng thái đang đặt hàng
  const [openAddressDialog, setOpenAddressDialog] = useState(false); //trạng thái mở dialog chọn địa chỉ
  const [selectedItemIds, setSelectedItemIds] = useState([]); //Danh sách ID cart item được chọn (nhận từ query ?selected=1,2 ở trang Giỏ hàng)

  // =======================
  // EFFECTS
  // =======================
  
  // Fetch giỏ hàng khi component mount
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

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
        const all = Array.isArray(res.data?.addresses) ? res.data.addresses : []; //lấy mảng addresses từ response
        setAddresses(all);
        if (all.length) {
          const defaultAddress = all.find((a) => a.isDefault) || all[0]; //tìm địa chỉ mặc định, không có thì chọn phần tử đầu tiên
          setAddressId(String(defaultAddress.id)); //set id địa chỉ được chọn
          setSelectedAddress(defaultAddress); //set địa chỉ được chọn
        }
      } catch {
        setAddresses([]); //nếu lỗi thì set mảng addresses trống
      }
    };
    fetchAddresses(); //gọi hàm fetchAddresses để tải toàn bộ địa chỉ
  }, []);

  // B3 - Đồng bộ addressId -> selectedAddress để phần header hiển thị đúng
  useEffect(() => {
    if (!addressId) return;
    const found = addresses.find((a) => String(a.id) === String(addressId));
    if (found) setSelectedAddress(found);
  }, [addressId, addresses]);

  // =======================
  // COMPUTED VALUES
  // =======================
  
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

  // =======================
  // HANDLERS
  // =======================
  
  /**
   * Xử lý khi submit form đặt hàng
   */
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

  /**
   * Chuyển đến trang quản lý địa chỉ
   */
  const handleManageAddress = () => {
    navigate('/profile-manager?section=address');
  };

  // =======================
  // RETURN
  // =======================
  return {
    // State
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
    
    // Setters
    setAddressId,
    setPaymentMethod,
    setCustomerNote,
    setOpenAddressDialog,
    
    // Handlers
    onSubmit,
    handleManageAddress,
  };
}

