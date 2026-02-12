/**
 * Responsive Components
 *
 * 响应式组件库
 * - 响应式显示/隐藏
 * - 响应式容器
 * - 响应式网格
 * - 响应式文本
 */

'use client';

import type { ReactNode } from 'react';
import { useMemo } from 'react';

import { useDeviceType, useViewportSize } from '@/hooks/useMediaQuery';
import type { Breakpoint } from '@/lib/design-system/tokens/responsive';
import {
  getResponsiveGridCols,
  getResponsiveGap,
  getResponsivePadding,
  getResponsiveFontSize,
  RESPONSIVE_PATTERNS,
} from '@/lib/design-system/tokens/responsive';
import { cn } from '@/shared/utils';

// ============================================================================
// Types
// ============================================================================

type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'large';

interface ResponsiveProps {
  children: ReactNode;
  className?: string;
}

interface ShowProps extends ResponsiveProps {
  on?: DeviceType | DeviceType[];
  from?: Breakpoint;
  to?: Breakpoint;
}

interface HideProps extends ResponsiveProps {
  on?: DeviceType | DeviceType[];
  from?: Breakpoint;
  to?: Breakpoint;
}

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  mobile?: ReactNode;
  tablet?: ReactNode;
  desktop?: ReactNode;
}

interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 12;
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

