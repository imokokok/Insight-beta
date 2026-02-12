'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useI18n } from '@/i18n/LanguageProvider';
import { getUiErrorMessage } from '@/i18n/translations';
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

export default function AdminTokensPage() {
  const { t, lang } = useI18n();
  const locale = useMemo(
    () => (lang === 'zh' ? 'zh-CN' : lang === 'es' ? 'es-ES' : 'en-US'),
    [lang],
  );

  const [adminToken, setAdminToken] = useState('');
  const [adminActor, setAdminActor] = useState('');

  const [items, setItems] = useState<AdminTokenPublic[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [label, setLabel] = useState('');
  const [role, setRole] = useState<AdminRole>('alerts');

  const [newTokenValue, setNewTokenValue] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const saved = window.sessionStorage.getItem('oracle-monitor_admin_token');
    if (saved) setAdminToken(saved);
    const savedActor = window.sessionStorage.getItem('oracle-monitor_admin_actor');
    if (savedActor) setAdminActor(savedActor);
  }, []);

  useEffect(() => {
    const trimmed = adminToken.trim();
    if (trimmed) window.sessionStorage.setItem('oracle-monitor_admin_token', trimmed);
    else window.sessionStorage.removeItem('oracle-monitor_admin_token');
  }, [adminToken]);

  useEffect(() => {
    const trimmed = adminActor.trim();
    if (trimmed) window.sessionStorage.setItem('oracle-monitor_admin_actor', trimmed);
    else window.sessionStorage.removeItem('oracle-monitor_admin_actor');
  }, [adminActor]);

  const buildHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    const token = adminToken.trim();
    if (token) headers['x-admin-token'] = token;
    const actor = adminActor.trim();
    if (actor) headers['x-admin-actor'] = actor;
    return headers;
  }, [adminActor, adminToken]);

  const load = useCallback(async () => {
    const token = adminToken.trim();
    if (!token) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApiData<{ items: AdminTokenPublic[] }>('/api/admin/tokens', {
        method: 'GET',
        headers: buildHeaders(),
      });
      setItems(data.items);
    } catch (error: unknown) {
      setError(getErrorCode(error));
    } finally {
      setLoading(false);
    }
  }, [adminToken, buildHeaders]);

  useEffect(() => {
    if (!adminToken.trim()) return;
    void load();
  }, [adminToken, load]);

  const createToken = async () => {
    setCreating(true);
    setError(null);
    setNewTokenValue(null);
    setCopied(false);
    try {
      const body = { label: label.trim(), role };
      const data = await fetchApiData<CreateResponse>('/api/admin/tokens', {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify(body),
      });
      setNewTokenValue(data.token);
      setLabel('');
      await load();
    } catch (error: unknown) {
      setError(getErrorCode(error));
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    setRevokingId(id);
    setError(null);
    try {
      await fetchApiData<{ ok: true }>(`/api/admin/tokens?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: buildHeaders(),
      });
      await load();
    } catch (error: unknown) {
      setError(getErrorCode(error));
    } finally {
      setRevokingId(null);
    }
  };

  const canManage = adminToken.trim().length > 0;

  return (
    <div className="space-y-6 pb-16">
      <PageHeader title={t('adminTokens.title')} description={t('adminTokens.description')} />

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-sm text-rose-700 shadow-sm">
          {getUiErrorMessage(error, t)}
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
              disabled={!canManage || creating || label.trim().length === 0}
              className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-500/20 disabled:opacity-60"
            >
              {creating ? t('common.loading') : t('adminTokens.create')}
            </button>

            {newTokenValue && (
              <div className="space-y-2 rounded-xl border border-primary/10 bg-white/50 p-3">
                <div className="text-xs font-semibold text-gray-500">
                  {t('adminTokens.tokenValue')}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={newTokenValue}
                    readOnly
                    className="h-9 flex-1 rounded-lg border-none bg-white/70 px-3 font-mono text-xs text-[var(--foreground)] shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await copyToClipboard(newTokenValue);
                      setCopied(ok);
                      if (ok) setTimeout(() => setCopied(false), 1200);
                    }}
                    className={cn(
                      'h-9 rounded-lg px-3 text-xs font-semibold shadow-sm ring-1',
                      copied
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                        : 'text-primary-dark ring-primary100 bg-white hover:bg-primary/5',
                    )}
                  >
                    {copied ? t('common.copied') : t('common.copyHash')}
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
                disabled={loading}
                className="text-primary-darker ring-primary100 rounded-xl bg-white/60 px-4 py-2 text-sm font-semibold shadow-sm ring-1 hover:bg-white disabled:opacity-60"
              >
                {loading ? t('common.loading') : t('audit.refresh')}
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.length === 0 && !loading && (
              <div className="text-primary-dark/70 rounded-2xl border border-primary/10 bg-white/50 p-6 text-sm shadow-sm">
                {t('common.noData')}
              </div>
            )}

            {items.map((it) => (
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
                      disabled={!canManage || !!it.revokedAt || revokingId === it.id}
                      className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-rose-700 shadow-sm ring-1 ring-rose-100 hover:bg-rose-50 disabled:opacity-60"
                    >
                      {revokingId === it.id ? t('common.loading') : t('adminTokens.revoke')}
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
