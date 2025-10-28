import Joi from "joi";

// Schema cho thêm sản phẩm vào giỏ hàng
export const addToCartSchema = Joi.object({
  productId: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'ID sản phẩm phải là số',
      'number.integer': 'ID sản phẩm phải là số nguyên',
      'number.positive': 'ID sản phẩm phải là số dương',
      'any.required': 'ID sản phẩm là bắt buộc'
    }),
  
  variantId: Joi.number().integer().positive().allow(null).optional()
    .messages({
      'number.base': 'ID biến thể phải là số',
      'number.integer': 'ID biến thể phải là số nguyên',
      'number.positive': 'ID biến thể phải là số dương'
    }),
  
  quantity: Joi.number().integer().min(1).max(10).default(1)
    .messages({
      'number.base': 'Số lượng phải là số',
      'number.integer': 'Số lượng phải là số nguyên',
      'number.min': 'Số lượng phải lớn hơn 0',
      'number.max': 'Không thể thêm quá 10 sản phẩm cùng lúc'
    })
});

// Schema cho cập nhật số lượng sản phẩm trong giỏ hàng
export const updateCartItemSchema = Joi.object({
  quantity: Joi.number().integer().min(1).max(10).required()
    .messages({
      'number.base': 'Số lượng phải là số',
      'number.integer': 'Số lượng phải là số nguyên',
      'number.min': 'Số lượng phải lớn hơn 0',
      'number.max': 'Không thể thêm quá 10 sản phẩm cùng lúc',
      'any.required': 'Số lượng là bắt buộc'
    })
});