import { useEffect } from "react";
import { Form, Input, Select, Radio, Checkbox, Button } from "antd";
import { FaHome, FaBriefcase } from "react-icons/fa";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const { TextArea } = Input;

/**
 * Component form thêm/sửa địa chỉ 
 * 
 * ⚠️ QUAN TRỌNG: KHÔNG IMPORT useAddress.js
 * - Component này CHỈ nhận props từ Address.jsx (parent component)
 * - Address.jsx là nơi import và gọi useAddress() hook
 * - AddressForm.jsx chỉ render UI, không có logic riêng
 * 
 * CÁC PROPS ĐƯỢC TRUYỀN TỪ ĐÂU?
 * - Tất cả props được truyền từ Address.jsx (dòng 170-185)
 * - Address.jsx lấy từ useAddress() hook
 * - Không phải tự định nghĩa, mà được truyền từ parent component
 * 
 * TÊN PROPS ĐÃ KHỚP VỚI useAddress.js (ĐỂ DỄ HIỂU VÀ NHẤT QUÁN):
 * - handleSubmit ← useAddress.handleSubmit
 * - handleProvinceChange ← useAddress.handleProvinceChange
 * - handleDistrictChange ← useAddress.handleDistrictChange
 * - handleWardChange ← useAddress.handleWardChange
 * - closeDialog ← useAddress.closeDialog
 * - form ← useAddress.form state
 * - setOpen ← useAddress.setOpen
 * 
 * ⚠️ QUY TẮC QUAN TRỌNG: TÊN FIELD PHẢI GIỐNG HỆT Ở 3 NƠI!
 * 
 * Nếu muốn thêm field mới (ví dụ: postalCode), PHẢI thêm vào CẢ 3 NƠI:
 * 
 * 1️⃣ useAddress.js - INIT_FORM (dòng 8-18):
 *    const INIT_FORM = {
 *      fullName: "",
 *      postalCode: "",  // ← THÊM VÀO ĐÂY
 *      ...
 *    };
 * 
 * 2️⃣ AddressForm.jsx - Form.Item name (dòng 121-288):
 *    <Form.Item name="postalCode">  // ← THÊM VÀO ĐÂY (TÊN PHẢI GIỐNG HỆT)
 *      <Input placeholder="Mã bưu điện" />
 *    </Form.Item>
 * 
 * 3️⃣ Backend schema (database):
 *    postalCode String?  // ← THÊM VÀO ĐÂY (TÊN PHẢI GIỐNG HỆT)
 * 
 * CÁC TRƯỜNG FORM HIỆN TẠI (Form.Item name="...") PHẢI KHỚP với INIT_FORM:
 * ✅ fullName, phone, streetAddress, ward, district, city, addressType, isDefault, note
 * 
 * Nếu đổi tên field → phải đổi tên trong CẢ 3 NƠI:
 * - useAddress.js (INIT_FORM)
 * - AddressForm.jsx (Form.Item name)
 * - Backend schema
 * 
 * Flow hoạt động:
 * - form (prop) truyền vào chứa các field này → antForm.setFieldsValue(form) sẽ set giá trị
 * - handleFormSubmit(values) trả về object với các field này → handleSubmit nhận và gửi lên backend
 */
