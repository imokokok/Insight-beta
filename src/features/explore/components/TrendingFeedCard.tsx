'use client';

import { useState } from 'react';

import { motion } from 'framer-motion';
import { Heart, Activity, Database, TrendingUp, TrendingDown } from 'lucide-react';

import { CardEnhanced } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { cn, formatNumber } from '@/shared/utils';

import type { TrendingFeed } from '../types';

interface TrendingFeedCardProps {
  feed: TrendingFeed;
  onFavorite?: (feedId: string) => void;
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

export function TrendingFeedCard({ feed, onFavorite, onClick }: TrendingFeedCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const isMobile = useIsMobile();

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
    onFavorite?.(feed.id);
  };

  const handleCardClick = () => {
    onClick?.(feed);
  };

  const healthConfig = healthStatusConfig[feed.healthStatus];
  const isPositiveChange = feed.change24h >= 0;

  return (
    <CardEnhanced
      className="cursor-pointer"
      onClick={handleCardClick}
      hover
      clickable
      gradient
    >
      <div className="space-y-3 md:space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base md:text-lg font-bold text-foreground truncate">{feed.symbol}</h3>
              <span className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0',
                healthConfig.bgColor,
                healthConfig.color
              )}>
                {healthConfig.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground truncate">{feed.name}</p>
          </div>
          <motion.button
            onClick={handleFavoriteClick}
            className={cn(
              'rounded-full transition-colors flex-shrink-0',
              isMobile ? 'p-3 min-h-[44px] min-w-[44px]' : 'p-2',
              isFavorite ? 'text-rose-500' : 'text-muted-foreground hover:text-rose-400'
            )}
            whileHover={!isMobile ? { scale: 1.1 } : undefined}
            whileTap={{ scale: 0.95 }}
            aria-label={isFavorite ? '取消收藏' : '添加收藏'}
          >
            <Heart className={cn('h-5 w-5', isFavorite && 'fill-current')} />
          </motion.button>
        </div>

        <div className="space-y-1 md:space-y-2">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xl md:text-2xl font-bold text-foreground">
              ${formatNumber(feed.price, 2)}
            </span>
            <span className={cn(
              'flex items-center gap-1 text-sm font-medium',
              isPositiveChange ? 'text-emerald-500' : 'text-rose-500'
            )}>
              {isPositiveChange ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {isPositiveChange ? '+' : ''}{formatNumber(feed.change24h, 2)}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground min-h-[44px] sm:min-h-0">
            <Activity className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">交易量: ${formatNumber(feed.volume24h, 0)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground min-h-[44px] sm:min-h-0">
            <Database className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">数据源: {feed.sources.length}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span className="truncate">更新于 {new Date(feed.lastUpdated).toLocaleTimeString()}</span>
          <span className="flex items-center gap-1 flex-shrink-0">
            <Heart className="h-3 w-3" />
            {feed.favoriteCount}
          </span>
        </div>
      </div>
    </CardEnhanced>
  );
}
