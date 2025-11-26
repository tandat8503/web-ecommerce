# 📦 Hướng Dẫn Tích Hợp GHN (Giao Hàng Nhanh)

## Mục Lục
1. [Tổng Quan](#tổng-quan)
2. [Chuẩn Bị](#chuẩn-bị)
3. [Cấu Trúc Cần Thay Đổi](#cấu-trúc-cần-thay-đổi)
4. [Backend Integration](#backend-integration)
5. [Frontend Integration](#frontend-integration)
6. [Webhook & Tracking](#webhook--tracking)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Tổng Quan

### GHN là gì?
GHN (Giao Hàng Nhanh) là dịch vụ vận chuyển hàng hóa tại Việt Nam, cung cấp API để tích hợp vào hệ thống e-commerce.

### Những gì cần tích hợp?

#### ✅ Bắt buộc:
1. **Tính phí vận chuyển (Shipping Fee Calculation)**
   - Lấy giá cước vận chuyển dựa trên: địa chỉ giao hàng, trọng lượng, giá trị đơn hàng
   - Hiển thị phí ship trước khi khách đặt hàng

2. **Tạo đơn hàng vận chuyển (Create Shipping Order)**
   - Khi admin xác nhận đơn hàng → Tự động tạo đơn trên GHN
   - Lưu mã vận đơn (tracking code) vào database

3. **Theo dõi đơn hàng (Order Tracking)**
   - Hiển thị trạng thái vận chuyển từ GHN
   - Cập nhật trạng thái đơn hàng tự động

#### ⚡ Tùy chọn (nâng cao):
4. **Webhook cập nhật trạng thái**
   - GHN gửi webhook khi có thay đổi trạng thái
   - Tự động cập nhật status trong database

5. **Đối soát COD**
   - Tính toán tiền thu hộ
   - Báo cáo đối soát với GHN

---

## Chuẩn Bị

### 1. Đăng ký tài khoản GHN
- Truy cập: https://khachhang.ghn.vn/
- Đăng ký tài khoản và xác thực thông tin
- Đăng nhập vào hệ thống

### 2. Lấy Token API
1. Đăng nhập vào https://khachhang.ghn.vn/
2. Chọn mục **"Chủ cửa hàng"**
3. Nhấn **"Xem"** trong phần **"Token API"**
4. Copy mã Token (VD: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

### 3. Lấy Shop ID
- Vào phần **"Quản lý cửa hàng"** trong dashboard GHN
- Copy **Shop ID** (VD: `123456`)

### 4. Xác định địa chỉ kho hàng
- Địa chỉ cửa hàng/kho hàng của bạn (để tính phí ship)
- Thông tin cần: Tỉnh/Thành phố, Quận/Huyện, Phường/Xã, Địa chỉ chi tiết

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

# Webhook URL (nếu có)
GHN_WEBHOOK_URL=https://yourdomain.com/api/ghn/webhook
```

**Lưu ý:** 
- Môi trường test: `https://dev-online-gateway.ghn.vn`
- Môi trường production: `https://online-gateway.ghn.vn`

---

## Cấu Trúc Cần Thay Đổi

### 1. Database Schema - Cập nhật Order Model

Order model hiện tại đã có các field cần thiết:
- ✅ `shippingFee` - Đã có
- ✅ `shippingAddress` - Đã có (ward, district, city)
- ✅ `trackingCode` - Đã có nhưng chưa được sử dụng

**Cần thêm:**

```prisma
model Order {
  // ... existing fields ...
  
  // GHN Integration
  ghnOrderCode     String?  @map("ghn_order_code")      // Mã đơn hàng GHN
  ghnShopId        String?  @map("ghn_shop_id")         // Shop ID trên GHN
  shippingMethod   String?  @map("shipping_method")     // Phương thức ship (EXPRESS, STANDARD, ...)
  codAmount        Decimal? @map("cod_amount")          @db.Decimal(12, 2)  // Tiền thu hộ (nếu COD)
  
  @@map("orders")
}
```

**Migration:**
```bash
cd backend
npx prisma migrate dev --name add_ghn_fields
```

### 2. Thêm Model cho Lịch sử Vận chuyển (optional nhưng khuyến nghị)

```prisma
model ShippingHistory {
  id          Int      @id @default(autoincrement())
  orderId     Int      @map("order_id")
  status      String   // Trạng thái vận chuyển từ GHN
  message     String?  // Thông điệp
  updatedAt   DateTime @default(now()) @map("updated_at")
  order       Order    @relation(fields: [orderId], references: [id])
  
  @@index([orderId])
  @@map("shipping_history")
}

// Thêm vào Order model:
model Order {
  // ... existing fields ...
  shippingHistories ShippingHistory[]
}
```

---

## Backend Integration

### 1. Tạo GHN Service

**File:** `backend/services/shipping/ghnService.js`

```javascript
import axios from 'axios';
import logger from '../../utils/logger.js';

const GHN_API_URL = process.env.GHN_API_URL || 'https://dev-online-gateway.ghn.vn';
const GHN_TOKEN = process.env.GHN_TOKEN;
const GHN_SHOP_ID = process.env.GHN_SHOP_ID;

// Helper: Lấy mã tỉnh/quận/phường từ tên (cần mapping hoặc dùng API GHN)
const getProvinceId = async (provinceName) => {
  // GHN có API lấy danh sách tỉnh
  // Hoặc dùng mapping table trong DB
  // Tạm thời hardcode một số tỉnh phổ biến
  const provinceMapping = {
    'Hồ Chí Minh': 79,
    'Hà Nội': 1,
    'Đà Nẵng': 48,
    // ... thêm các tỉnh khác
  };
  return provinceMapping[provinceName] || null;
};

/**
 * Tính phí vận chuyển
 * @param {Object} params
 * @param {Number} params.toDistrictId - Mã quận/huyện đích
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

    const fromDistrictId = Number(process.env.GHN_WAREHOUSE_DISTRICT_ID);
    const fromWardCode = process.env.GHN_WAREHOUSE_WARD_CODE;

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

/**
 * Lấy danh sách dịch vụ vận chuyển khả dụng
 */
export const getAvailableServices = async (toDistrictId, toWardCode) => {
  try {
    const fromDistrictId = Number(process.env.GHN_WAREHOUSE_DISTRICT_ID);
    
    const response = await axios.post(
      `${GHN_API_URL}/shiip/public-api/v2/shipping-order/available-services`,
      {
        shop_id: Number(GHN_SHOP_ID),
        from_district: fromDistrictId,
        to_district: toDistrictId,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Token': GHN_TOKEN,
        },
      }
    );

    if (response.data.code !== 200) {
      throw new Error(response.data.message || 'Không thể lấy danh sách dịch vụ');
    }

    return {
      success: true,
      services: response.data.data || [],
    };
  } catch (error) {
    logger.error('GHN get available services error', {
      error: error.message,
    });
    return {
      success: false,
      services: [],
      error: error.message,
    };
  }
};

/**
 * Tạo đơn hàng vận chuyển trên GHN
 * @param {Object} params
 */
export const createShippingOrder = async (params) => {
  try {
    const {
      orderId,
      orderNumber,
      toName,
      toPhone,
      toAddress,
      toWardCode,
      toDistrictId,
      toProvinceId,
      weight,
      length,
      width,
      height,
      codAmount,
      items,
      note,
      serviceTypeId = 2,
    } = params;

    const fromDistrictId = Number(process.env.GHN_WAREHOUSE_DISTRICT_ID);
    const fromWardCode = process.env.GHN_WAREHOUSE_WARD_CODE;
    const fromAddress = process.env.GHN_WAREHOUSE_ADDRESS;

    // Mô tả hàng hóa
    const itemsDescription = items
      .map((item) => `${item.productName} x${item.quantity}`)
      .join(', ');

    const requestBody = {
      payment_type_id: codAmount > 0 ? 1 : 2, // 1: COD, 2: Shop thu tiền
      note: note || '',
      required_note: 'KHONGCHOXEMHANG',
      to_name: toName,
      to_phone: toPhone,
      to_address: toAddress,
      to_ward_code: toWardCode,
      to_district_id: toDistrictId,
      to_province_id: toProvinceId,
      weight: weight || 500,
      length: length || 20,
      width: width || 20,
      height: height || 20,
      cod_amount: codAmount || 0,
      service_type_id: serviceTypeId,
      service_id: null,
      items: items.map((item) => ({
        name: item.productName,
        code: item.productSku || '',
        quantity: item.quantity,
        price: Math.round(Number(item.unitPrice)),
        weight: Math.round((item.weight || 100) * item.quantity),
      })),
      client_order_code: orderNumber,
      content: itemsDescription,
    };

    const response = await axios.post(
      `${GHN_API_URL}/shiip/public-api/v2/shipping-order/create`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Token': GHN_TOKEN,
          'ShopId': GHN_SHOP_ID,
        },
      }
    );

    if (response.data.code !== 200) {
      throw new Error(response.data.message || 'Không thể tạo đơn hàng vận chuyển');
    }

    const ghnOrderCode = response.data.data.order_code;
    const trackingCode = response.data.data.order_code; // GHN dùng order_code làm tracking code

    logger.info('GHN create shipping order success', {
      orderId,
      orderNumber,
      ghnOrderCode,
      trackingCode,
    });

    return {
      success: true,
      ghnOrderCode,
      trackingCode,
      expectedDeliveryTime: response.data.data.expected_delivery_time || null,
      fee: response.data.data.total_fee || 0,
    };
  } catch (error) {
    logger.error('GHN create shipping order error', {
      error: error.message,
      response: error.response?.data,
      orderId: params.orderId,
    });
    
    throw error;
  }
};

/**
 * Lấy thông tin đơn hàng vận chuyển
 */
export const getShippingOrderInfo = async (ghnOrderCode) => {
  try {
    const response = await axios.get(
      `${GHN_API_URL}/shiip/public-api/v2/shipping-order/detail`,
      {
        params: {
          order_code: ghnOrderCode,
        },
        headers: {
          'Token': GHN_TOKEN,
          'ShopId': GHN_SHOP_ID,
        },
      }
    );

    if (response.data.code !== 200) {
      throw new Error(response.data.message || 'Không thể lấy thông tin đơn hàng');
    }

    return {
      success: true,
      data: response.data.data,
      status: response.data.data.status,
      currentStatus: response.data.data.current_status,
    };
  } catch (error) {
    logger.error('GHN get shipping order info error', {
      error: error.message,
      ghnOrderCode,
    });
    throw error;
  }
};

/**
 * Lấy lịch sử vận chuyển
 */
export const getShippingHistory = async (ghnOrderCode) => {
  try {
    const response = await axios.get(
      `${GHN_API_URL}/shiip/public-api/v2/shipping-order/leadtime`,
      {
        params: {
          order_codes: [ghnOrderCode],
        },
        headers: {
          'Token': GHN_TOKEN,
          'ShopId': GHN_SHOP_ID,
        },
      }
    );

    if (response.data.code !== 200) {
      throw new Error(response.data.message || 'Không thể lấy lịch sử vận chuyển');
    }

    return {
      success: true,
      history: response.data.data || [],
    };
  } catch (error) {
    logger.error('GHN get shipping history error', {
      error: error.message,
      ghnOrderCode,
    });
    return {
      success: false,
      history: [],
      error: error.message,
    };
  }
};

/**
 * Hủy đơn hàng vận chuyển
 */
export const cancelShippingOrder = async (ghnOrderCode) => {
  try {
    const response = await axios.post(
      `${GHN_API_URL}/shiip/public-api/v2/switch-status/cancel`,
      {
        order_codes: [ghnOrderCode],
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
      throw new Error(response.data.message || 'Không thể hủy đơn hàng');
    }

    return {
      success: true,
    };
  } catch (error) {
    logger.error('GHN cancel shipping order error', {
      error: error.message,
      ghnOrderCode,
    });
    throw error;
  }
};

export default {
  calculateShippingFee,
  getAvailableServices,
  createShippingOrder,
  getShippingOrderInfo,
  getShippingHistory,
  cancelShippingOrder,
};
```

### 2. Tạo Controller cho Shipping

**File:** `backend/controller/shippingController.js`

```javascript
import ghnService from '../services/shipping/ghnService.js';
import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';

/**
 * Tính phí vận chuyển
 * POST /api/shipping/calculate-fee
 */
export const calculateShippingFee = async (req, res) => {
  try {
    const { addressId, items } = req.body;
    
    if (!addressId) {
      return res.status(400).json({ message: 'Vui lòng chọn địa chỉ giao hàng' });
    }

    // Lấy địa chỉ
    const address = await prisma.address.findUnique({
      where: { id: Number(addressId) },
    });

    if (!address) {
      return res.status(404).json({ message: 'Không tìm thấy địa chỉ' });
    }

    // TODO: Cần mapping tên tỉnh/quận/phường sang mã GHN
    // Tạm thời dùng API hoặc bảng mapping
    // Để đơn giản, có thể lưu mã GHN vào bảng Address khi tạo địa chỉ
    
    // Tính tổng trọng lượng (giả định mỗi sản phẩm 500g nếu không có)
    const totalWeight = items?.reduce((sum, item) => {
      return sum + (item.weight || 500) * (item.quantity || 1);
    }, 0) || 500;

    // TODO: Cần có mapping district/ward code từ địa chỉ
    // Ví dụ: Lưu thêm districtCode, wardCode vào bảng Address
    const result = await ghnService.calculateShippingFee({
      toDistrictId: address.districtCode || null, // Cần thêm field này
      toWardCode: address.wardCode || null, // Cần thêm field này
      weight: totalWeight,
      length: 20,
      width: 20,
      height: 20,
      codAmount: 0, // Sẽ tính sau nếu COD
    });

    if (!result.success) {
      // Fallback: Trả về phí mặc định
      return res.json({
        success: true,
        shippingFee: result.shippingFee || 30000,
        estimatedDeliveryTime: null,
        error: result.error,
      });
    }

    return res.json({
      success: true,
      shippingFee: result.shippingFee,
      serviceFee: result.serviceFee,
      insuranceFee: result.insuranceFee,
      totalFee: result.totalFee,
      estimatedDeliveryTime: result.estimatedDeliveryTime,
    });
  } catch (error) {
    logger.error('Calculate shipping fee error', { error: error.message });
    return res.status(500).json({
      message: 'Lỗi tính phí vận chuyển',
      error: error.message,
    });
  }
};

/**
 * Tạo đơn hàng vận chuyển (chỉ admin)
 * POST /api/admin/shipping/create/:orderId
 */
export const createShippingOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { serviceTypeId } = req.body;

    // Lấy đơn hàng
    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
      include: {
        orderItems: {
          include: {
            product: true,
            variant: true,
          },
        },
        user: true,
      },
    });

    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    // Kiểm tra đã tạo đơn vận chuyển chưa
    if (order.ghnOrderCode) {
      return res.status(400).json({
        message: 'Đơn hàng đã được tạo trên GHN',
        ghnOrderCode: order.ghnOrderCode,
      });
    }

    // Parse shipping address
    let shippingAddress;
    try {
      shippingAddress = typeof order.shippingAddress === 'string'
        ? JSON.parse(order.shippingAddress)
        : order.shippingAddress;
    } catch (e) {
      return res.status(400).json({ message: 'Địa chỉ giao hàng không hợp lệ' });
    }

    // TODO: Cần có mapping district/ward code
    // Tính trọng lượng và kích thước
    let totalWeight = 0;
    order.orderItems.forEach((item) => {
      const itemWeight = item.variant?.weight || 500; // gram
      totalWeight += itemWeight * item.quantity;
    });

    // Tạo đơn vận chuyển trên GHN
    const result = await ghnService.createShippingOrder({
      orderId: order.id,
      orderNumber: order.orderNumber,
      toName: shippingAddress.fullName,
      toPhone: shippingAddress.phone,
      toAddress: shippingAddress.streetAddress,
      toWardCode: shippingAddress.wardCode, // Cần có
      toDistrictId: shippingAddress.districtCode, // Cần có
      toProvinceId: shippingAddress.provinceCode, // Cần có
      weight: totalWeight,
      length: 20,
      width: 20,
      height: 20,
      codAmount: order.paymentMethod === 'COD' ? Number(order.totalAmount) : 0,
      items: order.orderItems.map((item) => ({
        productName: item.productName,
        productSku: item.productSku,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        weight: item.variant?.weight || 500,
      })),
      note: order.customerNote || '',
      serviceTypeId: serviceTypeId || 2,
    });

    // Cập nhật đơn hàng với mã GHN
    await prisma.order.update({
      where: { id: order.id },
      data: {
        ghnOrderCode: result.ghnOrderCode,
        trackingCode: result.trackingCode,
        shippingMethod: serviceTypeId === 1 ? 'EXPRESS' : serviceTypeId === 2 ? 'STANDARD' : 'ECONOMY',
        codAmount: order.paymentMethod === 'COD' ? order.totalAmount : null,
      },
    });

    logger.info('GHN order created', {
      orderId: order.id,
      ghnOrderCode: result.ghnOrderCode,
    });

    return res.json({
      success: true,
      message: 'Tạo đơn hàng vận chuyển thành công',
      data: {
        ghnOrderCode: result.ghnOrderCode,
        trackingCode: result.trackingCode,
        expectedDeliveryTime: result.expectedDeliveryTime,
      },
    });
  } catch (error) {
    logger.error('Create shipping order error', {
      error: error.message,
      orderId: req.params.orderId,
    });
    return res.status(500).json({
      message: 'Lỗi tạo đơn hàng vận chuyển',
      error: error.message,
    });
  }
};

/**
 * Lấy thông tin đơn hàng vận chuyển
 * GET /api/shipping/track/:orderId
 */
export const trackOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.id; // User hoặc admin

    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
      select: {
        id: true,
        orderNumber: true,
        userId: true,
        ghnOrderCode: true,
        trackingCode: true,
      },
    });

    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    // Kiểm tra quyền: User chỉ xem đơn của mình
    if (userId && order.userId !== userId && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }

    if (!order.ghnOrderCode) {
      return res.json({
        success: false,
        message: 'Đơn hàng chưa được gửi vận chuyển',
      });
    }

    // Lấy thông tin từ GHN
    const orderInfo = await ghnService.getShippingOrderInfo(order.ghnOrderCode);
    const history = await ghnService.getShippingHistory(order.ghnOrderCode);

    return res.json({
      success: true,
      data: {
        ghnOrderCode: order.ghnOrderCode,
        trackingCode: order.trackingCode,
        status: orderInfo.status,
        currentStatus: orderInfo.currentStatus,
        history: history.history || [],
        orderInfo: orderInfo.data,
      },
    });
  } catch (error) {
    logger.error('Track order error', {
      error: error.message,
      orderId: req.params.orderId,
    });
    return res.status(500).json({
      message: 'Lỗi lấy thông tin vận chuyển',
      error: error.message,
    });
  }
};
```

### 3. Tạo Routes

**File:** `backend/routes/shippingRoutes.js`

```javascript
import express from 'express';
import * as shippingController from '../controller/shippingController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public routes (hoặc yêu cầu auth)
router.post('/calculate-fee', authenticate, shippingController.calculateShippingFee);
router.get('/track/:orderId', authenticate, shippingController.trackOrder);

export default router;
```

**File:** `backend/routes/adminShippingRoutes.js`

```javascript
import express from 'express';
import * as shippingController from '../controller/shippingController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Admin routes
router.post('/create/:orderId', authenticate, requireAdmin, shippingController.createShippingOrder);

export default router;
```

**Cập nhật:** `backend/routes/index.js`

```javascript
import shippingRoutes from './shippingRoutes.js';
import adminShippingRoutes from './adminShippingRoutes.js';

const routes = (app) => {
  // ... existing routes ...
  
  app.use('/api/shipping', shippingRoutes);
  app.use('/api/admin/shipping', adminShippingRoutes);
  
  // ... existing routes ...
};
```

### 4. Cập nhật Order Controller

Cập nhật `backend/controller/orderController.js` để tính phí ship từ GHN:

```javascript
import ghnService from '../services/shipping/ghnService.js';

// Trong hàm createOrder, thay đổi phần tính shippingFee:
// BƯỚC 4: Tính tổng đơn
const discountAmount = 0;

// Tính phí ship từ GHN (nếu có địa chỉ)
let shippingFee = 0;
if (shippingAddress) {
  try {
    // TODO: Cần mapping district/ward code
    const shippingResult = await ghnService.calculateShippingFee({
      toDistrictId: shippingAddress.districtCode,
      toWardCode: shippingAddress.wardCode,
      weight: 500, // Tính từ items thực tế
      // ... other params
    });
    
    if (shippingResult.success) {
      shippingFee = shippingResult.shippingFee;
    }
  } catch (error) {
    logger.warn('Failed to calculate shipping fee, using default', { error: error.message });
    shippingFee = 30000; // Fallback
  }
}

const totalAmount = subtotal + shippingFee - discountAmount;
```

### 5. Webhook Handler

**File:** `backend/controller/ghnWebhookController.js`

```javascript
import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';

/**
 * Webhook từ GHN khi có thay đổi trạng thái
 * POST /api/ghn/webhook
 */
export const handleGHNWebhook = async (req, res) => {
  try {
    const { OrderCode, Status, UpdatedDate } = req.body;

    if (!OrderCode) {
      return res.status(400).json({ message: 'Missing OrderCode' });
    }

    // Tìm đơn hàng theo GHN order code
    const order = await prisma.order.findFirst({
      where: { ghnOrderCode: OrderCode },
    });

    if (!order) {
      logger.warn('GHN webhook: Order not found', { OrderCode });
      return res.status(404).json({ message: 'Order not found' });
    }

    // Mapping trạng thái GHN sang trạng thái Order
    const statusMapping = {
      'ready_to_pick': 'CONFIRMED',
      'picking': 'PROCESSING',
      'storing': 'PROCESSING',
      'transporting': 'PROCESSING',
      'sorting': 'PROCESSING',
      'delivering': 'PROCESSING',
      'delivered': 'DELIVERED',
      'return': 'CANCELLED',
      'cancel': 'CANCELLED',
    };

    const newStatus = statusMapping[Status] || order.status;

    // Cập nhật trạng thái đơn hàng
    if (newStatus !== order.status) {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: newStatus },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: newStatus,
          },
        });
      });

      logger.info('GHN webhook: Order status updated', {
        orderId: order.id,
        OrderCode,
        oldStatus: order.status,
        newStatus,
      });
    }

    // Lưu lịch sử vận chuyển (nếu có model ShippingHistory)
    // await prisma.shippingHistory.create({...});

    return res.json({ success: true });
  } catch (error) {
    logger.error('GHN webhook error', {
      error: error.message,
      body: req.body,
    });
    return res.status(500).json({ message: 'Webhook error' });
  }
};
```

**Route:** Thêm vào `backend/routes/index.js`

```javascript
import * as ghnWebhookController from './controller/ghnWebhookController.js';

// Webhook route (không cần auth, nhưng nên verify IP hoặc signature)
app.post('/api/ghn/webhook', ghnWebhookController.handleGHNWebhook);
```

---

## Frontend Integration

### 1. API Client

**File:** `frontend/src/api/shipping.js`

```javascript
import api from './index';

export const calculateShippingFee = (data) => {
  return api.post('/shipping/calculate-fee', data);
};

export const trackOrder = (orderId) => {
  return api.get(`/shipping/track/${orderId}`);
};
```

### 2. Cập nhật Checkout Hook

**File:** `frontend/src/pages/user/checkout/useCheckout.js`

Thêm tính phí ship khi chọn địa chỉ:

```javascript
import { calculateShippingFee } from '@/api/shipping';

// Thêm state
const [shippingFee, setShippingFee] = useState(0);
const [calculatingShipping, setCalculatingShipping] = useState(false);

// Hàm tính phí ship
const calculateShipping = async (addressId) => {
  if (!addressId) {
    setShippingFee(0);
    return;
  }

  try {
    setCalculatingShipping(true);
    const items = checkoutItems.map((item) => ({
      quantity: item.quantity,
      weight: item.variant?.weight || 500,
    }));

    const response = await calculateShippingFee({
      addressId,
      items,
    });

    if (response.data?.success) {
      setShippingFee(response.data.shippingFee || 0);
    }
  } catch (error) {
    console.error('Lỗi tính phí ship:', error);
    setShippingFee(30000); // Fallback
  } finally {
    setCalculatingShipping(false);
  }
};

// Gọi khi địa chỉ thay đổi
useEffect(() => {
  if (selectedAddressId) {
    calculateShipping(selectedAddressId);
  }
}, [selectedAddressId, checkoutItems]);

// Cập nhật summary
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
```

### 3. Cập nhật UI Checkout

**File:** `frontend/src/pages/user/checkout/Checkout.jsx`

Thêm hiển thị phí ship trong phần tổng tiền:

```jsx
{/* Trong phần tổng tiền */}
<div className="flex justify-between">
  <span>Phí vận chuyển:</span>
  <span>
    {calculatingShipping ? (
      <span className="text-gray-400">Đang tính...</span>
    ) : (
      formatPrice(summary.shippingFee)
    )}
  </span>
</div>
```

### 4. Component Tracking Order

**File:** `frontend/src/components/user/OrderTracking.jsx`

```javascript
import { useEffect, useState } from 'react';
import { trackOrder } from '@/api/shipping';

export default function OrderTracking({ orderId }) {
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTracking = async () => {
      try {
        const response = await trackOrder(orderId);
        if (response.data?.success) {
          setTrackingData(response.data.data);
        }
      } catch (error) {
        console.error('Lỗi lấy thông tin tracking:', error);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchTracking();
    }
  }, [orderId]);

  if (loading) return <div>Đang tải...</div>;
  if (!trackingData) return <div>Chưa có thông tin vận chuyển</div>;

  return (
    <div>
      <h3>Theo dõi đơn hàng</h3>
      <p>Mã vận đơn: {trackingData.trackingCode}</p>
      <p>Trạng thái: {trackingData.currentStatus}</p>
      
      {/* Timeline */}
      <div>
        {trackingData.history.map((item, index) => (
          <div key={index}>
            <p>{item.status}</p>
            <p>{item.time}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Webhook & Tracking

### 1. Cấu hình Webhook trên GHN

1. Đăng nhập vào https://khachhang.ghn.vn/
2. Vào **"Cài đặt"** → **"Webhook"**
3. Nhập URL: `https://yourdomain.com/api/ghn/webhook`
4. Chọn các sự kiện cần nhận:
   - Đơn hàng được lấy
   - Đơn hàng đang giao
   - Đơn hàng đã giao
   - Đơn hàng hủy

### 2. Xác thực Webhook (bảo mật)

Thêm xác thực IP hoặc signature trong webhook handler:

```javascript
// Chỉ cho phép IP của GHN
const GHN_IP_WHITELIST = ['...']; // Danh sách IP GHN

export const handleGHNWebhook = async (req, res) => {
  const clientIp = req.ip || req.connection.remoteAddress;
  
  // TODO: Verify IP (hoặc signature nếu GHN hỗ trợ)
  
  // ... rest of code
};
```

---

## Testing

### 1. Test tính phí vận chuyển

```bash
# Test API
curl -X POST http://localhost:5000/api/shipping/calculate-fee \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "addressId": 1,
    "items": [
      {"quantity": 1, "weight": 500}
    ]
  }'
```

### 2. Test tạo đơn vận chuyển

Admin tạo đơn vận chuyển từ admin panel sau khi xác nhận đơn hàng.

### 3. Test Webhook

Sử dụng tool như ngrok để test webhook local:

```bash
ngrok http 5000
# Copy URL và cấu hình trên GHN
```

---

## Troubleshooting

### Lỗi thường gặp:

1. **"Invalid Token"**
   - Kiểm tra `GHN_TOKEN` trong `.env`
   - Đảm bảo token đúng môi trường (dev/prod)

2. **"District/Ward not found"**
   - Cần mapping đúng mã tỉnh/quận/phường
   - Sử dụng API GHN để lấy danh sách

3. **"Cannot calculate shipping fee"**
   - Kiểm tra địa chỉ kho hàng đã đúng chưa
   - Kiểm tra địa chỉ giao hàng có mã GHN chưa

4. **Webhook không nhận được**
   - Kiểm tra URL webhook có public không
   - Kiểm tra firewall/security settings

---

## Checklist Tích Hợp

### Backend
- [ ] Thêm biến môi trường GHN
- [ ] Tạo GHN Service (`services/shipping/ghnService.js`)
- [ ] Tạo Shipping Controller
- [ ] Tạo Routes
- [ ] Cập nhật Order Controller để tính phí ship
- [ ] Tạo Webhook Handler
- [ ] Cập nhật Database Schema (nếu cần)

### Frontend
- [ ] Tạo API client cho shipping
- [ ] Cập nhật Checkout để tính phí ship
- [ ] Hiển thị phí ship trong UI
- [ ] Tạo component Tracking Order
- [ ] Hiển thị tracking trong Order Detail

### Admin
- [ ] Tạo nút "Tạo đơn vận chuyển" trong Admin Orders
- [ ] Hiển thị mã vận đơn trong Order Detail
- [ ] Cập nhật trạng thái tự động từ webhook

### Testing
- [ ] Test tính phí vận chuyển
- [ ] Test tạo đơn vận chuyển
- [ ] Test tracking order
- [ ] Test webhook cập nhật trạng thái

---

## Tài Liệu Tham Khảo

- **GHN API Documentation:** https://api.ghn.vn/
- **GHN Developer Portal:** https://dev.ghn.vn/
- **GHN Support:** api@ghn.vn

---

## Lưu Ý Quan Trọng

1. **Mapping Địa Chỉ:** GHN yêu cầu mã số (ID) cho tỉnh/quận/phường, không phải tên. Cần:
   - Lưu mã GHN khi user chọn địa chỉ
   - Hoặc dùng API GHN để lấy danh sách và mapping

2. **Môi Trường:** 
   - Dev: `https://dev-online-gateway.ghn.vn`
   - Prod: `https://online-gateway.ghn.vn`

3. **Trọng Lượng & Kích Thước:** 
   - Cần lưu thông tin sản phẩm (weight, dimensions) để tính phí chính xác
   - Hoặc dùng giá trị mặc định nhưng có thể không chính xác

4. **Bảo Mật:** 
   - Không commit token vào Git
   - Xác thực webhook để tránh fake requests

---

**Chúc bạn tích hợp thành công! 🚀**

