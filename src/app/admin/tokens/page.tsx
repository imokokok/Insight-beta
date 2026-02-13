'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useI18n } from '@/i18n/LanguageProvider';
import { fetchApiData, getErrorCode, copyToClipboard, formatTime, cn } from '@/shared/utils';

type AdminRole = 'root' | 'ops' | 'alerts' | 'viewer';

type AdminTokenPublic = {
  id: string;
  label: string;
  role: AdminRole;
  createdAt: string;
  createdByActor: string;
  revokedAt: string | null;
};

type CreateResponse = { token: string; record: AdminTokenPublic };

interface TokensState {
  items: AdminTokenPublic[];
  loading: boolean;
  creating: boolean;
  revokingId: string | null;
  error: string | null;
  newTokenValue: string | null;
  copied: boolean;
}

type TokensAction =
  | { type: 'SET_ITEMS'; payload: AdminTokenPublic[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CREATING'; payload: boolean }
  | { type: 'SET_REVOKING_ID'; payload: string | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_NEW_TOKEN'; payload: string | null }
  | { type: 'SET_COPIED'; payload: boolean }
  | { type: 'RESET_FORM' }
  | { type: 'CLEAR_ERROR' };

function tokensReducer(state: TokensState, action: TokensAction): TokensState {
  switch (action.type) {
    case 'SET_ITEMS':
      return { ...state, items: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_CREATING':
      return { ...state, creating: action.payload };
    case 'SET_REVOKING_ID':
      return { ...state, revokingId: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_NEW_TOKEN':
      return { ...state, newTokenValue: action.payload };
    case 'SET_COPIED':
      return { ...state, copied: action.payload };
    case 'RESET_FORM':
      return { ...state, newTokenValue: null, copied: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

const initialState: TokensState = {
  items: [],
  loading: false,
  creating: false,
  revokingId: null,
  error: null,
  newTokenValue: null,
  copied: false,
};

export default function AdminTokensPage() {
  const { t, lang } = useI18n();
  const locale = useMemo(
    () => (lang === 'zh' ? 'zh-CN' : lang === 'es' ? 'es-ES' : 'en-US'),
    [lang],
  );

  const [adminToken, setAdminToken] = useState('');
  const [adminActor, setAdminActor] = useState('');
  const [label, setLabel] = useState('');
  const [role, setRole] = useState<AdminRole>('alerts');

  const [state, dispatch] = useReducer(tokensReducer, initialState);

  const tokenRef = useRef(adminToken);
  const actorRef = useRef(adminActor);
  const headersRef = useRef<Record<string, string>>({});

  useEffect(() => {
    tokenRef.current = adminToken;
    actorRef.current = adminActor;
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    const token = adminToken.trim();
    if (token) headers['x-admin-token'] = token;
    const actor = adminActor.trim();
    if (actor) headers['x-admin-actor'] = actor;
    headersRef.current = headers;
  }, [adminToken, adminActor]);

  const canManage = useMemo(() => adminToken.trim().length > 0, [adminToken]);

  const load = useCallback(async () => {
    const token = tokenRef.current.trim();
    if (!token) {
      dispatch({ type: 'SET_ITEMS', payload: [] });
      dispatch({ type: 'SET_ERROR', payload: null });
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });
    try {
      const data = await fetchApiData<{ items: AdminTokenPublic[] }>('/api/admin/tokens', {
        method: 'GET',
        headers: headersRef.current,
      });
      dispatch({ type: 'SET_ITEMS', payload: data.items });
    } catch (error: unknown) {
      dispatch({ type: 'SET_ERROR', payload: getErrorCode(error) });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  useEffect(() => {
    if (!adminToken.trim()) return;
    const timer = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(timer);
  }, [adminToken, load]);

  const createToken = useCallback(async () => {
    dispatch({ type: 'SET_CREATING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });
    dispatch({ type: 'RESET_FORM' });
    try {
      const body = { label: label.trim(), role };
      const data = await fetchApiData<CreateResponse>('/api/admin/tokens', {
        method: 'POST',
        headers: headersRef.current,
        body: JSON.stringify(body),
      });
      dispatch({ type: 'SET_NEW_TOKEN', payload: data.token });
      setLabel('');
      await load();
    } catch (error: unknown) {
      dispatch({ type: 'SET_ERROR', payload: getErrorCode(error) });
    } finally {
      dispatch({ type: 'SET_CREATING', payload: false });
    }
  }, [label, role, load]);

  const revoke = useCallback(
    async (id: string) => {
      dispatch({ type: 'SET_REVOKING_ID', payload: id });
      dispatch({ type: 'CLEAR_ERROR' });
      try {
        await fetchApiData<{ ok: true }>(`/api/admin/tokens?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: headersRef.current,
        });
        await load();
      } catch (error: unknown) {
        dispatch({ type: 'SET_ERROR', payload: getErrorCode(error) });
      } finally {
        dispatch({ type: 'SET_REVOKING_ID', payload: null });
      }
    },
    [load],
  );

  const handleCopy = useCallback(async () => {
    if (!state.newTokenValue) return;
    const ok = await copyToClipboard(state.newTokenValue);
    dispatch({ type: 'SET_COPIED', payload: ok });
    if (ok) {
      setTimeout(() => dispatch({ type: 'SET_COPIED', payload: false }), 1200);
    }
  }, [state.newTokenValue]);

  const errorMessage = useMemo(() => {
    if (!state.error) return null;
    const errorKey = `errors.${state.error}`;
    const translated = t(errorKey);
    return translated === errorKey ? state.error : translated;
  }, [state.error, t]);

  return (
    <div className="space-y-6 pb-16">
      <PageHeader title={t('adminTokens.title')} description={t('adminTokens.description')} />

      {errorMessage && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-sm text-rose-700 shadow-sm">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-primary/10 bg-white/60 shadow-sm lg:col-span-1">
          <CardHeader className="pb-4">
            <div className="text-sm font-semibold text-[var(--foreground)]">
              {t('adminTokens.create')}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="admin-token" className="text-xs font-semibold text-gray-500">
                {t('alerts.adminToken')}
              </label>
              <input
                id="admin-token"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                placeholder="Bearer …"
                type="password"
                autoComplete="off"
                className="focus:ring-primary500/20 h-9 w-full rounded-lg border-none bg-white/50 px-3 text-sm text-[var(--foreground)] shadow-sm placeholder:text-primary/30 focus:ring-2"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="admin-actor" className="text-xs font-semibold text-gray-500">
                {t('alerts.adminActor')}
              </label>
              <input
                id="admin-actor"
                value={adminActor}
                onChange={(e) => setAdminActor(e.target.value)}
                placeholder={t('alerts.adminActorPlaceholder')}
                className="focus:ring-primary500/20 h-9 w-full rounded-lg border-none bg-white/50 px-3 text-sm text-[var(--foreground)] shadow-sm placeholder:text-primary/30 focus:ring-2"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="token-label" className="text-xs font-semibold text-gray-500">
                {t('adminTokens.label')}
              </label>
              <input
                id="token-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="focus:ring-primary500/20 h-9 w-full rounded-lg border-none bg-white/50 px-3 text-sm text-[var(--foreground)] shadow-sm placeholder:text-primary/30 focus:ring-2"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="token-role" className="text-xs font-semibold text-gray-500">
                {t('adminTokens.role')}
              </label>
              <select
                id="token-role"
                value={role}
                onChange={(e) => setRole(e.target.value as AdminRole)}
                className="focus:ring-primary500/20 h-9 w-full rounded-lg border-none bg-white/50 px-3 text-sm text-[var(--foreground)] shadow-sm focus:ring-2"
              >
                <option value="viewer">viewer</option>
                <option value="alerts">alerts</option>
                <option value="ops">ops</option>
                <option value="root">root</option>
              </select>
            </div>

            <button
              type="button"
              onClick={createToken}
              disabled={!canManage || state.creating || label.trim().length === 0}
              className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-500/20 disabled:opacity-60"
            >
              {state.creating ? t('common.loading') : t('adminTokens.create')}
            </button>

            {state.newTokenValue && (
              <div className="space-y-2 rounded-xl border border-primary/10 bg-white/50 p-3">
                <div className="text-xs font-semibold text-gray-500">
                  {t('adminTokens.tokenValue')}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={state.newTokenValue}
                    readOnly
                    className="h-9 flex-1 rounded-lg border-none bg-white/70 px-3 font-mono text-xs text-[var(--foreground)] shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={cn(
                      'h-9 rounded-lg px-3 text-xs font-semibold shadow-sm ring-1',
                      state.copied
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                        : 'text-primary-dark ring-primary100 bg-white hover:bg-primary/5',
                    )}
                  >
                    {state.copied ? t('common.copied') : t('common.copyHash')}
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/10 bg-white/60 shadow-sm lg:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-[var(--foreground)]">
                {t('nav.adminTokens')}
              </div>
              <button
                type="button"
                onClick={load}
                disabled={state.loading}
                className="text-primary-darker ring-primary100 rounded-xl bg-white/60 px-4 py-2 text-sm font-semibold shadow-sm ring-1 hover:bg-white disabled:opacity-60"
              >
                {state.loading ? t('common.loading') : t('audit.refresh')}
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {state.items.length === 0 && !state.loading && (
              <div className="text-primary-dark/70 rounded-2xl border border-primary/10 bg-white/50 p-6 text-sm shadow-sm">
                {t('common.noData')}
              </div>
            )}

            {state.items.map((it) => (
              <div key={it.id} className="rounded-xl border border-primary/10 bg-white/50 p-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-[var(--foreground)]">
                      {it.label}{' '}
                      <span className="text-primary-dark/70 text-xs font-medium">({it.role})</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {t('adminTokens.createdAt')}: {formatTime(it.createdAt, locale)} · actor:{' '}
                      {it.createdByActor || '—'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {t('adminTokens.revokedAt')}:{' '}
                      {it.revokedAt ? formatTime(it.revokedAt, locale) : '—'}
                    </div>
                    <div className="break-all font-mono text-[11px] text-gray-400">{it.id}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => revoke(it.id)}
                      disabled={!canManage || !!it.revokedAt || state.revokingId === it.id}
                      className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-rose-700 shadow-sm ring-1 ring-rose-100 hover:bg-rose-50 disabled:opacity-60"
                    >
                      {state.revokingId === it.id ? t('common.loading') : t('adminTokens.revoke')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
