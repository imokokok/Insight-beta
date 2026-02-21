'use client';

import { useRouter } from 'next/navigation';

import { motion } from 'framer-motion';
import { Heart, Clock, Database, Wallet, ChevronRight } from 'lucide-react';

import { CardEnhanced } from '@/components/ui';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { cn } from '@/shared/utils';

import { useFavorites } from '../hooks/useFavorites';
import { useHistory } from '../hooks/useHistory';

import type { FavoriteItem, HistoryItem } from '../types';
import type { Route } from 'next';

interface QuickAccessProps {
  className?: string;
  maxItems?: number;
}

const typeConfig = {
  feed: {
    icon: Database,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  address: {
    icon: Wallet,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
};

export function QuickAccess({ className, maxItems = 5 }: QuickAccessProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { favorites } = useFavorites();
  const { history } = useHistory();

  const topFavorites = favorites.slice(0, maxItems);
  const recentHistory = history.slice(0, maxItems);

  const handleFavoriteClick = (item: FavoriteItem) => {
    if (item.type === 'feed' && item.symbol) {
      router.push(`/explore/feed/${item.id}` as Route);
    } else if (item.type === 'address' && item.address) {
      router.push(`/explore/address/${item.address}` as Route);
    }
  };

  const handleHistoryClick = (item: HistoryItem) => {
    router.push(item.url as Route);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const renderItem = (item: FavoriteItem | HistoryItem, onClick: () => void, isHistory = false) => {
    const config = typeConfig[item.type];
    const Icon = config.icon;
    const title = isHistory
      ? (item as HistoryItem).title
      : (item as FavoriteItem).symbol || (item as FavoriteItem).address?.slice(0, 8) + '...';
    const subtitle = isHistory
      ? formatTime((item as HistoryItem).visitedAt)
      : formatTime((item as FavoriteItem).addedAt);

    return (
      <motion.button
        key={item.id}
        whileHover={!isMobile ? { x: 4 } : undefined}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="bg-secondary/30 hover:bg-secondary/60 group flex min-h-[44px] w-full items-center justify-between rounded-lg p-2.5 transition-colors md:p-2.5"
      >
        <div className="flex items-center gap-2 md:gap-2.5">
          <div className={cn('rounded-md p-1.5', config.bgColor)}>
            <Icon className={cn('h-3.5 w-3.5', config.color)} />
          </div>
          <div className="text-left">
            <p className="max-w-[100px] truncate text-sm font-medium text-foreground md:max-w-[120px]">
              {title}
            </p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </motion.button>
    );
  };

  return (
    <CardEnhanced className={cn('p-3 md:p-4', className)}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 md:mb-3">
            <Heart className="h-4 w-4 text-rose-500" />
            <h4 className="text-sm font-semibold text-foreground">收藏</h4>
          </div>
          {topFavorites.length > 0 ? (
            <div className="space-y-1 md:space-y-1.5">
              {topFavorites.map((item) => renderItem(item, () => handleFavoriteClick(item), false))}
            </div>
          ) : (
            <div className="py-3 text-center text-sm text-muted-foreground md:py-4">暂无收藏</div>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 md:mb-3">
            <Clock className="h-4 w-4 text-amber-500" />
            <h4 className="text-sm font-semibold text-foreground">最近访问</h4>
          </div>
          {recentHistory.length > 0 ? (
            <div className="space-y-1 md:space-y-1.5">
              {recentHistory.map((item) => renderItem(item, () => handleHistoryClick(item), true))}
            </div>
          ) : (
            <div className="py-3 text-center text-sm text-muted-foreground md:py-4">暂无历史</div>
          )}
        </div>
      </div>
    </CardEnhanced>
  );
}
