import Link from 'next/link';

import { useComponentPreload } from '@/hooks/usePreload';
import { cn } from '@/lib/utils';

import type { Route } from 'next';

interface PreloadLinkProps<T extends string = string> {
  href: Route<T>;
  children: React.ReactNode;
  className?: string;
  preloadDelay?: number;
  onPreload?: () => void;
}

/**
 * 预加载链接组件
 *
 * 当用户悬停在链接上时预加载目标页面组件
 * 实现类似 Next.js 的 Link prefetch 功能，但支持自定义预加载逻辑
 *
 * @example
 * <PreloadLink href="/oracle/dashboard" preloadDelay={100}>
 *   Dashboard
 * </PreloadLink>
 */
export function PreloadLink<T extends string>({
  href,
  children,
  className,
  preloadDelay = 100,
  onPreload,
}: PreloadLinkProps<T>) {
  const { preloadProps, isPreloaded } = useComponentPreload(
    `route:${href}`,
    () => import(/* webpackChunkName: "[request]" */ `@/app${href}/page`),
    { delay: preloadDelay, onPreload },
  );

  return (
    <Link
      href={href}
      className={cn(className, isPreloaded() && 'data-[preloaded="true"]')}
      {...preloadProps}
      data-preloaded={isPreloaded()}
    >
      {children}
    </Link>
  );
}
