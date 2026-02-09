/**
 * ============================================================================
 * Interactive Icon Component
 * ============================================================================
 *
 * 提供完整的交互功能的图标组件
 * - 悬停/点击动画
 * - 涟漪效果
 * - 状态反馈
 * - 无障碍支持
 */

import React, { forwardRef, useRef } from 'react';

import { useIconInteraction, type IconInteractionOptions } from '@/hooks/useIconInteraction';
import { cn } from '@/lib/utils';

import type { LucideIcon } from 'lucide-react';

export interface InteractiveIconProps extends IconInteractionOptions {
  /** Lucide 图标组件 */
  icon: LucideIcon;
  /** 图标大小 */
  size?: number;
  /** 自定义类名 */
  className?: string;
  /** 点击回调 */
  onClick?: (e: React.MouseEvent) => void;
  /** 图标颜色 */
  color?: string;
  /** 悬停颜色 */
  hoverColor?: string;
  /** 激活颜色 */
  activeColor?: string;
  /** ARIA 标签 */
  ariaLabel?: string;
  /** 标题提示 */
  title?: string;
  /** 是否作为按钮 */
  asButton?: boolean;
  /** 按钮类型 */
  type?: 'button' | 'submit' | 'reset';
  /** 数据属性 */
  'data-testid'?: string;
  'data-nav-item'?: boolean;
}

export const InteractiveIcon = forwardRef<HTMLButtonElement, InteractiveIconProps>(
  (
    {
      icon: Icon,
      size = 20,
      className,
      onClick,
      color = 'currentColor',
      hoverColor,
      activeColor,
      ariaLabel,
      title,
      asButton = true,
      type = 'button',
      'data-testid': dataTestId,
      'data-nav-item': dataNavItem,
      ...interactionOptions
    },
    ref,
  ) => {
    const internalRef = useRef<HTMLButtonElement>(null);
    const buttonRef = (ref as React.RefObject<HTMLButtonElement>) || internalRef;

    const { state, ripple, handlers, styles } = useIconInteraction(interactionOptions);

    const handleClick = (e: React.MouseEvent) => {
      handlers.onClick(e);
      onClick?.(e);
    };

    // 根据状态确定颜色
    const getIconColor = () => {
      if (state === 'active' && activeColor) return activeColor;
      if (state === 'hover' && hoverColor) return hoverColor;
      return color;
    };

    const iconElement = (
      <>
        <Icon
          size={size}
          color={getIconColor()}
          className={cn(
            'transition-colors duration-200',
            state === 'loading' && 'animate-spin',
            state === 'success' && 'text-green-500',
            state === 'error' && 'text-red-500',
          )}
          style={{
            transform: styles.transform,
            transition: styles.transition,
          }}
        />

        {/* 涟漪效果 */}
        {ripple.show && (
          <span
            className="animate-ripple pointer-events-none absolute rounded-full bg-white/30"
            style={{
              left: ripple.x - 10,
              top: ripple.y - 10,
              width: 20,
              height: 20,
            }}
          />
        )}
      </>
    );

    if (!asButton) {
      return (
        <span
          className={cn('relative inline-flex items-center justify-center', className)}
          style={{
            cursor: styles.cursor,
            opacity: styles.opacity,
          }}
          {...handlers}
          onClick={handleClick}
          data-testid={dataTestId}
          data-nav-item={dataNavItem}
        >
          {iconElement}
        </span>
      );
    }

    return (
      <button
        ref={buttonRef}
        type={type}
        className={cn(
          'relative inline-flex items-center justify-center rounded-lg p-2',
          'transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2',
          state === 'hover' && 'bg-purple-50',
          state === 'active' && 'bg-purple-100',
          className,
        )}
        style={{
          cursor: styles.cursor,
          opacity: styles.opacity,
        }}
        aria-label={ariaLabel}
        title={title}
        disabled={state === 'disabled' || state === 'loading'}
        {...handlers}
        onClick={handleClick}
        data-testid={dataTestId}
        data-nav-item={dataNavItem}
      >
        {iconElement}
      </button>
    );
  },
);

InteractiveIcon.displayName = 'InteractiveIcon';

export default InteractiveIcon;
