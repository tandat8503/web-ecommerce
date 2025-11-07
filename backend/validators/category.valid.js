import Joi from 'joi';

export const createCategorySchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  slug: Joi.string().min(2).max(120).optional(),
  isActive: Joi.boolean().default(true)
});

export const updateCategorySchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  slug: Joi.string().min(2).max(120).optional(),
  isActive: Joi.boolean().optional()
});