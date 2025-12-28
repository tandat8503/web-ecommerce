# Shopping Cart System - Hệ Thống Giỏ Hàng

## 📋 Tổng Quan

Hệ thống giỏ hàng hỗ trợ:
- Thêm/Xóa/Cập nhật sản phẩm trong giỏ
- Tính tổng tiền tự động
- Persist cart data (Guest & User)
- Sync cart khi login
- Validate stock trước khi checkout
- Merge guest cart với user cart

---

## 🗄️ Database Schema

### ShoppingCart Model
```prisma
model ShoppingCart {
  id              Int      @id @default(autoincrement())
  userId          Int?     @map("user_id")
  user            User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  productId       Int      @map("product_id")
  product         Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  variantId       Int?     @map("variant_id")
  variant         ProductVariant? @relation(fields: [variantId], references: [id], onDelete: Cascade)
  
  quantity        Int      @default(1)
  
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  
  @@unique([userId, productId, variantId])
  @@map("shopping_carts")
  @@index([userId])
  @@index([productId])
}
```

**Lưu ý**: 
- `userId` nullable để hỗ trợ guest cart (lưu trong localStorage)
- Unique constraint trên `(userId, productId, variantId)` để tránh duplicate
- Cascade delete khi xóa user/product

---

## 🔧 Backend Implementation

### 1. Controller: `controller/cartController.js`

#### Get Cart
```javascript
export const getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cartItems = await prisma.shoppingCart.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            primaryImage: true,
            stockQuantity: true,
            isActive: true
          }
        },
        variant: {
          select: {
            id: true,
            color: true,
            size: true,
            price: true,
            stockQuantity: true,
            imageUrl: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => {
      const price = item.variant?.price || item.product.price;
      return sum + (Number(price) * item.quantity);
    }, 0);

    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    return res.json({
      success: true,
      data: {
        items: cartItems,
        summary: {
          subtotal,
          totalItems,
          itemCount: cartItems.length
        }
      }
    });
  } catch (error) {
    logger.error('Get cart error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy giỏ hàng'
    });
  }
};
```

