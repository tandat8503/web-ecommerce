import Joi from "joi";

// Schema tạo mã giảm giá
export const createCouponSchema = Joi.object({
  code: Joi.string()
    .min(2)
    .max(30)
    .required()
    .messages({
      'string.min': 'Mã giảm giá phải có ít nhất 2 ký tự',
      'string.max': 'Mã giảm giá không được quá 30 ký tự'
    }),
  
  name: Joi.string()
    .min(3)
    .max(150)
    .required()
    .messages({
      'string.min': 'Tên mã giảm giá phải có ít nhất 3 ký tự',
      'string.max': 'Tên mã giảm giá không được quá 150 ký tự'
    }),
  
  discountType: Joi.string()
    .valid('PERCENT', 'AMOUNT')
    .required()
    .messages({
      'any.only': 'Loại giảm giá phải là PERCENT hoặc AMOUNT'
    }),
  
  discountValue: Joi.number()
    .positive()
    .required()
    .messages({
      'number.positive': 'Giá trị giảm giá phải là số dương'
    }),
  
  minimumAmount: Joi.number()
    .min(0)
    .default(0)
    .messages({
      'number.min': 'Giá trị đơn hàng tối thiểu không được âm'
    }),
  
  usageLimit: Joi.number()
    .integer()
    .min(1)
    .default(100)
    .messages({
      'number.min': 'Giới hạn sử dụng phải ít nhất 1',
      'number.integer': 'Giới hạn sử dụng phải là số nguyên'
    }),
  
  // ✅ Sửa: Cho phép ngày trong quá khứ (để test)
  startDate: Joi.date()
    .required()
    .messages({
      'date.base': 'Ngày bắt đầu không hợp lệ'
    }),
  
  // ✅ Sửa: Chỉ cần sau startDate
  endDate: Joi.date()
    .min(Joi.ref('startDate'))
    .required()
    .messages({
      'date.min': 'Ngày kết thúc phải sau ngày bắt đầu'
    }),
  
  // ✅ Sửa: Chấp nhận cả string và boolean
  isActive: Joi.alternatives()
    .try(
      Joi.boolean(),
      Joi.string().valid('true', 'false')
    )
    .default(true)
    .messages({
      'alternatives.match': 'Trạng thái hoạt động phải là true/false hoặc "true"/"false"'
    })
});

// Schema cập nhật mã giảm giá
export const updateCouponSchema = Joi.object({
  code: Joi.string()
    .min(2)
    .max(30)
    .optional()
    .allow('')
    .messages({
      'string.min': 'Mã giảm giá phải có ít nhất 2 ký tự',
      'string.max': 'Mã giảm giá không được quá 30 ký tự'
    }),
  
  name: Joi.string()
    .min(3)
    .max(150)
    .optional()
    .allow('')
    .messages({
      'string.min': 'Tên mã giảm giá phải có ít nhất 3 ký tự',
      'string.max': 'Tên mã giảm giá không được quá 150 ký tự'
    }),
  
  discountType: Joi.string()
    .valid('PERCENT', 'AMOUNT')
    .optional()
    .allow('')
    .messages({
      'any.only': 'Loại giảm giá phải là PERCENT hoặc AMOUNT'
    }),
  
  discountValue: Joi.number()
    .positive()
    .optional()
    .allow(null)
    .messages({
      'number.positive': 'Giá trị giảm giá phải là số dương'
    }),
  
  minimumAmount: Joi.number()
    .min(0)
    .optional()
    .allow(null)
    .messages({
      'number.min': 'Giá trị đơn hàng tối thiểu không được âm'
    }),
  
  usageLimit: Joi.number()
    .integer()
    .min(1)
    .optional()
    .allow(null)
    .messages({
      'number.min': 'Giới hạn sử dụng phải ít nhất 1',
      'number.integer': 'Giới hạn sử dụng phải là số nguyên'
    }),
  
  startDate: Joi.date()
    .optional()
    .allow('')
    .messages({
      'date.base': 'Ngày bắt đầu không hợp lệ'
    }),
  
  endDate: Joi.date()
    .optional()
    .allow('')
    .messages({
      'date.base': 'Ngày kết thúc không hợp lệ'
    }),
  
  isActive: Joi.alternatives()
    .try(
      Joi.boolean(),
      Joi.string().valid('true', 'false')
    )
    .optional()
    .allow('')
    .messages({
      'alternatives.match': 'Trạng thái hoạt động phải là true/false hoặc "true"/"false"'
    })
});
