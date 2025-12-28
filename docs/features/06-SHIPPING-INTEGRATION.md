# Shipping Integration - Tích Hợp Vận Chuyển GHN

## 📋 Tổng Quan

Hệ thống tích hợp với GHN (Giao Hàng Nhanh) bao gồm:
- Lấy danh sách Tỉnh/Quận/Phường
- Tính phí vận chuyển tự động
- Miễn phí vận chuyển (cùng địa chỉ kho / trong 1km)
- Tạo đơn vận chuyển GHN
- Tracking đơn hàng
- Webhook nhận cập nhật trạng thái

---

## 🔧 GHN API Configuration

### Environment Variables

```env
# GHN API Configuration
GHN_API_URL=https://online-gateway.ghn.vn
GHN_TOKEN=your-ghn-token-here
GHN_SHOP_ID=your-shop-id-here

# Warehouse Location (for shipping fee calculation)
GHN_DISTRICT_ID=1542              # ID quận/huyện kho hàng
GHN_WARD_CODE=20308               # Mã phường/xã kho hàng

# Optional: For free shipping logic
GHN_FROM_DISTRICT_ID=1542         # Same as GHN_DISTRICT_ID
GHN_FROM_WARD_CODE=20308          # Same as GHN_WARD_CODE
```

### Cách Lấy Token & Shop ID

1. **Đăng ký tài khoản GHN**: https://khachhang.ghn.vn/
2. **Lấy Token**:
   - Vào **Cài đặt** → **Tài khoản**
   - Copy **Token**
3. **Lấy Shop ID**:
   - Vào **Cài đặt** → **Kho hàng**
   - Copy **Shop ID**

---

## 🔧 Backend Implementation

### 1. Service: `services/shipping/ghnService.js`

#### Get Provinces
```javascript
import axios from 'axios';
import logger from '../../utils/logger.js';

const getGHNConfig = () => {
  let baseUrl = process.env.GHN_API_URL || 'https://online-gateway.ghn.vn';
  baseUrl = baseUrl.trim().replace(/^["']|["']$/g, '');
  
  if (baseUrl.includes('/shiip')) {
    baseUrl = baseUrl.split('/shiip')[0];
  }
  
  baseUrl = baseUrl.replace(/\/$/, '');
  
  let token = process.env.GHN_TOKEN || null;
  let shopId = process.env.GHN_SHOP_ID || null;
  
  if (token) token = token.trim().replace(/^["']|["']$/g, '');
  if (shopId) shopId = shopId.trim().replace(/^["']|["']$/g, '');
  
  return { apiUrl: baseUrl, token, shopId };
};

export const getProvinces = async () => {
  try {
    const { apiUrl, token } = getGHNConfig();
    
    if (!token) {
      throw new Error('GHN_TOKEN không được cấu hình');
    }
    
    const response = await axios.get(
      `${apiUrl}/shiip/public-api/master-data/province`,
      {
        headers: {
          'Token': token,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.code !== 200) {
      throw new Error(response.data.message || 'Không thể lấy danh sách tỉnh/thành phố');
    }

    return {
      success: true,
      data: response.data.data || []
    };
  } catch (error) {
    logger.error('GHN get provinces error', {
      error: error.message,
      status: error.response?.status,
      responseData: error.response?.data
    });
    
    return {
      success: false,
      data: [],
      error: error.message
    };
  }
};
```

#### Get Districts
```javascript
export const getDistricts = async (provinceId) => {
  try {
    if (!provinceId) {
      return {
        success: false,
        data: [],
        error: 'Province ID is required'
      };
    }

    const { apiUrl, token } = getGHNConfig();
    
    if (!token) {
      throw new Error('GHN_TOKEN không được cấu hình');
    }
    
    const response = await axios.get(
      `${apiUrl}/shiip/public-api/master-data/district`,
      {
        params: { province_id: provinceId },
        headers: {
          'Token': token,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.code !== 200) {
      throw new Error(response.data.message || 'Không thể lấy danh sách quận/huyện');
    }

    return {
      success: true,
      data: response.data.data || []
    };
  } catch (error) {
    logger.error('GHN get districts error', {
      error: error.message,
      provinceId,
      response: error.response?.data
    });
    
    return {
      success: false,
      data: [],
      error: error.message
    };
  }
};
```

