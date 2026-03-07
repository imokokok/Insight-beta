'use client';

import { useState, useCallback, useMemo } from 'react';

export type TimeRangePreset = '1h' | '6h' | '24h' | '7d' | '30d' | 'custom';

export interface TimeRange {
  preset: TimeRangePreset;
  startTime: Date;
  endTime: Date;
}

export interface TimeRangeOption {
  value: TimeRangePreset;
  labelKey: string;
  hours: number;
}

export const TIME_RANGE_PRESETS: TimeRangeOption[] = [
  { value: '1h', labelKey: 'analytics.deviation.timeRange.1h', hours: 1 },
  { value: '6h', labelKey: 'analytics.deviation.timeRange.6h', hours: 6 },
  { value: '24h', labelKey: 'analytics.deviation.timeRange.24h', hours: 24 },
  { value: '7d', labelKey: 'analytics.deviation.timeRange.7d', hours: 24 * 7 },
  { value: '30d', labelKey: 'analytics.deviation.timeRange.30d', hours: 24 * 30 },
];

export function useTimeRange(defaultPreset: TimeRangePreset = '24h') {
  const [preset, setPreset] = useState<TimeRangePreset>(defaultPreset);
  const [customStartTime, setCustomStartTime] = useState<Date | null>(null);
  const [customEndTime, setCustomEndTime] = useState<Date | null>(null);

  const timeRange = useMemo((): TimeRange => {
    const now = new Date();

    if (preset === 'custom' && customStartTime && customEndTime) {
      return {
        preset,
        startTime: customStartTime,
        endTime: customEndTime,
      };
    }

    const presetOption = TIME_RANGE_PRESETS.find((p) => p.value === preset);
    const hours = presetOption?.hours || 24;
    const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);

    return {
      preset,
      startTime,
      endTime: now,
    };
  }, [preset, customStartTime, customEndTime]);

  const windowHours = useMemo(() => {
    if (preset === 'custom' && customStartTime && customEndTime) {
      return Math.ceil((customEndTime.getTime() - customStartTime.getTime()) / (60 * 60 * 1000));
    }
    const presetOption = TIME_RANGE_PRESETS.find((p) => p.value === preset);
    return presetOption?.hours || 24;
  }, [preset, customStartTime, customEndTime]);

  const handlePresetChange = useCallback((newPreset: TimeRangePreset) => {
    setPreset(newPreset);
    if (newPreset !== 'custom') {
      setCustomStartTime(null);
      setCustomEndTime(null);
    }
  }, []);

  const handleCustomRangeChange = useCallback((start: Date, end: Date) => {
    setPreset('custom');
    setCustomStartTime(start);
    setCustomEndTime(end);
  }, []);

  const resetToDefault = useCallback(() => {
    setPreset(defaultPreset);
    setCustomStartTime(null);
    setCustomEndTime(null);
  }, [defaultPreset]);

  return {
    preset,
    timeRange,
    windowHours,
    customStartTime,
    customEndTime,
    setPreset: handlePresetChange,
    setCustomRange: handleCustomRangeChange,
    setCustomStartTime,
    setCustomEndTime,
    resetToDefault,
  };
}
