import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "@/lib/utils";
import useCartStore from "@/stores/cartStore";
import { getAddresses, addAddress } from "@/api/address";
import { createOrder } from "@/api/orders";
import { useGHNPlaces } from "@/hooks/useGHNPlaces";
import { calculateShippingFee as calculateGHNShippingFee } from "@/api/shipping";
import { createVNPayPayment } from "@/api/payment";
import { handleVNPayPayment } from "@/features/payment/vnpayPayment";
import axiosClient from "@/api/axiosClient";

const DEFAULT_SHIPPING_FEE = 30000;
const DEFAULT_WEIGHT_PER_ITEM = 500; // gram
const DEFAULT_DIMENSION_CM = 30;

const mmToCm = (value) => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return null;
  return Math.max(DEFAULT_DIMENSION_CM, Math.ceil(parsed / 10));
};

/**
 * Tính toán metrics vận chuyển từ danh sách items
 */
const buildShippingMetrics = (items) => {
  const metrics = {
    weight: 0,
    length: DEFAULT_DIMENSION_CM,
    width: DEFAULT_DIMENSION_CM,
    height: DEFAULT_DIMENSION_CM,
  };

  items.forEach((item) => {
    const quantity = item.quantity || 1;
    metrics.weight += DEFAULT_WEIGHT_PER_ITEM * quantity;

    const variant = item.variant;
    if (variant) {
      const lengthCm = mmToCm(variant.width);
      const widthCm = mmToCm(variant.depth);
      const heightCm = mmToCm(variant.height);

      if (lengthCm) metrics.length = Math.max(metrics.length, lengthCm);
      if (widthCm) metrics.width = Math.max(metrics.width, widthCm);
      if (heightCm) metrics.height = Math.max(metrics.height, heightCm);
    }
  });

  if (metrics.weight === 0) {
    metrics.weight = DEFAULT_WEIGHT_PER_ITEM;
  }

  metrics.weight = Math.min(metrics.weight, 30000);

  const dimensions = [metrics.length, metrics.width, metrics.height].sort((a, b) => b - a);
  metrics.length = dimensions[0];
  metrics.width = dimensions[1];
  metrics.height = dimensions[2];

  return metrics;
};

/**
 * CHECKOUT HOOK - Logic đặt hàng với coupon
 */
