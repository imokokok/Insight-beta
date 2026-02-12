'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  ExternalLink,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Clock,
  ShieldAlert,
  Gavel,
  Search,
  RefreshCw,
} from 'lucide-react';



import { EmptyEventsState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ErrorBanner as ErrorBannerUI } from '@/components/ui/error-banner';
import { RefreshIndicator } from '@/components/ui/refresh-indicator';
import { getRefreshStrategy } from '@/config/refresh-strategy';
import { useIsMobile } from '@/hooks';
import { usePageOptimizations } from '@/hooks/usePageOptimizations';
import { useI18n } from '@/i18n/LanguageProvider';
import { getUiErrorMessage, langToLocale, type TranslationKey } from '@/i18n/translations';
import type { Dispute, DisputeStatus, OracleChain } from '@/lib/types/oracleTypes';
import { calculatePercentage, cn, fetchApiData, formatTime, truncateAddress, getOracleInstanceId, setOracleInstanceId, buildApiUrl } from '@/lib/utils';

import type { Route } from 'next';

type Translate = (key: TranslationKey) => string;

type StatusTabsProps = {
  filterStatus: DisputeStatus | 'All';
  setFilterStatus: (status: DisputeStatus | 'All') => void;
  t: Translate;
};

function StatusTabs({ filterStatus, setFilterStatus, t }: StatusTabsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
      {(['All', 'Voting', 'Pending Execution', 'Executed'] as const).map((status) => (
        <button
          key={status}
          onClick={() => setFilterStatus(status as DisputeStatus | 'All')}
          className={cn(
            'whitespace-nowrap rounded-lg px-4 py-1.5 text-sm font-medium transition-colors',
            filterStatus === status
              ? 'bg-purple-100 text-purple-900 ring-1 ring-purple-200'
              : 'text-purple-600/70 hover:bg-white/50 hover:text-purple-900',
          )}
        >
          {status === 'All' ? t('common.all') : statusLabel(status, t)}
        </button>
      ))}
    </div>
  );
}

type FiltersBarProps = {
  filterStatus: DisputeStatus | 'All';
  setFilterStatus: (status: DisputeStatus | 'All') => void;
  filterChain: OracleChain | 'All';
  setFilterChain: (chain: OracleChain | 'All') => void;
  query: string;
  setQuery: (value: string) => void;
  t: Translate;
};

function FiltersBar({
  filterStatus,
  setFilterStatus,
  filterChain,
  setFilterChain,
  query,
  setQuery,
  t,
  isMobile,
}: FiltersBarProps & { isMobile: boolean }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <StatusTabs filterStatus={filterStatus} setFilterStatus={setFilterStatus} t={t} />

      <div className={`flex items-center gap-2 ${isMobile ? 'flex-wrap' : ''}`}>
        <select
          value={filterChain}
          onChange={(e) => setFilterChain(e.target.value as OracleChain | 'All')}
          className="h-9 rounded-lg border-none bg-white/50 px-3 text-sm text-purple-900 shadow-sm focus:ring-2 focus:ring-purple-500/20"
        >
          <option value="All">{t('common.all')}</option>
          <option value="Local">{t('chain.local')}</option>
          <option value="Polygon">{t('chain.polygon')}</option>
          <option value="PolygonAmoy">{t('chain.polygon')} (Amoy)</option>
          <option value="Arbitrum">{t('chain.arbitrum')}</option>
          <option value="Optimism">{t('chain.optimism')}</option>
        </select>

        <div className="relative flex-1 sm:flex-none">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isMobile ? '搜索...' : t('oracle.searchPlaceholder')}
            className="h-9 w-full rounded-lg border-none bg-white/50 pl-9 pr-4 text-sm text-purple-900 shadow-sm placeholder:text-purple-300 focus:ring-2 focus:ring-purple-500/20 sm:w-48 md:w-64"
          />
        </div>
      </div>
    </div>
  );
}

type LoadingBannerProps = {
  t: Translate;
};

function LoadingBanner({ t }: LoadingBannerProps) {
  return (
    <div className="rounded-2xl border border-purple-100 bg-white/50 p-6 text-sm text-purple-700/70 shadow-sm">
      {t('common.loading')}
    </div>
  );
}

type LoadMoreButtonProps = {
  loadingMore: boolean;
  onLoadMore: () => void;
  t: Translate;
};

