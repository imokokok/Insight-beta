/**
 * Design Tokens - 设计令牌系统
 *
 * 统一的设计系统常量，确保整个应用的一致性
 * 包含颜色、间距、排版、动画、阴影等设计元素
 */

// ============================================================================
// 颜色系统
// ============================================================================

export const colors = {
  // 主色调 - 紫色系
  primary: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
    950: '#2e1065',
  },

  // 中性色 - 灰度
  gray: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
    950: '#09090b',
  },

  // 语义化颜色
  semantic: {
    success: {
      light: '#dcfce7',
      DEFAULT: '#22c55e',
      dark: '#15803d',
    },
    warning: {
      light: '#fef3c7',
      DEFAULT: '#f59e0b',
      dark: '#b45309',
    },
    error: {
      light: '#fee2e2',
      DEFAULT: '#ef4444',
      dark: '#b91c1c',
    },
    info: {
      light: '#dbeafe',
      DEFAULT: '#3b82f6',
      dark: '#1d4ed8',
    },
  },

  // 协议特定颜色
  protocols: {
    chainlink: '#375bd2',
    pyth: '#6b46c1',
    uma: '#ff4a4a',
    band: '#00b2a9',
    api3: '#7ce3cb',
    redstone: '#ff6b6b',
    switchboard: '#00d4aa',
    flux: '#f59e0b',
    dia: '#ec4899',
    insight: '#8b5cf6',
  },

  // 背景色
  background: {
    DEFAULT: '#fafafa',
    paper: '#ffffff',
    elevated: 'rgba(255, 255, 255, 0.8)',
    glass: 'rgba(255, 255, 255, 0.6)',
    mesh: {
      yellow: 'hsla(28, 100%, 74%, 0.3)',
      cyan: 'hsla(189, 100%, 56%, 0.3)',
      pink: 'hsla(340, 100%, 76%, 0.3)',
      lime: 'hsla(120, 100%, 70%, 0.3)',
    },
  },

  // 文字色
  text: {
    primary: '#18181b',
    secondary: '#71717a',
    disabled: '#a1a1aa',
    inverse: '#ffffff',
  },

  // 边框色
  border: {
    DEFAULT: 'rgba(139, 92, 246, 0.1)',
    light: 'rgba(139, 92, 246, 0.05)',
    dark: 'rgba(139, 92, 246, 0.2)',
  },
} as const;

// ============================================================================
// 间距系统
// ============================================================================

export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem', // 2px
  1: '0.25rem', // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem', // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem', // 12px
  3.5: '0.875rem', // 14px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  7: '1.75rem', // 28px
  8: '2rem', // 32px
  9: '2.25rem', // 36px
  10: '2.5rem', // 40px
  11: '2.75rem', // 44px
  12: '3rem', // 48px
  14: '3.5rem', // 56px
  16: '4rem', // 64px
  20: '5rem', // 80px
  24: '6rem', // 96px
  28: '7rem', // 112px
  32: '8rem', // 128px
  36: '9rem', // 144px
  40: '10rem', // 160px
  44: '11rem', // 176px
  48: '12rem', // 192px
  52: '13rem', // 208px
  56: '14rem', // 224px
  60: '15rem', // 240px
  64: '16rem', // 256px
  72: '18rem', // 288px
  80: '20rem', // 320px
  96: '24rem', // 384px
} as const;

// ============================================================================
// 排版系统
// ============================================================================

export const typography = {
  fontFamily: {
    sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
    mono: ['var(--font-mono)', 'monospace'],
  },

  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    '5xl': ['3rem', { lineHeight: '1' }],
    '6xl': ['3.75rem', { lineHeight: '1' }],
  },

  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },

  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

// ============================================================================
// 圆角系统
// ============================================================================

export const borderRadius = {
  none: '0',
  sm: '0.125rem',
  DEFAULT: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
} as const;

// ============================================================================
// 阴影系统
// ============================================================================

