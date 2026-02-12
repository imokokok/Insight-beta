/**
 * Design System - Typography Tokens
 *
 * 统一的排版令牌定义，确保文字样式的一致性
 *
 * 核心原则：
 * - 使用语义化字体大小名称
 * - 提供一致的行高和字重
 * - 支持响应式排版
 * - 类型安全的排版定义
 */

// ============================================================================
// 字体家族
// ============================================================================

export type FontFamily = 'sans' | 'mono' | 'serif';

export const FONT_FAMILY = {
  sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
} as const;

// ============================================================================
// 字体大小
// ============================================================================

export type FontSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';

export const FONT_SIZE = {
  xs: {
    value: '0.75rem',
    lineHeight: '1rem',
    letterSpacing: '0.025em',
  },
  sm: {
    value: '0.875rem',
    lineHeight: '1.25rem',
    letterSpacing: '0.025em',
  },
  base: {
    value: '1rem',
    lineHeight: '1.5rem',
    letterSpacing: '0em',
  },
  lg: {
    value: '1.125rem',
    lineHeight: '1.75rem',
    letterSpacing: '0.025em',
  },
  xl: {
    value: '1.25rem',
    lineHeight: '1.75rem',
    letterSpacing: '0em',
  },
  '2xl': {
    value: '1.5rem',
    lineHeight: '2rem',
    letterSpacing: '-0.025em',
  },
  '3xl': {
    value: '1.875rem',
    lineHeight: '2.25rem',
    letterSpacing: '-0.025em',
  },
  '4xl': {
    value: '2.25rem',
    lineHeight: '2.5rem',
    letterSpacing: '-0.025em',
  },
  '5xl': {
    value: '3rem',
    lineHeight: '1',
    letterSpacing: '-0.025em',
  },
  '6xl': {
    value: '3.75rem',
    lineHeight: '1',
    letterSpacing: '-0.025em',
  },
} as const;

// ============================================================================
// 字重
// ============================================================================

export type FontWeight = 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold';

export const FONT_WEIGHT = {
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

// ============================================================================
// 文本样式
// ============================================================================

export type TextStyle =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'body'
  | 'body-sm'
  | 'caption'
  | 'label'
  | 'code';

export const TEXT_STYLES = {
  h1: {
    fontSize: '6xl',
    fontWeight: 'bold',
    lineHeight: 'tight',
    letterSpacing: 'tight',
  },
  h2: {
    fontSize: '4xl',
    fontWeight: 'bold',
    lineHeight: 'tight',
    letterSpacing: 'tight',
  },
  h3: {
    fontSize: '3xl',
    fontWeight: 'semibold',
    lineHeight: 'tight',
    letterSpacing: 'tight',
  },
  h4: {
    fontSize: '2xl',
    fontWeight: 'semibold',
    lineHeight: 'tight',
  },
  h5: {
    fontSize: 'xl',
    fontWeight: 'semibold',
    lineHeight: 'tight',
  },
  h6: {
    fontSize: 'lg',
    fontWeight: 'semibold',
    lineHeight: 'normal',
  },
  body: {
    fontSize: 'base',
    fontWeight: 'normal',
    lineHeight: 'relaxed',
  },
  'body-sm': {
    fontSize: 'sm',
    fontWeight: 'normal',
    lineHeight: 'relaxed',
  },
  caption: {
    fontSize: 'xs',
    fontWeight: 'normal',
    lineHeight: 'normal',
  },
  label: {
    fontSize: 'sm',
    fontWeight: 'medium',
    lineHeight: 'normal',
  },
  code: {
    fontSize: 'sm',
    fontWeight: 'normal',
    lineHeight: 'normal',
    fontFamily: 'mono',
  },
} as const;

// ============================================================================
// 组件排版
// ============================================================================

export const COMPONENT_TYPOGRAPHY = {
  button: {
    fontSize: 'sm',
    fontWeight: 'medium',
  },
  card: {
    title: {
      fontSize: 'lg',
      fontWeight: 'semibold',
    },
    description: {
      fontSize: 'sm',
      fontWeight: 'normal',
    },
  },
  badge: {
    fontSize: 'xs',
    fontWeight: 'semibold',
  },
  input: {
    fontSize: 'base',
    fontWeight: 'normal',
  },
  table: {
    header: {
      fontSize: 'sm',
      fontWeight: 'semibold',
    },
    cell: {
      fontSize: 'sm',
      fontWeight: 'normal',
    },
  },
  modal: {
    title: {
      fontSize: '2xl',
      fontWeight: 'bold',
    },
    body: {
      fontSize: 'base',
      fontWeight: 'normal',
    },
  },
  alert: {
    title: {
      fontSize: 'base',
      fontWeight: 'semibold',
    },
    message: {
      fontSize: 'sm',
      fontWeight: 'normal',
    },
  },
  tooltip: {
    fontSize: 'xs',
    fontWeight: 'normal',
  },
  dropdown: {
    fontSize: 'sm',
    fontWeight: 'normal',
  },
  tabs: {
    fontSize: 'sm',
    fontWeight: 'medium',
  },
  pagination: {
    fontSize: 'sm',
    fontWeight: 'medium',
  },
} as const;

// ============================================================================
// 响应式排版
// ============================================================================

export const RESPONSIVE_TYPOGRAPHY = {
  mobile: {
    h1: '3xl',
    h2: '2xl',
    h3: 'xl',
  },
  tablet: {
    h1: '4xl',
    h2: '3xl',
    h3: '2xl',
  },
  desktop: {
    h1: '6xl',
    h2: '4xl',
    h3: '3xl',
  },
} as const;

// ============================================================================
// 工具函数
// ============================================================================

export function getFontSize(size: FontSize): (typeof FONT_SIZE)[FontSize] {
  return FONT_SIZE[size];
}

export function getFontWeight(weight: FontWeight): string {
  return FONT_WEIGHT[weight];
}

export function getTextStyle(style: TextStyle): (typeof TEXT_STYLES)[TextStyle] {
  return TEXT_STYLES[style];
}

export function getFontFamily(family: FontFamily): string {
  return FONT_FAMILY[family];
}
