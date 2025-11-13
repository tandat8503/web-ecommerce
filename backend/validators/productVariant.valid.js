import Joi from "joi";

// Schema cho tạo variant mới
export const createProductVariantSchema = Joi.object({
  productId: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'ID sản phẩm phải là số',
      'number.integer': 'ID sản phẩm phải là số nguyên',
      'number.positive': 'ID sản phẩm phải là số dương',
      'any.required': 'ID sản phẩm là bắt buộc'
    }),
  
  // Tồn kho
  stockQuantity: Joi.number().integer().min(0).default(0)
    .messages({
      'number.base': 'Số lượng tồn kho phải là số',
      'number.integer': 'Số lượng tồn kho phải là số nguyên',
      'number.min': 'Số lượng tồn kho không được âm'
    }),
  
  minStockLevel: Joi.number().integer().min(0).default(5)
    .messages({
      'number.base': 'Mức tồn kho tối thiểu phải là số',
      'number.integer': 'Mức tồn kho tối thiểu phải là số nguyên',
      'number.min': 'Mức tồn kho tối thiểu không được âm'
    }),
  
  isActive: Joi.alternatives().try(
    Joi.boolean(),
    Joi.string().valid('true', 'false').custom((value) => value === 'true')
  ).default(true),
  
  // Kích thước (mm)
  width: Joi.number().integer().min(0).allow(null).optional()
    .messages({
      'number.base': 'Chiều rộng phải là số',
      'number.integer': 'Chiều rộng phải là số nguyên',
      'number.min': 'Chiều rộng không được âm'
    }),
  
  depth: Joi.number().integer().min(0).allow(null).optional()
    .messages({
      'number.base': 'Chiều sâu phải là số',
      'number.integer': 'Chiều sâu phải là số nguyên',
      'number.min': 'Chiều sâu không được âm'
    }),
  
  height: Joi.number().integer().min(0).allow(null).optional()
    .messages({
      'number.base': 'Chiều cao phải là số',
      'number.integer': 'Chiều cao phải là số nguyên',
      'number.min': 'Chiều cao không được âm'
    }),
  
  heightMax: Joi.number().integer().min(0).allow(null).optional()
    .messages({
      'number.base': 'Chiều cao tối đa phải là số',
      'number.integer': 'Chiều cao tối đa phải là số nguyên',
      'number.min': 'Chiều cao tối đa không được âm'
    }),
  
  // Thông số kỹ thuật
  warranty: Joi.string().max(100).allow('', null).optional()
    .messages({
      'string.max': 'Bảo hành không được quá 100 ký tự'
    }),
  
  material: Joi.string().max(200).allow('', null).optional()
    .messages({
      'string.max': 'Chất liệu không được quá 200 ký tự'
    }),
  
  weightCapacity: Joi.number().min(0).precision(2).allow(null).optional()
    .messages({
      'number.base': 'Trọng tải phải là số',
      'number.min': 'Trọng tải không được âm'
    }),
  
  color: Joi.string().max(50).allow('', null).optional()
    .messages({
      'string.max': 'Màu sắc không được quá 50 ký tự'
    }),
  
  dimensionNote: Joi.string().max(500).allow('', null).optional()
    .messages({
      'string.max': 'Ghi chú kích thước không được quá 500 ký tự'
    })
});

