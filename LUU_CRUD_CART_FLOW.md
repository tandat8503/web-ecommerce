# 🛒 LUỒNG DỮ LIỆU: CRUD GIỎ HÀNG (CART) - USER

## 📋 TỔNG QUAN

Chức năng giỏ hàng cho phép user:
- ✅ **CREATE**: Thêm sản phẩm vào giỏ hàng
- ✅ **READ**: Xem danh sách sản phẩm trong giỏ hàng
- ✅ **UPDATE**: Cập nhật số lượng sản phẩm
- ✅ **DELETE**: Xóa sản phẩm khỏi giỏ hàng / Xóa tất cả

**Kiến trúc:**
- **Frontend**: ReactJS + Zustand (State Management) + Axios (API Client)
- **Backend**: Node.js + Express + Prisma ORM
- **Database**: MySQL (bảng `shopping_cart`)

---

## 🗄️ DATABASE SCHEMA

### **Bảng `shopping_cart`**

```prisma
model ShoppingCart {
  id        Int             @id @default(autoincrement())
  userId    Int             @map("user_id")          // FK → users.id
  productId Int             @map("product_id")       // FK → products.id
  variantId Int?            @map("variant_id")       // FK → product_variants.id
  quantity  Int             @default(1)              // Số lượng
  createdAt DateTime        @default(now()) @map("created_at")
  updatedAt DateTime        @updatedAt @map("updated_at")
  
  // Relations
  product   Product         @relation(fields: [productId], references: [id])
  user      User            @relation(fields: [userId], references: [id])
  variant   ProductVariant? @relation(fields: [variantId], references: [id])

  @@unique([userId, productId, variantId])  // Unique: 1 user không thể có 2 item cùng product+variant
  @@map("shopping_cart")
}
```

**Quy tắc:**
- ✅ 1 user có thể có nhiều sản phẩm trong giỏ
- ✅ 1 sản phẩm + 1 variant chỉ có thể có 1 record (unique constraint)
- ✅ Nếu user thêm sản phẩm đã có → Cộng dồn số lượng (không tạo record mới)

---

## 🔄 LUỒNG DỮ LIỆU: CREATE (Thêm vào giỏ hàng)

### **BƯỚC 1: User click "Thêm vào giỏ"**

**File**: `frontend/src/components/user/CartButton.jsx`

```46:98:frontend/src/components/user/CartButton.jsx
  const handleAddToCart = async (e) => {
    e.preventDefault(); //ngăn chặn hành vi mặc định của button
    e.stopPropagation(); //ngăn chặn hành vi lan truyền của button
    
    if (isAdding || loading || disabled) return; //nếu đang thêm vào giỏ hàng hoặc đang loading thì không cho click
    
    // Kiểm tra đăng nhập trước khi thêm vào giỏ hàng
    if (!isAuthenticated) {
      // Lưu URL hiện tại để redirect về sau khi đăng nhập
      const currentPath = window.location.pathname;
      navigate(`/auth?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }
    
    // Validation từ parent nếu có
    if (validateBeforeAdd && !validateBeforeAdd()) {
      return; // Validation failed, không tiếp tục
    }
    
    // Validation cơ bản
    if (!productId) {
      console.error('Product ID is required');
      return;
    }
    
    if (quantity < 1) {
      console.error('Quantity must be at least 1');
      return;
    }
    
    try {
      setIsAdding(true); //set trạng thái đang thêm vào giỏ hàng
      
      // Gọi Zustand action để thêm vào giỏ hàng
      //gọi hàm addToCart với productId, variantId, quantity
      await addToCart({ 
        productId: Number(productId), 
        variantId: variantId ? Number(variantId) : null, 
        quantity: Number(quantity) 
      });
      
      // callback khi thêm thành công
      if (onAddToCart) {
        onAddToCart({ productId, variantId, quantity }); //gọi callback với productId, variantId, quantity
      }
      
    } catch (error) {
      console.error('Add to cart failed:', error);
      // Error đã được xử lý trong cartStore với toast notification
      // Không cần xử lý thêm ở đây
    } finally {
      setIsAdding(false); //set trạng thái đang thêm vào giỏ hàng về false
    }
  };
```

**Xử lý:**
1. ✅ Kiểm tra user đã đăng nhập chưa → Nếu chưa → Redirect về trang đăng nhập
2. ✅ Validation: `productId`, `quantity` phải hợp lệ
3. ✅ Gọi `addToCart()` từ Zustand store

---

### **BƯỚC 2: Zustand Store - Gọi API**

**File**: `frontend/src/stores/cartStore.js`

```47:58:frontend/src/stores/cartStore.js
  addToCart: async (cartData) => {
    set({ loading: true })
    try {
      await addToCartAPI(cartData)
      toast.success("🛒 Đã thêm vào giỏ hàng")
      await get().fetchCart()
    } catch (error) {
      toast.error(`❌ ${error.response?.data?.message || "Không thể thêm vào giỏ hàng"}`)
      set({ error: error.response?.data?.message, loading: false })
      throw error
    }
  },