#### Get Wards
```javascript
export const getWards = async (districtId) => {
  try {
    if (!districtId) {
      return {
        success: false,
        data: [],
        error: 'District ID is required'
      };
    }

    const { apiUrl, token } = getGHNConfig();
    
    if (!token) {
      throw new Error('GHN_TOKEN không được cấu hình');
    }
    
    const response = await axios.post(
      `${apiUrl}/shiip/public-api/master-data/ward`,
      { district_id: districtId },
      {
        headers: {
          'Token': token,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.code !== 200) {
      throw new Error(response.data.message || 'Không thể lấy danh sách phường/xã');
    }

    return {
      success: true,
      data: response.data.data || []
    };
  } catch (error) {
    logger.error('GHN get wards error', {
      error: error.message,
      districtId,
      response: error.response?.data
    });
    
    return {
      success: false,
      data: [],
      error: error.message
    };
  }
};
```

#### Calculate Shipping Fee
```javascript
export const calculateShippingFee = async (params) => {
  try {
    const {
      toDistrictId,
      toWardCode,
      weight = 500,
      length = 20,
      width = 20,
      height = 20,
      codAmount = 0,
      serviceTypeId = 2 // 2 = Standard
    } = params;

    if (!toDistrictId || !toWardCode) {
      return {
        success: false,
        error: 'toDistrictId and toWardCode are required',
        shippingFee: 0
      };
    }

    const fromDistrictId = Number(
      process.env.GHN_FROM_DISTRICT_ID || 
      process.env.GHN_WAREHOUSE_DISTRICT_ID ||
      process.env.GHN_DISTRICT_ID
    );

    if (!fromDistrictId) {
      logger.warn('Warehouse district ID not configured');
      return {
        success: false,
        error: 'Warehouse district ID not configured',
        shippingFee: 30000 // Fallback
      };
    }

    const { apiUrl, token, shopId } = getGHNConfig();
    
    if (!token || !shopId) {
      throw new Error('GHN_TOKEN hoặc GHN_SHOP_ID không được cấu hình');
    }
    
    const response = await axios.post(
      `${apiUrl}/shiip/public-api/v2/shipping-order/fee`,
      {
        service_type_id: serviceTypeId,
        insurance_value: 0,
        coupon: null,
        from_district_id: fromDistrictId,
        to_district_id: toDistrictId,
        to_ward_code: toWardCode,
        height: height,
        length: length,
        weight: weight,
        width: width,
        cod_amount: codAmount
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Token': token,
          'ShopId': shopId
        }
      }
    );

    if (response.data.code !== 200) {
      throw new Error(response.data.message || 'Không thể tính phí vận chuyển');
    }

    const shippingFee = response.data.data.total || 0;
    
    logger.info('GHN calculate shipping fee', {
      toDistrictId,
      toWardCode,
      shippingFee
    });

    return {
      success: true,
      shippingFee,
      serviceFee: response.data.data.service_fee || 0,
      insuranceFee: response.data.data.insurance_fee || 0,
      totalFee: shippingFee,
      estimatedDeliveryTime: response.data.data.estimated_delivery_time || null
    };
  } catch (error) {
    logger.error('GHN calculate shipping fee error', {
      error: error.message,
      params,
      response: error.response?.data
    });
    
    return {
      success: false,
      shippingFee: 30000, // Default fallback
      error: error.message
    };
  }
};
```

### 2. Service: `services/shipping/shippingService.js`

