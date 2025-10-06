import Joi from 'joi';

export const createProductImageSchema = Joi.object({
  isPrimary: Joi.boolean().default(false),
  sortOrder: Joi.number().integer().min(0).default(0)
});

export const updateProductImageSchema = Joi.object({
  isPrimary: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().min(0).optional()
});

export const reorderImagesSchema = Joi.object({
  imageOrders: Joi.array().items(
    Joi.object({
      id: Joi.number().integer().required(),
      sortOrder: Joi.number().integer().min(0).required()
    })
  ).required()
});
