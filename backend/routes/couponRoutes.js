import express from 'express';
import {
    getUserCoupons,
    validateCoupon
} from '../controller/couponController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/my-coupons', getUserCoupons);
router.post('/validate', validateCoupon);

export default router;
