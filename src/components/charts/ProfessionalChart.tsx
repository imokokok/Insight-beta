/**
 * Professional Chart Components
 * 
 * 企业级监控平台图表组件
 * - 统一的视觉风格
 * - 专业的数据展示
 * - 响应式设计
 */

'use client';

import { useMemo } from 'react';
import {
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  AreaChart,
} from 'recharts';
import { cn, formatChangePercent } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface ChartDataPoint {
  timestamp: string | number;
  value: number;
  [key: string]: unknown;
}

interface ThresholdConfig {
  value: number;
  label: string;
  color: string;
  type: 'warning' | 'critical';
}

interface ProfessionalChartProps {
  data: ChartDataPoint[];
  height?: number;
  className?: string;
  title?: string;
  subtitle?: string;
  thresholds?: ThresholdConfig[];
  showGrid?: boolean;
  showDots?: boolean;
  color?: string;
  gradient?: boolean;
  valueFormatter?: (value: number) => string;
  timeFormatter?: (timestamp: string | number) => string;
}

// ============================================================================
// Professional Line Chart
// ============================================================================

export function ProfessionalLineChart({
  data,
  height = 300,
  className,
  title,
  subtitle,
  thresholds = [],
  showGrid = true,
  showDots = false,
  color = '#8b5cf6',
  gradient = true,
  valueFormatter = (v) => v.toFixed(2),
  timeFormatter = (t) => new Date(t).toLocaleTimeString(),
}: ProfessionalChartProps) {
  const hasCritical = useMemo(
    () => thresholds.some((t) => t.type === 'critical'),
    [thresholds]
  );

  return (
    <div className={cn('rounded-2xl border border-purple-100 bg-white p-6', className)}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          {/* Gradient Definition */}
          {gradient && (
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
          )}

          {/* Grid */}
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              vertical={false}
            />
          )}

          {/* Axes */}
          <XAxis
            dataKey="timestamp"
            tickFormatter={timeFormatter}
            stroke="#9ca3af"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={valueFormatter}
            stroke="#9ca3af"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={60}
          />

          {/* Thresholds */}
          {thresholds.map((threshold, index) => (
            <ReferenceLine
              key={index}
              y={threshold.value}
              stroke={threshold.color}
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: threshold.label,
                fill: threshold.color,
                fontSize: 11,
                position: 'right',
              }}
            />
          ))}

          {/* Critical Area */}
          {hasCritical && thresholds.map((t, i) =>
            t.type === 'critical' ? (
              <ReferenceArea
                key={i}
                y1={t.value}
                y2={Math.max(...data.map((d) => d.value)) * 1.1}
                fill={t.color}
                fillOpacity={0.05}
              />
            ) : null
          )}

          {/* Area */}
          {gradient && (
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill="url(#chartGradient)"
              dot={showDots}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          )}

          {/* Line */}
          {!gradient && (
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={showDots}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          )}

          {/* Tooltip */}
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length || label == null) return null;
              return (
                <div className="rounded-lg border border-purple-100 bg-white p-3 shadow-lg">
                  <p className="text-xs text-gray-500 mb-1">
                    {timeFormatter(label)}
                  </p>
                  <p className="text-lg font-semibold" style={{ color }}>
                    {valueFormatter(payload[0].value as number)}
                  </p>
                </div>
              );
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// Heatmap Component
// ============================================================================

interface HeatmapData {
  x: string;
  y: string;
  value: number;
}

interface ProfessionalHeatmapProps {
  data: HeatmapData[];
  xLabels: string[];
  yLabels: string[];
  className?: string;
  title?: string;
  colorScale?: string[];
  valueFormatter?: (value: number) => string;
}

