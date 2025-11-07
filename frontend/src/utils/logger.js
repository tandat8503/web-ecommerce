/**
 * 🎯 FRONTEND LOGGER HELPER
 * 
 * Mục đích:
 * - Quản lý browser console logs chuyên nghiệp
 * - Tự động tắt logs trong production build
 * - Phân loại logs rõ ràng
 * - Dễ debug trong development
 * 
 * Sử dụng:
 * import logger from '@/utils/logger';
 * 
 * logger.debug('Component mounted', { props });
 * logger.info('Data fetched', { data });
 * logger.warn('Deprecated prop used', { prop });
 * logger.error('API call failed', { error });
 * 
 * Environment:
 * - Development (npm run dev): Hiển thị tất cả logs
 * - Production (npm run build): Chỉ hiển thị errors
 */

// Kiểm tra môi trường (Vite sử dụng import.meta.env)
const isDev = import.meta.env.MODE === 'development';
const isProd = import.meta.env.MODE === 'production';

/**
 * Format log với timestamp và styling
 */
const formatLog = (level, emoji, color, ...args) => {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = `${emoji} [${level.toUpperCase()}] ${timestamp}`;
  
  return {
    prefix,
    color,
    args
  };
};

/**
 * Styled console log
 */
const styledLog = (logFn, level, emoji, color, ...args) => {
  const { prefix, args: logArgs } = formatLog(level, emoji, color, ...args);
  logFn(`%c${prefix}`, `color: ${color}; font-weight: bold;`, ...logArgs);
};

const logger = {
  /**
   * Debug logs - Chi tiết kỹ thuật
   * Chỉ trong development
   * 
   * @example
   * logger.debug('Component props', { props });
   */
  debug: (...args) => {
    if (isDev) {
      styledLog(console.log, 'debug', '🔍', '#9CA3AF', ...args);
    }
  },

  /**
   * Info logs - Thông tin chung
   * Chỉ trong development
   * 
   * @example
   * logger.info('Data loaded', { count: 10 });
   */
  info: (...args) => {
    if (isDev) {
      styledLog(console.log, 'info', 'ℹ️', '#3B82F6', ...args);
    }
  },

  /**
   * Warning logs - Cảnh báo
   * Chỉ trong development
   * 
   * @example
   * logger.warn('Missing prop', { component: 'Button' });
   */
  warn: (...args) => {
    if (isDev) {
      styledLog(console.warn, 'warn', '⚠️', '#F59E0B', ...args);
    }
  },

  /**
   * Error logs - Lỗi
   * Hiển thị cả development và production
   * 
   * @example
   * logger.error('API call failed', { error: err.message });
   */
  error: (...args) => {
    styledLog(console.error, 'error', '❌', '#EF4444', ...args);
  },

  /**
   * API logs - Requests/Responses
   * 
   * @example
   * logger.api('GET', '/api/products', { params: { page: 1 } });
   */
  api: (method, url, data = {}) => {
    if (isDev) {
      const methodColors = {
        GET: '#10B981',
        POST: '#3B82F6',
        PUT: '#F59E0B',
        PATCH: '#8B5CF6',
        DELETE: '#EF4444'
      };
      
      const color = methodColors[method] || '#6B7280';
      const emoji = {
        GET: '📥',
        POST: '📤',
        PUT: '🔄',
        PATCH: '✏️',
        DELETE: '🗑️'
      }[method] || '🌐';
      
      styledLog(console.log, 'api', emoji, color, `${method} ${url}`, data);
    }
  },

  /**
   * Success logs
   * 
   * @example
   * logger.success('Product created', { id: 123 });
   */
  success: (...args) => {
    if (isDev) {
      styledLog(console.log, 'success', '✅', '#10B981', ...args);
    }
  },

  /**
   * Component lifecycle logs
   * 
   * @example
   * logger.mount('ProductCard', { props });
   * logger.unmount('ProductCard');
   */
  mount: (componentName, data = {}) => {
    if (isDev) {
      styledLog(console.log, 'mount', '🔧', '#8B5CF6', `Mounted: ${componentName}`, data);
    }
  },

  unmount: (componentName) => {
    if (isDev) {
      styledLog(console.log, 'unmount', '🔌', '#6B7280', `Unmounted: ${componentName}`);
    }
  },

  /**
   * Performance logs
   * 
   * @example
   * const timer = logger.time('fetchProducts');
   * await fetchProducts();
   * logger.timeEnd(timer);
   */
  time: (label) => {
    if (isDev) {
      const startTime = performance.now();
      return { label, startTime };
    }
    return null;
  },

  timeEnd: (timer) => {
    if (isDev && timer) {
      const duration = (performance.now() - timer.startTime).toFixed(2);
      styledLog(console.log, 'perf', '⏱️', '#EC4899', `${timer.label}: ${duration}ms`);
    }
  },

  /**
   * Redux/Zustand store logs
   * 
   * @example
   * logger.store('cartStore', 'addToCart', { productId: 123 });
   */
  store: (storeName, action, data = {}) => {
    if (isDev) {
      styledLog(console.log, 'store', '📦', '#8B5CF6', `${storeName}.${action}`, data);
    }
  },

  /**
   * Table log - Hiển thị dữ liệu dạng bảng
   * 
   * @example
   * logger.table('Products', products);
   */
  table: (label, data) => {
    if (isDev) {
      console.log(`%c📊 ${label}`, 'color: #3B82F6; font-weight: bold;');
      console.table(data);
    }
  },

  /**
   * Group logs
   * 
   * @example
   * logger.group('User Actions');
   * logger.info('Login successful');
   * logger.info('Profile loaded');
   * logger.groupEnd();
   */
  group: (label) => {
    if (isDev) {
      console.group(`%c📁 ${label}`, 'color: #3B82F6; font-weight: bold;');
    }
  },

  groupEnd: () => {
    if (isDev) {
      console.groupEnd();
    }
  }
};

export default logger;

/**
 * USAGE EXAMPLES:
 * 
 * // React Component:
 * import logger from '@/utils/logger';
 * 
 * function ProductCard({ product }) {
 *   useEffect(() => {
 *     logger.mount('ProductCard', { productId: product.id });
 *     
 *     return () => {
 *       logger.unmount('ProductCard');
 *     };
 *   }, []);
 *   
 *   const handleAddToCart = async () => {
 *     try {
 *       logger.debug('Adding to cart', { productId: product.id });
 *       
 *       const timer = logger.time('addToCart');
 *       await addToCart(product.id);
 *       logger.timeEnd(timer);
 *       
 *       logger.success('Added to cart', { productId: product.id });
 *     } catch (error) {
 *       logger.error('Failed to add to cart', { error: error.message });
 *     }
 *   };
 * }
 * 
 * // Zustand Store:
 * import logger from '@/utils/logger';
 * 
 * const useCartStore = create((set) => ({
 *   items: [],
 *   addToCart: (product) => {
 *     logger.store('cartStore', 'addToCart', { productId: product.id });
 *     set((state) => ({
 *       items: [...state.items, product]
 *     }));
 *   }
 * }));
 */

