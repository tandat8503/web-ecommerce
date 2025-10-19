import Joi from "joi";

export const createProductSchema = Joi.object({
    name: Joi.string().min(2).max(200).required(),
    slug: Joi.string().min(2).max(220).optional(),
    // SKU sẽ được tự động tạo bởi backend nếu không được cung cấp
    sku: Joi.string()
      .max(100)
      .pattern(/^[A-Z0-9-]+$/)
      .optional()
      .allow('')
      .messages({
        'string.pattern.base': 'SKU chỉ được chứa chữ hoa, số và dấu gạch'
      }),
    price: Joi.number().min(0).precision(2).required(),
    salePrice: Joi.number().min(0).precision(2).optional(),
    costPrice: Joi.number().min(0).precision(2).optional(),
    stock: Joi.number().integer().min(0).default(0),
    minStockLevel: Joi.number().integer().min(0).default(5),
    description: Joi.string().allow('', null),
    metaTitle: Joi.string().max(200).allow('', null),
    metaDescription: Joi.string().max(500).allow('', null),
    categoryId: Joi.number().integer().required(),
    brandId: Joi.number().integer().required(),
    isActive: Joi.alternatives().try(
      Joi.boolean(),
      Joi.string().valid('true', 'false').custom((value, helpers) => {
        return value === 'true';
      })
    ).default(true),
    isFeatured: Joi.alternatives().try(
      Joi.boolean(),
      Joi.string().valid('true', 'false').custom((value, helpers) => {
        return value === 'true';
      })
    ).default(false),
    status: Joi.string().valid('ACTIVE', 'INACTIVE', 'OUT_OF_STOCK').optional()
  });
  
  export const updateProductSchema = Joi.object({
    name: Joi.string().min(2).max(200).optional(),
    slug: Joi.string().min(2).max(220).optional(),
    // SKU có thể được cập nhật thủ công hoặc để trống để giữ nguyên
    sku: Joi.string()
      .max(100)
      .pattern(/^[A-Z0-9-]+$/)
      .optional()
      .allow('')
      .messages({
        'string.pattern.base': 'SKU chỉ được chứa chữ hoa, số và dấu gạch'
      }),
    price: Joi.number().min(0).precision(2).optional(),
    salePrice: Joi.number().min(0).precision(2).optional(),
    costPrice: Joi.number().min(0).precision(2).optional(),
    stock: Joi.number().integer().min(0).optional(),
    minStockLevel: Joi.number().integer().min(0).optional(),
    description: Joi.string().allow('', null),
    metaTitle: Joi.string().max(200).allow('', null),
    metaDescription: Joi.string().max(500).allow('', null),
    categoryId: Joi.number().integer().optional(),
    brandId: Joi.number().integer().optional(),
    isActive: Joi.alternatives().try(
      Joi.boolean(),
      Joi.string().valid('true', 'false').custom((value, helpers) => {
        return value === 'true';
      })
    ).optional(),
    isFeatured: Joi.alternatives().try(
      Joi.boolean(),
      Joi.string().valid('true', 'false').custom((value, helpers) => {
        return value === 'true';
      })
    ).optional(),
    status: Joi.string().valid('ACTIVE', 'INACTIVE', 'OUT_OF_STOCK').optional()
  });