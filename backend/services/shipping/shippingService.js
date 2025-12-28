// services/shipping/shippingService.js
import { calculateShippingFee as calculateGHNShippingFee } from './ghnService.js';
import logger from '../../utils/logger.js';

/**
 * Tính khoảng cách giữa 2 địa chỉ dựa trên district và ward
 * Logic đơn giản: So sánh district và ward code
 * 
 * @param {Object} fromAddress - Địa chỉ kho hàng
 * @param {Object} toAddress - Địa chỉ giao hàng
 * @returns {Object} { isSameLocation, isWithin1km, distance }
 */
const calculateDistance = (fromAddress, toAddress) => {
    const { districtId: fromDistrict, wardCode: fromWard } = fromAddress;
    const { districtId: toDistrict, wardCode: toWard } = toAddress;

    // Kiểm tra cùng địa chỉ (cùng district và ward)
    const isSameLocation = (
        fromDistrict === toDistrict &&
        fromWard === toWard
    );

    // Kiểm tra trong bán kính 1km
    // Logic đơn giản: Cùng ward = trong bán kính 1km
    const isWithin1km = (
        fromDistrict === toDistrict &&
        fromWard === toWard
    );

    return {
        isSameLocation,
        isWithin1km,
        distance: isSameLocation ? 0 : (isWithin1km ? 0.5 : null), // km
    };
};

/**
 * Tính phí vận chuyển với logic:
 * 1. Cùng địa chỉ kho → 0đ
 * 2. Trong bán kính 1km (cùng ward) → 0đ
 * 3. Ngoài 1km → Gọi GHN API
 * 
 * @param {Object} params - Tham số tính phí
 * @param {Number} params.toDistrictId - ID quận/huyện đích
 * @param {String} params.toWardCode - Mã phường/xã đích
 * @param {Number} params.weight - Trọng lượng (gram)
 * @param {Number} params.length - Chiều dài (cm)
 * @param {Number} params.width - Chiều rộng (cm)
 * @param {Number} params.height - Chiều cao (cm)
 * @param {Number} params.serviceTypeId - Loại dịch vụ
 * @returns {Promise<Object>} Kết quả tính phí
 */
export const calculateShippingFee = async (params) => {
    try {
        const { toDistrictId, toWardCode } = params;

        // Lấy thông tin kho hàng từ env (sử dụng env đã có)
        const warehouseDistrictId = Number(
            process.env.GHN_DISTRICT_ID ||
            process.env.GHN_FROM_DISTRICT_ID ||
            process.env.GHN_WAREHOUSE_DISTRICT_ID
        );
        const warehouseWardCode = String(
            process.env.GHN_WARD_CODE ||
            process.env.GHN_FROM_WARD_CODE ||
            process.env.GHN_WAREHOUSE_WARD_CODE || ''
        );

        if (!warehouseDistrictId || !warehouseWardCode) {
            logger.warn('Warehouse location not fully configured, using GHN API directly');
            return await calculateGHNShippingFee(params);
        }

        // Convert toWardCode to string for comparison
        const toWardCodeStr = String(toWardCode);

        // Tính khoảng cách
        const distanceInfo = calculateDistance(
            { districtId: warehouseDistrictId, wardCode: warehouseWardCode },
            { districtId: toDistrictId, wardCode: toWardCodeStr }
        );

        logger.info('Distance calculation', {
            from: { districtId: warehouseDistrictId, wardCode: warehouseWardCode },
            to: { districtId: toDistrictId, wardCode: toWardCode },
            ...distanceInfo
        });

        // Case 1 & 2: Cùng địa chỉ hoặc trong bán kính 1km → Miễn phí vận chuyển
        if (distanceInfo.isSameLocation || distanceInfo.isWithin1km) {
            logger.info('Free shipping applied', {
                reason: distanceInfo.isSameLocation ? 'Same location' : 'Within 1km',
                toDistrictId,
                toWardCode
            });

            return {
                success: true,
                shippingFee: 0,
                serviceFee: 0,
                insuranceFee: 0,
                totalFee: 0,
                isFreeShipping: true,
                freeShippingReason: distanceInfo.isSameLocation
                    ? 'Cùng địa chỉ với kho hàng'
                    : 'Trong bán kính 1km',
                estimatedDeliveryTime: null
            };
        }

        // Case 3: Ngoài 1km → Gọi GHN API để tính phí
        logger.info('Calculating shipping fee via GHN API', { toDistrictId, toWardCode });
        const ghnResult = await calculateGHNShippingFee(params);

        return {
            ...ghnResult,
            isFreeShipping: false,
            freeShippingReason: null
        };

    } catch (error) {
        logger.error('Calculate shipping fee error', {
            error: error.message,
            params
        });

        // Fallback: Trả về phí mặc định
        return {
            success: false,
            shippingFee: 30000,
            error: error.message,
            isFreeShipping: false
        };
    }
};

/**
 * Kiểm tra địa chỉ có đủ điều kiện miễn phí vận chuyển không
 * @param {Number} districtId 
 * @param {String} wardCode 
 * @returns {Promise<Object>}
 */
export const checkFreeShippingEligibility = async (districtId, wardCode) => {
    try {
        const warehouseDistrictId = Number(
            process.env.GHN_FROM_DISTRICT_ID ||
            process.env.GHN_WAREHOUSE_DISTRICT_ID
        );
        const warehouseWardCode = process.env.GHN_FROM_WARD_CODE ||
            process.env.GHN_WAREHOUSE_WARD_CODE;

        if (!warehouseDistrictId || !warehouseWardCode) {
            return {
                success: false,
                isFreeShipping: false,
                message: 'Warehouse location not configured'
            };
        }

        const distanceInfo = calculateDistance(
            { districtId: warehouseDistrictId, wardCode: warehouseWardCode },
            { districtId, wardCode }
        );

        return {
            success: true,
            isFreeShipping: distanceInfo.isSameLocation || distanceInfo.isWithin1km,
            reason: distanceInfo.isSameLocation
                ? 'Cùng địa chỉ với kho hàng'
                : (distanceInfo.isWithin1km ? 'Trong bán kính 1km' : null),
            ...distanceInfo
        };
    } catch (error) {
        logger.error('Check free shipping eligibility error', { error: error.message });
        return {
            success: false,
            isFreeShipping: false,
            error: error.message
        };
    }
};

export default {
    calculateShippingFee,
    checkFreeShippingEligibility
};
