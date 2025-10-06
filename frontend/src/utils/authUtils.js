/**
 * Utility functions cho authentication
 */

// Kiểm tra token có hợp lệ không
export const isTokenValid = () => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    // Decode token để kiểm tra thời gian hết hạn
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now;
  } catch (error) {
    console.error('Error checking token validity:', error);
    return false;
  }
};

// Kiểm tra user có phải admin không
export const isAdmin = () => {
  const userData = localStorage.getItem('user');
  if (!userData) return false;
  
  try {
    const user = JSON.parse(userData);
    return user.userType === 'admin' && user.role === 'ADMIN';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

// Lấy thông tin user
export const getUser = () => {
  const userData = localStorage.getItem('user');
  if (!userData) return null;
  
  try {
    return JSON.parse(userData);
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

// Clear authentication data
export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// Kiểm tra authentication status
export const getAuthStatus = () => {
  const token = localStorage.getItem('token');
  const user = getUser();
  const isValid = isTokenValid();
  const isAdminUser = isAdmin();
  
  return {
    isAuthenticated: !!token && !!user && isValid,
    isAdmin: isAdminUser,
    user,
    token: token ? `${token.substring(0, 20)}...` : null
  };
};

// Debug function
export const debugAuth = () => {
  const status = getAuthStatus();
  console.log('🔍 AUTH DEBUG:', status);
  return status;
};