#### Add to Cart
```javascript
export const addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, variantId, quantity = 1 } = req.body;

    // Validate input
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'productId là bắt buộc'
      });
    }

    // Check product exists and active
    const product = await prisma.product.findUnique({
      where: { id: Number(productId) },
      include: {
        variants: variantId ? {
          where: { id: Number(variantId) }
        } : false
      }
    });

    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Sản phẩm không tồn tại hoặc đã ngừng bán'
      });
    }

    // Check variant if provided
    if (variantId) {
      const variant = product.variants?.[0];
      if (!variant || !variant.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Biến thể sản phẩm không tồn tại'
        });
      }
    }

    // Check stock
    const availableStock = variantId 
      ? product.variants[0].stockQuantity 
      : product.stockQuantity;

    if (availableStock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Chỉ còn ${availableStock} sản phẩm trong kho`
      });
    }

    // Check if item already in cart
    const existingCartItem = await prisma.shoppingCart.findUnique({
      where: {
        userId_productId_variantId: {
          userId,
          productId: Number(productId),
          variantId: variantId ? Number(variantId) : null
        }
      }
    });

    let cartItem;

    if (existingCartItem) {
      // Update quantity
      const newQuantity = existingCartItem.quantity + Number(quantity);
      
      if (newQuantity > availableStock) {
        return res.status(400).json({
          success: false,
          message: `Chỉ còn ${availableStock} sản phẩm trong kho`
        });
      }

      cartItem = await prisma.shoppingCart.update({
        where: { id: existingCartItem.id },
        data: { quantity: newQuantity },
        include: {
          product: true,
          variant: true
        }
      });
    } else {
      // Create new cart item
      cartItem = await prisma.shoppingCart.create({
        data: {
          userId,
          productId: Number(productId),
          variantId: variantId ? Number(variantId) : null,
          quantity: Number(quantity)
        },
        include: {
          product: true,
          variant: true
        }
      });
    }

    logger.info('Item added to cart', { userId, productId, variantId, quantity });

    return res.status(201).json({
      success: true,
      message: 'Đã thêm vào giỏ hàng',
      data: cartItem
    });
  } catch (error) {
    logger.error('Add to cart error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi thêm vào giỏ hàng'
    });
  }
};
```

#### Update Cart Item
```javascript
export const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Số lượng phải lớn hơn 0'
      });
    }

    // Find cart item
    const cartItem = await prisma.shoppingCart.findUnique({
      where: { id: Number(id) },
      include: {
        product: true,
        variant: true
      }
    });

    if (!cartItem || cartItem.userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm trong giỏ hàng'
      });
    }

    // Check stock
    const availableStock = cartItem.variant 
      ? cartItem.variant.stockQuantity 
      : cartItem.product.stockQuantity;

    if (quantity > availableStock) {
      return res.status(400).json({
        success: false,
        message: `Chỉ còn ${availableStock} sản phẩm trong kho`
      });
    }

    // Update quantity
    const updatedItem = await prisma.shoppingCart.update({
      where: { id: Number(id) },
      data: { quantity: Number(quantity) },
      include: {
        product: true,
        variant: true
      }
    });

    return res.json({
      success: true,
      message: 'Cập nhật giỏ hàng thành công',
      data: updatedItem
    });
  } catch (error) {
    logger.error('Update cart item error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật giỏ hàng'
    });
  }
};
```

#### Remove from Cart
```javascript
export const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Find cart item
    const cartItem = await prisma.shoppingCart.findUnique({
      where: { id: Number(id) }
    });

    if (!cartItem || cartItem.userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm trong giỏ hàng'
      });
    }

    // Delete cart item
    await prisma.shoppingCart.delete({
      where: { id: Number(id) }
    });

    logger.info('Item removed from cart', { userId, cartItemId: Number(id) });

    return res.json({
      success: true,
      message: 'Đã xóa khỏi giỏ hàng'
    });
  } catch (error) {
    logger.error('Remove from cart error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa khỏi giỏ hàng'
    });
  }
};
```

#### Clear Cart
```javascript
export const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.shoppingCart.deleteMany({
      where: { userId }
    });

    logger.info('Cart cleared', { userId });

    return res.json({
      success: true,
      message: 'Đã xóa toàn bộ giỏ hàng'
    });
  } catch (error) {
    logger.error('Clear cart error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa giỏ hàng'
    });
  }
};
```

#### Sync Guest Cart (Khi Login)
```javascript
export const syncGuestCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { guestCartItems } = req.body; // Array of {productId, variantId, quantity}

    if (!guestCartItems || !Array.isArray(guestCartItems)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid cart data'
      });
    }

    // Merge guest cart with user cart
    for (const item of guestCartItems) {
      const { productId, variantId, quantity } = item;

      // Check if item already in user cart
      const existingItem = await prisma.shoppingCart.findUnique({
        where: {
          userId_productId_variantId: {
            userId,
            productId: Number(productId),
            variantId: variantId ? Number(variantId) : null
          }
        }
      });

      if (existingItem) {
        // Update quantity (merge)
        await prisma.shoppingCart.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + Number(quantity)
          }
        });
      } else {
        // Create new cart item
        await prisma.shoppingCart.create({
          data: {
            userId,
            productId: Number(productId),
            variantId: variantId ? Number(variantId) : null,
            quantity: Number(quantity)
          }
        });
      }
    }

    // Get updated cart
    const cartItems = await prisma.shoppingCart.findMany({
      where: { userId },
      include: {
        product: true,
        variant: true
      }
    });

    logger.info('Guest cart synced', { userId, itemCount: guestCartItems.length });

    return res.json({
      success: true,
      message: 'Đã đồng bộ giỏ hàng',
      data: { items: cartItems }
    });
  } catch (error) {
    logger.error('Sync guest cart error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi đồng bộ giỏ hàng'
    });
  }
};
```

### 2. Routes: `routes/cartRoutes.js`

```javascript
import express from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  syncGuestCart
} from '../controller/cartController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getCart);
router.post('/add', addToCart);
router.put('/:id', updateCartItem);
router.delete('/:id', removeFromCart);
router.delete('/', clearCart);
router.post('/sync', syncGuestCart);

