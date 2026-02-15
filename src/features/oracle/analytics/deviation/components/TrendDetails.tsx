'use client';

import { TrendingUp, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendDirectionBadge } from './TrendDirectionBadge';
import { DeviationTrendChart } from './DeviationTrendChart';
import type { DeviationTrend, PriceDeviationPoint } from '../types/deviation';

interface TrendDetailsProps {
  selectedTrend: DeviationTrend | null;
  symbolData: PriceDeviationPoint[];
}

export function TrendDetails({ selectedTrend, symbolData }: TrendDetailsProps) {
  if (!selectedTrend) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <TrendingUp className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p className="text-muted-foreground">
            Select a symbol to view detailed trend analysis
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {selectedTrend.symbol} Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-muted-foreground">Trend Direction</p>
              <TrendDirectionBadge
                direction={selectedTrend.trendDirection}
                strength={selectedTrend.trendStrength}
              />
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-muted-foreground">Anomaly Score</p>
              <p
                className={`text-lg font-bold ${
                  selectedTrend.anomalyScore > 0.7
                    ? 'text-red-500'
                    : selectedTrend.anomalyScore > 0.4
                      ? 'text-orange-500'
                      : 'text-green-500'
                }`}
              >
                {(selectedTrend.anomalyScore * 100).toFixed(1)}%
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-muted-foreground">Avg Deviation</p>
              <p className="text-lg font-bold">
                {(selectedTrend.avgDeviation * 100).toFixed(2)}%
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-muted-foreground">Max Deviation</p>
              <p className="text-lg font-bold">
                {(selectedTrend.maxDeviation * 100).toFixed(2)}%
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-800">Recommendation</p>
            <p className="mt-1 text-sm text-blue-700">{selectedTrend.recommendation}</p>
          </div>
        </CardContent>
      </Card>

      {symbolData.length > 0 && <DeviationTrendChart dataPoints={symbolData} />}
    </>
  );
}
