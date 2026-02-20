import { memo, useState, useMemo, Fragment } from 'react';

import { motion } from 'framer-motion';
import { Info, MoreHorizontal } from 'lucide-react';

import { Sparkline, StatComparison, CHART_COLORS } from '@/components/charts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, formatChangePercent, formatTimeAgo } from '@/shared/utils';

import { TrendingUp, TrendingDown } from './config';

import type { StatCardBaseProps, StatusConfig, SparklineData } from './types';

interface StatCardDetailedProps extends StatCardBaseProps {
  config: StatusConfig;
}

export const StatCardDetailed = memo(function StatCardDetailed({
  title,
  value,
  subtitle,
  icon,
  trend,
  sparkline,
  sparklineData,
  className,
  onClick,
  actions,
  tooltip,
  comparison,
  extra,
  lastUpdated,
  config,
}: StatCardDetailedProps) {
  const [isHovered, setIsHovered] = useState(false);

  const sparklineWithData: SparklineData | undefined =
    sparkline || (sparklineData ? { data: sparklineData } : undefined);

  const trendDisplay = useMemo(() => {
    if (!trend) return null;
    const { value: trendValue, isPositive, label } = trend;
    const color = isPositive ? 'text-success' : 'text-error';
    const Icon = isPositive ? TrendingUp : TrendingDown;

    return (
      <div className="flex items-center gap-1.5">
        <Icon className={cn('h-3.5 w-3.5', color)} />
        <span className={cn('text-xs font-semibold', color)}>
          {formatChangePercent(trendValue / 100, 1, false)}
        </span>
        {label && <span className="text-xs text-gray-400">{label}</span>}
      </div>
    );
  }, [trend]);

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all duration-300',
        onClick && 'cursor-pointer',
        isHovered && 'shadow-lg',
        className,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            {tooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {actions && actions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actions.map((action, index) => (
                  <Fragment key={index}>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        action.onClick();
                      }}
                      className={action.variant === 'destructive' ? 'text-red-600' : ''}
                    >
                      {action.icon}
                      {action.label}
                    </DropdownMenuItem>
                    {index < actions.length - 1 && <DropdownMenuSeparator />}
                  </Fragment>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">{value}</span>
              {subtitle && <span className="text-sm text-muted-foreground">{subtitle}</span>}
            </div>

            {comparison && (
              <div className="mt-3">
                <StatComparison
                  current={comparison.current}
                  previous={comparison.previous}
                  label={comparison.label}
                />
              </div>
            )}

            {!comparison && trendDisplay && <div className="mt-2">{trendDisplay}</div>}
          </div>

          <div className="flex flex-col items-end gap-2">
            <motion.div
              animate={{ scale: isHovered ? 1.1 : 1, rotate: isHovered ? 5 : 0 }}
              transition={{ duration: 0.2 }}
              className={cn('rounded-xl p-3', config.bg, config.text)}
            >
              {icon || config.icon}
            </motion.div>

            {sparklineWithData && (
              <Sparkline
                data={sparklineWithData.data}
                color={sparklineWithData.color || CHART_COLORS.primary.DEFAULT}
                showArea={sparklineWithData.showArea}
                width={100}
                height={30}
              />
            )}
          </div>
        </div>

        {extra && <div className="mt-4 border-t border-gray-100 pt-4">{extra}</div>}

        {lastUpdated && (
          <p className="mt-3 text-xs text-gray-400">Updated {formatTimeAgo(lastUpdated)}</p>
        )}
      </CardContent>
    </Card>
  );
});
