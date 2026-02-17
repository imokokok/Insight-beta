'use client';

import { useState } from 'react';

import { Calendar, Clock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

import {
  TIME_RANGE_PRESETS,
  type TimeRangePreset,
  type TimeRange,
} from '../../hooks/useTimeRange';

interface TimeRangeSelectorProps {
  preset: TimeRangePreset;
  timeRange: TimeRange;
  customStartTime: Date | null;
  customEndTime: Date | null;
  onPresetChange: (preset: TimeRangePreset) => void;
  onCustomRangeChange: (start: Date, end: Date) => void;
  className?: string;
}

export function TimeRangeSelector({
  preset,
  customStartTime,
  customEndTime,
  onPresetChange,
  onCustomRangeChange,
  className,
}: TimeRangeSelectorProps) {
  const { t } = useI18n();
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [tempStartTime, setTempStartTime] = useState<string>('');
  const [tempEndTime, setTempEndTime] = useState<string>('');

  const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const parseDateTimeLocal = (value: string): Date | null => {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  };

  const handlePresetChange = (value: string) => {
    if (value === 'custom') {
      const now = new Date();
      const defaultStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      setTempStartTime(formatDateTimeLocal(defaultStart));
      setTempEndTime(formatDateTimeLocal(now));
      setIsCustomOpen(true);
    } else {
      onPresetChange(value as TimeRangePreset);
    }
  };

  const handleApplyCustom = () => {
    const start = parseDateTimeLocal(tempStartTime);
    const end = parseDateTimeLocal(tempEndTime);

    if (start && end && start < end) {
      onCustomRangeChange(start, end);
      setIsCustomOpen(false);
    }
  };

  const handleCancelCustom = () => {
    setIsCustomOpen(false);
    if (preset === 'custom') {
      onPresetChange('24h');
    }
  };

  const getTimeRangeLabel = (presetValue: TimeRangePreset): string => {
    const labels: Record<TimeRangePreset, string> = {
      '1h': t('analytics.deviation.timeRange.1h'),
      '6h': t('analytics.deviation.timeRange.6h'),
      '24h': t('analytics.deviation.timeRange.24h'),
      '7d': t('analytics.deviation.timeRange.7d'),
      '30d': t('analytics.deviation.timeRange.30d'),
      custom: t('analytics.deviation.timeRange.custom'),
    };
    return labels[presetValue];
  };

  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2', className)}>
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{t('analytics.deviation.timeRange.label')}:</span>
      </div>
      <Select value={preset === 'custom' ? 'custom' : preset} onValueChange={handlePresetChange}>
        <SelectTrigger className={cn('h-11 w-full sm:h-10 sm:w-32')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TIME_RANGE_PRESETS.map((option) => (
            <SelectItem key={option.value} value={option.value} className="h-11 sm:h-9">
              {getTimeRangeLabel(option.value)}
            </SelectItem>
          ))}
          <SelectItem value="custom" className="h-11 sm:h-9">
            {t('analytics.deviation.timeRange.custom')}
          </SelectItem>
        </SelectContent>
      </Select>

      {preset === 'custom' && customStartTime && customEndTime && (
        <span className="text-xs text-muted-foreground">
          {customStartTime.toLocaleDateString()} - {customEndTime.toLocaleDateString()}
        </span>
      )}

      <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">{t('analytics.deviation.timeRange.customTitle')}</span>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">
                {t('analytics.deviation.timeRange.startTime')}
              </label>
              <Input
                type="datetime-local"
                value={tempStartTime}
                onChange={(e) => setTempStartTime(e.target.value)}
                className="h-11 w-full sm:h-10"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">
                {t('analytics.deviation.timeRange.endTime')}
              </label>
              <Input
                type="datetime-local"
                value={tempEndTime}
                onChange={(e) => setTempEndTime(e.target.value)}
                className="h-11 w-full sm:h-10"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" className="h-11 px-4 sm:h-9" onClick={handleCancelCustom}>
                {t('common.cancel')}
              </Button>
              <Button size="sm" className="h-11 px-4 sm:h-9" onClick={handleApplyCustom}>
                {t('common.apply')}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
