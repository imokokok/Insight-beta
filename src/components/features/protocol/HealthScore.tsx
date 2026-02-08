'use client';

import { useMemo } from 'react';

import { Activity, AlertTriangle, CheckCircle, Shield, TrendingUp } from 'lucide-react';

import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

interface HealthScoreProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function HealthScore({ score, size = 'md', showLabel = true, className }: HealthScoreProps) {
  const { t } = useI18n();

  const config = useMemo(() => {
    if (score >= 90) {
      return {
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-500',
        bgLight: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        icon: CheckCircle,
        label: t('protocol:health.excellent'),
        description: t('protocol:health.excellentDesc'),
      };
    }
    if (score >= 70) {
      return {
        color: 'text-blue-500',
        bgColor: 'bg-blue-500',
        bgLight: 'bg-blue-50',
        borderColor: 'border-blue-200',
        icon: TrendingUp,
        label: t('protocol:health.good'),
        description: t('protocol:health.goodDesc'),
      };
    }
    if (score >= 50) {
      return {
        color: 'text-amber-500',
        bgColor: 'bg-amber-500',
        bgLight: 'bg-amber-50',
        borderColor: 'border-amber-200',
        icon: AlertTriangle,
        label: t('protocol:health.fair'),
        description: t('protocol:health.fairDesc'),
      };
    }
    return {
      color: 'text-rose-500',
      bgColor: 'bg-rose-500',
      bgLight: 'bg-rose-50',
      borderColor: 'border-rose-200',
      icon: Shield,
      label: t('protocol:health.poor'),
      description: t('protocol:health.poorDesc'),
    };
  }, [score, t]);

  const sizeConfig = {
    sm: {
      container: 'h-16 w-16',
      stroke: 3,
      text: 'text-lg',
      icon: 'h-4 w-4',
    },
    md: {
      container: 'h-24 w-24',
      stroke: 4,
      text: 'text-2xl',
      icon: 'h-5 w-5',
    },
    lg: {
      container: 'h-32 w-32',
      stroke: 5,
      text: 'text-3xl',
      icon: 'h-6 w-6',
    },
  };

  const { container, stroke, text, icon } = sizeConfig[size];
  const Icon = config.icon;

  // Calculate SVG circle properties
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={cn('flex items-center gap-4', className)}>
      {/* Circular Progress */}
      <div className={cn('relative', container)}>
        <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-muted/20"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn('transition-all duration-1000 ease-out', config.color)}
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-bold', text)}>{score}</span>
          <span className="text-muted-foreground text-xs">/100</span>
        </div>
      </div>

      {/* Label and description */}
      {showLabel && (
        <div className="space-y-1">
          <div className={cn('flex items-center gap-1.5 font-medium', config.color)}>
            <Icon className={icon} />
            {config.label}
          </div>
          <p className="text-muted-foreground text-sm">{config.description}</p>
        </div>
      )}
    </div>
  );
}

interface HealthScoreBadgeProps {
  score: number;
  className?: string;
}

export function HealthScoreBadge({ score, className }: HealthScoreBadgeProps) {
  const { t } = useI18n();

  const config = useMemo(() => {
    if (score >= 90) {
      return {
        bgColor: 'bg-emerald-50',
        textColor: 'text-emerald-700',
        borderColor: 'border-emerald-200',
        label: t('protocol:health.excellent'),
      };
    }
    if (score >= 70) {
      return {
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200',
        label: t('protocol:health.good'),
      };
    }
    if (score >= 50) {
      return {
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-200',
        label: t('protocol:health.fair'),
      };
    }
    return {
      bgColor: 'bg-rose-50',
      textColor: 'text-rose-700',
      borderColor: 'border-rose-200',
      label: t('protocol:health.poor'),
    };
  }, [score, t]);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.bgColor,
        config.textColor,
        config.borderColor,
        className
      )}
    >
      <Activity className="h-3 w-3" />
      {score} - {config.label}
    </div>
  );
}
