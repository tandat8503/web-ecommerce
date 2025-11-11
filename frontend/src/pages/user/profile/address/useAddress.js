import { useState, useEffect, useCallback } from "react";
import { toast } from "@/lib/utils";
import { getAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress } from "@/api/address";
import { useVietnamesePlaces } from "@/hooks/useVietnamesePlaces";

// ========== CONSTANTS ==========
// Giá trị mặc định của form khi tạo địa chỉ mới
const INIT_FORM = {
  fullName: "",           // Họ và tên người nhận
  phone: "",              // Số điện thoại
  streetAddress: "",      // Địa chỉ cụ thể (số nhà, tên đường)
  ward: "",               // Phường/Xã
  district: "",           // Quận/Huyện
  city: "",               // Tỉnh/Thành phố
  addressType: "home",    // Loại địa chỉ: "home" (nhà riêng) hoặc "office" (văn phòng)
  isDefault: false,       // Có phải địa chỉ mặc định không
  note: ""                // Ghi chú thêm
};

/**
 * Custom hook quản lý toàn bộ logic cho trang quản lý địa chỉ
 * Bao gồm: lấy danh sách, thêm, sửa, xóa, đặt mặc định địa chỉ
 * 
 * @param {boolean} isActive - Component có đang được hiển thị không
 * @returns {Object} Object chứa:
 *   - State: addresses, loading, open, editing, form, selectedCodes, provinces, districts, wards
 *   - Handlers: handleSubmit, handleDelete, handleSetDefault, edit, handleProvinceChange, ...
 */
