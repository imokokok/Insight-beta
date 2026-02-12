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
import {
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';

import {
  CHART_COLORS,
  CHART_DIMENSIONS,
  CHART_ANIMATIONS,
  CHART_TYPOGRAPHY,
  CHART_THRESHOLDS,
  getStatusColor,
  getHealthColor,
  getSeriesColor,
  generateGradientId,
} from '@/lib/design-system/tokens/visualization';
import { cn, formatChangePercent, formatNumber } from '@/lib/utils';

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
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-purple-100 bg-white p-4 shadow-xl"
    >
      {title && (
        <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {title}
        </p>
      )}
      <p className="mb-2 text-xs text-gray-500">{labelFormatter(label!)}</p>
      <div className="space-y-1.5">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-600 flex-1">{entry.name}</span>
            <span className="text-sm font-bold text-gray-900">
              {valueFormatter(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
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
}

export const EnhancedAreaChart = memo(function EnhancedAreaChart({
  data,
  height = CHART_DIMENSIONS.height.md,
  className,
  dataKey = 'value',
  color = CHART_COLORS.primary.DEFAULT,
  gradient = true,
  showGrid = true,
  showDots = false,
  thresholds = [],
  fillOpacity = 0.3,
  strokeWidth = 2,
  valueFormatter = (v) => formatNumber(v, 2),
  labelFormatter = (l) => String(l),
}: EnhancedAreaChartProps) {
  const gradientId = useMemo(() => generateGradientId(color, 'area'), [color]);
  
  const hasCritical = useMemo(
    () => thresholds.some((t) => t.type === 'critical'),
    [thresholds]
  );

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          {gradient && (
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={fillOpacity} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
          )}

          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_COLORS.grid.line}
              vertical={false}
            />
          )}

          <XAxis
            dataKey="timestamp"
            tickFormatter={labelFormatter}
            stroke={CHART_COLORS.grid.axis}
            fontSize={CHART_TYPOGRAPHY.axis.fontSize}
            tickLine={false}
            axisLine={false}
          />

          <YAxis
            tickFormatter={valueFormatter}
            stroke={CHART_COLORS.grid.axis}
            fontSize={CHART_TYPOGRAPHY.axis.fontSize}
            tickLine={false}
            axisLine={false}
            width={60}
          />

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

          {hasCritical && thresholds.map((t, i) =>
            t.type === 'critical' ? (
              <ReferenceArea
                key={i}
                y1={t.value}
                y2={Math.max(...data.map((d) => (d[dataKey] as number) || 0)) * 1.1}
                fill={t.color}
                fillOpacity={0.05}
              />
            ) : null
          )}

          <Tooltip
            content={
              <CustomTooltip
                valueFormatter={valueFormatter}
                labelFormatter={labelFormatter}
              />
            }
          />

          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={strokeWidth}
            fill={gradient ? `url(#${gradientId})` : color}
            dot={showDots}
            activeDot={{ r: 6, strokeWidth: 0, fill: color }}
            animationDuration={CHART_ANIMATIONS.chart.animationDuration}
            animationEasing={CHART_ANIMATIONS.chart.animationEasing}
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
  showDots = false,
  showArea = false,
  showLegend = true,
  valueFormatter = (v) => formatNumber(v, 2),
  labelFormatter = (l) => String(l),
}: EnhancedLineChartProps) {
  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_COLORS.grid.line}
              vertical={false}
            />
          )}

          <XAxis
            dataKey="timestamp"
            tickFormatter={labelFormatter}
            stroke={CHART_COLORS.grid.axis}
            fontSize={CHART_TYPOGRAPHY.axis.fontSize}
            tickLine={false}
            axisLine={false}
          />

          <YAxis
            tickFormatter={valueFormatter}
            stroke={CHART_COLORS.grid.axis}
            fontSize={CHART_TYPOGRAPHY.axis.fontSize}
            tickLine={false}
            axisLine={false}
            width={60}
          />

          {showLegend && <Legend />}

          <Tooltip
            content={
              <CustomTooltip
                valueFormatter={valueFormatter}
                labelFormatter={labelFormatter}
              />
            }
          />

          {lines.map((line, index) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name}
              stroke={line.color || getSeriesColor(index)}
              strokeWidth={line.strokeWidth || 2}
              dot={showDots}
              activeDot={{ r: 6, strokeWidth: 0 }}
              fill={line.color || getSeriesColor(index)}
              fillOpacity={showArea ? 0.1 : 0}
              animationDuration={CHART_ANIMATIONS.chart.animationDuration}
            />
          ))}
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
  valueFormatter = (v) => formatNumber(v, 2),
  labelFormatter = (l) => String(l),
}: EnhancedBarChartProps) {
  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout={layout}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_COLORS.grid.line}
              horizontal={layout === 'horizontal'}
              vertical={layout === 'vertical'}
            />
          )}

          <XAxis
            type={layout === 'horizontal' ? 'category' : 'number'}
            dataKey={layout === 'horizontal' ? 'label' : undefined}
            tickFormatter={layout === 'horizontal' ? labelFormatter : valueFormatter}
            stroke={CHART_COLORS.grid.axis}
            fontSize={CHART_TYPOGRAPHY.axis.fontSize}
            tickLine={false}
            axisLine={false}
          />

          <YAxis
            type={layout === 'horizontal' ? 'number' : 'category'}
            dataKey={layout === 'vertical' ? 'label' : undefined}
            tickFormatter={layout === 'horizontal' ? valueFormatter : labelFormatter}
            stroke={CHART_COLORS.grid.axis}
            fontSize={CHART_TYPOGRAPHY.axis.fontSize}
            tickLine={false}
            axisLine={false}
            width={60}
          />

          {showLegend && <Legend />}

          <Tooltip
            content={
              <CustomTooltip
                valueFormatter={valueFormatter}
                labelFormatter={labelFormatter}
              />
            }
          />

          {bars.map((bar, index) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              name={bar.name}
              fill={bar.color || getSeriesColor(index)}
              stackId={bar.stackId}
              radius={[4, 4, 0, 0]}
              background={showBackground ? { fill: '#f3f4f6' } : undefined}
              animationDuration={CHART_ANIMATIONS.chart.animationDuration}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

// ============================================================================
// Pie Chart Component
// ============================================================================

interface EnhancedPieChartProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
  height?: number;
  className?: string;
  innerRadius?: number;
  outerRadius?: number;
  showLegend?: boolean;
  showLabels?: boolean;
  valueFormatter?: (value: number) => string;
}

export const EnhancedPieChart = memo(function EnhancedPieChart({
  data,
  height = CHART_DIMENSIONS.height.md,
  className,
  innerRadius = 0,
  outerRadius = 80,
  showLegend = true,
  showLabels = true,
  valueFormatter = (v) => formatNumber(v, 0),
}: EnhancedPieChartProps) {
  const total = useMemo(
    () => data.reduce((sum, item) => sum + item.value, 0),
    [data]
  );

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          {showLegend && <Legend layout="vertical" align="right" verticalAlign="middle" />}
          
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const item = payload[0];
              const percentage = ((item.value as number) / total) * 100;
              return (
                <div className="rounded-xl border border-purple-100 bg-white p-3 shadow-xl">
                  <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                  <p className="text-lg font-bold" style={{ color: item.payload.color }}>
                    {valueFormatter(item.value as number)}
                  </p>
                  <p className="text-xs text-gray-500">{percentage.toFixed(1)}%</p>
                </div>
              );
            }}
          />

          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            dataKey="value"
            animationDuration={CHART_ANIMATIONS.chart.animationDuration}
            label={showLabels ? ({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%` : false}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || getSeriesColor(index)}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
});

// ============================================================================
// Radar Chart Component
// ============================================================================

interface EnhancedRadarChartProps {
  data: Array<{
    metric: string;
    value: number;
    fullMark?: number;
  }>;
  height?: number;
  className?: string;
  color?: string;
  showGrid?: boolean;
}

export const EnhancedRadarChart = memo(function EnhancedRadarChart({
  data,
  height = CHART_DIMENSIONS.height.md,
  className,
  color = CHART_COLORS.primary.DEFAULT,
  showGrid = true,
}: EnhancedRadarChartProps) {
  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          {showGrid && <PolarGrid stroke={CHART_COLORS.grid.line} />}
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fill: CHART_COLORS.grid.text, fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 'auto']}
            tick={{ fill: CHART_COLORS.grid.text, fontSize: 10 }}
          />
          <Radar
            name="Score"
            dataKey="value"
            stroke={color}
            fill={color}
            fillOpacity={0.3}
            animationDuration={CHART_ANIMATIONS.chart.animationDuration}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const item = payload[0];
              return (
                <div className="rounded-xl border border-purple-100 bg-white p-3 shadow-xl">
                  <p className="text-sm font-semibold text-gray-900">{item.payload.metric}</p>
                  <p className="text-lg font-bold" style={{ color }}>
                    {formatNumber(item.value as number, 1)}
                  </p>
                </div>
              );
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
});

// ============================================================================
// Gauge Chart Component (Radial Bar)
// ============================================================================

interface EnhancedGaugeChartProps {
  value: number;
  max?: number;
  height?: number;
  className?: string;
  title?: string;
  unit?: string;
  thresholds?: {
    warning: number;
    critical: number;
  };
}

export const EnhancedGaugeChart = memo(function EnhancedGaugeChart({
  value,
  max = 100,
  height = CHART_DIMENSIONS.height.sm,
  className,
  title,
  unit = '%',
  thresholds = { warning: 70, critical: 90 },
}: EnhancedGaugeChartProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const color = getStatusColor(percentage, thresholds);
  
  const data = useMemo(
    () => [{ name: 'Value', value: percentage, fill: color }],
    [percentage, color]
  );

  return (
    <div className={cn('w-full flex flex-col items-center', className)}>
      {title && (
        <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <RadialBarChart
          cx="50%"
          cy="100%"
          innerRadius="60%"
          outerRadius="100%"
          data={data}
          startAngle={180}
          endAngle={0}
        >
          <RadialBar
            background={{ fill: '#f3f4f6' }}
            dataKey="value"
            cornerRadius={10}
            animationDuration={CHART_ANIMATIONS.chart.animationDuration}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="text-center -mt-8">
        <span className="text-3xl font-bold" style={{ color }}>
          {formatNumber(value, 1)}
        </span>
        <span className="text-sm text-gray-500 ml-1">{unit}</span>
      </div>
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
  color = CHART_COLORS.primary.DEFAULT,
  showArea = true,
  className,
}: SparklineProps) {
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
  
  const areaPathD = showArea
    ? `${pathD} L ${width} ${height} L 0 ${height} Z`
    : '';

  const firstValue = data[0] ?? 0;
  const lastValue = data[data.length - 1] ?? 0;
  const trend = lastValue - firstValue;
  const trendColor = trend >= 0 ? CHART_COLORS.semantic.success.DEFAULT : CHART_COLORS.semantic.error.DEFAULT;

  const lastPoint = points[points.length - 1];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {showArea && (
          <path d={areaPathD} fill="url(#sparklineGradient)" />
        )}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {lastPoint && (
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r="3"
            fill={color}
          />
        )}
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
}: StatComparisonProps) {
  const change = previous !== 0 ? ((current - previous) / previous) * 100 : 0;
  const isPositive = reverseTrend ? change < 0 : change > 0;
  const trendColor = isPositive
    ? CHART_COLORS.semantic.success.DEFAULT
    : CHART_COLORS.semantic.error.DEFAULT;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex-1">
        {label && <p className="text-xs text-gray-500 mb-1">{label}</p>}
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-gray-900">
            {formatNumber(current, 2)}
          </span>
          {unit && <span className="text-sm text-gray-500">{unit}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50">
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
  getStatusColor,
  getHealthColor,
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
  EnhancedPieChartProps,
  EnhancedRadarChartProps,
  EnhancedGaugeChartProps,
  SparklineProps,
  StatComparisonProps,
};
