import { useState, useEffect } from 'react';
import axiosClient from '@/api/axiosClient';

/**
 * Custom hook để lấy danh sách Tỉnh/Quận/Phường từ GHN API
 * Thay thế useVietnamesePlaces để tích hợp với GHN
 * 
 * @returns {Object} Object chứa:
 *   - provinces: Danh sách tỉnh/thành phố
 *   - districts: Danh sách quận/huyện
 *   - wards: Danh sách phường/xã
 *   - loading: Trạng thái loading
 *   - fetchDistricts: Hàm lấy danh sách quận/huyện
 *   - fetchWards: Hàm lấy danh sách phường/xã
 */
export const useGHNPlaces = () => {
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load tỉnh/thành phố khi component mount
  useEffect(() => {
    fetchProvinces();
  }, []);

  /**
   * Lấy danh sách tỉnh/thành phố từ GHN API
   * API: GET /api/ghn/provinces
   * Response: { success: true, data: [{ ProvinceID, ProvinceName, ... }] }
   */
  const fetchProvinces = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get('/ghn/provinces');
      
      if (response.data.success && response.data.data) {
        // Transform data để tương thích với code hiện tại
        // GHN trả về: { ProvinceID, ProvinceName }
        // Code cũ dùng: { code, name }
        const transformed = response.data.data.map(p => ({
          code: p.ProvinceID,
          id: p.ProvinceID, // ID từ GHN
          name: p.ProvinceName,
          // Giữ nguyên các field khác từ GHN nếu cần
          ...p
        }));
        setProvinces(transformed || []);
      }
    } catch (error) {
      console.error('Lỗi khi tải tỉnh/thành từ GHN:', error);
      setProvinces([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Lấy danh sách quận/huyện từ GHN API
   * API: GET /api/ghn/districts?province_id={id}
   * @param {number|string} provinceId - ProvinceID từ GHN
   */
  const fetchDistricts = async (provinceId) => {
    if (!provinceId) {
      setDistricts([]);
      setWards([]);
      return;
    }
    
    try {
      setLoading(true);
      const response = await axiosClient.get('/ghn/districts', {
        params: { province_id: provinceId }
      });
      
      if (response.data.success && response.data.data) {
        // Transform data để tương thích
        // GHN trả về: { DistrictID, DistrictName, ProvinceID }
        // Code cũ dùng: { code, name }
        const transformed = response.data.data.map(d => ({
          code: d.DistrictID,
          id: d.DistrictID, // ID từ GHN
          name: d.DistrictName,
          provinceId: d.ProvinceID,
          // Giữ nguyên các field khác từ GHN
          ...d
        }));
        setDistricts(transformed || []);
        setWards([]); // Reset wards khi đổi tỉnh
      }
    } catch (error) {
      console.error('Lỗi khi tải quận/huyện từ GHN:', error);
      setDistricts([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Lấy danh sách phường/xã từ GHN API
   * API: GET /api/ghn/wards?district_id={id} hoặc POST /api/ghn/wards
   * @param {number|string} districtId - DistrictID từ GHN
   */
  const fetchWards = async (districtId) => {
    if (!districtId) {
      setWards([]);
      return;
    }
    
    try {
      setLoading(true);
      // Dùng GET với query params để dễ dàng hơn
      const response = await axiosClient.get('/ghn/wards', {
        params: { district_id: districtId }
      });
      
      if (response.data.success && response.data.data) {
        // Transform data để tương thích
        // GHN trả về: { WardCode, WardName, DistrictID }
        // Code cũ dùng: { code, name }
        const transformed = response.data.data.map(w => ({
          code: w.WardCode, // WardCode là string
          id: w.WardCode, // ID từ GHN (WardCode)
          name: w.WardName,
          districtId: w.DistrictID,
          // Giữ nguyên các field khác từ GHN
          ...w
        }));
        setWards(transformed || []);
      }
    } catch (error) {
      console.error('Lỗi khi tải phường/xã từ GHN:', error);
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

