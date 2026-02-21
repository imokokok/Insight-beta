'use client';

import { useState } from 'react';

import { AlertTriangle, X, ChevronDown, ChevronUp, Info } from 'lucide-react';

import { EmptyDeviationState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { SkeletonList } from '@/components/ui';
import { useIsMobile } from '@/hooks';
import { useI18n } from '@/i18n';
import { cn, formatTime } from '@/shared/utils';

import type { PriceDeviationPoint } from '../types/deviation';

interface AnomalyListProps {
  anomalies: PriceDeviationPoint[];
  isLoading: boolean;
  onSelect: (anomaly: PriceDeviationPoint) => void;
}

interface AnomalyDetailModalProps {
  anomaly: PriceDeviationPoint | null;
  onClose: () => void;
  t: (key: string) => string;
}

function getDeviationColor(deviation: number): string {
  const absDeviation = Math.abs(deviation);
  if (absDeviation >= 5) return '#dc2626';
  if (absDeviation >= 2) return '#ea580c';
  if (absDeviation >= 1) return '#f97316';
  return '#22c55e';
}

function AnomalyDetailModal({ anomaly, onClose, t }: AnomalyDetailModalProps) {
  if (!anomaly) return null;

  const prices = Object.entries(anomaly.prices).map(([protocol, price]) => ({
    protocol,
    price,
    deviation: Math.abs(price - anomaly.avgPrice) / anomaly.avgPrice,
    isOutlier: anomaly.outlierProtocols.includes(protocol),
  }));

  const sortedPrices = prices.sort((a, b) => b.price - a.price);
  const maxPrice = Math.max(...prices.map((p) => p.price));
  const minPrice = Math.min(...prices.map((p) => p.price));
  const priceSpread = maxPrice - minPrice;
  const priceSpreadPercent = (priceSpread / minPrice) * 100;

  const deviationColor = getDeviationColor(anomaly.maxDeviationPercent * 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <h3 className="font-semibold">{anomaly.symbol}</h3>
              <p className="text-xs text-muted-foreground">{formatTime(anomaly.timestamp)}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-muted-foreground">{t('common.maxDeviation')}</p>
              <p className="text-lg font-bold" style={{ color: deviationColor }}>
                {(anomaly.maxDeviationPercent * 100).toFixed(2)}%
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-muted-foreground">{t('common.averagePrice')}</p>
              <p className="text-lg font-bold">${anomaly.avgPrice.toFixed(4)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-muted-foreground">{t('common.medianPrice')}</p>
              <p className="text-lg font-bold">${anomaly.medianPrice.toFixed(4)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-muted-foreground">{t('common.outliers')}</p>
              <p className="text-lg font-bold text-red-500">{anomaly.outlierProtocols.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                {t('common.priceSpread')}
              </p>
              <p className="text-lg font-bold">${priceSpread.toFixed(4)}</p>
              <p className="text-xs text-muted-foreground">({priceSpreadPercent.toFixed(2)}%)</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                {t('common.protocols')}
              </p>
              <p className="text-lg font-bold">{anomaly.protocols.length}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {anomaly.protocols.slice(0, 3).map((p) => (
                  <Badge key={p} variant="secondary" className="text-[10px]">
                    {p}
                  </Badge>
                ))}
                {anomaly.protocols.length > 3 && (
                  <Badge variant="secondary" className="text-[10px]">
                    +{anomaly.protocols.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {anomaly.outlierProtocols.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-red-700">
                <AlertTriangle className="h-4 w-4" />
                {t('common.outlierProtocols')} ({anomaly.outlierProtocols.length})
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {anomaly.outlierProtocols.map((protocol) => (
                  <Badge key={protocol} variant="outline" className="border-red-500 text-red-600">
                    {protocol}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">{t('common.protocolPrices')}</p>
            <div className="max-h-60 space-y-1 overflow-auto">
              {sortedPrices.map(({ protocol, price, isOutlier }) => {
                const safePrice = price ?? 0;
                const priceDiff = ((safePrice - anomaly.avgPrice) / anomaly.avgPrice) * 100;
                const barWidth = ((safePrice - minPrice) / priceSpread) * 100;

                return (
                  <div
                    key={protocol}
                    className={cn(
                      'rounded-lg p-2 text-sm transition-colors',
                      isOutlier ? 'border border-red-200 bg-red-50' : 'bg-gray-50',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn('font-medium capitalize', isOutlier && 'text-red-600')}>
                          {protocol}
                        </span>
                        {isOutlier && (
                          <Badge
                            variant="outline"
                            className="border-red-500 text-[10px] text-red-500"
                          >
                            {t('common.outlier')}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">${price.toFixed(6)}</span>
                        <span
                          className={cn(
                            'text-xs font-medium',
                            priceDiff > 0 ? 'text-green-600' : 'text-red-600',
                          )}
                        >
                          {priceDiff > 0 ? '+' : ''}
                          {priceDiff.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-gray-200">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          isOutlier ? 'bg-red-400' : 'bg-blue-400',
                        )}
                        style={{ width: `${Math.max(5, barWidth)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 p-3">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 text-blue-600" />
              <div className="text-xs text-blue-800">
                <p className="font-medium">{t('analytics.deviation.anomalies.contextInfo')}</p>
                <p className="mt-1 text-blue-700">
                  {t('analytics.deviation.anomalies.contextDescription')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AnomalyList({ anomalies, isLoading, onSelect }: AnomalyListProps) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [selectedAnomaly, setSelectedAnomaly] = useState<PriceDeviationPoint | null>(null);
  const [expandedAnomalies, setExpandedAnomalies] = useState<Set<string>>(new Set());

  const toggleExpand = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedAnomalies((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleAnomalyClick = (anomaly: PriceDeviationPoint) => {
    onSelect(anomaly);
    setSelectedAnomaly(anomaly);
  };

  if (isLoading) {
    return <SkeletonList count={5} />;
  }

  if (anomalies.length === 0) {
    return <EmptyDeviationState onRefresh={() => window.location.reload()} />;
  }

  return (
    <>
      <div className="space-y-3">
        {anomalies.map((anomaly) => {
          const key = `${anomaly.symbol}-${anomaly.timestamp}`;
          const isExpanded = expandedAnomalies.has(key);
          const deviationColor = getDeviationColor(anomaly.maxDeviationPercent * 100);

          const outlierPrices = anomaly.outlierProtocols.map((p) => ({
            protocol: p,
            price: anomaly.prices[p] ?? 0,
            deviation: Math.abs((anomaly.prices[p] ?? 0) - anomaly.avgPrice) / anomaly.avgPrice,
          }));

          return (
            <div
              key={key}
              className="rounded-lg border transition-all hover:border-orange-500 hover:shadow-md"
            >
              <button
                type="button"
                onClick={() => handleAnomalyClick(anomaly)}
                className="group w-full cursor-pointer p-3 text-left sm:p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="font-semibold">{anomaly.symbol}</span>
                      <Badge variant="outline" className="border-red-500 text-red-500">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        {anomaly.outlierProtocols.length} {t('common.outliers')}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatTime(anomaly.timestamp)}</p>
                    <div className="flex flex-wrap gap-1">
                      {anomaly.outlierProtocols.slice(0, isMobile ? 2 : 3).map((protocol) => (
                        <Badge key={protocol} variant="secondary" className="text-xs">
                          {protocol}
                        </Badge>
                      ))}
                      {anomaly.outlierProtocols.length > (isMobile ? 2 : 3) && (
                        <Badge variant="secondary" className="text-xs">
                          +{anomaly.outlierProtocols.length - (isMobile ? 2 : 3)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-base font-bold sm:text-lg" style={{ color: deviationColor }}>
                      {(anomaly.maxDeviationPercent * 100).toFixed(2)}%
                    </p>
                    <p className="text-xs text-muted-foreground">{t('common.maxDeviation')}</p>
                    <p className="mt-1 text-sm font-medium">${anomaly.avgPrice.toFixed(4)}</p>
                  </div>
                </div>
              </button>

              <div className="border-t px-3 pb-2 sm:px-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-full text-xs text-muted-foreground sm:h-8"
                  onClick={(e) => toggleExpand(key, e)}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="mr-1 h-4 w-4" />
                      {t('common.collapse')}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-1 h-4 w-4" />
                      {t('common.viewContext')}
                    </>
                  )}
                </Button>
              </div>

              {isExpanded && (
                <div className="border-t bg-gray-50/50 px-3 pb-4 sm:px-4">
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="rounded bg-white p-2">
                        <p className="text-[10px] text-muted-foreground">
                          {t('common.averagePrice')}
                        </p>
                        <p className="text-sm font-semibold">${anomaly.avgPrice.toFixed(4)}</p>
                      </div>
                      <div className="rounded bg-white p-2">
                        <p className="text-[10px] text-muted-foreground">
                          {t('common.medianPrice')}
                        </p>
                        <p className="text-sm font-semibold">${anomaly.medianPrice.toFixed(4)}</p>
                      </div>
                      <div className="rounded bg-white p-2">
                        <p className="text-[10px] text-muted-foreground">{t('common.protocols')}</p>
                        <p className="text-sm font-semibold">{anomaly.protocols.length}</p>
                      </div>
                      <div className="rounded bg-white p-2">
                        <p className="text-[10px] text-muted-foreground">
                          {t('common.maxDeviation')}
                        </p>
                        <p className="text-sm font-semibold" style={{ color: deviationColor }}>
                          {(anomaly.maxDeviationPercent * 100).toFixed(2)}%
                        </p>
                      </div>
                    </div>

                    {outlierPrices.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-red-600">
                          {t('common.outlierDetails')}
                        </p>
                        {outlierPrices.map(({ protocol, price, deviation }) => (
                          <div
                            key={protocol}
                            className="flex items-center justify-between rounded bg-red-50 p-2 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium capitalize">{protocol}</span>
                              <Badge
                                variant="outline"
                                className="border-red-400 text-[10px] text-red-500"
                              >
                                {t('common.outlier')}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono">${(price ?? 0).toFixed(4)}</span>
                              <span className="font-medium text-red-600">
                                +{(deviation * 100).toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 w-full sm:h-8"
                      onClick={() => setSelectedAnomaly(anomaly)}
                    >
                      {t('common.viewFullDetails')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AnomalyDetailModal
        anomaly={selectedAnomaly}
        onClose={() => setSelectedAnomaly(null)}
        t={t}
      />
    </>
  );
}
