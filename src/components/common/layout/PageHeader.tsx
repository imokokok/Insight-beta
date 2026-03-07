'use client';

import React, { memo, useMemo } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { motion } from 'framer-motion';
import {
  RefreshCw,
  Download,
  MoreHorizontal,
  Settings,
  Menu,
  ChevronRight,
  Home,
} from 'lucide-react';

import { Button } from '@/components/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';
import type { BreadcrumbItem } from '@/types/common';

export type { BreadcrumbItem } from '@/types/common';

export interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  onRefresh?: () => void;
  onExport?: () => void;
  exportDisabled?: boolean;
  breadcrumbs?: BreadcrumbItem[];
  refreshDisabled?: boolean;
  loading?: boolean;
  extraActions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export interface DashboardPageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  statusBadge?: React.ReactNode;
  refreshControl?: React.ReactNode;
  onMobileMenuClick?: () => void;
  showMobileMenu?: boolean;
  extraActions?: React.ReactNode;
  className?: string;
  sticky?: boolean;
}

export interface DynamicPageHeaderProps {
  className?: string;
  actions?: React.ReactNode;
}

const routeTitleMap: Record<string, string> = {
  '/analytics': 'nav.monitoring',
  '/cross-chain': 'nav.crossChain',
  '/cross-chain/overview': 'nav.crossChainOverview',
  '/cross-chain/comparison': 'nav.crossChainComparison',
  '/cross-chain/history': 'nav.crossChainHistory',
  '/explore': 'nav.explore',
  '/alerts': 'nav.alertsCenter',
  '/oracle/analytics/disputes': 'nav.arbitration',
  '/oracle/analytics/deviation': 'nav.deviation',
  '/oracle/dashboard': 'nav.dashboard',
  '/oracle/protocols': 'nav.protocols',
  '/oracle/address': 'nav.address',
  '/oracle/comparison': 'nav.oracleComparison',
};

function getPageTitle(pathname: string | null): string {
  if (!pathname) return 'app.brand';

  if (routeTitleMap[pathname]) {
    return routeTitleMap[pathname];
  }

  for (const [route, title] of Object.entries(routeTitleMap)) {
    if (pathname.startsWith(route + '/')) {
      return title;
    }
  }

  return 'app.brand';
}

