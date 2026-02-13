/**
 * Refresh Indicator - 简化的刷新指示器
 */

'use client';

import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatLastUpdated } from '@/config/refreshStrategy';
import { cn } from '@/shared/utils';

interface RefreshIndicatorProps {
  lastUpdated: Date | null;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  className?: string;
}

export function RefreshIndicator({
  lastUpdated,
  isRefreshing = false,
  onRefresh,
  className,
}: RefreshIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-xs text-muted-foreground">
        {formatLastUpdated(lastUpdated)}
      </span>
      {onRefresh && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="h-7 w-7 p-0"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
        </Button>
      )}
    </div>
  );
}
