# 📦 Hướng Dẫn Tích Hợp GHN - API Địa Chỉ & Tính Phí Vận Chuyển

## Mục Lục
1. [Tổng Quan](#tổng-quan)
2. [Chuẩn Bị](#chuẩn-bị)
3. [API 1: Lấy Địa Chỉ (Tỉnh/Quận/Phường)](#api-1-lấy-địa-chỉ-tỉnhquậnphường)
4. [API 2: Tính Phí Vận Chuyển](#api-2-tính-phí-vận-chuyển)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Implementation](#frontend-implementation)
7. [Database Schema Updates](#database-schema-updates)
8. [Testing](#testing)

---

## Tổng Quan

### Mục tiêu tích hợp
Tích hợp 2 API chính của GHN:
1. **API Lấy Địa Chỉ** - Lấy danh sách Tỉnh/Thành phố, Quận/Huyện, Phường/Xã với mã GHN
2. **API Tính Phí Vận Chuyển** - Tính phí ship dựa trên địa chỉ và thông tin đơn hàng

### Tại sao dùng API GHN thay vì API khác?
- ✅ Mã địa chỉ GHN chính xác, phù hợp với hệ thống tính phí
- ✅ Đảm bảo tính nhất quán khi tính phí vận chuyển
- ✅ Hỗ trợ đầy đủ đơn vị hành chính cũ và mới
- ✅ Cập nhật tự động từ GHN

---

## Chuẩn Bị

### 1. Đăng ký tài khoản GHN
- Truy cập: https://khachhang.ghn.vn/
- Đăng ký tài khoản và xác thực thông tin

### 2. Lấy Token API
1. Đăng nhập vào https://khachhang.ghn.vn/
2. Chọn mục **"Chủ cửa hàng"**
3. Nhấn **"Xem"** trong phần **"Token API"**
4. Copy mã Token

### 3. Lấy Shop ID
- Vào phần **"Quản lý cửa hàng"** trong dashboard GHN
- Copy **Shop ID**

### 4. Xác định địa chỉ kho hàng
Thông tin cần có:
- Tỉnh/Thành phố
- Quận/Huyện  
- Phường/Xã
- Địa chỉ chi tiết

### 5. Cài đặt biến môi trường
Thêm vào file `.env` của backend:

```env
# GHN Configuration
GHN_API_URL=https://dev-online-gateway.ghn.vn
GHN_TOKEN=your_ghn_token_here
GHN_SHOP_ID=your_shop_id_here

# Địa chỉ kho hàng (store warehouse)
GHN_WAREHOUSE_PROVINCE_ID=79  # Hồ Chí Minh
GHN_WAREHOUSE_DISTRICT_ID=1454  # Quận 1
GHN_WAREHOUSE_WARD_CODE=1A0401  # Phường Bến Nghé
GHN_WAREHOUSE_ADDRESS=Số 123, Đường ABC
```

**Lưu ý:**
- Môi trường test: `https://dev-online-gateway.ghn.vn`
- Môi trường production: `https://online-gateway.ghn.vn`

---

## API 1: Lấy Địa Chỉ (Tỉnh/Quận/Phường)

### Endpoints GHN

#### 1.1. Lấy danh sách Tỉnh/Thành phố
- **Endpoint:** `GET /shiip/public-api/master-data/province`
- **Method:** GET
- **Headers:**
  ```
  Token: {GHN_TOKEN}
  Content-Type: application/json
  ```
- **Response:**
  ```json
  {
    "code": 200,
    "message": "Success",
    "data": [
      {
        "ProvinceID": 202,
        "ProvinceName": "Hồ Chí Minh",
        "CountryID": 1,
        "Code": 8,
        "NameExtension": [
          "Hồ Chí Minh",
          "TP.Hồ Chí Minh",
          "TP. Hồ Chí Minh",
          "TP Hồ Chí Minh",
          "Thành phố Hồ Chí Minh",
          "HCM",
          "hochiminh",
          "saigon",
          "sg"
        ],
        "IsEnable": 1,
        "RegionID": 1,
        "CanUpdateCOD": "false",
        "Status": 1
      },
      ...
    ]
  }
  ```
- **Tài liệu:** https://api.ghn.vn/home/docs/detail?id=91

#### 1.2. Lấy danh sách Quận/Huyện
- **Endpoint:** `GET /shiip/public-api/master-data/district`
- **Method:** GET (hoặc POST)
- **Query Params:** `province_id` (ProvinceID)
- **Headers:**
  ```
  Token: {GHN_TOKEN}
  Content-Type: application/json
  ```
- **Response:**
  ```json
  {
    "code": 200,
    "message": "Success",
    "data": [
      {
        "DistrictID": 3695,
        "ProvinceID": 202,
        "DistrictName": "Thành Phố Thủ Đức",
        "Code": 3695,
        "Type": 3,
        "SupportType": 3,
        "NameExtension": [
          "TP Thủ Đức",
          "thành phố thủ đức",
          "TP. Thủ Đức",
          "TP. Thu Duc",
          "thuduc"
        ],
        "IsEnable": 1,
        "CanUpdateCOD": "false",
        "Status": 1
      },
      ...
    ]
  }
  ```
- **Tài liệu:** https://api.ghn.vn/home/docs/detail?id=93

#### 1.3. Lấy danh sách Phường/Xã
- **Endpoint:** `POST /shiip/public-api/master-data/ward?district_id`
- **Method:** POST (⚠️ Lưu ý: API này dùng POST, không phải GET)
- **Request Body:**
  ```json
  {
    "district_id": 1454
  }
  ```
- **Headers:**
  ```
  Token: {GHN_TOKEN}
  Content-Type: application/json
  ```
- **Response:**
  ```json
  {
    "code": 200,
    "message": "Success",
    "data": [
      {
        "WardCode": "90768",
        "DistrictID": 3695,
        "WardName": "Phường An Khánh",
        "NameExtension": ["P. An Khánh", "P. An Khanh", "ankhanh"],
        "CanUpdateCOD": "true",
        "SupportType": 3,
        "Status": 1
      },
      ...
    ]
  }
  ```
- **Tài liệu:** https://api.ghn.vn/home/docs/detail?id=92

---

## API 2: Tính Phí Vận Chuyển

### Endpoint GHN
- **Endpoint:** `POST /shiip/public-api/v2/shipping-order/fee`
- **Method:** POST
- **Headers:**
  ```
  Token: {GHN_TOKEN}
  ShopId: {GHN_SHOP_ID}
  Content-Type: application/json
  ```
- **Request Body:**
  ```json
  {
    "service_type_id": 2,
    "from_district_id": 1454,
    "to_district_id": 1455,
    "to_ward_code": "1A0402",
    "height": 20,
    "length": 20,
    "weight": 500,
    "width": 20,
    "insurance_value": 0,
    "coupon": null
  }
  ```
- **Response:**
  ```json
  {
    "code": 200,
    "message": "Success",
    "data": {
      "total": 30000,
      "service_fee": 25000,
      "insurance_fee": 0,
      "pick_station_fee": 0,
      "coupon_value": 0,
      "r2s_fee": 0,
      "return_again": 0,
      "document_return": 0,
      "double_check": 0,
      "cod_fee": 0,
      "pick_remote_areas_fee": 0,
      "deliver_remote_areas_fee": 0,
      "cod_failed_fee": 0
    }
  }
  ```

### Parameters giải thích:
- `service_type_id`: Loại dịch vụ (1: Nhanh, 2: Chuẩn, 3: Tiết kiệm)
- `from_district_id`: ID quận/huyện gửi hàng (địa chỉ kho)
- `to_district_id`: ID quận/huyện nhận hàng
- `to_ward_code`: Mã phường/xã nhận hàng (WardCode từ API Get Wards)
- `weight`: Trọng lượng (gram)
- `length`, `width`, `height`: Kích thước (cm)
- `insurance_value`: Giá trị khai báo (VNĐ)
- `cod_amount`: Tiền thu hộ (nếu COD)

### Response Fields giải thích:
- `total`: Tổng phí vận chuyển (VNĐ)
- `service_fee`: Phí dịch vụ vận chuyển
- `insurance_fee`: Phí khai giá hàng hóa
- `pick_station_fee`: Phí gửi hàng tại bưu cục
- `coupon_value`: Giá trị khuyến mãi
- `r2s_fee`: Phí giao lại hàng
- `cod_fee`: Phí thu tiền COD
- `pick_remote_areas_fee`: Phí lấy hàng vùng xa
- `deliver_remote_areas_fee`: Phí giao hàng vùng xa

- **Tài liệu:** https://api.ghn.vn/home/docs/detail?id=95

**Lưu ý:** 
- Cần lấy `service_type_id` từ API Get Service (https://api.ghn.vn/home/docs/detail?id=94) để biết dịch vụ nào khả dụng
- `from_district_id` phải là địa chỉ kho hàng của bạn (đã cấu hình trong `.env`)

---

## Backend Implementation

### 1. Tạo GHN Service

**File:** `backend/services/shipping/ghnService.js`

```javascript
import axios from 'axios';
import logger from '../../utils/logger.js';

const GHN_API_URL = process.env.GHN_API_URL || 'https://dev-online-gateway.ghn.vn';
const GHN_TOKEN = process.env.GHN_TOKEN;
const GHN_SHOP_ID = process.env.GHN_SHOP_ID;

/**
 * API 1: Lấy danh sách Tỉnh/Thành phố
 */
export const getProvinces = async () => {
  try {
    const response = await axios.get(
      `${GHN_API_URL}/shiip/public-api/master-data/province`,
      {
        headers: {
          'Token': GHN_TOKEN,
        },
      }
    );

    if (response.data.code !== 200) {
      throw new Error(response.data.message || 'Không thể lấy danh sách tỉnh/thành phố');
    }

    return {
      success: true,
      data: response.data.data || [],
    };
  } catch (error) {
    logger.error('GHN get provinces error', {
      error: error.message,
      response: error.response?.data,
    });
    return {
      success: false,
      data: [],
      error: error.message,
    };
  }
};

/**
 * API 1: Lấy danh sách Quận/Huyện
 * Theo tài liệu: https://api.ghn.vn/home/docs/detail?id=93
 */
export const getDistricts = async (provinceId) => {
  try {
    if (!provinceId) {
      return {
        success: false,
        data: [],
        error: 'Province ID is required',
      };
    }

    const response = await axios.get(
      `${GHN_API_URL}/shiip/public-api/master-data/district`,
      {
        params: {
          province_id: provinceId,
        },
        headers: {
          'Token': GHN_TOKEN,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.code !== 200) {
      throw new Error(response.data.message || 'Không thể lấy danh sách quận/huyện');
    }

    return {
      success: true,
      data: response.data.data || [],
    };
  } catch (error) {
    logger.error('GHN get districts error', {
      error: error.message,
      provinceId,
      response: error.response?.data,
    });
    return {
      success: false,
      data: [],
      error: error.message,
    };
  }
};

/**
 * API 1: Lấy danh sách Phường/Xã
 * Theo tài liệu: https://api.ghn.vn/home/docs/detail?id=92
 * Dùng POST method với district_id trong body
 */
export const getWards = async (districtId) => {
  try {
    if (!districtId) {
      return {
        success: false,
        data: [],
        error: 'District ID is required',
      };
    }

    // Theo tài liệu GHN, API này dùng POST với district_id trong body
    const response = await axios.post(
      `${GHN_API_URL}/shiip/public-api/master-data/ward?district_id`,
      {
        district_id: districtId,
      },
      {
        headers: {
          'Token': GHN_TOKEN,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.code !== 200) {
      throw new Error(response.data.message || 'Không thể lấy danh sách phường/xã');
    }

    return {
      success: true,
      data: response.data.data || [],
    };
  } catch (error) {
    logger.error('GHN get wards error', {
      error: error.message,
      districtId,
      response: error.response?.data,
    });
    return {
      success: false,
      data: [],
      error: error.message,
    };
  }
};

/**
 * API 2: Tính phí vận chuyển
 * @param {Object} params
 * @param {Number} params.toDistrictId - ID quận/huyện đích
 * @param {String} params.toWardCode - Mã phường/xã đích
 * @param {Number} params.weight - Trọng lượng (gram)
 * @param {Number} params.length - Chiều dài (cm)
 * @param {Number} params.width - Chiều rộng (cm)
 * @param {Number} params.height - Chiều cao (cm)
 * @param {Number} params.codAmount - Tiền thu hộ (nếu COD)
 * @param {Number} params.serviceTypeId - Loại dịch vụ (1: Nhanh, 2: Chuẩn, 3: Tiết kiệm)
 */
export const calculateShippingFee = async (params) => {
  try {
    const {
      toDistrictId,
      toWardCode,
      weight = 500, // Default 500g
      length = 20,
      width = 20,
      height = 20,
      codAmount = 0,
      serviceTypeId = 2, // 2 = Chuẩn
    } = params;

    if (!toDistrictId || !toWardCode) {
      return {
        success: false,
        error: 'toDistrictId and toWardCode are required',
        shippingFee: 0,
      };
    }

    const fromDistrictId = Number(process.env.GHN_WAREHOUSE_DISTRICT_ID);

    const response = await axios.post(
      `${GHN_API_URL}/shiip/public-api/v2/shipping-order/fee`,
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
        cod_amount: codAmount,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Token': GHN_TOKEN,
          'ShopId': GHN_SHOP_ID,
        },
      }
    );

    if (response.data.code !== 200) {
      throw new Error(response.data.message || 'Không thể tính phí vận chuyển');
    }

    const shippingFee = response.data.data.total || 0;
    
    logger.info('GHN calculate shipping fee', {
      toDistrictId,
      toWardCode,
      shippingFee,
    });

    return {
      success: true,
      shippingFee,
      serviceFee: response.data.data.service_fee || 0,
      insuranceFee: response.data.data.insurance_fee || 0,
      totalFee: shippingFee,
      estimatedDeliveryTime: response.data.data.estimated_delivery_time || null,
    };
  } catch (error) {
    logger.error('GHN calculate shipping fee error', {
      error: error.message,
      params,
      response: error.response?.data,
    });
    
    // Fallback: Trả về phí mặc định nếu lỗi
    return {
      success: false,
      shippingFee: 30000, // 30k default
      error: error.message,
    };
  }
};

export default {
  getProvinces,
  getDistricts,
  getWards,
  calculateShippingFee,
};
```

### 2. Tạo Controller

**File:** `backend/controller/ghnController.js`

```javascript
import ghnService from '../services/shipping/ghnService.js';
import logger from '../utils/logger.js';

/**
 * Lấy danh sách Tỉnh/Thành phố
 * GET /api/ghn/provinces
 */
export const getProvinces = async (req, res) => {
  try {
    const result = await ghnService.getProvinces();
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Không thể lấy danh sách tỉnh/thành phố',
        error: result.error,
      });
    }

    return res.json({
      success: true,
      message: 'Lấy danh sách tỉnh/thành phố thành công',
      data: result.data,
    });
  } catch (error) {
    logger.error('Get provinces error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message,
    });
  }
};

/**
 * Lấy danh sách Quận/Huyện
 * GET /api/ghn/districts?province_id=79
 */
export const getDistricts = async (req, res) => {
  try {
    const { province_id } = req.query;
    
    if (!province_id) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp province_id',
      });
    }

    const result = await ghnService.getDistricts(Number(province_id));
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Không thể lấy danh sách quận/huyện',
        error: result.error,
      });
    }

    return res.json({
      success: true,
      message: 'Lấy danh sách quận/huyện thành công',
      data: result.data,
    });
  } catch (error) {
    logger.error('Get districts error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message,
    });
  }
};

/**
 * Lấy danh sách Phường/Xã
 * Hỗ trợ cả GET (query params) và POST (body) để frontend dễ sử dụng
 * GET /api/ghn/wards?district_id=1454
 * POST /api/ghn/wards với body: { district_id: 1454 }
 */
export const getWards = async (req, res) => {
  try {
    // Hỗ trợ cả GET (query params) và POST (body)
    const district_id = req.query.district_id || req.body.district_id;
    
    if (!district_id) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp district_id',
      });
    }

    const result = await ghnService.getWards(Number(district_id));
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Không thể lấy danh sách phường/xã',
        error: result.error,
      });
    }

    return res.json({
      success: true,
      message: 'Lấy danh sách phường/xã thành công',
      data: result.data,
    });
  } catch (error) {
    logger.error('Get wards error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message,
    });
  }
};

/**
 * Tính phí vận chuyển
 * POST /api/ghn/calculate-shipping-fee
 */
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
      serviceTypeId,
    } = req.body;

    if (!toDistrictId || !toWardCode) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp toDistrictId và toWardCode',
      });
    }

    const result = await ghnService.calculateShippingFee({
      toDistrictId: Number(toDistrictId),
      toWardCode,
      weight: weight ? Number(weight) : undefined,
      length: length ? Number(length) : undefined,
      width: width ? Number(width) : undefined,
      height: height ? Number(height) : undefined,
      codAmount: codAmount ? Number(codAmount) : undefined,
      serviceTypeId: serviceTypeId ? Number(serviceTypeId) : undefined,
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Không thể tính phí vận chuyển',
        shippingFee: result.shippingFee || 30000,
        error: result.error,
      });
    }

    return res.json({
      success: true,
      message: 'Tính phí vận chuyển thành công',
      data: {
        shippingFee: result.shippingFee,
        serviceFee: result.serviceFee,
        insuranceFee: result.insuranceFee,
        totalFee: result.totalFee,
        estimatedDeliveryTime: result.estimatedDeliveryTime,
      },
    });
  } catch (error) {
    logger.error('Calculate shipping fee error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message,
    });
  }
};
```

### 3. Tạo Routes

**File:** `backend/routes/ghnRoutes.js`

```javascript
import express from 'express';
import * as ghnController from '../controller/ghnController.js';

const router = express.Router();

// API 1: Lấy địa chỉ
router.get('/provinces', ghnController.getProvinces);
router.get('/districts', ghnController.getDistricts);
router.get('/wards', ghnController.getWards);

// API 2: Tính phí vận chuyển
router.post('/calculate-shipping-fee', ghnController.calculateShippingFee);

export default router;
```

### 4. Cập nhật Routes Index

**File:** `backend/routes/index.js`

Thêm vào function routes:

```javascript
import ghnRoutes from './ghnRoutes.js';

const routes = (app) => {
  // ... existing routes ...
  
  // GHN APIs (có thể public hoặc yêu cầu auth)
  app.use('/api/ghn', ghnRoutes);
  
  // ... existing routes ...
};
```

---

## Database Schema Updates

### Cập nhật Address Model để lưu mã GHN

**File:** `backend/prisma/schema.prisma`

Cập nhật model Address:

```prisma
model Address {
  id            Int         @id @default(autoincrement())
  userId        Int         @map("user_id")
  fullName      String      @map("full_name")
  phone         String
  streetAddress String      @map("street_address")
  ward          String
  district      String
  city          String
  
  // Thêm các field mã GHN
  provinceId    Int?        @map("province_id")        // ProvinceID từ GHN
  districtId    Int?        @map("district_id")        // DistrictID từ GHN
  wardCode      String?     @map("ward_code")          // WardCode từ GHN
  
  addressType   AddressType @default(HOME) @map("address_type")
  isDefault     Boolean     @default(false) @map("is_default")
  note          String?
  createdAt     DateTime    @default(now()) @map("created_at")
  updatedAt     DateTime    @updatedAt @map("updated_at")
  user          User        @relation(fields: [userId], references: [id], onDelete: NoAction)

  @@index([userId], map: "addresses_user_id_fkey")
  @@map("addresses")
}
```

**Migration:**

```bash
cd backend
npx prisma migrate dev --name add_ghn_address_codes
```

**Cập nhật Address Controller:**

Khi tạo/cập nhật địa chỉ, lưu thêm mã GHN:

```javascript
// Trong addAddress và updateAddress
const address = await prisma.address.create({
  data: {
    // ... existing fields ...
    provinceId: req.body.provinceId || null,
    districtId: req.body.districtId || null,
    wardCode: req.body.wardCode || null,
  },
});
```

---

## Frontend Implementation

### 1. Tạo API Client

**File:** `frontend/src/api/ghn.js`

```javascript
import api from './index';

// API 1: Lấy địa chỉ
export const getProvinces = () => {
  return api.get('/ghn/provinces');
};

export const getDistricts = (provinceId) => {
  return api.get('/ghn/districts', {
    params: { province_id: provinceId },
  });
};

export const getWards = (districtId) => {
  return api.get('/ghn/wards', {
    params: { district_id: districtId },
  });
};

// API 2: Tính phí vận chuyển
export const calculateShippingFee = (data) => {
  return api.post('/ghn/calculate-shipping-fee', data);
};
```

### 2. Tạo Hook mới để dùng API GHN

**File:** `frontend/src/hooks/useGHNPlaces.js`

```javascript
import { useState, useEffect } from 'react';
import { getProvinces, getDistricts, getWards } from '@/api/ghn';

/**
 * Hook để lấy danh sách địa chỉ từ GHN API
 * Thay thế cho useVietnamesePlaces khi cần mã GHN
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

  const fetchProvinces = async () => {
    try {
      setLoading(true);
      const response = await getProvinces();
      if (response.data?.success) {
        // Format dữ liệu để tương thích với code hiện tại
        const formatted = (response.data.data || []).map((p) => ({
          code: p.ProvinceID,
          name: p.ProvinceName,
          ghnCode: p.Code,
          ProvinceID: p.ProvinceID, // Giữ nguyên để dùng sau
        }));
        setProvinces(formatted);
      }
    } catch (error) {
      console.error('Lỗi khi tải tỉnh/thành:', error);
      setProvinces([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDistricts = async (provinceId) => {
    if (!provinceId) {
      setDistricts([]);
      setWards([]);
      return;
    }
    try {
      setLoading(true);
      const response = await getDistricts(provinceId);
      if (response.data?.success) {
        // Format dữ liệu
        const formatted = (response.data.data || []).map((d) => ({
          code: d.DistrictID,
          name: d.DistrictName,
          ghnCode: d.Code,
          ProvinceID: d.ProvinceID,
          DistrictID: d.DistrictID, // Giữ nguyên để dùng sau
        }));
        setDistricts(formatted);
        setWards([]); // Reset wards khi đổi tỉnh
      }
    } catch (error) {
      console.error('Lỗi khi tải quận/huyện:', error);
      setDistricts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchWards = async (districtId) => {
    if (!districtId) {
      setWards([]);
      return;
    }
    try {
      setLoading(true);
      const response = await getWards(districtId);
      if (response.data?.success) {
        // Format dữ liệu
        const formatted = (response.data.data || []).map((w) => ({
          code: w.WardCode, // WardCode là string
          name: w.WardName,
          WardCode: w.WardCode, // Giữ nguyên để dùng sau
          DistrictID: w.DistrictID,
        }));
        setWards(formatted);
      }
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
```

### 3. Tạo Hook tính phí vận chuyển

**File:** `frontend/src/hooks/useShippingFee.js`

```javascript
import { useState } from 'react';
import { calculateShippingFee as calculateGHNFee } from '@/api/ghn';

/**
 * Hook để tính phí vận chuyển từ GHN
 */
export const useShippingFee = () => {
  const [shippingFee, setShippingFee] = useState(0);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState(null);

  const calculate = async (params) => {
    const {
      toDistrictId,
      toWardCode,
      weight = 500,
      length = 20,
      width = 20,
      height = 20,
      codAmount = 0,
      serviceTypeId = 2,
    } = params;

    if (!toDistrictId || !toWardCode) {
      setShippingFee(0);
      setError('Thiếu thông tin địa chỉ');
      return;
    }

    try {
      setCalculating(true);
      setError(null);
      
      const response = await calculateGHNFee({
        toDistrictId,
        toWardCode,
        weight,
        length,
        width,
        height,
        codAmount,
        serviceTypeId,
      });

      if (response.data?.success) {
        setShippingFee(response.data.data.shippingFee || 0);
      } else {
        setShippingFee(response.data?.data?.shippingFee || 30000); // Fallback
        setError(response.data?.error || 'Không thể tính phí');
      }
    } catch (err) {
      console.error('Lỗi tính phí vận chuyển:', err);
      setShippingFee(30000); // Fallback
      setError('Lỗi tính phí vận chuyển');
    } finally {
      setCalculating(false);
    }
  };

  const reset = () => {
    setShippingFee(0);
    setError(null);
    setCalculating(false);
  };

  return {
    shippingFee,
    calculating,
    error,
    calculate,
    reset,
  };
};
```

### 4. Cập nhật Checkout để dùng API GHN

**File:** `frontend/src/pages/user/checkout/useCheckout.js`

Thay đổi hook để dùng `useGHNPlaces` và tính phí ship:

```javascript
import { useGHNPlaces } from '@/hooks/useGHNPlaces';
import { useShippingFee } from '@/hooks/useShippingFee';

export function useCheckout() {
  // ... existing code ...
  
  // Thay đổi từ useVietnamesePlaces sang useGHNPlaces
  const { provinces, districts, wards, fetchDistricts, fetchWards } = useGHNPlaces();
  
  // Thêm hook tính phí ship
  const { shippingFee, calculating: calculatingShipping, calculate: calculateShippingFee } = useShippingFee();
  
  // Tính phí ship khi địa chỉ thay đổi
  useEffect(() => {
    if (selectedAddress?.districtId && selectedAddress?.wardCode) {
      calculateShippingFee({
        toDistrictId: selectedAddress.districtId,
        toWardCode: selectedAddress.wardCode,
        weight: 500, // Tính từ items thực tế
      });
    }
  }, [selectedAddress]);
  
  // Cập nhật summary với shippingFee
  const summary = useMemo(() => {
    const subtotal = checkoutItems.reduce((sum, item) => {
      const price = Number(item?.final_price ?? item?.product?.price ?? 0);
      return sum + price * item.quantity;
    }, 0);
    
    return {
      subtotal,
      shippingFee,
      discount: 0,
      total: subtotal + shippingFee,
    };
  }, [checkoutItems, shippingFee]);
  
  // ... rest of code ...
}
```

---

## Testing

### 1. Test API Lấy Địa Chỉ

```bash
# Test lấy tỉnh/thành phố
curl http://localhost:5000/api/ghn/provinces

# Test lấy quận/huyện
curl "http://localhost:5000/api/ghn/districts?province_id=202"

# Test lấy phường/xã (Lưu ý: API này dùng POST trong backend, nhưng frontend có thể gọi qua GET với query params)
curl -X POST "http://localhost:5000/api/ghn/wards?district_id=3695" \
  -H "Content-Type: application/json"
```

**Lưu ý:** API Get Wards của GHN yêu cầu POST method với `district_id` trong body, nhưng backend có thể wrap lại để frontend gọi đơn giản hơn.

### 2. Test API Tính Phí Vận Chuyển

```bash
curl -X POST http://localhost:5000/api/ghn/calculate-shipping-fee \
  -H "Content-Type: application/json" \
  -d '{
    "toDistrictId": 1455,
    "toWardCode": "1A0402",
    "weight": 500,
    "length": 20,
    "width": 20,
    "height": 20
  }'
```

---

## Checklist Implementation

### Backend
- [ ] Thêm biến môi trường GHN vào `.env`
- [ ] Tạo GHN Service (`services/shipping/ghnService.js`)
- [ ] Tạo GHN Controller (`controller/ghnController.js`)
- [ ] Tạo GHN Routes (`routes/ghnRoutes.js`)
- [ ] Cập nhật Routes Index
- [ ] Cập nhật Database Schema (thêm mã GHN vào Address)
- [ ] Chạy migration

### Frontend
- [ ] Tạo API client (`api/ghn.js`)
- [ ] Tạo hook `useGHNPlaces`
- [ ] Tạo hook `useShippingFee`
- [ ] Cập nhật Checkout để dùng API GHN
- [ ] Cập nhật Address Form để lưu mã GHN
- [ ] Hiển thị phí ship trong Checkout

### Testing
- [ ] Test API lấy tỉnh/quận/phường
- [ ] Test API tính phí vận chuyển
- [ ] Test UI chọn địa chỉ
- [ ] Test tính phí ship khi đổi địa chỉ

---

## Tài Liệu Tham Khảo

- **GHN API Documentation:** https://api.ghn.vn/
- **GHN Developer Portal:** https://dev.ghn.vn/
- **GHN Support:** api@ghn.vn

---

**Chúc bạn tích hợp thành công! 🚀**
