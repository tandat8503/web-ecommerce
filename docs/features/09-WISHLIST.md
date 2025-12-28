# Wishlist System - Hệ Thống Danh Sách Yêu Thích

## 📋 Tổng Quan

Hệ thống wishlist cho phép:
- Thêm/Xóa sản phẩm yêu thích
- Xem danh sách wishlist
- Chuyển sản phẩm từ wishlist sang giỏ hàng
- Sync wishlist khi đăng nhập
- Chia sẻ wishlist (optional)

---

## 🗄️ Database Schema

```prisma
model Wishlist {
  id        Int      @id @default(autoincrement())
  userId    Int      @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  productId Int      @map("product_id")
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now()) @map("created_at")
  
  @@unique([userId, productId])
  @@map("wishlists")
  @@index([userId])
  @@index([productId])
}
```

**Lưu ý**:
- Unique constraint trên `(userId, productId)` để tránh duplicate
- Cascade delete khi xóa user hoặc product

---

## 🔧 Backend Implementation

### 1. Controller: `controller/wishlistController.js`

#### Get User Wishlist
```javascript
import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';

export const getWishlist = async (req, res) => {
  try {
    const userId = req.user.id;

    const wishlistItems = await prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            comparePrice: true,
            primaryImage: true,
            stockQuantity: true,
            isActive: true,
            category: {
              select: {
                id: true,
                name: true
              }
            },
            brand: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      success: true,
      data: {
        items: wishlistItems,
        totalItems: wishlistItems.length
      }
    });
  } catch (error) {
    logger.error('Get wishlist error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách yêu thích'
    });
  }
};
```

#### Add to Wishlist
```javascript
export const addToWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'productId là bắt buộc'
      });
    }

    // Check if product exists and is active
    const product = await prisma.product.findUnique({
      where: { id: Number(productId) }
    });

    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Sản phẩm không tồn tại hoặc đã ngừng bán'
      });
    }

    // Check if already in wishlist
    const existingItem = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: Number(productId)
        }
      }
    });

    if (existingItem) {
      return res.status(409).json({
        success: false,
        message: 'Sản phẩm đã có trong danh sách yêu thích'
      });
    }

    // Add to wishlist
    const wishlistItem = await prisma.wishlist.create({
      data: {
        userId,
        productId: Number(productId)
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            primaryImage: true
          }
        }
      }
    });

    logger.info('Product added to wishlist', { userId, productId });

    return res.status(201).json({
      success: true,
      message: 'Đã thêm vào danh sách yêu thích',
      data: wishlistItem
    });
  } catch (error) {
    logger.error('Add to wishlist error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi thêm vào danh sách yêu thích'
    });
  }
};
```

#### Remove from Wishlist
```javascript
export const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    // Check if item exists
    const wishlistItem = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: Number(productId)
        }
      }
    });

    if (!wishlistItem) {
      return res.status(404).json({
        success: false,
        message: 'Sản phẩm không có trong danh sách yêu thích'
      });
    }

    // Delete from wishlist
    await prisma.wishlist.delete({
      where: {
        userId_productId: {
          userId,
          productId: Number(productId)
        }
      }
    });

    logger.info('Product removed from wishlist', { userId, productId });

    return res.json({
      success: true,
      message: 'Đã xóa khỏi danh sách yêu thích'
    });
  } catch (error) {
    logger.error('Remove from wishlist error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa khỏi danh sách yêu thích'
    });
  }
};
```

#### Move to Cart
```javascript
export const moveToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;
    const { variantId, quantity = 1 } = req.body;

    // Check if product in wishlist
    const wishlistItem = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: Number(productId)
        }
      },
      include: {
        product: true
      }
    });

    if (!wishlistItem) {
      return res.status(404).json({
        success: false,
        message: 'Sản phẩm không có trong danh sách yêu thích'
      });
    }

    // Check stock
    const availableStock = wishlistItem.product.stockQuantity;
    if (availableStock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Chỉ còn ${availableStock} sản phẩm trong kho`
      });
    }

    await prisma.$transaction(async (tx) => {
      // Check if already in cart
      const existingCartItem = await tx.shoppingCart.findUnique({
        where: {
          userId_productId_variantId: {
            userId,
            productId: Number(productId),
            variantId: variantId ? Number(variantId) : null
          }
        }
      });

      if (existingCartItem) {
        // Update quantity
        await tx.shoppingCart.update({
          where: { id: existingCartItem.id },
          data: {
            quantity: existingCartItem.quantity + Number(quantity)
          }
        });
      } else {
        // Create new cart item
        await tx.shoppingCart.create({
          data: {
            userId,
            productId: Number(productId),
            variantId: variantId ? Number(variantId) : null,
            quantity: Number(quantity)
          }
        });
      }

      // Remove from wishlist
      await tx.wishlist.delete({
        where: {
          userId_productId: {
            userId,
            productId: Number(productId)
          }
        }
      });
    });

    logger.info('Product moved from wishlist to cart', { userId, productId });

    return res.json({
      success: true,
      message: 'Đã chuyển vào giỏ hàng'
    });
  } catch (error) {
    logger.error('Move to cart error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi chuyển vào giỏ hàng'
    });
  }
};
```

#### Check if in Wishlist
```javascript
export const checkInWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const wishlistItem = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: Number(productId)
        }
      }
    });

    return res.json({
      success: true,
      data: {
        inWishlist: !!wishlistItem
      }
    });
  } catch (error) {
    logger.error('Check wishlist error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi kiểm tra wishlist'
    });
  }
};
```

#### Clear Wishlist
```javascript
export const clearWishlist = async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.wishlist.deleteMany({
      where: { userId }
    });

    logger.info('Wishlist cleared', { userId });

    return res.json({
      success: true,
      message: 'Đã xóa toàn bộ danh sách yêu thích'
    });
  } catch (error) {
    logger.error('Clear wishlist error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa wishlist'
    });
  }
};
```

### 2. Routes: `routes/wishlistRoutes.js`

```javascript
import express from 'express';
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  moveToCart,
  checkInWishlist,
  clearWishlist
} from '../controller/wishlistController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getWishlist);
router.post('/', addToWishlist);
router.delete('/:productId', removeFromWishlist);
router.post('/:productId/move-to-cart', moveToCart);
router.get('/check/:productId', checkInWishlist);
router.delete('/', clearWishlist);

