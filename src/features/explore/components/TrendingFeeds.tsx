'use client';

import { motion } from 'framer-motion';
import { TrendingUp, RefreshCw } from 'lucide-react';

import { StaggerContainer, StaggerItem } from '@/components/common/AnimatedContainer';
import { RefreshIndicator } from '@/components/ui';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/useMediaQuery';

import { SortSelector } from './SortSelector';
import { TrendingFeedCard } from './TrendingFeedCard';
import { useTrendingFeeds } from '../hooks/useTrendingFeeds';

import type { TrendingFeed, TrendingSortBy } from '../types';


interface TrendingFeedsProps {
  onFeedClick?: (feed: TrendingFeed) => void;
  onFavorite?: (feedId: string) => void;
  initialSortBy?: TrendingSortBy;
}

export function TrendingFeeds({
  onFeedClick,
  onFavorite,
  initialSortBy = 'volume',
}: TrendingFeedsProps) {
  const isMobile = useIsMobile();
  const {
    feeds,
    sortBy,
    setSortBy,
    isLoading,
    isRefreshing,
    isError,
    error,
    lastUpdated,
    refresh,
  } = useTrendingFeeds({ initialSortBy });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold sm:text-xl md:text-2xl">
            <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            热门交易对
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            发现最受欢迎和活跃的价格数据源
          </p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {!isMobile && (
            <SortSelector value={sortBy} onChange={setSortBy} />
          )}
          <RefreshIndicator
            lastUpdated={lastUpdated}
            isRefreshing={isRefreshing}
            onRefresh={refresh}
          />
        </div>
      </div>

      {isError && error && (
        <ErrorBanner
          error={error}
          onRetry={refresh}
          title="加载热门交易对失败"
          isRetrying={isRefreshing}
        />
      )}

      {isLoading && (
        <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: isMobile ? 3 : 6 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="rounded-2xl border border-border/50 bg-card p-4 md:p-6 backdrop-blur-xl">
                <div className="space-y-3 md:space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-10 w-10 rounded-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-28" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                    <Skeleton className="h-8 w-full sm:h-4" />
                    <Skeleton className="h-8 w-full sm:h-4" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!isLoading && !isError && feeds.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <TrendingUp className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium text-foreground">暂无热门交易对</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            当前没有可用的热门交易对数据
          </p>
          <button
            onClick={refresh}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 min-h-[44px] text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            刷新
          </button>
        </div>
      )}

      {!isLoading && !isError && feeds.length > 0 && (
        <StaggerContainer className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" staggerChildren={0.05}>
          {feeds.map((feed) => (
            <StaggerItem key={feed.id}>
              <TrendingFeedCard
                feed={feed}
                onClick={onFeedClick}
                onFavorite={onFavorite}
              />
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </div>
  );
}