function LoadMoreButton({ loadingMore, onLoadMore, t }: LoadMoreButtonProps) {
  return (
    <div className="flex justify-center pt-2">
      <button
        type="button"
        onClick={onLoadMore}
        disabled={loadingMore}
        className={cn(
          'rounded-lg px-4 py-2 text-sm font-medium shadow-sm ring-1 ring-purple-100 transition-colors',
          loadingMore
            ? 'bg-white/50 text-purple-400'
            : 'bg-white text-purple-600 hover:bg-purple-50 hover:text-purple-700',
        )}
      >
        {loadingMore ? t('common.loading') : t('common.loadMore')}
      </button>
    </div>
  );
}

function statusLabel(status: DisputeStatus, t: Translate) {
  if (status === 'Voting') return t('status.voting');
  if (status === 'Pending Execution') return t('status.pendingExecution');
  return t('status.executed');
}

function umaAssertionUrl(dispute: Dispute) {
  const id =
    dispute.assertionId || (dispute.id.startsWith('D:') ? dispute.id.slice(2) : dispute.id);
  if (!id || !id.startsWith('0x')) return 'https://oracle.uma.xyz/';
  return `https://oracle.uma.xyz/#/assertion/${id}`;
}

type DisputeHeaderProps = {
  dispute: Dispute;
  t: Translate;
};

function DisputeHeader({ dispute, t, isMobile }: DisputeHeaderProps & { isMobile: boolean }) {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className="flex gap-3 sm:gap-4">
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 shadow-sm sm:h-10 sm:w-10">
          <ShieldAlert size={isMobile ? 16 : 20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <h3 className="truncate text-sm font-semibold text-purple-950 sm:text-lg">
              {dispute.id}
            </h3>
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 text-[10px] font-medium sm:px-2.5 sm:text-xs',
                dispute.status === 'Voting'
                  ? 'border-amber-200 bg-amber-100 text-amber-700'
                  : dispute.status === 'Pending Execution'
                    ? 'border-purple-200 bg-purple-100 text-purple-700'
                    : 'border-gray-200 bg-gray-100 text-gray-700',
              )}
            >
              {statusLabel(dispute.status, t)}
            </span>
            <span className="rounded-md border border-gray-100 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 sm:px-2 sm:text-xs">
              {dispute.chain}
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-purple-900 sm:text-base">{dispute.market}</p>
        </div>
      </div>

      <a
        href={umaAssertionUrl(dispute)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-medium text-purple-600 shadow-sm ring-1 ring-purple-100 transition-colors hover:bg-purple-50 hover:text-purple-700 sm:w-fit"
      >
        {t('disputes.viewOnUma')}
        <ExternalLink size={14} />
      </a>
    </div>
  );
}

type DisputeReasonProps = {
  dispute: Dispute;
  t: Translate;
  locale: string;
};

function DisputeReason({ dispute, t, locale }: DisputeReasonProps) {
  return (
    <div className="space-y-4 rounded-xl border border-purple-100/50 bg-purple-50/30 p-4">
      <div>
        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-purple-900/80">
          <MessageSquare size={16} className="text-purple-400" />
          {t('disputes.reason')}
        </h4>
        <p className="text-sm leading-relaxed text-purple-800/80">{dispute.disputeReason}</p>
      </div>

      <div className="flex items-center justify-between border-t border-purple-100/50 pt-3 text-sm">
        <div className="flex flex-col">
          <span className="text-xs text-purple-400">{t('disputes.disputer')}</span>
          <span className="font-mono text-purple-600">{truncateAddress(dispute.disputer)}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-purple-400">{t('disputes.disputedAt')}</span>
          <span className="text-purple-700">{formatTime(dispute.disputedAt, locale)}</span>
        </div>
      </div>
    </div>
  );
}

type VotingProgressProps = {
  dispute: Dispute;
  voteTrackingEnabled: boolean;
  t: Translate;
  locale: string;
};