export default router;
```

---

## 🎨 Frontend Implementation

### 1. API Service: `src/api/wishlist.js`

```javascript
import axiosClient from './axiosClient';

export const getWishlist = () => {
  return axiosClient.get('/wishlist');
};

export const addToWishlist = (productId) => {
  return axiosClient.post('/wishlist', { productId });
};

export const removeFromWishlist = (productId) => {
  return axiosClient.delete(`/wishlist/${productId}`);
};

export const moveToCart = (productId, data) => {
  return axiosClient.post(`/wishlist/${productId}/move-to-cart`, data);
};

export const checkInWishlist = (productId) => {
  return axiosClient.get(`/wishlist/check/${productId}`);
};

export const clearWishlist = () => {
  return axiosClient.delete('/wishlist');
};
```

### 2. Wishlist Store: `src/stores/wishlistStore.js`

```javascript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  getWishlist, 
  addToWishlist as addToWishlistAPI, 
  removeFromWishlist as removeFromWishlistAPI 
} from '@/api/wishlist';

const useWishlistStore = create(
  persist(
    (set, get) => ({
      // State
      items: [],
      loading: false,
      
      // Computed
      get totalItems() {
        return get().items.length;
      },
      
      get productIds() {
        return get().items.map(item => item.productId);
      },
      
      // Actions
      fetchWishlist: async () => {
        set({ loading: true });
        try {
          const response = await getWishlist();
          set({ items: response.data.data.items });
        } catch (error) {
          console.error('Fetch wishlist error:', error);
        } finally {
          set({ loading: false });
        }
      },
      
      addToWishlist: async (productId) => {
        try {
          await addToWishlistAPI(productId);
          await get().fetchWishlist();
          return { success: true };
        } catch (error) {
          return { 
            success: false, 
            message: error.response?.data?.message || 'Lỗi khi thêm vào wishlist' 
          };
        }
      },
      
      removeFromWishlist: async (productId) => {
        try {
          await removeFromWishlistAPI(productId);
          await get().fetchWishlist();
          return { success: true };
        } catch (error) {
          return { 
            success: false, 
            message: error.response?.data?.message || 'Lỗi khi xóa' 
          };
        }
      },
      
      isInWishlist: (productId) => {
        return get().productIds.includes(productId);
      },
      
      clearWishlist: () => {
        set({ items: [] });
      }
    }),
    {
      name: 'wishlist-storage',
      partialize: (state) => ({ items: state.items })
    }
  )
);

export default useWishlistStore;
```

### 3. Wishlist Button Component: `src/components/WishlistButton.jsx`

```jsx
import { useState } from 'react';
import { Heart } from 'lucide-react';
import useWishlistStore from '@/stores/wishlistStore';
import useAuthStore from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export default function WishlistButton({ productId, className = '' }) {
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlistStore();
  const navigate = useNavigate();
  
  const inWishlist = isInWishlist(productId);

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để thêm vào wishlist');
      navigate('/login');
      return;
    }

    setLoading(true);
    
    if (inWishlist) {
      const result = await removeFromWishlist(productId);
      if (result.success) {
        toast.success('Đã xóa khỏi danh sách yêu thích');
      } else {
        toast.error(result.message);
      }
    } else {
      const result = await addToWishlist(productId);
      if (result.success) {
        toast.success('Đã thêm vào danh sách yêu thích');
      } else {
        toast.error(result.message);
      }
    }
    
    setLoading(false);
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 ${className}`}
      title={inWishlist ? 'Xóa khỏi wishlist' : 'Thêm vào wishlist'}
    >
      <Heart
        size={24}
        className={`${
          inWishlist 
            ? 'fill-red-500 text-red-500' 
            : 'text-gray-600'
        } transition-colors`}
      />
    </button>
  );
}
```

