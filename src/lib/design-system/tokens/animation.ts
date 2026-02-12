/**
 * Animation Design System
 *
 * 动画设计系统
 * - 统一的动画时长、缓动函数
 * - 预设动画变体
 * - 性能优化配置
 * - 无障碍支持
 */

import type { Variants, Transition } from 'framer-motion';

// ============================================================================
// Duration Tokens
// ============================================================================

export const ANIMATION_DURATION = {
  /** 瞬间 - 用于微交互 */
  instant: 0.1,
  /** 快速 - 用于悬停、点击 */
  fast: 0.15,
  /** 正常 - 标准过渡 */
  normal: 0.3,
  /** 中等 - 页面元素 */
  medium: 0.4,
  /** 慢速 - 强调动画 */
  slow: 0.5,
  /** 复杂 - 页面过渡 */
  complex: 0.6,
  /** 戏剧性 - 特殊效果 */
  dramatic: 0.8,
} as const;

// ============================================================================
// Easing Tokens
// ============================================================================

export const ANIMATION_EASING = {
  /** 线性 - 匀速 */
  linear: [0, 0, 1, 1] as const,
  /** 标准 - 自然流畅 */
  standard: [0.4, 0, 0.2, 1] as const,
  /** 进入 - 从静止开始 */
  enter: [0, 0, 0.2, 1] as const,
  /** 退出 - 回到静止 */
  exit: [0.4, 0, 1, 1] as const,
  /** 弹跳 - 弹性效果 */
  bounce: [0.68, -0.55, 0.265, 1.55] as const,
  /** 弹性 - 弹簧效果 */
  spring: { type: 'spring', stiffness: 400, damping: 25 } as const,
  /** 柔和弹簧 - 更柔和的弹性 */
  softSpring: { type: 'spring', stiffness: 300, damping: 30 } as const,
  /** 强弹性 - 明显的弹性 */
  strongSpring: { type: 'spring', stiffness: 500, damping: 20 } as const,
} as const;

// ============================================================================
// Stagger Configuration
// ============================================================================

export const STAGGER_CONFIG = {
  /** 快速交错 - 紧凑列表 */
  fast: { staggerChildren: 0.03, delayChildren: 0.05 },
  /** 正常交错 - 标准列表 */
  normal: { staggerChildren: 0.05, delayChildren: 0.1 },
  /** 慢速交错 - 强调每个项目 */
  slow: { staggerChildren: 0.08, delayChildren: 0.15 },
  /** 戏剧性交错 - 特殊效果 */
  dramatic: { staggerChildren: 0.1, delayChildren: 0.2 },
} as const;

// ============================================================================
// Page Transition Variants
// ============================================================================

export const pageTransitionVariants: Record<string, Variants> = {
  /** 淡入淡出 */
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  /** 向上滑入 */
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  /** 向下滑入 */
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },
  /** 向左滑入 */
  slideLeft: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },
  /** 向右滑入 */
  slideRight: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },
  /** 缩放进入 */
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.05 },
  },
  /** 缩放淡出 */
  scaleOut: {
    initial: { opacity: 0, scale: 1.05 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
};

// ============================================================================
// Component Animation Variants
// ============================================================================

export const componentVariants: Record<string, Variants> = {
  /** 卡片悬停效果 */
  cardHover: {
    rest: { y: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    hover: { y: -4, boxShadow: '0 20px 40px rgba(139, 92, 246, 0.15)' },
  },
  /** 按钮点击效果 */
  buttonTap: {
    rest: { scale: 1 },
    tap: { scale: 0.98 },
  },
  /** 图标悬停效果 */
  iconHover: {
    rest: { scale: 1, rotate: 0 },
    hover: { scale: 1.1, rotate: 5 },
  },
  /** 列表项进入 */
  listItem: {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 },
  },
  /** 网格项进入 */
  gridItem: {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
  },
  /** 模态框进入 */
  modal: {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 10 },
  },
  /** 下拉菜单 */
  dropdown: {
    hidden: { opacity: 0, y: -8, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -8, scale: 0.95 },
  },
  /** Toast 通知 */
  toast: {
    hidden: { opacity: 0, y: 50, scale: 0.9 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, x: 100, scale: 0.9 },
  },
  /** 工具提示 */
  tooltip: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
};

// ============================================================================
// Container Variants (with stagger)
// ============================================================================

