'use client';

import { Wifi, WifiOff, Clock } from 'lucide-react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Switch } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

export type ConnectionStatus = 'connected' | 'disconnected' | 'idle';

interface RealtimeModeToggleProps {
  realtimeMode: boolean;
  onRealtimeModeChange: (enabled: boolean) => void;
  connectionStatus?: ConnectionStatus;
  refreshInterval?: number;
  onRefreshIntervalChange?: (interval: number) => void;
  className?: string;
}

const intervalOptions = [
  { value: 5000, label: '5s' },
  { value: 10000, label: '10s' },
  { value: 30000, label: '30s' },
  { value: 60000, label: '1m' },
];

export function RealtimeModeToggle({
  realtimeMode,
  onRealtimeModeChange,
  connectionStatus = 'idle',
  refreshInterval = 10000,
  onRefreshIntervalChange,
  className,
}: RealtimeModeToggleProps) {
  const { t } = useI18n();

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-500';
      case 'disconnected':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusIndicatorClass = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'realtime-indicator-connected';
      case 'disconnected':
        return 'realtime-indicator-disconnected';
      default:
        return '';
    }
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'relative flex h-3 w-3 items-center justify-center',
            getStatusIndicatorClass(),
          )}
        >
          <span className={cn('h-2.5 w-2.5 rounded-full', getStatusColor())} />
        </div>

        {connectionStatus === 'connected' && realtimeMode && (
          <Wifi className="h-3.5 w-3.5 text-green-500" />
        )}
        {connectionStatus === 'disconnected' && <WifiOff className="h-3.5 w-3.5 text-red-500" />}

        <Switch
          checked={realtimeMode}
          onCheckedChange={onRealtimeModeChange}
          className={cn(realtimeMode && 'bg-green-600')}
        />

        <span
          className={cn(
            'text-xs font-medium',
            realtimeMode ? 'text-green-500' : 'text-muted-foreground',
          )}
        >
          {realtimeMode ? t('common.realtime') : t('common.manual')}
        </span>
      </div>

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
    </div>
  );
}
