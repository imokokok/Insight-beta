'use client';

import { AlertCircle, AlertTriangle, Eye, CheckCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

export type ThreatLevel = 'high' | 'medium' | 'low' | 'safe';

interface ThreatLevelBadgeProps {
  level: ThreatLevel;
  count: number;
  className?: string;
}

const THREAT_CONFIG = {
  high: {
    bg: 'bg-rose-100',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: AlertCircle,
    label: 'High Risk',
  },
  medium: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: AlertTriangle,
    label: 'Medium Risk',
  },
  low: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: Eye,
    label: 'Low Risk',
  },
  safe: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: CheckCircle,
    label: 'Safe',
  },
} as const;

export function ThreatLevelBadge({ level, count, className }: ThreatLevelBadgeProps) {
  const config = THREAT_CONFIG[level];
  const Icon = config.icon;

  return (
    <div
      role="status"
      aria-label={`${config.label}: ${count}`}
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2',
        config.bg,
        config.border,
        className,
      )}
    >
      <div className={config.text}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div>
        <span className={cn('text-xs font-semibold', config.text)}>{config.label}</span>
        <span className={cn('ml-2 text-sm font-bold', config.text)}>{count}</span>
      </div>
    </div>
  );
}
