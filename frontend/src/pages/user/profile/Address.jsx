import { useState, useEffect } from "react";
import { FaPlus, FaEdit, FaTrash, FaMapMarkerAlt, FaPhone, FaUser, FaHome, FaBriefcase, FaStar } from "react-icons/fa";
import { toast } from "react-toastify";
import { getAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress } from "@/api/address";
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useVietnamesePlaces } from "@/hooks/useVietnamesePlaces";

// ========== HELPER FUNCTIONS ==========
// Trả về icon tương ứng với loại địa chỉ
const getIcon = (type) => {
  const icons = {
    home: <FaHome className="text-blue-500" />,      // Icon nhà riêng
    office: <FaBriefcase className="text-orange-500" /> // Icon văn phòng
  };
  return icons[type?.toLowerCase()] || <FaMapMarkerAlt className="text-gray-500" />; // Mặc định icon bản đồ
};

// Trả về tên hiển thị của loại địa chỉ
const getName = (type) => {
  const names = { home: "Nhà riêng", office: "Văn phòng" };
  return names[type?.toLowerCase()] || "Khác";
};

// Form ban đầu rỗng
const INIT_FORM = {
  fullName: "", phone: "", streetAddress: "", ward: "", district: "", city: "",
  addressType: "home", isDefault: false, note: ""
};

