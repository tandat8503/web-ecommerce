-- ============================================================================
-- SQL SCRIPT TO FIX DATABASE FOR AI CHATBOT
-- ============================================================================
-- Purpose: Add missing descriptions to products
-- Date: 2025-12-28
-- ============================================================================

-- Step 1: Add descriptions for products missing them
-- Note: You need to customize these descriptions based on actual products

-- Product ID 24: Veno VE02B-GR
UPDATE products 
SET description = 'Ghế xoay công thái học cao cấp Veno VE02B-GR với tựa lưng lưới thoáng khí, hỗ trợ thắt lưng điều chỉnh được, tay vịn 3D linh hoạt, chân nhôm đúc cao cấp. Thiết kế hiện đại, phù hợp cho văn phòng, giúp bảo vệ cột sống khi làm việc lâu dài. Sản phẩm có khả năng điều chỉnh độ cao, góc ngả linh hoạt, mang lại sự thoải mái tối đa cho người sử dụng.'
WHERE id = 24 AND (description IS NULL OR description = '');

-- Product ID 23: Oval OH02-Trắng
UPDATE products 
SET description = 'Bàn họp Oval OH02 màu trắng với thiết kế hình oval sang trọng, mặt bàn rộng rãi phù hợp cho phòng họp từ 6-8 người. Chất liệu gỗ công nghiệp cao cấp phủ melamine chống trầy xước, chân bàn kim loại sơn tĩnh điện bền đẹp. Thiết kế hiện đại, tạo không gian làm việc chuyên nghiệp cho doanh nghiệp.'
WHERE id = 23 AND (description IS NULL OR description = '');

-- Product ID 22: Oval OH02
UPDATE products 
SET description = 'Bàn họp Oval OH02 với thiết kế hình oval độc đáo, tạo không gian thảo luận thoải mái và chuyên nghiệp. Mặt bàn rộng rãi, phù hợp cho phòng họp từ 6-8 người. Chất liệu gỗ công nghiệp cao cấp phủ melamine chống trầy xước, chống nước. Chân bàn kim loại sơn tĩnh điện chắc chắn, bền đẹp theo thời gian.'
WHERE id = 22 AND (description IS NULL OR description = '');

-- Product ID 21: Bàn họp nhập khẩu Monterra MTH05A
UPDATE products 
SET description = 'Bàn họp nhập khẩu cao cấp Monterra MTH05A với thiết kế sang trọng, hiện đại. Mặt bàn gỗ công nghiệp phủ melamine cao cấp chống trầy xước, chống nước tốt. Chân bàn kim loại sơn tĩnh điện bền đẹp, chắc chắn. Phù hợp cho phòng họp lớn, tạo không gian làm việc chuyên nghiệp cho doanh nghiệp. Sản phẩm nhập khẩu chính hãng, bảo hành dài hạn.'
WHERE id = 21 AND (description IS NULL OR description = '');

-- ============================================================================
-- TEMPLATE FOR REMAINING PRODUCTS
-- ============================================================================
-- You need to fill in descriptions for the remaining 17 products
-- Use this template:

/*
UPDATE products 
SET description = '[Product description here - should be 100-300 words, include:
- Product type and brand
- Key features (3-5 points)
- Materials and dimensions
- Target users
- Benefits
- Warranty info]'
WHERE id = [PRODUCT_ID] AND (description IS NULL OR description = '');
*/

-- ============================================================================
-- Step 2: Verify the updates
-- ============================================================================

-- Check how many products still missing description
SELECT COUNT(*) as missing_description_count
FROM products 
WHERE status = 'ACTIVE' 
AND (description IS NULL OR description = '');

-- List products still missing description
SELECT id, name, category_id, price
FROM products 
WHERE status = 'ACTIVE' 
AND (description IS NULL OR description = '')
ORDER BY id;

-- ============================================================================
-- Step 3: (Optional) Deactivate empty categories
-- ============================================================================

-- Deactivate categories with no products
UPDATE categories 
SET is_active = 0 
WHERE id IN (
    SELECT c.id 
    FROM categories c
    LEFT JOIN products p ON c.id = p.category_id AND p.status = 'ACTIVE'
    WHERE c.is_active = 1
    GROUP BY c.id
    HAVING COUNT(p.id) = 0
);

-- Verify deactivated categories
SELECT name, is_active 
FROM categories 
ORDER BY is_active DESC, name;

-- ============================================================================
-- Step 4: After running this script, re-embed VectorDB
-- ============================================================================

-- Run in terminal:
-- cd ai
-- python3 scripts/embed_products.py

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. Customize product descriptions based on actual product details
-- 2. Include keywords for better AI search (e.g., "văn phòng", "cao cấp", "hiện đại")
-- 3. Mention materials, dimensions, colors from product_variants table
-- 4. Add benefits and target users
-- 5. Keep descriptions between 100-300 words
-- 6. Use Vietnamese language naturally
-- 7. Include emojis sparingly for better readability
-- ============================================================================