### 4. Wishlist Page: `src/pages/user/wishlist/Wishlist.jsx`

```jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useWishlistStore from '@/stores/wishlistStore';
import { formatPrice } from '@/lib/utils';
import { Trash2, ShoppingCart } from 'lucide-react';
import { moveToCart } from '@/api/wishlist';
import { toast } from 'react-hot-toast';

export default function Wishlist() {
  const navigate = useNavigate();
  const { items, loading, totalItems, fetchWishlist, removeFromWishlist } = useWishlistStore();

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleMoveToCart = async (productId) => {
    try {
      await moveToCart(productId, { quantity: 1 });
      toast.success('Đã chuyển vào giỏ hàng');
      fetchWishlist();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi chuyển vào giỏ hàng');
    }
  };

  const handleRemove = async (productId) => {
    const result = await removeFromWishlist(productId);
    if (result.success) {
      toast.success('Đã xóa khỏi danh sách yêu thích');
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
        <h2 className="text-2xl font-bold mb-4">Danh sách yêu thích trống</h2>
        <p className="text-gray-600 mb-6">Bạn chưa có sản phẩm nào trong danh sách yêu thích</p>
        <button
          onClick={() => navigate('/products')}
          className="bg-blue-600 text-white px-6 py-2 rounded"
        >
          Khám Phá Sản Phẩm
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">
        Danh Sách Yêu Thích ({totalItems} sản phẩm)
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map((item) => (
          <div key={item.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative">
              <img
                src={item.product.primaryImage || '/placeholder.jpg'}
                alt={item.product.name}
                className="w-full h-64 object-cover cursor-pointer"
                onClick={() => navigate(`/products/${item.product.slug}`)}
              />
              
              {/* Remove Button */}
              <button
                onClick={() => handleRemove(item.productId)}
                className="absolute top-2 right-2 p-2 bg-white rounded-full shadow hover:bg-red-50"
              >
                <Trash2 size={20} className="text-red-600" />
              </button>
            </div>
            
            <div className="p-4">
              <h3 
                className="font-semibold mb-2 cursor-pointer hover:text-blue-600"
                onClick={() => navigate(`/products/${item.product.slug}`)}
              >
                {item.product.name}
              </h3>
              
              <div className="flex items-center gap-2 mb-3">
                <span className="text-orange-600 font-bold">
                  {formatPrice(item.product.price)}
                </span>
                {item.product.comparePrice && (
                  <span className="text-gray-400 line-through text-sm">
                    {formatPrice(item.product.comparePrice)}
                  </span>
                )}
              </div>
              
              {item.product.stockQuantity > 0 ? (
                <button
                  onClick={() => handleMoveToCart(item.productId)}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                >
                  <ShoppingCart size={18} />
                  Thêm Vào Giỏ
                </button>
              ) : (
                <button
                  disabled
                  className="w-full bg-gray-300 text-gray-600 py-2 rounded cursor-not-allowed"
                >
                  Hết Hàng
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🧪 Testing

### Test Add to Wishlist
```bash
curl -X POST http://localhost:5000/api/wishlist \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "productId": 1 }'
```

### Test Get Wishlist
```bash
curl -X GET http://localhost:5000/api/wishlist \
  -H "Authorization: Bearer USER_TOKEN"
```

### Test Remove from Wishlist
```bash
curl -X DELETE http://localhost:5000/api/wishlist/1 \
  -H "Authorization: Bearer USER_TOKEN"
```

### Test Move to Cart
```bash
curl -X POST http://localhost:5000/api/wishlist/1/move-to-cart \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "quantity": 1 }'
```

---

## 🚀 Flow Diagram

```
Add to Wishlist Flow:
1. User click heart icon → Frontend
2. Check authenticated:
   - NO → Redirect to login
   - YES → Continue
3. POST /wishlist with productId
4. Backend validate:
   - Product exists?
   - Already in wishlist?
5. Create wishlist record
6. Return success → Frontend
7. Update wishlist store
8. Show toast notification
9. Update heart icon (filled)

Move to Cart Flow:
1. User click "Thêm vào giỏ" → Frontend
2. POST /wishlist/:productId/move-to-cart
3. Backend transaction:
   - Check stock
   - Add to cart (or update quantity)
   - Remove from wishlist
4. Return success → Frontend
5. Refresh wishlist
6. Show toast notification

Remove from Wishlist Flow:
1. User click trash icon → Frontend
2. DELETE /wishlist/:productId
3. Backend delete record
4. Return success → Frontend
5. Update wishlist store
6. Remove from UI
7. Show toast notification
```

---

## ✅ Checklist

- [x] Add to wishlist
- [x] Remove from wishlist
- [x] View wishlist
- [x] Move to cart
- [x] Check if in wishlist
- [x] Clear wishlist
- [x] Wishlist button component
- [x] Heart icon animation
- [x] Stock validation
- [x] Sync across devices
- [x] Persist wishlist data
- [x] Error handling
- [x] Loading states
- [x] Toast notifications
