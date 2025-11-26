import Joi from "joi";

export const addressSchema = Joi.object({
  fullName: Joi.string()
    .min(2)               
    .max(100)              
    .required()            
    .messages({
      "string.empty": "Họ tên không được để trống",
      "string.min": "Họ tên phải có ít nhất 2 ký tự",
      "string.max": "Họ tên tối đa 100 ký tự",
      "any.required": "Họ tên là bắt buộc",
    }),

  // Số điện thoại: bắt buộc, phải theo định dạng (0xxxxxxxxx)
  phone: Joi.string()
    .pattern(/^(0[0-9]{9})$/) // regex: bắt đầu bằng 0, đủ 10 số
    .required()               // bắt buộc phải có
    .messages({
      "string.empty": "Số điện thoại không được để trống",
      "string.pattern.base": "Số điện thoại không hợp lệ (bắt đầu bằng 0, đủ 10 số)",
      "any.required": "Số điện thoại là bắt buộc",
    }),

  // Địa chỉ chi tiết: bắt buộc, từ 5–255 ký tự
  streetAddress: Joi.string()
    .min(5)        // ít nhất 5 ký tự
    .max(255)      // tối đa 255 ký tự
    .required()    // bắt buộc phải có
    .messages({
      "string.empty": "Địa chỉ chi tiết không được để trống",
      "string.min": "Địa chỉ chi tiết phải có ít nhất 5 ký tự",
      "string.max": "Địa chỉ tối đa 255 ký tự",
      "any.required": "Địa chỉ chi tiết là bắt buộc",
    }),

  // Phường/Xã: bắt buộc
  ward: Joi.string()
    .required()
    .messages({
      "string.empty": "Phường/Xã không được để trống",
      "any.required": "Phường/Xã là bắt buộc",
    }),

  district: Joi.string()
    .required()
    .messages({
      "string.empty": "Quận/Huyện không được để trống",
      "any.required": "Quận/Huyện là bắt buộc",
    }),

  city: Joi.string()
    .required()
    .messages({
      "string.empty": "Tỉnh/Thành phố không được để trống",
      "any.required": "Tỉnh/Thành phố là bắt buộc",
    }),

  // Loại địa chỉ: chỉ cho phép "HOME" hoặc "OFFICE" (theo enum trong database)
  // Nếu không truyền thì mặc định là "HOME"
  addressType: Joi.string()
  .valid("home", "office", "HOME", "OFFICE")
  .insensitive()  // không phân biệt hoa thường

    .default("HOME")          // mặc định là "HOME"
    .messages({
      "any.only": "Loại địa chỉ không hợp lệ (HOME, OFFICE)",
    }),

  // Có phải địa chỉ mặc định hay không: true/false
  // Không bắt buộc phải có
  isDefault: Joi.boolean()
    .optional(),   // nếu muốn có giá trị mặc định thì dùng .default(false)

  // Ghi chú: không bắt buộc, tối đa 255 ký tự
  note: Joi.string()
    .max(255)      // tối đa 255 ký tự
    .optional()    // không bắt buộc
    .allow(null, "")  // cho phép null hoặc chuỗi rỗng
    .messages({
      "string.max": "Ghi chú tối đa 255 ký tự",
    }),

  // GHN District ID: không bắt buộc, dùng để tính phí vận chuyển
  ghnDistrictId: Joi.number()
    .integer()
    .positive()
    .optional()
    .allow(null)
    .messages({
      "number.base": "GHN District ID phải là số",
      "number.positive": "GHN District ID phải là số dương",
    }),

  // GHN Ward Code: không bắt buộc, dùng để tính phí vận chuyển
  ghnWardCode: Joi.string()
    .optional()
    .allow(null, "")
    .messages({
      "string.base": "GHN Ward Code phải là chuỗi",
    }),
});

