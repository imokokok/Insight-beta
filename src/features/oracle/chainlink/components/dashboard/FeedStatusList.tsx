import * as React from 'react';

import { cn } from '@/shared/utils';

import { StatusIndicator } from './StatusIndicator';

export interface FeedStatusListProps {
  feeds: Array<{
    pair: string;
    price: string;
    status: 'active' | 'timeout' | 'critical';
    lastUpdate: string;
  }>;
  maxVisible?: number;
  onViewAll?: () => void;
  loading?: boolean;
}

const STATUS_MAP: Record<string, 'healthy' | 'warning' | 'critical'> = {
  active: 'healthy',
  timeout: 'warning',
  critical: 'critical',
};

function FeedStatusItem({
  pair,
  price,
  status,
  lastUpdate,
}: {
  pair: string;
  price: string;
  status: 'active' | 'timeout' | 'critical';
  lastUpdate: string;
}) {
  const indicatorStatus = STATUS_MAP[status] ?? 'healthy';

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <StatusIndicator status={indicatorStatus} size="sm" pulse={status === 'active'} />
        <span className="truncate text-sm font-medium text-foreground">{pair}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm font-semibold text-foreground">{price}</span>
        <span className="hidden text-xs text-muted-foreground sm:inline">{lastUpdate}</span>
      </div>
    </div>
  );
}

function FeedStatusSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 animate-pulse rounded-full bg-muted/50" />
        <div className="h-4 w-20 animate-pulse rounded bg-muted/30" />
      </div>
      <div className="flex items-center gap-3">
        <div className="h-4 w-16 animate-pulse rounded bg-muted/30" />
        <div className="hidden h-3 w-12 animate-pulse rounded bg-muted/30 sm:block" />
      </div>
    </div>
  );
}

const FeedStatusList = React.memo(function FeedStatusList({
  feeds,
  maxVisible = 5,
  onViewAll,
  loading = false,
}: FeedStatusListProps) {
  const visibleFeeds = feeds.slice(0, maxVisible);
  const hasMore = feeds.length > maxVisible;

  return (
    <div className="rounded border border-border/30 bg-card/60 p-3 backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Feed 状态</h3>
        <span className="text-xs text-muted-foreground">{feeds.length} 个 Feed</span>
      </div>

      <div className="divide-y divide-border/20">
        {loading
          ? Array.from({ length: maxVisible }).map((_, i) => <FeedStatusSkeleton key={i} />)
          : visibleFeeds.map((feed, index) => (
              <FeedStatusItem
                key={`${feed.pair}-${index}`}
                pair={feed.pair}
                price={feed.price}
                status={feed.status}
                lastUpdate={feed.lastUpdate}
              />
            ))}
      </div>

      {hasMore && onViewAll && (
        <button
          onClick={onViewAll}
          className={cn(
            'mt-2 w-full rounded py-1.5 text-xs font-medium text-muted-foreground',
            'hover:bg-muted/20 hover:text-foreground',
            'transition-colors duration-200',
          )}
        >
          查看全部 ({feeds.length - maxVisible} 条更多)
        </button>
      )}
    </div>
  );
});

FeedStatusList.displayName = 'FeedStatusList';

export { FeedStatusList };