#### Calculate Distance & Free Shipping Logic
```javascript
import { calculateShippingFee as calculateGHNShippingFee } from './ghnService.js';
import logger from '../../utils/logger.js';

const calculateDistance = (fromAddress, toAddress) => {
  const { districtId: fromDistrict, wardCode: fromWard } = fromAddress;
  const { districtId: toDistrict, wardCode: toWard } = toAddress;

  // Check same location
  const isSameLocation = (
    fromDistrict === toDistrict && 
    fromWard === toWard
  );

  // Check within 1km (same ward = within 1km)
  const isWithin1km = (
    fromDistrict === toDistrict && 
    fromWard === toWard
  );

  return {
    isSameLocation,
    isWithin1km,
    distance: isSameLocation ? 0 : (isWithin1km ? 0.5 : null)
  };
};

export const calculateShippingFee = async (params) => {
  try {
    const { toDistrictId, toWardCode } = params;

    // Get warehouse location
    const warehouseDistrictId = Number(
      process.env.GHN_DISTRICT_ID || 
      process.env.GHN_FROM_DISTRICT_ID || 
      process.env.GHN_WAREHOUSE_DISTRICT_ID
    );
    
    const warehouseWardCode = String(
      process.env.GHN_WARD_CODE || 
      process.env.GHN_FROM_WARD_CODE || 
      process.env.GHN_WAREHOUSE_WARD_CODE || ''
    );

    if (!warehouseDistrictId || !warehouseWardCode) {
      logger.warn('Warehouse location not configured, using GHN API directly');
      return await calculateGHNShippingFee(params);
    }

    // Convert toWardCode to string
    const toWardCodeStr = String(toWardCode);

    // Calculate distance
    const distanceInfo = calculateDistance(
      { districtId: warehouseDistrictId, wardCode: warehouseWardCode },
      { districtId: toDistrictId, wardCode: toWardCodeStr }
    );

    logger.info('Distance calculation', {
      from: { districtId: warehouseDistrictId, wardCode: warehouseWardCode },
      to: { districtId: toDistrictId, wardCode: toWardCodeStr },
      ...distanceInfo
    });

    // Free shipping if same location or within 1km
    if (distanceInfo.isSameLocation || distanceInfo.isWithin1km) {
      logger.info('Free shipping applied', {
        reason: distanceInfo.isSameLocation ? 'Same location' : 'Within 1km',
        toDistrictId,
        toWardCode
      });

      return {
        success: true,
        shippingFee: 0,
        serviceFee: 0,
        insuranceFee: 0,
        totalFee: 0,
        isFreeShipping: true,
        freeShippingReason: distanceInfo.isSameLocation 
          ? 'Cùng địa chỉ với kho hàng' 
          : 'Trong bán kính 1km',
        estimatedDeliveryTime: null
      };
    }

    // Calculate via GHN API
    logger.info('Calculating shipping fee via GHN API', { toDistrictId, toWardCode });
    const ghnResult = await calculateGHNShippingFee(params);

    return {
      ...ghnResult,
      isFreeShipping: false,
      freeShippingReason: null
    };
  } catch (error) {
    logger.error('Calculate shipping fee error', {
      error: error.message,
      params
    });

    return {
      success: false,
      shippingFee: 30000,
      error: error.message,
      isFreeShipping: false
    };
  }
};
```

### 3. Controller: `controller/ghnController.js`

```javascript
import ghnService from '../services/shipping/ghnService.js';
import shippingService from '../services/shipping/shippingService.js';
import logger from '../utils/logger.js';

export const getProvinces = async (req, res) => {
  try {
    const result = await ghnService.getProvinces();
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Không thể lấy danh sách tỉnh/thành phố',
        error: result.error
      });
    }

    return res.json({
      success: true,
      message: 'Lấy danh sách tỉnh/thành phố thành công',
      data: result.data
    });
  } catch (error) {
    logger.error('Get provinces error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const getDistricts = async (req, res) => {
  try {
    const { province_id } = req.query;
    
    if (!province_id) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp province_id'
      });
    }

    const result = await ghnService.getDistricts(Number(province_id));
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Không thể lấy danh sách quận/huyện',
        error: result.error
      });
    }

    return res.json({
      success: true,
      message: 'Lấy danh sách quận/huyện thành công',
      data: result.data
    });
  } catch (error) {
    logger.error('Get districts error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const getWards = async (req, res) => {
  try {
    const district_id = req.query.district_id || req.body.district_id;
    
    if (!district_id) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp district_id'
      });
    }

    const result = await ghnService.getWards(Number(district_id));
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Không thể lấy danh sách phường/xã',
        error: result.error
      });
    }

    return res.json({
      success: true,
      message: 'Lấy danh sách phường/xã thành công',
      data: result.data
    });
  } catch (error) {
    logger.error('Get wards error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const calculateShippingFee = async (req, res) => {
  try {
    const {
      toDistrictId,
      toWardCode,
      weight,
      length,
      width,
      height,
      codAmount,
      serviceTypeId
    } = req.body;

    if (!toDistrictId || !toWardCode) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp toDistrictId và toWardCode'
      });
    }

    const result = await shippingService.calculateShippingFee({
      toDistrictId: Number(toDistrictId),
      toWardCode,
      weight: weight ? Number(weight) : undefined,
      length: length ? Number(length) : undefined,
      width: width ? Number(width) : undefined,
      height: height ? Number(height) : undefined,
      codAmount: codAmount ? Number(codAmount) : undefined,
      serviceTypeId: serviceTypeId ? Number(serviceTypeId) : undefined
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Không thể tính phí vận chuyển',
        shippingFee: result.shippingFee || 30000,
        error: result.error
      });
    }

    return res.json({
      success: true,
      message: result.isFreeShipping 
        ? `Miễn phí vận chuyển: ${result.freeShippingReason}` 
        : 'Tính phí vận chuyển thành công',
      data: {
        shippingFee: result.shippingFee,
        serviceFee: result.serviceFee,
        insuranceFee: result.insuranceFee,
        totalFee: result.totalFee,
        estimatedDeliveryTime: result.estimatedDeliveryTime,
        isFreeShipping: result.isFreeShipping || false,
        freeShippingReason: result.freeShippingReason || null
      }
    });
  } catch (error) {
    logger.error('Calculate shipping fee error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};
```

