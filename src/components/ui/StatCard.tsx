/**
 * StatCard Component - 统计卡片组件
 */

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type StatColor = 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'cyan';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color?: StatColor;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  onClick?: () => void;
}

const colorClasses: Record<StatColor, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
  green: { bg: 'bg-green-50', text: 'text-green-600' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600' },
  red: { bg: 'bg-red-50', text: 'text-red-600' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600' },
};

export function StatCard({
  title,
  value,
  icon,
  color = 'blue',
  subtitle,
  trend,
  className,
  onClick,
}: StatCardProps) {
  const colors = colorClasses[color];

  return (
    <Card
      className={cn(
        'border-0 shadow-sm transition-all duration-200',
        onClick && 'cursor-pointer hover:scale-[1.02] hover:shadow-md',
        className,
      )}
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-4 p-6">
        <div className={cn('rounded-lg p-3', colors.bg, colors.text)}>{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-gray-600">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="truncate text-2xl font-bold">{value}</p>
            {trend && (
              <span
                className={cn(
                  'text-xs font-medium',
                  trend.isPositive ? 'text-green-600' : 'text-red-600',
                )}
              >
                {trend.isPositive ? '+' : ''}
                {trend.value}%
              </span>
            )}
          </div>
          {subtitle && <p className="truncate text-xs text-gray-500">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * StatCard Skeleton - 加载状态
 */
export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('border-0 shadow-sm', className)}>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="animate-pulse rounded-lg bg-gray-100 p-3">
          <div className="h-5 w-5 rounded bg-gray-200" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
          <div className="h-8 w-16 animate-pulse rounded bg-gray-200" />
        </div>
      </CardContent>
    </Card>
  );
}
