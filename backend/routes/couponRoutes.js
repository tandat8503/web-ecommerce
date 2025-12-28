import express from 'express';
import {
    getUserCoupons,
    validateCoupon
} from '../controller/couponController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/my-coupons', getUserCoupons);
router.post('/validate', validateCoupon);

export default router;
