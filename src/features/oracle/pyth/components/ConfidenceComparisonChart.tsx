'use client';

import { useMemo, useState } from 'react';

import { motion } from 'framer-motion';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import { Checkbox } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useI18n } from '@/i18n';

interface PriceSourceData {
  name: string;
  symbol: string;
  color: string;
  data: Array<{
    timestamp: string;
    confidence: number;
    avgConfidence: number;
  }>;
}

const priceSources: PriceSourceData[] = [
  {
    name: 'Binance',
    symbol: 'BTC/USD',
    color: '#F0B90B',
    data: [],
  },
  {
    name: 'OKX',
    symbol: 'BTC/USD',
    color: '#000000',
    data: [],
  },
  {
    name: 'Coinbase',
    symbol: 'BTC/USD',
    color: '#0052FF',
    data: [],
  },
  {
    name: 'Kraken',
    symbol: 'BTC/USD',
    color: '#5741D9',
    data: [],
  },
  {
    name: 'Bybit',
    symbol: 'BTC/USD',
    color: '#F7A600',
    data: [],
  },
];

const generateMockData = (): PriceSourceData[] => {
  const baseTime = Date.now() - 3600000 * 24;
  const interval = 60000 * 30;
  const dataPoints = 48;

  return priceSources.map((source) => {
    const data = [];
    let baseConfidence = 1 + Math.random() * 2;

    for (let i = 0; i < dataPoints; i++) {
      const timestamp = new Date(baseTime + i * interval).toISOString();
      const variation = (Math.random() - 0.5) * 0.8;
      const confidence = Math.max(0.5, Math.min(4, baseConfidence + variation));

      baseConfidence += (Math.random() - 0.5) * 0.2;

      data.push({
        timestamp,
        confidence,
        avgConfidence: confidence * (0.95 + Math.random() * 0.1),
      });
    }

    return { ...source, data };
  });
};

interface ConfidenceComparisonChartProps {
  isLoading?: boolean;
}

export function ConfidenceComparisonChart({ isLoading }: ConfidenceComparisonChartProps) {
  const { t } = useI18n();
  const [selectedSources, setSelectedSources] = useState<string[]>(['Binance', 'OKX', 'Coinbase']);
  const [mockData] = useState<PriceSourceData[]>(() => generateMockData());

  const toggleSource = (name: string) => {
    setSelectedSources((prev) => {
      if (prev.includes(name)) {
        return prev.filter((s) => s !== name);
      }
      if (prev.length >= 5) {
        return prev;
      }
      return [...prev, name];
    });
  };

  const chartData = useMemo(() => {
    if (selectedSources.length === 0) return [];

    const firstSource = mockData.find((s) => s.name === selectedSources[0]);
    if (!firstSource) return [];

    return firstSource.data.map((point, index) => {
      const row: Record<string, string | number> = {
        time: new Date(point.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      selectedSources.forEach((sourceName) => {
        const source = mockData.find((s) => s.name === sourceName);
        if (source && source.data[index]) {
          row[`${sourceName}_confidence`] = source.data[index].confidence;
        }
      });

      return row;
    });
  }, [selectedSources, mockData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {t('oracle.pyth.confidenceComparisonTitle') || '多价格源置信区间对比'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>
            {t('oracle.pyth.confidenceComparisonTitle') || '多价格源置信区间对比'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-4">
            {mockData.map((source) => (
              <div key={source.name} className="flex items-center gap-2">
                <Checkbox
                  id={source.name}
                  checked={selectedSources.includes(source.name)}
                  onCheckedChange={() => toggleSource(source.name)}
                  disabled={!selectedSources.includes(source.name) && selectedSources.length >= 5}
                />
                <label
                  htmlFor={source.name}
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: source.color }}
                  />
                  {source.name}
                </label>
              </div>
            ))}
          </div>

          {chartData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              请选择至少一个价格源进行对比
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10 }}
                    className="text-muted-foreground"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    domain={[0, 'auto']}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    tickFormatter={(value) => `${value.toFixed(2)}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number | undefined) =>
                      value !== undefined ? [`${value.toFixed(3)}%`, ''] : ['', '']
                    }
                  />
                  <Legend />
                  {selectedSources.map((sourceName) => {
                    const source = mockData.find((s) => s.name === sourceName);
                    if (!source) return null;

                    return (
                      <Area
                        key={sourceName}
                        type="monotone"
                        dataKey={`${sourceName}_confidence`}
                        name={sourceName}
                        fill={source.color}
                        fillOpacity={0.15}
                        stroke={source.color}
                        strokeWidth={2}
                      />
                    );
                  })}
                  {selectedSources.map((sourceName) => {
                    const source = mockData.find((s) => s.name === sourceName);
                    if (!source) return null;

                    return (
                      <Line
                        key={`${sourceName}_line`}
                        type="monotone"
                        dataKey={`${sourceName}_confidence`}
                        name={`${sourceName} (线)`}
                        stroke={source.color}
                        strokeWidth={2}
                        dot={false}
                        hide
                      />
                    );
                  })}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export type { PriceSourceData };
