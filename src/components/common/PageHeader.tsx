/**
 * Page Header Component
 *
 * 专业页面头部组件
 * - 面包屑导航
 * - 标题和描述
 * - 操作按钮组
 * - 响应式设计
 */

import React, { memo } from 'react';

import Link from 'next/link';

import { ChevronRight, Home, RefreshCw, Download, MoreHorizontal, Settings } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

export interface PageHeaderProps {
  /** 面包屑导航 */
  breadcrumbs?: BreadcrumbItem[];
  /** 页面标题 */
  title: string;
  /** 页面描述 */
  description?: string;
  /** 标题图标 */
  icon?: React.ReactNode;
  /** 刷新回调 */
  onRefresh?: () => void;
  /** 导出回调 */
  onExport?: () => void;
  /** 导出按钮禁用状态 */
  exportDisabled?: boolean;
  /** 刷新按钮禁用状态 */
  refreshDisabled?: boolean;
  /** 加载状态 */
  loading?: boolean;
  /** 额外操作按钮 */
  extraActions?: React.ReactNode;
  /** 自定义类名 */
  className?: string;
  /** 子元素 */
  children?: React.ReactNode;
}

/**
 * PageHeader 组件 - 专业页面头部
 */
export const PageHeader = memo(function PageHeader({
  breadcrumbs,
  title,
  description,
  icon,
  onRefresh,
  onExport,
  exportDisabled = false,
  refreshDisabled = false,
  loading = false,
  extraActions,
  className,
  children,
}: PageHeaderProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* 面包屑导航 */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="text-muted-foreground flex items-center gap-2 text-sm">
          <Link
            href="/"
            className="hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <Home className="h-4 w-4" />
          </Link>
          {breadcrumbs.map((item, index) => (
            <React.Fragment key={index}>
              <ChevronRight className="h-4 w-4" />
              {item.href ? (
                <a
                  href={item.href}
                  className="hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  {item.icon}
                  {item.label}
                </a>
              ) : (
                <span className="text-foreground flex items-center gap-1">
                  {item.icon}
                  {item.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* 主标题区域 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* 左侧：标题和描述 */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            {icon && <div className="bg-primary/10 flex-shrink-0 rounded-lg p-2">{icon}</div>}
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">{title}</h1>
              {description && (
                <p className="text-muted-foreground mt-1 max-w-2xl text-sm sm:text-base">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex flex-shrink-0 items-center gap-2">
          {/* 刷新按钮 */}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={refreshDisabled || loading}
              className="hidden sm:flex"
            >
              <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
              Refresh
              <kbd className="bg-muted ml-2 hidden h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium lg:inline-flex">
                ⌘R
              </kbd>
            </Button>
          )}

          {/* 导出按钮 */}
          {onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              disabled={exportDisabled}
              className="hidden sm:flex"
            >
              <Download className="mr-2 h-4 w-4" />
              Export
              <kbd className="bg-muted ml-2 hidden h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium lg:inline-flex">
                ⌘E
              </kbd>
            </Button>
          )}

          {/* 额外操作 */}
          {extraActions}

          {/* 子元素 */}
          {children}

          {/* 更多操作下拉菜单 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 w-9 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {/* 移动端显示的刷新和导出 */}
              <div className="sm:hidden">
                {onRefresh && (
                  <DropdownMenuItem onClick={onRefresh} disabled={refreshDisabled || loading}>
                    <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
                    Refresh
                    <span className="text-muted-foreground ml-auto text-xs">⌘R</span>
                  </DropdownMenuItem>
                )}
                {onExport && (
                  <DropdownMenuItem onClick={onExport} disabled={exportDisabled}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                    <span className="text-muted-foreground ml-auto text-xs">⌘E</span>
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
    </div>
  );
});

/**
 * PageHeaderSkeleton 组件 - 页面头部骨架屏
 */
export function PageHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* 面包屑骨架 */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
      </div>

      {/* 标题骨架 */}
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
