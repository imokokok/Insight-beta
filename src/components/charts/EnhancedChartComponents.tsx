/**
 * Enhanced Chart Components
 *
 * 增强版图表组件库
 * - 基于 Recharts 的封装
 * - 统一视觉风格
 * - 丰富的交互功能
 */

'use client';

import { useMemo, memo } from 'react';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';

import {
  CHART_COLORS,
  CHART_DIMENSIONS,
  CHART_ANIMATIONS,
  CHART_TYPOGRAPHY,
  CHART_THRESHOLDS,
  getStatusColorByValue,
  getSeriesColor,
  generateGradientId,
} from '@/lib/design-system/tokens/visualization';
import { cn, formatChangePercent, formatNumber } from '@/shared/utils';

// ============================================================================
// Types
// ============================================================================

interface ChartDataPoint {
  timestamp?: string | number;
  label?: string;
  value?: number;
  [key: string]: unknown;
}

interface ThresholdConfig {
  value: number;
  label: string;
  color: string;
  type: 'warning' | 'critical';
}

interface BaseChartProps {
  data: ChartDataPoint[];
  height?: number;
  className?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  valueFormatter?: (value: number) => string;
  labelFormatter?: (label: string | number) => string;
}

// ============================================================================
// Custom Tooltip Component
// ============================================================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    color: string;
    name: string;
  }>;
  label?: string | number;
  valueFormatter?: (value: number) => string;
  labelFormatter?: (label: string | number) => string;
  title?: string;
}

