import type { AlertSeverity } from '@/types/common/status';

export interface SeverityConfig {
  color: string;
  bgColor: string;
  borderColor: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'info' | 'danger';
  iconColor: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  label: string;
}

export const severityConfig: Record<AlertSeverity, SeverityConfig> = {
  emergency: {
    color: 'text-red-700',
    bgColor: 'bg-gradient-to-r from-red-600 to-red-700',
    borderColor: 'border-l-4 border-red-700 bg-red-50',
    badgeVariant: 'danger',
    iconColor: 'text-red-700',
    variant: 'destructive',
    label: 'Emergency',
  },
  critical: {
    color: 'text-red-600',
    bgColor: 'bg-gradient-to-r from-red-500 to-red-600',
    borderColor: 'border-l-4 border-red-600 bg-red-50/80',
    badgeVariant: 'danger',
    iconColor: 'text-red-600',
    variant: 'destructive',
    label: 'Critical',
  },
  high: {
    color: 'text-orange-600',
    bgColor: 'bg-gradient-to-r from-orange-500 to-orange-600',
    borderColor: 'border-l-4 border-orange-500 bg-orange-50',
    badgeVariant: 'warning',
    iconColor: 'text-orange-500',
    variant: 'default',
    label: 'High',
  },
  medium: {
    color: 'text-yellow-600',
    bgColor: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
    borderColor: 'border-l-4 border-yellow-500 bg-yellow-50',
    badgeVariant: 'warning',
    iconColor: 'text-yellow-500',
    variant: 'outline',
    label: 'Medium',
  },
  low: {
    color: 'text-green-600',
    bgColor: 'bg-gradient-to-r from-green-500 to-green-600',
    borderColor: 'border-l-4 border-green-500 bg-green-50',
    badgeVariant: 'secondary',
    iconColor: 'text-green-500',
    variant: 'secondary',
    label: 'Low',
  },
  warning: {
    color: 'text-yellow-600',
    bgColor: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
    borderColor: 'border-l-4 border-yellow-500 bg-yellow-50',
    badgeVariant: 'warning',
    iconColor: 'text-yellow-500',
    variant: 'outline',
    label: 'Warning',
  },
  info: {
    color: 'text-blue-600',
    bgColor: 'bg-gradient-to-r from-blue-500 to-blue-600',
    borderColor: 'border-l-4 border-blue-500 bg-blue-50',
    badgeVariant: 'info',
    iconColor: 'text-blue-500',
    variant: 'outline',
    label: 'Info',
  },
} as const;

export function getSeverityConfig(severity: AlertSeverity): SeverityConfig {
  return severityConfig[severity] || severityConfig.medium;
}
