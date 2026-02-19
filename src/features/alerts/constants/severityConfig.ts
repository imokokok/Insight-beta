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
    bgColor: 'bg-red-600',
    borderColor: 'border-red-600/30 bg-red-600/10',
    badgeVariant: 'danger',
    iconColor: 'text-red-600',
    variant: 'destructive',
    label: 'Emergency',
  },
  critical: {
    color: 'text-red-600',
    bgColor: 'bg-red-500',
    borderColor: 'border-red-500/30 bg-red-500/10',
    badgeVariant: 'danger',
    iconColor: 'text-red-500',
    variant: 'destructive',
    label: 'Critical',
  },
  high: {
    color: 'text-orange-600',
    bgColor: 'bg-orange-500',
    borderColor: 'border-orange-500/30 bg-orange-500/10',
    badgeVariant: 'warning',
    iconColor: 'text-orange-500',
    variant: 'default',
    label: 'High',
  },
  medium: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500',
    borderColor: 'border-yellow-500/30 bg-yellow-500/10',
    badgeVariant: 'warning',
    iconColor: 'text-yellow-500',
    variant: 'outline',
    label: 'Medium',
  },
  low: {
    color: 'text-green-600',
    bgColor: 'bg-green-500',
    borderColor: 'border-green-500/30 bg-green-500/10',
    badgeVariant: 'secondary',
    iconColor: 'text-green-500',
    variant: 'secondary',
    label: 'Low',
  },
  warning: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500',
    borderColor: 'border-yellow-500/30 bg-yellow-500/10',
    badgeVariant: 'warning',
    iconColor: 'text-yellow-500',
    variant: 'outline',
    label: 'Warning',
  },
  info: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-500',
    borderColor: 'border-blue-500/30 bg-blue-500/10',
    badgeVariant: 'info',
    iconColor: 'text-blue-500',
    variant: 'outline',
    label: 'Info',
  },
} as const;

export function getSeverityConfig(severity: AlertSeverity): SeverityConfig {
  return severityConfig[severity] || severityConfig.medium;
}