export function useCheckout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { items: cartItems, fetchCart, updateCartItem: updateCartItemStore, removeFromCart: removeFromCartStore } = useCartStore();
  const [updatingQuantity, setUpdatingQuantity] = useState(false);
  const [removingItem, setRemovingItem] = useState(null);

  // STATE CƠ BẢN
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [customerNote, setCustomerNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [shippingFee, setShippingFee] = useState(0);
  const [shippingFeeLoading, setShippingFeeLoading] = useState(false);
  const [shippingFeeError, setShippingFeeError] = useState(null);

  // 🎟️ STATE COUPON
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState(null);
  const [userCoupons, setUserCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  // STATE FORM ĐỊA CHỈ
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

  const { provinces, districts, wards, fetchDistricts, fetchWards } = useGHNPlaces();

  const selectedCartItemIds = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get("selected");
    if (!raw) return [];
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }, [location.search]);

  const checkoutItems = useMemo(() => {
    if (selectedCartItemIds.length > 0) {
      return cartItems.filter((item) => selectedCartItemIds.includes(String(item.id)));
    }
    return cartItems;
  }, [cartItems, selectedCartItemIds]);

  const summary = useMemo(() => {
    const subtotal = checkoutItems.reduce((sum, item) => {
      const price = Number(item?.final_price ?? item?.product?.price ?? 0);
      return sum + price * item.quantity;
    }, 0);

    const fee = Number(shippingFee) || 0;
    let discountAmount = 0;
    let discountShipping = 0;

    if (appliedCoupon) {
      discountAmount = Number(appliedCoupon.discountAmount) || 0;
      discountShipping = Number(appliedCoupon.discountShipping) || 0;
    }

    const finalShippingFee = Math.max(0, fee - discountShipping);
    const total = subtotal + finalShippingFee - discountAmount;

    return {
      subtotal,
      shippingFee: fee,
      finalShippingFee,
      discountAmount,
      discountShipping,
      totalDiscount: discountAmount + discountShipping,
      total: Math.max(0, total)
    };
  }, [checkoutItems, shippingFee, appliedCoupon]);

  const selectedAddress = useMemo(() => {
    const addr = addresses.find((a) => a.id === selectedAddressId) || null;

    if (addr && process.env.NODE_ENV === 'development') {
      console.log('🔍 Selected Address:', {
        id: addr.id,
        city: addr.city,
        district: addr.district,
        ward: addr.ward,
        provinceId: addr.provinceId,
        districtId: addr.districtId,
        wardCode: addr.wardCode,
        hasGHNCodes: Boolean(addr.districtId && addr.wardCode)
      });
    }

    return addr;
  }, [addresses, selectedAddressId]);

  const canCalculateShipping =
    Boolean(selectedAddress?.districtId && selectedAddress?.wardCode) &&
    checkoutItems.length > 0;

  // 🎟️ FETCH USER COUPONS
  const fetchUserCoupons = async () => {
    try {
      setLoadingCoupons(true);
      const response = await axiosClient.get("/coupons/my-coupons?status=available");

      if (response.data.success) {
        setUserCoupons(response.data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch user coupons:", error);
      setUserCoupons([]);
    } finally {
      setLoadingCoupons(false);
    }
  };

  // 🎟️ APPLY SELECTED COUPON
  const handleApplyCoupon = async (selectedCouponCode) => {
    if (!selectedCouponCode) {
      handleRemoveCoupon();
      return;
    }

    try {
      setValidatingCoupon(true);
      setCouponError(null);

      const response = await axiosClient.post("/coupons/validate", {
        couponCode: selectedCouponCode,
        subtotal: summary.subtotal,
        shippingFee: shippingFee
      });

      if (response.data.success) {
        setAppliedCoupon(response.data.data);
        setCouponCode(selectedCouponCode);
        toast.success(`Áp dụng mã ${selectedCouponCode} thành công!`);
      }
    } catch (error) {
      const message = error.response?.data?.message || "Mã giảm giá không hợp lệ";
      setCouponError(message);
      toast.error(message);
      setAppliedCoupon(null);
      setCouponCode("");
    } finally {
      setValidatingCoupon(false);
    }
  };

  // 🎟️ XÓA COUPON
  const handleRemoveCoupon = () => {
    setCouponCode("");
    setAppliedCoupon(null);
    setCouponError(null);
    toast.info("Đã xóa mã giảm giá");
  };

  useEffect(() => {
    if (!canCalculateShipping) {
      setShippingFee(0);

      if (selectedAddress && checkoutItems.length > 0) {
        const missingFields = [];
        if (!selectedAddress.districtId) missingFields.push('districtId');
        if (!selectedAddress.wardCode) missingFields.push('wardCode');

        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Không thể tính phí vận chuyển vì thiếu mã GHN:', {
            addressId: selectedAddress.id,
            address: `${selectedAddress.streetAddress}, ${selectedAddress.ward}, ${selectedAddress.district}, ${selectedAddress.city}`,
            missingFields,
            districtId: selectedAddress.districtId,
            wardCode: selectedAddress.wardCode,
          });
        }

        setShippingFeeError(
          `Địa chỉ chưa có mã GHN (thiếu: ${missingFields.join(', ')}). Vui lòng vào "Hồ sơ" → "Địa chỉ" → "Sửa" địa chỉ này để cập nhật.`
        );
      } else {
        setShippingFeeError(null);
      }

      setShippingFeeLoading(false);
      return;
    }

    let cancelled = false;
    const fetchShippingFee = async () => {
      try {
        setShippingFeeLoading(true);
        setShippingFeeError(null);
        const metrics = buildShippingMetrics(checkoutItems);

        const response = await calculateGHNShippingFee({
          toDistrictId: selectedAddress.districtId,
          toWardCode: selectedAddress.wardCode,
          weight: metrics.weight,
          length: metrics.length,
          width: metrics.width,
          height: metrics.height,
          serviceTypeId: 2,
        });

        if (cancelled) return;

        if (response.data?.success) {
          const data = response.data.data || response.data;
          const fee =
            data.shippingFee ??
            data.totalFee ??
            data.serviceFee ??
            0;
          setShippingFee(Number(fee) || 0);
        } else {
          const fallbackFee = Number(response.data?.shippingFee ?? DEFAULT_SHIPPING_FEE);
          setShippingFee(fallbackFee);
          setShippingFeeError(response.data?.message || "Không tính được phí vận chuyển. Dùng phí mặc định.");
        }
      } catch (error) {
        if (cancelled) return;
        setShippingFee(DEFAULT_SHIPPING_FEE);
        setShippingFeeError(error.response?.data?.message || "Không tính được phí vận chuyển. Đã áp dụng phí mặc định.");
      } finally {
        if (!cancelled) {
          setShippingFeeLoading(false);
        }
      }
    };

    fetchShippingFee();
    return () => {
      cancelled = true;
    };
  }, [
    selectedAddress?.districtId,
    selectedAddress?.wardCode,
    checkoutItems,
    canCalculateShipping,
  ]);

  useEffect(() => {
    const loadData = async () => {
      await fetchCart();
    };
    loadData();
  }, [fetchCart]);

  const loadAddresses = async () => {
    try {
      const res = await getAddresses();
      const list = res.data?.addresses || [];
      setAddresses(list);

      if (list.length === 0) {
        setShowAddressForm(true);
        setSelectedAddressId(null);
      } else {
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
    fetchUserCoupons(); // Fetch user coupons khi component mount
  }, []);

  const handleAddressChange = (field, value) => {
    setAddressForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleProvinceChange = (code) => {
    const province = provinces.find(
      (p) => String(p.code) === code || String(p.ProvinceID) === code
    );
    if (!province) return;
    const provinceCode = String(province.code || province.ProvinceID);
    const provinceName = province.name || province.ProvinceName;

    setSelectedCodes({ provinceCode, districtCode: "", wardCode: "" });
    setAddressForm((prev) => ({ ...prev, city: provinceName, district: "", ward: "" }));

    fetchDistricts(provinceCode);
  };

  const handleDistrictChange = (code) => {
    const district = districts.find(
      (d) => String(d.code) === code || String(d.DistrictID) === code
    );
    if (!district) return;
    const districtCode = String(district.code || district.DistrictID);
    const districtName = district.name || district.DistrictName;

    setSelectedCodes((prev) => ({ ...prev, districtCode, wardCode: "" }));
    setAddressForm((prev) => ({ ...prev, district: districtName, ward: "" }));

    fetchWards(districtCode);
  };

  const handleWardChange = (code) => {
    const ward = wards.find(
      (w) => String(w.code) === code || String(w.WardCode) === code
    );
    if (!ward) return;
    const wardName = ward.name || ward.WardName;
    const wardCodeValue = String(ward.code || ward.WardCode);

    setSelectedCodes((prev) => ({ ...prev, wardCode: wardCodeValue }));
    setAddressForm((prev) => ({ ...prev, ward: wardName }));
  };

  const handleSaveAddress = async () => {
    if (!addressForm.fullName.trim()) return toast.error("Vui lòng nhập họ tên");
    if (!/^0\d{9}$/.test(addressForm.phone.trim())) return toast.error("Số điện thoại không hợp lệ");
    if (!addressForm.city || !addressForm.district || !addressForm.ward) {
      return toast.error("Vui lòng chọn đầy đủ Tỉnh/Quận/Phường");
    }
    if (!addressForm.streetAddress.trim()) return toast.error("Vui lòng nhập địa chỉ cụ thể");

    if (!selectedCodes.provinceCode || !selectedCodes.districtCode || !selectedCodes.wardCode) {
      return toast.error("Vui lòng chọn lại Tỉnh/Quận/Phường từ dropdown để có mã GHN");
    }

    try {
      setSavingAddress(true);

      const addressData = {
        ...addressForm,
        addressType: addressForm.addressType?.toUpperCase() || "HOME",
        isDefault: addresses.length === 0,
        provinceId: selectedCodes.provinceCode ? Number(selectedCodes.provinceCode) : null,
        districtId: selectedCodes.districtCode ? Number(selectedCodes.districtCode) : null,
        wardCode: selectedCodes.wardCode || null,
      };

      if (process.env.NODE_ENV === 'development') {
        console.log('💾 Lưu địa chỉ với mã GHN:', {
          city: addressForm.city,
          district: addressForm.district,
          ward: addressForm.ward,
          provinceId: addressData.provinceId,
          districtId: addressData.districtId,
          wardCode: addressData.wardCode,
        });
      }

      const res = await addAddress(addressData);
      toast.success("Thêm địa chỉ thành công");

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

  const handleUpdateQuantity = async (cartItemId, newQuantity) => {
    if (newQuantity < 1) {
      toast.error("Số lượng phải lớn hơn 0");
      return;
    }

    try {
      setUpdatingQuantity(true);
      await updateCartItemStore({ cartItemId, quantity: newQuantity });
      await fetchCart();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể cập nhật số lượng");
    } finally {
      setUpdatingQuantity(false);
    }
  };

  const handleRemoveItem = async (cartItemId) => {
    try {
      setRemovingItem(cartItemId);
      await removeFromCartStore(cartItemId);
      await fetchCart();

      const remainingItems = checkoutItems.filter(item => item.id !== cartItemId);
      if (remainingItems.length === 0) {
        toast.info("Đã xóa tất cả sản phẩm. Chuyển về giỏ hàng...");
        setTimeout(() => {
          navigate("/cart");
        }, 1000);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể xóa sản phẩm");
    } finally {
      setRemovingItem(null);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast.error("Vui lòng chọn địa chỉ giao hàng");
      setShowAddressForm(true);
      return;
    }
    if (checkoutItems.length === 0) {
      toast.error("Không có sản phẩm nào được chọn. Vui lòng quay lại giỏ hàng.");
      return;
    }

    try {
      setSubmitting(true);
      const cartItemIds = checkoutItems.map((item) => item.id);

      // Tạo order với coupon (nếu có)
      const orderData = {
        addressId: selectedAddressId,
        paymentMethod,
        customerNote: customerNote.trim() || undefined,
        cartItemIds,
      };

      // Thêm couponCode nếu đã apply
      if (appliedCoupon) {
        orderData.couponCode = appliedCoupon.code;
      }

      const res = await createOrder(orderData);

      await fetchCart();
      const orderId = res.data?.order?.id;

      if (paymentMethod === 'COD') {
        toast.success("Đặt hàng thành công!");
        navigate(orderId ? `/order-success?orderId=${orderId}` : "/order-success");
      } else if (paymentMethod === 'VNPAY') {
        try {
          await handleVNPayPayment(
            orderId,
            createVNPayPayment,
            (errorMessage) => {
              toast.error(errorMessage);
              navigate('/orders');
            }
          );
        } catch (paymentError) {
          console.error('VNPay payment error:', paymentError);
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
    addresses,
    selectedAddress,
    selectedAddressId,
    checkoutItems,
    summary,
    shippingFee,
    shippingFeeLoading,
    shippingFeeError,
    canCalculateShipping,
    paymentMethod,
    customerNote,
    submitting,

    // Coupon
    couponCode,
    appliedCoupon,
    validatingCoupon,
    couponError,
    userCoupons,
    loadingCoupons,

    // Form địa chỉ
    showAddressForm,
    addressForm,
    selectedCodes,
    provinces,
    districts,
    wards,
    savingAddress,

    // Actions
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
  };
}
