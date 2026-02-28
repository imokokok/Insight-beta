export const CHART_COLORS = {
  primary: '#3B82F6',
  secondary: '#06B6D4',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  purple: '#8B5CF6',
  pink: '#EC4899',
  indigo: '#6366F1',
  teal: '#14B8A6',
  orange: '#F97316',
  cyan: '#06B6D4',
  lime: '#84CC16',
  emerald: '#10B981',
  sky: '#0EA5E9',
  violet: '#7C3AED',
  fuchsia: '#D946EF',
  rose: '#F43F5E',
  amber: '#F59E0B',
  slate: '#64748B',
  gray: '#6B7280',
};

export const CHART_COLOR_PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.purple,
  CHART_COLORS.pink,
  CHART_COLORS.indigo,
  CHART_COLORS.teal,
  CHART_COLORS.orange,
  CHART_COLORS.cyan,
];

export const PRICE_COLORS = {
  up: '#22C55E',
  down: '#EF4444',
  neutral: '#3B82F6',
};

export const DEVIATION_COLORS = {
  low: '#22C55E',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#DC2626',
};

export const CHART_GRID = {
  strokeDasharray: '3 3',
  stroke: 'rgba(148, 163, 184, 0.2)',
  vertical: false,
  className: 'stroke-muted',
};

export const CHART_LEGEND = {
  position: 'bottom' as const,
  layout: 'horizontal' as const,
  iconType: 'circle' as const,
  iconSize: 8,
  fontSize: 12,
  wrapperStyle: { paddingTop: '16px' },
};

export const CHART_TOOLTIP = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: 12,
  padding: '8px 12px',
};

export const CHART_AXIS = {
  tick: { fontSize: 11 },
  stroke: 'rgba(148, 163, 184, 0.3)',
  tickLine: false,
  className: 'text-muted-foreground',
};

export const CHART_ANIMATION = {
  duration: 300,
  easing: 'ease-out',
};

export const CHART_STROKE = {
  thin: 1,
  normal: 2,
  thick: 3,
};

export const CHART_FILL_OPACITY = {
  light: 0.1,
  medium: 0.3,
  heavy: 0.5,
};

export function getChartColor(index: number): string {
  return CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length] ?? CHART_COLORS.primary;
}

export function getPriceColor(change: number): string {
  if (change > 0) return PRICE_COLORS.up;
  if (change < 0) return PRICE_COLORS.down;
  return PRICE_COLORS.neutral;
}

export function getDeviationColor(deviation: number): string {
  const absDeviation = Math.abs(deviation);
  if (absDeviation >= 5) return DEVIATION_COLORS.critical;
  if (absDeviation >= 2) return DEVIATION_COLORS.high;
  if (absDeviation >= 1) return DEVIATION_COLORS.medium;
  return DEVIATION_COLORS.low;
}

export function formatChartValue(
  value: number,
  type: 'price' | 'percent' | 'number' | 'volume',
  options?: {
    decimals?: number;
    currency?: string;
    compact?: boolean;
  },
): string {
  const { decimals = 2, currency = '$', compact = false } = options ?? {};

  switch (type) {
    case 'price':
      if (compact && Math.abs(value) >= 1000000) {
        return `${currency}${(value / 1000000).toFixed(1)}M`;
      }
      if (compact && Math.abs(value) >= 1000) {
        return `${currency}${(value / 1000).toFixed(1)}K`;
      }
      if (value < 0.01 && value > 0) {
        return `${currency}${value.toFixed(6)}`;
      }
      return `${currency}${value.toFixed(decimals)}`;

    case 'percent':
      const sign = value >= 0 ? '+' : '';
      return `${sign}${value.toFixed(decimals)}%`;

    case 'volume':
      if (Math.abs(value) >= 1000000000) {
        return `${(value / 1000000000).toFixed(2)}B`;
      }
      if (Math.abs(value) >= 1000000) {
        return `${(value / 1000000).toFixed(2)}M`;
      }
      if (Math.abs(value) >= 1000) {
        return `${(value / 1000).toFixed(2)}K`;
      }
      return value.toFixed(decimals);

    case 'number':
    default:
      if (compact && Math.abs(value) >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      }
      if (compact && Math.abs(value) >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      }
      return value.toFixed(decimals);
  }
}

export function getGradientColors(baseColor: string): {
  start: string;
  end: string;
} {
  const opacityMap: Record<string, { start: string; end: string }> = {
    [PRICE_COLORS.up]: { start: 'rgba(34, 197, 94, 0.3)', end: 'rgba(34, 197, 94, 0)' },
    [PRICE_COLORS.down]: { start: 'rgba(239, 68, 68, 0.3)', end: 'rgba(239, 68, 68, 0)' },
    [CHART_COLORS.primary]: { start: 'rgba(59, 130, 246, 0.3)', end: 'rgba(59, 130, 246, 0)' },
    [CHART_COLORS.secondary]: { start: 'rgba(6, 182, 212, 0.3)', end: 'rgba(6, 182, 212, 0)' },
    [CHART_COLORS.purple]: { start: 'rgba(139, 92, 246, 0.3)', end: 'rgba(139, 92, 246, 0)' },
    [CHART_COLORS.warning]: { start: 'rgba(245, 158, 11, 0.3)', end: 'rgba(245, 158, 11, 0)' },
  };

  return (
    opacityMap[baseColor] ?? {
      start: `${baseColor}4D`,
      end: `${baseColor}00`,
    }
  );
}

export function generateChartMargins(
  options?: Partial<{
    top: number;
    right: number;
    bottom: number;
    left: number;
  }>,
): { top: number; right: number; bottom: number; left: number } {
  return {
    top: 20,
    right: 30,
    bottom: 20,
    left: 20,
    ...options,
  };
}

export const DEFAULT_CHART_PROPS = {
  grid: {
    strokeDasharray: CHART_GRID.strokeDasharray,
    className: CHART_GRID.className,
    vertical: CHART_GRID.vertical,
  },
  tooltip: {
    contentStyle: {
      backgroundColor: CHART_TOOLTIP.backgroundColor,
      border: CHART_TOOLTIP.border,
      borderRadius: CHART_TOOLTIP.borderRadius,
      fontSize: CHART_TOOLTIP.fontSize,
    },
  },
  axis: {
    tick: CHART_AXIS.tick,
    tickLine: CHART_AXIS.tickLine,
    className: CHART_AXIS.className,
  },
  legend: {
    ...CHART_LEGEND,
  },
};

export type ChartColorKey = keyof typeof CHART_COLORS;
export type PriceColorKey = keyof typeof PRICE_COLORS;
export type DeviationColorKey = keyof typeof DEVIATION_COLORS;
