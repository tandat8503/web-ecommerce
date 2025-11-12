export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    // Xác định nguồn dữ liệu cần validate
    let data;
    if (source === 'params') {
      data = { ...req.params };
    } else if (source === 'query') {
      data = { ...req.query };
    } else {
      // Mặc định là body
      data = { ...req.body };
    }
    
    // Chỉ xử lý number conversion cho body (không áp dụng cho params/query)
    if (source === 'body') {
      // List of fields that should be numbers
      const numberFields = ['price', 'salePrice', 'costPrice', 'stock', 'minStockLevel', 'categoryId', 'brandId', 
                            'length', 'width', 'height', 'seatHeight', 'backHeight', 'depth'];
      
      // Convert string numbers to numbers
      for (const field of numberFields) {
        if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
          if (typeof data[field] === 'string') {
            // Check if it's a valid number string
            if (/^-?\d+(\.\d+)?$/.test(data[field])) {
              data[field] = parseFloat(data[field]);
            }
          }
        } else if (data[field] === '') {
          // Empty string should be null for optional fields
          data[field] = null;
        }
      }
      
      // Convert boolean strings to booleans
      if (data.isActive !== undefined) {
        if (data.isActive === 'true' || data.isActive === true) data.isActive = true;
        else if (data.isActive === 'false' || data.isActive === false) data.isActive = false;
      }
      
      if (data.isFeatured !== undefined) {
        if (data.isFeatured === 'true' || data.isFeatured === true) data.isFeatured = true;
        else if (data.isFeatured === 'false' || data.isFeatured === false) data.isFeatured = false;
      }
    } else {
      // Với params và query, convert string numbers thành numbers nếu có thể
      for (const key in data) {
        if (data[key] !== undefined && data[key] !== null && typeof data[key] === 'string') {
          // Nếu là số nguyên dương (cho productId, id, etc.)
          if (/^\d+$/.test(data[key])) {
            data[key] = parseInt(data[key], 10);
          }
        }
      }
    }
    
    const { error, value } = schema.validate(data, { abortEarly: false, stripUnknown: true });
    if (error) {
      console.error('Validation error:', error.details);
      return res.status(400).json({
        code: 400,
        message: "Dữ liệu không hợp lệ",
        errors: error.details.map((err) => err.message),
      });
    }
    
    // Update request object với validated values
    if (source === 'params') {
      req.params = value;
    } else if (source === 'query') {
      req.query = value;
    } else {
      req.body = value;
    }
    next();
  };
};
