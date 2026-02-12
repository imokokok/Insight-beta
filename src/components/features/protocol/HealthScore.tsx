'use client';

import { useMemo } from 'react';

import { AlertTriangle, CheckCircle, Shield, TrendingUp } from 'lucide-react';

import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

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

  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div className={cn('relative', container)}>
        <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-muted/20"
          />
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
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-bold', text)}>{score}</span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>

      {showLabel && (
        <div className="space-y-1">
          <div className={cn('flex items-center gap-1.5 font-medium', config.color)}>
            <Icon className={icon} />
            {config.label}
          </div>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
      )}
    </div>
  );
}
