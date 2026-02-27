'use client';

import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

import { StaggerContainer, StaggerItem, EmptyDataState } from '@/components/common';
import { RefreshIndicator } from '@/components/ui';
import { ErrorBanner } from '@/components/ui';
import { PriceCardSkeleton } from '@/components/ui';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useI18n } from '@/i18n';

import { SortSelector } from './SortSelector';
import { TrendingFeedCard } from './TrendingFeedCard';
import { useTrendingFeeds } from '../hooks/useTrendingFeeds';

import type { TrendingFeed, TrendingSortBy } from '../types';

interface TrendingFeedsProps {
  onFeedClick?: (feed: TrendingFeed) => void;
  initialSortBy?: TrendingSortBy;
}

export function TrendingFeeds({ onFeedClick, initialSortBy = 'volume' }: TrendingFeedsProps) {
  const { t } = useI18n();
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
            <TrendingUp className="h-4 w-4 text-primary md:h-5 md:w-5" />
            {t('explore.trending.title')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('explore.trending.description')}</p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {!isMobile && <SortSelector value={sortBy} onChange={setSortBy} />}
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
          title={t('explore.trending.loadError')}
          isRetrying={isRefreshing}
        />
      )}

      {isLoading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
          {Array.from({ length: isMobile ? 3 : 6 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <PriceCardSkeleton />
            </motion.div>
          ))}
        </div>
      )}

      {!isLoading && !isError && feeds.length === 0 && (
        <EmptyDataState
          icon={TrendingUp}
          title={t('explore.trending.empty.title')}
          description={t('explore.trending.empty.description')}
          onRefresh={refresh}
        />
      )}

      {!isLoading && !isError && feeds.length > 0 && (
        <StaggerContainer
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3"
          staggerChildren={0.05}
        >
          {feeds.map((feed) => (
            <StaggerItem key={feed.id}>
              <TrendingFeedCard feed={feed} onClick={onFeedClick} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </div>
  );
}
