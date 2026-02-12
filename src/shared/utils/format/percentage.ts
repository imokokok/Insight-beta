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
  return formatChangePercent(deviation, decimals, true);
}