// Schema cho cập nhật variant
export const updateProductVariantSchema = Joi.object({
  // Cho phép đổi productId (chuyển variant sang sản phẩm khác)
  productId: Joi.alternatives().try(
    Joi.number().integer().positive(),
    Joi.string().pattern(/^\d+$/).custom((value) => parseInt(value, 10))
  ).optional()
    .messages({
      'number.base': 'ID sản phẩm phải là số',
      'number.integer': 'ID sản phẩm phải là số nguyên',
      'number.positive': 'ID sản phẩm phải là số dương'
    }),
  
  // Tồn kho - Cho phép string numbers
  stockQuantity: Joi.alternatives().try(
    Joi.number().integer().min(0),
    Joi.string().pattern(/^\d+$/).custom((value) => parseInt(value, 10))
  ).optional()
    .messages({
      'number.base': 'Số lượng tồn kho phải là số',
      'number.integer': 'Số lượng tồn kho phải là số nguyên',
      'number.min': 'Số lượng tồn kho không được âm'
    }),
  
  minStockLevel: Joi.alternatives().try(
    Joi.number().integer().min(0),
    Joi.string().pattern(/^\d+$/).custom((value) => parseInt(value, 10))
  ).optional()
    .messages({
      'number.base': 'Mức tồn kho tối thiểu phải là số',
      'number.integer': 'Mức tồn kho tối thiểu phải là số nguyên',
      'number.min': 'Mức tồn kho tối thiểu không được âm'
    }),
  
  isActive: Joi.alternatives().try(
    Joi.boolean(),
    Joi.string().valid('true', 'false').custom((value) => value === 'true')
  ).optional(),
  
  // Kích thước (mm) - Cho phép string numbers, empty strings, null
  width: Joi.alternatives().try(
    Joi.number().integer().min(0),
    Joi.string().pattern(/^\d+$/).custom((value) => value === '' ? null : parseInt(value, 10)),
    Joi.allow(null, '')
  ).optional()
    .messages({
      'number.base': 'Chiều rộng phải là số',
      'number.integer': 'Chiều rộng phải là số nguyên',
      'number.min': 'Chiều rộng không được âm'
    }),
  
  depth: Joi.alternatives().try(
    Joi.number().integer().min(0),
    Joi.string().pattern(/^\d+$/).custom((value) => value === '' ? null : parseInt(value, 10)),
    Joi.allow(null, '')
  ).optional()
    .messages({
      'number.base': 'Chiều sâu phải là số',
      'number.integer': 'Chiều sâu phải là số nguyên',
      'number.min': 'Chiều sâu không được âm'
    }),
  
  height: Joi.alternatives().try(
    Joi.number().integer().min(0),
    Joi.string().pattern(/^\d+$/).custom((value) => value === '' ? null : parseInt(value, 10)),
    Joi.allow(null, '')
  ).optional()
    .messages({
      'number.base': 'Chiều cao phải là số',
      'number.integer': 'Chiều cao phải là số nguyên',
      'number.min': 'Chiều cao không được âm'
    }),
  
  heightMax: Joi.alternatives().try(
    Joi.number().integer().min(0),
    Joi.string().pattern(/^\d+$/).custom((value) => value === '' ? null : parseInt(value, 10)),
    Joi.allow(null, '')
  ).optional()
    .messages({
      'number.base': 'Chiều cao tối đa phải là số',
      'number.integer': 'Chiều cao tối đa phải là số nguyên',
      'number.min': 'Chiều cao tối đa không được âm'
    }),
  
  // Thông số kỹ thuật
  warranty: Joi.string().max(100).allow('', null).optional()
    .messages({
      'string.max': 'Bảo hành không được quá 100 ký tự'
    }),
  
  material: Joi.string().max(200).allow('', null).optional()
    .messages({
      'string.max': 'Chất liệu không được quá 200 ký tự'
    }),
  
  weightCapacity: Joi.alternatives().try(
    Joi.number().min(0).precision(2),
    Joi.string().pattern(/^\d+(\.\d{1,2})?$/).custom((value) => value === '' ? null : parseFloat(value)),
    Joi.allow(null, '')
  ).optional()
    .messages({
      'number.base': 'Trọng tải phải là số',
      'number.min': 'Trọng tải không được âm'
    }),
  
  color: Joi.string().max(50).allow('', null).optional()
    .messages({
      'string.max': 'Màu sắc không được quá 50 ký tự'
    }),
  
  dimensionNote: Joi.string().max(500).allow('', null).optional()
    .messages({
      'string.max': 'Ghi chú kích thước không được quá 500 ký tự'
    })
});

