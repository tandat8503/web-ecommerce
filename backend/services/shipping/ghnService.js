import axios from 'axios';
import logger from '../../utils/logger.js';

/**
 * GHN Service - Tích hợp Giao Hàng Nhanh
 * 
 * Tài liệu API: https://api.ghn.vn/
 * Base URL: https://dev-online-gateway.ghn.vn/shiip/public-api/v2/
 * 
 * Có thể dùng Mock Service để test:
 * - Set GHN_USE_MOCK=true trong .env
 * - Hoặc GHN_IS_PRODUCTION=false để dùng dev API của GHN
 */

// GHN Config từ environment variables
const GHN_TOKEN = process.env.GHN_TOKEN || '';
const GHN_SHOP_ID = process.env.GHN_SHOP_ID || '';
const GHN_IS_PRODUCTION = process.env.GHN_IS_PRODUCTION === 'true';
const GHN_USE_MOCK = process.env.GHN_USE_MOCK === 'true'; // Dùng mock service để test
const GHN_FROM_DISTRICT_ID = parseInt(process.env.GHN_FROM_DISTRICT_ID || 0);
const GHN_FROM_WARD_CODE = process.env.GHN_FROM_WARD_CODE || '';

// Import mock service nếu cần (dynamic import)
let mockService = null;
if (GHN_USE_MOCK) {
  try {
    const mockModule = await import('./ghnServiceMock.js');
    mockService = mockModule;
    logger.warn('GHN: Đang sử dụng MOCK SERVICE - Không gọi API GHN thật!');
  } catch (error) {
    logger.error('GHN: Không thể load mock service', { error: error.message });
  }
}

// Base URL cho GHN API
// Production: https://online-gateway.ghn.vn/shiip/public-api
// Dev: https://dev-online-gateway.ghn.vn/shiip/public-api
const GHN_BASE_URL = GHN_IS_PRODUCTION 
  ? 'https://online-gateway.ghn.vn/shiip/public-api'
  : 'https://dev-online-gateway.ghn.vn/shiip/public-api';

// Master Data API: không có /v2
// Shipping Order API: có /v2
const GHN_MASTER_DATA_URL = `${GHN_BASE_URL}/master-data`;
const GHN_SHIPPING_ORDER_URL = `${GHN_BASE_URL}/v2/shipping-order`;

/**
 * Tạo headers cho GHN API
 * Theo tài liệu GHN: https://api.ghn.vn/home/docs/detail?id=78
 * Header phải là 'token' (chữ thường), không phải 'Token'
 * 
 * Lưu ý: Một số API không cần ShopId (như Get District, Get Ward)
 */
const getHeaders = (includeShopId = true) => {
  const headers = {
    'Content-Type': 'application/json',
    'token': GHN_TOKEN  // GHN yêu cầu 'token' (chữ thường)
  };
  
  // Chỉ thêm ShopId nếu cần và có giá trị
  if (includeShopId && GHN_SHOP_ID) {
    headers['ShopId'] = GHN_SHOP_ID;
  }
  
  return headers;
};

/**
 * Tính phí vận chuyển
 * @param {Object} params - Thông tin tính phí
 * @param {number} params.toDistrictId - ID quận/huyện nhận hàng
 * @param {number} params.toWardCode - Mã phường/xã nhận hàng
 * @param {number} params.weight - Trọng lượng (gram)
 * @param {number} params.length - Chiều dài (cm)
 * @param {number} params.width - Chiều rộng (cm)
 * @param {number} params.height - Chiều cao (cm)
 * @param {number} params.serviceTypeId - Loại dịch vụ (2: Standard, 5: Express)
 * @param {number} params.insuranceValue - Giá trị đơn hàng (để tính bảo hiểm)
 * @returns {Promise<Object>} Thông tin phí vận chuyển
 */
