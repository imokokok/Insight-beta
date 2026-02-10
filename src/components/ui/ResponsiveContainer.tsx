'use client';

import React from 'react';

import { useIsMobile, useIsTablet } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

/**
 * 响应式容器组件
 *
 * 根据屏幕尺寸自动调整布局
 *
 * @example
 * <ResponsiveContainer
 *   mobile={<MobileView />}
 *   tablet={<TabletView />}
 *   desktop={<DesktopView />}
 * />
 */
interface ResponsiveContainerProps {
  mobile: React.ReactNode;
  tablet?: React.ReactNode;
  desktop: React.ReactNode;
  className?: string;
}

export function ResponsiveContainer({
  mobile,
  tablet,
  desktop,
  className,
}: ResponsiveContainerProps) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  let content: React.ReactNode;

  if (isMobile) {
    content = mobile;
  } else if (isTablet && tablet) {
    content = tablet;
  } else {
    content = desktop;
  }

  return <div className={cn(className)}>{content}</div>;
}

/**
 * 响应式显示组件
 * 只在指定屏幕尺寸显示子元素
 */
interface ShowProps {
  children: React.ReactNode;
  on?: 'mobile' | 'tablet' | 'desktop' | ('mobile' | 'tablet' | 'desktop')[];
  className?: string;
}

export function Show({ children, on = 'desktop', className }: ShowProps) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = !isMobile && !isTablet;

  const targets = Array.isArray(on) ? on : [on];

  const shouldShow =
    (targets.includes('mobile') && isMobile) ||
    (targets.includes('tablet') && isTablet) ||
    (targets.includes('desktop') && isDesktop);

  if (!shouldShow) return null;

  return <div className={cn(className)}>{children}</div>;
}

/**
 * 响应式隐藏组件
 * 在指定屏幕尺寸隐藏子元素
 */
interface HideProps {
  children: React.ReactNode;
  on?: 'mobile' | 'tablet' | 'desktop' | ('mobile' | 'tablet' | 'desktop')[];
  className?: string;
}

export function Hide({ children, on = 'mobile', className }: HideProps) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = !isMobile && !isTablet;

  const targets = Array.isArray(on) ? on : [on];

  const shouldHide =
    (targets.includes('mobile') && isMobile) ||
    (targets.includes('tablet') && isTablet) ||
    (targets.includes('desktop') && isDesktop);

  if (shouldHide) return null;

  return <div className={cn(className)}>{children}</div>;
}
