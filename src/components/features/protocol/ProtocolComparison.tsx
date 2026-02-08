'use client';

import { useState, useMemo } from 'react';

import { CheckCircle, BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { type OracleProtocol, PROTOCOL_DISPLAY_NAMES } from '@/lib/types';
import { cn } from '@/lib/utils';

export interface ProtocolMetrics {
  protocol: OracleProtocol;
  price: number;
  latency: number;
  uptime: number;
  confidence: number;
  updateFrequency: number;
  deviation: number;
  supportedChains: number;
}

export interface ProtocolComparisonProps {
  protocols: OracleProtocol[];
  symbol: string;
  className?: string;
}

const MOCK_METRICS: Record<OracleProtocol, ProtocolMetrics> = {
  chainlink: {
    protocol: 'chainlink',
    price: 3254.78,
    latency: 120,
    uptime: 99.9,
    confidence: 98.5,
    updateFrequency: 0.5,
    deviation: 0.25,
    supportedChains: 15,
  },
  pyth: {
    protocol: 'pyth',
    price: 3254.82,
    latency: 50,
    uptime: 99.95,
    confidence: 99.2,
    updateFrequency: 0.1,
    deviation: 0.15,
    supportedChains: 50,
  },
  band: {
    protocol: 'band',
    price: 3254.75,
    latency: 180,
    uptime: 99.8,
    confidence: 97.8,
    updateFrequency: 1.0,
    deviation: 0.35,
    supportedChains: 10,
  },
  api3: {
    protocol: 'api3',
    price: 3254.8,
    latency: 200,
    uptime: 99.85,
    confidence: 98.0,
    updateFrequency: 1.0,
    deviation: 0.5,
    supportedChains: 12,
  },
  redstone: {
    protocol: 'redstone',
    price: 3254.85,
    latency: 80,
    uptime: 99.9,
    confidence: 98.8,
    updateFrequency: 0.2,
    deviation: 0.2,
    supportedChains: 25,
  },
  switchboard: {
    protocol: 'switchboard',
    price: 3254.77,
    latency: 150,
    uptime: 99.75,
    confidence: 97.5,
    updateFrequency: 0.5,
    deviation: 0.3,
    supportedChains: 8,
  },
  flux: {
    protocol: 'flux',
    price: 3254.73,
    latency: 300,
    uptime: 99.7,
    confidence: 96.5,
    updateFrequency: 5.0,
    deviation: 0.8,
    supportedChains: 3,
  },
  dia: {
    protocol: 'dia',
    price: 3254.79,
    latency: 250,
    uptime: 99.8,
    confidence: 97.0,
    updateFrequency: 2.0,
    deviation: 0.6,
    supportedChains: 20,
  },
  uma: {
    protocol: 'uma',
    price: 3254.81,
    latency: 7200,
    uptime: 99.9,
    confidence: 95.0,
    updateFrequency: 7200,
    deviation: 1.0,
    supportedChains: 5,
  },
};

export function ProtocolComparison({ protocols, symbol, className }: ProtocolComparisonProps) {
  const [selectedProtocols, setSelectedProtocols] = useState<OracleProtocol[]>(
    protocols.slice(0, 3),
  );
  const [comparisonMetric, setComparisonMetric] = useState<keyof ProtocolMetrics>('latency');

  const metrics = useMemo(() => {
    return selectedProtocols.map((p) => MOCK_METRICS[p]);
  }, [selectedProtocols]);

  const bestProtocol = useMemo(() => {
    if (metrics.length === 0) return null;
    return metrics.reduce((best, current) => {
      // Lower is better for latency, deviation
      // Higher is better for uptime, confidence
      const isLowerBetter = ['latency', 'deviation', 'updateFrequency'].includes(
        comparisonMetric as string,
      );

      if (isLowerBetter) {
        return current[comparisonMetric] < best[comparisonMetric] ? current : best;
      } else {
        return current[comparisonMetric] > best[comparisonMetric] ? current : best;
      }
    });
  }, [metrics, comparisonMetric]);

  const formatValue = (metric: keyof ProtocolMetrics, value: number | string) => {
    switch (metric) {
      case 'price':
        return `$${Number(value).toLocaleString()}`;
      case 'latency':
        return `${value}ms`;
      case 'uptime':
      case 'confidence':
        return `${value}%`;
      case 'updateFrequency':
        return `${value}s`;
      case 'deviation':
        return `${value}%`;
      case 'supportedChains':
        return `${value} chains`;
      default:
        return String(value);
    }
  };

  const chartData = metrics.map((m) => ({
    name: PROTOCOL_DISPLAY_NAMES[m.protocol],
    value:
      comparisonMetric === 'latency'
        ? m.latency
        : comparisonMetric === 'uptime'
          ? m.uptime
          : comparisonMetric === 'confidence'
            ? m.confidence
            : comparisonMetric === 'deviation'
              ? m.deviation
              : m.updateFrequency,
    protocol: m.protocol,
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Protocol Comparison - {symbol}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Protocol Selector */}
        <div className="flex flex-wrap gap-2">
          {protocols.map((protocol) => (
            <Button
              key={protocol}
              variant={selectedProtocols.includes(protocol) ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (selectedProtocols.includes(protocol)) {
                  setSelectedProtocols(selectedProtocols.filter((p) => p !== protocol));
                } else if (selectedProtocols.length < 4) {
                  setSelectedProtocols([...selectedProtocols, protocol]);
                }
              }}
            >
              {PROTOCOL_DISPLAY_NAMES[protocol]}
            </Button>
          ))}
        </div>

        {/* Metric Selector */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Compare by:</span>
          <Select
            value={comparisonMetric}
            onValueChange={(value) => setComparisonMetric(value as keyof ProtocolMetrics)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latency">Latency</SelectItem>
              <SelectItem value="uptime">Uptime</SelectItem>
              <SelectItem value="confidence">Confidence</SelectItem>
              <SelectItem value="updateFrequency">Update Frequency</SelectItem>
              <SelectItem value="deviation">Deviation</SelectItem>
              <SelectItem value="supportedChains">Supported Chains</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Comparison Chart */}
        {metrics.length > 0 && (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-white p-3 shadow-lg">
                          <p className="font-semibold">{data.name}</p>
                          <p className="text-muted-foreground text-sm">
                            {formatValue(comparisonMetric, data.value)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={bestProtocol?.protocol === entry.protocol ? '#22c55e' : '#3b82f6'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Comparison Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Protocol</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Latency</TableHead>
              <TableHead>Uptime</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Update Freq</TableHead>
              <TableHead>Deviation</TableHead>
              <TableHead>Chains</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.map((metric) => (
              <TableRow
                key={metric.protocol}
                className={cn(bestProtocol?.protocol === metric.protocol && 'bg-green-50')}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {PROTOCOL_DISPLAY_NAMES[metric.protocol]}
                    {bestProtocol?.protocol === metric.protocol && (
                      <Badge className="bg-green-100 text-green-700">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Best
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{formatValue('price', metric.price)}</TableCell>
                <TableCell>{formatValue('latency', metric.latency)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={metric.uptime} className="w-16" />
                    {formatValue('uptime', metric.uptime)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={metric.confidence} className="w-16" />
                    {formatValue('confidence', metric.confidence)}
                  </div>
                </TableCell>
                <TableCell>{formatValue('updateFrequency', metric.updateFrequency)}</TableCell>
                <TableCell>{formatValue('deviation', metric.deviation)}</TableCell>
                <TableCell>{formatValue('supportedChains', metric.supportedChains)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Summary */}
        {bestProtocol && (
          <div className="bg-muted rounded-lg p-4">
            <h4 className="mb-2 font-semibold">Recommendation</h4>
            <p className="text-muted-foreground text-sm">
              Based on{' '}
              {comparisonMetric === 'latency' ? 'lowest latency' : 'highest ' + comparisonMetric},{' '}
              <span className="text-foreground font-medium">
                {PROTOCOL_DISPLAY_NAMES[bestProtocol.protocol]}
              </span>{' '}
              is currently the best choice for {symbol} price feeds with{' '}
              {formatValue(comparisonMetric, bestProtocol[comparisonMetric])}.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
