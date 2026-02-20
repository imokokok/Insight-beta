import type React from 'react';

export type StatCardVariant = 'default' | 'compact' | 'detailed' | 'interactive';
export type StatCardSize = 'sm' | 'md' | 'lg';
export type StatCardStatus = 'healthy' | 'warning' | 'critical' | 'neutral';
export type StatCardColor = 'blue' | 'green' | 'amber' | 'purple' | 'red' | 'cyan' | 'pink';

export interface TrendData {
  value: number;
  isPositive: boolean;
  label?: string;
  previousValue?: number;
}

export interface SparklineData {
  data: number[];
  color?: string;
  showArea?: boolean;
}

export interface StatCardAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'destructive';
}

export interface StatCardBaseProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: StatCardColor;
  trend?: TrendData;
  sparkline?: SparklineData;
  sparklineData?: number[];
  status?: StatCardStatus;
  size?: StatCardSize;
  loading?: boolean;
  lastUpdated?: Date | null;
  className?: string;
  onClick?: () => void;
  actions?: StatCardAction[];
  tooltip?: string;
  comparison?: {
    current: number;
    previous: number;
    label?: string;
  };
  extra?: React.ReactNode;
}

export interface StatCardProps extends StatCardBaseProps {
  variant?: StatCardVariant;
}

export interface StatCardGroupProps {
  children: React.ReactNode;
  className?: string;
  columns?: 2 | 3 | 4 | 6;
  gap?: 'sm' | 'md' | 'lg';
}

export interface DashboardStatsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'amber' | 'purple' | 'red';
}

export interface StatusConfig {
  bg: string;
  border: string;
  text: string;
  icon: React.ReactNode;
  dot: string;
  gradient: string;
}
