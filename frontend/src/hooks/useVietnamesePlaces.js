import { useState, useEffect } from 'react';
import { getGHNProvinces, getGHNDistricts, getGHNWards } from '@/api/shipping';

/**
 * Hook quản lý danh sách Tỉnh/Quận/Phường từ GHN API
 * 
 * Format dữ liệu trả về:
 * - provinces: [{ code: "202", name: "Thành phố Hồ Chí Minh" }]
 * - districts: [{ code: "1451", name: "Quận 1", districtId: 1451 }]
 * - wards: [{ code: "1A0401", name: "Phường Bến Nghé", wardCode: "1A0401" }]
 * 
 * Lưu ý:
 * - code: Dùng cho dropdown (string)
 * - districtId: Dùng để gửi lên API tính phí (number)
 * - wardCode: Dùng để gửi lên API tính phí (string)
 */
export const useVietnamesePlaces = () => {
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load tỉnh/thành phố khi component mount
  useEffect(() => {
    fetchProvinces();
  }, []);

  const fetchProvinces = async () => {
    try {
      setLoading(true);
      const res = await getGHNProvinces();
      // Backend đã map: { code: "202", name: "Thành phố Hồ Chí Minh" }
      setProvinces(res.data?.data || []);
    } catch (error) {
      console.error('Lỗi khi tải tỉnh/thành:', error);
      setProvinces([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDistricts = async (provinceCode) => {
    if (!provinceCode) {
      setDistricts([]);
      setWards([]);
      return;
    }
    try {
      setLoading(true);
      // Backend expect provinceId là number, nhưng frontend đang dùng code (string)
      // Cần convert string → number
      const provinceId = parseInt(provinceCode);
      const res = await getGHNDistricts(provinceId);
      // Backend đã map: { code: "1451", name: "Quận 1", districtId: 1451 }
      setDistricts(res.data?.data || []);
      setWards([]); // Reset wards khi đổi tỉnh
    } catch (error) {
      console.error('Lỗi khi tải quận/huyện:', error);
      setDistricts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchWards = async (districtCode) => {
    if (!districtCode) {
      setWards([]);
      return;
    }
    try {
      setLoading(true);
      // Backend expect districtId là number
      // districts có cả code (string) và districtId (number)
      // Tìm district từ code để lấy districtId
      // Lưu ý: districts có thể chưa được load, nên cần đợi một chút hoặc tìm trong state hiện tại
      const district = districts.find(d => String(d.code) === String(districtCode));
      if (!district || !district.districtId) {
        console.error('Không tìm thấy districtId cho districtCode:', districtCode);
        console.log('Districts hiện tại:', districts);
        setWards([]);
        return;
      }
      
      const res = await getGHNWards(district.districtId);
      // Backend đã map: { code: "1A0401", name: "Phường Bến Nghé", wardCode: "1A0401" }
      setWards(res.data?.data || []);
    } catch (error) {
      console.error('Lỗi khi tải phường/xã:', error);
      setWards([]);
    } finally {
      setLoading(false);
    }
  };

  return {
    provinces,
    districts,
    wards,
    loading,
    fetchDistricts,
    fetchWards,
  };
};

