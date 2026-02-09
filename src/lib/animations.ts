/**
 * 动画工具函数和配置
 *
 * 提供统一的动画效果配置和工具函数
 */

import { CSSProperties } from 'react';

// ============================================================================
// 动画配置常量
// ============================================================================

export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
  slower: 800,
} as const;

export const ANIMATION_EASING = {
  default: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
} as const;

// ============================================================================
// 价格变动闪烁动画
// ============================================================================

export type PriceFlashType = 'up' | 'down' | 'neutral';

export function getPriceFlashAnimation(type: PriceFlashType): CSSProperties {
  const colors = {
    up: {
      from: 'rgba(16, 185, 129, 0.4)',
      to: 'rgba(16, 185, 129, 0)',
    },
    down: {
      from: 'rgba(239, 68, 68, 0.4)',
      to: 'rgba(239, 68, 68, 0)',
    },
    neutral: {
      from: 'rgba(139, 92, 246, 0.3)',
      to: 'rgba(139, 92, 246, 0)',
    },
  };

  return {
    animation: `priceFlash ${ANIMATION_DURATION.slow}ms ${ANIMATION_EASING.smooth}`,
    '--flash-from': colors[type].from,
    '--flash-to': colors[type].to,
  } as CSSProperties;
}

// ============================================================================
// 卡片悬停效果
// ============================================================================

export const cardHoverStyles: CSSProperties = {
  transition: `all ${ANIMATION_DURATION.normal}ms ${ANIMATION_EASING.spring}`,
  willChange: 'transform, box-shadow',
};

export const cardHoverClassName = `
  hover:-translate-y-1
  hover:shadow-lg
  hover:shadow-purple-500/10
  active:scale-[0.98]
  active:duration-150
`;

// ============================================================================
// Shimmer 效果
// ============================================================================

export const shimmerStyles: CSSProperties = {
  background: `linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.4) 50%,
    rgba(255, 255, 255, 0) 100%
  )`,
  backgroundSize: '200% 100%',
  animation: `shimmer ${ANIMATION_DURATION.slower}ms infinite linear`,
};

// ============================================================================
// 渐入动画
// ============================================================================

export type FadeInDirection = 'up' | 'down' | 'left' | 'right' | 'none';

export function getFadeInAnimation(
  direction: FadeInDirection = 'up',
  delay: number = 0
): CSSProperties {
  const transforms = {
    up: 'translateY(20px)',
    down: 'translateY(-20px)',
    left: 'translateX(20px)',
    right: 'translateX(-20px)',
    none: 'translate(0)',
  };

  return {
    animation: `fadeIn ${ANIMATION_DURATION.slow}ms ${ANIMATION_EASING.smooth} ${delay}ms forwards`,
    opacity: 0,
    transform: transforms[direction],
    willChange: 'opacity, transform',
  };
}

// ============================================================================
// 脉冲动画
// ============================================================================

export function getPulseAnimation(color: string = 'purple'): CSSProperties {
  const colors: Record<string, string> = {
    purple: 'rgba(139, 92, 246, 0.5)',
    green: 'rgba(16, 185, 129, 0.5)',
    red: 'rgba(239, 68, 68, 0.5)',
    blue: 'rgba(59, 130, 246, 0.5)',
    orange: 'rgba(249, 115, 22, 0.5)',
  };

  return {
    animation: `pulse ${ANIMATION_DURATION.slower}ms ${ANIMATION_EASING.smooth} infinite`,
    '--pulse-color': colors[color] || colors.purple,
  } as CSSProperties;
}

// ============================================================================
// 数字滚动动画配置
// ============================================================================

export interface CountUpConfig {
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  separator?: string;
}

export const defaultCountUpConfig: CountUpConfig = {
  duration: 2000,
  decimals: 0,
  prefix: '',
  suffix: '',
  separator: ',',
};

// ============================================================================
// 图表动画配置
// ============================================================================

export const chartAnimationConfig = {
  line: {
    animationDuration: 1500,
    animationEasing: 'ease-out',
    isAnimationActive: true,
    animationBegin: 0,
  },
  bar: {
    animationDuration: 1000,
    animationEasing: 'ease-out',
    isAnimationActive: true,
  },
  pie: {
    animationDuration: 1000,
    animationEasing: 'ease-out',
    isAnimationActive: true,
  },
  area: {
    animationDuration: 1500,
    animationEasing: 'ease-out',
    isAnimationActive: true,
  },
};

// ============================================================================
// 交错动画延迟计算
// ============================================================================

export function getStaggerDelay(index: number, baseDelay: number = 50): number {
  return index * baseDelay;
}

// ============================================================================
// 弹簧动画配置
// ============================================================================

export const springConfig = {
  gentle: { stiffness: 120, damping: 14 },
  wobbly: { stiffness: 180, damping: 12 },
  stiff: { stiffness: 210, damping: 20 },
  slow: { stiffness: 80, damping: 20 },
};

// ============================================================================
// 全局动画样式注入
// ============================================================================

export const globalAnimationStyles = `
  @keyframes priceFlash {
    0% {
      background-color: var(--flash-from);
    }
    100% {
      background-color: var(--flash-to);
    }
  }

  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: var(--fade-transform, translateY(20px));
    }
    to {
      opacity: 1;
      transform: translate(0);
    }
  }

  @keyframes pulse {
    0%, 100% {
      box-shadow: 0 0 0 0 var(--pulse-color);
    }
    50% {
      box-shadow: 0 0 0 8px transparent;
    }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes bounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  .animate-price-flash-up {
    animation: priceFlash 500ms ease-out;
    --flash-from: rgba(16, 185, 129, 0.4);
    --flash-to: rgba(16, 185, 129, 0);
  }

  .animate-price-flash-down {
    animation: priceFlash 500ms ease-out;
    --flash-from: rgba(239, 68, 68, 0.4);
    --flash-to: rgba(239, 68, 68, 0);
  }

  .animate-shimmer {
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.4) 50%,
      rgba(255, 255, 255, 0) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 800ms infinite linear;
  }

  .animate-fade-in {
    animation: fadeIn 500ms ease-out forwards;
  }

  .animate-slide-up {
    animation: slideUp 500ms ease-out forwards;
  }

  .animate-scale-in {
    animation: scaleIn 300ms ease-out forwards;
  }

  .animate-bounce-subtle {
    animation: bounce 2s ease-in-out infinite;
  }

  .transition-card {
    transition: all 300ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
    will-change: transform, box-shadow;
  }

  .transition-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 40px -10px rgba(139, 92, 246, 0.2);
  }

  .transition-card:active {
    transform: scale(0.98) translateY(-2px);
    transition-duration: 150ms;
  }
`;
