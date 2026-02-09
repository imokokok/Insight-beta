import Link from 'next/link';

import { cn } from '@/lib/utils';

import type { Route } from 'next';

interface PreloadLinkProps<T extends string = string> {
  href: Route<T>;
  children: React.ReactNode;
  className?: string;
  prefetch?: boolean;
}

/**
 * 预加载链接组件
 *
 * 基于 Next.js Link 组件的包装，支持预加载功能
 *
 * @example
 * <PreloadLink href="/oracle/dashboard" prefetch={true}>
 *   Dashboard
 * </PreloadLink>
 */
export function PreloadLink<T extends string>({
  href,
  children,
  className,
  prefetch = true,
}: PreloadLinkProps<T>) {
  return (
    <Link href={href} className={cn(className)} prefetch={prefetch}>
      {children}
    </Link>
  );
}
