#!/usr/bin/env node
/**
 * Debug script để kiểm tra authentication
 * Chạy: node debug_auth.js
 */

const jwt = require('jsonwebtoken');

// JWT config (giống backend)
const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'your-super-secret-key-change-in-production',
  expiresIn: '24h'
};

console.log('🔍 DEBUG AUTHENTICATION');
console.log('=' * 50);

// Kiểm tra token từ localStorage (copy từ browser)
const token = process.argv[2];

if (!token) {
  console.log('❌ Vui lòng cung cấp token:');
  console.log('   node debug_auth.js YOUR_TOKEN_HERE');
  console.log('');
  console.log('📋 Cách lấy token:');
  console.log('   1. Mở browser DevTools (F12)');
  console.log('   2. Vào tab Application > Local Storage');
  console.log('   3. Copy giá trị của key "token"');
  process.exit(1);
}

console.log('🔑 Token:', token.substring(0, 20) + '...');
console.log('');

try {
  // Verify token
  const decoded = jwt.verify(token, JWT_CONFIG.secret);
  console.log('✅ Token hợp lệ!');
  console.log('📊 Decoded payload:', decoded);
  console.log('');
  
  // Kiểm tra thời gian hết hạn
  const now = Math.floor(Date.now() / 1000);
  const exp = decoded.exp;
  const timeLeft = exp - now;
  
  console.log('⏰ Thời gian hết hạn:');
  console.log('   - Expires at:', new Date(exp * 1000).toLocaleString('vi-VN'));
  console.log('   - Time left:', Math.floor(timeLeft / 3600), 'hours');
  console.log('   - Is expired:', timeLeft < 0 ? 'YES' : 'NO');
  
} catch (error) {
  console.log('❌ Token không hợp lệ!');
  console.log('🔍 Error:', error.message);
  
  if (error.name === 'TokenExpiredError') {
    console.log('⏰ Token đã hết hạn');
  } else if (error.name === 'JsonWebTokenError') {
    console.log('🔐 Token không đúng format');
  }
}

console.log('');
console.log('🚀 Để test API:');
console.log('   curl -H "Authorization: Bearer ' + token + '" http://localhost:5000/api/admin/brands');