```

**Xử lý:**
1. ✅ Set `loading = true`
2. ✅ Gọi API `addToCartAPI(cartData)` → `POST /api/cart/add`
3. ✅ Nếu thành công: Toast success → Refresh giỏ hàng (`fetchCart()`)
4. ✅ Nếu lỗi: Toast error → Set error state

---

### **BƯỚC 3: API Client - Gửi Request**

**File**: `frontend/src/api/cart.js`

```27:29:frontend/src/api/cart.js
export const addToCart = async (cartData) => {
  return await axiosClient.post("/cart/add", cartData);
};
```

**Request:**
- **Method**: `POST`
- **URL**: `/api/cart/add`
- **Body**: 
  ```json
  {
    "productId": 123,
    "variantId": 456,
    "quantity": 2
  }
  ```
- **Headers**: 
  - `Authorization: Bearer <token>` (từ axiosClient)

---

### **BƯỚC 4: Backend Routes - Validate & Route**

**File**: `backend/routes/shoppingCartRoutes.js`

```28:29:backend/routes/shoppingCartRoutes.js
// Thêm sản phẩm vào giỏ hàng
router.post("/add", validate(addToCartSchema), addToCart);
```

**Xử lý:**
1. ✅ **Middleware `authenticateToken`**: Kiểm tra user đã đăng nhập (tất cả routes)
2. ✅ **Middleware `validate(addToCartSchema)`**: Validate request body theo schema Joi

**Validator Schema** (`backend/validators/shoppingCart.valid.js`):

```4:27:backend/validators/shoppingCart.valid.js
export const addToCartSchema = Joi.object({
  productId: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'ID sản phẩm phải là số',
      'number.integer': 'ID sản phẩm phải là số nguyên',
      'number.positive': 'ID sản phẩm phải là số dương',
      'any.required': 'ID sản phẩm là bắt buộc'
    }),
  
  variantId: Joi.number().integer().positive().allow(null).optional()
    .messages({
      'number.base': 'ID biến thể phải là số',
      'number.integer': 'ID biến thể phải là số nguyên',
      'number.positive': 'ID biến thể phải là số dương'
    }),
  
  quantity: Joi.number().integer().min(1).max(10).default(1)
    .messages({
      'number.base': 'Số lượng phải là số',
      'number.integer': 'Số lượng phải là số nguyên',
      'number.min': 'Số lượng phải lớn hơn 0',
      'number.max': 'Không thể thêm quá 10 sản phẩm cùng lúc'
    })
});
```

---

### **BƯỚC 5: Backend Controller - Xử lý Logic**

**File**: `backend/controller/shoppingCartController.js`

#### **5.1. Validate & Kiểm tra sản phẩm**

```102:158:backend/controller/shoppingCartController.js
export const addToCart = async (req, res) => {
  try {
    // Lấy user_id từ token
    const user_id = req.user.id;
    
    // Lấy dữ liệu từ request body
    // Frontend gửi: { productId, variantId, quantity }
    // Backend map sang: { product_id, variant_id, quantity }
    const { productId: product_id, variantId: variant_id, quantity = 1 } = req.body;

    logger.info('Add to cart:', { user_id, product_id, variant_id, quantity });

    // ========================================
    // BƯỚC 1: Validate - variant_id BẮT BUỘC
    // ========================================
    // Tại sao BẮT BUỘC?
    // - Trong DB schema: shopping_cart.variant_id có thể NULL
    // - NHƯNG trong thực tế: Mỗi sản phẩm PHẢI có biến thể cụ thể
    // - VD: Ghế phải chọn màu sắc, kích thước cụ thể
    if (!variant_id) {
      return res.status(400).json({ 
        message: "Vui lòng chọn biến thể sản phẩm (màu sắc, kích thước)" 
      });
    }

    // ========================================
    // BƯỚC 2: Kiểm tra sản phẩm và variant tồn tại
    // ========================================
    // Query bảng products JOIN với product_variants
    const product = await prisma.product.findUnique({
      where: { 
        id: Number(product_id),
        status: 'ACTIVE' // Chỉ lấy sản phẩm đang bán 
      },
      include: {
        variants: {
          where: { 
            id: Number(variant_id),
            isActive: true // Chỉ lấy variant đang active
          }
        }
      }
    });

    // Kiểm tra sản phẩm có tồn tại không
    if (!product) {
      return res.status(404).json({ 
        message: "Sản phẩm không tồn tại hoặc đã ngừng bán" 
      });
    }

    // Kiểm tra variant có tồn tại không
    if (!product.variants || product.variants.length === 0) {
      return res.status(400).json({ 
        message: "Biến thể sản phẩm không tồn tại hoặc đã ngừng bán" 
      });
    }

    // Lấy variant và tồn kho
    const variant = product.variants[0];//lấy variant đầu tiên trong mảng variants vì mỗi sản phẩm chỉ có 1 variant
    const stock_quantity = variant.stockQuantity; // Column: stock_quantity trong bảng product_variants
```

**Kiểm tra:**
- ✅ `variant_id` phải có (bắt buộc)
- ✅ Product phải tồn tại và `status = 'ACTIVE'`
- ✅ Variant phải tồn tại và `isActive = true`
- ✅ Lấy `stockQuantity` của variant

#### **5.2. Kiểm tra tồn kho**

```164:174:backend/controller/shoppingCartController.js
    // ========================================
    // BƯỚC 3: Kiểm tra tồn kho
    // ========================================
    // ✅ ĐÚNG: CHỈ kiểm tra tồn kho của variant CỤ THỂ này
    // VD: Ghế màu đỏ có 10 cái → stock_quantity = 10
    if (stock_quantity < quantity) {
      return res.status(400).json({ 
        message: `Chỉ còn ${stock_quantity} sản phẩm trong kho`,
        available_stock: stock_quantity 
      });
    }
```

#### **5.3. Kiểm tra đã có trong giỏ chưa**

```176:228:backend/controller/shoppingCartController.js
    // ========================================
    // BƯỚC 4: Kiểm tra đã có trong giỏ chưa
    // ========================================
    // Query bảng shopping_cart với unique constraint: [user_id, product_id, variant_id]
    const existingCartItem = await prisma.shoppingCart.findFirst({
      where: {
        userId: user_id,
        productId: Number(product_id),
        variantId: Number(variant_id)
      }
    });

    let cartItem;

    if (existingCartItem) {
      // ========================================
      // Trường hợp 1: ĐÃ CÓ trong giỏ → Cộng dồn số lượng
      // ========================================
      const new_quantity = existingCartItem.quantity + quantity;
      
      // Kiểm tra tổng số lượng không vượt quá tồn kho
      if (new_quantity > stock_quantity) {
        return res.status(400).json({ 
          message: `Tổng số lượng không được vượt quá ${stock_quantity}`,
          available_stock: stock_quantity,
          current_quantity: existingCartItem.quantity
        });
      }

      // UPDATE bảng shopping_cart: Cập nhật quantity
      cartItem = await prisma.shoppingCart.update({
        where: { id: existingCartItem.id },
        data: { quantity: new_quantity }
      });

      logger.info('Updated cart item:', { id: cartItem.id, new_quantity });
      
    } else {
      // ========================================
      // Trường hợp 2: CHƯA CÓ trong giỏ → Tạo mới
      // ========================================
      // INSERT vào bảng shopping_cart
      cartItem = await prisma.shoppingCart.create({
        data: {
          userId: user_id,        // FK → users.id
          productId: Number(product_id),   // FK → products.id
          variantId: Number(variant_id),   // FK → product_variants.id
          quantity                // Số lượng
        }
      });

      logger.info('Created cart item:', { id: cartItem.id });
    }
```

**Logic:**
- ✅ Tìm cart item theo `[userId, productId, variantId]` (unique constraint)
- ✅ **Nếu đã có**: Cộng dồn số lượng → UPDATE `quantity`
- ✅ **Nếu chưa có**: Tạo mới → INSERT vào `shopping_cart`

#### **5.4. Trả về Response**

```230:243:backend/controller/shoppingCartController.js
    // ========================================
    // BƯỚC 5: Trả về response
    // ========================================
    res.status(201).json({
      message: existingCartItem 
        ? "Đã cập nhật số lượng sản phẩm trong giỏ hàng" 
        : "Đã thêm sản phẩm vào giỏ hàng",
      cart_item: {
        id: cartItem.id,
        product_id: cartItem.productId,
        variant_id: cartItem.variantId,
        quantity: cartItem.quantity
      }
    });
```

**Response:**
```json
{
  "message": "Đã thêm sản phẩm vào giỏ hàng",
  "cart_item": {
    "id": 123,
    "product_id": 456,
    "variant_id": 789,
    "quantity": 2
  }
}
```

---

### **BƯỚC 6: Frontend Store - Refresh Giỏ hàng**

Sau khi thêm thành công, `cartStore.addToCart()` gọi `fetchCart()` để refresh:

```23:45:frontend/src/stores/cartStore.js
  fetchCart: async () => {
    if (get().isFetching) return
    set({ loading: true, error: null, isFetching: true })
    try {
      const response = await getCart()
      const items = response.data.cart || []
      const totalAmount = response.data.total_amount || 0

      set({
        items,
        totalQuantity: items.length,
        totalAmount,
        loading: false,
        isFetching: false
      })
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Không thể tải giỏ hàng',
        loading: false,
        isFetching: false
      })
    }
  },