### 4. Routes: `routes/ghnRoutes.js`

```javascript
import express from 'express';
import {
  getProvinces,
  getDistricts,
  getWards,
  calculateShippingFee
} from '../controller/ghnController.js';

const router = express.Router();

router.get('/provinces', getProvinces);
router.get('/districts', getDistricts);
router.get('/wards', getWards);
router.post('/wards', getWards); // Support both GET and POST
router.post('/calculate-shipping-fee', calculateShippingFee);

export default router;
```

---

## 🎨 Frontend Implementation

### 1. API Service: `src/api/shipping.js`

```javascript
import axiosClient from './axiosClient';

export const getProvinces = () => {
  return axiosClient.get('/ghn/provinces');
};

export const getDistricts = (provinceId) => {
  return axiosClient.get('/ghn/districts', {
    params: { province_id: provinceId }
  });
};

export const getWards = (districtId) => {
  return axiosClient.get('/ghn/wards', {
    params: { district_id: districtId }
  });
};

export const calculateShippingFee = (payload) => {
  return axiosClient.post('/ghn/calculate-shipping-fee', payload);
};
```

### 2. Address Form Component

```jsx
import { useState, useEffect } from 'react';
import { getProvinces, getDistricts, getWards } from '@/api/shipping';

export default function AddressForm({ onSubmit, initialData }) {
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  
  const [formData, setFormData] = useState({
    recipientName: '',
    phone: '',
    addressLine: '',
    provinceId: '',
    districtId: '',
    wardCode: '',
    city: '',
    district: '',
    ward: ''
  });

  // Fetch provinces on mount
  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const response = await getProvinces();
        setProvinces(response.data.data);
      } catch (error) {
        toast.error('Lỗi khi tải danh sách tỉnh/thành phố');
      }
    };
    fetchProvinces();
  }, []);

  // Fetch districts when province changes
  useEffect(() => {
    if (formData.provinceId) {
      const fetchDistricts = async () => {
        try {
          const response = await getDistricts(formData.provinceId);
          setDistricts(response.data.data);
          setWards([]); // Reset wards
        } catch (error) {
          toast.error('Lỗi khi tải danh sách quận/huyện');
        }
      };
      fetchDistricts();
    }
  }, [formData.provinceId]);

  // Fetch wards when district changes
  useEffect(() => {
    if (formData.districtId) {
      const fetchWards = async () => {
        try {
          const response = await getWards(formData.districtId);
          setWards(response.data.data);
        } catch (error) {
          toast.error('Lỗi khi tải danh sách phường/xã');
        }
      };
      fetchWards();
    }
  }, [formData.districtId]);

  const handleProvinceChange = (e) => {
    const selectedProvince = provinces.find(p => p.ProvinceID === Number(e.target.value));
    setFormData({
      ...formData,
      provinceId: e.target.value,
      city: selectedProvince?.ProvinceName || '',
      districtId: '',
      district: '',
      wardCode: '',
      ward: ''
    });
  };

  const handleDistrictChange = (e) => {
    const selectedDistrict = districts.find(d => d.DistrictID === Number(e.target.value));
    setFormData({
      ...formData,
      districtId: e.target.value,
      district: selectedDistrict?.DistrictName || '',
      wardCode: '',
      ward: ''
    });
  };

  const handleWardChange = (e) => {
    const selectedWard = wards.find(w => w.WardCode === e.target.value);
    setFormData({
      ...formData,
      wardCode: e.target.value,
      ward: selectedWard?.WardName || ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        placeholder="Họ và tên"
        value={formData.recipientName}
        onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
        required
        className="w-full border px-4 py-2 rounded"
      />

      <input
        type="tel"
        placeholder="Số điện thoại"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        required
        className="w-full border px-4 py-2 rounded"
      />

      <select
        value={formData.provinceId}
        onChange={handleProvinceChange}
        required
        className="w-full border px-4 py-2 rounded"
      >
        <option value="">Chọn Tỉnh/Thành phố</option>
        {provinces.map((province) => (
          <option key={province.ProvinceID} value={province.ProvinceID}>
            {province.ProvinceName}
          </option>
        ))}
      </select>

      <select
        value={formData.districtId}
        onChange={handleDistrictChange}
        required
        disabled={!formData.provinceId}
        className="w-full border px-4 py-2 rounded"
      >
        <option value="">Chọn Quận/Huyện</option>
        {districts.map((district) => (
          <option key={district.DistrictID} value={district.DistrictID}>
            {district.DistrictName}
          </option>
        ))}
      </select>

      <select
        value={formData.wardCode}
        onChange={handleWardChange}
        required
        disabled={!formData.districtId}
        className="w-full border px-4 py-2 rounded"
      >
        <option value="">Chọn Phường/Xã</option>
        {wards.map((ward) => (
          <option key={ward.WardCode} value={ward.WardCode}>
            {ward.WardName}
          </option>
        ))}
      </select>

      <input
        type="text"
        placeholder="Địa chỉ cụ thể (số nhà, tên đường)"
        value={formData.addressLine}
        onChange={(e) => setFormData({ ...formData, addressLine: e.target.value })}
        required
        className="w-full border px-4 py-2 rounded"
      />

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
      >
        Lưu Địa Chỉ
      </button>
    </form>
  );
}
```

