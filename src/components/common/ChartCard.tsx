/**
 * Chart Card Component
 *
 * 专业图表卡片组件
 * - 带标题栏和操作按钮
 * - 全屏查看功能
 * - 导出功能
 */

import React, { memo, useState, useRef } from 'react';

import { Maximize2, MoreHorizontal, Info } from 'lucide-react';

import { Button } from '@/components/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui';
import { cn } from '@/shared/utils';

import { ChartFullscreen } from './ChartFullscreen';
import { ExportButton } from './ExportButton';

export interface ChartCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  loading?: boolean;
  className?: string;
  data?: object[];
  filename?: string;
  extraActions?: React.ReactNode;
  tooltip?: string;
}

export const ChartCard = memo(function ChartCard({
  title,
  description,
  icon,
  children,
  loading = false,
  className,
  data,
  filename,
  extraActions,
  tooltip,
}: ChartCardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <>
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
            <ExportButton
              chartRef={chartRef}
              data={data}
              filename={filename || title.toLowerCase().replace(/\s+/g, '-')}
            />
            {extraActions}

            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={toggleFullscreen}>
              <Maximize2 className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={toggleFullscreen}>
                  <Maximize2 className="mr-2 h-4 w-4" />
                  Fullscreen View
                </DropdownMenuItem>
                {extraActions && <DropdownMenuSeparator />}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent ref={chartRef} className={cn('pt-0', loading && 'opacity-50')}>
          {children}
        </CardContent>
      </Card>

      <ChartFullscreen
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={title}
        description={description}
        icon={icon}
        data={data}
        filename={filename || title.toLowerCase().replace(/\s+/g, '-')}
      >
        {children}
      </ChartFullscreen>
    </>
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