export const calculateShippingFee = async (params) => {
  // Nếu dùng mock, gọi mock service
  if (GHN_USE_MOCK && mockService) {
    return await mockService.calculateShippingFee(params);
  }
  
  try {
    const {
      toDistrictId,
      toWardCode,
      weight = 1000, // Mặc định 1kg
      length = 20,
      width = 20,
      height = 20,
      serviceTypeId = 2, // Standard
      insuranceValue = 0
    } = params;

    if (!toDistrictId || !toWardCode) {
      throw new Error('Thiếu thông tin địa chỉ nhận hàng');
    }

    const requestBody = {
      service_type_id: serviceTypeId,
    from_district_id: GHN_FROM_DISTRICT_ID, // Quận/huyện gửi hàng
      to_district_id: parseInt(toDistrictId),
      to_ward_code: String(toWardCode),
      weight: Math.max(100, Math.round(weight)), // Tối thiểu 100g
      length: Math.max(1, Math.round(length)),
      width: Math.max(1, Math.round(width)),
      height: Math.max(1, Math.round(height)),
      insurance_value: Math.max(0, Math.round(insuranceValue)),
      cod_amount: 0 // Số tiền thu hộ (nếu có)
    };

    logger.info('GHN: Tính phí vận chuyển', { requestBody });

    const response = await axios.post(
      `${GHN_SHIPPING_ORDER_URL}/fee`,
      requestBody,
      { headers: getHeaders() }
    );

    if (response.data.code !== 200) {
      logger.error('GHN: Lỗi tính phí vận chuyển', {
        code: response.data.code,
        message: response.data.message
      });
      throw new Error(response.data.message || 'Không thể tính phí vận chuyển');
    }

    const feeData = response.data.data;
    logger.info('GHN: Tính phí thành công', { fee: feeData.total });

    return {
      success: true,
      totalFee: feeData.total,
      serviceFee: feeData.service_fee || 0,
      insuranceFee: feeData.insurance_fee || 0,
      pickStationFee: feeData.pick_station_fee || 0,
      couponValue: feeData.coupon_value || 0,
      r2sFee: feeData.r2s_fee || 0,
      returnAgainFee: feeData.return_again_fee || 0,
      documentReturn: feeData.document_return || 0,
      doubleCheck: feeData.double_check || 0,
      codFee: feeData.cod_fee || 0,
      pickRemoteAreasFee: feeData.pick_remote_areas_fee || 0,
      deliverRemoteAreasFee: feeData.deliver_remote_areas_fee || 0,
      codFailedFee: feeData.cod_failed_fee || 0,
      total: feeData.total
    };
  } catch (error) {
    logger.error('GHN: Lỗi tính phí vận chuyển', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Lấy danh sách dịch vụ khả dụng giữa 2 điểm
 * @param {Object} params
 * @param {number} params.toDistrictId - Quận/huyện nhận hàng
 * @param {string} [params.toWardCode] - Phường/xã nhận hàng (tùy chọn)
 * @param {number|string} [params.shopId] - Shop ID cụ thể (nếu khác với env)
 */
export const getAvailableServices = async ({ toDistrictId, toWardCode, shopId }) => {
  // Nếu dùng mock, gọi mock service
  if (GHN_USE_MOCK && mockService) {
    return await mockService.getAvailableServices({ toDistrictId, toWardCode, shopId });
  }
  
  try {
    if (!toDistrictId) {
      throw new Error('Thiếu thông tin toDistrictId');
    }

    if (!GHN_FROM_DISTRICT_ID) {
      throw new Error('Thiếu cấu hình GHN_FROM_DISTRICT_ID');
    }

    const requestBody = {
      shop_id: parseInt(shopId || GHN_SHOP_ID || 0),
      from_district: GHN_FROM_DISTRICT_ID,
      to_district: parseInt(toDistrictId)
    };

    if (toWardCode) {
      requestBody.to_ward = String(toWardCode);
    }

    logger.info('GHN: Lấy danh sách dịch vụ khả dụng', requestBody);

    const response = await axios.post(
      `${GHN_SHIPPING_ORDER_URL}/available-services`,
      requestBody,
      { headers: getHeaders() }
    );

    if (response.data.code !== 200) {
      logger.error('GHN: Lỗi lấy danh sách dịch vụ', {
        code: response.data.code,
        message: response.data.message
      });
      throw new Error(response.data.message || 'Không thể lấy danh sách dịch vụ');
    }

    return {
      success: true,
      data: response.data.data || []
    };
  } catch (error) {
    logger.error('GHN: Lỗi gọi available-services', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Lấy thời gian giao dự kiến (leadtime) cho dịch vụ cụ thể
 * @param {Object} params
 * @param {number} params.toDistrictId
 * @param {string} params.toWardCode
 * @param {number} params.serviceId
 */
export const getLeadTime = async ({ toDistrictId, toWardCode, serviceId }) => {
  // Nếu dùng mock, gọi mock service
  if (GHN_USE_MOCK && mockService) {
    return await mockService.getLeadTime({ toDistrictId, toWardCode, serviceId });
  }
  
  try {
    if (!toDistrictId || !serviceId) {
      throw new Error('Thiếu thông tin toDistrictId hoặc serviceId');
    }

    if (!GHN_FROM_DISTRICT_ID) {
      throw new Error('Thiếu cấu hình GHN_FROM_DISTRICT_ID');
    }

    const requestBody = {
      from_district_id: GHN_FROM_DISTRICT_ID,
      to_district_id: parseInt(toDistrictId),
      service_id: parseInt(serviceId)
    };

    if (GHN_FROM_WARD_CODE) {
      requestBody.from_ward_code = GHN_FROM_WARD_CODE;
    }

    if (toWardCode) {
      requestBody.to_ward_code = String(toWardCode);
    }

    logger.info('GHN: Lấy leadtime', requestBody);

    const response = await axios.post(
      `${GHN_SHIPPING_ORDER_URL}/leadtime`,
      requestBody,
      { headers: getHeaders() }
    );

    if (response.data.code !== 200) {
      logger.error('GHN: Lỗi lấy leadtime', {
        code: response.data.code,
        message: response.data.message
      });
      throw new Error(response.data.message || 'Không thể lấy thời gian giao dự kiến');
    }

    return {
      success: true,
      data: response.data.data || null
    };
  } catch (error) {
    logger.error('GHN: Lỗi gọi leadtime', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Tạo đơn vận chuyển trên GHN
 * @param {Object} params - Thông tin đơn hàng
 * @param {string} params.orderNumber - Mã đơn hàng của bạn
 * @param {Object} params.shippingAddress - Địa chỉ giao hàng
 * @param {string} params.shippingAddress.fullName - Tên người nhận
 * @param {string} params.shippingAddress.phone - Số điện thoại
 * @param {string} params.shippingAddress.streetAddress - Địa chỉ chi tiết
 * @param {string} params.shippingAddress.ward - Phường/xã
 * @param {string} params.shippingAddress.district - Quận/huyện
 * @param {string} params.shippingAddress.city - Tỉnh/thành phố
 * @param {number} params.toDistrictId - ID quận/huyện (GHN)
 * @param {string} params.toWardCode - Mã phường/xã (GHN)
 * @param {Array} params.items - Danh sách sản phẩm
 * @param {number} params.totalWeight - Tổng trọng lượng (gram)
 * @param {number} params.totalValue - Tổng giá trị đơn hàng
 * @param {number} params.codAmount - Số tiền thu hộ (nếu COD)
 * @param {string} params.note - Ghi chú
 * @returns {Promise<Object>} Thông tin đơn vận chuyển
 */
export const createShippingOrder = async (params) => {
  // Nếu dùng mock, gọi mock service
  if (GHN_USE_MOCK && mockService) {
    return await mockService.createShippingOrder(params);
  }
  
  try {
    const {
      orderNumber,
      shippingAddress,
      toDistrictId,
      toWardCode,
      items = [],
      totalWeight = 1000,
      totalValue = 0,
      codAmount = 0,
      note = ''
    } = params;

    if (!toDistrictId || !toWardCode) {
      throw new Error('Thiếu thông tin địa chỉ nhận hàng');
    }

    // Tính kích thước từ items hoặc dùng mặc định
    let totalLength = 20, totalWidth = 20, totalHeight = 20;
    if (items.length > 0) {
      // Giả sử mỗi item có kích thước, tính tổng
      // Trong thực tế, bạn nên lưu kích thước sản phẩm trong database
      totalLength = Math.max(20, items.length * 10);
      totalWidth = 20;
      totalHeight = 20;
    }

    const requestBody = {
      payment_type_id: codAmount > 0 ? 1 : 2, // 1: Người nhận trả, 2: Người gửi trả
      note: note || `Đơn hàng ${orderNumber}`,
      required_note: 'CHOXEMHANGKHONGTHU', // Cho xem hàng, không cho thử
      from_name: process.env.GHN_FROM_NAME || 'Cửa hàng',
      from_phone: process.env.GHN_FROM_PHONE || '',
      from_address: process.env.GHN_FROM_ADDRESS || '',
      from_ward_name: process.env.GHN_FROM_WARD || '',
      from_district_name: process.env.GHN_FROM_DISTRICT || '',
      from_province_name: process.env.GHN_FROM_PROVINCE || '',
      to_name: shippingAddress.fullName,
      to_phone: shippingAddress.phone,
      to_address: shippingAddress.streetAddress,
      to_ward_code: String(toWardCode),
      to_district_id: parseInt(toDistrictId),
      cod_amount: Math.round(codAmount),
      weight: Math.max(100, Math.round(totalWeight)),
      length: Math.max(1, Math.round(totalLength)),
      width: Math.max(1, Math.round(totalWidth)),
      height: Math.max(1, Math.round(totalHeight)),
      insurance_value: Math.round(totalValue),
      service_type_id: 2, // Standard
      service_id: 0, // Để GHN tự chọn
      client_order_code: orderNumber, // Mã đơn hàng của bạn
      to_ward_name: shippingAddress.ward,
      to_district_name: shippingAddress.district,
      to_province_name: shippingAddress.city,
      items: items.map(item => ({
        name: item.name || 'Sản phẩm',
        code: item.code || '',
        quantity: item.quantity || 1,
        price: Math.round(item.price || 0),
        weight: Math.round(item.weight || 100)
      }))
    };

    logger.info('GHN: Tạo đơn vận chuyển', { orderNumber, toDistrictId, toWardCode });

    const response = await axios.post(
      `${GHN_SHIPPING_ORDER_URL}/create`,
      requestBody,
      { headers: getHeaders() }
    );

    if (response.data.code !== 200) {
      logger.error('GHN: Lỗi tạo đơn vận chuyển', {
        code: response.data.code,
        message: response.data.message,
        orderNumber
      });
      throw new Error(response.data.message || 'Không thể tạo đơn vận chuyển');
    }

    const orderData = response.data.data;
    logger.info('GHN: Tạo đơn thành công', {
      orderNumber,
      ghnOrderCode: orderData.order_code,
      totalFee: orderData.total_fee
    });

    return {
      success: true,
      ghnOrderCode: orderData.order_code,
      sortCode: orderData.sort_code || '',
      transType: orderData.trans_type || '',
      wardEncode: orderData.ward_encode || '',
      districtEncode: orderData.district_encode || '',
      totalFee: orderData.total_fee || 0,
      expectedDeliveryTime: orderData.expected_delivery_time || null
    };
  } catch (error) {
    logger.error('GHN: Lỗi tạo đơn vận chuyển', {
      error: error.message,
      stack: error.stack,
      orderNumber: params.orderNumber
    });
    throw error;
  }
};

/**
 * Lấy thông tin vận đơn
 * @param {string} ghnOrderCode - Mã đơn hàng GHN
 * @returns {Promise<Object>} Thông tin vận đơn
 */
export const getShippingOrderInfo = async (ghnOrderCode) => {
  // Nếu dùng mock, gọi mock service
  if (GHN_USE_MOCK && mockService) {
    return await mockService.getShippingOrderInfo(ghnOrderCode);
  }
  
  try {
    if (!ghnOrderCode) {
      throw new Error('Mã đơn hàng GHN không hợp lệ');
    }

    const response = await axios.get(
      `${GHN_SHIPPING_ORDER_URL}/detail`,
      {
        headers: getHeaders(),
        params: {
          order_code: ghnOrderCode
        }
      }
    );

    if (response.data.code !== 200) {
      logger.error('GHN: Lỗi lấy thông tin đơn hàng', {
        code: response.data.code,
        message: response.data.message,
        ghnOrderCode
      });
      throw new Error(response.data.message || 'Không thể lấy thông tin đơn hàng');
    }

    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    logger.error('GHN: Lỗi lấy thông tin đơn hàng', {
      error: error.message,
      ghnOrderCode
    });
    throw error;
  }
};

/**
 * Hủy đơn vận chuyển
 * @param {string} ghnOrderCode - Mã đơn hàng GHN
 * @returns {Promise<Object>} Kết quả hủy đơn
 */
export const cancelShippingOrder = async (ghnOrderCode) => {
  // Nếu dùng mock, gọi mock service
  if (GHN_USE_MOCK && mockService) {
    return await mockService.cancelShippingOrder(ghnOrderCode);
  }
  
  try {
    if (!ghnOrderCode) {
      throw new Error('Mã đơn hàng GHN không hợp lệ');
    }

    const response = await axios.post(
      `${GHN_SHIPPING_ORDER_URL}/cancel`,
      {
        order_codes: [ghnOrderCode]
      },
      { headers: getHeaders() }
    );

    if (response.data.code !== 200) {
      logger.error('GHN: Lỗi hủy đơn hàng', {
        code: response.data.code,
        message: response.data.message,
        ghnOrderCode
      });
      throw new Error(response.data.message || 'Không thể hủy đơn hàng');
    }

    logger.info('GHN: Hủy đơn thành công', { ghnOrderCode });

    return {
      success: true,
      message: 'Hủy đơn hàng thành công'
    };
  } catch (error) {
    logger.error('GHN: Lỗi hủy đơn hàng', {
      error: error.message,
      ghnOrderCode
    });
    throw error;
  }
};

/**
 * Lấy danh sách tỉnh/thành phố
 * @returns {Promise<Array>} Danh sách tỉnh/thành phố
 */
export const getProvinces = async () => {
  try {
    // API Get Province không cần ShopId
    const headers = getHeaders(false);
    
    logger.info('GHN: Gọi API getProvinces', {
      url: `${GHN_MASTER_DATA_URL}/province`,
      hasToken: !!headers.token
    });

    const response = await axios.get(
      `${GHN_MASTER_DATA_URL}/province`,
      { headers }
    );

    if (response.data.code !== 200) {
      logger.error('GHN: API trả về lỗi', {
        code: response.data.code,
        message: response.data.message
      });
      throw new Error(response.data.message || 'Không thể lấy danh sách tỉnh/thành phố');
    }

    return {
      success: true,
      data: response.data.data || []
    };
  } catch (error) {
    if (error.response) {
      logger.error('GHN: Lỗi HTTP từ API', {
        status: error.response.status,
        data: error.response.data
      });
    } else {
      logger.error('GHN: Lỗi lấy danh sách tỉnh/thành phố', { error: error.message });
    }
    throw error;
  }
};

/**
 * Lấy danh sách quận/huyện theo tỉnh/thành phố
 * @param {number} provinceId - ID tỉnh/thành phố
 * @returns {Promise<Array>} Danh sách quận/huyện
 */
export const getDistricts = async (provinceId) => {
  // Nếu dùng mock, gọi mock service
  if (GHN_USE_MOCK && mockService) {
    return await mockService.getDistricts(provinceId);
  }
  
  try {
    // API Get District không cần ShopId theo tài liệu
    const headers = getHeaders(false);
    const body = { province_id: parseInt(provinceId) };
    
    // Debug logging
    logger.info('GHN: Gọi API getDistricts', {
      url: `${GHN_MASTER_DATA_URL}/district`,
      provinceId,
      hasToken: !!headers.token,
      tokenLength: headers.token?.length || 0,
      hasShopId: !!headers.ShopId
    });

    const response = await axios.post(
      `${GHN_MASTER_DATA_URL}/district`,
      body,
      { headers }
    );

    // Log response để debug
    logger.info('GHN: Response getDistricts', {
      code: response.data.code,
      message: response.data.message,
      dataLength: response.data.data?.length || 0
    });

    if (response.data.code !== 200) {
      logger.error('GHN: API trả về lỗi', {
        code: response.data.code,
        message: response.data.message,
        data: response.data.data
      });
      throw new Error(response.data.message || 'Không thể lấy danh sách quận/huyện');
    }

    return {
      success: true,
      data: response.data.data || []
    };
  } catch (error) {
    // Log chi tiết lỗi
    if (error.response) {
      logger.error('GHN: Lỗi HTTP từ API', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers,
        provinceId
      });
    } else {
      logger.error('GHN: Lỗi lấy danh sách quận/huyện', { 
        error: error.message, 
        stack: error.stack,
        provinceId 
      });
    }
    throw error;
  }
};

/**
 * Lấy danh sách phường/xã theo quận/huyện
 * @param {number} districtId - ID quận/huyện
 * @returns {Promise<Array>} Danh sách phường/xã
 */
export const getWards = async (districtId) => {
  // Nếu dùng mock, gọi mock service
  if (GHN_USE_MOCK && mockService) {
    return await mockService.getWards(districtId);
  }
  
  try {
    // API Get Ward không cần ShopId theo tài liệu
    const headers = getHeaders(false);
    const body = { district_id: parseInt(districtId) };
    
    logger.info('GHN: Gọi API getWards', {
      url: `${GHN_MASTER_DATA_URL}/ward`,
      districtId,
      hasToken: !!headers.token
    });

    const response = await axios.post(
      `${GHN_MASTER_DATA_URL}/ward`,
      body,
      { headers }
    );

    if (response.data.code !== 200) {
      logger.error('GHN: API trả về lỗi', {
        code: response.data.code,
        message: response.data.message
      });
      throw new Error(response.data.message || 'Không thể lấy danh sách phường/xã');
    }

    return {
      success: true,
      data: response.data.data || []
    };
  } catch (error) {
    if (error.response) {
      logger.error('GHN: Lỗi HTTP từ API', {
        status: error.response.status,
        data: error.response.data,
        districtId
      });
    } else {
      logger.error('GHN: Lỗi lấy danh sách phường/xã', { error: error.message, districtId });
    }
    throw error;
  }
};

export default {
  calculateShippingFee,
  createShippingOrder,
  getShippingOrderInfo,
  cancelShippingOrder,
  getProvinces,
  getDistricts,
  getWards
};

