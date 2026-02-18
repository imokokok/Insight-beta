'use client';

import { motion } from 'framer-motion';
import { Star, Activity, Database, TrendingUp, TrendingDown } from 'lucide-react';

import { CardEnhanced } from '@/components/ui/card';
import { useFavoritesContext } from '@/contexts/FavoritesContext';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { cn, formatNumber } from '@/shared/utils';

import type { TrendingFeed } from '../types';

interface TrendingFeedCardProps {
  feed: TrendingFeed;
  onClick?: (feed: TrendingFeed) => void;
}

const healthStatusConfig = {
  healthy: {
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    label: '健康',
  },
  warning: {
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    label: '警告',
  },
  critical: {
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    label: '严重',
  },
};

export function TrendingFeedCard({ feed, onClick }: TrendingFeedCardProps) {
  const { isFavorite, addFavorite, removeFavorite } = useFavoritesContext();
  const isMobile = useIsMobile();

  const isFav = isFavorite(feed.id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFav) {
      removeFavorite(feed.id);
    } else {
      addFavorite({
        id: feed.id,
        type: 'symbol',
        name: feed.symbol,
      });
    }
  };

  const handleCardClick = () => {
    onClick?.(feed);
  };

  const healthConfig = healthStatusConfig[feed.healthStatus];
  const isPositiveChange = feed.change24h >= 0;

  return (
    <CardEnhanced className="cursor-pointer" onClick={handleCardClick} hover clickable gradient>
      <div className="space-y-3 md:space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-bold text-foreground md:text-lg">
                {feed.symbol}
              </h3>
              <span
                className={cn(
                  'flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                  healthConfig.bgColor,
                  healthConfig.color,
                )}
              >
                {healthConfig.label}
              </span>
            </div>
            <p className="truncate text-sm text-muted-foreground">{feed.name}</p>
          </div>
          <motion.button
            onClick={handleFavoriteClick}
            className={cn(
              'flex-shrink-0 rounded-full transition-colors',
              isMobile ? 'min-h-[44px] min-w-[44px] p-3' : 'p-2',
              isFav ? 'text-amber-500' : 'text-muted-foreground hover:text-amber-400',
            )}
            whileHover={!isMobile ? { scale: 1.1 } : undefined}
            whileTap={{ scale: 0.95 }}
            aria-label={isFav ? '取消收藏' : '添加收藏'}
          >
            <Star className={cn('h-5 w-5', isFav && 'fill-current')} />
          </motion.button>
        </div>

        <div className="space-y-1 md:space-y-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-xl font-bold text-foreground md:text-2xl">
              ${formatNumber(feed.price, 2)}
            </span>
            <span
              className={cn(
                'flex items-center gap-1 text-sm font-medium',
                isPositiveChange ? 'text-emerald-500' : 'text-rose-500',
              )}
            >
              {isPositiveChange ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {isPositiveChange ? '+' : ''}
              {formatNumber(feed.change24h, 2)}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 md:gap-3">
          <div className="flex min-h-[44px] items-center gap-2 text-muted-foreground sm:min-h-0">
            <Activity className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">交易量: ${formatNumber(feed.volume24h, 0)}</span>
          </div>
          <div className="flex min-h-[44px] items-center gap-2 text-muted-foreground sm:min-h-0">
            <Database className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">数据源: {feed.sources.length}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
          <span className="truncate">更新于 {new Date(feed.lastUpdated).toLocaleTimeString()}</span>
          <span className="flex flex-shrink-0 items-center gap-1">
            <Star className="h-3 w-3" />
            {feed.favoriteCount}
          </span>
        </div>
      </div>
    </CardEnhanced>
  );
}
