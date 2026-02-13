'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatPrice } from '@/shared/utils';
import type { CrossProtocolComparison } from '@/types';

interface PriceHistoryChartProps {
  data: CrossProtocolComparison[];
  symbol: string;
  className?: string;
}

export function PriceHistoryChart({ data, symbol, className }: PriceHistoryChartProps) {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>24h Price History - {symbol}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatTime}
                stroke="#71717a"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={['auto', 'auto']}
                stroke="#71717a"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(30, 41, 59, 0.95)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                  color: '#f8fafc',
                }}
                formatter={(value) => [formatPrice(value as number), '']}
                labelFormatter={(label) => new Date(label as string).toLocaleString()}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="recommendedPrice"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Recommended"
                activeDot={{ r: 6, fill: '#3b82f6' }}
              />
              <Line
                type="monotone"
                dataKey="avgPrice"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                name="Average"
                activeDot={{ r: 6, fill: '#22c55e' }}
              />
              <Line
                type="monotone"
                dataKey="medianPrice"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Median"
                activeDot={{ r: 6, fill: '#3b82f6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
