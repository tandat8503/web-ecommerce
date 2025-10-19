export const slugify = (text) =>
  text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

export const generateSKU = async (name, categoryName, brandName, prisma) => {
  // Helper function để xử lý tiếng Việt và tạo code
  const createCode = (text, length) => {
    return text
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Loại bỏ dấu
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '') // Chỉ giữ chữ và số
      .substring(0, length)
      .padEnd(length, 'X'); // Nếu không đủ thì thêm X
  };
  
  // Tạo base SKU
  const categoryPrefix = createCode(categoryName, 3); // 3 ký tự
  const brandCode = createCode(brandName, 3); // 3 ký tự
  const productCode = createCode(name, 3); // 3 ký tự
  
  const baseSku = `${categoryPrefix}${brandCode}${productCode}`;
  
  // Kiểm tra trùng lặp và thêm số nếu cần
  let counter = 1;
  let finalSku = baseSku;
  
  while (await prisma.product.findUnique({ where: { sku: finalSku } })) {
    finalSku = `${baseSku}${String(counter).padStart(2, '0')}`;
    counter++;
    
    // Tránh vòng lặp vô hạn (tối đa 99 sản phẩm cùng base)
    if (counter > 99) {
      throw new Error('Không thể tạo SKU unique cho sản phẩm này');
    }
  }
  
  return finalSku;
};

export default slugify;