---

## 🧪 Testing

### Test Get Provinces
```bash
curl -X GET http://localhost:5000/api/ghn/provinces
```

### Test Get Districts
```bash
curl -X GET "http://localhost:5000/api/ghn/districts?province_id=202"
```

### Test Get Wards
```bash
curl -X GET "http://localhost:5000/api/ghn/wards?district_id=1542"
```

### Test Calculate Shipping Fee
```bash
curl -X POST http://localhost:5000/api/ghn/calculate-shipping-fee \
  -H "Content-Type: application/json" \
  -d '{
    "toDistrictId": 1542,
    "toWardCode": "20308",
    "weight": 1000,
    "serviceTypeId": 2
  }'
```

---

## 🚀 Flow Diagram

```
Address Selection Flow:
1. User chọn Tỉnh/Thành phố
   → GET /ghn/provinces
   → Hiển thị danh sách
2. User chọn Quận/Huyện
   → GET /ghn/districts?province_id=X
   → Hiển thị danh sách
3. User chọn Phường/Xã
   → GET /ghn/wards?district_id=X
   → Hiển thị danh sách
4. User nhập địa chỉ cụ thể
5. Save address với GHN codes

Shipping Fee Calculation:
1. User chọn địa chỉ giao hàng
2. Extract districtId & wardCode
3. POST /ghn/calculate-shipping-fee
4. Backend check:
   - Same location? → 0đ
   - Within 1km? → 0đ
   - Else → Call GHN API
5. Return shipping fee
6. Display in checkout

Free Shipping Logic:
IF (toDistrict === warehouseDistrict AND toWard === warehouseWard)
  THEN shippingFee = 0
  ELSE call GHN API
```

---

## 📝 Troubleshooting

### 1. Token 401 Unauthorized
```
Lỗi: GHN API trả về 401
Giải pháp:
- Kiểm tra GHN_TOKEN trong .env
- Đảm bảo token đúng với môi trường (dev/prod)
- Token không có dấu ngoặc kép hoặc khoảng trắng
```

### 2. Không tính được phí vận chuyển
```
Lỗi: Luôn trả về phí mặc định 30k
Giải pháp:
- Kiểm tra GHN_SHOP_ID
- Kiểm tra GHN_DISTRICT_ID (kho hàng)
- Kiểm tra toDistrictId và toWardCode hợp lệ
```

### 3. Free shipping không hoạt động
```
Lỗi: Vẫn tính phí dù cùng địa chỉ
Giải pháp:
- Kiểm tra GHN_WARD_CODE (phải là string)
- Kiểm tra logic so sánh trong shippingService.js
- Log để xem districtId và wardCode có khớp không
```

---

## ✅ Checklist

- [x] GHN API configuration
- [x] Get provinces/districts/wards
- [x] Calculate shipping fee
- [x] Free shipping logic (same location/1km)
- [x] Address form with cascading selects
- [x] Store GHN codes in database
- [x] Error handling & fallback
- [x] Logging
- [x] Frontend integration
- [x] Testing endpoints
