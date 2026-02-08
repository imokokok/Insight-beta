'use client';

import { useMemo } from 'react';
import { Shield, AlertTriangle, AlertOctagon, Info, TrendingDown, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

export interface RiskFactor {
  id: string;
  name: string;
  score: number; // 0-100, higher is riskier
  weight: number;
  description: string;
}

export interface RiskScoreData {
  overallScore: number; // 0-100
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactor[];
  lastAssessment: Date;
  trend: 'improving' | 'stable' | 'worsening';
}

interface RiskScoreProps {
  data: RiskScoreData | null;
  loading?: boolean;
  className?: string;
}

export function RiskScore({ data, loading, className }: RiskScoreProps) {
  const { t } = useI18n();

  const config = useMemo(() => {
    if (!data) return null;
    
    switch (data.level) {
      case 'low':
        return {
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-200',
          progressColor: 'bg-emerald-500',
          icon: Shield,
          label: t('protocol:risk.low'),
          description: t('protocol:risk.lowDesc'),
        };
      case 'medium':
        return {
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          progressColor: 'bg-amber-500',
          icon: AlertTriangle,
          label: t('protocol:risk.medium'),
          description: t('protocol:risk.mediumDesc'),
        };
      case 'high':
        return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          progressColor: 'bg-orange-500',
          icon: AlertOctagon,
          label: t('protocol:risk.high'),
          description: t('protocol:risk.highDesc'),
        };
      case 'critical':
        return {
          color: 'text-rose-600',
          bgColor: 'bg-rose-50',
          borderColor: 'border-rose-200',
          progressColor: 'bg-rose-500',
          icon: Activity,
          label: t('protocol:risk.critical'),
          description: t('protocol:risk.criticalDesc'),
        };
    }
  }, [data, t]);

  const getTrendConfig = (trend: RiskScoreData['trend']) => {
    switch (trend) {
      case 'improving':
        return {
          color: 'text-emerald-600',
          icon: TrendingDown, // Lower risk is better
          label: t('protocol:risk.improving'),
        };
      case 'stable':
        return {
          color: 'text-blue-600',
          icon: Info,
          label: t('protocol:risk.stable'),
        };
      case 'worsening':
        return {
          color: 'text-rose-600',
          icon: TrendingDown,
          label: t('protocol:risk.worsening'),
        };
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
          <div className="mt-4 space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || !config) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{t('protocol:risk.title')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Shield className="text-muted-foreground mb-4 h-12 w-12" />
          <p className="text-muted-foreground">{t('protocol:risk.noData')}</p>
        </CardContent>
      </Card>
    );
  }

  const Icon = config.icon;
  const trendConfig = getTrendConfig(data.trend);
  const TrendIcon = trendConfig.icon;

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5" />
          {t('protocol:risk.title')}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className={cn('rounded-lg border p-6', config.bgColor, config.borderColor)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn('rounded-full p-3 bg-white/50', config.color)}>
                <Icon className="h-8 w-8" />
              </div>
              <div>
                <div className={cn('text-3xl font-bold', config.color)}>
                  {data.overallScore}/100
                </div>
                <div className={cn('font-medium', config.color)}>
                  {config.label}
                </div>
                <div className="text-sm opacity-70">
                  {config.description}
                </div>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="outline" className={cn('flex items-center gap-1', trendConfig.color)}>
                <TrendIcon className="h-3 w-3" />
                {trendConfig.label}
              </Badge>
              <div className="text-muted-foreground mt-2 text-xs">
                {t('protocol:risk.lastAssessment')}: {data.lastAssessment.toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <Progress 
              value={data.overallScore} 
              className={cn('h-2', config.progressColor)}
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>{t('protocol:risk.lowRisk')}</span>
              <span>{t('protocol:risk.highRisk')}</span>
            </div>
          </div>
        </div>

        {/* Risk Factors */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">{t('protocol:risk.factors')}</h4>
          {data.factors.map((factor) => (
            <div key={factor.id} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{factor.name}</span>
                <span className={cn(
                  'font-medium',
                  factor.score > 70 ? 'text-rose-600' : 
                  factor.score > 40 ? 'text-amber-600' : 'text-emerald-600'
                )}>
                  {factor.score}/100
                </span>
              </div>
              <Progress 
                value={factor.score} 
                className={cn(
                  'h-1.5',
                  factor.score > 70 ? 'bg-rose-500' : 
                  factor.score > 40 ? 'bg-amber-500' : 'bg-emerald-500'
                )}
              />
              <p className="text-xs text-muted-foreground">{factor.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
