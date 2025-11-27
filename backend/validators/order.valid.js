import Joi from "joi";

// Schema cho tạo đơn hàng
export const createOrderSchema = Joi.object({
  // ID địa chỉ giao hàng - bắt buộc
  addressId: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'ID địa chỉ phải là số',
      'number.integer': 'ID địa chỉ phải là số nguyên',
      'number.positive': 'ID địa chỉ phải là số dương',
      'any.required': 'ID địa chỉ là bắt buộc'
    }),

  // Phương thức thanh toán - bắt buộc, chỉ cho phép các giá trị trong enum
  paymentMethod: Joi.string()
    .valid('COD', 'VNPAY')
    .required()
    .messages({
      'any.only': 'Phương thức thanh toán phải là COD hoặc VNPAY',
      'any.required': 'Phương thức thanh toán là bắt buộc'
    }),

  // Ghi chú của khách hàng - không bắt buộc
  customerNote: Joi.string()
    .max(500)
    .optional()
    .allow(null, '')
    .messages({
      'string.max': 'Ghi chú tối đa 500 ký tự'
    }),

  // Mã giảm giá - không bắt buộc
  couponCode: Joi.string()
    .min(3)
    .max(20)
    .optional()
    .allow(null, '')
    .messages({
      'string.min': 'Mã giảm giá phải có ít nhất 3 ký tự',
      'string.max': 'Mã giảm giá tối đa 20 ký tự'
    }),

  // Danh sách ID các cart items được chọn - bắt buộc, phải là mảng số nguyên dương
  cartItemIds: Joi.array()
    .items(Joi.number().integer().positive())
    .min(1)
    .required()
    .messages({
      'array.base': 'Danh sách sản phẩm phải là mảng',
      'array.min': 'Phải chọn ít nhất 1 sản phẩm',
      'any.required': 'Danh sách sản phẩm là bắt buộc',
      'number.base': 'ID sản phẩm phải là số',
      'number.integer': 'ID sản phẩm phải là số nguyên',
      'number.positive': 'ID sản phẩm phải là số dương'
    })
});

// Schema cho query parameters khi lấy danh sách đơn hàng
export const getOrdersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1)
    .messages({
      'number.base': 'Trang phải là số',
      'number.integer': 'Trang phải là số nguyên',
      'number.min': 'Trang phải lớn hơn 0'
    }),

  limit: Joi.number().integer().min(1).max(50).default(10)
    .messages({
      'number.base': 'Số lượng phải là số',
      'number.integer': 'Số lượng phải là số nguyên',
      'number.min': 'Số lượng phải lớn hơn 0',
      'number.max': 'Số lượng tối đa 50'
    }),

  status: Joi.string()
    .valid('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED')
    .optional()
    .messages({
      'any.only': 'Trạng thái đơn hàng không hợp lệ'
    })
});

// Schema cho ID đơn hàng trong params
export const orderIdSchema = Joi.object({
  id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'ID đơn hàng phải là số',
      'number.integer': 'ID đơn hàng phải là số nguyên',
      'number.positive': 'ID đơn hàng phải là số dương',
      'any.required': 'ID đơn hàng là bắt buộc'
    })
});
