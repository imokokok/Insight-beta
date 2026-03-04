'use client';

import { useMemo } from 'react';

import { DollarSign, Info, AlertCircle } from 'lucide-react';

import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { useI18n } from '@/i18n';
import type { CostEfficiencyMetric } from '@/types/oracle/comparison';

interface CostDataSourceProps {
  data?: CostEfficiencyMetric[];
  isLoading?: boolean;
}

export function CostDataSource({ data, isLoading }: CostDataSourceProps) {
  const { t } = useI18n();

  const sources = useMemo(() => {
    if (!data) return [];

    const uniqueSources = new Map<
      string,
      {
        name: string;
        url?: string;
        lastUpdated: string;
        confidence: number;
        protocols: string[];
      }
    >();

    data.forEach((metric) => {
      if (metric.dataSource) {
        const key = metric.dataSource.name;
        if (!uniqueSources.has(key)) {
          uniqueSources.set(key, {
            name: metric.dataSource.name,
            url: metric.dataSource.url,
            lastUpdated: metric.dataSource.lastUpdated,
            confidence: metric.dataSource.confidence,
            protocols: [metric.protocol],
          });
        } else {
          const existing = uniqueSources.get(key)!;
          existing.protocols.push(metric.protocol);
          if (new Date(metric.dataSource.lastUpdated) > new Date(existing.lastUpdated)) {
            existing.lastUpdated = metric.dataSource.lastUpdated;
          }
        }
      }
    });

    return Array.from(uniqueSources.values());
  }, [data]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  if (!data || sources.length === 0) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">
              {t('comparison.cost.dataSourceTitle')}
            </CardTitle>
          </div>
          <Info className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sources.map((source, index) => (
          <div key={index} className="rounded-lg border border-border/50 bg-muted/20 p-4">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-primary/10 p-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">{source.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('comparison.cost.protocols')}: {source.protocols.join(', ')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    source.confidence >= 90
                      ? 'default'
                      : source.confidence >= 70
                        ? 'secondary'
                        : 'outline'
                  }
                  className="text-xs"
                >
                  {source.confidence}% {t('comparison.cost.confidence')}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">{t('comparison.cost.lastUpdated')}</p>
                <p className="font-medium">{new Date(source.lastUpdated).toLocaleString()}</p>
              </div>
              {source.url && (
                <div>
                  <p className="text-muted-foreground">{t('comparison.cost.source')}</p>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    {t('comparison.cost.viewSource')}
                    <DollarSign className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>

            {source.confidence < 70 && (
              <div className="mt-2 flex items-start gap-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p>{t('comparison.cost.lowConfidenceWarning')}</p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
