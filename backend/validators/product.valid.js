import Joi from "joi";

export const createProductSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  slug: Joi.string().min(2).max(220).optional(),
  price: Joi.number().min(0).precision(2).required(),
  salePrice: Joi.alternatives().try(
    Joi.number().min(0).precision(2),
    Joi.allow(null, '')
  ).optional().custom((value, helpers) => {
    // ✅ Validation: salePrice phải nhỏ hơn price
    if (value && value !== '' && helpers.state.ancestors[0].price) {
      const price = Number(helpers.state.ancestors[0].price);
      const salePrice = Number(value);
      if (salePrice >= price) {
        return helpers.error('any.invalid', {
          message: 'Giá khuyến mãi phải nhỏ hơn giá gốc'
        });
      }
    }
    return value;
  }),
  costPrice: Joi.alternatives().try(
    Joi.number().min(0).precision(2),
    Joi.allow(null, '')
  ).optional(),
  stock: Joi.alternatives().try(
    Joi.number().integer().min(0),
    Joi.allow(null, '')
  ).optional().default(0),
  minStockLevel: Joi.alternatives().try(
    Joi.number().integer().min(0),
    Joi.allow(null, '')
  ).optional().default(5),
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
  price: Joi.alternatives().try(
    Joi.number().min(0).precision(2),
    Joi.string().pattern(/^\d+(\.\d{1,2})?$/).custom((value, helpers) => {
      const num = parseFloat(value);
      return isNaN(num) ? helpers.error('number.base') : num;
    })
  ).optional(),
  salePrice: Joi.alternatives().try(
    Joi.number().min(0).precision(2),
    Joi.string().pattern(/^\d+(\.\d{1,2})?$/).allow('', null).custom((value, helpers) => {
      if (!value || value === '') return null;
      const num = parseFloat(value);
      return isNaN(num) ? helpers.error('number.base') : num;
    })
  ).optional().allow(null, '').custom((value, helpers) => {
    // ✅ Validation: salePrice phải nhỏ hơn price khi update
    if (value && value !== '' && value !== null && helpers.state.ancestors[0].price) {
      const price = Number(helpers.state.ancestors[0].price);
      const salePrice = Number(value);
      if (salePrice >= price) {
        return helpers.error('any.invalid', {
          message: 'Giá khuyến mãi phải nhỏ hơn giá gốc'
        });
      }
    }
    return value;
  }),
  costPrice: Joi.alternatives().try(
    Joi.number().min(0).precision(2),
    Joi.string().pattern(/^\d+(\.\d{1,2})?$/).allow('', null).custom((value, helpers) => {
      if (!value || value === '') return null;
      const num = parseFloat(value);
      return isNaN(num) ? helpers.error('number.base') : num;
    })
  ).optional().allow(null, ''),
  stock: Joi.alternatives().try(
    Joi.number().integer().min(0),
    Joi.string().pattern(/^\d+$/).custom((value, helpers) => {
      const num = parseInt(value);
      return isNaN(num) ? helpers.error('number.base') : num;
    }),
    Joi.allow(null, '')
  ).optional(),
  minStockLevel: Joi.alternatives().try(
    Joi.number().integer().min(0),
    Joi.string().pattern(/^\d+$/).custom((value, helpers) => {
      const num = parseInt(value);
      return isNaN(num) ? helpers.error('number.base') : num;
    }),
    Joi.allow(null, '')
  ).optional(),
  description: Joi.string().allow('', null),
  metaTitle: Joi.string().max(200).allow('', null),
  metaDescription: Joi.string().max(500).allow('', null),
  categoryId: Joi.alternatives().try(
    Joi.number().integer(),
    Joi.string().pattern(/^\d+$/).custom((value, helpers) => {
      const num = parseInt(value);
      return isNaN(num) ? helpers.error('number.base') : num;
    })
  ).optional(),
  brandId: Joi.alternatives().try(
    Joi.number().integer(),
    Joi.string().pattern(/^\d+$/).custom((value, helpers) => {
      const num = parseInt(value);
      return isNaN(num) ? helpers.error('number.base') : num;
    })
  ).optional(),
  warranty: Joi.string().allow('', null).optional(),
  length: Joi.alternatives().try(
    Joi.number(),
    Joi.string().pattern(/^\d+(\.\d{1,2})?$/).allow('', null).custom((value, helpers) => {
      if (!value || value === '') return null;
      const num = parseFloat(value);
      return isNaN(num) ? helpers.error('number.base') : num;
    })
  ).optional().allow(null, ''),
  width: Joi.alternatives().try(
    Joi.number(),
    Joi.string().pattern(/^\d+(\.\d{1,2})?$/).allow('', null).custom((value, helpers) => {
      if (!value || value === '') return null;
      const num = parseFloat(value);
      return isNaN(num) ? helpers.error('number.base') : num;
    })
  ).optional().allow(null, ''),
  height: Joi.alternatives().try(
    Joi.number(),
    Joi.string().pattern(/^\d+(\.\d{1,2})?$/).allow('', null).custom((value, helpers) => {
      if (!value || value === '') return null;
      const num = parseFloat(value);
      return isNaN(num) ? helpers.error('number.base') : num;
    })
  ).optional().allow(null, ''),
  seatHeight: Joi.alternatives().try(
    Joi.number(),
    Joi.string().pattern(/^\d+(\.\d{1,2})?$/).allow('', null).custom((value, helpers) => {
      if (!value || value === '') return null;
      const num = parseFloat(value);
      return isNaN(num) ? helpers.error('number.base') : num;
    })
  ).optional().allow(null, ''),
  backHeight: Joi.alternatives().try(
    Joi.number(),
    Joi.string().pattern(/^\d+(\.\d{1,2})?$/).allow('', null).custom((value, helpers) => {
      if (!value || value === '') return null;
      const num = parseFloat(value);
      return isNaN(num) ? helpers.error('number.base') : num;
    })
  ).optional().allow(null, ''),
  depth: Joi.alternatives().try(
    Joi.number(),
    Joi.string().pattern(/^\d+(\.\d{1,2})?$/).allow('', null).custom((value, helpers) => {
      if (!value || value === '') return null;
      const num = parseFloat(value);
      return isNaN(num) ? helpers.error('number.base') : num;
    })
  ).optional().allow(null, ''),
  dimensionUnit: Joi.string().valid('cm', 'inch').optional(),
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