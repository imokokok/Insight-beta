import { TrendingUp, TrendingDown, Activity, AlertCircle, CheckCircle } from 'lucide-react';

import type { StatCardStatus, StatCardColor, StatusConfig } from './types';

export const statusConfig: Record<StatCardStatus, StatusConfig> = {
  healthy: {
    bg: 'bg-success/10',
    border: 'border-success/20',
    text: 'text-success-dark',
    icon: <CheckCircle className="h-5 w-5" />,
    dot: 'bg-success',
    gradient: 'from-success/10 to-success/5',
  },
  warning: {
    bg: 'bg-warning/10',
    border: 'border-warning/20',
    text: 'text-warning-dark',
    icon: <AlertCircle className="h-5 w-5" />,
    dot: 'bg-warning',
    gradient: 'from-warning/10 to-warning/5',
  },
  critical: {
    bg: 'bg-error/10',
    border: 'border-error/20',
    text: 'text-error-dark',
    icon: <AlertCircle className="h-5 w-5" />,
    dot: 'bg-error',
    gradient: 'from-error/10 to-error/5',
  },
  neutral: {
    bg: 'bg-muted/30',
    border: 'border-muted',
    text: 'text-muted-foreground',
    icon: <Activity className="h-5 w-5" />,
    dot: 'bg-muted-foreground',
    gradient: 'from-muted-foreground/10 to-muted-foreground/5',
  },
};

export const colorConfig: Record<StatCardColor, StatusConfig> = {
  blue: {
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    text: 'text-primary-dark',
    icon: <Activity className="h-5 w-5" />,
    dot: 'bg-primary',
    gradient: 'from-primary/10 to-primary/5',
  },
  green: {
    bg: 'bg-success/10',
    border: 'border-success/20',
    text: 'text-success-dark',
    icon: <CheckCircle className="h-5 w-5" />,
    dot: 'bg-success',
    gradient: 'from-success/10 to-success/5',
  },
  amber: {
    bg: 'bg-warning/10',
    border: 'border-warning/20',
    text: 'text-warning-dark',
    icon: <AlertCircle className="h-5 w-5" />,
    dot: 'bg-warning',
    gradient: 'from-warning/10 to-warning/5',
  },
  purple: {
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    text: 'text-primary-dark',
    icon: <Activity className="h-5 w-5" />,
    dot: 'bg-primary',
    gradient: 'from-primary/10 to-primary/5',
  },
  red: {
    bg: 'bg-error/10',
    border: 'border-error/20',
    text: 'text-error-dark',
    icon: <AlertCircle className="h-5 w-5" />,
    dot: 'bg-error',
    gradient: 'from-error/10 to-error/5',
  },
  cyan: {
    bg: 'bg-accent/10',
    border: 'border-accent/20',
    text: 'text-accent-dark',
    icon: <Activity className="h-5 w-5" />,
    dot: 'bg-accent',
    gradient: 'from-accent/10 to-accent/5',
  },
  pink: {
    bg: 'bg-accent/10',
    border: 'border-accent/20',
    text: 'text-accent-dark',
    icon: <Activity className="h-5 w-5" />,
    dot: 'bg-accent',
    gradient: 'from-accent/10 to-accent/5',
  },
};

export { TrendingUp, TrendingDown };
