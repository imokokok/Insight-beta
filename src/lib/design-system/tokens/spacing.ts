/**
 * Design System - Spacing Tokens
 *
 * 统一的间距令牌定义，基于 4px 基准网格
 * 
 * 核心原则：
 * - 使用 4px 基准单位
 * - 提供语义化间距名称
 * - 与 Tailwind CSS 的间距系统保持一致
 * - 类型安全的间距定义
 */

// ============================================================================
// 基础间距令牌
// ============================================================================

export type SpacingToken = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24 | 32 | 40 | 48 | 56 | 64 | 72 | 96 | 128;

export const SPACING_TOKENS = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
  32: '128px',
  40: '160px',
  48: '192px',
  56: '224px',
  64: '256px',
  72: '288px',
  96: '384px',
  128: '512px',
} as const;

// ============================================================================
// 语义化间距
// ============================================================================

export type SemanticSpacing = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';

export const SEMANTIC_SPACING = {
  none: '0px',
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
  '4xl': '96px',
  full: '100%',
} as const;

// ============================================================================
// 组件间距
// ============================================================================

export const COMPONENT_SPACING = {
  button: {
    padding: {
      sm: '8px 16px',
      md: '12px 24px',
      lg: '16px 32px',
    },
    gap: '8px',
  },
  card: {
    padding: {
      sm: '16px',
      md: '24px',
      lg: '32px',
    },
    gap: '16px',
  },
  input: {
    padding: '10px 14px',
    gap: '8px',
  },
  badge: {
    padding: {
      sm: '2px 8px',
      md: '4px 10px',
      lg: '6px 12px',
    },
    gap: '4px',
  },
  table: {
    padding: {
      cell: '12px 16px',
      header: '16px',
    },
    gap: '0',
  },
  modal: {
    padding: '32px',
    gap: '24px',
  },
  dropdown: {
    padding: '8px',
    gap: '4px',
  },
  form: {
    gap: '16px',
    labelGap: '8px',
  },
  list: {
    gap: {
      sm: '8px',
      md: '16px',
      lg: '24px',
    },
  },
  grid: {
    gap: {
      sm: '16px',
      md: '24px',
      lg: '32px',
    },
  },
  section: {
    padding: {
      sm: '32px',
      md: '48px',
      lg: '64px',
    },
    gap: '32px',
  },
} as const;

// ============================================================================
// 响应式间距
// ============================================================================

export const RESPONSIVE_SPACING = {
  mobile: {
    padding: '16px',
    gap: '12px',
  },
  tablet: {
    padding: '24px',
    gap: '16px',
  },
  desktop: {
    padding: '32px',
    gap: '24px',
  },
} as const;

// ============================================================================
// 工具函数
// ============================================================================

export function getSpacing(token: SpacingToken): string {
  return SPACING_TOKENS[token];
}

export function getSemanticSpacing(spacing: SemanticSpacing): string {
  return SEMANTIC_SPACING[spacing];
}

export function getComponentSpacing(component: keyof typeof COMPONENT_SPACING, prop: string): string {
  const spacing = COMPONENT_SPACING[component];
  return (spacing as Record<string, string>)[prop] || '0px';
}
