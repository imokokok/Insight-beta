'use client';

import { useState, useCallback, useEffect } from 'react';

import { Calendar } from 'lucide-react';

import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

import type { TimeRange, TimeRangePreset } from './types';

interface TimeRangeFilterProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  className?: string;
}

const PRESETS: TimeRangePreset[] = ['24h', '7d', '30d', 'custom'];

function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseDateTimeLocal(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

export function TimeRangeFilter({ value, onChange, className }: TimeRangeFilterProps) {
  const { t } = useI18n();
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [tempStartTime, setTempStartTime] = useState<string>('');
  const [tempEndTime, setTempEndTime] = useState<string>('');

  useEffect(() => {
    if (value.preset === 'custom' && value.start && value.end) {
      setTempStartTime(formatDateTimeLocal(value.start));
      setTempEndTime(formatDateTimeLocal(value.end));
    }
  }, [value]);

  const handlePresetClick = useCallback(
    (preset: TimeRangePreset) => {
      if (preset === 'custom') {
        const now = new Date();
        const defaultStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        setTempStartTime(formatDateTimeLocal(defaultStart));
        setTempEndTime(formatDateTimeLocal(now));
        setIsCustomOpen(true);
      } else {
        onChange({ preset });
      }
    },
    [onChange],
  );

  const handleApplyCustom = useCallback(() => {
    const start = parseDateTimeLocal(tempStartTime);
    const end = parseDateTimeLocal(tempEndTime);

    if (start && end && start < end) {
      onChange({ preset: 'custom', start, end });
      setIsCustomOpen(false);
    }
  }, [tempStartTime, tempEndTime, onChange]);

  const handleCancelCustom = useCallback(() => {
    setIsCustomOpen(false);
  }, []);

  const getPresetLabel = (preset: TimeRangePreset): string => {
    const labels: Record<TimeRangePreset, string> = {
      '24h': '24h',
      '7d': '7d',
      '30d': '30d',
      custom: t('common.timeRangeSelector.custom'),
    };
    return labels[preset];
  };

  const formatCustomRange = (range: TimeRange): string => {
    if (!range.start || !range.end) return t('common.timeRangeSelector.custom');
    const formatDate = (date: Date) => {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    };
    return `${formatDate(range.start)} - ${formatDate(range.end)}`;
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {PRESETS.map((preset) => (
        <Button
          key={preset}
          variant={value.preset === preset ? 'default' : 'outline'}
          size="sm"
          onClick={() => handlePresetClick(preset)}
          className={cn(
            'h-8 min-w-[36px] px-2.5 text-xs font-medium transition-all sm:min-w-[44px] sm:px-3',
            value.preset === preset
              ? 'bg-primary text-white shadow-sm'
              : 'border-border/50 bg-card/50 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground',
          )}
        >
          {preset === 'custom' && value.preset === 'custom'
            ? formatCustomRange(value)
            : getPresetLabel(preset)}
        </Button>
      ))}

      {value.preset === 'custom' && (
        <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCustomOpen(true)}
              className={cn(
                'h-8 px-2 text-xs font-medium transition-all',
                'border-border/50 bg-card/50 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground',
              )}
            >
              <Calendar className="mr-1 h-3.5 w-3.5" />
              {t('common.edit')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {t('common.timeRangeSelector.customTitle')}
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">
                  {t('common.timeRangeSelector.startTime')}
                </label>
                <Input
                  type="datetime-local"
                  value={tempStartTime}
                  onChange={(e) => setTempStartTime(e.target.value)}
                  className="h-9 w-full text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">
                  {t('common.timeRangeSelector.endTime')}
                </label>
                <Input
                  type="datetime-local"
                  value={tempEndTime}
                  onChange={(e) => setTempEndTime(e.target.value)}
                  className="h-9 w-full text-sm"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={handleCancelCustom}
                >
                  {t('common.cancel')}
                </Button>
                <Button size="sm" className="h-8 px-3 text-xs" onClick={handleApplyCustom}>
                  {t('common.apply')}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
