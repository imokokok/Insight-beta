'use client';

import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n';

export interface PriceDataPoint {
  timestamp: number;
  [protocol: string]: number;
}

interface MultiProtocolChartProps {
  data: PriceDataPoint[];
  protocols: string[];
  symbol: string;
  loading?: boolean;
  className?: string;
}

const PROTOCOL_COLORS: Record<string, string> = {
  Chainlink: '#375bd2',
  Pyth: '#a855f7',
  Band: '#f59e0b',
  API3: '#10b981',
  DIA: '#ec4899',
  RedStone: '#ef4444',
  Flux: '#06b6d4',
  default: '#6366f1',
};

export function MultiProtocolChart({
  data,
  protocols,
  symbol,
  loading,
  className,
}: MultiProtocolChartProps) {
  const { t } = useI18n();
  const [visibleProtocols, setVisibleProtocols] = useState<Set<string>>(
    new Set(protocols)
  );
  const [showAverage, setShowAverage] = useState(true);

  const formattedData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      time: new Date(point.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));
  }, [data]);

  const averagePrice = useMemo(() => {
    if (data.length === 0) return 0;
    const lastPoint = data[data.length - 1];
    const prices = protocols
      .filter((p) => visibleProtocols.has(p))
      .map((p) => lastPoint[p] || 0)
      .filter((p) => p > 0);
    return prices.length > 0
      ? prices.reduce((sum, p) => sum + p, 0) / prices.length
      : 0;
  }, [data, protocols, visibleProtocols]);

  const maxDeviation = useMemo(() => {
    if (data.length === 0 || averagePrice === 0) return 0;
    const lastPoint = data[data.length - 1];
    const prices = protocols
      .filter((p) => visibleProtocols.has(p))
      .map((p) => lastPoint[p] || 0)
      .filter((p) => p > 0);
    if (prices.length < 2) return 0;
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    return ((maxPrice - minPrice) / averagePrice) * 100;
  }, [data, protocols, visibleProtocols, averagePrice]);

  const toggleProtocol = (protocol: string) => {
    const newVisible = new Set(visibleProtocols);
    if (newVisible.has(protocol)) {
      newVisible.delete(protocol);
    } else {
      newVisible.add(protocol);
    }
    setVisibleProtocols(newVisible);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {symbol}
            <Badge variant="outline">
              {t('dashboard:chart.spread')}: {maxDeviation.toFixed(2)}%
            </Badge>
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            {protocols.map((protocol) => (
              <Button
                key={protocol}
                variant={visibleProtocols.has(protocol) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleProtocol(protocol)}
                className="text-xs"
                style={{
                  backgroundColor: visibleProtocols.has(protocol)
                    ? PROTOCOL_COLORS[protocol] || PROTOCOL_COLORS.default
                    : undefined,
                }}
              >
                {protocol}
              </Button>
            ))}
            <Button
              variant={showAverage ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowAverage(!showAverage)}
              className="text-xs"
            >
              {t('dashboard:chart.average')}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string) => [
                  `$${value.toFixed(4)}`,
                  name,
                ]}
              />
              <Legend />

              {protocols.map(
                (protocol) =>
                  visibleProtocols.has(protocol) && (
                    <Line
                      key={protocol}
                      type="monotone"
                      dataKey={protocol}
                      stroke={PROTOCOL_COLORS[protocol] || PROTOCOL_COLORS.default}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  )
              )}

              {showAverage && averagePrice > 0 && (
                <ReferenceLine
                  y={averagePrice}
                  stroke="#6366f1"
                  strokeDasharray="5 5"
                  label={{
                    value: t('dashboard:chart.average'),
                    position: 'right',
                    fill: '#6366f1',
                  }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
