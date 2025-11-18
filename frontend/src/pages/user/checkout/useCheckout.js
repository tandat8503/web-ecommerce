import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "@/lib/utils";
import useCartStore from "@/stores/cartStore";
import { getAddresses, addAddress } from "@/api/address";
import { createOrder } from "@/api/orders";
import { useVietnamesePlaces } from "@/hooks/useVietnamesePlaces";
import { createMoMoPayment } from "@/api/payment";

/**
 * ========================================
 * CHECKOUT HOOK - Logic đặt hàng đơn giản ✨
 * ========================================
 */
export function useCheckout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { items: cartItems, fetchCart } = useCartStore();

  // 📦 STATE CƠ BẢN
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [customerNote, setCustomerNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 🏠 STATE FORM ĐỊA CHỈ (chỉ hiện khi chưa có địa chỉ)
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
    fullName: "",
    phone: "",
    streetAddress: "",
    ward: "",
    district: "",
    city: "",
    addressType: "HOME",
    note: "",
  });
  const [selectedCodes, setSelectedCodes] = useState({
    provinceCode: "",
    districtCode: "",
    wardCode: "",
  });
  const [savingAddress, setSavingAddress] = useState(false);

  const { provinces, districts, wards, fetchDistricts, fetchWards } = useVietnamesePlaces();

  // 🛒 Lấy danh sách sản phẩm được chọn từ URL: /checkout?selected=1,2,3
  const selectedCartItemIds = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get("selected");
    if (!raw) return [];
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }, [location.search]);

  const checkoutItems = useMemo(() => {
    if (selectedCartItemIds.length === 0) return cartItems;
    return cartItems.filter((item) => selectedCartItemIds.includes(String(item.id)));
  }, [cartItems, selectedCartItemIds]);

  const summary = useMemo(() => {
    const subtotal = checkoutItems.reduce((sum, item) => {
      const price = Number(item?.final_price ?? item?.product?.price ?? 0);
      return sum + price * item.quantity;
    }, 0);
    return { subtotal, shippingFee: 0, discount: 0, total: subtotal };
  }, [checkoutItems]);

  const selectedAddress = useMemo(() => {
    return addresses.find((a) => a.id === selectedAddressId) || null;
  }, [addresses, selectedAddressId]);

  // 🔄 Tải giỏ hàng
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // 🔄 Tải địa chỉ lần đầu
  const loadAddresses = async () => {
    try {
      const res = await getAddresses();
      const list = res.data?.addresses || [];
      setAddresses(list);

      if (list.length === 0) {
        // ❗ CHƯA CÓ ĐỊA CHỈ → Hiện form nhập ngay
        setShowAddressForm(true);
        setSelectedAddressId(null);
      } else {
        // ✅ CÓ ĐỊA CHỈ → Chọn địa chỉ mặc định
        const defaultAddr = list.find((a) => a.isDefault) || list[0];
        setSelectedAddressId(defaultAddr.id);
        setShowAddressForm(false);
      }
    } catch (error) {
      console.error("Lỗi tải địa chỉ:", error);
      setShowAddressForm(true);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  // 📝 XỬ LÝ FORM ĐỊA CHỈ
  const handleAddressChange = (field, value) => {
    setAddressForm((prev) => ({ ...prev, [field]: value }));
  };
//hàm xử lý thay đổi tỉnh
  const handleProvinceChange = (code) => {
    const province = provinces.find((p) => String(p.code) === code);
    if (!province) return;
    setSelectedCodes({ provinceCode: code, districtCode: "", wardCode: "" });
    setAddressForm((prev) => ({ ...prev, city: province.name, district: "", ward: "" }));
    fetchDistricts(code);
  };
//hàm xử lý thay đổi quận
  const handleDistrictChange = (code) => {
    const district = districts.find((d) => String(d.code) === code);
    if (!district) return;
    setSelectedCodes((prev) => ({ ...prev, districtCode: code, wardCode: "" }));
    setAddressForm((prev) => ({ ...prev, district: district.name, ward: "" }));
    fetchWards(code);
  };
//hàm xử lý thay đổi phường
  const handleWardChange = (code) => {
    const ward = wards.find((w) => String(w.code) === code);
    if (!ward) return;
    setSelectedCodes((prev) => ({ ...prev, wardCode: code }));
    setAddressForm((prev) => ({ ...prev, ward: ward.name }));
  };
//hàm xử lý lưu địa chỉ
  const handleSaveAddress = async () => {
    // Validate
    if (!addressForm.fullName.trim()) return toast.error("Vui lòng nhập họ tên");
    if (!/^0\d{9}$/.test(addressForm.phone.trim())) return toast.error("Số điện thoại không hợp lệ");
    if (!addressForm.city || !addressForm.district || !addressForm.ward) {
      return toast.error("Vui lòng chọn đầy đủ Tỉnh/Quận/Phường");
    }
    if (!addressForm.streetAddress.trim()) return toast.error("Vui lòng nhập địa chỉ cụ thể");

    try {
      setSavingAddress(true);
      const res = await addAddress({
        ...addressForm,
        isDefault: addresses.length === 0, // Địa chỉ đầu tiên = mặc định
      });
      toast.success("Thêm địa chỉ thành công");
      
      // Reload địa chỉ và chọn địa chỉ vừa tạo
      await loadAddresses();
      const newId = res.data?.address?.id;
      if (newId) setSelectedAddressId(newId);
      setShowAddressForm(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể lưu địa chỉ");
    } finally {
      setSavingAddress(false);
    }
  };

  // 🛍️ ĐẶT HÀNG
  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast.error("Vui lòng chọn địa chỉ giao hàng");
      setShowAddressForm(true);
      return;
    }
    if (checkoutItems.length === 0) {
      toast.error("Giỏ hàng trống");
      return;
    }

    try {
      setSubmitting(true);
      const cartItemIds = checkoutItems.map((item) => item.id);
      
      // Tạo order
      const res = await createOrder({
        addressId: selectedAddressId,
        paymentMethod,
        customerNote: customerNote.trim() || undefined,
        cartItemIds,
      });

      await fetchCart();
      const orderId = res.data?.order?.id;

      // Xử lý theo payment method
      if (paymentMethod === 'COD') {
        // COD: Chuyển đến trang success
        toast.success("Đặt hàng thành công!");
        navigate(orderId ? `/order-success?orderId=${orderId}` : "/order-success");
      } else if (paymentMethod === 'MOMO') {
        // MoMo: Tạo payment URL và redirect
        try {
          const response = await createMoMoPayment(orderId);
          const paymentData = response.data;
          if (paymentData?.success && paymentData?.data?.paymentUrl) {
            // Redirect đến MoMo (MoMo sẽ hiển thị QR)
            window.location.href = paymentData.data.paymentUrl;
          } else {
            throw new Error(paymentData?.message || 'Không tạo được payment URL');
          }
        } catch (paymentError) {
          toast.error(paymentError.response?.data?.message || "Không thể tạo thanh toán MoMo");
          // Redirect về trang orders để user có thể thử lại
          navigate('/orders');
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể đặt hàng");
    } finally {
      setSubmitting(false);
    }
  };

  return {
    // Data
    addresses,//danh sách địa chỉ
    selectedAddress,//địa chỉ được chọn
    selectedAddressId,//id địa chỉ được chọn
    checkoutItems,//sản phẩm được chọn
    summary,//tổng tiền
    paymentMethod,//phương thức thanh toán
    customerNote,//ghi chú khách hàng
    submitting,//trạng thái đang đặt hàng

    // Form địa chỉ
    showAddressForm,//hiện form địa chỉ
    addressForm,//form địa chỉ
    selectedCodes,//mã tỉnh, quận, phường
    provinces,//danh sách tỉnh
    districts,//danh sách quận
    wards,//danh sách phường
    savingAddress,//trạng thái đang lưu địa chỉ

    // Actions
    setSelectedAddressId,//set id địa chỉ được chọn
    setPaymentMethod,//set phương thức thanh toán
    setCustomerNote,//set ghi chú khách hàng
    handleAddressChange,//xử lý thay đổi địa chỉ
    handleProvinceChange,//xử lý thay đổi tỉnh
    handleDistrictChange,//xử lý thay đổi quận
    handleWardChange,//xử lý thay đổi phường
    handleSaveAddress,//xử lý lưu địa chỉ
    handlePlaceOrder,//xử lý đặt hàng
    setShowAddressForm,//set hiện form địa chỉ
  };
}
