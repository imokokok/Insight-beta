'use client';

import { useEffect, useState } from 'react';

import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

type FreshnessStatus = 'fresh' | 'stale' | 'updating';

interface DataFreshnessIndicatorProps {
  lastUpdated: Date | null;
  staleThreshold?: number; // seconds
  className?: string;
  showLabel?: boolean;
}

export function DataFreshnessIndicator({
  lastUpdated,
  staleThreshold = 300, // 5 minutes default
  className,
  showLabel = false,
}: DataFreshnessIndicatorProps) {
  const [status, setStatus] = useState<FreshnessStatus>('fresh');
  const [timeAgo, setTimeAgo] = useState<string>('');

  useEffect(() => {
    if (!lastUpdated) {
      setStatus('stale');
      return;
    }

    const calculateStatus = () => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000);

      if (diff < 5) {
        setStatus('fresh');
        setTimeAgo('just now');
      } else if (diff < 60) {
        setStatus('fresh');
        setTimeAgo(`${diff}s ago`);
      } else if (diff < staleThreshold) {
        setStatus('fresh');
        const minutes = Math.floor(diff / 60);
        setTimeAgo(`${minutes}m ago`);
      } else {
        setStatus('stale');
        const minutes = Math.floor(diff / 60);
        setTimeAgo(`${minutes}m ago`);
      }
    };

    calculateStatus();
    const interval = setInterval(calculateStatus, 5000);

    return () => clearInterval(interval);
  }, [lastUpdated, staleThreshold]);

  const statusConfig = {
    fresh: {
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      label: 'Live',
    },
    updating: {
      icon: Loader2,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      label: 'Updating',
    },
    stale: {
      icon: AlertCircle,
      color: 'text-amber-500',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      label: 'Stale',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-medium transition-colors',
        config.bgColor,
        config.borderColor,
        className,
      )}
    >
      <Icon className={cn('h-3 w-3', config.color, status === 'updating' && 'animate-spin')} />
      <span className={config.color}>{showLabel ? config.label : timeAgo}</span>
    </div>
  );
}

// Hook to manage data freshness
export function useDataFreshness() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const markUpdating = () => setIsUpdating(true);
  const markUpdated = () => {
    setIsUpdating(false);
    setLastUpdated(new Date());
  };
  const markStale = () => setIsUpdating(false);

  return {
    lastUpdated,
    isUpdating,
    markUpdating,
    markUpdated,
    markStale,
  };
}
