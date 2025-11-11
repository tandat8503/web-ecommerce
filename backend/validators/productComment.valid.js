import Joi from 'joi';

/**
 * Schema validate cho tạo bình luận
 */
export const commentSchema = Joi.object({
  productId: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'ID sản phẩm phải là số',
      'number.integer': 'ID sản phẩm phải là số nguyên',
      'number.positive': 'ID sản phẩm phải là số dương',
      'any.required': 'ID sản phẩm là bắt buộc'
    }),

  content: Joi.string().trim().min(3).max(1000).required()
    .messages({
      'string.base': 'Nội dung bình luận phải là chuỗi',
      'string.empty': 'Nội dung bình luận không được để trống',
      'string.min': 'Nội dung bình luận phải có ít nhất 3 ký tự',
      'string.max': 'Nội dung bình luận không được vượt quá 1000 ký tự',
      'any.required': 'Nội dung bình luận là bắt buộc'
    }),

  parentId: Joi.number().integer().positive().allow(null).optional()
    .messages({
      'number.base': 'ID bình luận cha phải là số',
      'number.integer': 'ID bình luận cha phải là số nguyên',
      'number.positive': 'ID bình luận cha phải là số dương'
    })
});

/**
 * Schema validate cho cập nhật bình luận
 */
export const updateCommentSchema = Joi.object({
  content: Joi.string().trim().min(3).max(1000).required()
    .messages({
      'string.base': 'Nội dung bình luận phải là chuỗi',
      'string.empty': 'Nội dung bình luận không được để trống',
      'string.min': 'Nội dung bình luận phải có ít nhất 3 ký tự',
      'string.max': 'Nội dung bình luận không được vượt quá 1000 ký tự',
      'any.required': 'Nội dung bình luận là bắt buộc'
    })
});

/**
 * Schema validate cho approve/reject bình luận
 */
export const approveCommentSchema = Joi.object({
  isApproved: Joi.boolean().required()
    .messages({
      'boolean.base': 'Trạng thái duyệt phải là true/false',
      'any.required': 'Trạng thái duyệt là bắt buộc'
    })
});

