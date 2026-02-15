'use client';

import { useMemo, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';

import { ChevronRight, BarChart3, Search, Filter } from 'lucide-react';
import { TrendDirectionBadge } from './TrendDirectionBadge';
import { DeviationSeverityBadge } from './DeviationSeverityBadge';
import type { DeviationTrend } from '../types/deviation';

interface VirtualTrendListProps {
  trends: DeviationTrend[];
  isLoading: boolean;
  onSelect: (trend: DeviationTrend) => void;
}

export function VirtualTrendList({ trends, isLoading, onSelect }: VirtualTrendListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  const filteredTrends = useMemo(() => {
    let result = trends;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => t.symbol.toLowerCase().includes(query));
    }

    if (filterSeverity !== 'all') {
      result = result.filter(t => {
        const deviation = t.avgDeviation;
        if (filterSeverity === 'critical') return deviation >= 0.05;
        if (filterSeverity === 'high') return deviation >= 0.02 && deviation < 0.05;
        if (filterSeverity === 'medium') return deviation >= 0.01 && deviation < 0.02;
        if (filterSeverity === 'low') return deviation < 0.01;
        return true;
      });
    }

    return result;
  }, [trends, searchQuery, filterSeverity]);

  const TrendItem = ({ trend }: { trend: DeviationTrend }) => (
    <button
      type="button"
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
  );

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
    <div className="flex h-full flex-col">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search symbols..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border pl-10 pr-4 py-2 text-sm focus:border-orange-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
          >
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <div className="text-sm text-muted-foreground mb-2">
        Showing {filteredTrends.length} of {trends.length} trends
      </div>

      <div className="flex-1 min-h-0">
        {filteredTrends.length > 50 ? (
          <Virtuoso
            style={{ height: '100%' }}
            data={filteredTrends}
            itemContent={(_, trend) => (
              <div className="pb-3">
                <TrendItem trend={trend} />
              </div>
            )}
          />
        ) : (
          <div className="space-y-3">
            {filteredTrends.map((trend) => (
              <TrendItem key={trend.symbol} trend={trend} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
