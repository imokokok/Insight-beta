'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

import useSWR from 'swr';

import { useToast } from '@/components/ui/toast';
import { useI18n } from '@/i18n/LanguageProvider';
import type { UserStats } from '@/lib/types/oracleTypes';
import { fetchApiData } from '@/lib/utils';

const STORAGE_KEY = 'oracle-monitor_watchlist';
const TOKEN_KEY = 'oracle-monitor_admin_token';
const ACTOR_KEY = 'oracle-monitor_admin_actor';
const SESSION_EVENT = 'oracle-monitor_admin_session';

// ============================================================================
// useUserStats - 用户统计 Hook
// ============================================================================

export function useUserStats(address?: string | null, instanceId?: string | null) {
  const normalizedInstanceId = (instanceId ?? '').trim();
  const { data, error, isLoading } = useSWR<UserStats>(
    address
      ? `/api/oracle/stats/user?address=${encodeURIComponent(address)}${
          normalizedInstanceId ? `&instanceId=${encodeURIComponent(normalizedInstanceId)}` : ''
        }`
      : null,
    fetchApiData,
    {
      refreshInterval: 10000,
      shouldRetryOnError: false,
    },
  );

  return {
    stats: data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
  };
}

// ============================================================================
// useWatchlist - 关注列表 Hook
// ============================================================================

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const { t } = useI18n();

  useEffect(() => {
    setMounted(true);
    if (
      typeof window === 'undefined' ||
      !window.localStorage ||
      typeof window.localStorage.getItem !== 'function'
    ) {
      return;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      setWatchlist(JSON.parse(stored));
    } catch {
      setWatchlist([]);
    }
  }, []);

  const toggleWatchlist = (id: string) => {
    const isCurrentlyWatched = watchlist.includes(id);
    const next = isCurrentlyWatched ? watchlist.filter((i) => i !== id) : [...watchlist, id];

    // 先更新状态
    setWatchlist(next);

    // 然后在 useEffect 中处理副作用
    if (
      typeof window !== 'undefined' &&
      window.localStorage &&
      typeof window.localStorage.setItem === 'function'
    ) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }

    // Show toast notification
    if (isCurrentlyWatched) {
      toast({
        type: 'success',
        title: t('common.removeFromWatchlist'),
        message: t('common.success'),
        duration: 2000,
      });
    } else {
      toast({
        type: 'success',
        title: t('common.addToWatchlist'),
        message: t('common.success'),
        duration: 2000,
      });
    }
  };

  const isWatched = (id: string) => watchlist.includes(id);

  return { watchlist, toggleWatchlist, isWatched, mounted };
}

// ============================================================================
// useAdminSession - 管理员会话 Hook
// ============================================================================

export function useAdminSession(opts?: { actor?: boolean }) {
  const withActor = opts?.actor ?? false;
  const [adminToken, setAdminTokenState] = useState('');
  const [adminActor, setAdminActorState] = useState('');

  const readStorageToken = useCallback(() => {
    if (typeof window === 'undefined') return '';
    return window.sessionStorage.getItem(TOKEN_KEY) ?? '';
  }, []);

  const readStorageActor = useCallback(() => {
    if (typeof window === 'undefined') return '';
    return window.sessionStorage.getItem(ACTOR_KEY) ?? '';
  }, []);

  useEffect(() => {
    const saved = readStorageToken();
    if (saved) setAdminTokenState(saved);
    if (withActor) {
      const savedActor = readStorageActor();
      if (savedActor) setAdminActorState(savedActor);
    }
  }, [readStorageActor, readStorageToken, withActor]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncFromStorage = () => {
      const token = readStorageToken();
      setAdminTokenState(token);
      if (withActor) {
        const actor = readStorageActor();
        setAdminActorState(actor);
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.storageArea !== window.sessionStorage) return;
      if (event.key !== TOKEN_KEY && event.key !== ACTOR_KEY) return;
      syncFromStorage();
    };

    const onSession = () => {
      syncFromStorage();
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(SESSION_EVENT, onSession);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(SESSION_EVENT, onSession);
    };
  }, [readStorageActor, readStorageToken, withActor]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const trimmed = adminToken.trim();
    if (trimmed) window.sessionStorage.setItem(TOKEN_KEY, trimmed);
    else window.sessionStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event(SESSION_EVENT));
  }, [adminToken]);

  useEffect(() => {
    if (!withActor || typeof window === 'undefined') return;
    const trimmed = adminActor.trim();
    if (trimmed) window.sessionStorage.setItem(ACTOR_KEY, trimmed);
    else window.sessionStorage.removeItem(ACTOR_KEY);
    window.dispatchEvent(new Event(SESSION_EVENT));
  }, [adminActor, withActor]);

  const setAdminToken = useCallback((value: string) => {
    setAdminTokenState(value);
  }, []);

  const setAdminActor = useCallback((value: string) => {
    setAdminActorState(value);
  }, []);

  const headers = useMemo(() => {
    const out: Record<string, string> = {};
    const token = adminToken.trim();
    if (token) out['x-admin-token'] = token;
    if (withActor) {
      const actor = adminActor.trim();
      if (actor) out['x-admin-actor'] = actor;
    }
    return out;
  }, [adminActor, adminToken, withActor]);

  return {
    adminToken,
    setAdminToken,
    adminActor: withActor ? adminActor : '',
    setAdminActor: withActor ? setAdminActor : () => void 0,
    headers,
    canAdmin: adminToken.trim().length > 0,
  } as const;
}