export function AddressForm({
  open,                  // Trạng thái mở/đóng dialog (từ useAddress: open state)
  setOpen,               // Hàm đóng dialog (từ useAddress: setOpen function)
  editing,               // Địa chỉ đang sửa (từ useAddress: editing state)
  loading,               // Trạng thái loading (từ useAddress: loading state)
  form,                  // Dữ liệu form (từ useAddress: form state) - chứa fullName, phone, city, district, ward...
  selectedCodes,         // Mã code Tỉnh/Quận/Phường (từ useAddress: selectedCodes state)
  provinces,             // Danh sách tỉnh (từ useAddress: provinces từ useGHNPlaces)
  districts,             // Danh sách quận (từ useAddress: districts từ useGHNPlaces)
  wards,                 // Danh sách phường (từ useAddress: wards từ useGHNPlaces)
  handleSubmit,          // Hàm xử lý submit (từ useAddress: handleSubmit function)
  handleProvinceChange,  // Hàm xử lý khi chọn tỉnh (từ useAddress: handleProvinceChange function)
  handleDistrictChange,  // Hàm xử lý khi chọn quận (từ useAddress: handleDistrictChange function)
  handleWardChange,      // Hàm xử lý khi chọn phường (từ useAddress: handleWardChange function)
  closeDialog            // Hàm đóng dialog (từ useAddress: closeDialog function)
}) {
  // Khởi tạo Ant Design Form instance
  // Form này tự quản lý state của các input (fullName, phone, city, district, ward...)
  // Đặt tên antForm để tránh xung đột với prop form (dữ liệu từ useAddress)
  const [antForm] = Form.useForm();

  /**
   * Cập nhật form khi form (từ useAddress) thay đổi (khi edit)
   * 
   * form (prop) đến từ đâu?
   * - Từ useAddress.js: form state (dòng 44)
   * - Khi user click "Sửa", useAddress.edit() sẽ set form với dữ liệu địa chỉ
   * - form có cấu trúc: { fullName, phone, city, district, ward, streetAddress, addressType, isDefault, note }
   * - form khớp với INIT_FORM trong useAddress.js
   * 
   * antForm.setFieldsValue(form) làm gì?
   * - Set giá trị cho tất cả Form.Item có name khớp với keys trong form
   * - Ví dụ: form.fullName → Form.Item name="fullName" sẽ có giá trị
   */
  useEffect(() => {
    if (form && open) {
      // Khi đang edit và dialog mở: Set giá trị từ form (prop) vào Ant Design form (antForm)
      // form đến từ useAddress.js (state form)
      antForm.setFieldsValue(form);//set giá trị cho tất cả Form.Item có name khớp với keys trong form
    } else if (!open) {
      // Khi đóng dialog: Reset Ant Design form về rỗng
      antForm.resetFields();
    }
  }, [form, open, antForm]);//khi form hoặc open thay đổi, gọi lại hàm này

  /**
   * Xử lý khi user submit form
   * 
   * values chứa gì?
   * - Ant Design Form tự động collect tất cả giá trị từ Form.Item
   * - values = { fullName: "...", phone: "...", city: "...", district: "...", ward: "...", ... }
   * - Các keys trong values PHẢI KHỚP với Form.Item name="..."
   * 
   * handleSubmit(values) gọi đâu?
   * - Gọi handleSubmit từ useAddress.js (được truyền vào qua props)
   * - handleSubmit sẽ convert addressType và gọi API addAddress/updateAddress
   */
  const handleFormSubmit = (values) => {
    handleSubmit(values); // values được truyền vào handleSubmit trong useAddress.js
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-[600px] mt-22"
        onInteractOutside={(e) => {
          // Cho phép click vào dropdown của Ant Design Select
          // Ant Design Select dropdown có class 'ant-select-dropdown'
          if (e.target.closest('.ant-select-dropdown')) {
            return; // Không prevent nếu click vào dropdown
          }
          e.preventDefault(); // Không đóng dialog khi click ngoài
        }}
        onEscapeKeyDown={(e) => e.preventDefault()}//không đóng dialog khi nhấn ESC
      >
          <DialogHeader>
          <DialogTitle>{editing ? 'Sửa địa chỉ' : 'Thêm địa chỉ'}</DialogTitle>
          <DialogDescription className="sr-only">
            {editing ? 'Cập nhật thông tin địa chỉ giao hàng' : 'Thêm địa chỉ giao hàng mới'}
          </DialogDescription>
        </DialogHeader>

        <Form
          form={antForm}
          layout="vertical"
          onFinish={handleFormSubmit}//xử lý submit form - gọi handleSubmit từ useAddress
          className="space-y-2"
          id="address-form" // Thêm ID để dùng cho getPopupContainer
        >
          {/* 
            CÁC TRƯỜNG FORM NÀY KHÔNG TỰ ĐỊNH NGHĨA!
            - Form.Item name="fullName" PHẢI KHỚP với INIT_FORM.fullName trong useAddress.js
            - Form.Item name="phone" PHẢI KHỚP với INIT_FORM.phone trong useAddress.js
            - Khi form (prop từ useAddress) được set vào antForm → antForm.setFieldsValue(form)
            - Khi submit → values = { fullName: "...", phone: "..." } → handleSubmit nhận và gửi lên backend
            - Backend API cũng expect các field này: fullName, phone, city, district, ward, streetAddress, addressType, isDefault, note
          */}
          {/* Họ tên và Số điện thoại */}
          <div className="grid grid-cols-2 gap-3">
            <Form.Item
              name="fullName"  // ⚠️ PHẢI KHỚP với INIT_FORM.fullName và backend field
              label="Họ tên *"
              rules={[
                { required: true, message: "Vui lòng nhập họ tên" },
                { min: 2, message: "Họ tên phải có ít nhất 2 ký tự" }
              ]}
            >
              <Input placeholder="Nguyễn Văn A" />
            </Form.Item>

            <Form.Item
              name="phone"  // ⚠️ PHẢI KHỚP với INIT_FORM.phone và backend field
              label="Số điện thoại *"
              rules={[
                { required: true, message: "Vui lòng nhập số điện thoại" },
                { pattern: /^[0-9]{10}$/, message: "Số điện thoại phải có 10 chữ số" }
              ]}
            >
              <Input placeholder="0123456789" />
            </Form.Item>
          </div>

          {/* 
            DROPDOWN CASCADE: Tỉnh/TP -> Quận/Huyện -> Phường/Xã
            - Form.Item name="city" PHẢI KHỚP với INIT_FORM.city trong useAddress.js
            - Form.Item name="district" PHẢI KHỚP với INIT_FORM.district trong useAddress.js
            - Form.Item name="ward" PHẢI KHỚP với INIT_FORM.ward trong useAddress.js
            - selectedCodes.provinceCode/districtCode/wardCode từ useAddress.js (dùng để hiển thị giá trị đã chọn)
            - provinces/districts/wards từ useAddress.js (từ useGHNPlaces hook)
            - onProvinceChange/onDistrictChange/onWardChange là các hàm từ useAddress.js
          */}
          <div className="grid grid-cols-3 gap-3">
            <Form.Item
              name="city"  // ⚠️ PHẢI KHỚP với INIT_FORM.city và backend field
              label="Tỉnh/TP *"
              rules={[{ required: true, message: "Vui lòng chọn Tỉnh/TP" }]}
            >
              <Select
                placeholder="Chọn Tỉnh/TP"
                value={selectedCodes.provinceCode}
                getPopupContainer={(trigger) => document.getElementById('address-form') || trigger.parentElement} // Render dropdown vào trong Form để không bị block bởi onInteractOutside
                onChange={(value) => {
                  // Xử lý khi user chọn Tỉnh/TP, lấy từ GHN API
                  const province = provinces.find(p => String(p.code) === value || String(p.ProvinceID) === value);
                  if (province) {
                    const provinceName = province.name || province.ProvinceName;
                    antForm.setFieldsValue({ city: provinceName, district: "", ward: "" });
                    handleProvinceChange(value);
                  }
                }}
              >
                {provinces.map((p) => (
                  <Select.Option key={p.code} value={String(p.code)}>
                    {p.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="district"  // ⚠️ PHẢI KHỚP với INIT_FORM.district và backend field
              label="Quận/Huyện *"
              rules={[{ required: true, message: "Vui lòng chọn Quận/Huyện" }]}
            >
              <Select
                placeholder="Chọn Quận/Huyện"
                value={selectedCodes.districtCode}
                getPopupContainer={(trigger) => document.getElementById('address-form') || trigger.parentElement} // Render dropdown vào trong Form để không bị block bởi onInteractOutside
                onChange={(value) => {
                  // Xử lý khi user chọn Quận/Huyện, lấy từ GHN API
                  const district = districts.find(d => String(d.code) === value || String(d.DistrictID) === value);
                  if (district) {
                    const districtName = district.name || district.DistrictName;
                    antForm.setFieldsValue({ district: districtName, ward: "" });
                    handleDistrictChange(value);
                  }
                }}
                disabled={!selectedCodes.provinceCode}
              >
                {districts.map((d) => (
                  <Select.Option key={d.code} value={String(d.code)}>
                    {d.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="ward"  // ⚠️ PHẢI KHỚP với INIT_FORM.ward và backend field
              label="Phường/Xã *"
              rules={[{ required: true, message: "Vui lòng chọn Phường/Xã" }]}
            >
              <Select
                placeholder="Chọn Phường/Xã"
                value={selectedCodes.wardCode}
                getPopupContainer={(trigger) => document.getElementById('address-form') || trigger.parentElement} // Render dropdown vào trong Form để không bị block bởi onInteractOutside
                onChange={(value) => {
                  // Xử lý khi user chọn Phường/Xã, lấy từ GHN API
                  const ward = wards.find(w => String(w.code) === value || String(w.WardCode) === value);
                  if (ward) {
                    const wardName = ward.name || ward.WardName;
                    antForm.setFieldsValue({ ward: wardName });
                    handleWardChange(value);
                  }
                }}
                disabled={!selectedCodes.districtCode}
              >
                {wards.map((w) => (
                  <Select.Option key={w.code} value={String(w.code)}>
                    {w.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          {/* 
            CÁC TRƯỜNG CÒN LẠI CŨNG PHẢI KHỚP VỚI useAddress.js:
            - streetAddress → INIT_FORM.streetAddress
            - addressType → INIT_FORM.addressType
            - note → INIT_FORM.note
            - isDefault → INIT_FORM.isDefault
            - Tất cả đều phải khớp với backend API schema
          */}
          {/* Địa chỉ cụ thể */}
          <Form.Item
            name="streetAddress"  // ⚠️ PHẢI KHỚP với INIT_FORM.streetAddress và backend field
            label="Địa chỉ cụ thể *"
           
            rules={[{ required: true, message: "Vui lòng nhập địa chỉ cụ thể" }]}
          >
            <Input placeholder="Số nhà, tên đường..." />
          </Form.Item>

          {/* Loại địa chỉ */}
            <Form.Item
              name="addressType"  // ⚠️ PHẢI KHỚP với INIT_FORM.addressType và backend field
              label="Loại địa chỉ *"
              rules={[{ required: true, message: "Vui lòng chọn loại địa chỉ" }]}
            >
              <Radio.Group>
                <Radio value="home">
                  <FaHome className="text-blue-500 inline mr-1" /> Nhà riêng
                </Radio>
                <Radio value="office">
                  <FaBriefcase className="text-orange-500 inline mr-1" /> Văn phòng
                </Radio>
              </Radio.Group>
            </Form.Item>

          {/* Ghi chú - ĐÃ ẨN */}
          {/* <Form.Item name="note" label="Ghi chú">  {/* ⚠️ PHẢI KHỚP với INIT_FORM.note và backend field */}
          {/*   <TextArea rows={3} placeholder="Ghi chú thêm..." /> */}
          {/* </Form.Item> */}

          {/* Checkbox: Đặt làm mặc định */}
           <Form.Item name="isDefault" valuePropName="checked">  
            <Checkbox>Đặt làm mặc định</Checkbox>
          </Form.Item> 

          {/* Nút Hủy và Submit */}
          <Form.Item className="mb-0">
            <div className="flex justify-end gap-2">
              <Button onClick={closeDialog}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editing ? 'Cập nhật' : 'Thêm'}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
