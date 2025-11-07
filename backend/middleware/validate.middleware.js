export const validate = (schema) => {
  return (req, res, next) => {
    // Parse FormData values - convert string numbers to numbers where appropriate
    const body = { ...req.body };
    
    // List of fields that should be numbers
    const numberFields = ['price', 'salePrice', 'costPrice', 'stock', 'minStockLevel', 'categoryId', 'brandId', 
                          'length', 'width', 'height', 'seatHeight', 'backHeight', 'depth'];
    
    // Convert string numbers to numbers
    for (const field of numberFields) {
      if (body[field] !== undefined && body[field] !== null && body[field] !== '') {
        if (typeof body[field] === 'string') {
          // Check if it's a valid number string
          if (/^-?\d+(\.\d+)?$/.test(body[field])) {
            body[field] = parseFloat(body[field]);
          }
        }
      } else if (body[field] === '') {
        // Empty string should be null for optional fields
        body[field] = null;
      }
    }
    
    // Convert boolean strings to booleans
    if (body.isActive !== undefined) {
      if (body.isActive === 'true' || body.isActive === true) body.isActive = true;
      else if (body.isActive === 'false' || body.isActive === false) body.isActive = false;
    }
    
    if (body.isFeatured !== undefined) {
      if (body.isFeatured === 'true' || body.isFeatured === true) body.isFeatured = true;
      else if (body.isFeatured === 'false' || body.isFeatured === false) body.isFeatured = false;
    }
    
    const { error, value } = schema.validate(body, { abortEarly: false, stripUnknown: true });
    if (error) {
      console.error('Validation error:', error.details);
      return res.status(400).json({
        code: 400,
        message: "Dữ liệu không hợp lệ",
        errors: error.details.map((err) => err.message),
      });
    }
    
    // Update req.body with validated and converted values
    req.body = value;
    next();
  };
};
