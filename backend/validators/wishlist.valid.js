import Joi from "joi";

// Schema cho thêm sản phẩm vào wishlist
export const addToWishlistSchema = Joi.object({
  productId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      "number.base": "ID sản phẩm phải là số",
      "number.integer": "ID sản phẩm phải là số nguyên",
      "number.positive": "ID sản phẩm phải là số dương",
      "any.required": "ID sản phẩm là bắt buộc",
    }),
});

// Schema cho kiểm tra tham số productId trong URL
export const productIdParamSchema = Joi.object({
  productId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      "number.base": "ID sản phẩm phải là số",
      "number.integer": "ID sản phẩm phải là số nguyên", 
      "number.positive": "ID sản phẩm phải là số dương",
      "any.required": "ID sản phẩm là bắt buộc",
    }),
});