export const shadows = {
  sm: '0 1px 2px 0 rgba(139, 92, 246, 0.05)',
  DEFAULT: '0 1px 3px 0 rgba(139, 92, 246, 0.1), 0 1px 2px -1px rgba(139, 92, 246, 0.1)',
  md: '0 4px 6px -1px rgba(139, 92, 246, 0.1), 0 2px 4px -2px rgba(139, 92, 246, 0.1)',
  lg: '0 10px 15px -3px rgba(139, 92, 246, 0.1), 0 4px 6px -4px rgba(139, 92, 246, 0.1)',
  xl: '0 20px 25px -5px rgba(139, 92, 246, 0.1), 0 8px 10px -6px rgba(139, 92, 246, 0.1)',
  '2xl': '0 25px 50px -12px rgba(139, 92, 246, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(139, 92, 246, 0.05)',
  none: 'none',
  panel: '0 8px 20px -4px rgba(139, 92, 246, 0.1), 0 6px 12px -6px rgba(139, 92, 246, 0.1)',
  card: '0 4px 6px -1px rgba(139, 92, 246, 0.05), 0 2px 4px -2px rgba(139, 92, 246, 0.05)',
  hover: '0 10px 15px -3px rgba(139, 92, 246, 0.15), 0 4px 6px -4px rgba(139, 92, 246, 0.1)',
} as const;

// ============================================================================
// 动画系统
// ============================================================================

export const animation = {
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    slower: '700ms',
  },

  easing: {
    DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  keyframes: {
    fadeIn: {
      '0%': { opacity: '0' },
      '100%': { opacity: '1' },
    },
    slideUp: {
      '0%': { transform: 'translateY(10px)', opacity: '0' },
      '100%': { transform: 'translateY(0)', opacity: '1' },
    },
    slideDown: {
      '0%': { transform: 'translateY(-10px)', opacity: '0' },
      '100%': { transform: 'translateY(0)', opacity: '1' },
    },
    pulse: {
      '0%, 100%': { opacity: '1' },
      '50%': { opacity: '0.5' },
    },
    gradient: {
      '0%, 100%': { backgroundPosition: '0% 50%' },
      '50%': { backgroundPosition: '100% 50%' },
    },
    float: {
      '0%, 100%': { transform: 'translateY(0)' },
      '50%': { transform: 'translateY(-10px)' },
    },
    spin: {
      '0%': { transform: 'rotate(0deg)' },
      '100%': { transform: 'rotate(360deg)' },
    },
  },
} as const;

// ============================================================================
// 断点系统
// ============================================================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ============================================================================
// Z-Index 层级
// ============================================================================

export const zIndex = {
  hide: -1,
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
} as const;

// ============================================================================
// 过渡效果
// ============================================================================

export const transitions = {
  DEFAULT: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  colors: 'color, background-color, border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  opacity: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  shadow: 'box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  transform: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// ============================================================================
// 玻璃拟态效果
// ============================================================================

export const glass = {
  panel: {
    background: 'rgba(255, 255, 255, 0.7)',
    backdropBlur: 'blur(24px)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    shadow: shadows.panel,
  },
  card: {
    background: 'rgba(255, 255, 255, 0.6)',
    backdropBlur: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    shadow: shadows.card,
  },
  input: {
    background: 'rgba(255, 255, 255, 0.5)',
    backdropBlur: 'blur(4px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
  },
} as const;

// ============================================================================
// 工具函数：获取协议颜色
// ============================================================================

export function getProtocolColor(protocol: string): string {
  const key = protocol.toLowerCase() as keyof typeof colors.protocols;
  return colors.protocols[key] || colors.primary[500];
}

export function getProtocolBadgeClasses(protocol: string): string {
  const color = getProtocolColor(protocol);
  // 根据主色生成对应的背景/文字色
  return `bg-[${color}]/10 text-[${color}] border-[${color}]/20`;
}

// ============================================================================
// 工具函数：获取状态颜色
// ============================================================================

export function getStatusColor(status: 'success' | 'warning' | 'error' | 'info' | string): string {
  const colorMap: Record<string, string> = {
    success: colors.semantic.success.DEFAULT,
    warning: colors.semantic.warning.DEFAULT,
    error: colors.semantic.error.DEFAULT,
    info: colors.semantic.info.DEFAULT,
    pending: colors.semantic.info.DEFAULT,
    disputed: colors.semantic.error.DEFAULT,
    resolved: colors.semantic.success.DEFAULT,
    healthy: colors.semantic.success.DEFAULT,
    degraded: colors.semantic.warning.DEFAULT,
    down: colors.semantic.error.DEFAULT,
  };
  return colorMap[status.toLowerCase()] || colors.gray[500];
}
