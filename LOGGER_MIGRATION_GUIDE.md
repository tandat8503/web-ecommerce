# 📚 LOGGER MIGRATION GUIDE

## Đã hoàn thành ✅

### 1. Logger Helpers Created
- ✅ `backend/utils/logger.js` - Backend logger
- ✅ `frontend/src/utils/logger.js` - Frontend logger

### 2. Partially Migrated Files
- ✅ `backend/controller/adminCategoryController.js` - Một phần (listCategories)

## Cần Migration 🔄

### Backend Controllers (còn ~12 files)
```
backend/controller/
├── adminProductController.js  
├── adminBrandController.js
├── adminCouponController.js
├── adminOrderController.js
├── adminProductImageController.js
├── adminProductVariantController.js
├── authController.js
├── userController.js
├── wishlistController.js
├── shoppingCartController.js
├── paymentController.js
├── addressController.js
└── couponController.js
```

### Frontend Components (Priority)
```
frontend/src/
├── components/
│   ├── InitUserData.jsx
│   └── user/CategoryProducts.jsx
├── pages/
│   ├── admin/category/useAdminCategories.js
│   ├── admin/product/useAdminProducts.js
│   └── user/Products.jsx
└── stores/
    ├── cartStore.js
    └── wishlistStore.js
```

## MIGRATION PATTERN

### Backend Controller Pattern

**BEFORE**:
```javascript
export const someFunction = async (req, res) => {
  const context = { path: 'some.path', query: req.query };
  try {
    console.log('START', context);
    console.log('User:', req.user);
    console.log('Query:', req.query);
    
    // ... logic ...
    
    console.log('END', { ...context, result });
    return res.json(result);
  } catch (error) {
    console.error('ERROR', { ...context, error });
    return res.status(500).json({ message: 'Error' });
  }
};
```

**AFTER**:
```javascript
import logger from '../utils/logger.js';

export const someFunction = async (req, res) => {
  const context = { path: 'some.path' };
  try {
    logger.start(context.path, { 
      query: req.query,
      user: req.user ? { id: req.user.id, role: req.user.role } : null
    });
    
    // ... logic ...
    
    logger.success('Operation completed', { result });
    logger.end(context.path, { result });
    return res.json(result);
  } catch (error) {
    logger.error('Operation failed', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ message: 'Error' });
  }
};
```

### Frontend Component Pattern

**BEFORE**:
```javascript
useEffect(() => {
  const fetchData = async () => {
    try {
      console.log('Fetching data...');
      const response = await api.getData();
      console.log('Data:', response);
      setData(response);
    } catch (error) {
      console.error('Error:', error);
    }
  };
  fetchData();
}, []);
```

**AFTER**:
```javascript
import logger from '@/utils/logger';

useEffect(() => {
  const fetchData = async () => {
    try {
      logger.debug('Fetching data');
      
      const timer = logger.time('fetchData');
      const response = await api.getData();
      logger.timeEnd(timer);
      
      logger.success('Data fetched', { count: response.length });
      setData(response);
    } catch (error) {
      logger.error('Failed to fetch data', { error: error.message });
    }
  };
  fetchData();
}, []);
```

### Zustand Store Pattern

**BEFORE**:
```javascript
const useStore = create((set) => ({
  items: [],
  addItem: (item) => {
    console.log('Adding item:', item);
    set((state) => ({
      items: [...state.items, item]
    }));
  }
}));
```

**AFTER**:
```javascript
import logger from '@/utils/logger';

const useStore = create((set) => ({
  items: [],
  addItem: (item) => {
    logger.store('storeName', 'addItem', { itemId: item.id });
    set((state) => ({
      items: [...state.items, item]
    }));
  }
}));
```

## CHEATSHEET - Logger Methods

### Backend (`backend/utils/logger.js`)
```javascript
import logger from '../utils/logger.js';

// Development only
logger.debug('Debug info', { data });      // 🔍 Chi tiết kỹ thuật
logger.info('Info message', { data });     // ℹ️  Thông tin chung
logger.warn('Warning', { data });          // ⚠️  Cảnh báo

// Always logged (dev + production)
logger.error('Error occurred', { error }); // ❌ Lỗi nghiêm trọng

// Specialized
logger.api('GET', '/api/products', { params }); // 🌐 API calls (nếu LOG_API=true)
logger.db('SELECT', 'products', { where }); // 💾 DB queries (nếu LOG_DB=true)
logger.success('Success', { data });       // ✅ Thành công
logger.start('path.to.endpoint', { data }); // 🚀 Bắt đầu
logger.end('path.to.endpoint', { data });  // 🏁 Kết thúc
```

### Frontend (`frontend/src/utils/logger.js`)
```javascript
import logger from '@/utils/logger';

// Development only
logger.debug('Debug info', { data });
logger.info('Info message', { data });
logger.warn('Warning', { data });

// Always logged
logger.error('Error', { error });

// Specialized
logger.api('GET', '/api/products', { params }); // API calls
logger.success('Success', { data });
logger.mount('ComponentName', { props });  // Component mount
logger.unmount('ComponentName');           // Component unmount
logger.store('storeName', 'action', { data }); // Store actions

// Performance
const timer = logger.time('operationName');
// ... do work ...
logger.timeEnd(timer); // Logs: ⏱️ operationName: 123.45ms

// Display data as table
logger.table('Products', products);

// Group logs
logger.group('User Actions');
logger.info('Login');
logger.info('Profile loaded');
logger.groupEnd();
```

## ENV SETUP

### `.env.development` (Backend)
```env
NODE_ENV=development
LOG_LEVEL=debug
LOG_API=true
LOG_DB=false
```

### `.env.production` (Backend)
```env
NODE_ENV=production
LOG_LEVEL=error
LOG_API=false
LOG_DB=false
```

## BENEFITS

### Development
- ✅ **Logs có màu sắc, dễ đọc**
- ✅ **Phân loại rõ ràng** (DEBUG/INFO/WARN/ERROR)
- ✅ **Timestamp tự động**
- ✅ **Tắt/bật linh hoạt** bằng env vars
- ✅ **Performance tracking** (timer)

### Production
- ✅ **Chỉ log errors** (giảm noise 95%)
- ✅ **Không lộ thông tin nhạy cảm**
- ✅ **Performance tốt hơn**
- ✅ **Dễ integrate monitoring tools** (Sentry, LogRocket)

### Future-proof
- ✅ **Dễ mở rộng** (thêm methods mới)
- ✅ **Dễ tích hợp** logging services
- ✅ **Consistent** across codebase
- ✅ **Professional** codebase structure

## NEXT STEPS

1. ✅ Continue migrating backend controllers
2. ✅ Migrate frontend components/stores
3. ✅ Test in development mode
4. ✅ Test in production build
5. ✅ Update documentation
6. ✅ Train team on new logging patterns

---

**Last updated**: Today  
**Migration Progress**: 10% (1/13 controllers)  
**Estimated completion**: ~2 hours for full migration

