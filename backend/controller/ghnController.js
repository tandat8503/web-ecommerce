import ghnService from '../services/shipping/ghnService.js';
import shippingService from '../services/shipping/shippingService.js';
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
 * Hỗ trợ cả GET (query params) và POST (body)
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

    const result = await shippingService.calculateShippingFee({
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
        freeShippingReason: result.freeShippingReason || null,
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