```

**Kết quả:**
- ✅ State `items` được cập nhật → UI tự động re-render
- ✅ `totalQuantity` = số lượng items
- ✅ `totalAmount` = tổng tiền giỏ hàng

---

## 📖 LUỒNG DỮ LIỆU: READ (Xem giỏ hàng)

### **BƯỚC 1: Component Load → Fetch Cart**

**File**: `frontend/src/pages/user/cart/useCart.js`

```23:25:frontend/src/pages/user/cart/useCart.js
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);
```

**Trigger**: Component `Cart.jsx` mount → `useCart()` hook chạy → `fetchCart()`

---

### **BƯỚC 2: API Client - GET Request**

**File**: `frontend/src/api/cart.js`

```10:12:frontend/src/api/cart.js
export const getCart = async () => {
  return await axiosClient.get("/cart");
};
```

**Request:**
- **Method**: `GET`
- **URL**: `/api/cart`
- **Headers**: `Authorization: Bearer <token>`

---

### **BƯỚC 3: Backend Controller - Query Database**

**File**: `backend/controller/shoppingCartController.js`

```9:96:backend/controller/shoppingCartController.js
export const getCart = async (req, res) => {
  try {
    
    const user_id = req.user.id;
    const cartItems = await prisma.shoppingCart.findMany({
      where: { userId: user_id }, // Lọc theo user_id
      include: { 
        product: {
          include: {
            images: {
              where: { isPrimary: true },
              take: 1
            }
          }
        },
        variant: true
      },
      orderBy: { createdAt: 'desc' } // Sắp xếp mới nhất trước
    });

    // ========================================
    // Tính toán giá và format response
    // ========================================
    let total_amount = 0; // Tổng tiền toàn bộ giỏ hàng
    
    const processedItems = cartItems.map(item => {
      const unit_price = item.product.price;//giá gốc
      const sale_price = item.product.salePrice;//giá khuyến mãi
      const final_price = sale_price || unit_price;//giá cuối cùng ưu tiên giá khuyến mãi,không có thì dùng unit_price
      const item_total = final_price * item.quantity; // Tổng tiền của item này = giá cuối cùng * số lượng
      total_amount += item_total; // Cộng dồn vào tổng tiền

      // Format response theo chuẩn snake_case (giống DB)
      return {
        id: item.id, // ID của cart item (bảng shopping_cart)
        product_id: item.productId, // ID sản phẩm
        variant_id: item.variantId, // ID biến thể
        quantity: item.quantity, // Số lượng
        unit_price: Number(unit_price), // Giá đơn vị
        sale_price: sale_price ? Number(sale_price) : null, // Giá sale (nếu có)
        final_price: Number(final_price), // Giá cuối cùng
        total_price: Number(item_total), // Tổng tiền của item này
        
        // Thông tin sản phẩm (từ bảng products)
        product: {
          id: item.product.id,//ID sản phẩm
          name: item.product.name,//Tên sản phẩm
          slug: item.product.slug,//Slug sản phẩm
          image_url: item.product.imageUrl,//URL ảnh sản phẩm
          primary_image: item.product.images[0]?.imageUrl, // Ảnh chính
          price: Number(item.product.price),//Giá gốc
          sale_price: sale_price ? Number(sale_price) : null//Giá khuyến mãi
        },
        
        // Thông tin biến thể (từ bảng product_variants)
        variant: item.variant ? {
          id: item.variant.id,
          width: item.variant.width, // Chiều rộng (cm)
          depth: item.variant.depth, // Chiều sâu (cm)
          height: item.variant.height, // Chiều cao (cm)
          height_max: item.variant.heightMax, // Chiều cao tối đa (cm) - cho ghế điều chỉnh
          color: item.variant.color, // Màu sắc
          material: item.variant.material, // Chất liệu
          warranty: item.variant.warranty, // Bảo hành
          weight_capacity: item.variant.weightCapacity ? Number(item.variant.weightCapacity) : null, // Tải trọng (kg)
          dimension_note: item.variant.dimensionNote, // Ghi chú kích thước
          stock_quantity: item.variant.stockQuantity, // Tồn kho
          min_stock_level: item.variant.minStockLevel, // Mức tồn kho tối thiểu
          is_active: item.variant.isActive // Trạng thái active
        } : null
      };
    });

    // Trả về response
    res.status(200).json({
      message: "Lấy giỏ hàng thành công",
      cart: processedItems,
      total_amount: Number(total_amount.toFixed(2)) // Làm tròn 2 chữ số thập phân
    });
```

**Xử lý:**
1. ✅ Query `shopping_cart` WHERE `userId = req.user.id`
2. ✅ JOIN với `products` (lấy ảnh chính) và `product_variants`
3. ✅ Tính toán giá:
   - `unit_price` = giá gốc
   - `sale_price` = giá khuyến mãi (nếu có)
   - `final_price` = `sale_price` || `unit_price`
   - `item_total` = `final_price * quantity`
   - `total_amount` = tổng tất cả `item_total`
4. ✅ Format response: snake_case

**Response:**
```json
{
  "message": "Lấy giỏ hàng thành công",
  "cart": [
    {
      "id": 123,
      "product_id": 456,
      "variant_id": 789,
      "quantity": 2,
      "unit_price": 5000000,
      "sale_price": 4500000,
      "final_price": 4500000,
      "total_price": 9000000,
      "product": {
        "id": 456,
        "name": "Ghế văn phòng",
        "slug": "ghe-van-phong",
        "image_url": "...",
        "primary_image": "...",
        "price": 5000000,
        "sale_price": 4500000
      },
      "variant": {
        "id": 789,
        "color": "Đen",
        "width": 60,
        "depth": 60,
        "height": 110,
        ...
      }
    }
  ],
  "total_amount": 9000000
}
```

---

### **BƯỚC 4: Frontend Store - Cập nhật State**

```23:45:frontend/src/stores/cartStore.js
  fetchCart: async () => {
    if (get().isFetching) return
    set({ loading: true, error: null, isFetching: true })
    try {
      const response = await getCart()
      const items = response.data.cart || []
      const totalAmount = response.data.total_amount || 0

      set({
        items,
        totalQuantity: items.length,
        totalAmount,
        loading: false,
        isFetching: false
      })
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Không thể tải giỏ hàng',
        loading: false,
        isFetching: false
      })
    }
  },
