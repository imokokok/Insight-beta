import type { ComponentPropsWithoutRef } from 'react';
import { memo, forwardRef, useCallback } from 'react';

import Link from 'next/link';

import { CheckCircle2, Clock, ArrowUpRight, RotateCw, FileQuestion, Star } from 'lucide-react';
import { Virtuoso, VirtuosoGrid } from 'react-virtuoso';

import { CopyButton } from '@/components/features/common/CopyButton';
import { SkeletonList } from '@/components/features/common/SkeletonList';
import { LivenessProgressBar } from '@/components/features/oracle/LivenessProgressBar';
import { useWatchlist } from '@/hooks/user/useWatchlist';
import { useI18n } from '@/i18n/LanguageProvider';
import { langToLocale } from '@/i18n/translations';
import type { Assertion, OracleStatus } from '@/lib/types/oracleTypes';
import {
  cn,
  formatTime,
  formatUsd,
  getExplorerUrl,
  truncateAddress,
  getAssertionStatusColor,
} from '@/lib/utils';

import type { Route } from 'next';

interface AssertionListProps {
  items: Assertion[];
  loading: boolean;
  viewMode: 'grid' | 'list';
  hasMore: boolean;
  loadMore: () => void;
  loadingMore: boolean;
  emptyStateMessage?: string;
  onCreateAssertion?: () => void;
  instanceId?: string | null;
}

// Grid Components for Virtuoso
const GridList = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(
  ({ style, children, ...props }, ref) => (
    <div
      ref={ref}
      {...props}
      style={style}
      className="grid grid-cols-1 gap-6 pb-4 md:grid-cols-2 xl:grid-cols-3"
    >
      {children}
    </div>
  ),
);
GridList.displayName = 'GridList';

const GridItem = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(
  ({ children, ...props }, ref) => (
    <div ref={ref} {...props} className="h-full">
      {children}
    </div>
  ),
);
GridItem.displayName = 'GridItem';

// List Components for Virtuoso
const ListContainer = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(
  ({ style, children, ...props }, ref) => (
    <div ref={ref} {...props} style={style} className="space-y-6 pb-4">
      {children}
    </div>
  ),
);
ListContainer.displayName = 'ListContainer';

