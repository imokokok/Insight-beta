/**
 * Admin Token Hook
 *
 * 管理后台管理令牌的安全存储和访问
 * 使用加密存储，支持自动过期
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

import {
  getAdminToken,
  setAdminToken,
  clearAdminToken,
} from '@/lib/utils/storage';

export interface UseAdminTokenOptions {
  /** 是否持久化到 sessionStorage */
  persist?: boolean;
  /** 存储键名 */
  storageKey?: string;
}

export interface UseAdminTokenReturn {
  token: string;
  setToken: (token: string) => void;
  clearToken: () => void;
  isLoaded: boolean;
}

/**
 * 管理员令牌 Hook
 *
 * @example
 * ```typescript
 * const { token, setToken, clearToken, isLoaded } = useAdminToken();
 *
 * // 设置令牌
 * setToken('your-admin-token');
 *
 * // 清除令牌
 * clearToken();
 * ```
 */
export function useAdminToken(options: UseAdminTokenOptions = {}): UseAdminTokenReturn {
  const { persist = true } = options;

  const [token, setTokenState] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  // 初始加载
  useEffect(() => {
    if (!persist) {
      setIsLoaded(true);
      return;
    }

    getAdminToken().then(saved => {
      if (saved) {
        setTokenState(saved);
      }
      setIsLoaded(true);
    });
  }, [persist]);

  // 设置令牌
  const setToken = useCallback(
    (newToken: string) => {
      const trimmed = newToken.trim();
      setTokenState(trimmed);

      if (persist && trimmed) {
        setAdminToken(trimmed);
      }
    },
    [persist]
  );

  // 清除令牌
  const clearToken = useCallback(() => {
    setTokenState('');
    if (persist) {
      clearAdminToken();
    }
  }, [persist]);

  return {
    token,
    setToken,
    clearToken,
    isLoaded,
  };
}
