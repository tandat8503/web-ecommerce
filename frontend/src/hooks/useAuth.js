import { useState, useEffect } from 'react';
import { getAuthStatus } from '@/utils/authUtils';

/**
 * useAuth Hook - Quản lý authentication state
 * 
 * Returns:
 *  - isAuthenticated: boolean
 *  - isAdmin: boolean
 *  - user: object | null
 *  - token: string | null
 */
export const useAuth = () => {
  const [authState, setAuthState] = useState(() => getAuthStatus());

  useEffect(() => {
    // Listen for storage changes (login/logout from other tabs)
    const handleStorageChange = () => {
      setAuthState(getAuthStatus());
    };

    window.addEventListener('storage', handleStorageChange);

    // Also check periodically (every 5 seconds) for token expiration
    const interval = setInterval(() => {
      setAuthState(getAuthStatus());
    }, 5000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return authState;
};

export default useAuth;