export default function Address() {
  // ========== STATE MANAGEMENT ==========
  const [addresses, setAddresses] = useState([]);       // Danh sách địa chỉ
  const [loading, setLoading] = useState(false);        // Trạng thái loading
  const [open, setOpen] = useState(false);              // Trạng thái mở/đóng Dialog
  const [editing, setEditing] = useState(null);         // Địa chỉ đang được sửa (null = đang thêm mới)
  const [form, setForm] = useState(INIT_FORM);          // Dữ liệu form
  const [selectedCodes, setSelectedCodes] = useState({  // Mã code của Tỉnh/Quận/Phường đã chọn
    provinceCode: "", 
    districtCode: "", 
    wardCode: "" 
  });
  
  // Hook để load danh sách Tỉnh/Quận/Phường từ API
  const { provinces, districts, wards, fetchDistricts, fetchWards } = useVietnamesePlaces();

  // Load danh sách địa chỉ khi component mount
  useEffect(() => { loadAddresses(); }, []);

  // ========== API CALLS ==========
  // Lấy danh sách địa chỉ từ server
  const loadAddresses = async () => {
    try {
      setLoading(true);
      const { data } = await getAddresses();
      setAddresses(data.addresses || []);
    } catch {
      toast.error(" Không thể tải địa chỉ");
    } finally {
      setLoading(false);
    }
  };

  // Reset form về trạng thái ban đầu
  const reset = () => {
    setEditing(null);
    setForm(INIT_FORM);
    setSelectedCodes({ provinceCode: "", districtCode: "", wardCode: "" });
  };

  // ========== FORM HANDLERS ==========
  // Xử lý submit form (Thêm mới hoặc Cập nhật)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate: Bắt buộc phải chọn đầy đủ Tỉnh/Quận/Phường
    if (!form.city || !form.district || !form.ward) {
      toast.error(" Vui lòng chọn đầy đủ Tỉnh/TP, Quận/Huyện, Phường/Xã");
      return;
    }
    
    try {
      setLoading(true);
      // Convert addressType sang chữ HOA để match với backend
      const data = { ...form, addressType: form.addressType.toUpperCase() };
      
      // Nếu đang edit thì update, không thì thêm mới
      editing ? await updateAddress(editing.id, data) : await addAddress(data);
      
      toast.success(` ${editing ? 'Cập nhật' : 'Thêm'} thành công`);
      setOpen(false);   // Đóng dialog
      reset();          // Reset form
      loadAddresses();  // Reload danh sách
    } catch (error) {
      toast.error(` ${error.response?.data?.message || 'Lỗi'}`);
    } finally {
      setLoading(false);
    }
  };

  // Xóa địa chỉ
  const handleDelete = async (id) => {
    try {
      await deleteAddress(id);
      toast.success(" Đã xóa");
      loadAddresses();
    } catch {
      toast.error(" Không thể xóa");
    }
  };

  // Đặt địa chỉ làm mặc định
  const handleSetDefault = async (id) => {
    try {
      await setDefaultAddress(id);
      toast.success(" Đã đặt mặc định");
      loadAddresses();
    } catch {
      toast.error(" Lỗi");
    }
  };

  // Mở form sửa địa chỉ
  const edit = async (addr) => {
    setEditing(addr);
    // Convert addressType về lowercase để hiển thị trong form
    setForm({ ...addr, addressType: addr.addressType?.toLowerCase() || "home" });
    
    // Tìm và set lại các code của Tỉnh/Quận/Phường để hiển thị trong dropdown
    const province = provinces.find(p => p.name === addr.city);
    if (province) {
      setSelectedCodes(prev => ({ ...prev, provinceCode: String(province.code) }));
      await fetchDistricts(String(province.code)); // Load danh sách Quận/Huyện
      
      // Dùng setTimeout để đợi districts load xong
      setTimeout(() => {
        const district = districts.find(d => d.name === addr.district);
        if (district) {
          setSelectedCodes(prev => ({ ...prev, districtCode: String(district.code) }));
          fetchWards(String(district.code)); // Load danh sách Phường/Xã
          
          // Dùng setTimeout để đợi wards load xong
          setTimeout(() => {
            const ward = wards.find(w => w.name === addr.ward);
            if (ward) setSelectedCodes(prev => ({ ...prev, wardCode: String(ward.code) }));
          }, 300);
        }
      }, 300);
    }
    setOpen(true);
  };

  // ========== DROPDOWN CASCADE HANDLERS ==========
  // Xử lý khi chọn Tỉnh/TP
  const handleProvinceChange = (value) => {
    const province = provinces.find(p => String(p.code) === value);
    if (province) {
      // Set tên tỉnh vào form, reset quận/phường
      setForm({ ...form, city: province.name, district: "", ward: "" });
      // Set code tỉnh, reset code quận/phường
      setSelectedCodes({ provinceCode: value, districtCode: "", wardCode: "" });
      // Load danh sách Quận/Huyện theo tỉnh đã chọn
      fetchDistricts(value);
    }
  };

  // Xử lý khi chọn Quận/Huyện
  const handleDistrictChange = (value) => {
    const district = districts.find(d => String(d.code) === value);
    if (district) {
      // Set tên quận vào form, reset phường
      setForm({ ...form, district: district.name, ward: "" });
      // Set code quận, reset code phường
      setSelectedCodes({ ...selectedCodes, districtCode: value, wardCode: "" });
      // Load danh sách Phường/Xã theo quận đã chọn
      fetchWards(value);
    }
  };

  // Xử lý khi chọn Phường/Xã
  const handleWardChange = (value) => {
    const ward = wards.find(w => String(w.code) === value);
    if (ward) {
      // Set tên phường vào form
      setForm({ ...form, ward: ward.name });
      // Set code phường
      setSelectedCodes({ ...selectedCodes, wardCode: value });
    }
  };

  // ========== RENDER UI ==========
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FaMapMarkerAlt className="text-blue-500" /> Địa chỉ của tôi
        </CardTitle>
        <CardAction>
          {/* Disable nút "Thêm mới" khi đã có 10 địa chỉ */}
          <Button onClick={() => { reset(); setOpen(true); }} disabled={addresses.length >= 10}>
            <FaPlus /> Thêm mới
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent>
        {/* Thông báo khi đạt giới hạn 10 địa chỉ */}
        {addresses.length >= 10 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
            ⚠️ Đã đạt giới hạn 10 địa chỉ
          </div>
        )}

        {/* Hiển thị khi chưa có địa chỉ nào */}
        {addresses.length === 0 ? (
          <div className="text-center py-16">
            <FaMapMarkerAlt className="text-gray-300 text-6xl mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Chưa có địa chỉ</p>
            <Button onClick={() => { reset(); setOpen(true); }}>Thêm địa chỉ đầu tiên</Button>
          </div>
        ) : (
          // Danh sách địa chỉ
          <div className="space-y-4">
            {addresses.map((a) => (
              <div 
                key={a.id} 
                className={`border rounded-lg p-4 hover:shadow-md transition ${
                  a.isDefault ? 'border-blue-500 border-2 bg-blue-50/30' : '' // Highlight địa chỉ mặc định
                }`}
              >
                <div className="flex justify-between gap-4">
                  {/* Thông tin địa chỉ */}
                  <div className="flex-1 space-y-3">
                    {/* Header: Icon + Loại + Badge mặc định */}
                    <div className="flex items-center gap-2 pb-2 border-b">
                      {getIcon(a.addressType)}
                      <span className="font-semibold">{getName(a.addressType)}</span>
                      {a.isDefault && (
                        <Badge className="bg-red-500 text-white">
                          <FaStar className="mr-1" /> Mặc định
                        </Badge>
                      )}
                    </div>
                    
                    {/* Chi tiết địa chỉ */}
                    <div className="space-y-1 text-sm">
                      <div className="flex gap-2">
                        <FaUser className="text-gray-400 mt-1" />
                        <span className="font-semibold">{a.fullName}</span>
                      </div>
                      <div className="flex gap-2">
                        <FaPhone className="text-gray-400 mt-1" />
                        <span>{a.phone}</span>
                      </div>
                      <div className="flex gap-2">
                        <FaMapMarkerAlt className="text-gray-400 mt-1" />
                        <span>{a.streetAddress}, {a.ward}, {a.district}, {a.city}</span>
                      </div>
                      {a.note && (
                        <div className="p-2 bg-gray-50 rounded text-xs italic">💬 {a.note}</div>
                      )}
                    </div>
                  </div>
                  
                  {/* Các nút hành động */}
                  <div className="flex flex-col gap-2 border-l pl-3">
                    {/* Nút Sửa */}
                    <Button size="sm" variant="ghost" onClick={() => edit(a)}>
                      <FaEdit /> Sửa
                    </Button>
                    
                    {/* Nút Đặt mặc định (ẩn nếu đã là mặc định) */}
                    {!a.isDefault && (
                      <Button size="sm" variant="ghost" onClick={() => handleSetDefault(a.id)}>
                        Đặt mặc định
                      </Button>
                    )}
                    
                    {/* Dialog xác nhận xóa */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-red-600">
                          <FaTrash /> Xóa
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Xóa địa chỉ?</AlertDialogTitle>
                          <AlertDialogDescription>Bạn có chắc muốn xoá địa chỉ này?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Hủy</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(a.id)} className="bg-red-600">
                            Xóa
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* ========== DIALOG THÊM/SỬA ĐỊA CHỈ ========== */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent 
          className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]"
          onInteractOutside={(e) => e.preventDefault()}  // Chặn đóng khi click ra ngoài
          onEscapeKeyDown={(e) => e.preventDefault()}    // Chặn đóng khi nhấn ESC
        >
          <DialogHeader>
            <DialogTitle>{editing ? 'Sửa địa chỉ' : 'Thêm địa chỉ'}</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Họ tên và Số điện thoại */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Họ tên *</Label>
                <Input 
                  value={form.fullName} 
                  onChange={(e) => setForm({...form, fullName: e.target.value})} 
                  required 
                  minLength={2} 
                  placeholder="Nguyễn Văn A" 
                />
              </div>
              <div>
                <Label>Số điện thoại *</Label>
                <Input 
                  value={form.phone} 
                  onChange={(e) => setForm({...form, phone: e.target.value})} 
                  required 
                  pattern="[0-9]{10}" 
                  placeholder="0123456789" 
                />
              </div>
            </div>

            {/* Dropdown cascade: Tỉnh/TP -> Quận/Huyện -> Phường/Xã */}
            <div className="grid grid-cols-3 gap-4">
              {/* Chọn Tỉnh/TP */}
              <div>
                <Label>Tỉnh/TP *</Label>
                <Select value={selectedCodes.provinceCode} onValueChange={handleProvinceChange}>
                  <SelectTrigger><SelectValue placeholder="Chọn Tỉnh/TP" /></SelectTrigger>
                  <SelectContent>
                    {provinces.map((p) => (
                      <SelectItem key={p.code} value={String(p.code)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Chọn Quận/Huyện (disable nếu chưa chọn Tỉnh) */}
              <div>
                <Label>Quận/Huyện *</Label>
                <Select 
                  value={selectedCodes.districtCode} 
                  onValueChange={handleDistrictChange} 
                  disabled={!selectedCodes.provinceCode}
                >
                  <SelectTrigger><SelectValue placeholder="Chọn Quận/Huyện" /></SelectTrigger>
                  <SelectContent>
                    {districts.map((d) => (
                      <SelectItem key={d.code} value={String(d.code)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Chọn Phường/Xã (disable nếu chưa chọn Quận) */}
              <div>
                <Label>Phường/Xã *</Label>
                <Select 
                  value={selectedCodes.wardCode} 
                  onValueChange={handleWardChange} 
                  disabled={!selectedCodes.districtCode}
                >
                  <SelectTrigger><SelectValue placeholder="Chọn Phường/Xã" /></SelectTrigger>
                  <SelectContent>
                    {wards.map((w) => (
                      <SelectItem key={w.code} value={String(w.code)}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Địa chỉ cụ thể */}
            <div>
              <Label>Địa chỉ cụ thể *</Label>
              <Input 
                value={form.streetAddress} 
                onChange={(e) => setForm({...form, streetAddress: e.target.value})} 
                required 
                placeholder="Số nhà, tên đường..." 
              />
            </div>

            {/* Loại địa chỉ: Radio buttons */}
            <div>
              <Label>Loại địa chỉ *</Label>
              <div className="flex gap-4 mt-2">
                {[
                  { value: "home", icon: <FaHome className="text-blue-500" />, label: "Nhà riêng" },
                  { value: "office", icon: <FaBriefcase className="text-orange-500" />, label: "Văn phòng" }
                ].map(({ value, icon, label }) => (
                  <label key={value} className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      value={value} 
                      checked={form.addressType === value} 
                      onChange={(e) => setForm({...form, addressType: e.target.value})} 
                    />
                    {icon} {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Ghi chú */}
            <div>
              <Label>Ghi chú</Label>
              <Textarea 
                value={form.note} 
                onChange={(e) => setForm({...form, note: e.target.value})} 
                rows={3} 
                placeholder="Ghi chú thêm..." 
              />
            </div>

            {/* Checkbox: Đặt làm mặc định */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={form.isDefault} 
                onChange={(e) => setForm({...form, isDefault: e.target.checked})} 
              />
              <span className="text-sm">Đặt làm mặc định</span>
            </label>

            {/* Nút Hủy và Submit */}
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => { 
                  setOpen(false);  // Đóng dialog
                  reset();         // Reset form về ban đầu
                }}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Đang lưu...' : (editing ? 'Cập nhật' : 'Thêm')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
