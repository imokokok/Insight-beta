/**
 * CrossProtocolChart Component
 *
 * 跨协议价格走势图表组件
 * 展示多个预言机协议的价格历史对比
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, LineChart, Calendar, AlertCircle } from 'lucide-react';
import { logger } from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

interface PricePoint {
  timestamp: string;
  price: number;
}

interface ProtocolPriceHistory {
  protocol: string;
  chain: string;
  symbol: string;
  data: PricePoint[];
  color: string;
}

interface ChartData {
  symbol: string;
  timeframe: string;
  protocols: ProtocolPriceHistory[];
  startTime: string;
  endTime: string;
}

// ============================================================================
// Component
// ============================================================================

const PROTOCOL_COLORS: Record<string, string> = {
  chainlink: '#3b82f6',
  pyth: '#8b5cf6',
  band: '#10b981',
  api3: '#f59e0b',
  redstone: '#ef4444',
  flux: '#06b6d4',
  dia: '#ec4899',
};

export function CrossProtocolChart() {
  const [symbol, setSymbol] = useState('ETH/USD');
  const [timeframe, setTimeframe] = useState('1d');
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChartData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/oracle/unified?action=history&symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}`,
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch chart data: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setChartData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch chart data';
      setError(errorMessage);
      logger.error('Failed to fetch chart data', { error: err, symbol, timeframe });
    }
    setLoading(false);
  }, [symbol, timeframe]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  const timeframes = [
    { value: '1h', label: '1小时' },
    { value: '6h', label: '6小时' },
    { value: '1d', label: '1天' },
    { value: '7d', label: '7天' },
    { value: '30d', label: '30天' },
  ];

  const popularSymbols = ['ETH/USD', 'BTC/USD', 'LINK/USD', 'MATIC/USD', 'ARB/USD'];

  // Simple SVG line chart implementation
  const renderChart = () => {
    if (!chartData || chartData.protocols.length === 0) return null;

    const width = 800;
    const height = 300;
    const padding = { top: 20, right: 80, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Find min/max prices across all protocols
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    chartData.protocols.forEach((protocol) => {
      protocol.data.forEach((point) => {
        minPrice = Math.min(minPrice, point.price);
        maxPrice = Math.max(maxPrice, point.price);
      });
    });

    // Add some padding to the range
    const priceRange = maxPrice - minPrice;
    minPrice -= priceRange * 0.05;
    maxPrice += priceRange * 0.05;

    const timeRange =
      new Date(chartData.endTime).getTime() - new Date(chartData.startTime).getTime();

    const scaleX = (timestamp: string) => {
      const time = new Date(timestamp).getTime();
      const ratio = (time - new Date(chartData.startTime).getTime()) / timeRange;
      return padding.left + ratio * chartWidth;
    };

    const scaleY = (price: number) => {
      const ratio = (price - minPrice) / (maxPrice - minPrice);
      return padding.top + chartHeight - ratio * chartHeight;
    };

    const formatChartPrice = (price: number) => {
      if (price >= 1000) {
        return `$${(price / 1000).toFixed(2)}k`;
      }
      return `$${price.toFixed(2)}`;
    };

    const formatTime = (timestamp: string) => {
      const date = new Date(timestamp);
      if (timeframe === '1h' || timeframe === '6h') {
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    };

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <g key={`grid-${i}`}>
            <line
              x1={padding.left}
              y1={padding.top + ratio * chartHeight}
              x2={padding.left + chartWidth}
              y2={padding.top + ratio * chartHeight}
              stroke="#e5e7eb"
              strokeDasharray="4"
            />
            <text
              x={padding.left - 10}
              y={padding.top + ratio * chartHeight + 4}
              textAnchor="end"
              className="fill-gray-500 text-xs"
            >
              {formatChartPrice(maxPrice - ratio * (maxPrice - minPrice))}
            </text>
          </g>
        ))}

        {/* Time labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const timestamp = new Date(
            new Date(chartData.startTime).getTime() + ratio * timeRange,
          ).toISOString();
          return (
            <text
              key={`time-${i}`}
              x={padding.left + ratio * chartWidth}
              y={height - 10}
              textAnchor="middle"
              className="fill-gray-500 text-xs"
            >
              {formatTime(timestamp)}
            </text>
          );
        })}

        {/* Protocol lines */}
        {chartData.protocols.map((protocol) => {
          if (protocol.data.length < 2) return null;

          const pathData = protocol.data
            .map((point, i) => {
              const x = scaleX(point.timestamp);
              const y = scaleY(point.price);
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            })
            .join(' ');

          const color = protocol.color || PROTOCOL_COLORS[protocol.protocol] || '#666';

          return (
            <g key={`${protocol.protocol}-${protocol.chain}`}>
              <path
                d={pathData}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Legend */}
              <g
                transform={`translate(${width - padding.right + 10}, ${padding.top + chartData.protocols.indexOf(protocol) * 25})`}
              >
                <line x1={0} y1={0} x2={20} y2={0} stroke={color} strokeWidth={2} />
                <text x={25} y={4} className="fill-gray-700 text-xs">
                  {protocol.protocol.toUpperCase()}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <LineChart className="h-5 w-5" />
            跨协议价格走势
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchChartData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-4 pt-2 sm:flex-row">
          {/* Symbol selector */}
          <div className="flex flex-wrap gap-2">
            {popularSymbols.map((sym) => (
              <Badge
                key={sym}
                variant={symbol === sym ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSymbol(sym)}
              >
                {sym}
              </Badge>
            ))}
          </div>

          {/* Timeframe selector */}
          <div className="flex gap-2">
            {timeframes.map((tf) => (
              <Button
                key={tf.value}
                variant={timeframe === tf.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeframe(tf.value)}
              >
                <Calendar className="mr-1 h-3 w-3" />
                {tf.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !chartData ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="text-muted-foreground h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-500" />
            <p className="text-red-600">{error}</p>
          </div>
        ) : chartData && chartData.protocols.length > 0 ? (
          <div className="space-y-4">
            {/* Chart */}
            <div className="bg-muted/30 rounded-lg p-4">{renderChart()}</div>

            {/* Stats summary */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {chartData.protocols.slice(0, 4).map((protocol) => {
                const latestPrice = protocol.data[protocol.data.length - 1]?.price || 0;
                const firstPrice = protocol.data[0]?.price || 0;
                const change = ((latestPrice - firstPrice) / firstPrice) * 100;

                return (
                  <div key={protocol.protocol} className="bg-muted/50 rounded-lg p-3">
                    <p className="text-muted-foreground mb-1 text-xs">
                      {protocol.protocol.toUpperCase()}
                    </p>
                    <p className="font-mono text-lg font-semibold">
                      ${latestPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                    <p className={`text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {change >= 0 ? '+' : ''}
                      {change.toFixed(2)}%
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Update time */}
            <p className="text-muted-foreground text-right text-xs">
              数据时间: {new Date(chartData.endTime).toLocaleString()}
            </p>
          </div>
        ) : (
          <div className="py-12 text-center">
            <LineChart className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
            <p className="text-muted-foreground">暂无历史数据</p>
            <p className="text-muted-foreground mt-2 text-sm">选择交易对和时间范围查看价格走势</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CrossProtocolChart;
