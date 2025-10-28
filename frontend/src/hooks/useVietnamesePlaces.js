import { useState, useEffect } from 'react';

const API_BASE = 'https://provinces.open-api.vn/api';

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
      const res = await fetch(`${API_BASE}/p/`);
      const data = await res.json();
      setProvinces(data || []);
    } catch (error) {
      console.error('Lỗi khi tải tỉnh/thành:', error);
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
      const res = await fetch(`${API_BASE}/p/${provinceCode}?depth=2`);
      const data = await res.json();
      setDistricts(data.districts || []);
      setWards([]); // Reset wards khi đổi tỉnh
    } catch (error) {
      console.error('Lỗi khi tải quận/huyện:', error);
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
      const res = await fetch(`${API_BASE}/d/${districtCode}?depth=2`);
      const data = await res.json();
      setWards(data.wards || []);
    } catch (error) {
      console.error('Lỗi khi tải phường/xã:', error);
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

