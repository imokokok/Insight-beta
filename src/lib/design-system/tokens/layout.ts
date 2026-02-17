/**
 * Layout Design System
 *
 * 布局设计系统
 * - 响应式布局令牌
 * - 信息密度层级
 * - 间距系统
 * - 容器系统
 */

// ============================================================================
// Breakpoints (从 responsive.ts 导入)
// ============================================================================

import { BREAKPOINTS } from './responsive';

export { BREAKPOINTS, type Breakpoint } from './responsive';

// ============================================================================
// Container Widths
// ============================================================================

export const CONTAINER_WIDTHS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  full: '100%',
} as const;

export const MAX_WIDTHS = {
  content: '768px', // 文章内容
  layout: '1280px', // 页面布局
  wide: '1536px', // 宽屏布局
  full: '100%', // 全宽
} as const;

// ============================================================================
// Grid System
// ============================================================================

export const GRID_COLUMNS = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  8: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-8',
  12: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-12',
} as const;

export const GRID_GAPS = {
  none: 'gap-0',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-3',
  lg: 'gap-4',
  xl: 'gap-6',
  '2xl': 'gap-8',
} as const;

// ============================================================================
// Information Density
// ============================================================================

export type Density = 'compact' | 'normal' | 'comfortable';

export const DENSITY_CONFIG: Record<
  Density,
  {
    spacing: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
    padding: {
      card: string;
      section: string;
      page: string;
    };
    gap: {
      card: string;
      section: string;
      grid: string;
    };
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
    };
    lineHeight: {
      tight: string;
      normal: string;
      relaxed: string;
    };
  }
> = {
  compact: {
    spacing: {
      xs: '2px',
      sm: '4px',
      md: '8px',
      lg: '12px',
      xl: '16px',
    },
    padding: {
      card: '12px',
      section: '16px',
      page: '16px',
    },
    gap: {
      card: '8px',
      section: '12px',
      grid: '12px',
    },
    fontSize: {
      xs: '10px',
      sm: '11px',
      base: '12px',
      lg: '14px',
      xl: '16px',
    },
    lineHeight: {
      tight: '1.2',
      normal: '1.3',
      relaxed: '1.4',
    },
  },
  normal: {
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '24px',
    },
    padding: {
      card: '16px',
      section: '24px',
      page: '24px',
    },
    gap: {
      card: '12px',
      section: '16px',
      grid: '16px',
    },
    fontSize: {
      xs: '12px',
      sm: '13px',
      base: '14px',
      lg: '16px',
      xl: '18px',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.625',
    },
  },
  comfortable: {
    spacing: {
      xs: '8px',
      sm: '12px',
      md: '16px',
      lg: '24px',
      xl: '32px',
    },
    padding: {
      card: '24px',
      section: '32px',
      page: '32px',
    },
    gap: {
      card: '16px',
      section: '24px',
      grid: '24px',
    },
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
    },
    lineHeight: {
      tight: '1.4',
      normal: '1.6',
      relaxed: '1.8',
    },
  },
};

// ============================================================================
// Card Sizes
// ============================================================================

export const CARD_SIZES = {
  xs: {
    padding: 'p-2',
    gap: 'gap-1',
    minHeight: 'min-h-[60px]',
  },
  sm: {
    padding: 'p-3',
    gap: 'gap-2',
    minHeight: 'min-h-[80px]',
  },
  md: {
    padding: 'p-4',
    gap: 'gap-3',
    minHeight: 'min-h-[100px]',
  },
  lg: {
    padding: 'p-6',
    gap: 'gap-4',
    minHeight: 'min-h-[120px]',
  },
  xl: {
    padding: 'p-8',
    gap: 'gap-6',
    minHeight: 'min-h-[160px]',
  },
} as const;

// ============================================================================
// Section Spacing
// ============================================================================

export const SECTION_SPACING = {
  xs: 'space-y-1',
  sm: 'space-y-2',
  md: 'space-y-4',
  lg: 'space-y-6',
  xl: 'space-y-8',
  '2xl': 'space-y-12',
} as const;

// ============================================================================
// Responsive Padding
// ============================================================================

export const RESPONSIVE_PADDING = {
  page: 'px-3 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8',
  card: 'p-3 sm:p-4 lg:p-6',
  section: 'p-4 sm:p-6 lg:p-8',
  compact: 'p-2 sm:p-3',
} as const;

// ============================================================================
// Layout Patterns
// ============================================================================

export const LAYOUT_PATTERNS = {
  // 单列布局
  singleColumn: 'max-w-3xl mx-auto',
  // 双列布局
  twoColumn: 'grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6',
  // 三列布局
  threeColumn: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6',
  // 侧边栏布局
  sidebar: 'grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6',
  // 仪表板布局
  dashboard: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4',
  // 列表布局
  list: 'flex flex-col gap-3',
  // 网格布局
  grid: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4',
} as const;

// ============================================================================
// Z-Index Scale
// ============================================================================

export const Z_INDEX = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
  toast: 80,
  max: 100,
} as const;

// ============================================================================
// Safe Area (Mobile)
// ============================================================================

export const SAFE_AREA = {
  top: 'env(safe-area-inset-top)',
  bottom: 'env(safe-area-inset-bottom)',
  left: 'env(safe-area-inset-left)',
  right: 'env(safe-area-inset-right)',
} as const;

// ============================================================================
// Aspect Ratios
// ============================================================================

export const ASPECT_RATIOS = {
  square: 'aspect-square',
  video: 'aspect-video',
  wide: 'aspect-[21/9]',
  portrait: 'aspect-[3/4]',
  auto: 'aspect-auto',
} as const;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 获取响应式网格类名
 */
export function getGridCols(cols: number, responsive = true): string {
  if (!responsive) return `grid-cols-${cols}`;
  return GRID_COLUMNS[cols as keyof typeof GRID_COLUMNS] || `grid-cols-${cols}`;
}

/**
 * 获取密度配置
 */
export function getDensityConfig(density: Density) {
  return DENSITY_CONFIG[density];
}

/**
 * 获取卡片尺寸类名
 */
export function getCardSize(size: keyof typeof CARD_SIZES) {
  return CARD_SIZES[size];
}

// 从 responsive.ts 导入断点工具函数
export { getCurrentBreakpoint, matchesBreakpoint } from './responsive';

// ============================================================================
// Export
// ============================================================================

export const layoutTokens = {
  breakpoints: BREAKPOINTS,
  containerWidths: CONTAINER_WIDTHS,
  maxWidths: MAX_WIDTHS,
  gridColumns: GRID_COLUMNS,
  gridGaps: GRID_GAPS,
  density: DENSITY_CONFIG,
  cardSizes: CARD_SIZES,
  sectionSpacing: SECTION_SPACING,
  responsivePadding: RESPONSIVE_PADDING,
  layoutPatterns: LAYOUT_PATTERNS,
  zIndex: Z_INDEX,
  safeArea: SAFE_AREA,
  aspectRatios: ASPECT_RATIOS,
};