export const containerVariants: Record<string, Variants> = {
  /** 快速列表容器 */
  fastList: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: STAGGER_CONFIG.fast,
    },
  },
  /** 标准列表容器 */
  list: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: STAGGER_CONFIG.normal,
    },
  },
  /** 慢速列表容器 */
  slowList: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: STAGGER_CONFIG.slow,
    },
  },
  /** 网格容器 */
  grid: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: STAGGER_CONFIG.normal,
    },
  },
  /** 卡片组容器 */
  cardGroup: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: STAGGER_CONFIG.slow,
    },
  },
};

// ============================================================================
// Scroll Animation Variants
// ============================================================================

export const scrollVariants: Record<string, Variants> = {
  /** 淡入 */
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  /** 向上滑入 */
  slideUp: {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 },
  },
  /** 向下滑入 */
  slideDown: {
    hidden: { opacity: 0, y: -40 },
    visible: { opacity: 1, y: 0 },
  },
  /** 向左滑入 */
  slideLeft: {
    hidden: { opacity: 0, x: 40 },
    visible: { opacity: 1, x: 0 },
  },
  /** 向右滑入 */
  slideRight: {
    hidden: { opacity: 0, x: -40 },
    visible: { opacity: 1, x: 0 },
  },
  /** 缩放进入 */
  scaleIn: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 },
  },
  /** 旋转进入 */
  rotateIn: {
    hidden: { opacity: 0, rotate: -10 },
    visible: { opacity: 1, rotate: 0 },
  },
};

// ============================================================================
// Loading Animation Variants
// ============================================================================

export const loadingVariants: Record<string, Variants> = {
  /** 脉冲 */
  pulse: {
    animate: {
      opacity: [0.4, 0.8, 0.4],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  },
  /** 闪光 */
  shimmer: {
    animate: {
      x: ['-100%', '100%'],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear',
      },
    },
  },
  /** 旋转 */
  spin: {
    animate: {
      rotate: 360,
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: 'linear',
      },
    },
  },
  /** 弹跳 */
  bounce: {
    animate: {
      y: [0, -10, 0],
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  },
  /** 点状加载 */
  dots: {
    animate: {
      scale: [1, 1.2, 1],
      opacity: [0.5, 1, 0.5],
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  },
};

// ============================================================================
// Number Animation Configuration
// ============================================================================

export const numberAnimationConfig = {
  /** 快速计数 */
  fast: {
    duration: 0.5,
    ease: ANIMATION_EASING.standard,
  },
  /** 正常计数 */
  normal: {
    duration: 0.8,
    ease: ANIMATION_EASING.standard,
  },
  /** 慢速计数 - 强调 */
  slow: {
    duration: 1.2,
    ease: ANIMATION_EASING.standard,
  },
};

// ============================================================================
// Hover Effects
// ============================================================================

export const hoverEffects = {
  /** 轻微上浮 */
  lift: { y: -2, transition: { duration: ANIMATION_DURATION.fast } },
  /** 明显上浮 */
  liftStrong: { y: -4, transition: { duration: ANIMATION_DURATION.normal } },
  /** 轻微放大 */
  scale: { scale: 1.02, transition: { duration: ANIMATION_DURATION.fast } },
  /** 明显放大 */
  scaleStrong: { scale: 1.05, transition: { duration: ANIMATION_DURATION.normal } },
  /** 旋转 */
  rotate: { rotate: 5, transition: { duration: ANIMATION_DURATION.normal } },
  /** 组合效果 */
  liftScale: {
    y: -4,
    scale: 1.02,
    transition: { duration: ANIMATION_DURATION.normal },
  },
};

// ============================================================================
// Tap Effects
// ============================================================================

export const tapEffects = {
  /** 轻微缩小 */
  slight: { scale: 0.98 },
  /** 明显缩小 */
  strong: { scale: 0.95 },
  /** 按钮效果 */
  button: { scale: 0.97 },
  /** 卡片效果 */
  card: { scale: 0.98 },
};

// ============================================================================
// Performance Optimizations
// ============================================================================

export const performanceConfig = {
  /** 启用 GPU 加速 */
  gpu: {
    willChange: 'transform, opacity',
    transform: 'translateZ(0)',
  },
  /** 布局隔离 */
  contain: {
    layout: { contain: 'layout' },
    paint: { contain: 'paint' },
    content: { contain: 'content' },
    strict: { contain: 'strict' },
  },
  /** 减少重绘 */
  reduceRepaint: {
    backfaceVisibility: 'hidden',
    perspective: 1000,
  },
};

// ============================================================================
// Accessibility
// ============================================================================

export const accessibilityConfig = {
  /** 减少动画媒体查询 */
  reducedMotion: {
    '@media (prefers-reduced-motion: reduce)': {
      animationDuration: '0.01ms !important',
      animationIterationCount: '1 !important',
      transitionDuration: '0.01ms !important',
    },
  },
  /** 动画时长上限（避免前庭障碍） */
  maxDuration: 0.5,
  /** 避免快速闪烁 */
  noRapidFlashing: {
    animationDuration: '0.5s',
  },
};

// ============================================================================
// Transition Presets
// ============================================================================

export const transitionPresets: Record<string, Transition> = {
  /** 快速过渡 */
  fast: {
    duration: ANIMATION_DURATION.fast,
    ease: ANIMATION_EASING.standard,
  },
  /** 正常过渡 */
  normal: {
    duration: ANIMATION_DURATION.normal,
    ease: ANIMATION_EASING.standard,
  },
  /** 慢速过渡 */
  slow: {
    duration: ANIMATION_DURATION.slow,
    ease: ANIMATION_EASING.standard,
  },
  /** 弹簧过渡 */
  spring: {
    type: 'spring',
    stiffness: 400,
    damping: 25,
  },
  /** 柔和弹簧 */
  softSpring: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
  },
  /** 强弹簧 */
  strongSpring: {
    type: 'spring',
    stiffness: 500,
    damping: 20,
  },
  /** 弹跳 */
  bounce: {
    type: 'spring',
    stiffness: 400,
    damping: 10,
  },
};