export function useAddress(isActive = true) {
  // ========== STATE MANAGEMENT ==========
  
  // Danh sách tất cả địa chỉ của user
  const [addresses, setAddresses] = useState([]);
  
  // Trạng thái loading khi đang gọi API (thêm/sửa/xóa/tải danh sách)
  const [loading, setLoading] = useState(false);
  
  // Trạng thái mở/đóng Dialog form thêm/sửa địa chỉ
  const [open, setOpen] = useState(false);
  
  // Địa chỉ đang được sửa (null = đang thêm mới, có giá trị = đang sửa)
  const [editing, setEditing] = useState(null);
  
  // Dữ liệu form hiện tại (dùng để truyền vào AddressForm component)
  const [form, setForm] = useState(INIT_FORM);
  
  // Mã code của Tỉnh/Quận/Phường đã chọn (dùng để hiển thị trong dropdown)
  // Lưu code thay vì tên vì dropdown cần code để map với API, lấy useVietnamesePlaces
  const [selectedCodes, setSelectedCodes] = useState({
    provinceCode: "",   // Mã tỉnh/thành phố 
    districtCode: "",   // Mã quận/huyện
    wardCode: ""        // Mã phường/xã
  });

  // Hook quản lý danh sách Tỉnh/Quận/Phường từ API useVietnamesePlaces
  // 
  // API: https://provinces.open-api.vn/api
  // API này trả về dữ liệu có CẢ name VÀ code:
  // 
  // provinces = [
  //   { code: "79", name: "Thành phố Hồ Chí Minh" },
  //   { code: "01", name: "Thành phố Hà Nội" },
  //   ...
  // ]
  // 
  // districts = [
  //   { code: "760", name: "Quận 1" },
  //   { code: "761", name: "Quận 2" },
  //   ...
  // ]
  // 
  // wards = [
  //   { code: "26734", name: "Phường Bến Nghé" },
  //   { code: "26737", name: "Phường Đa Kao" },
  //   ...
  // ]
  // 
  // KHÁC BIỆT QUAN TRỌNG:
  // - API tỉnh/quận/huyện: Có CẢ { code, name } ✅
  // - Database của user: CHỈ lưu name (không lưu code) ❌
  // - Dropdown cần: code để map giá trị đã chọn
  // - Nên khi edit: Phải tìm lại code từ name trong danh sách provinces/districts/wards
  const { provinces, districts, wards, fetchDistricts, fetchWards } = useVietnamesePlaces();

  // ========== API CALLS ==========
  
  /**
   * Lấy danh sách tất cả địa chỉ của user từ server
   * Gọi API GET /addresses để lấy danh sách
   * Sau khi lấy thành công, cập nhật state addresses
   */
  const loadAddresses = useCallback(async () => {
    try {
      setLoading(true); // Bật loading để hiển thị spinner
      const { data } = await getAddresses(); // Gọi API
      setAddresses(data.addresses || []); // Lưu danh sách vào state
    } catch {
      // Nếu có lỗi, chỉ hiển thị thông báo khi component đang active
      if (isActive) {
        toast.error(" Không thể tải địa chỉ");
      }
    } finally {
      setLoading(false); // Tắt loading dù thành công hay thất bại
    }
  }, [isActive]);

  // ========== EFFECT HOOKS ==========
  
  // Tự động load danh sách địa chỉ khi component được hiển thị
  // Chỉ gọi API khi isActive = true (component đang được hiển thị)
  useEffect(() => {
    if (isActive) {
      loadAddresses();
    }
  }, [isActive, loadAddresses]);

  /**
   * Reset form về trạng thái ban đầu (rỗng)
   * Dùng khi:
   * - Đóng dialog form
   * - Sau khi submit thành công
   * - Khi bắt đầu thêm địa chỉ mới
   */
  const reset = () => {
    setEditing(null); // Không còn địa chỉ nào đang được sửa
    setForm(INIT_FORM); // Reset form về giá trị mặc định
    setSelectedCodes({ provinceCode: "", districtCode: "", wardCode: "" }); // Reset các dropdown về rỗng
  };

  /**
   * Xử lý khi user submit form (nhấn nút "Thêm" hoặc "Cập nhật")
   * 
   * @param {Object} formData - Dữ liệu từ form (fullName, phone, city, district, ward, ...)
   * 
   * Flow:
   * 1. Convert addressType từ "home"/"office" sang "HOME"/"OFFICE" (backend yêu cầu)
   * 2. Kiểm tra đang edit hay thêm mới:
   *    - Nếu editing có giá trị → Gọi API UPDATE
   *    - Nếu editing = null → Gọi API ADD
   * 3. Nếu thành công: Đóng dialog, reset form, reload danh sách
   * 4. Nếu lỗi: Hiển thị thông báo lỗi
   */
  const handleSubmit = async (formData) => {
    try {
      setLoading(true);
      
      // Backend yêu cầu addressType phải là chữ HOA (HOME, OFFICE)
      // Form trả về "home" hoặc "office" (lowercase)
      // Nên phải convert sang uppercase
      const data = { ...formData, addressType: formData.addressType.toUpperCase() };
      
      // Kiểm tra đang edit hay thêm mới
      if (editing) {
        // Đang sửa: Gọi API PUT /addresses/:id
        await updateAddress(editing.id, data);
      } else {
        // Đang thêm mới: Gọi API POST /addresses
        await addAddress(data);
      }
      
      // Thành công: Hiển thị thông báo, đóng dialog, reset form, reload danh sách
      toast.success(` ${editing ? 'Cập nhật' : 'Thêm'} thành công`);
      setOpen(false); // Đóng dialog
      reset(); // Reset form
      loadAddresses(); // Reload để hiển thị địa chỉ mới/thay đổi
    } catch (error) {
      // Lỗi: Hiển thị message từ server hoặc message mặc định
      toast.error(` ${error.response?.data?.message || 'Lỗi'}`);
    } finally {
      setLoading(false); // Tắt loading
    }
  };

  /**
   * Xóa địa chỉ theo ID
   */
  const handleDelete = async (id) => {
    try {
      await deleteAddress(id); // Gọi API xóa
      toast.success(" Đã xóa");
      loadAddresses(); // Reload danh sách để cập nhật UI
    } catch {
      toast.error(" Không thể xóa");
    }
  };

  /**
   * Đặt một địa chỉ làm mặc định
   * @param {number|string} id - ID của địa chỉ muốn đặt làm mặc định
   */
  const handleSetDefault = async (id) => {
    try {
      await setDefaultAddress(id); // Gọi API đặt mặc định
      toast.success(" Đã đặt mặc định");
      loadAddresses(); // Reload để cập nhật badge "Mặc định" trên UI
    } catch {
      toast.error(" Lỗi");
    }
  };

  /**
   * Mở form để sửa địa chỉ nút sửa
   * 
  
   * ĐỊA CHỈ `addr` CHỨA GÌ? (Dữ liệu từ database của user)
   * addr = {
   *   id: 1,                              // ID địa chỉ
   *   fullName: "Nguyễn Văn A",           // Họ tên
   *   phone: "0123456789",                 // Số điện thoại
   *   city: "Thành phố Hồ Chí Minh",      // ⚠️ CHỈ CÓ TÊN, KHÔNG CÓ MÃ CODE
   *   district: "Quận 1",                 // ⚠️ CHỈ CÓ TÊN, KHÔNG CÓ MÃ CODE
   *   ward: "Phường Bến Nghé",            // ⚠️ CHỈ CÓ TÊN, KHÔNG CÓ MÃ CODE
   *   streetAddress: "123 Đường ABC",     // Địa chỉ cụ thể
   *   addressType: "HOME",                // Loại địa chỉ (BACKEND LƯU CHỮ HOA)
   *   isDefault: true,                     // Có phải mặc định không
   *   note: "Ghi chú"                      // Ghi chú
   * }
   * 
   * API TỈNH/QUẬN/HUYỆN TRẢ VỀ GÌ? (từ https://provinces.open-api.vn/api)
   * provinces = [
   *   { code: "79", name: "Thành phố Hồ Chí Minh" },  // ✅ CÓ CẢ CODE VÀ NAME
   *   { code: "01", name: "Thành phố Hà Nội" },
   *   ...
   * ]
   * 
   * districts = [
   *   { code: "760", name: "Quận 1" },                // ✅ CÓ CẢ CODE VÀ NAME
   *   { code: "761", name: "Quận 2" },
   *   ...
   * ]
   * 
   * wards = [
   *   { code: "26734", name: "Phường Bến Nghé" },      // ✅ CÓ CẢ CODE VÀ NAME
   *   { code: "26737", name: "Phường Đa Kao" },
   *   ...
   * ]
   * 
   * VẤN ĐỀ CẦN GIẢI QUYẾT: 
   * - Database của user chỉ lưu TÊN: "Thành phố Hồ Chí Minh"
   * - Dropdown cần MÃ CODE: "79" để map giá trị đã chọn
   * - API có CẢ name VÀ code
   * - Nên phải TÌM LẠI code từ name trong danh sách provinces/districts/wards
   * FLOW CỤ THỂ:
   * 1. User click nút "Sửa" → gọi edit(addr) với addr chứa TÊN tỉnh/quận/phường
   * 2. Tìm mã tỉnh từ tên tỉnh trong danh sách provinces (đã load sẵn)
   * 3. Load danh sách quận/huyện của tỉnh đó (phải gọi API)
   * 4. Đợi 300ms để state districts cập nhật
   * 5. Tìm mã quận từ tên quận trong danh sách districts (vừa load)
   * 6. Load danh sách phường/xã của quận đó (phải gọi API)
   * 7. Đợi 300ms để state wards cập nhật
   * 8. Tìm mã phường từ tên phường trong danh sách wards (vừa load)
   * 9. Set các mã code vào selectedCodes để dropdown hiển thị đúng
   * 10. Mở dialog form để user sửa
   */
  const edit = async (addr) => {
    // ===== BƯỚC 1: Lưu địa chỉ đang sửa =====
    // Lưu vào state để biết đang sửa địa chỉ nào (có ID để gọi API update)
    setEditing(addr);
    
    // ===== BƯỚC 2: Convert addressType =====
    // Backend lưu "HOME"/"OFFICE" (chữ HOA)
    // Form cần "home"/"office" (chữ thường)
    // Nên phải convert về lowercase
    const formData = { ...addr, addressType: addr.addressType?.toLowerCase() || "home" };
    setForm(formData); // Truyền formData vào AddressForm để hiển thị trong form
    
    // ===== BƯỚC 3: Tìm mã TỈNH từ tên tỉnh =====
    // addr.city = "Thành phố Hồ Chí Minh" (tên từ database)
    // provinces = [{ code: "79", name: "Thành phố Hồ Chí Minh" }, ...] (từ API)
    // Tìm province có name khớp với addr.city để lấy mã code
    const province = provinces.find(p => p.name === addr.city);
    
    if (province) {
      // ===== BƯỚC 4: Set mã tỉnh và load quận/huyện =====
      // Lưu mã tỉnh vào selectedCodes để dropdown hiển thị đúng
      setSelectedCodes(prev => ({ ...prev, provinceCode: String(province.code) }));
      
      // Gọi API load danh sách quận/huyện của tỉnh này
      // fetchDistricts() từ useVietnamesePlaces hook
      // API: https://provinces.open-api.vn/api/p/79?depth=2
      await fetchDistricts(String(province.code));
      
      // ===== BƯỚC 5: Đợi state districts cập nhật =====
      // Sau khi fetchDistricts() xong, state districts sẽ được cập nhật
      // Nhưng React state update là async, không đồng bộ ngay
      // Nên phải đợi 300ms để chắc chắn state đã cập nhật
      setTimeout(() => {
        // Tìm mã QUẬN từ tên quận
        // addr.district = "Quận 1" (tên từ database)
        // districts = [{ code: "760", name: "Quận 1" }, ...] (vừa load từ API)
        const district = districts.find(d => d.name === addr.district);
        
        if (district) {
          // ===== BƯỚC 6: Set mã quận và load phường/xã =====
          // Lưu mã quận vào selectedCodes
          setSelectedCodes(prev => ({ ...prev, districtCode: String(district.code) }));
          
          // Gọi API load danh sách phường/xã của quận này
          // fetchWards() từ useVietnamesePlaces hook
          // API: https://provinces.open-api.vn/api/d/760?depth=2
          fetchWards(String(district.code));
          
          // ===== BƯỚC 7: Đợi state wards cập nhật =====
          setTimeout(() => {
            // Tìm mã PHƯỜNG từ tên phường
            // addr.ward = "Phường Bến Nghé" (tên từ database)
            // wards = [{ code: "26734", name: "Phường Bến Nghé" }, ...] (vừa load từ API)
            const ward = wards.find(w => w.name === addr.ward);
            
            if (ward) {
              // ===== BƯỚC 8: Set mã phường =====
              // Lưu mã phường vào selectedCodes
              // Bây giờ selectedCodes có đầy đủ: provinceCode, districtCode, wardCode
              // Dropdown sẽ hiển thị đúng giá trị đã chọn
              setSelectedCodes(prev => ({ ...prev, wardCode: String(ward.code) }));
            }
          }, 300); // Đợi 300ms để state wards cập nhật
        }
      }, 300); // Đợi 300ms để state districts cập nhật
    }
    
    // ===== BƯỚC 9: Mở dialog form =====
    // Sau khi đã set xong tất cả selectedCodes, mở dialog để user sửa
    setOpen(true);
  };

  // ========== DROPDOWN CASCADE HANDLERS ==========
  // Các hàm này xử lý khi user chọn Tỉnh/Quận/Phường trong dropdown
  // Khi chọn tỉnh → phải load quận, khi chọn quận → phải load phường
  // Và phải reset các dropdown phía sau (chọn tỉnh mới → reset quận và phường)
  
  /**
   * Xử lý khi user chọn Tỉnh/TP trong dropdown
   * 
   * @param {string} value - Mã code của tỉnh đã chọn (ví dụ: "79" cho TP.HCM)
   * 
   * Flow:
   * 1. Tìm tỉnh từ mã code
   * 2. Cập nhật form: set tên tỉnh, reset quận và phường về rỗng
   * 3. Cập nhật selectedCodes: set mã tỉnh, reset mã quận và phường
   * 4. Load danh sách quận/huyện của tỉnh đó
   */
  //xử lý khi user chọn Tỉnh/TP trong dropdown , lấy từ API useVietnamesePlaces
  const handleProvinceChange = (value) => {
    const province = provinces.find(p => String(p.code) === value);//lấy tỉnh từ mã code
    if (province) {
      // Cập nhật form: set tên tỉnh, xóa quận và phường (vì đổi tỉnh mới)
      setForm({ ...form, city: province.name, district: "", ward: "" });
      
      // Cập nhật selectedCodes: set mã tỉnh, reset mã quận và phường lấy từ API useVietnamesePlaces
      setSelectedCodes({ provinceCode: value, districtCode: "", wardCode: "" });
      
      // Load danh sách quận/huyện của tỉnh này
      fetchDistricts(value); //lấy từ API useVietnamesePlaces
    }
  };

  /**
   * Xử lý khi user chọn Quận/Huyện trong dropdown
   * 
   * @param {string} value - Mã code của quận đã chọn
   * 
   * Flow:
   * 1. Tìm quận từ mã code
   * 2. Cập nhật form: set tên quận, reset phường về rỗng
   * 3. Cập nhật selectedCodes: set mã quận, reset mã phường
   * 4. Load danh sách phường/xã của quận đó
   */
  //xử lý khi user chọn Quận/Huyện trong dropdown , lấy từ API useVietnamesePlaces
  const handleDistrictChange = (value) => {
    const district = districts.find(d => String(d.code) === value);
    if (district) {
      // Cập nhật form: set tên quận, xóa phường (vì đổi quận mới)
      setForm({ ...form, district: district.name, ward: "" });
      
      // Cập nhật selectedCodes: set mã quận, reset mã phường
      setSelectedCodes({ ...selectedCodes, districtCode: value, wardCode: "" });
      
      // Load danh sách phường/xã của quận này
      fetchWards(value);
    }
  };

  /**
   * Xử lý khi user chọn Phường/Xã trong dropdown
   * 
   * @param {string} value - Mã code của phường đã chọn
   * 
   * Flow:
   * 1. Tìm phường từ mã code
   * 2. Cập nhật form: set tên phường
   * 3. Cập nhật selectedCodes: set mã phường
   * (Không cần load gì thêm vì phường là cấp cuối cùng)
   */
  const handleWardChange = (value) => {
    const ward = wards.find(w => String(w.code) === value);
    if (ward) {
      // Cập nhật form: set tên phường
      setForm({ ...form, ward: ward.name });
      
      // Cập nhật selectedCodes: set mã phường
      setSelectedCodes({ ...selectedCodes, wardCode: value });
    }
  };

  // ========== FORM HANDLERS ==========
  
  /**
   * Cập nhật giá trị một field trong form
   * 
   * @param {string} field - Tên field cần cập nhật (ví dụ: "fullName", "phone")
   * @param {any} value - Giá trị mới
   * 
   * Dùng khi: User nhập liệu trong form (nhưng hiện tại không dùng vì form dùng Ant Design tự quản lý)
   */
  const updateForm = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  /**
   * Mở dialog để thêm địa chỉ mới
   */
  const openAddDialog = () => {
    reset(); // Reset form về rỗng
    setOpen(true); // Mở dialog
  };

  /**
   * Đóng dialog form
   */
  const closeDialog = () => {
    setOpen(false); // Đóng dialog
    reset(); // Reset form
  };

  // ========== RETURN ==========
  // Export tất cả state và handlers để component Address.jsx sử dụng
  
  return {
    // ===== STATE =====
    addresses,        // Danh sách địa chỉ
    loading,          // Trạng thái loading
    open,             // Mở/đóng dialog form
    editing,          // Địa chỉ đang được sửa (null = thêm mới)
    form,             // Dữ liệu form (truyền vào AddressForm)
    selectedCodes,    // Mã code Tỉnh/Quận/Phường đã chọn (cho dropdown)
    provinces,        // Danh sách tỉnh/thành phố
    districts,        // Danh sách quận/huyện (phụ thuộc tỉnh)
    wards,            // Danh sách phường/xã (phụ thuộc quận)
    
    // ===== API HANDLERS =====
    handleSubmit,           // Xử lý submit form (thêm/sửa)
    handleDelete,           // Xóa địa chỉ
    handleSetDefault,       // Đặt địa chỉ làm mặc định
    
    // ===== FORM HANDLERS =====
    edit,                   // Mở form để sửa địa chỉ
    handleProvinceChange,   // Xử lý khi chọn Tỉnh/TP
    handleDistrictChange,    // Xử lý khi chọn Quận/Huyện
    handleWardChange,       // Xử lý khi chọn Phường/Xã
    updateForm,             // Cập nhật giá trị form (ít dùng)
    
    // ===== DIALOG HANDLERS =====
    openAddDialog,          // Mở dialog thêm mới
    closeDialog,            // Đóng dialog và reset form
    setOpen                 // Set trạng thái mở/đóng dialog (dùng cho Dialog component)
  };
}