function VotingProgress({ dispute, voteTrackingEnabled, t, locale }: VotingProgressProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-purple-900/80">
          <Gavel size={16} className="text-purple-400" />
          {t('disputes.votingProgress')}
        </h4>
        <div className="flex items-center gap-1.5 rounded-md bg-purple-50 px-2 py-1 text-xs text-purple-500">
          <Clock size={12} />
          {t('disputes.endsAt')}: {formatTime(dispute.votingEndsAt, locale)}
        </div>
      </div>

      {voteTrackingEnabled ? (
        <>
          <div className="space-y-3">
            <div>
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="flex items-center gap-1 font-medium text-emerald-700">
                  <ThumbsUp size={12} /> {t('disputes.support')}
                </span>
                <span className="font-bold text-emerald-700">
                  {calculatePercentage(dispute.currentVotesFor, dispute.totalVotes)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{
                    width: `${calculatePercentage(dispute.currentVotesFor, dispute.totalVotes)}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="flex items-center gap-1 font-medium text-rose-700">
                  <ThumbsDown size={12} /> {t('disputes.reject')}
                </span>
                <span className="font-bold text-rose-700">
                  {calculatePercentage(dispute.currentVotesAgainst, dispute.totalVotes)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-rose-100">
                <div
                  className="h-full rounded-full bg-rose-500 transition-all duration-500"
                  style={{
                    width: `${calculatePercentage(dispute.currentVotesAgainst, dispute.totalVotes)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="pt-2 text-center text-xs text-purple-400">
            {t('disputes.totalVotesCast')}:{' '}
            {new Intl.NumberFormat(locale).format(
              dispute.currentVotesFor + dispute.currentVotesAgainst,
            )}
          </div>
        </>
      ) : (
        <div className="pt-2 text-center text-xs text-purple-400">
          {t('disputes.totalVotesCast')}: —
        </div>
      )}
    </div>
  );
}

type DisputeCardProps = {
  dispute: Dispute;
  voteTrackingEnabled: boolean;
  t: Translate;
  locale: string;
};

function DisputeCard({
  dispute,
  voteTrackingEnabled,
  t,
  locale,
  isMobile,
}: DisputeCardProps & { isMobile: boolean }) {
  return (
    <Card className="border-purple-100/60 bg-white/60 shadow-sm transition-all hover:shadow-md">
      <CardHeader className="pb-3 sm:pb-4">
        <DisputeHeader dispute={dispute} t={t} isMobile={isMobile} />
      </CardHeader>

      <CardContent>
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
          <DisputeReason dispute={dispute} t={t} locale={locale} />
          <VotingProgress
            dispute={dispute}
            voteTrackingEnabled={voteTrackingEnabled}
            t={t}
            locale={locale}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DisputesPage() {
  const { t, lang } = useI18n();
  const locale = langToLocale[lang];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams?.toString() ?? '';
  const instanceIdFromUrl = searchParams?.get('instanceId')?.trim() || '';
  const isMobile = useIsMobile();
  const [items, setItems] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [voteTrackingEnabled, setVoteTrackingEnabled] = useState(true);
  const [filterStatus, setFilterStatus] = useState<DisputeStatus | 'All'>('All');
  const [filterChain, setFilterChain] = useState<OracleChain | 'All'>('All');
  const [query, setQuery] = useState('');
  const [instanceId, setInstanceIdState] = useState<string>('default');

  useEffect(() => {
    getOracleInstanceId().then(id => setInstanceIdState(id));
  }, []);

  // 获取刷新策略配置
  const disputesStrategy = getRefreshStrategy('disputes-list');

  // 计算最后更新时间
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  useEffect(() => {
    if (!loading) {
      setLastUpdated(new Date());
    }
  }, [loading]);

  // 刷新函数
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = buildApiUrl('/api/oracle/disputes', {
        instanceId: instanceId || undefined,
        status: filterStatus !== 'All' ? filterStatus : undefined,
        chain: filterChain !== 'All' ? filterChain : undefined,
        q: query.trim() || undefined,
        limit: 30,
      });
      const data = await fetchApiData<{
        items: Dispute[];
        total: number;
        nextCursor: number | null;
        voteTrackingEnabled?: boolean;
      }>(url);
      setItems(data.items ?? []);
      setNextCursor(data.nextCursor ?? null);
      setVoteTrackingEnabled(data.voteTrackingEnabled ?? true);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'unknown_error');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterChain, query, instanceId]);

  useEffect(() => {
    if (!instanceIdFromUrl) return;
    if (instanceIdFromUrl === instanceId) return;
    setInstanceIdState(instanceIdFromUrl);
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
    setOracleInstanceId(instanceId);
  }, [instanceId]);

  // 页面优化：键盘快捷键
  usePageOptimizations({
    pageName: '争议列表',
    onRefresh: async () => {
      await refresh();
    },
    enableSearch: true,
    searchSelector: 'input[type="text"][placeholder*="搜索"]',
    showRefreshToast: true,
  });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = buildApiUrl('/api/oracle/disputes', {
          instanceId: instanceId || undefined,
          status: filterStatus !== 'All' ? filterStatus : undefined,
          chain: filterChain !== 'All' ? filterChain : undefined,
          q: query.trim() || undefined,
          limit: 30,
        });
        const data = await fetchApiData<{
          items: Dispute[];
          total: number;
          nextCursor: number | null;
          voteTrackingEnabled?: boolean;
        }>(url, {
          signal: controller.signal,
        });
        if (cancelled) return;
        setItems(data.items ?? []);
        setNextCursor(data.nextCursor ?? null);
        setVoteTrackingEnabled(data.voteTrackingEnabled ?? true);
      } catch (error: unknown) {
        if (!cancelled) setError(error instanceof Error ? error.message : 'unknown_error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const timeout = window.setTimeout(load, 250);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [filterStatus, filterChain, query, instanceId]);

  const loadMore = async () => {
    if (nextCursor === null) return;
    setLoadingMore(true);
    setError(null);
    try {
      const url = buildApiUrl('/api/oracle/disputes', {
        instanceId: instanceId || undefined,
        status: filterStatus !== 'All' ? filterStatus : undefined,
        chain: filterChain !== 'All' ? filterChain : undefined,
        q: query.trim() || undefined,
        limit: 30,
        cursor: String(nextCursor),
      });
      const data = await fetchApiData<{
        items: Dispute[];
        total: number;
        nextCursor: number | null;
        voteTrackingEnabled?: boolean;
      }>(url);
      setItems((prev) => prev.concat(data.items ?? []));
      setNextCursor(data.nextCursor ?? null);
      setVoteTrackingEnabled(data.voteTrackingEnabled ?? voteTrackingEnabled);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'unknown_error');
    } finally {
      setLoadingMore(false);
    }
  };

  const hasItems = useMemo(() => items.length > 0, [items.length]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title={t('disputes.title')}
        description={isMobile ? undefined : t('disputes.description')}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          {/* 刷新状态指示器 */}
          <RefreshIndicator
            lastUpdated={lastUpdated}
            isRefreshing={loading}
            strategy={disputesStrategy}
            onRefresh={refresh}
          />
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl bg-white/60 px-3 py-2 text-sm font-semibold text-purple-800 shadow-sm ring-1 ring-purple-100 hover:bg-white disabled:opacity-50 sm:gap-2 sm:px-4"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{t('common.refresh')}</span>
          </button>
          <div className="hidden items-center gap-2 rounded-lg border border-purple-100 bg-purple-50 px-3 py-1.5 text-sm text-purple-700/60 sm:flex">
            <Gavel size={16} />
            <span>{t('disputes.umaDvmActive')}</span>
          </div>
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:gap-6">
        {/* 错误提示 - 使用统一的 ErrorBanner */}
        {error && (
          <ErrorBannerUI
            error={new Error(getUiErrorMessage(error, t))}
            onRetry={refresh}
            title={t('disputes.title')}
            isRetrying={loading}
          />
        )}

        <FiltersBar
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterChain={filterChain}
          setFilterChain={setFilterChain}
          query={query}
          setQuery={setQuery}
          t={t}
          isMobile={isMobile}
        />

        {loading && <LoadingBanner t={t} />}

        {!loading &&
          items.map((dispute) => (
            <DisputeCard
              key={dispute.id}
              dispute={dispute}
              voteTrackingEnabled={voteTrackingEnabled}
              t={t}
              locale={locale}
              isMobile={isMobile}
            />
          ))}

        {!loading && !hasItems && (
          <EmptyEventsState
            onViewHistory={() => {
              // Could navigate to history page if exists
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {!loading && nextCursor !== null && (
          <LoadMoreButton loadingMore={loadingMore} onLoadMore={loadMore} t={t} />
        )}
      </div>
    </div>
  );
}
