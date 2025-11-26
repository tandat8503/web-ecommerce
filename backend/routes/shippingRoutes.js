import express from 'express';
import * as shippingController from '../controller/shippingController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/shipping/calculate-fee
 * @desc    Tính phí vận chuyển GHN
 * @access  Public (có thể cần auth nếu muốn)
 */
router.post('/calculate-fee', shippingController.calculateShippingFee);

/**
 * @route   GET /api/shipping/provinces
 * @desc    Lấy danh sách tỉnh/thành phố từ GHN
 * @access  Public
 */
router.get('/provinces', shippingController.getProvinces);

/**
 * @route   POST /api/shipping/districts
 * @route   GET /api/shipping/districts?provinceId=202
 * @desc    Lấy danh sách quận/huyện theo tỉnh/thành phố
 * @access  Public
 */
router.post('/districts', shippingController.getDistricts);
router.get('/districts', shippingController.getDistricts);

/**
 * @route   POST /api/shipping/wards
 * @route   GET /api/shipping/wards?districtId=1451
 * @desc    Lấy danh sách phường/xã theo quận/huyện
 * @access  Public
 */
router.post('/wards', shippingController.getWards);
router.get('/wards', shippingController.getWards);

/**
 * @route   POST /api/shipping/calculate-fee
 * @route   GET /api/shipping/calculate-fee?toDistrictId=1451&toWardCode=1A0401&weight=1000
 * @desc    Tính phí vận chuyển GHN
 * @access  Public
 */
router.get('/calculate-fee', shippingController.calculateShippingFee);

/**
 * @route   POST /api/shipping/available-services
 * @route   GET /api/shipping/available-services?toDistrictId=1451&toWardCode=1A0401
 * @desc    Lấy danh sách dịch vụ GHN khả dụng
 * @access  Public
 */
router.post('/available-services', shippingController.getAvailableServices);
router.get('/available-services', shippingController.getAvailableServices);

/**
 * @route   POST /api/shipping/leadtime
 * @route   GET /api/shipping/leadtime?toDistrictId=1451&toWardCode=1A0401&serviceId=53321
 * @desc    Lấy thời gian giao dự kiến của GHN
 * @access  Public
 */
router.post('/leadtime', shippingController.getLeadTime);
router.get('/leadtime', shippingController.getLeadTime);

/**
 * @route   GET /api/shipping/tracking/:ghnOrderCode
 * @desc    Lấy thông tin vận đơn GHN
 * @access  Private (Admin hoặc User sở hữu đơn hàng)
 */
router.get('/tracking/:ghnOrderCode', authenticateToken, shippingController.getShippingTracking);

/**
 * @route   POST /api/shipping/cancel/:ghnOrderCode
 * @desc    Hủy đơn vận chuyển GHN
 * @access  Private (Admin)
 */
router.post('/cancel/:ghnOrderCode', authenticateToken, shippingController.cancelShipping);

export default router;

