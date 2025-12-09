import { FaPlus, FaEdit, FaTrash, FaMapMarkerAlt, FaPhone, FaUser, FaHome, FaBriefcase, FaStar } from "react-icons/fa";
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAddress } from "./useAddress";
import { AddressForm } from "./AddressForm";

// ========== HELPER FUNCTIONS ==========


/**
 * Trả về icon tương ứng với loại địa chỉ
 */
const getIcon = (type) => {
  const icons = {
    home: <FaHome className="text-blue-500" />,
    office: <FaBriefcase className="text-orange-500" />
  };
  return icons[type?.toLowerCase()] || <FaMapMarkerAlt className="text-gray-500" />;
};

/**
 * Trả về tên hiển thị của loại địa chỉ
 */
const getName = (type) => {
  const names = { home: "Nhà riêng", office: "Văn phòng" };
  return names[type?.toLowerCase()] || "Khác";
};

// ========== COMPONENT ==========

export default function Address({ isActive = true }) {
  // Lấy tất cả state và handlers từ custom hook
  const {
    addresses,
    loading,
    open,
    editing,
    form,
    selectedCodes,
    provinces,
    districts,
    wards,
    handleSubmit,
    handleDelete,
    handleSetDefault,
    edit,
    handleProvinceChange,
    handleDistrictChange,
    handleWardChange,
    openAddDialog,
    closeDialog,
    setOpen
  } = useAddress(isActive);

  return (
    <Card>
      {/* Header */}
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FaMapMarkerAlt className="text-blue-500" /> Địa chỉ của tôi
        </CardTitle>
        <CardAction>
          <Button onClick={openAddDialog} disabled={addresses.length >= 10}>
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
            <Button onClick={openAddDialog}>Thêm địa chỉ đầu tiên</Button>
          </div>
        ) : (
          // Danh sách địa chỉ
          <div className="space-y-4">
            {addresses.map((a) => (
              <div
                key={a.id}
                className={`border rounded-lg p-4 hover:shadow-md transition ${
                  a.isDefault ? 'border-blue-500 border-2 bg-blue-50/30' : ''
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
                    <Button size="sm" variant="ghost" onClick={() => edit(a)}>
                      <FaEdit /> Sửa
                    </Button>

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

      {/* Form thêm/sửa địa chỉ */}
      <AddressForm
        open={open}
        setOpen={setOpen}
        editing={editing}
        loading={loading}
        form={form}
        selectedCodes={selectedCodes}
        provinces={provinces}
        districts={districts}
        wards={wards}
        handleSubmit={handleSubmit}
        handleProvinceChange={handleProvinceChange}
        handleDistrictChange={handleDistrictChange}
        handleWardChange={handleWardChange}
        closeDialog={closeDialog}
      />
    </Card>
  );
}

