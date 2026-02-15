'use client';

import { ChevronRight, BarChart3 } from 'lucide-react';
import { TrendDirectionBadge } from './TrendDirectionBadge';
import { DeviationSeverityBadge } from './DeviationSeverityBadge';
import type { DeviationTrend } from '../types/deviation';

interface TrendListProps {
  trends: DeviationTrend[];
  isLoading: boolean;
  onSelect: (trend: DeviationTrend) => void;
}

export function TrendList({ trends, isLoading, onSelect }: TrendListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <div className="py-12 text-center">
        <BarChart3 className="mx-auto mb-4 h-16 w-16 text-orange-500" />
        <h3 className="text-lg font-semibold">No Trend Data</h3>
        <p className="mt-1 text-muted-foreground">Deviation analysis data will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {trends.map((trend) => (
        <button
          type="button"
          key={trend.symbol}
          onClick={() => onSelect(trend)}
          className="group w-full cursor-pointer rounded-lg border p-4 text-left transition-all hover:border-orange-500 hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{trend.symbol}</span>
                <TrendDirectionBadge
                  direction={trend.trendDirection}
                  strength={trend.trendStrength}
                />
              </div>
              <p className="text-sm text-muted-foreground">{trend.recommendation}</p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>Avg Deviation: {(trend.avgDeviation * 100).toFixed(2)}%</span>
                <span>Max: {(trend.maxDeviation * 100).toFixed(2)}%</span>
                <span>Volatility: {(trend.volatility * 100).toFixed(2)}%</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <DeviationSeverityBadge deviation={trend.avgDeviation} />
              <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
