'use client';

import { useState, useEffect, useCallback } from 'react';

export interface UseAdminTokenOptions {
  storageKey?: string;
  persist?: boolean;
}

export interface UseAdminTokenReturn {
  token: string;
  setToken: (token: string) => void;
  clearToken: () => void;
  isLoaded: boolean;
}

/**
 * 管理后台令牌的自定义 Hook
 * 自动从 sessionStorage 读取和保存令牌
 * 
 * @example
 * const { token, setToken, clearToken } = useAdminToken({ storageKey: 'admin_token' });
 */
export function useAdminToken(options: UseAdminTokenOptions = {}): UseAdminTokenReturn {
  const { storageKey = 'admin_token', persist = true } = options;
  const [token, setTokenState] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  // 从 storage 读取初始值
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const saved = window.sessionStorage.getItem(storageKey);
      if (saved) {
        setTokenState(saved);
      }
    } catch (e) {
      console.warn('Failed to read from sessionStorage:', e);
    } finally {
      setIsLoaded(true);
    }
  }, [storageKey]);

  // 保存到 storage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isLoaded) return;

    try {
      const trimmed = token.trim();
      if (trimmed && persist) {
        window.sessionStorage.setItem(storageKey, trimmed);
      } else {
        window.sessionStorage.removeItem(storageKey);
      }
    } catch (e) {
      console.warn('Failed to write to sessionStorage:', e);
    }
  }, [token, storageKey, persist, isLoaded]);

  const setToken = useCallback((newToken: string) => {
    setTokenState(newToken);
  }, []);

  const clearToken = useCallback(() => {
    setTokenState('');
  }, []);

  return {
    token,
    setToken,
    clearToken,
    isLoaded,
  };
}
