// config/jwt.js
export const JWT_CONFIG = {
    secret: process.env.JWT_SECRET || 'your-super-secret-key-change-in-production',
    expiresIn: '24h',
    refreshExpiresIn: '7d'
  }
  
  export const RATE_LIMIT_CONFIG = {
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 100, // Giới hạn 100 requests per windowMs
    message: 'Quá nhiều requests, vui lòng thử lại sau'
  }