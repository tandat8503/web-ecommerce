import axios from 'axios';
import logger from '../../utils/logger.js';

// Helper function để lấy env variables (đọc động mỗi lần gọi)
const getGHNConfig = () => {
  // Default: Production URL (vì token production phổ biến hơn)
  let baseUrl = process.env.GHN_API_URL || 'https://online-gateway.ghn.vn';
  
  // Trim whitespace và loại bỏ quotes nếu có
  baseUrl = baseUrl.trim().replace(/^["']|["']$/g, '');
  
  // Xử lý URL - Nếu có /shiip/public-api/v2 thì lấy base domain
  // Ví dụ: https://online-gateway.ghn.vn/shiip/public-api/v2 
  //     -> https://online-gateway.ghn.vn
  //     https://dev-online-gateway.ghn.vn/shiip/public-api/v2
  //     -> https://dev-online-gateway.ghn.vn
  if (baseUrl.includes('/shiip')) {
    baseUrl = baseUrl.split('/shiip')[0];
  }
  // Hoặc nếu chỉ có /v2 ở cuối
  else if (baseUrl.match(/\/v\d+$/)) {
    baseUrl = baseUrl.replace(/\/v\d+$/, '');
  }
  
  // Đảm bảo không có trailing slash
  baseUrl = baseUrl.replace(/\/$/, '');
  
  // Trim whitespace và loại bỏ quotes từ env variables
  let token = process.env.GHN_TOKEN || null;
  let shopId = process.env.GHN_SHOP_ID || null;
  
  if (token) {
    token = token.trim().replace(/^["']|["']$/g, ''); // Trim và bỏ quotes
  }
  if (shopId) {
    shopId = shopId.trim().replace(/^["']|["']$/g, ''); // Trim và bỏ quotes
  }
  
  return {
    apiUrl: baseUrl, // Base URL, ví dụ: https://online-gateway.ghn.vn (prod) hoặc https://dev-online-gateway.ghn.vn (dev)
    token,
    shopId,
  };
};

/**
 * API 1: Lấy danh sách Tỉnh/Thành phố từ GHN
 * Theo tài liệu: https://api.ghn.vn/home/docs/detail?id=91
 * Dùng GET method với Token trong header
 * @returns {Promise<{success: boolean, data: Array, error?: string}>}
 */
export const getProvinces = async () => {
  try {
    const { apiUrl, token } = getGHNConfig();
    
    if (!token) {
      throw new Error('GHN_TOKEN không được cấu hình trong môi trường');
    }
    
    const finalToken = token.trim(); // Trim whitespace
    
    const fullUrl = `${apiUrl}/shiip/public-api/master-data/province`;
    
    // Debug: Log để kiểm tra (chỉ log một phần token để bảo mật)
    logger.info('GHN getProvinces request', {
      url: fullUrl,
      tokenLength: finalToken.length,
      tokenPreview: `${finalToken.substring(0, 10)}...${finalToken.substring(finalToken.length - 5)}`,
      apiUrlSource: process.env.GHN_API_URL || 'default',
    });
    
    const response = await axios.get(fullUrl, {
      headers: {
        'Token': finalToken,
        'Content-Type': 'application/json',
      },
    });

    if (response.data.code !== 200) {
      throw new Error(response.data.message || 'Không thể lấy danh sách tỉnh/thành phố');
    }

    return {
      success: true,
      data: response.data.data || [],
    };
  } catch (error) {
    // Log chi tiết để debug
    const errorInfo = {
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data,
      requestUrl: error.config?.url,
    };
    
    logger.error('GHN get provinces error', errorInfo);
    
    // Nếu là lỗi 401, cung cấp thêm thông tin
    if (error.response?.status === 401) {
      const { token, apiUrl } = getGHNConfig();
      logger.error('Token validation failed - 401 Unauthorized', {
        message: 'Token không hợp lệ hoặc đã hết hạn',
        tokenLength: token?.length || 0,
        apiUrl,
        suggestion: 'Vui lòng kiểm tra lại GHN_TOKEN trong file .env. Đảm bảo token đúng với môi trường (dev/prod).',
      });
    }
    
    return {
      success: false,
      data: [],
      error: error.message,
      details: error.response?.data,
    };
  }
};

/**
 * API 1: Lấy danh sách Quận/Huyện từ GHN
 * Theo tài liệu: https://api.ghn.vn/home/docs/detail?id=93
 * Có thể dùng GET với query params hoặc POST với body
 * @param {Number} provinceId - ID tỉnh/thành phố
 * @returns {Promise<{success: boolean, data: Array, error?: string}>}
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

    const { apiUrl, token } = getGHNConfig();
    
    if (!token) {
      throw new Error('GHN_TOKEN không được cấu hình trong môi trường');
    }
    
    // GHN hỗ trợ cả GET và POST, dùng GET với query params
    const response = await axios.get(
      `${apiUrl}/shiip/public-api/master-data/district`,
      {
        params: {
          province_id: provinceId,
        },
        headers: {
          'Token': token,
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
 * API 1: Lấy danh sách Phường/Xã từ GHN
 * Theo tài liệu: https://api.ghn.vn/home/docs/detail?id=92
 * Dùng POST method với district_id trong body
 * @param {Number} districtId - ID quận/huyện
 * @returns {Promise<{success: boolean, data: Array, error?: string}>}
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

    const { apiUrl, token } = getGHNConfig();
    
    if (!token) {
      throw new Error('GHN_TOKEN không được cấu hình trong môi trường');
    }
    
    // Theo tài liệu GHN: https://api.ghn.vn/home/docs/detail?id=92
    // API này dùng POST với district_id trong body
    const response = await axios.post(
      `${apiUrl}/shiip/public-api/master-data/ward`,
      {
        district_id: districtId,
      },
      {
        headers: {
          'Token': token,
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
 * API 2: Tính phí vận chuyển từ GHN
 * @param {Object} params
 * @param {Number} params.toDistrictId - ID quận/huyện đích
 * @param {String} params.toWardCode - Mã phường/xã đích
 * @param {Number} params.weight - Trọng lượng (gram)
 * @param {Number} params.length - Chiều dài (cm)
 * @param {Number} params.width - Chiều rộng (cm)
 * @param {Number} params.height - Chiều cao (cm)
 * @param {Number} params.codAmount - Tiền thu hộ (nếu COD)
 * @param {Number} params.serviceTypeId - Loại dịch vụ (1: Nhanh, 2: Chuẩn, 3: Tiết kiệm)
 * @returns {Promise<{success: boolean, shippingFee: number, error?: string}>}
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

    // Ưu tiên GHN_FROM_DISTRICT_ID (theo naming mới), fallback về GHN_WAREHOUSE_DISTRICT_ID
    const fromDistrictId = Number(process.env.GHN_FROM_DISTRICT_ID || process.env.GHN_WAREHOUSE_DISTRICT_ID);

    if (!fromDistrictId) {
      logger.warn('GHN_FROM_DISTRICT_ID or GHN_WAREHOUSE_DISTRICT_ID not configured');
      return {
        success: false,
        error: 'Warehouse district ID not configured',
        shippingFee: 30000, // Fallback
      };
    }

    const { apiUrl, token, shopId } = getGHNConfig();
    
    if (!token) {
      throw new Error('GHN_TOKEN không được cấu hình trong môi trường');
    }
    
    if (!shopId) {
      throw new Error('GHN_SHOP_ID không được cấu hình trong môi trường');
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
        cod_amount: codAmount,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Token': token,
          'ShopId': shopId,
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

