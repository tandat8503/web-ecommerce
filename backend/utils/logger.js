/**
 * 🎯 SIMPLE LOGGER HELPER
 * 
 * Mục đích:
 * - Quản lý logs một cách chuyên nghiệp
 * - Tự động tắt debug logs trong production
 * - Dễ dàng bật/tắt theo từng loại log
 * - Phân loại logs rõ ràng (DEBUG/INFO/WARN/ERROR)
 * 
 * Sử dụng:
 * import logger from './utils/logger.js';
 * 
 * logger.debug('Debug info', { data });     // Chỉ trong development
 * logger.info('General info', { data });    // Chỉ trong development
 * logger.warn('Warning', { data });         // Chỉ trong development
 * logger.error('Error occurred', { error }); // Luôn log (dev + production)
 * logger.api('GET', '/api/products', { params }); // API logging
 * 
 * Environment Variables (.env):
 * NODE_ENV=development|production
 * LOG_LEVEL=debug|info|warn|error (default: info)
 * LOG_API=true|false (default: false)
 * LOG_DB=true|false (default: false)
 */

// Kiểm tra môi trường
const isDev = process.env.NODE_ENV !== 'production';
const logLevel = process.env.LOG_LEVEL || 'info';
const logApi = process.env.LOG_API === 'true';
const logDb = process.env.LOG_DB === 'true';

// Log levels priority
const levels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const currentLevel = levels[logLevel] || levels.info;

/**
 * Format log message với timestamp và context
 * @param {string} level - Log level
 * @param {string} emoji - Emoji icon
 * @param  {...any} args - Log arguments
 */
const formatLog = (level, emoji, ...args) => {
  const timestamp = new Date().toISOString();
  const prefix = `${emoji} [${level.toUpperCase()}] ${timestamp}`;
  return [prefix, ...args];
};

/**
 * Check if should log based on level
 * @param {string} level - Level to check
 * @returns {boolean}
 */
const shouldLog = (level) => {
  return levels[level] >= currentLevel;
};

const logger = {
  /**
   * Debug logs - Chi tiết kỹ thuật, dữ liệu trung gian
   * Chỉ hiển thị trong development và khi LOG_LEVEL=debug
   * 
   * @example
   * logger.debug('Fetching categories', { query: req.query });
   */
  debug: (...args) => {
    if (isDev && shouldLog('debug')) {
      console.log(...formatLog('debug', '🔍', ...args));
    }
  },

  /**
   * Info logs - Thông tin quan trọng về flow của app
   * Hiển thị trong development
   * 
   * @example
   * logger.info('Categories fetched successfully', { total: 10 });
   */
  info: (...args) => {
    if (isDev && shouldLog('info')) {
      console.log(...formatLog('info', 'ℹ️ ', ...args));
    }
  },

  /**
   * Warning logs - Cảnh báo về vấn đề tiềm ẩn
   * Hiển thị trong development
   * 
   * @example
   * logger.warn('Category not found', { id: 123 });
   */
  warn: (...args) => {
    if (isDev && shouldLog('warn')) {
      console.warn(...formatLog('warn', '⚠️ ', ...args));
    }
  },

  /**
   * Error logs - Lỗi nghiêm trọng
   * LUÔN LUÔN hiển thị (cả development và production)
   * 
   * @example
   * logger.error('Database connection failed', { error: err.message, stack: err.stack });
   */
  error: (...args) => {
    if (shouldLog('error')) {
      console.error(...formatLog('error', '❌', ...args));
    }
  },

  /**
   * API request/response logs
   * Chỉ khi LOG_API=true trong .env
   * 
   * @example
   * logger.api('GET', '/api/categories', { query: { page: 1 } });
   * logger.api('POST', '/api/categories', { body: { name: 'New' } });
   */
  api: (method, path, data = {}) => {
    if (isDev && logApi) {
      const methodEmoji = {
        GET: '📥',
        POST: '📤',
        PUT: '🔄',
        PATCH: '✏️',
        DELETE: '🗑️'
      }[method] || '🌐';
      
      console.log(...formatLog('api', methodEmoji, `${method} ${path}`, data));
    }
  },

  /**
   * Database query logs
   * Chỉ khi LOG_DB=true trong .env
   * 
   * @example
   * logger.db('SELECT', 'categories', { where: { id: 1 } });
   */
  db: (operation, table, data = {}) => {
    if (isDev && logDb) {
      console.log(...formatLog('db', '💾', `${operation} ${table}`, data));
    }
  },

  /**
   * Success logs - Cho các operation quan trọng
   * 
   * @example
   * logger.success('Category created', { id: 123, name: 'New Category' });
   */
  success: (...args) => {
    if (isDev && shouldLog('info')) {
      console.log(...formatLog('success', '✅', ...args));
    }
  },

  /**
   * Start/End logs cho API endpoints
   * Format chuẩn: START path, END path với kết quả
   * 
   * @example
   * logger.start('admin.categories.list', { query: req.query });
   * logger.end('admin.categories.list', { total: 10 });
   */
  start: (path, data = {}) => {
    if (isDev && shouldLog('debug')) {
      console.log(...formatLog('start', '🚀', `START ${path}`, data));
    }
  },

  end: (path, data = {}) => {
    if (isDev && shouldLog('debug')) {
      console.log(...formatLog('end', '🏁', `END ${path}`, data));
    }
  }
};

export default logger;

/**
 * USAGE EXAMPLES:
 * 
 * // Backend Controller:
 * import logger from '../utils/logger.js';
 * 
 * export const listCategories = async (req, res) => {
 *   try {
 *     logger.start('admin.categories.list', { query: req.query });
 *     
 *     const [items, total] = await prisma.category.findMany(...);
 *     
 *     logger.success('Categories fetched', { total });
 *     logger.end('admin.categories.list', { total });
 *     
 *     return res.json({ items, total });
 *   } catch (error) {
 *     logger.error('Failed to fetch categories', { 
 *       error: error.message, 
 *       stack: error.stack 
 *     });
 *     return res.status(500).json({ message: 'Server error' });
 *   }
 * };
 * 
 * // Environment Setup (.env.development):
 * NODE_ENV=development
 * LOG_LEVEL=debug
 * LOG_API=true
 * LOG_DB=false
 * 
 * // Environment Setup (.env.production):
 * NODE_ENV=production
 * LOG_LEVEL=error
 * LOG_API=false
 * LOG_DB=false
 */

