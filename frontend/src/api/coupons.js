// api/coupons.js
import axiosClient from './axiosClient';

export const getUserCoupons = (params) => {
    return axiosClient.get('/coupons/my-coupons', { params });
};

export const validateCoupon = (data) => {
    return axiosClient.post('/coupons/validate', data);
};