```

**State:**
- ✅ `items` = danh sách sản phẩm trong giỏ
- ✅ `totalQuantity` = số lượng items
- ✅ `totalAmount` = tổng tiền

---

### **BƯỚC 5: Component - Render UI**

**File**: `frontend/src/pages/user/cart/Cart.jsx`

```120:186:frontend/src/pages/user/cart/Cart.jsx
              <TableBody>
                {cartItems.map((item) => {
                    const isUpdating = updatingItems.has(item.id);
                    const variant = item.variant;
                    const imageUrl = item.product.primary_image || item.product.image_url || "/placeholder-product.jpg";
                    const hasDiscount = item.sale_price && item.sale_price < item.unit_price;

                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex gap-3 items-start">
                            <img src={imageUrl} alt={item.product.name} className="h-16 w-16 object-cover rounded border flex-shrink-0" />
                            <div className="min-w-0 space-y-1">
                              <h3 className="font-semibold text-sm line-clamp-2">{item.product.name}</h3>
                              {hasDiscount && (
                                <Badge className="bg-red-500 text-white text-xs mt-1">
                                  -{Math.round(((item.unit_price - item.sale_price) / item.unit_price) * 100)}%
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {variant?.color ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              {variant.color}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {variant?.width && variant?.depth && variant?.height ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              {variant.width}×{variant.depth}×{variant.height}cm
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <p className="font-semibold text-sm">{formatPrice(item.final_price)}</p>
                          {hasDiscount && (
                            <p className="text-xs text-gray-500 line-through">{formatPrice(item.unit_price)}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)} disabled={isUpdating || item.quantity <= 1}>
                              <FaMinus className="h-3 w-3" />
                            </Button>
                            <span className="min-w-[2rem] text-center font-medium text-sm">{item.quantity}</span>
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)} disabled={isUpdating}>
                              <FaPlus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <p className="font-bold text-red-600 text-sm">{formatPrice(item.final_price * item.quantity)}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(item.id)} className="text-red-600 hover:text-red-700 h-7 w-7 p-0">
                            <FaTrash className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
```

**Hiển thị:**
- ✅ Ảnh sản phẩm, tên, badge giảm giá
- ✅ Màu sắc, kích thước (variant)
- ✅ Đơn giá (có sale price thì hiển thị cả 2)
- ✅ Số lượng (+/- buttons)
- ✅ Thành tiền = `final_price * quantity`
- ✅ Button xóa

---

## ✏️ LUỒNG DỮ LIỆU: UPDATE (Cập nhật số lượng)

### **BƯỚC 1: User click nút +/-**

**File**: `frontend/src/pages/user/cart/Cart.jsx`

```167:173:frontend/src/pages/user/cart/Cart.jsx
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)} disabled={isUpdating || item.quantity <= 1}>
                              <FaMinus className="h-3 w-3" />
                            </Button>
                            <span className="min-w-[2rem] text-center font-medium text-sm">{item.quantity}</span>
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)} disabled={isUpdating}>
                              <FaPlus className="h-3 w-3" />
                            </Button>
