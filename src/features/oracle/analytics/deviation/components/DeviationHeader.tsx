'use client';

import {
  Activity,
  RefreshCw,
  BarChart3,
  AlertTriangle,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

import { Button } from '@/components/ui';
import { useI18n } from '@/i18n';
import { formatTimeAgo } from '@/shared/utils';
import { cn } from '@/shared/utils';

interface DeviationHeaderProps {
  totalSymbols: number;
  symbolsWithHighDeviation: number;
  avgDeviationAcrossAll: number;
  mostVolatileSymbol: string | null;
  lastUpdated: Date | null;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  autoRefreshEnabled: boolean;
  onRefresh: () => void;
  onToggleAutoRefresh: () => void;
  onExport?: () => void;
  exportDisabled?: boolean;
}

export function DeviationHeader({
  totalSymbols,
  symbolsWithHighDeviation,
  avgDeviationAcrossAll,
  mostVolatileSymbol,
  lastUpdated,
  syncStatus,
  autoRefreshEnabled,
  onRefresh,
  onToggleAutoRefresh,
  onExport,
  exportDisabled,
}: DeviationHeaderProps) {
  const { t } = useI18n();

  const getStatusConfig = () => {
    switch (syncStatus) {
      case 'syncing':
        return {
          icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" />,
          text: t('common.loading'),
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/20',
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-3.5 w-3.5" />,
          text: 'Error',
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/20',
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="h-3.5 w-3.5" />,
          text: t('common.live'),
          color: 'text-emerald-500',
          bgColor: 'bg-emerald-500/10',
          borderColor: 'border-emerald-500/20',
        };
      default:
        return {
          icon: <Clock className="h-3.5 w-3.5" />,
          text: t('common.idle'),
          color: 'text-slate-500',
          bgColor: 'bg-slate-500/10',
          borderColor: 'border-slate-500/20',
        };
    }
  };

  const status = getStatusConfig();

  const avgDeviationPercent = (avgDeviationAcrossAll * 100).toFixed(2);

  return (
    <header className="border-b border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-7xl px-3 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-slate-100 sm:text-lg">
                {t('analytics.deviation.pageName')}
              </h1>
            </div>

            <div
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                status.bgColor,
                status.borderColor,
                status.color,
              )}
            >
              {status.icon}
              <span>{status.text}</span>
            </div>

            {lastUpdated && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Clock className="h-3 w-3" />
                <span>Updated {formatTimeAgo(lastUpdated.toISOString(), 'en')}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              {onExport && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onExport}
                  disabled={exportDisabled || syncStatus === 'syncing'}
                  className="h-7 gap-1 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                >
                  <span className="hidden text-xs font-medium sm:inline">{t('common.export')}</span>
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={syncStatus === 'syncing'}
                className="h-7 gap-1 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
              >
                <RefreshCw className={cn('h-3 w-3', syncStatus === 'syncing' && 'animate-spin')} />
                <span className="hidden text-xs font-medium sm:inline">{t('common.refresh')}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleAutoRefresh}
                className={cn(
                  'h-7 gap-1 rounded-lg border',
                  autoRefreshEnabled
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-slate-800 bg-slate-900 text-slate-500 hover:bg-slate-800 hover:text-slate-300',
                )}
              >
                <span className="relative flex h-2 w-2">
                  {autoRefreshEnabled && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span
                    className={cn(
                      'relative inline-flex h-2 w-2 rounded-full',
                      autoRefreshEnabled ? 'bg-emerald-400' : 'bg-slate-600',
                    )}
                  />
                </span>
                <span className="hidden text-xs font-medium sm:inline">Auto</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 sm:rounded-xl sm:p-4">
            <div className="flex items-center gap-1.5 text-slate-500 sm:gap-2">
              <div className="rounded-md bg-blue-500/10 p-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-blue-400 sm:h-4 sm:w-4" />
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wide sm:text-xs">
                {t('analytics:deviation.summary.totalSymbols')}
              </span>
            </div>
            <div className="mt-1.5 sm:mt-2">
              <p className="text-lg font-bold text-slate-100 sm:text-xl">{totalSymbols}</p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 sm:rounded-xl sm:p-4">
            <div className="flex items-center gap-1.5 text-slate-500 sm:gap-2">
              <div className="rounded-md bg-red-500/10 p-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-red-400 sm:h-4 sm:w-4" />
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wide sm:text-xs">
                {t('analytics:deviation.summary.highDeviation')}
              </span>
            </div>
            <div className="mt-1.5 sm:mt-2">
              <p className="text-lg font-bold text-slate-100 sm:text-xl">
                {symbolsWithHighDeviation}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 sm:rounded-xl sm:p-4">
            <div className="flex items-center gap-1.5 text-slate-500 sm:gap-2">
              <div className="rounded-md bg-amber-500/10 p-1.5">
                <Activity className="h-3.5 w-3.5 text-amber-400 sm:h-4 sm:w-4" />
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wide sm:text-xs">
                {t('analytics:deviation.summary.avgDeviation')}
              </span>
            </div>
            <div className="mt-1.5 sm:mt-2">
              <p className="text-lg font-bold text-slate-100 sm:text-xl">{avgDeviationPercent}%</p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 sm:rounded-xl sm:p-4">
            <div className="flex items-center gap-1.5 text-slate-500 sm:gap-2">
              <div className="rounded-md bg-purple-500/10 p-1.5">
                <Zap className="h-3.5 w-3.5 text-purple-400 sm:h-4 sm:w-4" />
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wide sm:text-xs">
                {t('analytics:deviation.summary.mostVolatile')}
              </span>
            </div>
            <div className="mt-1.5 sm:mt-2">
              <p className="text-lg font-bold text-slate-100 sm:text-xl">
                {mostVolatileSymbol || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