export const CustomTooltip = memo(function CustomTooltip({
  active,
  payload,
  label,
  valueFormatter = (v) => formatNumber(v, 2),
  labelFormatter = (l) => String(l),
  title,
}: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border/60 bg-background/95 p-3 shadow-lg backdrop-blur-md"
    >
      <div className="flex flex-col gap-2">
        {title && (
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
        )}
        <p className="text-xs font-medium text-foreground">{labelFormatter(label!)}</p>
        <div className="space-y-1.5">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-sm" style={{ backgroundColor: entry.color }} />
              <span className="flex-1 text-xs text-muted-foreground">{entry.name}</span>
              <span className="text-xs font-semibold text-foreground">
                {valueFormatter(entry.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
});

// ============================================================================
// Custom Legend Component
// ============================================================================

interface CustomLegendProps {
  payload?: Array<{
    value: string;
    color: string;
  }>;
  verticalAlign?: 'top' | 'middle' | 'bottom';
  align?: 'left' | 'center' | 'right';
}

export const CustomLegend = memo(function CustomLegend({ payload }: CustomLegendProps) {
  if (!payload || payload.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span className="text-xs text-muted-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
});

// ============================================================================
// Area Chart Component
// ============================================================================

interface EnhancedAreaChartProps extends BaseChartProps {
  dataKey?: string;
  color?: string;
  gradient?: boolean;
  showDots?: boolean;
  thresholds?: ThresholdConfig[];
  fillOpacity?: number;
  strokeWidth?: number;
  showValueLabels?: boolean;
}

export const EnhancedAreaChart = memo(function EnhancedAreaChart({
  data,
  height = CHART_DIMENSIONS.height.md,
  className,
  dataKey = 'value',
  color = CHART_COLORS.primary,
  gradient = true,
  showGrid = true,
  showDots = true,
  showLegend = false,
  thresholds = [],
  fillOpacity = 0.15,
  strokeWidth = 2,
  showValueLabels = false,
  valueFormatter = (v) => formatNumber(v, 2),
  labelFormatter = (l) => String(l),
  ariaLabel,
}: EnhancedAreaChartProps & { ariaLabel?: string }) {
  const gradientId = useMemo(() => generateGradientId(color, 'area'), [color]);

  const hasCritical = useMemo(() => thresholds.some((t) => t.type === 'critical'), [thresholds]);

  return (
    <div className={cn('w-full', className)} role="img" aria-label={ariaLabel || '数据图表'}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
          {gradient && (
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
          )}

          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_COLORS.grid.line}
              strokeOpacity={0.3}
              vertical={false}
            />
          )}

          <XAxis
            dataKey="timestamp"
            tickFormatter={labelFormatter}
            stroke={CHART_COLORS.grid.axis}
            strokeOpacity={0.5}
            fontSize={CHART_TYPOGRAPHY.axis.fontSize}
            tickLine={false}
            axisLine={false}
            dy={10}
          />

          <YAxis
            tickFormatter={valueFormatter}
            stroke={CHART_COLORS.grid.axis}
            strokeOpacity={0.5}
            fontSize={CHART_TYPOGRAPHY.axis.fontSize}
            tickLine={false}
            axisLine={false}
            width={60}
            tickCount={5}
          />

          {thresholds.map((threshold, index) => (
            <ReferenceLine
              key={index}
              y={threshold.value}
              stroke={threshold.color}
              strokeDasharray="4 4"
              strokeWidth={1}
              strokeOpacity={0.7}
              label={{
                value: threshold.label,
                fill: threshold.color,
                fontSize: 10,
                position: 'right',
              }}
            />
          ))}

          {hasCritical &&
            thresholds.map((t, i) =>
              t.type === 'critical' ? (
                <ReferenceArea
                  key={i}
                  y1={t.value}
                  y2={Math.max(...data.map((d) => (d[dataKey] as number) || 0)) * 1.1}
                  fill={t.color}
                  fillOpacity={0.03}
                />
              ) : null,
            )}

          {showLegend && <Legend content={<CustomLegend />} />}

          <Tooltip
            content={
              <CustomTooltip valueFormatter={valueFormatter} labelFormatter={labelFormatter} />
            }
            cursor={{ stroke: color, strokeWidth: 1, strokeOpacity: 0.3 }}
          />

          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={strokeWidth}
            fill={gradient ? `url(#${gradientId})` : color}
            dot={
              showDots
                ? {
                    r: 3,
                    strokeWidth: 2,
                    stroke: color,
                    fill: 'var(--background)',
                    strokeOpacity: 0.8,
                  }
                : false
            }
            activeDot={{
              r: 6,
              strokeWidth: 3,
              stroke: color,
              fill: 'var(--background)',
              strokeOpacity: 1,
            }}
            animationDuration={CHART_ANIMATIONS.chart.animationDuration}
            animationEasing={CHART_ANIMATIONS.chart.animationEasing}
            label={
              showValueLabels
                ? {
                    position: 'top',
                    fontSize: 10,
                    fill: 'var(--muted-foreground)',
                    formatter: (value: unknown) => valueFormatter(value as number),
                  }
                : false
            }
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

// ============================================================================
// Line Chart Component
// ============================================================================

interface EnhancedLineChartProps extends BaseChartProps {
  lines: Array<{
    dataKey: string;
    name: string;
    color?: string;
    strokeWidth?: number;
  }>;
  showDots?: boolean;
  showArea?: boolean;
}

export const EnhancedLineChart = memo(function EnhancedLineChart({
  data,
  height = CHART_DIMENSIONS.height.md,
  className,
  lines,
  showGrid = true,
  showDots = true,
  showArea = false,
  showLegend = true,
  showValueLabels = false,
  valueFormatter = (v) => formatNumber(v, 2),
  labelFormatter = (l) => String(l),
  ariaLabel,
}: EnhancedLineChartProps & { ariaLabel?: string; showValueLabels?: boolean }) {
  return (
    <div className={cn('w-full', className)} role="img" aria-label={ariaLabel || '数据图表'}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_COLORS.grid.line}
              strokeOpacity={0.3}
              vertical={false}
            />
          )}

          <XAxis
            dataKey="timestamp"
            tickFormatter={labelFormatter}
            stroke={CHART_COLORS.grid.axis}
            strokeOpacity={0.5}
            fontSize={CHART_TYPOGRAPHY.axis.fontSize}
            tickLine={false}
            axisLine={false}
            dy={10}
          />

          <YAxis
            tickFormatter={valueFormatter}
            stroke={CHART_COLORS.grid.axis}
            strokeOpacity={0.5}
            fontSize={CHART_TYPOGRAPHY.axis.fontSize}
            tickLine={false}
            axisLine={false}
            width={60}
            tickCount={5}
          />

          {showLegend && <Legend content={<CustomLegend />} />}

          <Tooltip
            content={
              <CustomTooltip valueFormatter={valueFormatter} labelFormatter={labelFormatter} />
            }
            cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1, strokeOpacity: 0.3 }}
          />

          {lines.map((line, index) => {
            const lineColor = line.color || getSeriesColor(index);
            return (
              <Line
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                name={line.name}
                stroke={lineColor}
                strokeWidth={line.strokeWidth || 2}
                dot={
                  showDots
                    ? {
                        r: 3,
                        strokeWidth: 2,
                        stroke: lineColor,
                        fill: 'var(--background)',
                        strokeOpacity: 0.8,
                      }
                    : false
                }
                activeDot={{
                  r: 6,
                  strokeWidth: 3,
                  stroke: lineColor,
                  fill: 'var(--background)',
                  strokeOpacity: 1,
                }}
                fill={lineColor}
                fillOpacity={showArea ? 0.1 : 0}
                animationDuration={CHART_ANIMATIONS.chart.animationDuration}
                label={
                  showValueLabels
                    ? {
                        position: 'top',
                        fontSize: 10,
                        fill: 'var(--muted-foreground)',
                        formatter: (value: unknown) => valueFormatter(value as number),
                      }
                    : false
                }
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

// ============================================================================
// Bar Chart Component
// ============================================================================

interface EnhancedBarChartProps extends BaseChartProps {
  bars: Array<{
    dataKey: string;
    name: string;
    color?: string;
    stackId?: string;
  }>;
  layout?: 'horizontal' | 'vertical';
  showBackground?: boolean;
  showValueLabels?: boolean;
  barRadius?: number | [number, number, number, number];
}

export const EnhancedBarChart = memo(function EnhancedBarChart({
  data,
  height = CHART_DIMENSIONS.height.md,
  className,
  bars,
  layout = 'horizontal',
  showGrid = true,
  showLegend = true,
  showBackground = false,
  showValueLabels = false,
  barRadius = [4, 4, 0, 0],
  valueFormatter = (v) => formatNumber(v, 2),
  labelFormatter = (l) => String(l),
  ariaLabel,
}: EnhancedBarChartProps & { ariaLabel?: string }) {
  return (
    <div className={cn('w-full', className)} role="img" aria-label={ariaLabel || '数据图表'}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout={layout} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_COLORS.grid.line}
              strokeOpacity={0.3}
              horizontal={layout === 'horizontal'}
              vertical={layout === 'vertical'}
            />
          )}

          <XAxis
            type={layout === 'horizontal' ? 'category' : 'number'}
            dataKey={layout === 'horizontal' ? 'label' : undefined}
            tickFormatter={layout === 'horizontal' ? labelFormatter : valueFormatter}
            stroke={CHART_COLORS.grid.axis}
            strokeOpacity={0.5}
            fontSize={CHART_TYPOGRAPHY.axis.fontSize}
            tickLine={false}
            axisLine={false}
            dy={10}
          />

          <YAxis
            type={layout === 'horizontal' ? 'number' : 'category'}
            dataKey={layout === 'vertical' ? 'label' : undefined}
            tickFormatter={layout === 'horizontal' ? valueFormatter : labelFormatter}
            stroke={CHART_COLORS.grid.axis}
            strokeOpacity={0.5}
            fontSize={CHART_TYPOGRAPHY.axis.fontSize}
            tickLine={false}
            axisLine={false}
            width={60}
            tickCount={5}
          />

          {showLegend && <Legend content={<CustomLegend />} />}

          <Tooltip
            content={
              <CustomTooltip valueFormatter={valueFormatter} labelFormatter={labelFormatter} />
            }
            cursor={{ fill: 'var(--muted)', fillOpacity: 0.2 }}
          />

          {bars.map((bar, index) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              name={bar.name}
              fill={bar.color || getSeriesColor(index)}
              stackId={bar.stackId}
              radius={barRadius}
              background={showBackground ? { fill: 'var(--muted)', fillOpacity: 0.3 } : undefined}
              animationDuration={CHART_ANIMATIONS.chart.animationDuration}
              label={
                showValueLabels
                  ? {
                      position: layout === 'horizontal' ? 'top' : 'right',
                      fontSize: 10,
                      fill: 'var(--muted-foreground)',
                      formatter: (value: unknown) => valueFormatter(value as number),
                    }
                  : false
              }
            >
              {bar.color
                ? null
                : data.map((_, i) => <Cell key={`cell-${i}`} fill={getSeriesColor(i)} />)}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

// ============================================================================
// Sparkline Component
// ============================================================================

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showArea?: boolean;
  className?: string;
}

export const Sparkline = memo(function Sparkline({
  data,
  width = 120,
  height = 40,
  color = CHART_COLORS.primary,
  showArea = true,
  className,
  ariaLabel,
}: SparklineProps & { ariaLabel?: string }) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return { x, y, value };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const areaPathD = showArea ? `${pathD} L ${width} ${height} L 0 ${height} Z` : '';

  const firstValue = data[0] ?? 0;
  const lastValue = data[data.length - 1] ?? 0;
  const trend = lastValue - firstValue;
  const trendColor = trend >= 0 ? CHART_COLORS.success : CHART_COLORS.error;

  const lastPoint = points[points.length - 1];

  return (
    <div
      className={cn('flex items-center gap-2', className)}
      role="img"
      aria-label={ariaLabel || '趋势图'}
    >
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {showArea && <path d={areaPathD} fill="url(#sparklineGradient)" />}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {lastPoint && <circle cx={lastPoint.x} cy={lastPoint.y} r="3" fill={color} />}
      </svg>
      <div className="flex items-center gap-1">
        {trend >= 0 ? (
          <TrendingUp className="h-3 w-3" style={{ color: trendColor }} />
        ) : (
          <TrendingDown className="h-3 w-3" style={{ color: trendColor }} />
        )}
        <span className="text-xs font-medium" style={{ color: trendColor }}>
          {formatChangePercent(trend / firstValue, 1, false)}
        </span>
      </div>
    </div>
  );
});

// ============================================================================
// Stat Comparison Component
// ============================================================================

interface StatComparisonProps {
  current: number;
  previous: number;
  label?: string;
  unit?: string;
  className?: string;
  reverseTrend?: boolean;
}

export const StatComparison = memo(function StatComparison({
  current,
  previous,
  label,
  unit = '',
  className,
  reverseTrend = false,
  ariaLabel,
}: StatComparisonProps & { ariaLabel?: string }) {
  const change = previous !== 0 ? ((current - previous) / previous) * 100 : 0;
  const isPositive = reverseTrend ? change < 0 : change > 0;
  const trendColor = isPositive ? CHART_COLORS.success : CHART_COLORS.error;

  return (
    <div
      className={cn('flex items-center gap-3', className)}
      role="img"
      aria-label={ariaLabel || '统计数据对比'}
    >
      <div className="flex-1">
        {label && <p className="mb-1 text-xs text-muted-foreground">{label}</p>}
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-foreground">{formatNumber(current, 2)}</span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 rounded-full bg-muted px-2 py-1">
        {isPositive ? (
          <TrendingUp className="h-3.5 w-3.5" style={{ color: trendColor }} />
        ) : (
          <TrendingDown className="h-3.5 w-3.5" style={{ color: trendColor }} />
        )}
        <span className="text-xs font-semibold" style={{ color: trendColor }}>
          {formatChangePercent(change / 100, 1, false)}
        </span>
      </div>
    </div>
  );
});

// ============================================================================
// Export
// ============================================================================

export {
  CHART_COLORS,
  CHART_DIMENSIONS,
  CHART_ANIMATIONS,
  CHART_TYPOGRAPHY,
  CHART_THRESHOLDS,
  getStatusColorByValue,
  getSeriesColor,
  generateGradientId,
};

export type {
  ChartDataPoint,
  ThresholdConfig,
  BaseChartProps,
  EnhancedAreaChartProps,
  EnhancedLineChartProps,
  EnhancedBarChartProps,
  SparklineProps,
  StatComparisonProps,
};
