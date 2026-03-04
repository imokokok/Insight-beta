'use client';

import { useMemo } from 'react';

import { Info, CheckCircle2, HelpCircle } from 'lucide-react';

import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

interface ReliabilityScoreBreakdownProps {
  protocol: string;
  score: number;
  accuracyScore: number;
  latencyScore: number;
  availabilityScore: number;
  deviationAvg: number;
  sampleCount: number;
  isLoading?: boolean;
}

const scoringWeights = {
  accuracy: 0.4,
  latency: 0.3,
  availability: 0.3,
};

const scoringCriteria = {
  accuracy: {
    weight: 0.4,
    description: 'Based on price deviation from consensus and historical accuracy',
    factors: [
      'Average price deviation from consensus',
      'Frequency of significant deviations',
      'Historical accuracy over 30 days',
    ],
  },
  latency: {
    weight: 0.3,
    description: 'Based on update latency and frequency consistency',
    factors: ['Average update latency', 'P95 latency performance', 'Update frequency consistency'],
  },
  availability: {
    weight: 0.3,
    description: 'Based on uptime and feed availability',
    factors: ['Feed uptime percentage', 'Number of active feeds', 'Response rate to price changes'],
  },
};

export function ReliabilityScoreBreakdown({
  protocol,
  score,
  accuracyScore,
  latencyScore,
  availabilityScore,
  deviationAvg,
  sampleCount,
  isLoading,
}: ReliabilityScoreBreakdownProps) {
  const { t } = useI18n();

  const scoreBreakdown = useMemo(() => {
    return [
      {
        name: 'accuracy',
        label: t('comparison.reliability.accuracy'),
        score: accuracyScore,
        weight: scoringWeights.accuracy,
        weightedScore: accuracyScore * scoringWeights.accuracy,
        description: scoringCriteria.accuracy.description,
        factors: scoringCriteria.accuracy.factors,
      },
      {
        name: 'latency',
        label: t('comparison.reliability.latency'),
        score: latencyScore,
        weight: scoringWeights.latency,
        weightedScore: latencyScore * scoringWeights.latency,
        description: scoringCriteria.latency.description,
        factors: scoringCriteria.latency.factors,
      },
      {
        name: 'availability',
        label: t('comparison.reliability.availability'),
        score: availabilityScore,
        weight: scoringWeights.availability,
        weightedScore: availabilityScore * scoringWeights.availability,
        description: scoringCriteria.availability.description,
        factors: scoringCriteria.availability.factors,
      },
    ];
  }, [accuracyScore, latencyScore, availabilityScore, t]);

  const getScoreColor = (value: number) => {
    if (value >= 90) return 'text-emerald-600';
    if (value >= 80) return 'text-blue-600';
    if (value >= 70) return 'text-yellow-600';
    if (value >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBadge = (value: number) => {
    if (value >= 90) return 'default';
    if (value >= 80) return 'secondary';
    if (value >= 70) return 'outline';
    return 'destructive';
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">
              {t('comparison.reliability.scoreBreakdown')}
            </CardTitle>
            <CardDescription className="mt-1 text-sm text-muted-foreground">
              {protocol} - {t('comparison.reliability.algorithmTransparency')}
            </CardDescription>
          </div>
          <Badge variant={getScoreBadge(score)} className="text-sm">
            {score.toFixed(0)} {t('comparison.reliability.overall')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">
                {t('comparison.reliability.scoringMethod')}
              </p>
              <p className="mt-1 text-blue-700">{t('comparison.reliability.scoringMethodDesc')}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {scoreBreakdown.map((item) => (
            <div key={item.name} className="rounded-lg border border-border/50 bg-muted/20 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{item.label}</h4>
                  <Badge variant="outline" className="text-xs">
                    {t('comparison.reliability.weight')}: {(item.weight * 100).toFixed(0)}%
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('text-lg font-bold', getScoreColor(item.score))}>
                    {item.score.toFixed(0)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    × {(item.weight * 100).toFixed(0)}% = {item.weightedScore.toFixed(1)}
                  </span>
                </div>
              </div>

              <p className="mb-3 text-sm text-muted-foreground">{item.description}</p>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {t('comparison.reliability.factors')}:
                </p>
                <ul className="space-y-1">
                  {item.factors.map((factor, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    item.score >= 90
                      ? 'bg-emerald-500'
                      : item.score >= 80
                        ? 'bg-blue-500'
                        : item.score >= 70
                          ? 'bg-yellow-500'
                          : item.score >= 60
                            ? 'bg-orange-500'
                            : 'bg-red-500',
                  )}
                  style={{ width: `${item.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
          <h4 className="mb-3 font-medium">{t('comparison.reliability.calculationExample')}</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('comparison.reliability.accuracy')} ({accuracyScore.toFixed(0)} × 40%)
              </span>
              <span className="font-medium">{(accuracyScore * 0.4).toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('comparison.reliability.latency')} ({latencyScore.toFixed(0)} × 30%)
              </span>
              <span className="font-medium">{(latencyScore * 0.3).toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('comparison.reliability.availability')} ({availabilityScore.toFixed(0)} × 30%)
              </span>
              <span className="font-medium">{(availabilityScore * 0.3).toFixed(1)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t pt-2 font-medium">
              <span>{t('comparison.reliability.totalScore')}</span>
              <span className={getScoreColor(score)}>{score.toFixed(0)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
            <p className="text-muted-foreground">{t('comparison.reliability.avgDeviation')}</p>
            <p className="mt-1 text-lg font-bold">{(deviationAvg * 100).toFixed(3)}%</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
            <p className="text-muted-foreground">{t('comparison.reliability.sampleCount')}</p>
            <p className="mt-1 text-lg font-bold">{sampleCount.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
          <HelpCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <div className="text-amber-700">
            <p className="font-medium text-amber-900">{t('comparison.reliability.disclaimer')}</p>
            <p className="mt-1">{t('comparison.reliability.disclaimerDesc')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
