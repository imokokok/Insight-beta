/**
 * Refresh Indicator Component
 *
 * 刷新指示器组件 - 显示最后更新时间和倒计时
 */

'use client';

import { useEffect, useState } from 'react';

import { RefreshCw } from 'lucide-react';

import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

interface RefreshIndicatorProps {
  lastUpdated: Date | null;
  nextRefreshIn?: number; // seconds
  isLoading?: boolean;
  className?: string;
}

export function RefreshIndicator({
  lastUpdated,
  nextRefreshIn = 60,
  isLoading = false,
  className,
}: RefreshIndicatorProps) {
  const { t } = useI18n();
  const [countdown, setCountdown] = useState(nextRefreshIn);
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    if (!lastUpdated) return;

    const updateTimeAgo = () => {
      const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      if (seconds < 60) {
        setTimeAgo(t('common.timeAgo.seconds', { seconds }));
      } else if (seconds < 3600) {
        setTimeAgo(t('common.timeAgo.minutes', { minutes: Math.floor(seconds / 60) }));
      } else {
        setTimeAgo(t('common.timeAgo.hours', { hours: Math.floor(seconds / 3600) }));
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated, t]);

  useEffect(() => {
    if (isLoading) {
      setCountdown(nextRefreshIn);
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) return nextRefreshIn;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isLoading, nextRefreshIn]);

  if (!lastUpdated) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-gray-400', className)}>
        <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        <span>{t('common.loading')}</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-3 text-sm', className)}>
      <div className="flex items-center gap-2 text-gray-500">
        <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        <span>{t('analytics.refresh.updated', { timeAgo })}</span>
      </div>
      <div className="h-4 w-px bg-gray-300" />
      <div className="flex items-center gap-2">
        <span className="text-gray-400">{t('analytics.refresh.nextRefresh')}</span>
        <div className="relative h-6 w-6">
          <svg className="h-6 w-6 -rotate-90" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="none" stroke="#e5e7eb" strokeWidth="3" />
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${(countdown / nextRefreshIn) * 63} 63`}
              className="transition-all duration-1000"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
            {countdown}
          </span>
        </div>
        <span className="text-gray-400">{t('common.time.secondShort')}</span>
      </div>
    </div>
  );
}

export function LastUpdated({
  date,
  className,
}: {
  date: Date | string | null;
  className?: string;
}) {
  const { t } = useI18n();
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    if (!date) {
      setTimeAgo(t('common.timeAgo.never'));
      return;
    }

    const updateTimeAgo = () => {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      const seconds = Math.floor((Date.now() - dateObj.getTime()) / 1000);

      if (seconds < 5) {
        setTimeAgo(t('common.timeAgo.justNow'));
      } else if (seconds < 60) {
        setTimeAgo(t('common.timeAgo.seconds', { seconds }));
      } else if (seconds < 3600) {
        setTimeAgo(t('common.timeAgo.minutes', { minutes: Math.floor(seconds / 60) }));
      } else if (seconds < 86400) {
        setTimeAgo(t('common.timeAgo.hours', { hours: Math.floor(seconds / 3600) }));
      } else {
        setTimeAgo(t('common.timeAgo.days', { days: Math.floor(seconds / 86400) }));
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 1000);
    return () => clearInterval(interval);
  }, [date, t]);

  return (
    <span className={cn('text-sm text-gray-500', className)}>
      {t('analytics.refresh.lastUpdated', { timeAgo })}
    </span>
  );
}
