import Joi from 'joi';

export const createBrandSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  country: Joi.string().max(100).optional(),
  logoUrl: Joi.string().uri().optional(),
  isActive: Joi.boolean().default(true)
});

export const updateBrandSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  country: Joi.string().max(100).optional(),
  logoUrl: Joi.string().uri().optional(),
  isActive: Joi.boolean().optional()
});

