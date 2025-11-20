import Joi from 'joi';

/**
 * Schema validate cho tạo đánh giá sản phẩm
 */
export const reviewSchema = Joi.object({
  productId: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'ID sản phẩm phải là số',
      'number.integer': 'ID sản phẩm phải là số nguyên',
      'number.positive': 'ID sản phẩm phải là số dương',
      'any.required': 'ID sản phẩm là bắt buộc'
    }),

  rating: Joi.number().integer().min(1).max(5).required()
    .messages({
      'number.base': 'Đánh giá phải là số',
      'number.integer': 'Đánh giá phải là số nguyên',
      'number.min': 'Đánh giá phải từ 1 đến 5 sao',
      'number.max': 'Đánh giá phải từ 1 đến 5 sao',
      'any.required': 'Đánh giá là bắt buộc'
    }),

  title: Joi.string().trim().min(3).max(200).optional().allow(null, '')
    .messages({
      'string.base': 'Tiêu đề đánh giá phải là chuỗi',
      'string.min': 'Tiêu đề đánh giá phải có ít nhất 3 ký tự',
      'string.max': 'Tiêu đề đánh giá không được vượt quá 200 ký tự'
    }),

  comment: Joi.string().trim().min(3).max(2000).optional().allow(null, '')
    .messages({
      'string.base': 'Nội dung đánh giá phải là chuỗi',
      'string.min': 'Nội dung đánh giá phải có ít nhất 3 ký tự',
      'string.max': 'Nội dung đánh giá không được vượt quá 2000 ký tự'
    }),

  orderId: Joi.number().integer().positive().optional().allow(null)
    .messages({
      'number.base': 'ID đơn hàng phải là số',
      'number.integer': 'ID đơn hàng phải là số nguyên',
      'number.positive': 'ID đơn hàng phải là số dương'
    })
});

/**
 * Schema validate cho cập nhật đánh giá
 */
export const updateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).optional()
    .messages({
      'number.base': 'Đánh giá phải là số',
      'number.integer': 'Đánh giá phải là số nguyên',
      'number.min': 'Đánh giá phải từ 1 đến 5 sao',
      'number.max': 'Đánh giá phải từ 1 đến 5 sao'
    }),

  title: Joi.string().trim().min(3).max(200).optional().allow(null, '')
    .messages({
      'string.base': 'Tiêu đề đánh giá phải là chuỗi',
      'string.min': 'Tiêu đề đánh giá phải có ít nhất 3 ký tự',
      'string.max': 'Tiêu đề đánh giá không được vượt quá 200 ký tự'
    }),

  comment: Joi.string().trim().min(3).max(2000).optional().allow(null, '')
    .messages({
      'string.base': 'Nội dung đánh giá phải là chuỗi',
      'string.min': 'Nội dung đánh giá phải có ít nhất 3 ký tự',
      'string.max': 'Nội dung đánh giá không được vượt quá 2000 ký tự'
    })
});

/**
 * Schema validate cho approve/reject đánh giá (admin)
 */
export const approveReviewSchema = Joi.object({
  isApproved: Joi.boolean().required()
    .messages({
      'boolean.base': 'Trạng thái duyệt phải là true/false',
      'any.required': 'Trạng thái duyệt là bắt buộc'
    })
});

