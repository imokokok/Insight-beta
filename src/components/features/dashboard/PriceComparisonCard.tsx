'use client';

import { memo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { ProtocolBadge } from './ProtocolBadge';
import type { CrossProtocolComparison, OracleProtocol } from '@/lib/types';

interface PriceComparisonCardProps {
  comparison: CrossProtocolComparison;
  className?: string;
}

function PriceComparisonCardComponent({ comparison, className }: PriceComparisonCardProps) {
  return (
    <div className={className}>
      <div className="grid gap-4 md:grid-cols-2">
        {/* 价格对比表 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Protocol Prices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {comparison.prices.map(
                (price: {
                  protocol: string;
                  instanceId: string;
                  price: number;
                  timestamp: string;
                }) => (
                  <div
                    key={price.protocol}
                    className="flex items-center justify-between rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <ProtocolBadge protocol={price.protocol as OracleProtocol} />
                      <span className="text-sm text-gray-500">{price.instanceId}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-medium">${price.price.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(price.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          </CardContent>
        </Card>

        {/* 推荐价格和统计 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Aggregated Price</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 推荐价格 */}
            <div className="rounded-lg bg-purple-50 p-6 text-center">
              <div className="mb-1 text-sm text-gray-500">Recommended Price</div>
              <div className="text-4xl font-bold text-purple-900">
                ${comparison.recommendedPrice.toLocaleString()}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Source: {comparison.recommendationSource}
              </div>
            </div>

            {/* 统计数据 */}
            <div className="grid grid-cols-2 gap-4">
              <StatItem label="Average" value={comparison.avgPrice} />
              <StatItem label="Median" value={comparison.medianPrice} />
              <StatItem label="Min" value={comparison.minPrice} />
              <StatItem label="Max" value={comparison.maxPrice} />
            </div>

            {/* 偏差警告 */}
            {comparison.maxDeviationPercent > 1 && (
              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
                <div className="flex items-center gap-2 text-yellow-700">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Price Deviation Detected</span>
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  Max deviation: {comparison.maxDeviationPercent.toFixed(2)}%
                  {comparison.outlierProtocols.length > 0 && (
                    <span className="mt-1 block">
                      Outliers: {comparison.outlierProtocols.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-mono text-gray-900">${value.toLocaleString()}</div>
    </div>
  );
}

export const PriceComparisonCard = memo(PriceComparisonCardComponent);