// ============================================================================
// CSS Animation Classes (for Tailwind)
// ============================================================================

export const cssAnimationClasses = {
  /** 淡入 */
  fadeIn: 'animate-fade-in',
  /** 向上滑入 */
  slideUp: 'animate-slide-up',
  /** 向下滑入 */
  slideDown: 'animate-slide-down',
  /** 缩放入 */
  scaleIn: 'animate-scale-in',
  /** 脉冲 */
  pulse: 'animate-pulse',
  /** 慢速脉冲 */
  pulseSlow: 'animate-pulse-slow',
  /** 弹跳 */
  bounce: 'animate-bounce',
  /** 轻微弹跳 */
  bounceSubtle: 'animate-bounce-subtle',
  /** 旋转 */
  spin: 'animate-spin',
  /** 闪光 */
  shimmer: 'animate-shimmer',
  /** 浮动 */
  float: 'animate-float',
  /** 渐变 */
  gradient: 'animate-gradient',
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 获取减少动画后的配置
 */
export function getReducedMotionConfig(
  prefersReducedMotion: boolean,
  config: Transition,
): Transition {
  if (prefersReducedMotion) {
    return {
      ...config,
      duration: 0,
    };
  }
  return config;
}

/**
 * 创建交错动画配置
 */
export function createStaggerConfig(
  staggerChildren: number,
  delayChildren: number = 0,
): { staggerChildren: number; delayChildren: number } {
  return { staggerChildren, delayChildren };
}

/**
 * 创建页面过渡配置
 */
export function createPageTransition(
  variant: keyof typeof pageTransitionVariants,
  duration: number = ANIMATION_DURATION.normal,
): Variants {
  const baseVariant = pageTransitionVariants[variant];
  if (!baseVariant) {
    return {
      initial: {},
      animate: {},
      exit: {},
    };
  }
  return {
    initial: baseVariant.initial ?? {},
    animate: {
      ...baseVariant.animate,
      transition: { duration, ease: ANIMATION_EASING.standard },
    },
    exit: {
      ...baseVariant.exit,
      transition: { duration: duration * 0.8, ease: ANIMATION_EASING.exit },
    },
  };
}

// ============================================================================
// Export All
// ============================================================================

export default {
  duration: ANIMATION_DURATION,
  easing: ANIMATION_EASING,
  stagger: STAGGER_CONFIG,
  pageTransitions: pageTransitionVariants,
  components: componentVariants,
  containers: containerVariants,
  scroll: scrollVariants,
  loading: loadingVariants,
  number: numberAnimationConfig,
  hover: hoverEffects,
  tap: tapEffects,
  performance: performanceConfig,
  accessibility: accessibilityConfig,
  transitions: transitionPresets,
  css: cssAnimationClasses,
};