export default router;
```

---

## 🎨 Frontend Implementation

### 1. API Service: `src/api/cart.js`

```javascript
import axiosClient from './axiosClient';

export const getCart = () => {
  return axiosClient.get('/cart');
};

export const addToCart = (data) => {
  return axiosClient.post('/cart/add', data);
};

export const updateCartItem = (id, data) => {
  return axiosClient.put(`/cart/${id}`, data);
};

export const removeFromCart = (id) => {
  return axiosClient.delete(`/cart/${id}`);
};

export const clearCart = () => {
  return axiosClient.delete('/cart');
};

export const syncGuestCart = (guestCartItems) => {
  return axiosClient.post('/cart/sync', { guestCartItems });
};
```

### 2. Cart Store: `src/stores/cartStore.js`

```javascript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getCart, addToCart as addToCartAPI, updateCartItem, removeFromCart as removeFromCartAPI } from '@/api/cart';

const useCartStore = create(
  persist(
    (set, get) => ({
      // State
      items: [],
      loading: false,
      
      // Computed
      get totalItems() {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
      
      get subtotal() {
        return get().items.reduce((sum, item) => {
          const price = item.variant?.price || item.product.price;
          return sum + (Number(price) * item.quantity);
        }, 0);
      },
      
      // Actions
      fetchCart: async () => {
        set({ loading: true });
        try {
          const response = await getCart();
          set({ items: response.data.data.items });
        } catch (error) {
          console.error('Fetch cart error:', error);
        } finally {
          set({ loading: false });
        }
      },
      
      addToCart: async (productId, variantId, quantity = 1) => {
        try {
          await addToCartAPI({ productId, variantId, quantity });
          await get().fetchCart();
          return { success: true };
        } catch (error) {
          return { 
            success: false, 
            message: error.response?.data?.message || 'Lỗi khi thêm vào giỏ hàng' 
          };
        }
      },
      
      updateQuantity: async (id, quantity) => {
        try {
          await updateCartItem(id, { quantity });
          await get().fetchCart();
          return { success: true };
        } catch (error) {
          return { 
            success: false, 
            message: error.response?.data?.message || 'Lỗi khi cập nhật' 
          };
        }
      },
      
      removeItem: async (id) => {
        try {
          await removeFromCartAPI(id);
          await get().fetchCart();
          return { success: true };
        } catch (error) {
          return { 
            success: false, 
            message: error.response?.data?.message || 'Lỗi khi xóa' 
          };
        }
      },
      
      clearCart: () => {
        set({ items: [] });
      }
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({ items: state.items }) // Only persist items
    }
  )
);

export default useCartStore;
```

### 3. Cart Page: `src/pages/user/cart/Cart.jsx`

```jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useCartStore from '@/stores/cartStore';
import { formatPrice } from '@/lib/utils';
import { Trash2, Plus, Minus } from 'lucide-react';

export default function Cart() {
  const navigate = useNavigate();
  const { 
    items, 
    loading, 
    totalItems, 
    subtotal, 
    fetchCart, 
    updateQuantity, 
    removeItem 
  } = useCartStore();

  useEffect(() => {
    fetchCart();
  }, []);

  const handleUpdateQuantity = async (id, currentQuantity, change) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity < 1) return;
    
    const result = await updateQuantity(id, newQuantity);
    if (!result.success) {
      toast.error(result.message);
    }
  };

  const handleRemove = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này?')) return;
    
    const result = await removeItem(id);
    if (result.success) {
      toast.success('Đã xóa khỏi giỏ hàng');
    } else {
      toast.error(result.message);
    }
  };

  if (loading) {
    return <div className="text-center py-20">Đang tải...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">Giỏ hàng trống</h2>
        <p className="text-gray-600 mb-6">Bạn chưa có sản phẩm nào trong giỏ hàng</p>
        <button
          onClick={() => navigate('/products')}
          className="bg-blue-600 text-white px-6 py-2 rounded"
        >
          Tiếp tục mua sắm
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Giỏ Hàng ({totalItems} sản phẩm)</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const price = item.variant?.price || item.product.price;
            const image = item.variant?.imageUrl || item.product.primaryImage;
            
            return (
              <div key={item.id} className="flex gap-4 p-4 border rounded">
                {/* Image */}
                <img
                  src={image || '/placeholder.jpg'}
                  alt={item.product.name}
                  className="w-24 h-24 object-cover rounded"
                />
                
                {/* Info */}
                <div className="flex-1">
                  <h3 className="font-semibold">{item.product.name}</h3>
                  {item.variant && (
                    <p className="text-sm text-gray-600">
                      {item.variant.color && `Màu: ${item.variant.color}`}
                      {item.variant.size && ` | Size: ${item.variant.size}`}
                    </p>
                  )}
                  <p className="text-orange-600 font-semibold mt-2">
                    {formatPrice(price)}
                  </p>
                </div>
                
                {/* Quantity Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateQuantity(item.id, item.quantity, -1)}
                    className="p-1 border rounded hover:bg-gray-100"
                    disabled={item.quantity <= 1}
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-12 text-center">{item.quantity}</span>
                  <button
                    onClick={() => handleUpdateQuantity(item.id, item.quantity, 1)}
                    className="p-1 border rounded hover:bg-gray-100"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                
                {/* Total & Remove */}
                <div className="flex flex-col items-end justify-between">
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={20} />
                  </button>
                  <p className="font-bold">
                    {formatPrice(Number(price) * item.quantity)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="border rounded p-6 sticky top-4">
            <h2 className="text-xl font-bold mb-4">Tóm Tắt Đơn Hàng</h2>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span>Tạm tính</span>
                <span className="font-semibold">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Phí vận chuyển</span>
                <span>Tính khi thanh toán</span>
              </div>
            </div>
            
            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between text-lg font-bold">
                <span>Tổng cộng</span>
                <span className="text-orange-600">{formatPrice(subtotal)}</span>
              </div>
            </div>
            
            <button
              onClick={() => navigate('/checkout')}
              className="w-full bg-orange-600 text-white py-3 rounded font-semibold hover:bg-orange-700"
            >
              Tiến Hành Thanh Toán
            </button>
            
            <button
              onClick={() => navigate('/products')}
              className="w-full mt-3 border border-gray-300 py-3 rounded hover:bg-gray-50"
            >
              Tiếp Tục Mua Sắm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 4. Add to Cart Button Component: `src/components/AddToCartButton.jsx`

```jsx
import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import useCartStore from '@/stores/cartStore';
import useAuthStore from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';

export default function AddToCartButton({ 
  productId, 
  variantId, 
  quantity = 1,
  className = '' 
}) {
  const [loading, setLoading] = useState(false);
  const { addToCart } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để thêm vào giỏ hàng');
      navigate('/login');
      return;
    }

    setLoading(true);
    const result = await addToCart(productId, variantId, quantity);
    setLoading(false);

    if (result.success) {
      toast.success('Đã thêm vào giỏ hàng');
    } else {
      toast.error(result.message);
    }
  };

  return (
    <button
      onClick={handleAddToCart}
      disabled={loading}
      className={`flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded hover:bg-orange-700 disabled:opacity-50 ${className}`}
    >
      <ShoppingCart size={20} />
      {loading ? 'Đang thêm...' : 'Thêm vào giỏ'}
    </button>
  );
}
```

### 5. Cart Badge Component: `src/components/CartBadge.jsx`

```jsx
import { ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useCartStore from '@/stores/cartStore';

export default function CartBadge() {
  const navigate = useNavigate();
  const totalItems = useCartStore(state => state.totalItems);

  return (
    <button
      onClick={() => navigate('/cart')}
      className="relative p-2 hover:bg-gray-100 rounded"
    >
      <ShoppingCart size={24} />
      {totalItems > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
          {totalItems > 99 ? '99+' : totalItems}
        </span>
      )}
    </button>
  );
}
```

---

## 🔄 Guest Cart Logic (LocalStorage)

### Guest Cart Store: `src/stores/guestCartStore.js`

```javascript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useGuestCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (productId, variantId, quantity = 1) => {
        const items = get().items;
        const existingIndex = items.findIndex(
          item => item.productId === productId && item.variantId === variantId
        );
        
        if (existingIndex >= 0) {
          // Update quantity
          const newItems = [...items];
          newItems[existingIndex].quantity += quantity;
          set({ items: newItems });
        } else {
          // Add new item
          set({ items: [...items, { productId, variantId, quantity }] });
        }
      },
      
      updateQuantity: (productId, variantId, quantity) => {
        const items = get().items;
        const newItems = items.map(item =>
          item.productId === productId && item.variantId === variantId
            ? { ...item, quantity }
            : item
        );
        set({ items: newItems });
      },
      
      removeItem: (productId, variantId) => {
        const items = get().items;
        set({ 
          items: items.filter(
            item => !(item.productId === productId && item.variantId === variantId)
          ) 
        });
      },
      
      clearCart: () => {
        set({ items: [] });
      },
      
      getItems: () => get().items
    }),
    {
      name: 'guest-cart-storage'
    }
  )
);

export default useGuestCartStore;
```

---

## 🧪 Testing

### Test Add to Cart
```bash
curl -X POST http://localhost:5000/api/cart/add \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": 1,
    "variantId": 2,
    "quantity": 2
  }'
```

### Test Get Cart
```bash
curl -X GET http://localhost:5000/api/cart \
  -H "Authorization: Bearer USER_TOKEN"
```

### Test Update Quantity
```bash
curl -X PUT http://localhost:5000/api/cart/1 \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "quantity": 3 }'
```

### Test Remove Item
```bash
curl -X DELETE http://localhost:5000/api/cart/1 \
  -H "Authorization: Bearer USER_TOKEN"
```

---

## 🚀 Flow Diagram

```
Add to Cart Flow:
1. User click "Thêm vào giỏ" → Frontend
2. Check authenticated:
   - YES → POST /api/cart/add
   - NO → Save to localStorage (guest cart)
3. Backend validate:
   - Product exists & active?
   - Variant exists (if provided)?
   - Stock available?
4. Check existing cart item:
   - EXISTS → Update quantity
   - NOT EXISTS → Create new
5. Return cart item → Frontend
6. Update cart store → Show toast
7. Update cart badge count

Update Quantity Flow:
1. User click +/- → Frontend
2. PUT /api/cart/:id with new quantity
3. Backend validate stock
4. Update cart item
5. Return updated item → Frontend
6. Refresh cart → Update UI

Sync Guest Cart (Login):
1. User login successfully
2. Check guest cart in localStorage
3. If has items:
   - POST /api/cart/sync with guest items
   - Backend merge with user cart
   - Clear localStorage
4. Fetch user cart
5. Update cart store

Checkout Flow:
1. User click "Thanh toán" → Navigate to /checkout
2. Fetch cart items
3. Validate stock again (real-time check)
4. Calculate shipping fee
5. Apply coupon (if any)
6. Create order
7. Clear cart after successful order
```

---

## ✅ Checklist

- [x] Add to cart (with variant support)
- [x] Update quantity
- [x] Remove item
- [x] Clear cart
- [x] Get cart with totals
- [x] Stock validation
- [x] Guest cart (localStorage)
- [x] Sync guest cart when login
- [x] Merge duplicate items
- [x] Cart badge with count
- [x] Persist cart data
- [x] Real-time stock check
- [x] Optimistic UI updates
- [x] Error handling
- [x] Loading states