```

**Handler**: `handleUpdateQuantity(cartItemId, newQuantity)`

---

### **BƯỚC 2: useCart Hook - Xử lý**

**File**: `frontend/src/pages/user/cart/useCart.js`

```28:36:frontend/src/pages/user/cart/useCart.js
  // Cập nhật số lượng sản phẩm
  const handleUpdateQuantity = async (cartItemId, newQuantity) => {
    if (newQuantity < 1) return;
    setUpdatingItems(prev => new Set(prev).add(cartItemId));
    try {
      await updateCartItem({ cartItemId, quantity: newQuantity });
    } finally {
      setUpdatingItems(prev => new Set([...prev].filter(id => id !== cartItemId)));
    }
  };
```

**Xử lý:**
1. ✅ Validate: `newQuantity >= 1`
2. ✅ Set `updatingItems` (hiển thị loading trên item đó)
3. ✅ Gọi `updateCartItem()` từ store

---

### **BƯỚC 3: Store - Gọi API**

**File**: `frontend/src/stores/cartStore.js`

```60:70:frontend/src/stores/cartStore.js
  updateCartItem: async ({ cartItemId, quantity }) => {
    set({ loading: true })
    try {
      await updateCartItemAPI(cartItemId, quantity)
      toast.success("✅ Đã cập nhật số lượng")
      await get().fetchCart()
    } catch (error) {
      toast.error(`❌ ${error.response?.data?.message || "Không thể cập nhật"}`)
      set({ error: error.response?.data?.message, loading: false })
    }
  },