export const AssertionList = memo(function AssertionList({
  items,
  loading,
  viewMode,
  hasMore,
  loadMore,
  loadingMore,
  emptyStateMessage,
  onCreateAssertion,
  instanceId,
}: AssertionListProps) {
  const { t, lang } = useI18n();
  const locale = langToLocale[lang];
  const { isWatched, toggleWatchlist } = useWatchlist();

  const handleToggleWatchlist = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      toggleWatchlist(id);
    },
    [toggleWatchlist],
  );

  if (loading && items.length === 0) {
    return <SkeletonList viewMode={viewMode} />;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-white/60 bg-white/50 py-20 text-center shadow-sm backdrop-blur-sm">
        <div className="mb-4 rounded-full bg-gray-100 p-6">
          <FileQuestion className="h-12 w-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">{t('common.noData')}</h3>
        <p className="mt-2 max-w-sm px-4 text-gray-500">
          {emptyStateMessage || t('oracle.leaderboard.noData')}
        </p>
        {onCreateAssertion && (
          <button
            onClick={onCreateAssertion}
            className="mt-6 rounded-lg bg-purple-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-purple-500/20 transition-all hover:-translate-y-0.5 hover:bg-purple-700 hover:shadow-purple-500/30 active:translate-y-0"
          >
            {t('oracle.newAssertion')}
          </button>
        )}
      </div>
    );
  }

  const statusLabel = (status: OracleStatus) => {
    if (status === 'Pending') return t('common.pending');
    if (status === 'Disputed') return t('common.disputed');
    return t('common.resolved');
  };

  const Footer = () => {
    if (loadingMore) {
      return (
        <div className="flex justify-center py-8">
          <div className="flex items-center gap-2 rounded-full bg-white px-8 py-3 text-sm font-bold text-purple-600 shadow-lg shadow-purple-500/10 ring-1 ring-purple-100">
            <RotateCw size={18} className="animate-spin" />
            <span>{t('common.loading')}</span>
          </div>
        </div>
      );
    }

    if (!hasMore && items.length > 0) {
      return (
        <div className="flex justify-center py-8">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-400">
            <CheckCircle2 size={16} />
            <span>{t('common.allLoaded')}</span>
          </div>
        </div>
      );
    }

    // If hasMore but not loadingMore, user scrolling triggers loadMore automatically via endReached.
    // However, we can also keep a manual button if we prefer, but Virtuoso is best with auto-load.
    // We'll return a spacer or the manual button if we want hybrid.
    // Usually infinite scroll hides the button.
    // Let's keep it simple: just a spacer to ensure bottom visibility.
    return <div className="h-8" />;
  };

  const renderCard = (item: Assertion) => {
    const href = instanceId
      ? `/oracle/${item.id}?instanceId=${encodeURIComponent(instanceId)}`
      : `/oracle/${item.id}`;
    return (
      <Link href={href as Route} className="block h-full">
        <div
          className={cn(
            'glass-card group relative rounded-2xl border border-white/60 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-purple-200/50 hover:shadow-xl hover:shadow-purple-500/10',
            viewMode === 'grid' ? 'h-full' : 'flex flex-col gap-6 md:flex-row md:items-center',
          )}
        >
          {/* Header: Icon, ID, Protocol */}
          <div
            className={cn(
              'flex items-start justify-between',
              viewMode === 'list' && 'shrink-0 md:w-1/4',
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold shadow-sm ring-1 ring-black/5 transition-transform duration-300 group-hover:scale-110',
                  item.chain === 'Polygon' &&
                    'bg-gradient-to-br from-violet-50 to-violet-100 text-violet-600',
                  item.chain === 'Arbitrum' &&
                    'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600',
                  item.chain === 'Optimism' &&
                    'bg-gradient-to-br from-red-50 to-red-100 text-red-600',
                  item.chain === 'Local' &&
                    'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-600',
                )}
              >
                {item.chain[0]}
              </div>
              <div>
                <div className="mb-0.5 text-xs font-medium text-gray-400">{item.protocol}</div>
                <div className="font-mono text-sm font-bold tracking-tight text-gray-900">
                  {item.id}
                </div>
              </div>
              <CopyButton text={item.id} className="ml-1 h-6 w-6" iconSize={12} />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={(e) => handleToggleWatchlist(e, item.id)}
                className={cn(
                  'rounded-lg p-1.5 transition-all duration-200',
                  isWatched(item.id)
                    ? 'text-yellow-400 hover:bg-yellow-50 hover:text-yellow-500'
                    : 'text-gray-300 hover:bg-gray-50 hover:text-yellow-400',
                )}
                title={
                  isWatched(item.id) ? t('common.removeFromWatchlist') : t('common.addToWatchlist')
                }
              >
                <Star
                  size={18}
                  fill={isWatched(item.id) ? 'currentColor' : 'none'}
                  strokeWidth={isWatched(item.id) ? 0 : 2}
                />
              </button>

              {/* Status badge for Grid view */}
              {viewMode === 'grid' && (
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-semibold',
                    getAssertionStatusColor(item.status),
                  )}
                >
                  {statusLabel(item.status)}
                </span>
              )}
            </div>
          </div>

          {/* Question */}
          <div className={cn(viewMode === 'grid' ? 'mb-6 mt-4' : 'min-w-0 flex-1')}>
            {viewMode === 'grid' && (
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                {t('oracle.card.marketQuestion')}
              </h4>
            )}
            <p
              className={cn(
                'font-medium leading-relaxed text-gray-800 transition-colors group-hover:text-purple-900',
                viewMode === 'grid'
                  ? 'line-clamp-3 text-base'
                  : 'line-clamp-2 text-sm md:text-base',
              )}
            >
              {item.market}
            </p>
            {viewMode === 'list' && (
              <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Clock size={14} />
                  {formatTime(item.assertedAt, locale)}
                </span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 font-medium',
                    getAssertionStatusColor(item.status),
                  )}
                >
                  {statusLabel(item.status)}
                </span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div
            className={cn(
              viewMode === 'grid'
                ? 'mb-5 grid grid-cols-2 gap-3'
                : 'mt-4 flex shrink-0 items-center gap-6 md:mt-0 md:w-auto',
            )}
          >
            <div
              className={cn(viewMode === 'grid' ? 'rounded-xl bg-gray-50/50 p-3' : 'text-right')}
            >
              <div className="mb-1 text-xs text-gray-500">{t('oracle.card.asserter')}</div>
              <div className="font-mono text-xs font-medium text-gray-700">
                {(() => {
                  const explorerUrl = getExplorerUrl(item.chain, item.asserter, 'address');
                  if (!explorerUrl) {
                    return truncateAddress(item.asserter);
                  }
                  return (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(explorerUrl, '_blank', 'noopener,noreferrer');
                      }}
                      className="transition-colors hover:text-purple-600 hover:underline"
                    >
                      {truncateAddress(item.asserter)}
                    </button>
                  );
                })()}
              </div>
            </div>
            <div
              className={cn(viewMode === 'grid' ? 'rounded-xl bg-gray-50/50 p-3' : 'text-right')}
            >
              <div className="mb-1 text-xs text-gray-500">{t('oracle.card.bond')}</div>
              <div className="font-medium text-gray-900">{formatUsd(item.bondUsd, locale)}</div>
            </div>
          </div>

          {/* Liveness Progress (Pending only) */}
          {item.status === 'Pending' && (
            <div
              className={cn(
                viewMode === 'grid' ? 'mb-5' : 'mt-4 hidden shrink-0 md:mt-0 md:block md:w-40',
              )}
            >
              <LivenessProgressBar
                startDate={item.assertedAt}
                endDate={item.livenessEndsAt}
                status={item.status}
                label={t('tooltips.liveness')}
                className="w-full"
              />
            </div>
          )}

          {/* Footer for Grid View */}
          {viewMode === 'grid' && (
            <div className="flex items-center justify-between border-t border-gray-100 pt-4">
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                <Clock size={14} />
                <span>{formatTime(item.assertedAt, locale)}</span>
              </div>
              <span className="flex translate-x-0 transform items-center gap-1 text-xs font-bold text-purple-600 opacity-100 transition-all md:translate-x-[-10px] md:opacity-0 md:group-hover:translate-x-0 md:group-hover:opacity-100">
                {t('common.viewDetails')}
                <ArrowUpRight size={12} />
              </span>
            </div>
          )}

          {/* View Details arrow for List View */}
          {viewMode === 'list' && (
            <div className="flex w-full translate-x-0 transform items-center justify-end border-t border-gray-100 pl-0 pt-4 text-purple-600 opacity-100 transition-all md:w-auto md:translate-x-[-10px] md:justify-start md:border-l md:border-t-0 md:pl-4 md:pt-0 md:opacity-0 md:group-hover:translate-x-0 md:group-hover:opacity-100">
              <span className="mr-2 text-xs font-bold md:hidden">{t('common.viewDetails')}</span>
              <ArrowUpRight size={20} />
            </div>
          )}
        </div>
      </Link>
    );
  };

  if (viewMode === 'grid') {
    return (
      <VirtuosoGrid
        useWindowScroll
        data={items}
        endReached={loadMore}
        overscan={200}
        components={{
          List: GridList,
          Item: GridItem,
          Footer: Footer,
        }}
        itemContent={(_index, item) => renderCard(item)}
      />
    );
  }

  return (
    <Virtuoso
      useWindowScroll
      data={items}
      endReached={loadMore}
      overscan={200}
      components={{
        List: ListContainer,
        Footer: Footer,
      }}
      itemContent={(_index, item) => <div className="mb-6">{renderCard(item)}</div>}
    />
  );
});
