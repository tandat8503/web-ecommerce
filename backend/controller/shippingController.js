import * as ghnService from '../services/shipping/ghnService.js';
import logger from '../utils/logger.js';

/**
 * Tính phí vận chuyển GHN
 * POST /api/shipping/calculate-fee
 */
export const calculateShippingFee = async (req, res) => {
  try {
    // Hỗ trợ cả POST (body) và GET (query)
    // Với GET request, req.body có thể là undefined
    const body = req.body || {};
    const query = req.query || {};
    
    // Ưu tiên body, nếu không có thì lấy từ query
    const toDistrictId = body.toDistrictId || query.toDistrictId;
    const toWardCode = body.toWardCode || query.toWardCode;
    const weight = body.weight || query.weight;
    const length = body.length || query.length;
    const width = body.width || query.width;
    const height = body.height || query.height;
    const serviceTypeId = body.serviceTypeId || query.serviceTypeId;
    const insuranceValue = body.insuranceValue || query.insuranceValue;

    if (!toDistrictId || !toWardCode) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp địa chỉ nhận hàng (toDistrictId, toWardCode)'
      });
    }

    // Parse số từ query string (query params là string)
    const feeData = await ghnService.calculateShippingFee({
      toDistrictId: toDistrictId ? parseInt(toDistrictId) : undefined,
      toWardCode: toWardCode ? String(toWardCode) : undefined,
      weight: weight ? parseInt(weight) : 1000,
      length: length ? parseInt(length) : 20,
      width: width ? parseInt(width) : 20,
      height: height ? parseInt(height) : 20,
      serviceTypeId: serviceTypeId ? parseInt(serviceTypeId) : 2,
      insuranceValue: insuranceValue ? parseInt(insuranceValue) : 0
    });

    return res.json({
      success: true,
      message: 'Tính phí vận chuyển thành công',
      data: feeData
    });
  } catch (error) {
    logger.error('Lỗi tính phí vận chuyển', {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: error.message || 'Không thể tính phí vận chuyển'
    });
  }
};

/**
 * Lấy danh sách tỉnh/thành phố từ GHN
 * GET /api/shipping/provinces
 * Map từ GHN format { ProvinceID, ProvinceName } → Frontend format { code, name }
 */
export const getProvinces = async (req, res) => {
  try {
    const result = await ghnService.getProvinces();
    
    // Map từ GHN format sang format frontend đang dùng
    const mappedData = (result.data || []).map(province => ({
      code: String(province.ProvinceID),  // Convert ID → code (string)
      name: province.ProvinceName         // ProvinceName → name
    }));
    
    return res.json({
      success: true,
      message: 'Lấy danh sách tỉnh/thành phố thành công',
      data: mappedData
    });
  } catch (error) {
    logger.error('Lỗi lấy danh sách tỉnh/thành phố', {
      error: error.message
    });
    return res.status(500).json({
      success: false,
      message: error.message || 'Không thể lấy danh sách tỉnh/thành phố'
    });
  }
};

/**
 * Lấy danh sách quận/huyện theo tỉnh/thành phố
 * POST /api/shipping/districts (từ body)
 * GET /api/shipping/districts?provinceId=202 (từ query)
 * Map từ GHN format { DistrictID, DistrictName } → Frontend format { code, name }
 */
export const getDistricts = async (req, res) => {
  try {
    // Hỗ trợ cả POST (body) và GET (query)
    const provinceId = req.body.provinceId || req.query.provinceId;

    if (!provinceId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp provinceId'
      });
    }

    // Parse số từ query string
    const provinceIdNum = parseInt(provinceId);
    const result = await ghnService.getDistricts(provinceIdNum);
    
    // Map từ GHN format sang format frontend đang dùng
    const mappedData = (result.data || []).map(district => ({
      code: String(district.DistrictID),  // Convert ID → code (string)
      name: district.DistrictName,         // DistrictName → name
      // Giữ lại DistrictID để dùng cho tính phí vận chuyển
      districtId: district.DistrictID
    }));
    
    return res.json({
      success: true,
      message: 'Lấy danh sách quận/huyện thành công',
      data: mappedData
    });
  } catch (error) {
    logger.error('Lỗi lấy danh sách quận/huyện', {
      error: error.message,
      provinceId: req.body?.provinceId || req.query?.provinceId
    });
    return res.status(500).json({
      success: false,
      message: error.message || 'Không thể lấy danh sách quận/huyện'
    });
  }
};

/**
 * Lấy danh sách phường/xã theo quận/huyện
 * POST /api/shipping/wards (từ body)
 * GET /api/shipping/wards?districtId=1451 (từ query)
 * Map từ GHN format { WardCode, WardName } → Frontend format { code, name }
 */