```

**API Call**: `PUT /api/cart/update/:cartItemId`

---

### **BƯỚC 4: Backend Controller - Update Database**

**File**: `backend/controller/shoppingCartController.js`

```259:347:backend/controller/shoppingCartController.js
export const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cartItemId } = req.params;
    const { quantity } = req.body;

    // Validation
    if (!cartItemId || isNaN(cartItemId)) {
      return res.status(400).json({ message: "ID giỏ hàng không hợp lệ" });
    }

    if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) {
      return res.status(400).json({ message: "Số lượng phải là số nguyên dương" });
    }

    // Lấy cart item
    const cartItem = await prisma.shoppingCart.findFirst({
      where: {
        id: Number(cartItemId),
        userId
      },
      include: {
        product: {
          include: {
            variants: { where: { isActive: true } }
          }
        },
        variant: true
      }
    });

    if (!cartItem) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm trong giỏ hàng" });
    }

    // ========================================
    // Kiểm tra tồn kho (stock_quantity từ bảng product_variants)
    // ========================================
    let stock_quantity = 0;
    
    if (cartItem.variantId && cartItem.variant) {
      // ✅ ĐÚNG: Cart item có variant_id cụ thể
      // → CHỈ kiểm tra tồn kho của variant ĐÓ
      // VD: Ghế màu đỏ có 10 cái → stock_quantity = 10
      stock_quantity = cartItem.variant.stockQuantity;
      logger.debug('Check stock for specific variant:', { 
        variant_id: cartItem.variantId, 
        stock: stock_quantity 
      });
    } else {
      // ❌ LỖI LOGIC CŨ: Không nên tính tổng tất cả variants
      // ✅ ĐÚNG: Nếu cart item KHÔNG có variant_id → Báo lỗi
      // Vì trong DB schema, mỗi cart item PHẢI có variant_id cụ thể
      return res.status(400).json({ 
        message: "Sản phẩm phải có biến thể cụ thể (màu sắc, kích thước)" 
      });
    }

    if (quantity > stock_quantity) {
      return res.status(400).json({ 
        message: `Chỉ còn ${stock_quantity} sản phẩm trong kho`,
        available_stock: stock_quantity 
      });
    }

    // Cập nhật số lượng
    const updatedItem = await prisma.shoppingCart.update({
      where: { id: Number(cartItemId) },
      data: { quantity }
    });

    res.status(200).json({
      message: "Đã cập nhật số lượng sản phẩm",
      cartItem: {
        id: updatedItem.id,
        productId: updatedItem.productId,
        variantId: updatedItem.variantId,
        quantity: updatedItem.quantity
      }
    });

  } catch (error) {
    logger.error('Update cart item error:', error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};
```

**Xử lý:**
1. ✅ Validate `cartItemId`, `quantity`
2. ✅ Lấy cart item (kiểm tra `userId` để đảm bảo user chỉ update cart của mình)
3. ✅ Kiểm tra tồn kho: `quantity <= stock_quantity`
4. ✅ UPDATE `shopping_cart` SET `quantity = newQuantity`

**Response:**
```json
{
  "message": "Đã cập nhật số lượng sản phẩm",
  "cartItem": {
    "id": 123,
    "productId": 456,
    "variantId": 789,
    "quantity": 3
  }
}
```

---

### **BƯỚC 5: Frontend - Refresh Cart**

Sau khi update thành công → `fetchCart()` → UI tự động cập nhật

---

## 🗑️ LUỒNG DỮ LIỆU: DELETE (Xóa sản phẩm)

### **DELETE 1: Xóa 1 sản phẩm**

#### **BƯỚC 1: User click nút xóa**

**File**: `frontend/src/pages/user/cart/Cart.jsx`

```180:182:frontend/src/pages/user/cart/Cart.jsx
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(item.id)} className="text-red-600 hover:text-red-700 h-7 w-7 p-0">
                            <FaTrash className="h-3 w-3" />
                          </Button>
```

---

#### **BƯỚC 2: useCart Hook - Xử lý**

**File**: `frontend/src/pages/user/cart/useCart.js`

```39:41:frontend/src/pages/user/cart/useCart.js
  // Xóa sản phẩm
  const handleRemoveItem = async (cartItemId) => {
    await removeFromCart(cartItemId);
  };
