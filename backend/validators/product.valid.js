import Joi from "joi";

export const createProductSchema = Joi.object({
    name: Joi.string().min(2).max(200).required(),
    slug: Joi.string().min(2).max(220).optional(),
    sku: Joi.string().max(100).required(),
    price: Joi.number().min(0).precision(2).required(),
    stock: Joi.number().integer().min(0).default(0),
    description: Joi.string().allow('', null),
    categoryId: Joi.number().integer().required(),
    brandId: Joi.number().integer().required(),
    isActive: Joi.boolean().default(true)
  });
  
  export const updateProductSchema = Joi.object({
    name: Joi.string().min(2).max(200).optional(),
    slug: Joi.string().min(2).max(220).optional(),
    sku: Joi.string().max(100).optional(),
    price: Joi.number().min(0).precision(2).optional(),
    stock: Joi.number().integer().min(0).optional(),
    description: Joi.string().allow('', null),
    categoryId: Joi.number().integer().optional(),
    brandId: Joi.number().integer().optional(),
    isActive: Joi.boolean().optional()
  });