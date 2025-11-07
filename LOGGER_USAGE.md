# 🎯 LOGGER USAGE GUIDE - Hướng dẫn sử dụng Logger

## 📚 Mục lục
1. [Tổng quan](#tổng-quan)
2. [Backend Logger](#backend-logger)
3. [Frontend Logger](#frontend-logger)
4. [Environment Variables](#environment-variables)
5. [Best Practices](#best-practices)
6. [Examples](#examples)

---

## Tổng quan

### Logger là gì?
Logger helper giúp bạn:
- ✅ Quản lý logs chuyên nghiệp
- ✅ Tự động tắt debug logs trong production
- ✅ Phân loại logs rõ ràng (DEBUG/INFO/WARN/ERROR)
- ✅ Dễ debug và maintain code

### Khi nào dùng Logger?
- 🔍 **Debug**: Chi tiết kỹ thuật, dữ liệu trung gian
- ℹ️ **Info**: Thông tin quan trọng về flow
- ⚠️ **Warn**: Cảnh báo về vấn đề tiềm ẩn
- ❌ **Error**: Lỗi nghiêm trọng cần xử lý

---

## Backend Logger

### Import
```javascript
import logger from '../utils/logger.js';
```

### Các Methods Cơ Bản

#### 1. `logger.debug()` - Chi tiết kỹ thuật
```javascript
// Sử dụng khi: Debug variables, intermediate data
logger.debug('User query params', { page, limit, search });
logger.debug('Database query', { where, orderBy });
```

#### 2. `logger.info()` - Thông tin chung
```javascript
// Sử dụng khi: Log important milestones
logger.info('Server started', { port: 5000 });
logger.info('Database connected');
```

#### 3. `logger.warn()` - Cảnh báo
```javascript
// Sử dụng khi: Potential problems
logger.warn('Category not found', { id: 123 });
logger.warn('Deprecated API called', { endpoint });
```

#### 4. `logger.error()` - Lỗi
```javascript
// Sử dụng khi: Errors that need attention
logger.error('Database connection failed', { 
  error: error.message,
  stack: error.stack 
});
```

### Các Methods Chuyên Biệt

#### 5. `logger.start()` & `logger.end()` - Track API endpoints
```javascript
export const getProducts = async (req, res) => {
  try {
    logger.start('products.list', { query: req.query });
    
    const products = await db.products.findMany();
    
    logger.end('products.list', { count: products.length });
    return res.json(products);
  } catch (error) {
    logger.error('Failed to fetch products', { error: error.message });
  }
};
```

#### 6. `logger.success()` - Successful operations
```javascript
const created = await db.category.create({ data });
logger.success('Category created', { id: created.id, name: created.name });
```

#### 7. `logger.api()` - HTTP requests
```javascript
// Chỉ khi LOG_API=true
logger.api('GET', '/api/products', { query: req.query });
logger.api('POST', '/api/products', { body: req.body });
```

#### 8. `logger.db()` - Database queries
```javascript
// Chỉ khi LOG_DB=true
logger.db('SELECT', 'products', { where: { status: 'ACTIVE' } });
logger.db('INSERT', 'categories', { data: newCategory });
```

### Pattern Chuẩn Cho Controllers

```javascript
import logger from '../utils/logger.js';

export const yourController = async (req, res) => {
  const context = { path: 'your.path' };
  
  try {
    // 1. Log start với context
    logger.start(context.path, { 
      query: req.query,
      user: req.user ? { id: req.user.id, role: req.user.role } : null
    });
    
    // 2. Log các bước quan trọng
    logger.debug('Validating input', { input: req.body });
    
    // 3. Thực hiện logic
    const result = await doSomething();
    
    // 4. Log success
    logger.success('Operation completed', { result });
    
    // 5. Log end
    logger.end(context.path, { result });
    
    return res.json(result);
    
  } catch (error) {
    // 6. Log error với đầy đủ context
    logger.error('Operation failed', {
      path: context.path,
      error: error.message,
      stack: error.stack,
      input: req.body
    });
    
    return res.status(500).json({ message: 'Server error' });
  }
};
```

---

## Frontend Logger

### Import
```javascript
import logger from '@/utils/logger';
```

### Các Methods Cơ Bản

#### 1-4. `debug`, `info`, `warn`, `error` - Giống backend
```javascript
logger.debug('Component state', { state });
logger.info('Data fetched', { count: data.length });
logger.warn('Missing props', { expected: 'id' });
logger.error('API call failed', { error: error.message });
```

### Các Methods Frontend-Specific

#### 5. `logger.api()` - API calls
```javascript
const fetchProducts = async () => {
  logger.api('GET', '/api/products', { params: { page: 1 } });
  const response = await axios.get('/api/products');
  return response.data;
};
```

#### 6. `logger.mount()` & `logger.unmount()` - Component lifecycle
```javascript
useEffect(() => {
  logger.mount('ProductCard', { productId: product.id });
  
  return () => {
    logger.unmount('ProductCard');
  };
}, []);
```

#### 7. `logger.time()` & `logger.timeEnd()` - Performance tracking
```javascript
const fetchData = async () => {
  const timer = logger.time('fetchProducts');
  
  const products = await api.getProducts();
  
  logger.timeEnd(timer); // Logs: ⏱️ fetchProducts: 123.45ms
};
```

#### 8. `logger.store()` - Zustand/Redux actions
```javascript
const useCartStore = create((set) => ({
  items: [],
  addItem: (item) => {
    logger.store('cartStore', 'addItem', { itemId: item.id });
    set((state) => ({ items: [...state.items, item] }));
  }
}));
```

#### 9. `logger.table()` - Display data as table
```javascript
logger.table('Products', products);
// Hiển thị dạng bảng trong console
```

#### 10. `logger.group()` - Group related logs
```javascript
logger.group('User Authentication');
logger.info('Validating credentials');
logger.info('Fetching user data');
logger.success('Login successful');
logger.groupEnd();
```

### Pattern Chuẩn Cho React Components

```javascript
import logger from '@/utils/logger';

function ProductCard({ product }) {
  // 1. Log component mount
  useEffect(() => {
    logger.mount('ProductCard', { productId: product.id });
    
    return () => {
      logger.unmount('ProductCard');
    };
  }, []);
  
  // 2. Log async operations với timing
  const handleAddToCart = async () => {
    try {
      logger.debug('Adding to cart', { productId: product.id });
      
      const timer = logger.time('addToCart');
      await addToCart(product.id);
      logger.timeEnd(timer);
      
      logger.success('Added to cart', { productId: product.id });
    } catch (error) {
      logger.error('Failed to add to cart', { 
        productId: product.id,
        error: error.message 
      });
    }
  };
  
  return <div onClick={handleAddToCart}>Add to Cart</div>;
}
```

---

## Environment Variables

### Backend (.env.development)
```env
NODE_ENV=development
LOG_LEVEL=debug        # debug|info|warn|error
LOG_API=true           # Hiển thị API logs
LOG_DB=false           # Hiển thị DB logs
```

### Backend (.env.production)
```env
NODE_ENV=production
LOG_LEVEL=error        # Chỉ log errors
LOG_API=false          # Tắt API logs
LOG_DB=false           # Tắt DB logs
```

### Frontend
- Development: `npm run dev` → Hiển thị tất cả logs
- Production: `npm run build` → Chỉ hiển thị errors

---

## Best Practices

### ✅ DO

```javascript
// 1. Sử dụng logger thay vì console.log
logger.debug('User data', { user }); // ✅

// 2. Log errors với đầy đủ context
logger.error('API call failed', {
  error: error.message,
  stack: error.stack,
  endpoint: '/api/products',
  params: req.query
}); // ✅

// 3. Sử dụng đúng level
logger.debug('Variable value', { value }); // Chi tiết
logger.info('Operation started'); // Milestone
logger.warn('Deprecated API'); // Cảnh báo
logger.error('Critical error'); // Lỗi nghiêm trọng
```

### ❌ DON'T

```javascript
// 1. Không dùng console.log
console.log('Debug info'); // ❌

// 2. Không log sensitive data
logger.debug('User login', { password: '123456' }); // ❌
logger.debug('User login', { email: user.email }); // ✅

// 3. Không spam logs
for (let i = 0; i < 1000; i++) {
  logger.debug('Processing', { i }); // ❌
}
logger.debug('Processing items', { count: 1000 }); // ✅
```

---

## Examples

### Example 1: API Controller
```javascript
import logger from '../utils/logger.js';

export const createProduct = async (req, res) => {
  try {
    logger.start('products.create', { name: req.body.name });
    
    // Validation
    if (!req.body.name) {
      logger.warn('Missing required field', { field: 'name' });
      return res.status(400).json({ message: 'Name required' });
    }
    
    // Database operation
    logger.debug('Creating product', { data: req.body });
    const product = await db.product.create({ data: req.body });
    
    logger.success('Product created', { id: product.id });
    logger.end('products.create', { id: product.id });
    
    return res.status(201).json(product);
  } catch (error) {
    logger.error('Failed to create product', {
      error: error.message,
      stack: error.stack,
      input: req.body
    });
    return res.status(500).json({ message: 'Server error' });
  }
};
```

### Example 2: React Component
```javascript
import logger from '@/utils/logger';

function ProductList() {
  const [products, setProducts] = useState([]);
  
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        logger.debug('Fetching products');
        
        const timer = logger.time('fetchProducts');
        const response = await api.getProducts();
        logger.timeEnd(timer);
        
        logger.success('Products loaded', { count: response.length });
        logger.table('Products', response);
        
        setProducts(response);
      } catch (error) {
        logger.error('Failed to fetch products', { 
          error: error.message 
        });
      }
    };
    
    fetchProducts();
  }, []);
  
  return <div>...</div>;
}
```

### Example 3: Zustand Store
```javascript
import logger from '@/utils/logger';
import { create } from 'zustand';

const useCartStore = create((set, get) => ({
  items: [],
  
  addToCart: (product) => {
    logger.store('cartStore', 'addToCart', { 
      productId: product.id,
      currentCount: get().items.length 
    });
    
    set((state) => ({
      items: [...state.items, product]
    }));
    
    logger.success('Item added to cart', { 
      productId: product.id,
      newCount: get().items.length 
    });
  },
  
  removeFromCart: (productId) => {
    logger.store('cartStore', 'removeFromCart', { productId });
    
    set((state) => ({
      items: state.items.filter(item => item.id !== productId)
    }));
  }
}));
```

---

## 🎓 Summary

### Backend
- Import: `import logger from '../utils/logger.js';`
- Main methods: `debug`, `info`, `warn`, `error`, `start`, `end`, `success`
- Special: `api`, `db` (controlled by ENV vars)

### Frontend
- Import: `import logger from '@/utils/logger';`
- Main methods: `debug`, `info`, `warn`, `error`, `success`
- Special: `mount`, `unmount`, `time`, `timeEnd`, `store`, `table`, `group`

### Production
- Backend: Chỉ log errors (LOG_LEVEL=error)
- Frontend: Chỉ log errors (tự động trong build)

---

**Lợi ích**:
- ✅ Clean console logs
- ✅ Easy debugging
- ✅ Professional codebase
- ✅ Production-ready
- ✅ Future-proof (dễ integrate monitoring tools)

