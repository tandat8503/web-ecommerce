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
 * Sử dụng kích thước thực tế từ product_variant (width, depth, height)
 * 
 * Logic:
 * - Lấy kích thước lớn nhất cho mỗi chiều khi có nhiều sản phẩm
 * - GHN yêu cầu: length >= width >= height
 * - Chuyển đổi từ mm (trong DB) sang cm (GHN yêu cầu)
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

    // ✅ Sử dụng kích thước từ product_variant nếu có
    const variant = item.variant;
    if (variant) {
      // Chuyển đổi từ mm sang cm
      // variant.width = chiều rộng (mm) → dùng làm length (chiều dài)
      // variant.depth = chiều sâu (mm) → dùng làm width (chiều rộng)
      // variant.height = chiều cao (mm) → dùng làm height (chiều cao)
      const lengthCm = mmToCm(variant.width);
      const widthCm = mmToCm(variant.depth);
      const heightCm = mmToCm(variant.height);
      
      // Lấy kích thước lớn nhất cho mỗi chiều (khi có nhiều sản phẩm)
      if (lengthCm) metrics.length = Math.max(metrics.length, lengthCm);
      if (widthCm) metrics.width = Math.max(metrics.width, widthCm);
      if (heightCm) metrics.height = Math.max(metrics.height, heightCm);
    }
  });

  if (metrics.weight === 0) {
    metrics.weight = DEFAULT_WEIGHT_PER_ITEM;
  }

  // GHN giới hạn 30kg cho dịch vụ chuẩn
  metrics.weight = Math.min(metrics.weight, 30000);

  // Đảm bảo length >= width >= height (yêu cầu của GHN)
  const dimensions = [metrics.length, metrics.width, metrics.height].sort((a, b) => b - a);
  metrics.length = dimensions[0];
  metrics.width = dimensions[1];
  metrics.height = dimensions[2];

  return metrics;
};

/**
 * ========================================
 * CHECKOUT HOOK - Logic đặt hàng đơn giản ✨
 * ========================================
 */
