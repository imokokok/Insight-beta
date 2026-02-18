'use client';

/**
 * TimeRangeSelector - 通用时间范围选择器组件
 *
 * 职责：
 * - 提供预设时间范围快捷选择（1H, 24H, 7D, 30D, ALL）
 * - 支持自定义时间范围选择
 * - 使用按钮组形式的 UI，适合工具栏场景
 *
 * 使用场景：
 * - 通用页面/组件的时间筛选
 * - 需要简洁按钮组样式的场景
 *
 * 注意：
 * - 如需 Select 下拉样式，请使用 deviation 模块的 TimeRangeSelector
 * - 如需更复杂的预设选项（如 6H），请使用 deviation 模块版本
 */

import { useState, useCallback } from 'react';

import { Calendar } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

export type TimeRangePreset = '1H' | '24H' | '7D' | '30D' | 'ALL';

export type TimeRange = TimeRangePreset | { start: Date; end: Date };

export interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  showCustom?: boolean;
  className?: string;
}

const PRESETS: TimeRangePreset[] = ['1H', '24H', '7D', '30D', 'ALL'];

function isPreset(range: TimeRange): range is TimeRangePreset {
  return typeof range === 'string';
}

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

export function TimeRangeSelector({
  value,
  onChange,
  showCustom = true,
  className,
}: TimeRangeSelectorProps) {
  const { t } = useI18n();
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [tempStartTime, setTempStartTime] = useState<string>('');
  const [tempEndTime, setTempEndTime] = useState<string>('');

  const isCustom = !isPreset(value);

  const handlePresetClick = useCallback(
    (preset: TimeRangePreset) => {
      onChange(preset);
    },
    [onChange],
  );

  const handleCustomClick = useCallback(() => {
    const now = new Date();
    const defaultStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    setTempStartTime(formatDateTimeLocal(defaultStart));
    setTempEndTime(formatDateTimeLocal(now));
    setIsCustomOpen(true);
  }, []);

  const handleApplyCustom = useCallback(() => {
    const start = parseDateTimeLocal(tempStartTime);
    const end = parseDateTimeLocal(tempEndTime);

    if (start && end && start < end) {
      onChange({ start, end });
      setIsCustomOpen(false);
    }
  }, [tempStartTime, tempEndTime, onChange]);

  const handleCancelCustom = useCallback(() => {
    setIsCustomOpen(false);
  }, []);

  const getPresetLabel = (preset: TimeRangePreset): string => {
    const labels: Record<TimeRangePreset, string> = {
      '1H': t('common.timeRangeSelector.1h'),
      '24H': t('common.timeRangeSelector.24h'),
      '7D': t('common.timeRangeSelector.7d'),
      '30D': t('common.timeRangeSelector.30d'),
      ALL: t('common.timeRangeSelector.all'),
    };
    return labels[preset];
  };

  const formatCustomRange = (range: { start: Date; end: Date }): string => {
    const formatDate = (date: Date) => {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    };
    return `${formatDate(range.start)} - ${formatDate(range.end)}`;
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {PRESETS.map((preset) => (
        <Button
          key={preset}
          variant={isPreset(value) && value === preset ? 'default' : 'outline'}
          size="sm"
          onClick={() => handlePresetClick(preset)}
          className={cn(
            'h-8 min-w-[44px] px-3 text-xs font-medium transition-all',
            isPreset(value) && value === preset
              ? 'bg-primary text-white shadow-sm'
              : 'border-border/50 bg-card/50 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground',
          )}
        >
          {getPresetLabel(preset)}
        </Button>
      ))}

      {showCustom && (
        <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={isCustom ? 'default' : 'outline'}
              size="sm"
              onClick={handleCustomClick}
              className={cn(
                'h-8 min-w-[44px] px-3 text-xs font-medium transition-all',
                isCustom
                  ? 'bg-primary text-white shadow-sm'
                  : 'border-border/50 bg-card/50 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground',
              )}
            >
              {isCustom ? formatCustomRange(value) : t('common.timeRangeSelector.custom')}
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