export const PageHeader = memo(function PageHeader({
  title,
  description,
  icon,
  onRefresh,
  onExport,
  exportDisabled = false,
  breadcrumbs,
  refreshDisabled = false,
  loading = false,
  extraActions,
  className,
  children,
}: PageHeaderProps) {
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            href="/"
            className="flex items-center gap-1 rounded px-1.5 py-0.5 transition-all duration-200 hover:bg-muted/50 hover:text-foreground"
          >
            <Home className="h-4 w-4" />
          </Link>
          {breadcrumbs.map((item, index) => (
            <React.Fragment key={index}>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              {item.href ? (
                <a
                  href={item.href}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 transition-all duration-200 hover:bg-muted/50 hover:text-foreground"
                >
                  {item.icon}
                  {item.label}
                </a>
              ) : (
                <span className="flex items-center gap-1 font-medium text-foreground">
                  {item.icon}
                  {item.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            {icon && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="flex-shrink-0 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 p-2.5 shadow-sm"
              >
                {icon}
              </motion.div>
            )}
            <div>
              <h1 className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
                {title}
              </h1>
              {description && (
                <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={refreshDisabled || loading}
              className="hidden transition-all duration-200 hover:border-primary/50 hover:shadow-sm sm:inline-flex"
            >
              <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
              Refresh
              <kbd className="ml-2 hidden h-5 items-center gap-1 rounded border bg-muted/50 px-1.5 font-mono text-[10px] font-medium lg:inline-flex">
                ⌘R
              </kbd>
            </Button>
          )}

          {onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              disabled={exportDisabled}
              className="hidden transition-all duration-200 hover:border-primary/50 hover:shadow-sm sm:inline-flex"
            >
              <Download className="mr-2 h-4 w-4" />
              Export
              <kbd className="ml-2 hidden h-5 items-center gap-1 rounded border bg-muted/50 px-1.5 font-mono text-[10px] font-medium lg:inline-flex">
                ⌘E
              </kbd>
            </Button>
          )}

          <div className="hidden flex-wrap items-center justify-end gap-2 sm:flex">
            {extraActions}
            {children}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 flex-shrink-0 p-0 transition-all duration-200 hover:border-primary/50 hover:shadow-sm"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="sm:hidden">
                {onRefresh && (
                  <DropdownMenuItem onClick={onRefresh} disabled={refreshDisabled || loading}>
                    <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
                    {t('common.refresh')}
                  </DropdownMenuItem>
                )}
                {onExport && (
                  <DropdownMenuItem onClick={onExport} disabled={exportDisabled}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                    <span className="ml-auto text-xs text-muted-foreground">⌘E</span>
                  </DropdownMenuItem>
                )}
                {(onRefresh || onExport) && <DropdownMenuSeparator />}
              </div>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
});

export const DashboardPageHeader = memo(function DashboardPageHeader({
  title,
  description,
  icon,
  statusBadge,
  refreshControl,
  onMobileMenuClick,
  showMobileMenu = true,
  extraActions,
  className,
  sticky = true,
}: DashboardPageHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={cn('px-4 py-4 lg:px-6', sticky && 'sticky top-0 z-10', className)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showMobileMenu && onMobileMenuClick && (
            <Button
              variant="ghost"
              size="icon"
              className="transition-all duration-200 hover:bg-muted/50 lg:hidden"
              onClick={onMobileMenuClick}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-center gap-3">
            {icon && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="hidden rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 p-2.5 shadow-sm sm:block"
              >
                {icon}
              </motion.div>
            )}
            <div>
              <h1 className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-xl font-bold tracking-tight text-foreground lg:text-2xl">
                {title}
              </h1>
              {description && (
                <p className="mt-1 hidden text-sm leading-relaxed text-muted-foreground sm:block">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {statusBadge}
          {statusBadge && refreshControl && (
            <div className="hidden h-6 w-px bg-border/30 sm:block" />
          )}
          {refreshControl}
          {extraActions}
        </div>
      </div>
    </motion.header>
  );
});

export function DynamicPageHeader({ className, actions }: DynamicPageHeaderProps) {
  const pathname = usePathname();
  const { t } = useI18n();

  const titleKey = useMemo(() => getPageTitle(pathname), [pathname]);
  const title = t(titleKey);

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={cn(
        'sticky top-0 z-20 mb-6 flex items-center justify-between gap-3',
        'px-1 py-5',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <motion.h1
          key={title}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-xl font-bold text-foreground md:text-2xl"
        >
          {title}
        </motion.h1>
      </div>

      {actions && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, delay: 0.15 }}
          className="flex items-center gap-3"
        >
          {actions}
        </motion.div>
      )}
    </motion.header>
  );
}

export function PageHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 animate-pulse rounded-lg bg-gray-200" />
          <div>
            <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
            <div className="mt-2 h-4 w-64 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 animate-pulse rounded bg-gray-200" />
          <div className="h-9 w-24 animate-pulse rounded bg-gray-200" />
          <div className="h-9 w-9 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

export function DashboardPageHeaderSkeleton({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        'border-b border-gray-200/50 bg-white/80 px-4 py-3 backdrop-blur-sm lg:px-6',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-200 lg:hidden" />
          <div>
            <div className="h-7 w-48 animate-pulse rounded bg-gray-200" />
            <div className="mt-1 h-4 w-32 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-24 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-8 w-32 animate-pulse rounded-lg bg-gray-200" />
        </div>
      </div>
    </header>
  );
}

export default PageHeader;
