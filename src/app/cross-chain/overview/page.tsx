'use client';

import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCrossChainDashboard } from '@/features/cross-chain/hooks';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';
import type { CrossChainDashboardData } from '@/types/crossChainAnalysisTypes';

const AVAILABLE_SYMBOLS = ['BTC', 'ETH', 'SOL', 'LINK', 'AVAX', 'MATIC', 'UNI', 'AAVE'];

export default function CrossChainOverviewPage() {
  const { t } = useI18n();

  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    mutate: refreshDashboard,
  } = useCrossChainDashboard();

  const dashboard = dashboardData?.data as CrossChainDashboardData | undefined;

  const healthyChains = dashboard?.chainHealth?.filter((c) => c.status === 'healthy').length ?? 0;
  const totalChains = dashboard?.chainHealth?.length ?? 0;

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('crossChain.dashboard.title')}</h1>
          <p className="mt-1 text-muted-foreground">
            {t('crossChain.dashboard.description', { count: AVAILABLE_SYMBOLS.length })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refreshDashboard()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('crossChain.controls.refresh')}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('crossChain.dashboard.activeAlerts')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardLoading ? '-' : dashboard?.activeAlerts ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">{t('crossChain.dashboard.opportunities')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('crossChain.dashboard.opportunities')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardLoading ? '-' : dashboard?.opportunities?.total ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">{t('crossChain.dashboard.actionable')}: {dashboard?.opportunities?.actionable ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('crossChain.dashboard.chainHealth')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardLoading ? '-' : `${healthyChains}/${totalChains}`}
            </div>
            <p className="text-xs text-muted-foreground">{t('crossChain.dashboard.overallHealth')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('crossChain.dashboard.priceStatus')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardLoading ? '-' : (dashboard?.priceComparisons?.[0]?.status ?? '-')}
            </div>
            <p className="text-xs text-muted-foreground">{t('crossChain.dashboard.lastSync')}: {dashboard?.lastUpdated ? new Date(dashboard.lastUpdated).toLocaleTimeString() : '-'}</p>
          </CardContent>
        </Card>
      </div>

      {dashboard?.chainHealth && dashboard.chainHealth.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('crossChain.dashboard.chainHealth')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {dashboard.chainHealth.map((chainData) => (
                <div
                  key={chainData.chain}
                  className={cn(
                    'rounded-lg border p-3',
                    chainData.status === 'healthy' && 'border-green-500/30 bg-green-500/10',
                    chainData.status === 'degraded' && 'border-yellow-500/30 bg-yellow-500/10',
                    chainData.status === 'offline' && 'border-red-500/30 bg-red-500/10',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{chainData.chain}</span>
                    <span
                      className={cn(
                        'text-xs font-medium',
                        chainData.status === 'healthy' && 'text-green-600',
                        chainData.status === 'degraded' && 'text-yellow-600',
                        chainData.status === 'offline' && 'text-red-600',
                      )}
                    >
                      {t(`crossChain.status.${chainData.status}`)}
                    </span>
                  </div>
                  {chainData.staleMinutes && (
                    <p className="mt-1 text-xs text-muted-foreground">{chainData.staleMinutes}m stale</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {dashboard?.priceComparisons && dashboard.priceComparisons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Price Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dashboard.priceComparisons.map((price) => (
                <div
                  key={price.symbol}
                  className={cn(
                    'rounded-lg border p-3',
                    price.status === 'critical' && 'border-red-500/30 bg-red-500/10',
                    price.status === 'warning' && 'border-yellow-500/30 bg-yellow-500/10',
                    price.status === 'normal' && 'border-green-500/30 bg-green-500/10',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{price.symbol}</span>
                      <span className="text-muted-foreground">{price.chainsCount} chains</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        Range: {price.priceRangePercent.toFixed(2)}%
                      </span>
                      <span
                        className={cn(
                          'font-medium capitalize',
                          price.status === 'critical' && 'text-red-600',
                          price.status === 'warning' && 'text-yellow-600',
                          price.status === 'normal' && 'text-green-600',
                        )}
                      >
                        {price.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