```

---

#### **BƯỚC 3: Store - Gọi API**

**File**: `frontend/src/stores/cartStore.js`

```72:82:frontend/src/stores/cartStore.js
  removeFromCart: async (cartItemId) => {
    set({ loading: true })
    try {
      await removeFromCartAPI(cartItemId)
      toast.success("🗑️ Đã xóa khỏi giỏ hàng")
      await get().fetchCart()
    } catch (error) {
      toast.error(`❌ ${error.response?.data?.message || "Không thể xóa"}`)
      set({ error: error.response?.data?.message, loading: false })
    }
  },
```

**API Call**: `DELETE /api/cart/remove/:cartItemId`

---

#### **BƯỚC 4: Backend Controller - Xóa Database**

**File**: `backend/controller/shoppingCartController.js`

```353:397:backend/controller/shoppingCartController.js
export const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cartItemId } = req.params;

    if (!cartItemId || isNaN(cartItemId)) {
      return res.status(400).json({ message: "ID giỏ hàng không hợp lệ" });
    }

    const cartItem = await prisma.shoppingCart.findFirst({
      where: {
        id: Number(cartItemId),
        userId
      },
      include: {
        product: {
          select: { id: true, name: true }
        }
      }
    });

    if (!cartItem) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm trong giỏ hàng" });
    }

    await prisma.shoppingCart.delete({
      where: { id: Number(cartItemId) }
    });

    res.status(200).json({
      message: `Đã xóa "${cartItem.product.name}" khỏi giỏ hàng`,
      removedItem: {
        id: cartItem.id,
        productName: cartItem.product.name
      }
    });

  } catch (error) {
    logger.error('Remove from cart error:', error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};
```

**Xử lý:**
1. ✅ Validate `cartItemId`
2. ✅ Kiểm tra cart item thuộc về user (`userId`)
3. ✅ DELETE FROM `shopping_cart` WHERE `id = cartItemId`

---

### **DELETE 2: Xóa tất cả (Clear Cart)**

#### **BƯỚC 1: User click "Xóa tất cả"**

**File**: `frontend/src/pages/user/cart/Cart.jsx`

```79:100:frontend/src/pages/user/cart/Cart.jsx
          {cartCount > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <FaTrash className="mr-2 h-3.5 w-3.5" />
                  Xóa tất cả
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xóa tất cả sản phẩm?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Bạn có chắc chắn muốn xóa tất cả <span className="font-bold">{cartCount} sản phẩm</span> khỏi giỏ hàng?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAll} className="bg-red-500 hover:bg-red-600">
                    Xác nhận
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
```

---

#### **BƯỚC 2: useCart Hook - Xử lý**

**File**: `frontend/src/pages/user/cart/useCart.js`

```44:46:frontend/src/pages/user/cart/useCart.js
  // Xóa tất cả sản phẩm
  const handleClearAll = async () => {
    await clearCart();
  };
```

---

#### **BƯỚC 3: Store - Gọi API**

**File**: `frontend/src/stores/cartStore.js`

```84:94:frontend/src/stores/cartStore.js
  clearCart: async () => {
    set({ loading: true })
    try {
      const response = await clearCartAPI()
      toast.success(`🗑️ Đã xóa ${response.data.removedCount} sản phẩm`)
      set({ items: [], totalQuantity: 0, totalAmount: 0, loading: false, isFetching: false })
    } catch (error) {
      toast.error("❌ Không thể xóa tất cả")
      set({ error: error.response?.data?.message, loading: false, isFetching: false })
    }
  },
```

**API Call**: `DELETE /api/cart/clear`

---

#### **BƯỚC 4: Backend Controller - Xóa tất cả**

**File**: `backend/controller/shoppingCartController.js`

```403:431:backend/controller/shoppingCartController.js
export const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cartCount = await prisma.shoppingCart.count({
      where: { userId }
    });

    if (cartCount === 0) {
      return res.status(400).json({ message: "Giỏ hàng đã trống" });
    }

    await prisma.shoppingCart.deleteMany({
      where: { userId }
    });

    res.status(200).json({
      message: `Đã xóa ${cartCount} sản phẩm khỏi giỏ hàng`,
      removedCount: cartCount
    });

  } catch (error) {
    logger.error('Clear cart error:', error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};
```

**Xử lý:**
1. ✅ Đếm số lượng items trong giỏ
2. ✅ DELETE FROM `shopping_cart` WHERE `userId = req.user.id`

---

## 📊 SƠ ĐỒ LUỒNG DỮ LIỆU TỔNG QUAN

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (ReactJS)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │  Cart.jsx    │───▶│  useCart.js  │───▶│ cartStore.js │     │
│  │  (UI)        │    │  (Hook)      │    │  (Zustand)   │     │
│  └──────────────┘    └──────────────┘    └──────┬───────┘     │
│         │                                          │            │
│         │                                          │            │
│  ┌──────▼──────────────────────────────────────────▼───────┐   │
│  │  CartButton.jsx (Thêm vào giỏ)                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│                          │ API Calls                            │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  api/cart.js (Axios Client)                             │   │
│  │  - getCart()        → GET    /api/cart                  │   │
│  │  - addToCart()      → POST   /api/cart/add              │   │
│  │  - updateCartItem() → PUT    /api/cart/update/:id       │   │
│  │  - removeFromCart() → DELETE /api/cart/remove/:id       │   │
│  │  - clearCart()      → DELETE /api/cart/clear            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
└──────────────────────────┼──────────────────────────────────────┘
                           │ HTTP Request
                           │ (Authorization: Bearer <token>)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Express.js)                         │
├─────────────────────────────────────────────────────────────────┤
│                          │                                      │
│                          │ Routes                               │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  routes/shoppingCartRoutes.js                           │   │
│  │  - authenticateToken (middleware)                        │   │
│  │  - validate(schema) (middleware)                        │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                        │
│                         │ Controllers                            │
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  controller/shoppingCartController.js                   │   │
│  │  - getCart()                                            │   │
│  │  - addToCart()                                          │   │
│  │  - updateCartItem()                                     │   │
│  │  - removeFromCart()                                     │   │
│  │  - clearCart()                                          │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                        │
│                         │ Prisma ORM                             │
│                         ▼                                        │
└─────────────────────────┼────────────────────────────────────────┘
                          │
                          │ SQL Queries
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (MySQL)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  shopping_cart                                           │  │
│  │  - id (PK)                                               │  │
│  │  - user_id (FK → users.id)                               │  │
│  │  - product_id (FK → products.id)                         │  │
│  │  - variant_id (FK → product_variants.id)                 │  │
│  │  - quantity                                               │  │
│  │  - created_at                                             │  │
│  │  - updated_at                                             │  │
│  │                                                           │  │
│  │  @@unique([user_id, product_id, variant_id])             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                      │
│                          │ JOIN                                 │
│                          ▼                                      │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────┐       │
│  │  products   │    │product_variant│    │   users     │       │
│  │  (thông tin │    │ (màu, kích   │    │ (user info) │       │
│  │   sản phẩm) │    │  thước...)   │    │             │       │
│  └─────────────┘    └──────────────┘    └─────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 TÓM TẮT LUỒNG DỮ LIỆU

### **CREATE (Thêm vào giỏ):**
1. User click "Thêm vào giỏ" → `CartButton.jsx`
2. Validate đăng nhập → `cartStore.addToCart()`
3. API: `POST /api/cart/add` → `addToCartController()`
4. Backend: Validate → Kiểm tra sản phẩm/variant → Kiểm tra tồn kho
5. Logic: Nếu đã có → UPDATE quantity; Nếu chưa → INSERT mới
6. Response → Frontend refresh cart → UI cập nhật

### **READ (Xem giỏ hàng):**
1. Component mount → `useCart()` → `fetchCart()`
2. API: `GET /api/cart` → `getCartController()`
3. Backend: Query `shopping_cart` JOIN `products` + `product_variants`
4. Tính toán giá: `final_price`, `item_total`, `total_amount`
5. Response → Frontend state → Render UI

### **UPDATE (Cập nhật số lượng):**
1. User click +/- → `handleUpdateQuantity()`
2. API: `PUT /api/cart/update/:id` → `updateCartItemController()`
3. Backend: Validate → Kiểm tra tồn kho → UPDATE quantity
4. Response → Frontend refresh cart → UI cập nhật

### **DELETE (Xóa sản phẩm):**
1. **Xóa 1 item**: User click xóa → `handleRemoveItem()` → `DELETE /api/cart/remove/:id` → DELETE database
2. **Xóa tất cả**: User click "Xóa tất cả" → `handleClearAll()` → `DELETE /api/cart/clear` → DELETE ALL WHERE userId

---

## 🔐 BẢO MẬT

1. ✅ **Authentication**: Tất cả routes yêu cầu `authenticateToken` middleware
2. ✅ **Authorization**: User chỉ có thể CRUD cart của chính mình (`userId = req.user.id`)
3. ✅ **Validation**: 
   - Frontend: Kiểm tra đăng nhập, validate input
   - Backend: Joi schema validation, kiểm tra tồn tại, tồn kho

---

## 📝 LƯU Ý QUAN TRỌNG

1. ✅ **Unique Constraint**: `[userId, productId, variantId]` → 1 user không thể có 2 item cùng product+variant → Thêm vào giỏ sẽ cộng dồn số lượng
2. ✅ **Tồn kho**: Kiểm tra `stockQuantity` của variant cụ thể (không phải tổng tất cả variants)
3. ✅ **Giá**: Ưu tiên `salePrice`, nếu không có thì dùng `price`
4. ✅ **State Management**: Zustand store quản lý global state → Tự động sync khi có thay đổi

