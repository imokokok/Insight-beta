/**
 * StatusBadge Component - 可复用的状态徽章组件
 */

import { Clock, CheckCircle, AlertTriangle, XCircle, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type StatusType =
  | 'active'
  | 'stale'
  | 'error'
  | 'pending'
  | 'settled'
  | 'disputed'
  | 'expired'
  | 'inactive'
  | 'resolved'
  | 'unknown';

interface StatusBadgeProps {
  status: StatusType;
  showIcon?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<
  StatusType,
  {
    label: string;
    icon: React.ReactNode;
    className: string;
  }
> = {
  active: {
    label: 'Active',
    icon: <CheckCircle className="mr-1 h-3 w-3" />,
    className: 'bg-green-100 text-green-700 hover:bg-green-100',
  },
  stale: {
    label: 'Stale',
    icon: <Clock className="mr-1 h-3 w-3" />,
    className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100',
  },
  error: {
    label: 'Error',
    icon: <AlertTriangle className="mr-1 h-3 w-3" />,
    className: 'bg-red-100 text-red-700 hover:bg-red-100',
  },
  pending: {
    label: 'Pending',
    icon: <Clock className="mr-1 h-3 w-3" />,
    className: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  },
  settled: {
    label: 'Settled',
    icon: <CheckCircle className="mr-1 h-3 w-3" />,
    className: 'bg-green-100 text-green-700 hover:bg-green-100',
  },
  disputed: {
    label: 'Disputed',
    icon: <AlertTriangle className="mr-1 h-3 w-3" />,
    className: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  },
  expired: {
    label: 'Expired',
    icon: <XCircle className="mr-1 h-3 w-3" />,
    className: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
  },
  inactive: {
    label: 'Inactive',
    icon: <Minus className="mr-1 h-3 w-3" />,
    className: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
  },
  resolved: {
    label: 'Resolved',
    icon: <CheckCircle className="mr-1 h-3 w-3" />,
    className: 'bg-green-100 text-green-700 hover:bg-green-100',
  },
  unknown: {
    label: 'Unknown',
    icon: <Minus className="mr-1 h-3 w-3" />,
    className: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
  },
};

export function StatusBadge({ status, showIcon = true, className, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.unknown;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  return (
    <Badge className={cn(config.className, sizeClasses[size], className)}>
      {showIcon && config.icon}
      {config.label}
    </Badge>
  );
}

/**
 * 获取状态配置（用于自定义渲染）
 */
export function getStatusConfig(status: StatusType) {
  return statusConfig[status] || statusConfig.unknown;
}