export function useCheckout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { items: cartItems, fetchCart, updateCartItem: updateCartItemStore, removeFromCart: removeFromCartStore } = useCartStore();
  const [updatingQuantity, setUpdatingQuantity] = useState(false);
  const [removingItem, setRemovingItem] = useState(null);

  // 📦 STATE CƠ BẢN
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [customerNote, setCustomerNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [shippingFee, setShippingFee] = useState(0);
  const [shippingFeeLoading, setShippingFeeLoading] = useState(false);
  const [shippingFeeError, setShippingFeeError] = useState(null);

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

  const { provinces, districts, wards, fetchDistricts, fetchWards } = useGHNPlaces();

  // 🛒 Lấy danh sách sản phẩm được chọn từ URL: /checkout?selected=1,2,3
  // Nếu không có selected trong URL → không lấy gì (tránh lấy tất cả giỏ hàng)
  const selectedCartItemIds = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get("selected");
    if (!raw) return [];
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }, [location.search]);

  const checkoutItems = useMemo(() => {
    // Nếu có selected trong URL → CHỈ lấy những items đó (trường hợp "Mua ngay")
    // Đây là trường hợp quan trọng: chỉ lấy sản phẩm được chọn, không lấy toàn bộ giỏ hàng
    if (selectedCartItemIds.length > 0) {
      return cartItems.filter((item) => selectedCartItemIds.includes(String(item.id)));
    }
    // Nếu không có selected → lấy tất cả giỏ hàng (trường hợp từ giỏ hàng bấm "Thanh toán")
    // Vì đã bỏ select rồi nên khi bấm "Thanh toán" sẽ lấy tất cả
    return cartItems;
  }, [cartItems, selectedCartItemIds]);

  const summary = useMemo(() => {
    const subtotal = checkoutItems.reduce((sum, item) => {
      const price = Number(item?.final_price ?? item?.product?.price ?? 0);
      return sum + price * item.quantity;
    }, 0);
    const fee = Number(shippingFee) || 0;
    return { subtotal, shippingFee: fee, discount: 0, total: subtotal + fee };
  }, [checkoutItems, shippingFee]);

  const selectedAddress = useMemo(() => {
    const addr = addresses.find((a) => a.id === selectedAddressId) || null;
    
    // Debug: Log địa chỉ để kiểm tra có mã GHN không - chỉ log trong development
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

  useEffect(() => {
    if (!canCalculateShipping) {
      setShippingFee(0);
      
      // Thông báo chi tiết hơn về lý do không thể tính phí
      if (selectedAddress && checkoutItems.length > 0) {
        const missingFields = [];
        if (!selectedAddress.districtId) missingFields.push('districtId');
        if (!selectedAddress.wardCode) missingFields.push('wardCode');
        
      // Log để debug - chỉ log trong development
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

  // 🔄 Tải giỏ hàng và địa chỉ
  useEffect(() => {
    const loadData = async () => {
      await fetchCart(); // Đảm bảo cart được load trước
    };
    loadData();
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
  // ✅ Đồng bộ logic với useAddress.js - Xử lý thay đổi tỉnh/quận/phường
  const handleProvinceChange = (code) => {
    const province = provinces.find(
      (p) => String(p.code) === code || String(p.ProvinceID) === code
    );
    if (!province) return;
    const provinceCode = String(province.code || province.ProvinceID);
    const provinceName = province.name || province.ProvinceName;
    
    // Reset districts và wards khi đổi tỉnh
    setSelectedCodes({ provinceCode, districtCode: "", wardCode: "" });
    setAddressForm((prev) => ({ ...prev, city: provinceName, district: "", ward: "" }));
    
    // Load quận/huyện của tỉnh này
    fetchDistricts(provinceCode);
  };

  const handleDistrictChange = (code) => {
    const district = districts.find(
      (d) => String(d.code) === code || String(d.DistrictID) === code
    );
    if (!district) return;
    const districtCode = String(district.code || district.DistrictID);
    const districtName = district.name || district.DistrictName;
    
    // Reset wards khi đổi quận
    setSelectedCodes((prev) => ({ ...prev, districtCode, wardCode: "" }));
    setAddressForm((prev) => ({ ...prev, district: districtName, ward: "" }));
    
    // Load phường/xã của quận này
    fetchWards(districtCode);
  };

  const handleWardChange = (code) => {
    const ward = wards.find(
      (w) => String(w.code) === code || String(w.WardCode) === code
    );
    if (!ward) return;
    const wardName = ward.name || ward.WardName;
    const wardCodeValue = String(ward.code || ward.WardCode);
    
    // Lưu mã ward (WardCode từ GHN là string)
    setSelectedCodes((prev) => ({ ...prev, wardCode: wardCodeValue }));
    setAddressForm((prev) => ({ ...prev, ward: wardName }));
  };
  //hàm xử lý lưu địa chỉ - Đồng bộ với useAddress.js
  const handleSaveAddress = async () => {
    // Validate
    if (!addressForm.fullName.trim()) return toast.error("Vui lòng nhập họ tên");
    if (!/^0\d{9}$/.test(addressForm.phone.trim())) return toast.error("Số điện thoại không hợp lệ");
    if (!addressForm.city || !addressForm.district || !addressForm.ward) {
      return toast.error("Vui lòng chọn đầy đủ Tỉnh/Quận/Phường");
    }
    if (!addressForm.streetAddress.trim()) return toast.error("Vui lòng nhập địa chỉ cụ thể");

    // Kiểm tra đã chọn đầy đủ mã GHN
    if (!selectedCodes.provinceCode || !selectedCodes.districtCode || !selectedCodes.wardCode) {
      return toast.error("Vui lòng chọn lại Tỉnh/Quận/Phường từ dropdown để có mã GHN");
    }

    try {
      setSavingAddress(true);
      
      // ✅ Đồng bộ logic với useAddress.js - Lưu mã GHN đúng cách
      const addressData = {
        ...addressForm,
        addressType: addressForm.addressType?.toUpperCase() || "HOME",
        isDefault: addresses.length === 0, // Địa chỉ đầu tiên = mặc định
        // ✅ Lưu mã GHN từ selectedCodes (giống useAddress.js)
        provinceId: selectedCodes.provinceCode ? Number(selectedCodes.provinceCode) : null,
        districtId: selectedCodes.districtCode ? Number(selectedCodes.districtCode) : null,
        wardCode: selectedCodes.wardCode || null,
      };

      // Log để debug - chỉ log trong development
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

  // 🛍️ CẬP NHẬT SỐ LƯỢNG SẢN PHẨM
  const handleUpdateQuantity = async (cartItemId, newQuantity) => {
    if (newQuantity < 1) {
      toast.error("Số lượng phải lớn hơn 0");
      return;
    }

    try {
      setUpdatingQuantity(true);
      await updateCartItemStore({ cartItemId, quantity: newQuantity });
      await fetchCart(); // Reload cart để cập nhật checkoutItems
      // Phí vận chuyển sẽ tự động được tính lại nhờ useEffect phụ thuộc vào checkoutItems
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể cập nhật số lượng");
    } finally {
      setUpdatingQuantity(false);
    }
  };

  // 🗑️ XÓA SẢN PHẨM KHỎI CHECKOUT
  const handleRemoveItem = async (cartItemId) => {
    try {
      setRemovingItem(cartItemId);
      await removeFromCartStore(cartItemId);
      await fetchCart(); // Reload cart để cập nhật checkoutItems
      
      // Nếu không còn sản phẩm nào, chuyển về trang giỏ hàng
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

  // 🛍️ ĐẶT HÀNG
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
      } else if (paymentMethod === 'VNPAY') {
        // VNPay: Tạo payment URL và redirect
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
          // Error đã được xử lý trong handleVNPayPayment
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
    addresses,//danh sách địa chỉ
    selectedAddress,//địa chỉ được chọn
    selectedAddressId,//id địa chỉ được chọn
    checkoutItems,//sản phẩm được chọn
    summary,//tổng tiền
    shippingFee,
    shippingFeeLoading,
    shippingFeeError,
    canCalculateShipping,
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
    handleUpdateQuantity,//cập nhật số lượng sản phẩm
    handleRemoveItem,//xóa sản phẩm
    updatingQuantity,//trạng thái đang cập nhật số lượng
    removingItem,//id sản phẩm đang xóa
    handlePlaceOrder,//xử lý đặt hàng
    setShowAddressForm,//set hiện form địa chỉ
  };
}
