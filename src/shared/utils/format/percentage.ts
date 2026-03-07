/**
 * Percentage Formatting Utilities
 *
 * 百分比格式化工具函数
 */

export interface FormatPercentOptions {
  showSign?: boolean;
  placeholder?: string;
  spaceBeforeSymbol?: boolean;
}

export function formatPercent(
  value: number | null | undefined,
  decimals: number = 2,
  options: FormatPercentOptions = {},
): string {
  const { showSign = false, placeholder = '—', spaceBeforeSymbol = false } = options;

  if (value === null || value === undefined || !Number.isFinite(value)) {
    return placeholder;
  }

  const sign = showSign && value > 0 ? '+' : '';
  const space = spaceBeforeSymbol ? ' ' : '';
  const formattedValue = (value * 100).toFixed(decimals);

  return `${sign}${formattedValue}${space}%`;
}

export function formatPercentValue(
  value: number | null | undefined,
  decimals: number = 2,
  options: FormatPercentOptions = {},
): string {
  const { showSign = false, placeholder = '—', spaceBeforeSymbol = false } = options;

  if (value === null || value === undefined || !Number.isFinite(value)) {
    return placeholder;
  }

  const sign = showSign && value > 0 ? '+' : '';
  const space = spaceBeforeSymbol ? ' ' : '';
  const formattedValue = value.toFixed(decimals);

  return `${sign}${formattedValue}${space}%`;
}

export function formatChangePercent(
  value: number | null | undefined,
  decimals: number = 2,
  isDecimal: boolean = true,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }

  const percentValue = isDecimal ? value * 100 : value;
  const sign = percentValue > 0 ? '+' : '';

  return `${sign}${percentValue.toFixed(decimals)}%`;
}

export function formatConfidence(
  confidence: number | null | undefined,
  decimals: number = 1,
): string {
  return formatPercent(confidence, decimals);
}

export function formatSuccessRate(rate: number | null | undefined, decimals: number = 2): string {
  return formatPercent(rate, decimals);
}

export function formatDeviation(
  deviation: number | null | undefined,
  decimals: number = 2,
): string {
  return formatChangePercent(deviation, decimals);
}

export type DeviationColorFormat = 'hex' | 'tailwind' | 'tailwind-with-bg';

export interface GetDeviationColorOptions {
  format?: DeviationColorFormat;
  isPercent?: boolean;
}

export function getDeviationColor(
  deviation: number,
  options: GetDeviationColorOptions = {},
): string {
  const { format = 'tailwind', isPercent = false } = options;

  const absValue = Math.abs(deviation);
  const percentValue = isPercent ? absValue : absValue * 100;

  if (format === 'hex') {
    if (percentValue >= 5) return '#dc2626';
    if (percentValue >= 2) return '#ea580c';
    if (percentValue >= 1) return '#f97316';
    if (percentValue >= 0.5) return '#fdba74';
    return '#22c55e';
  }

  if (format === 'tailwind-with-bg') {
    if (percentValue > 2) return 'text-red-600 bg-red-50';
    if (percentValue > 1) return 'text-amber-600 bg-amber-50';
    if (percentValue > 0.5) return 'text-yellow-600 bg-yellow-50';
    return 'text-emerald-600 bg-emerald-50';
  }

  if (percentValue >= 5) return 'text-red-500';
  if (percentValue >= 2) return 'text-orange-600';
  if (percentValue >= 1) return 'text-orange-500';
  return 'text-green-500';
}

export function getDeviationBadgeVariant(percent: number): 'success' | 'warning' | 'destructive' {
  if (percent < 0.1) return 'success';
  if (percent < 0.5) return 'warning';
  return 'destructive';
}
