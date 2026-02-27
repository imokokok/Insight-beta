'use client';

import { useState, useEffect, useCallback } from 'react';

import { RefreshCw, Radio, Clock, Check } from 'lucide-react';

import { Button } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Switch } from '@/components/ui';
import { useToast } from '@/components/ui';
import { formatLastUpdated } from '@/config/refreshStrategy';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

interface RefreshIndicatorProps {
  lastUpdated: Date | null;
  isRefreshing?: boolean;
  onRefresh?: () => void | Promise<void>;
  className?: string;
  realtimeMode?: boolean;
  onRealtimeModeChange?: (enabled: boolean) => void;
  refreshInterval?: number;
  onRefreshIntervalChange?: (interval: number) => void;
  showSuccessToast?: boolean;
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
  showSuccessToast = false,
}: RefreshIndicatorProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [showSuccess, setShowSuccess] = useState(false);
  const [prevRefreshing, setPrevRefreshing] = useState(isRefreshing);

  useEffect(() => {
    if (prevRefreshing && !isRefreshing && showSuccessToast) {
      setShowSuccess(true);
      toast({
        title: t('common.refreshSuccess'),
        type: 'success',
        duration: 2000,
      });
      const timer = setTimeout(() => setShowSuccess(false), 1500);
      return () => clearTimeout(timer);
    }
    setPrevRefreshing(isRefreshing);
    return undefined;
  }, [isRefreshing, prevRefreshing, showSuccessToast, toast, t]);

  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      try {
        await onRefresh();
      } catch {
        toast({
          title: t('common.refreshFailed'),
          type: 'error',
          duration: 3000,
        });
      }
    }
  }, [onRefresh, toast, t]);

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
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={cn('h-7 w-7 p-0 transition-all duration-200', showSuccess && 'text-success')}
        >
          {showSuccess ? (
            <Check className="animate-in zoom-in h-3.5 w-3.5 duration-150" />
          ) : (
            <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
          )}
        </Button>
      )}
    </div>
  );
}
