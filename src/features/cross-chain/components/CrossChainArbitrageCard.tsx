'use client';

import { memo } from 'react';

import {
  ArrowRight,
  AlertTriangle,
  TrendingUp,
  Info,
  Zap,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Fuel,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  CrossChainArbitrageOpportunity,
  CrossChainArbitrageSummary,
} from '@/hooks/useCrossChain';
import { useI18n } from '@/i18n';
import { cn, formatPrice, formatChangePercent, formatPercentValue } from '@/shared/utils';
import { RISK_COLORS } from '@/types/common';

interface CrossChainArbitrageCardProps {
  opportunities?: CrossChainArbitrageOpportunity[];
  summary?: CrossChainArbitrageSummary;
  isLoading?: boolean;
  onExecute?: (opportunity: CrossChainArbitrageOpportunity) => void;
  threshold?: number;
  showGasDetails?: boolean;
}

const riskLabels = {
  low: 'Low Risk',
  medium: 'Medium Risk',
  high: 'High Risk',
};

function formatProfit(value: number): string {
  if (value < 0) return `-${formatPrice(Math.abs(value))}`;
  return `+${formatPrice(value)}`;
}

function formatGasCost(value: number): string {
  return `$${value.toFixed(2)}`;
}

export const CrossChainArbitrageCard = memo(function CrossChainArbitrageCard({
  opportunities,
  summary,
  isLoading,
  onExecute,
  threshold = 0,
  showGasDetails = false,
}: CrossChainArbitrageCardProps) {
  const { t } = useI18n();

  const filteredOpportunities = opportunities?.filter(
    (o) => o.priceDiffPercent >= threshold && o.isActionable,
  );

  const avgProfitPercent =
    summary?.avgProfitPercent ??
    (filteredOpportunities && filteredOpportunities.length > 0
      ? filteredOpportunities.reduce((sum, o) => sum + o.potentialProfitPercent, 0) /
        filteredOpportunities.length
      : 0);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="mt-1 h-4 w-72" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!opportunities || opportunities.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            {t('crossChain.arbitrage.title')}
          </CardTitle>
          <CardDescription>{t('crossChain.arbitrage.description')}</CardDescription>
        </CardHeader>
        <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
          <Info className="mr-2 h-5 w-5" />
          {t('crossChain.arbitrage.noOpportunities')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Zap className="h-5 w-5 text-yellow-500" />
              {t('crossChain.arbitrage.title')}
              <Badge variant="secondary" className="ml-2">
                {filteredOpportunities?.length ?? 0}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1 text-sm text-muted-foreground">
              {t('crossChain.arbitrage.description')}
            </CardDescription>
          </div>
          {onExecute && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newState = !showGasDetails;
                if (opportunities?.[0]) {
                  onExecute({
                    ...opportunities[0],
                    showGasDetails: newState,
                  } as CrossChainArbitrageOpportunity & { showGasDetails: boolean });
                }
              }}
            >
              {showGasDetails ? (
                <>
                  <EyeOff className="mr-1 h-4 w-4" />
                  {t('crossChain.arbitrage.hideGasDetails')}
                </>
              ) : (
                <>
                  <Eye className="mr-1 h-4 w-4" />
                  {t('crossChain.arbitrage.showGasDetails')}
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {summary && (
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                {t('crossChain.arbitrage.totalOpportunities')}
              </p>
              <p className="font-mono text-xl font-bold">{summary.total}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Actionable</p>
              <p className="font-mono text-xl font-bold text-emerald-600">{summary.actionable}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">{t('crossChain.arbitrage.avgProfit')}</p>
              <p
                className={cn(
                  'font-mono text-xl font-bold',
                  avgProfitPercent > 0 ? 'text-emerald-600' : 'text-red-600',
                )}
              >
                {formatChangePercent(avgProfitPercent / 100, 2, false)}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">High Risk</p>
              <p className="font-mono text-xl font-bold text-red-600">{summary.highRisk}</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {filteredOpportunities?.slice(0, 5).map((opportunity) => {
            const risk = RISK_COLORS[opportunity.riskLevel] ?? RISK_COLORS.medium;
            const riskLabel = riskLabels[opportunity.riskLevel] ?? 'Medium Risk';

            return (
              <div
                key={opportunity.id}
                className={cn('rounded-lg border p-4', risk.bg, risk.border)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn('gap-1', risk.text, risk.bg)}>
                      {opportunity.riskLevel === 'low' ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : opportunity.riskLevel === 'high' ? (
                        <XCircle className="h-3 w-3" />
                      ) : (
                        <AlertCircle className="h-3 w-3" />
                      )}
                      {riskLabel}
                    </Badge>
                    <span className="text-sm font-medium">{opportunity.symbol}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {opportunity.isActionable ? (
                      <Badge variant="default" className="gap-1 bg-emerald-500">
                        <TrendingUp className="h-3 w-3" />
                        {t('crossChain.arbitrage.actionable')}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        {t('crossChain.arbitrage.notActionable')}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">
                        {t('crossChain.arbitrage.buyOn')}
                      </p>
                      <p className="font-semibold capitalize">{opportunity.buy.chain}</p>
                      <p className="font-mono text-sm">{formatPrice(opportunity.buy.price)}</p>
                    </div>

                    <ArrowRight className="h-4 w-4 text-muted-foreground" />

                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">
                        {t('crossChain.arbitrage.sellOn')}
                      </p>
                      <p className="font-semibold capitalize">{opportunity.sell.chain}</p>
                      <p className="font-mono text-sm">{formatPrice(opportunity.sell.price)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {t('crossChain.arbitrage.profit')}
                    </p>
                    <p
                      className={cn(
                        'font-mono text-lg font-bold',
                        opportunity.netProfitEstimate > 0 ? 'text-emerald-600' : 'text-red-600',
                      )}
                    >
                      {formatProfit(opportunity.netProfitEstimate)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ({formatPercentValue(opportunity.potentialProfitPercent, 2)})
                    </p>
                  </div>
                </div>

                {showGasDetails && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted/30 p-3 text-xs">
                    <Fuel className="h-4 w-4 text-muted-foreground" />
                    <div className="grid flex-1 grid-cols-3 gap-4">
                      <div>
                        <p className="text-muted-foreground">{t('crossChain.arbitrage.buyGas')}</p>
                        <p className="font-mono font-semibold">
                          ${formatGasCost(opportunity.fromGasCost)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t('crossChain.arbitrage.sellGas')}</p>
                        <p className="font-mono font-semibold">
                          ${formatGasCost(opportunity.toGasCost)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          {t('crossChain.arbitrage.bridgeGas')}
                        </p>
                        <p className="font-mono font-semibold">
                          ${formatGasCost(opportunity.bridgeCost)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">{t('crossChain.arbitrage.totalGas')}</p>
                      <p className="font-mono font-semibold text-blue-600">
                        ${formatGasCost(opportunity.gasCostEstimate)}
                      </p>
                    </div>
                  </div>
                )}

                {opportunity.warnings.length > 0 && (
                  <div className="mt-2 flex items-start gap-1 rounded bg-yellow-500/10 p-2 text-xs text-yellow-700">
                    <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                    <span>{opportunity.warnings[0]}</span>
                  </div>
                )}

                {onExecute && opportunity.isActionable && (
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onExecute(opportunity)}
                      className="gap-1"
                    >
                      <Zap className="h-3 w-3" />
                      {t('crossChain.arbitrage.execute')}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredOpportunities && filteredOpportunities.length > 5 && (
          <div className="text-center text-sm text-muted-foreground">
            {t('crossChain.arbitrage.moreOpportunities', {
              count: filteredOpportunities.length - 5,
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
