'use client';

import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';

import { Download, ScrollText, RotateCw } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/i18n/LanguageProvider';
import { getUiErrorMessage, langToLocale } from '@/i18n/translations';
import type { AuditLogEntry } from '@/types/oracleTypes';
import { cn, fetchApiData, formatTime, getErrorCode } from '@/shared/utils';

type AuditListResponse = {
  items: AuditLogEntry[];
  total: number;
  nextCursor: number | null;
};

export function AuditLogViewer({
  adminToken,
  setAdminToken,
}: {
  adminToken: string;
  setAdminToken: (value: string) => void;
}) {
  const { t, lang } = useI18n();
  const locale = langToLocale[lang];

  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [nextCursor, setNextCursor] = useState<number | null>(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<{
    actor: string;
    action: string;
    entityType: string;
    entityId: string;
    q: string;
  }>({ actor: '', action: '', entityType: '', entityId: '', q: '' });

  const canLoadMore = nextCursor !== null;

  const headers = useMemo(() => {
    const h: Record<string, string> = {};
    const trimmed = adminToken.trim();
    if (trimmed) h['x-admin-token'] = trimmed;
    return h;
  }, [adminToken]);

  const buildQueryString = useMemo(() => {
    return (input: { cursor: number; limit: number }) => {
      const params = new URLSearchParams();
      params.set('cursor', String(input.cursor));
      params.set('limit', String(input.limit));

      const actor = filters.actor.trim();
      const action = filters.action.trim();
      const entityType = filters.entityType.trim();
      const entityId = filters.entityId.trim();
      const q = filters.q.trim();

      if (actor) params.set('actor', actor);
      if (action) params.set('action', action);
      if (entityType) params.set('entityType', entityType);
      if (entityId) params.set('entityId', entityId);
      if (q) params.set('q', q);

      return params.toString();
    };
  }, [filters]);

  const load = useMemo(() => {
    return async (cursor: number, replace: boolean) => {
      const isFirst = replace;
      if (isFirst) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const query = buildQueryString({ cursor, limit: 50 });
        const data = await fetchApiData<AuditListResponse>(`/api/oracle/audit?${query}`, {
          headers,
        });
        setTotal(data.total);
        setNextCursor(data.nextCursor);
        setItems((prev) => (replace ? data.items : [...prev, ...data.items]));
      } catch (error: unknown) {
        setError(getErrorCode(error));
      } finally {
        if (isFirst) setLoading(false);
        else setLoadingMore(false);
      }
    };
  }, [headers, buildQueryString]);

  const applyFilters = async () => {
    setItems([]);
    setTotal(0);
    setNextCursor(0);
    setError(null);
    if (!adminToken.trim()) return;
    await load(0, true);
  };

  const handleFilterKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    void applyFilters();
  };

  const clearFilters = async () => {
    setFilters({ actor: '', action: '', entityType: '', entityId: '', q: '' });
    setItems([]);
    setTotal(0);
    setNextCursor(0);
    setError(null);
    if (!adminToken.trim()) return;
    await load(0, true);
  };

  const exportAll = async (format: 'json' | 'csv') => {
    if (!adminToken.trim()) return;
    setExporting(true);
    setError(null);
    try {
      const all: AuditLogEntry[] = [];
      let cursor = 0;
      let next: number | null = 0;
      const limit = 100;
      const maxItems = 5000;
      const seenCursors = new Set<number>();

      while (next !== null && all.length < maxItems) {
        if (seenCursors.has(cursor)) break;
        seenCursors.add(cursor);
        const query = buildQueryString({ cursor, limit });
        const data = await fetchApiData<AuditListResponse>(`/api/oracle/audit?${query}`, {
          headers,
        });
        all.push(...(data.items ?? []));
        next = data.nextCursor;
        if (next === null) break;
        if (!Number.isFinite(next) || next < 0) break;
        if (next === cursor) break;
        cursor = next;
        if (!data.items || data.items.length === 0) break;
      }

      const now = new Date();
      const stamp = now.toISOString().replace(/[:.]/g, '-');
      const truncated = all.length >= maxItems && next !== null;
      const baseName = `audit-export-${stamp}${truncated ? '-truncated' : ''}`;

      const download = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
      };

      if (format === 'json') {
        const payload = {
          exportedAt: now.toISOString(),
          truncated,
          filters: {
            actor: filters.actor.trim() || null,
            action: filters.action.trim() || null,
            entityType: filters.entityType.trim() || null,
            entityId: filters.entityId.trim() || null,
            q: filters.q.trim() || null,
          },
          items: all,
        };
        download(
          new Blob([JSON.stringify(payload, null, 2)], {
            type: 'application/json',
          }),
          `${baseName}.json`,
        );
        return;
      }

      const csvEscape = (value: unknown) => {
        const s = value === null || value === undefined ? '' : String(value);
        const escaped = s.replace(/"/g, '""');
        return `"${escaped}"`;
      };

      const header = ['id', 'createdAt', 'actor', 'action', 'entityType', 'entityId', 'details'];
      const rows = [header.map(csvEscape).join(',')];
      for (const e of all) {
        rows.push(
          [
            e.id,
            e.createdAt,
            e.actor ?? '',
            e.action,
            e.entityType ?? '',
            e.entityId ?? '',
            e.details ? JSON.stringify(e.details) : '',
          ]
            .map(csvEscape)
            .join(','),
        );
      }
      download(new Blob([rows.join('\n')], { type: 'text/csv' }), `${baseName}.csv`);
    } catch (error: unknown) {
      setError(getErrorCode(error));
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    setItems([]);
    setTotal(0);
    setNextCursor(0);
    setError(null);
    if (!adminToken.trim()) return;
    void load(0, true);
  }, [adminToken, load]);

  return (
    <Card className="overflow-hidden border-none bg-white/80 shadow-xl backdrop-blur-md">
      <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-900 p-6 text-white">
        <div className="mb-2 flex items-center gap-3">
          <div className="rounded-lg bg-white/15 p-2 backdrop-blur-sm">
            <ScrollText className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold">{t('audit.title')}</CardTitle>
            <CardDescription className="text-slate-200">{t('audit.description')}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-6">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {t('audit.adminToken')}
          </label>
          <input
            value={adminToken}
            onChange={(e) => setAdminToken(e.target.value)}
            placeholder={t('audit.adminTokenPlaceholder')}
            type="password"
            autoComplete="off"
            className="glass-input h-10 w-full rounded-xl px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
          />
          <div className="text-xs text-slate-500">{t('audit.adminTokenHint')}</div>
        </div>

        <div className="space-y-3 rounded-2xl border border-white/60 bg-white/60 p-4 shadow-sm backdrop-blur-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {t('audit.filters')}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">{t('audit.actor')}</label>
              <input
                value={filters.actor}
                onChange={(e) =>
                  setFilters((p) => ({
                    ...p,
                    actor: e.target.value.slice(0, 80),
                  }))
                }
                onKeyDown={handleFilterKeyDown}
                placeholder={t('audit.actorPlaceholder')}
                maxLength={80}
                className="glass-input h-10 w-full rounded-xl px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">{t('audit.action')}</label>
              <input
                value={filters.action}
                onChange={(e) =>
                  setFilters((p) => ({
                    ...p,
                    action: e.target.value.slice(0, 120),
                  }))
                }
                onKeyDown={handleFilterKeyDown}
                placeholder={t('audit.actionPlaceholder')}
                maxLength={120}
                className="glass-input h-10 w-full rounded-xl px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">
                {t('audit.entityType')}
              </label>
              <input
                value={filters.entityType}
                onChange={(e) =>
                  setFilters((p) => ({
                    ...p,
                    entityType: e.target.value.slice(0, 80),
                  }))
                }
                onKeyDown={handleFilterKeyDown}
                placeholder={t('audit.entityTypePlaceholder')}
                maxLength={80}
                className="glass-input h-10 w-full rounded-xl px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">{t('audit.entityId')}</label>
              <input
                value={filters.entityId}
                onChange={(e) =>
                  setFilters((p) => ({
                    ...p,
                    entityId: e.target.value.slice(0, 200),
                  }))
                }
                onKeyDown={handleFilterKeyDown}
                placeholder={t('audit.entityIdPlaceholder')}
                maxLength={200}
                className="glass-input h-10 w-full rounded-xl px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">{t('audit.query')}</label>
            <input
              value={filters.q}
              onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value.slice(0, 200) }))}
              onKeyDown={handleFilterKeyDown}
              placeholder={t('audit.queryPlaceholder')}
              maxLength={200}
              className="glass-input h-10 w-full rounded-xl px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={applyFilters}
              disabled={loading || !adminToken.trim()}
              className={cn(
                'rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all',
                loading || !adminToken.trim()
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-slate-900 text-white hover:bg-slate-800',
              )}
            >
              {t('audit.apply')}
            </button>
            <button
              type="button"
              onClick={clearFilters}
              disabled={loading || !adminToken.trim()}
              className={cn(
                'rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all',
                loading || !adminToken.trim()
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50',
              )}
            >
              {t('audit.clear')}
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => exportAll('json')}
              disabled={exporting || !adminToken.trim()}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all',
                exporting || !adminToken.trim()
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50',
              )}
            >
              <Download size={16} />
              {exporting ? t('audit.exporting') : t('audit.exportJson')}
            </button>
            <button
              type="button"
              onClick={() => exportAll('csv')}
              disabled={exporting || !adminToken.trim()}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all',
                exporting || !adminToken.trim()
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50',
              )}
            >
              <Download size={16} />
              {exporting ? t('audit.exporting') : t('audit.exportCsv')}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-700">
            {t('audit.total')}: <span className="font-mono">{total}</span>
          </div>
          <button
            type="button"
            onClick={() => load(0, true)}
            disabled={loading || !adminToken.trim()}
            className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all',
              loading || !adminToken.trim()
                ? 'bg-gray-100 text-gray-400'
                : 'bg-slate-900 text-white hover:bg-slate-800',
            )}
          >
            <RotateCw size={16} className={loading ? 'animate-spin' : ''} />
            {t('audit.refresh')}
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs text-rose-600">
            {getUiErrorMessage(error, t)}
          </div>
        )}

        {!error && !loading && items.length === 0 && adminToken.trim() && (
          <div className="text-sm text-slate-500">{t('audit.empty')}</div>
        )}

        <div className="space-y-3">
          {items.map((entry) => (
            <div
              key={entry.id}
              className="rounded-2xl border border-white/60 bg-white/60 p-4 shadow-sm backdrop-blur-sm"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {entry.action}
                    </span>
                    <span className="font-mono text-xs text-slate-400">#{entry.id}</span>
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-800">
                    {(entry.entityType || '—') + ':'}{' '}
                    <span className="break-all font-mono">{entry.entityId || '—'}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {t('audit.actor')}: <span className="font-mono">{entry.actor || '—'}</span>
                  </div>
                </div>
                <div className="font-mono text-xs text-slate-500">
                  {formatTime(entry.createdAt, locale)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {adminToken.trim() && (
          <div className="flex justify-center pt-2">
            {canLoadMore ? (
              <button
                type="button"
                onClick={() => load(nextCursor ?? 0, false)}
                disabled={loadingMore}
                className="group flex items-center gap-2 rounded-full bg-white px-8 py-3 text-sm font-bold text-slate-800 shadow-lg shadow-slate-500/10 ring-1 ring-slate-100 transition-all hover:scale-105 hover:bg-slate-50 hover:shadow-xl disabled:opacity-50 disabled:hover:scale-100"
              >
                <RotateCw size={18} className={loadingMore ? 'animate-spin' : 'opacity-60'} />
                <span>{loadingMore ? t('common.loading') : t('common.loadMore')}</span>
              </button>
            ) : (
              <div className="py-4 text-sm font-medium text-slate-400">{t('common.allLoaded')}</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