interface ResponsiveTextProps {
  children: ReactNode;
  className?: string;
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
  as?: 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

interface ResponsivePaddingProps {
  children: ReactNode;
  className?: string;
  size?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

// ============================================================================
// Show Component - 在指定设备上显示
// ============================================================================

export function Show({ children, className, on, from, to }: ShowProps) {
  const deviceType = useDeviceType();
  const { width } = useViewportSize();

  const shouldShow = useMemo(() => {
    if (!on && !from && !to) return true;

    if (on) {
      const devices = Array.isArray(on) ? on : [on];
      return devices.includes(deviceType);
    }

    if (from || to) {
      const fromWidth = from ? getBreakpointWidth(from) : 0;
      const toWidth = to ? getBreakpointWidth(to) : Infinity;
      return width >= fromWidth && width < toWidth;
    }

    return true;
  }, [on, from, to, deviceType, width]);

  if (!shouldShow) return null;

  return className ? <div className={className}>{children}</div> : <>{children}</>;
}

// ============================================================================
// Hide Component - 在指定设备上隐藏
// ============================================================================

export function Hide({ children, className, on, from, to }: HideProps) {
  const deviceType = useDeviceType();
  const { width } = useViewportSize();

  const shouldHide = useMemo(() => {
    if (!on && !from && !to) return false;

    if (on) {
      const devices = Array.isArray(on) ? on : [on];
      return devices.includes(deviceType);
    }

    if (from || to) {
      const fromWidth = from ? getBreakpointWidth(from) : 0;
      const toWidth = to ? getBreakpointWidth(to) : Infinity;
      return width >= fromWidth && width < toWidth;
    }

    return false;
  }, [on, from, to, deviceType, width]);

  if (shouldHide) return null;

  return className ? <div className={className}>{children}</div> : <>{children}</>;
}

// ============================================================================
// Responsive Container - 根据设备显示不同内容
// ============================================================================

export function ResponsiveContainer({
  children,
  className,
  mobile,
  tablet,
  desktop,
}: ResponsiveContainerProps) {
  const deviceType = useDeviceType();

  let content = children;

  if (deviceType === 'mobile' && mobile !== undefined) {
    content = mobile;
  } else if (deviceType === 'tablet' && tablet !== undefined) {
    content = tablet;
  } else if ((deviceType === 'desktop' || deviceType === 'large') && desktop !== undefined) {
    content = desktop;
  }

  return <div className={className}>{content}</div>;
}

// ============================================================================
// Responsive Grid - 响应式网格
// ============================================================================

export function ResponsiveGrid({
  children,
  className,
  columns = 4,
  gap = 'md',
}: ResponsiveGridProps) {
  const gridColsClass = getResponsiveGridCols(columns);
  const gapClass = getResponsiveGap(gap);

  return <div className={cn('grid', gridColsClass, gapClass, className)}>{children}</div>;
}

// ============================================================================
// Responsive Text - 响应式文本
// ============================================================================

export function ResponsiveText({
  children,
  className,
  size = 'base',
  as: Component = 'span',
}: ResponsiveTextProps) {
  const sizeClass = getResponsiveFontSize(size);

  return <Component className={cn(sizeClass, className)}>{children}</Component>;
}

// ============================================================================
// Responsive Padding - 响应式内边距
// ============================================================================

export function ResponsivePadding({ children, className, size = 'md' }: ResponsivePaddingProps) {
  const paddingClass = getResponsivePadding(size);

  return <div className={cn(paddingClass, className)}>{children}</div>;
}

// ============================================================================
// Mobile Only - 仅在移动端显示
// ============================================================================

export function MobileOnly({ children, className }: ResponsiveProps) {
  return <div className={cn(RESPONSIVE_PATTERNS.visibility.mobileOnly, className)}>{children}</div>;
}

// ============================================================================
// Tablet Only - 仅在平板端显示
// ============================================================================

export function TabletOnly({ children, className }: ResponsiveProps) {
  return <div className={cn(RESPONSIVE_PATTERNS.visibility.tabletOnly, className)}>{children}</div>;
}

// ============================================================================
// Desktop Only - 仅在桌面端显示
// ============================================================================

export function DesktopOnly({ children, className }: ResponsiveProps) {
  return (
    <div className={cn(RESPONSIVE_PATTERNS.visibility.desktopOnly, className)}>{children}</div>
  );
}

// ============================================================================
// Not Mobile - 在非移动端显示
// ============================================================================

export function NotMobile({ children, className }: ResponsiveProps) {
  return <div className={cn(RESPONSIVE_PATTERNS.visibility.notMobile, className)}>{children}</div>;
}

// ============================================================================
// Not Desktop - 在非桌面端显示
// ============================================================================

export function NotDesktop({ children, className }: ResponsiveProps) {
  return <div className={cn(RESPONSIVE_PATTERNS.visibility.notDesktop, className)}>{children}</div>;
}

// ============================================================================
// Responsive Stack - 响应式堆叠布局
// ============================================================================

interface ResponsiveStackProps {
  children: ReactNode;
  className?: string;
  direction?: 'row' | 'column' | 'responsive';
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
}

export function ResponsiveStack({
  children,
  className,
  direction = 'responsive',
  gap = 'md',
  align = 'stretch',
  justify = 'start',
}: ResponsiveStackProps) {
  const directionClasses = {
    row: 'flex-row',
    column: 'flex-col',
    responsive: RESPONSIVE_PATTERNS.direction.responsive,
  };

  const gapClasses = {
    none: 'gap-0',
    xs: 'gap-1 sm:gap-2',
    sm: 'gap-2 sm:gap-3',
    md: 'gap-3 sm:gap-4',
    lg: 'gap-4 sm:gap-6',
    xl: 'gap-6 sm:gap-8',
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
  };

  return (
    <div
      className={cn(
        'flex',
        directionClasses[direction],
        gapClasses[gap],
        alignClasses[align],
        justifyClasses[justify],
        className,
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Responsive Image - 响应式图片
// ============================================================================

interface ResponsiveImageProps {
  src: string;
  alt: string;
  className?: string;
  mobileSrc?: string;
  tabletSrc?: string;
  desktopSrc?: string;
  aspectRatio?: 'auto' | 'square' | 'video' | 'wide';
  objectFit?: 'cover' | 'contain' | 'fill';
}

export function ResponsiveImage({
  src,
  alt,
  className,
  mobileSrc,
  tabletSrc,
  desktopSrc,
  aspectRatio = 'auto',
  objectFit = 'cover',
}: ResponsiveImageProps) {
  const deviceType = useDeviceType();

  const aspectRatioClasses = {
    auto: 'aspect-auto',
    square: 'aspect-square',
    video: 'aspect-video',
    wide: 'aspect-[21/9]',
  };

  const objectFitClasses = {
    cover: 'object-cover',
    contain: 'object-contain',
    fill: 'object-fill',
  };

  let imageSrc = src;
  if (deviceType === 'mobile' && mobileSrc) {
    imageSrc = mobileSrc;
  } else if (deviceType === 'tablet' && tabletSrc) {
    imageSrc = tabletSrc;
  } else if ((deviceType === 'desktop' || deviceType === 'large') && desktopSrc) {
    imageSrc = desktopSrc;
  }

  return (
    <div className={cn('overflow-hidden', aspectRatioClasses[aspectRatio], className)}>
      <img
        src={imageSrc}
        alt={alt}
        className={cn('h-full w-full', objectFitClasses[objectFit])}
        loading="lazy"
      />
    </div>
  );
}

// ============================================================================
// Responsive Table - 响应式表格
// ============================================================================

interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
  scrollable?: boolean;
}

export function ResponsiveTable({ children, className, scrollable = true }: ResponsiveTableProps) {
  if (scrollable) {
    return (
      <div className="w-full overflow-x-auto">
        <table className={cn('w-full min-w-[640px]', className)}>{children}</table>
      </div>
    );
  }

  return <table className={cn('w-full', className)}>{children}</table>;
}

// ============================================================================
// Touch Device Components
// ============================================================================

interface TouchDeviceProps {
  children: ReactNode;
  className?: string;
}

export function TouchOnly({ children, className }: TouchDeviceProps) {
  return <div className={cn('hidden [@media(hover:none)]:block', className)}>{children}</div>;
}

export function MouseOnly({ children, className }: TouchDeviceProps) {
  return <div className={cn('hidden [@media(hover:hover)]:block', className)}>{children}</div>;
}

// ============================================================================
// Reduced Motion Components
// ============================================================================

interface MotionProps {
  children: ReactNode;
  className?: string;
}

export function ReducedMotion({ children, className }: MotionProps) {
  return (
    <div className={cn('hidden [@media(prefers-reduced-motion:reduce)]:block', className)}>
      {children}
    </div>
  );
}

export function NoReducedMotion({ children, className }: MotionProps) {
  return (
    <div className={cn('block [@media(prefers-reduced-motion:reduce)]:hidden', className)}>
      {children}
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getBreakpointWidth(breakpoint: Breakpoint): number {
  const widths: Record<Breakpoint, number> = {
    xs: 475,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  };
  return widths[breakpoint];
}