export const getWards = async (req, res) => {
  try {
    // Hỗ trợ cả POST (body) và GET (query)
    const districtId = req.body.districtId || req.query.districtId;

    if (!districtId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp districtId'
      });
    }

    // Parse số từ query string
    const districtIdNum = parseInt(districtId);
    const result = await ghnService.getWards(districtIdNum);
    
    // Map từ GHN format sang format frontend đang dùng
    const mappedData = (result.data || []).map(ward => ({
      code: ward.WardCode,      // WardCode → code (string)
      name: ward.WardName,      // WardName → name
      // Giữ lại WardCode để dùng cho tính phí vận chuyển
      wardCode: ward.WardCode
    }));
    
    return res.json({
      success: true,
      message: 'Lấy danh sách phường/xã thành công',
      data: mappedData
    });
  } catch (error) {
    logger.error('Lỗi lấy danh sách phường/xã', {
      error: error.message,
      districtId: req.body?.districtId || req.query?.districtId
    });
    return res.status(500).json({
      success: false,
      message: error.message || 'Không thể lấy danh sách phường/xã'
    });
  }
};

/**
 * Lấy danh sách dịch vụ GHN khả dụng
 * POST /api/shipping/available-services (từ body)
 * GET /api/shipping/available-services?toDistrictId=1451&toWardCode=1A0401 (từ query)
 */
export const getAvailableServices = async (req, res) => {
  try {
    // Hỗ trợ cả POST (body) và GET (query)
    const toDistrictId = req.body.toDistrictId || req.query.toDistrictId;
    const toWardCode = req.body.toWardCode || req.query.toWardCode;
    const shopId = req.body.shopId || req.query.shopId;

    if (!toDistrictId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp toDistrictId'
      });
    }

    // Parse số từ query string
    const result = await ghnService.getAvailableServices({
      toDistrictId: parseInt(toDistrictId),
      toWardCode: toWardCode ? String(toWardCode) : undefined,
      shopId: shopId ? parseInt(shopId) : undefined
    });

    return res.json({
      success: true,
      message: 'Lấy danh sách dịch vụ thành công',
      data: result.data
    });
  } catch (error) {
    logger.error('Lỗi lấy danh sách dịch vụ GHN', {
      error: error.message
    });
    return res.status(500).json({
      success: false,
      message: error.message || 'Không thể lấy danh sách dịch vụ'
    });
  }
};

/**
 * Lấy thời gian giao dự kiến của GHN
 * POST /api/shipping/leadtime
 */
export const getLeadTime = async (req, res) => {
  try {
    const { toDistrictId, toWardCode, serviceId } = req.body;

    if (!toDistrictId || !serviceId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp toDistrictId và serviceId'
      });
    }

    // Parse số từ query string
    const result = await ghnService.getLeadTime({
      toDistrictId: parseInt(toDistrictId),
      toWardCode: toWardCode ? String(toWardCode) : undefined,
      serviceId: parseInt(serviceId)
    });

    return res.json({
      success: true,
      message: 'Lấy thời gian giao dự kiến thành công',
      data: result.data
    });
  } catch (error) {
    logger.error('Lỗi lấy leadtime GHN', {
      error: error.message
    });
    return res.status(500).json({
      success: false,
      message: error.message || 'Không thể lấy thời gian giao dự kiến'
    });
  }
};

/**
 * Lấy thông tin vận đơn GHN
 * GET /api/shipping/tracking/:ghnOrderCode
 */
export const getShippingTracking = async (req, res) => {
  try {
    const { ghnOrderCode } = req.params;

    if (!ghnOrderCode) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp mã đơn hàng GHN'
      });
    }

    const result = await ghnService.getShippingOrderInfo(ghnOrderCode);
    return res.json({
      success: true,
      message: 'Lấy thông tin vận đơn thành công',
      data: result.data
    });
  } catch (error) {
    logger.error('Lỗi lấy thông tin vận đơn', {
      error: error.message,
      ghnOrderCode: req.params.ghnOrderCode
    });
    return res.status(500).json({
      success: false,
      message: error.message || 'Không thể lấy thông tin vận đơn'
    });
  }
};

/**
 * Hủy đơn vận chuyển GHN
 * POST /api/shipping/cancel/:ghnOrderCode
 */
export const cancelShipping = async (req, res) => {
  try {
    const { ghnOrderCode } = req.params;

    if (!ghnOrderCode) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp mã đơn hàng GHN'
      });
    }

    const result = await ghnService.cancelShippingOrder(ghnOrderCode);
    return res.json({
      success: true,
      message: result.message || 'Hủy đơn vận chuyển thành công',
      data: result
    });
  } catch (error) {
    logger.error('Lỗi hủy đơn vận chuyển', {
      error: error.message,
      ghnOrderCode: req.params.ghnOrderCode
    });
    return res.status(500).json({
      success: false,
      message: error.message || 'Không thể hủy đơn vận chuyển'
    });
  }
};

