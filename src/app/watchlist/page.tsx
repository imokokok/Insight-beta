'use client';

import { useCallback, useEffect, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { EmptyWatchlistState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { AssertionList } from '@/components/features/assertion/AssertionList';
import { useInfiniteList, useWatchlist, type BaseResponse, useIsMobile } from '@/hooks';
import { useI18n } from '@/i18n/LanguageProvider';
import { getUiErrorMessage } from '@/i18n/translations';
import type { Assertion } from '@/lib/types/oracleTypes';

import type { Route } from 'next';

export default function WatchlistPage() {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const { watchlist, mounted } = useWatchlist();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams?.toString() ?? '';
  const instanceIdFromUrl = searchParams?.get('instanceId')?.trim() || '';
  const [instanceId, setInstanceId] = useState<string>(() => {
    try {
      if (typeof window === 'undefined') return 'default';
      const saved = window.localStorage.getItem('oracleFilters');
      if (!saved) return 'default';
      const parsed = JSON.parse(saved) as { instanceId?: unknown } | null;
      const value = parsed && typeof parsed === 'object' ? parsed.instanceId : null;
      if (typeof value === 'string' && value.trim()) return value.trim();
    } catch {
      return 'default';
    }
    return 'default';
  });

  useEffect(() => {
    if (!instanceIdFromUrl) return;
    if (instanceIdFromUrl === instanceId) return;
    setInstanceId(instanceIdFromUrl);
  }, [instanceIdFromUrl, instanceId]);

  useEffect(() => {
    const normalized = instanceId.trim();
    const params = new URLSearchParams(currentSearch);
    if (normalized) params.set('instanceId', normalized);
    else params.delete('instanceId');
    const nextSearch = params.toString();
    const nextUrl = nextSearch ? `${pathname}?${nextSearch}` : pathname;
    const currentUrl = currentSearch ? `${pathname}?${currentSearch}` : pathname;
    if (nextUrl !== currentUrl) router.replace(nextUrl as Route, { scroll: false });
  }, [instanceId, pathname, router, currentSearch]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('oracleFilters');
      const parsed = raw && raw.trim() ? (JSON.parse(raw) as Record<string, unknown> | null) : null;
      const next = {
        ...(parsed && typeof parsed === 'object' ? parsed : {}),
        instanceId,
      };
      window.localStorage.setItem('oracleFilters', JSON.stringify(next));
    } catch {
      void 0;
    }
  }, [instanceId]);

  const getUrl = useCallback(
    (pageIndex: number, previousPageData: BaseResponse<Assertion> | null) => {
      if (!mounted || watchlist.length === 0) return null;
      if (previousPageData && previousPageData.nextCursor === null) return null;

      const params = new URLSearchParams();
      if (instanceId) params.set('instanceId', instanceId);
      params.set('ids', watchlist.join(','));
      params.set('limit', '30');

      if (pageIndex > 0 && previousPageData?.nextCursor) {
        params.set('cursor', String(previousPageData.nextCursor));
      }

      return `/api/oracle/assertions?${params.toString()}`;
    },
    [watchlist, mounted, instanceId],
  );

  const { items, loading, loadingMore, hasMore, loadMore, error } = useInfiniteList<Assertion>(
    getUrl,
    { revalidateOnFocus: true },
  );

  return (
    <main className="container mx-auto px-3 py-4 pb-20 sm:px-4 sm:py-8 sm:pb-24">
      <PageHeader
        title={t('nav.watchlist')}
        description={isMobile ? undefined : t('watchlist.description')}
      />

      {!mounted ? (
        <div className="flex flex-col items-center justify-center py-12 sm:py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600 sm:h-8 sm:w-8"></div>
        </div>
      ) : watchlist.length === 0 ? (
        <EmptyWatchlistState
          onBrowseAssets={() => {
            const href = instanceId
              ? `/oracle?instanceId=${encodeURIComponent(instanceId)}`
              : '/oracle';
            router.push(href as Route);
          }}
          className="mx-auto max-w-2xl"
        />
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {error ? (
            <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3 text-sm text-rose-700 shadow-sm sm:rounded-2xl sm:p-4">
              {getUiErrorMessage(error, t)}
            </div>
          ) : null}
          <AssertionList
            items={items}
            loading={loading}
            hasMore={hasMore}
            loadMore={loadMore}
            loadingMore={loadingMore}
            emptyStateMessage={t('common.noData')}
            viewMode={isMobile ? 'list' : 'grid'}
            instanceId={instanceId}
          />
        </div>
      )}
    </main>
  );
}
