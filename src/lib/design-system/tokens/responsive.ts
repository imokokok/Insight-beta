/**
 * Responsive Design System
 *
 * 响应式设计系统
 * - 断点配置
 * - 响应式工具函数
 * - 容器查询支持
 * - 响应式模式
 */

// ============================================================================
// Breakpoints
// ============================================================================

export const BREAKPOINTS = {
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

// 断点描述
export const BREAKPOINT_DESCRIPTIONS: Record<Breakpoint, string> = {
  xs: '超小屏幕 - 手机竖屏',
  sm: '小屏幕 - 手机横屏/小平板',
  md: '中等屏幕 - 平板',
  lg: '大屏幕 - 笔记本',
  xl: '超大屏幕 - 桌面',
  '2xl': '特大屏幕 - 大屏桌面',
};

// ============================================================================
// Responsive Ranges
// ============================================================================

export const RESPONSIVE_RANGES = {
  mobile: { min: 0, max: 767, description: '移动端' },
  tablet: { min: 768, max: 1023, description: '平板端' },
  desktop: { min: 1024, max: 1279, description: '桌面端' },
  large: { min: 1280, max: Infinity, description: '大屏' },
} as const;

export type ResponsiveRange = keyof typeof RESPONSIVE_RANGES;

// ============================================================================
// Container Queries
// ============================================================================

export const CONTAINER_SIZES = {
  sm: '320px',
  md: '480px',
  lg: '640px',
  xl: '768px',
  '2xl': '1024px',
} as const;

export const CONTAINER_BREAKPOINTS = {
  sm: '@container (min-width: 320px)',
  md: '@container (min-width: 480px)',
  lg: '@container (min-width: 640px)',
  xl: '@container (min-width: 768px)',
  '2xl': '@container (min-width: 1024px)',
} as const;

// ============================================================================
// Responsive Patterns
// ============================================================================

export const RESPONSIVE_PATTERNS = {
  // 单列到多列
  columns: {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
    8: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-8',
    12: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-12',
  },

  // 间距
  gap: {
    none: 'gap-0',
    xs: 'gap-1 sm:gap-2',
    sm: 'gap-2 sm:gap-3',
    md: 'gap-3 sm:gap-4',
    lg: 'gap-4 sm:gap-6',
    xl: 'gap-6 sm:gap-8',
    '2xl': 'gap-8 sm:gap-12',
  },

  // 内边距
  padding: {
    none: 'p-0',
    xs: 'p-2 sm:p-3',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
    xl: 'p-8 sm:p-12',
  },

  // 字体大小
  fontSize: {
    xs: 'text-xs sm:text-sm',
    sm: 'text-sm sm:text-base',
    base: 'text-base sm:text-lg',
    lg: 'text-lg sm:text-xl',
    xl: 'text-xl sm:text-2xl',
    '2xl': 'text-2xl sm:text-3xl',
    '3xl': 'text-3xl sm:text-4xl',
  },

  // 显示/隐藏
  visibility: {
    mobileOnly: 'block sm:hidden',
    tabletOnly: 'hidden sm:block md:hidden',
    desktopOnly: 'hidden md:block',
    notMobile: 'hidden sm:block',
    notDesktop: 'block md:hidden',
  },

  // 布局方向
  direction: {
    stack: 'flex-col',
    row: 'flex-col sm:flex-row',
    responsive: 'flex-col md:flex-row',
  },

  // 侧边栏
  sidebar: {
    always: 'block',
    desktop: 'hidden lg:block',
    collapsible: 'hidden md:block',
  },
} as const;

// ============================================================================
// Touch Device Detection
// ============================================================================

export const TOUCH_MEDIA_QUERIES = {
  // 触摸设备
  touch: '(hover: none) and (pointer: coarse)',
  // 非触摸设备
  noTouch: '(hover: hover) and (pointer: fine)',
  // 支持悬停
  hover: '(hover: hover)',
  // 不支持悬停
  noHover: '(hover: none)',
} as const;

// ============================================================================
// Reduced Motion
// ============================================================================

export const MOTION_MEDIA_QUERIES = {
  reduced: '(prefers-reduced-motion: reduce)',
  noPreference: '(prefers-reduced-motion: no-preference)',
} as const;

// ============================================================================
// Color Scheme
// ============================================================================

export const COLOR_SCHEME_MEDIA_QUERIES = {
  dark: '(prefers-color-scheme: dark)',
  light: '(prefers-color-scheme: light)',
} as const;

// ============================================================================
// Print
// ============================================================================

export const PRINT_MEDIA_QUERIES = {
  print: 'print',
  screen: 'screen',
} as const;

// ============================================================================
// High Contrast
// ============================================================================

export const CONTRAST_MEDIA_QUERIES = {
  high: '(prefers-contrast: high)',
  low: '(prefers-contrast: low)',
  noPreference: '(prefers-contrast: no-preference)',
} as const;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 获取断点值
 */
export function getBreakpointValue(breakpoint: Breakpoint): number {
  return BREAKPOINTS[breakpoint];
}

/**
 * 获取当前断点
 */
export function getCurrentBreakpoint(width: number): Breakpoint {
  const breakpoints = Object.entries(BREAKPOINTS).sort((a, b) => b[1] - a[1]);
  for (const [name, minWidth] of breakpoints) {
    if (width >= minWidth) return name as Breakpoint;
  }
  return 'xs';
}

/**
 * 检查是否匹配断点
 */
export function matchesBreakpoint(breakpoint: Breakpoint, width: number): boolean {
  return width >= BREAKPOINTS[breakpoint];
}

/**
 * 获取响应式范围
 */
export function getResponsiveRange(width: number): ResponsiveRange {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  if (width < 1280) return 'desktop';
  return 'large';
}

/**
 * 创建媒体查询字符串
 */
export function createMediaQuery(
  min?: Breakpoint,
  max?: Breakpoint
): string {
  const conditions: string[] = [];
  if (min) conditions.push(`(min-width: ${BREAKPOINTS[min]}px)`);
  if (max) conditions.push(`(max-width: ${BREAKPOINTS[max] - 1}px)`);
  return conditions.join(' and ');
}

/**
 * 获取响应式网格类名
 */
export function getResponsiveGridCols(cols: number): string {
  return RESPONSIVE_PATTERNS.columns[cols as keyof typeof RESPONSIVE_PATTERNS.columns] || `grid-cols-${cols}`;
}

/**
 * 获取响应式间距类名
 */
export function getResponsiveGap(size: keyof typeof RESPONSIVE_PATTERNS.gap): string {
  return RESPONSIVE_PATTERNS.gap[size];
}

/**
 * 获取响应式内边距类名
 */
export function getResponsivePadding(size: keyof typeof RESPONSIVE_PATTERNS.padding): string {
  return RESPONSIVE_PATTERNS.padding[size];
}

/**
 * 获取响应式字体大小类名
 */
export function getResponsiveFontSize(size: keyof typeof RESPONSIVE_PATTERNS.fontSize): string {
  return RESPONSIVE_PATTERNS.fontSize[size];
}

// ============================================================================
// Responsive Values Helper
// ============================================================================

export type ResponsiveValue<T> = T | { [K in Breakpoint]?: T };

/**
 * 解析响应式值
 */
export function resolveResponsiveValue<T>(
  value: ResponsiveValue<T>,
  breakpoint: Breakpoint
): T {
  if (typeof value !== 'object' || value === null) {
    return value as T;
  }

  const breakpoints: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  const index = breakpoints.indexOf(breakpoint);

  // 从当前断点开始向下查找
  for (let i = index; i >= 0; i--) {
    const bp = breakpoints[i];
    if (bp in value) {
      return (value as Record<Breakpoint, T>)[bp];
    }
  }

  // 返回第一个可用的值
  const firstKey = Object.keys(value)[0] as Breakpoint;
  return (value as Record<Breakpoint, T>)[firstKey];
}

// ============================================================================
// Container Query Utilities
// ============================================================================

/**
 * 创建容器查询字符串
 */
export function createContainerQuery(
  min?: keyof typeof CONTAINER_SIZES,
  max?: keyof typeof CONTAINER_SIZES
): string {
  const conditions: string[] = [];
  if (min) conditions.push(`(min-width: ${CONTAINER_SIZES[min]})`);
  if (max) conditions.push(`(max-width: ${CONTAINER_SIZES[max]})`);
  return `@container ${conditions.join(' and ')}`;
}

/**
 * 获取容器查询断点
 */
export function getContainerBreakpoint(size: keyof typeof CONTAINER_BREAKPOINTS): string {
  return CONTAINER_BREAKPOINTS[size];
}

// ============================================================================
// Export
// ============================================================================

export default {
  breakpoints: BREAKPOINTS,
  ranges: RESPONSIVE_RANGES,
  containerSizes: CONTAINER_SIZES,
  containerBreakpoints: CONTAINER_BREAKPOINTS,
  patterns: RESPONSIVE_PATTERNS,
  touchQueries: TOUCH_MEDIA_QUERIES,
  motionQueries: MOTION_MEDIA_QUERIES,
  colorSchemeQueries: COLOR_SCHEME_MEDIA_QUERIES,
  printQueries: PRINT_MEDIA_QUERIES,
  contrastQueries: CONTRAST_MEDIA_QUERIES,
};
