/**
 * Chart Card Component
 *
 * 专业图表卡片组件
 * - 带标题栏和操作按钮
 * - 全屏查看功能
 * - 导出功能
 */

import React, { memo, useState } from 'react';

import { Download, Maximize2, Minimize2, MoreHorizontal, Info } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/shared/utils';

export interface ChartCardProps {
  /** 标题 */
  title: string;
  /** 描述 */
  description?: string;
  /** 图标 */
  icon?: React.ReactNode;
  /** 图表内容 */
  children: React.ReactNode;
  /** 加载状态 */
  loading?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 导出回调 */
  onExport?: () => void;
  /** 额外操作 */
  extraActions?: React.ReactNode;
  /** 提示信息 */
  tooltip?: string;
}

/**
 * ChartCard 组件 - 专业图表卡片
 */
export const ChartCard = memo(function ChartCard({
  title,
  description,
  icon,
  children,
  loading = false,
  className,
  onExport,
  extraActions,
  tooltip,
}: ChartCardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleExport = () => {
    onExport?.();
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 overflow-auto bg-white p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-bold">
                {icon}
                {title}
              </h2>
              {description && <p className="mt-1 text-muted-foreground">{description}</p>}
            </div>
            <div className="flex items-center gap-2">
              {onExport && (
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={toggleFullscreen}>
                <Minimize2 className="mr-2 h-4 w-4" />
                Exit Fullscreen
              </Button>
            </div>
          </div>
          <div className="h-[calc(100vh-200px)]">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              {icon}
              {title}
              {tooltip && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 cursor-help text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </CardTitle>
            {description && (
              <CardDescription className="mt-0.5 text-xs">{description}</CardDescription>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {extraActions}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onExport && (
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Data
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={toggleFullscreen}>
                <Maximize2 className="mr-2 h-4 w-4" />
                Fullscreen View
              </DropdownMenuItem>
              {extraActions && <DropdownMenuSeparator />}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className={cn('pt-0', loading && 'opacity-50')}>{children}</CardContent>
    </Card>
  );
});

/**
 * ChartCardSkeleton 组件 - 图表卡片骨架屏
 */
export function ChartCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
          <div className="mt-1 h-3 w-48 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="h-8 w-8 animate-pulse rounded bg-gray-200" />
      </CardHeader>
      <CardContent>
        <div className="h-64 animate-pulse rounded bg-gray-100" />
      </CardContent>
    </Card>
  );
}
