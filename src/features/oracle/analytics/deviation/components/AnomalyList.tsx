'use client';

import { AlertTriangle } from 'lucide-react';

import { EmptyDeviationState } from '@/components/common/EmptyState';
import { Badge } from '@/components/ui/badge';
import { SkeletonList } from '@/components/ui/skeleton';
import { useI18n } from '@/i18n/LanguageProvider';
import { formatTime } from '@/shared/utils';

import type { PriceDeviationPoint } from '../types/deviation';

interface AnomalyListProps {
  anomalies: PriceDeviationPoint[];
  isLoading: boolean;
  onSelect: (anomaly: PriceDeviationPoint) => void;
}

export function AnomalyList({ anomalies, isLoading, onSelect }: AnomalyListProps) {
  const { t } = useI18n();
  
  if (isLoading) {
    return <SkeletonList count={5} />;
  }

  if (anomalies.length === 0) {
    return <EmptyDeviationState onRefresh={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-3">
      {anomalies.map((anomaly, index) => (
        <button
          type="button"
          key={index}
          onClick={() => onSelect(anomaly)}
          className="group w-full cursor-pointer rounded-lg border p-4 text-left transition-all hover:border-orange-500 hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{anomaly.symbol}</span>
                <Badge variant="outline" className="border-red-500 text-red-500">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  {anomaly.outlierProtocols.length} {t('common.outliers')}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{formatTime(anomaly.timestamp)}</p>
              <div className="flex flex-wrap gap-1">
                {anomaly.outlierProtocols.map((protocol) => (
                  <Badge key={protocol} variant="secondary" className="text-xs">
                    {protocol}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-red-500">
                {(anomaly.maxDeviationPercent * 100).toFixed(2)}%
              </p>
              <p className="text-xs text-muted-foreground">{t('common.maxDeviation')}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