export function ProfessionalHeatmap({
  data,
  xLabels,
  yLabels,
  className,
  title,
  colorScale = ['#dcfce7', '#86efac', '#facc15', '#fb923c', '#ef4444'],
  valueFormatter = (v) => `${v.toFixed(2)}%`,
}: ProfessionalHeatmapProps) {
  const maxValue = useMemo(
    () => Math.max(...data.map((d) => d.value)),
    [data]
  );

  const getColor = (value: number) => {
    const ratio = value / maxValue;
    const index = Math.min(
      Math.floor(ratio * colorScale.length),
      colorScale.length - 1
    );
    return colorScale[index];
  };

  return (
    <div className={cn('rounded-2xl border border-purple-100 bg-white p-6', className)}>
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}

      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Header */}
          <div className="flex">
            <div className="w-32 flex-shrink-0" /> {/* Empty corner */}
            {xLabels.map((label) => (
              <div
                key={label}
                className="w-24 flex-shrink-0 px-2 py-2 text-center text-xs font-medium text-gray-600"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Rows */}
          {yLabels.map((yLabel) => (
            <div key={yLabel} className="flex">
              <div className="w-32 flex-shrink-0 px-2 py-3 text-sm font-medium text-gray-700 flex items-center">
                {yLabel}
              </div>
              {xLabels.map((xLabel) => {
                const cell = data.find((d) => d.x === xLabel && d.y === yLabel);
                const value = cell?.value ?? 0;
                return (
                  <div
                    key={`${xLabel}-${yLabel}`}
                    className="w-24 flex-shrink-0 p-1"
                  >
                    <div
                      className="h-full rounded-lg py-3 px-2 text-center transition-all hover:scale-105 cursor-pointer"
                      style={{ backgroundColor: getColor(value) }}
                      title={`${yLabel} - ${xLabel}: ${valueFormatter(value)}`}
                    >
                      <span
                        className={cn(
                          'text-sm font-semibold',
                          value > maxValue * 0.5 ? 'text-white' : 'text-gray-800'
                        )}
                      >
                        {valueFormatter(value)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-end gap-2">
        <span className="text-xs text-gray-500">Low</span>
        {colorScale.map((color, i) => (
          <div
            key={i}
            className="w-6 h-3 rounded"
            style={{ backgroundColor: color }}
          />
        ))}
        <span className="text-xs text-gray-500">High</span>
      </div>
    </div>
  );
}

// ============================================================================
// Metric Card with Sparkline
// ============================================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: number;
  changeLabel?: string;
  sparklineData?: number[];
  status?: 'healthy' | 'warning' | 'critical';
  className?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
}

export function MetricCard({
  title,
  value,
  unit,
  change,
  changeLabel = 'vs last hour',
  sparklineData,
  status = 'healthy',
  className,
  onClick,
  icon,
}: MetricCardProps) {
  const statusColors = {
    healthy: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
    critical: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500' },
  };

  const colors = statusColors[status];

  return (
    <div
      className={cn(
        'rounded-2xl border p-5 transition-all hover:shadow-md cursor-pointer',
        colors.bg,
        colors.border,
        className
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-600">{title}</span>
        <div className="flex items-center gap-2">
          {icon && <div className="text-gray-400">{icon}</div>}
          <div className={cn('w-2 h-2 rounded-full', colors.dot)} />
        </div>
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        {unit && <span className="text-sm text-gray-500">{unit}</span>}
      </div>

      {/* Change */}
      {change !== undefined && (
        <div className="flex items-center gap-2 mb-3">
          <span
            className={cn(
              'text-sm font-medium',
              change >= 0 ? 'text-emerald-600' : 'text-rose-600'
            )}
          >
            {change >= 0 ? '↑' : '↓'} {formatChangePercent(change / 100, 2, false)}
          </span>
          <span className="text-xs text-gray-400">{changeLabel}</span>
        </div>
      )}

      {/* Sparkline */}
      {sparklineData && sparklineData.length > 1 && (
        <div className="h-10 mt-2">
          <svg viewBox="0 0 100 20" className="w-full h-full" preserveAspectRatio="none">
            <path
              d={sparklineData
                .map((v, i) => {
                  const x = (i / (sparklineData.length - 1)) * 100;
                  const min = Math.min(...sparklineData);
                  const max = Math.max(...sparklineData);
                  const y = 20 - ((v - min) / (max - min || 1)) * 20;
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                })
                .join(' ')}
              fill="none"
              stroke={status === 'healthy' ? '#10b981' : status === 'warning' ? '#f59e0b' : '#ef4444'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
