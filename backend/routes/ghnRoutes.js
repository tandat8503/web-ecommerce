import express from 'express';
import * as ghnController from '../controller/ghnController.js';

const router = express.Router();

// API 1: Lấy địa chỉ
router.get('/provinces', ghnController.getProvinces);
router.get('/districts', ghnController.getDistricts);
// Lưu ý: GHN API dùng POST cho wards, nhưng để frontend dễ dùng, 
// chúng ta hỗ trợ cả GET (với query params) và POST
router.get('/wards', ghnController.getWards);
router.post('/wards', ghnController.getWards);

// API 2: Tính phí vận chuyển
router.post('/calculate-shipping-fee', ghnController.calculateShippingFee);

export default router;

