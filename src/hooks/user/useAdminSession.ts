'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const TOKEN_KEY = 'insight_admin_token';
const ACTOR_KEY = 'insight_admin_actor';
const SESSION_EVENT = 'insight_admin_session';

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
