'use client';

import React from 'react';

import { cn } from '@/shared/utils';

/**
 * 响应式容器组件 - Web 版本
 *
 * 简化为仅支持桌面端
 *
 * @example
 * <ResponsiveContainer desktop={<DesktopView />} />
 */
interface ResponsiveContainerProps {
  desktop: React.ReactNode;
  className?: string;
}

export function ResponsiveContainer({
  desktop,
  className,
}: ResponsiveContainerProps) {
  return <div className={cn(className)}>{desktop}</div>;
}

/**
 * 显示组件 - 始终显示
 */
interface ShowProps {
  children: React.ReactNode;
  className?: string;
}

export function Show({ children, className }: ShowProps) {
  return <div className={cn(className)}>{children}</div>;
}

/**
 * 隐藏组件 - 始终显示（Web 版本不支持隐藏）
 */
interface HideProps {
  children: React.ReactNode;
  className?: string;
}

export function Hide({ children, className }: HideProps) {
  return <div className={cn(className)}>{children}</div>;
}
