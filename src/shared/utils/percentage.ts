/**
 * Percentage Format Utilities
 *
 * 百分比格式化工具函数
 *
 * 提供标准化的百分比展示，统一处理小数和百分比的转换
 */

/**
 * 格式化小数（0-1）为百分比字符串
 *
 * 输入值范围通常为 0-1（如 0.1234 表示 12.34%）
 *
 * @param value - 小数（0-1）
 * @param decimals - 小数位数，默认 2
 * @param options - 格式化选项
 * @returns 格式化后的百分比字符串，如 '12.34%'
 *
 * @example
 * ```typescript
 * formatPercent(0.1234);        // Returns: '12.34%'
 * formatPercent(0.1234, 1);     // Returns: '12.3%'
 * formatPercent(0.1234, 2, { showSign: true });  // Returns: '+12.34%'
 * formatPercent(null);          // Returns: '—'
 * ```
 */
export interface FormatPercentOptions {
  /** 是否显示正负号 */
  showSign?: boolean;
  /** 空值占位符 */
  placeholder?: string;
  /** 是否添加空格在数字和%之间 */
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

/**
 * 格式化整数百分比（0-100）为百分比字符串
 *
 * 输入值范围通常为 0-100（如 12.34 表示 12.34%）
 *
 * @param value - 百分比数值（0-100）
 * @param decimals - 小数位数，默认 2
 * @param options - 格式化选项
 * @returns 格式化后的百分比字符串，如 '12.34%'
 *
 * @example
 * ```typescript
 * formatPercentValue(12.34);        // Returns: '12.34%'
 * formatPercentValue(12.34, 1);     // Returns: '12.3%'
 * formatPercentValue(12.34, 2, { showSign: true });  // Returns: '+12.34%'
 * ```
 */
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

/**
 * 格式化变化率为百分比字符串（带符号）
 *
 * 适用于展示涨跌幅，自动添加 + 或 - 符号
 *
 * @param value - 变化率小数（0-1）或百分比数值（0-100）
 * @param decimals - 小数位数，默认 2
 * @param isDecimal - 是否为小数格式（0-1），默认为 true
 * @returns 格式化后的百分比字符串，如 '+12.34%' 或 '-5.67%'
 *
 * @example
 * ```typescript
 * formatChangePercent(0.1234);       // Returns: '+12.34%'
 * formatChangePercent(-0.0567);      // Returns: '-5.67%'
 * formatChangePercent(12.34, 2, false);  // Returns: '+12.34%'
 * ```
 */
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

/**
 * 格式化置信度为百分比
 *
 * 专门用于展示置信度分数，通常范围是 0-1
 *
 * @param confidence - 置信度小数（0-1）
 * @param decimals - 小数位数，默认 1
 * @returns 格式化后的置信度字符串，如 '98.5%'
 *
 * @example
 * ```typescript
 * formatConfidence(0.985);    // Returns: '98.5%'
 * formatConfidence(0.985, 2); // Returns: '98.50%'
 * ```
 */
export function formatConfidence(
  confidence: number | null | undefined,
  decimals: number = 1,
): string {
  return formatPercent(confidence, decimals);
}

/**
 * 格式化成功率为百分比
 *
 * 专门用于展示成功率/健康度
 *
 * @param rate - 成功率小数（0-1）
 * @param decimals - 小数位数，默认 2
 * @returns 格式化后的成功率字符串，如 '99.99%'
 *
 * @example
 * ```typescript
 * formatSuccessRate(0.9999);   // Returns: '99.99%'
 * formatSuccessRate(1);        // Returns: '100.00%'
 * ```
 */
export function formatSuccessRate(rate: number | null | undefined, decimals: number = 2): string {
  return formatPercent(rate, decimals);
}

/**
 * 格式化偏差率为百分比
 *
 * 专门用于展示价格偏差等，支持正负值
 *
 * @param deviation - 偏差率小数（0-1）
 * @param decimals - 小数位数，默认 2
 * @returns 格式化后的偏差率字符串，如 '+1.23%' 或 '-0.45%'
 *
 * @example
 * ```typescript
 * formatDeviation(0.0123);   // Returns: '+1.23%'
 * formatDeviation(-0.0045);  // Returns: '-0.45%'
 * ```
 */
export function formatDeviation(
  deviation: number | null | undefined,
  decimals: number = 2,
): string {
  return formatChangePercent(deviation, decimals, true);
}
