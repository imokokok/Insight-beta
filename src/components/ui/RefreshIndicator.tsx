'use client';

import { RefreshCw, Radio, Clock } from 'lucide-react';

import { Button } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Switch } from '@/components/ui';
import { formatLastUpdated } from '@/config/refreshStrategy';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

interface RefreshIndicatorProps {
  lastUpdated: Date | null;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  className?: string;
  realtimeMode?: boolean;
  onRealtimeModeChange?: (enabled: boolean) => void;
  refreshInterval?: number;
  onRefreshIntervalChange?: (interval: number) => void;
}

const intervalOptions = [
  { value: 5000, label: '5s' },
  { value: 10000, label: '10s' },
  { value: 30000, label: '30s' },
  { value: 60000, label: '1m' },
];

export function RefreshIndicator({
  lastUpdated,
  isRefreshing = false,
  onRefresh,
  className,
  realtimeMode = false,
  onRealtimeModeChange,
  refreshInterval = 10000,
  onRefreshIntervalChange,
}: RefreshIndicatorProps) {
  const { t } = useI18n();

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {onRealtimeModeChange && (
        <div className="flex items-center gap-2">
          <Switch
            checked={realtimeMode}
            onCheckedChange={onRealtimeModeChange}
            className={cn('data-[state=checked]:bg-green-600')}
          />
          <div className="flex items-center gap-1.5">
            {realtimeMode ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
                </span>
                <span className="text-xs font-medium text-green-500">{t('common.realtime')}</span>
              </>
            ) : (
              <>
                <Radio className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{t('common.manual')}</span>
              </>
            )}
          </div>
        </div>
      )}

      {realtimeMode && onRefreshIntervalChange && (
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <Select
            value={String(refreshInterval)}
            onValueChange={(value) => onRefreshIntervalChange(Number(value))}
          >
            <SelectTrigger className="h-7 w-[70px] border-border/50 bg-card/50 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {intervalOptions.map((option) => (
                <SelectItem key={option.value} value={String(option.value)} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {!realtimeMode && (
        <span className="text-xs text-muted-foreground">{formatLastUpdated(lastUpdated)}</span>
      )}

      {!realtimeMode && onRefresh && (
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
