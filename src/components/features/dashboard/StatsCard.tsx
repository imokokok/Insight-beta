'use client';

import { memo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  loading?: boolean;
  className?: string;
}

function StatsCardComponent({ title, value, icon, trend, loading, className }: StatsCardProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <Skeleton className="mb-2 h-8 w-24 rounded-lg" />
          <Skeleton className="h-4 w-32 rounded-md" />
        </CardContent>
      </Card>
    );
  }

  const trendConfig = {
    up: {
      icon: TrendingUp,
      iconColor: 'text-red-600',
      bgColor: 'bg-red-100',
      textColor: 'text-red-600',
      label: 'Increasing',
    },
    down: {
      icon: TrendingDown,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-100',
      textColor: 'text-green-600',
      label: 'Decreasing',
    },
    stable: {
      icon: null,
      iconColor: '',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600',
      label: 'Stable',
    },
  };

  const config = trend ? trendConfig[trend] : null;

  return (
    <Card
      className={cn(
        'group transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10',
        className,
      )}
    >
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 transition-colors group-hover:text-purple-700">
              {value}
            </p>
          </div>
          <div
            className={cn(
              'rounded-full p-2 transition-transform duration-300 group-hover:scale-110',
              config?.bgColor || 'bg-purple-100',
              config?.iconColor || 'text-purple-600',
            )}
          >
            {icon}
          </div>
        </div>
        {trend && config && (
          <div className="mt-2 flex items-center text-xs">
            {config.icon && <config.icon className={cn('mr-1 h-3 w-3', config.textColor)} />}
            <span className={config.textColor}>{config.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const StatsCard = memo(StatsCardComponent);
