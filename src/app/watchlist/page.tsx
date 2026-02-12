'use client';

import { useCallback, useEffect, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { FadeIn, StaggerContainer, StaggerItem } from '@/components/common/AnimatedContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { AssertionList } from '@/components/features/assertion/AssertionList';
import { EmptyWatchlistState } from '@/components/ui';
import { useInfiniteList, useWatchlist, type BaseResponse, useIsMobile } from '@/hooks';
import { usePageOptimizations } from '@/hooks/usePageOptimizations';
import { useI18n } from '@/i18n/LanguageProvider';
import { getUiErrorMessage } from '@/i18n/translations';
import type { Assertion } from '@/types/oracleTypes';
import { getOracleInstanceId, setOracleInstanceId, buildApiUrl } from '@/shared/utils';

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
  const [instanceId, setInstanceIdState] = useState<string>('default');

  useEffect(() => {
    getOracleInstanceId().then(id => {
      if (!instanceIdFromUrl) {
        setInstanceIdState(id);
      } else if (instanceIdFromUrl !== id) {
        setInstanceIdState(instanceIdFromUrl);
      }
    });
  }, [instanceIdFromUrl]);

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
    setOracleInstanceId(instanceId);
  }, [instanceId]);

  const getUrl = useCallback(
    (pageIndex: number, previousPageData: BaseResponse<Assertion> | null) => {
      if (!mounted || watchlist.length === 0) return null;
      if (previousPageData && previousPageData.nextCursor === null) return null;

      const url = buildApiUrl('/api/oracle/assertions', {
        instanceId: instanceId || undefined,
        ids: watchlist.join(','),
        limit: 30,
        cursor: pageIndex > 0 && previousPageData?.nextCursor ? String(previousPageData.nextCursor) : undefined,
      });

      return url;
    },
    [watchlist, mounted, instanceId],
  );

  const { items, loading, loadingMore, hasMore, loadMore, error, mutate } = useInfiniteList<Assertion>(
    getUrl,
    { revalidateOnFocus: true },
  );

  // 页面优化：键盘快捷键
  usePageOptimizations({
    pageName: '关注列表',
    onRefresh: async () => {
      await mutate();
    },
    enableSearch: false,
    showRefreshToast: true,
  });

  return (
    <main className="container mx-auto px-3 py-4 pb-20 sm:px-4 sm:py-8 sm:pb-24">
      <PageHeader
        title={t('nav.watchlist')}
        description={isMobile ? undefined : t('watchlist.description')}
      />

      {!mounted ? (
        <FadeIn>
          <div className="flex flex-col items-center justify-center py-12 sm:py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600 sm:h-8 sm:w-8"></div>
            <p className="mt-4 text-sm text-gray-500">Loading...</p>
          </div>
        </FadeIn>
      ) : watchlist.length === 0 ? (
        <FadeIn>
          <EmptyWatchlistState
            onBrowseAssets={() => {
              const href = instanceId
                ? `/oracle?instanceId=${encodeURIComponent(instanceId)}`
                : '/oracle';
              router.push(href as Route);
            }}
            className="mx-auto max-w-2xl"
          />
        </FadeIn>
      ) : (
        <StaggerContainer className="space-y-3 sm:space-y-4" staggerChildren={0.05}>
          <StaggerItem>
            {error ? (
              <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3 text-sm text-rose-700 shadow-sm sm:rounded-2xl sm:p-4">
                {getUiErrorMessage(error, t)}
              </div>
            ) : null}
          </StaggerItem>
          <StaggerItem>
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
          </StaggerItem>
        </StaggerContainer>
      )}
    </main>
  );
}
