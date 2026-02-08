'use client';

import { useMemo } from 'react';
import { ArrowRightLeft, TrendingUp, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

export interface ArbitrageOpportunityData {
  id: string;
  symbol: string;
  buyProtocol: string;
  sellProtocol: string;
  buyPrice: number;
  sellPrice: number;
  priceDifference: number;
  priceDifferencePercent: number;
  estimatedProfit: number;
  estimatedProfitPercent: number;
  timestamp: Date;
  riskLevel: 'low' | 'medium' | 'high';
  timeWindow: number; // seconds
}

interface ArbitrageOpportunityProps {
  opportunities: ArbitrageOpportunityData[];
  loading?: boolean;
  className?: string;
  onExecute?: (opportunity: ArbitrageOpportunityData) => void;
}

export function ArbitrageOpportunity({
  opportunities,
  loading,
  className,
  onExecute
}: ArbitrageOpportunityProps) {
  const { t } = useI18n();

  const stats = useMemo(() => {
    const totalProfit = opportunities.reduce((sum, o) => sum + o.estimatedProfit, 0);
    const avgSpread = opportunities.length > 0
      ? opportunities.reduce((sum, o) => sum + o.priceDifferencePercent, 0) / opportunities.length
      : 0;
    const highProfitCount = opportunities.filter(o => o.estimatedProfitPercent > 1).length;

    return { totalProfit, avgSpread, highProfitCount };
  }, [opportunities]);

  const getRiskConfig = (risk: ArbitrageOpportunityData['riskLevel']) => {
    switch (risk) {
      case 'low':
        return {
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          badgeColor: 'bg-emerald-100 text-emerald-800',
          label: t('protocol:arbitrage.riskLow')
        };
      case 'medium':
        return {
          color: 'bg-amber-50 text-amber-700 border-amber-200',
          badgeColor: 'bg-amber-100 text-amber-800',
          label: t('protocol:arbitrage.riskMedium')
        };
      case 'high':
        return {
          color: 'bg-rose-50 text-rose-700 border-rose-200',
          badgeColor: 'bg-rose-100 text-rose-800',
          label: t('protocol:arbitrage.riskHigh')
        };
    }
  };

  const getProfitColor = (profit: number) => {
    if (profit > 1) return 'text-emerald-600';
    if (profit > 0.5) return 'text-blue-600';
    return 'text-amber-600';
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ArrowRightLeft className="h-5 w-5" />
            {t('protocol:arbitrage.title')}
            {opportunities.length > 0 && (
              <Badge variant="secondary">{opportunities.length}</Badge>
            )}
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {stats.totalProfit.toFixed(2)}% {t('protocol:arbitrage.totalProfit')}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {stats.avgSpread.toFixed(2)}% {t('protocol:arbitrage.avgSpread')}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {opportunities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <ArrowRightLeft className="text-muted-foreground mb-4 h-12 w-12" />
            <p className="text-muted-foreground">{t('protocol:arbitrage.noOpportunities')}</p>
          </div>
        ) : (
          opportunities.map((opportunity) => {
            const riskConfig = getRiskConfig(opportunity.riskLevel);

            return (
              <div
                key={opportunity.id}
                className={cn(
                  'rounded-lg border p-4 transition-all hover:shadow-md',
                  riskConfig.color
                )}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* Asset & Protocols */}
                  <div className="flex items-center gap-4">
                    <div className="bg-background flex h-12 w-12 items-center justify-center rounded-lg font-bold">
                      {opportunity.symbol.split('/')[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 font-medium">
                        {opportunity.symbol}
                        <Badge className={riskConfig.badgeColor}>
                          {riskConfig.label}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
                        <span>{opportunity.buyProtocol}</span>
                        <ArrowRightLeft className="h-3 w-3" />
                        <span>{opportunity.sellProtocol}</span>
                      </div>
                    </div>
                  </div>

                  {/* Prices */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-muted-foreground text-xs">{t('protocol:arbitrage.buy')}</div>
                      <div className="font-mono font-medium">${opportunity.buyPrice.toFixed(4)}</div>
                    </div>
                    <ArrowRightLeft className="text-muted-foreground h-4 w-4" />
                    <div className="text-right">
                      <div className="text-muted-foreground text-xs">{t('protocol:arbitrage.sell')}</div>
                      <div className="font-mono font-medium">${opportunity.sellPrice.toFixed(4)}</div>
                    </div>
                  </div>

                  {/* Profit */}
                  <div className="text-right">
                    <div className={cn('text-2xl font-bold', getProfitColor(opportunity.estimatedProfitPercent))}>
                      +{opportunity.estimatedProfitPercent.toFixed(2)}%
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {t('protocol:arbitrage.estimatedProfit')}
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {opportunity.timeWindow}s
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onExecute?.(opportunity)}
                      disabled={opportunity.riskLevel === 'high'}
                    >
                      {t('protocol:arbitrage.execute')}
                    </Button>
                  </div>
                </div>

                {/* Warning for high risk */}
                {opportunity.riskLevel === 'high' && (
                  <div className="mt-3 flex items-center gap-2 rounded bg-rose-100/50 p-2 text-xs text-rose-700">
                    <AlertTriangle className="h-4 w-4" />
                    {t('protocol:arbitrage.highRiskWarning')}
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
