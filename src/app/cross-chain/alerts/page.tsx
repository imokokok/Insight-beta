'use client';

import { useState, useMemo } from 'react';

import { RefreshCw, Filter, Activity } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCrossChainAlerts } from '@/features/cross-chain/hooks';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

const AVAILABLE_SYMBOLS = ['BTC', 'ETH', 'SOL', 'LINK', 'AVAX', 'MATIC', 'UNI', 'AAVE'];

export default function CrossChainAlertsPage() {
  const { t } = useI18n();

  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  const {
    data: alertsData,
    isLoading: alertsLoading,
    mutate: refreshAlerts,
  } = useCrossChainAlerts(selectedSymbol);

  const alertsList = useMemo(() => {
    const alerts = alertsData?.data?.alerts || [];
    if (filterSeverity === 'all') return alerts;
    return alerts.filter((alert) => alert.severity === filterSeverity);
  }, [alertsData, filterSeverity]);

  const severityCounts = useMemo(() => {
    const alerts = alertsData?.data?.alerts || [];
    return {
      critical: alerts.filter((a) => a.severity === 'critical').length,
      warning: alerts.filter((a) => a.severity === 'warning').length,
      info: alerts.filter((a) => a.severity === 'info').length,
    };
  }, [alertsData]);

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('crossChain.alerts.title')}</h1>
          <p className="mt-1 text-muted-foreground">{t('crossChain.descriptions.crossChainAlerts')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refreshAlerts()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('crossChain.controls.refresh')}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('crossChain.status.critical')}</CardTitle>
            <Activity className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {alertsLoading ? '-' : severityCounts.critical}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('crossChain.status.warning')}</CardTitle>
            <Activity className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {alertsLoading ? '-' : severityCounts.warning}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('crossChain.status.normal')}</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {alertsLoading ? '-' : severityCounts.info}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('crossChain.controls.symbol')}:</span>
              <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_SYMBOLS.map((symbol) => (
                    <SelectItem key={symbol} value={symbol}>
                      {symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Severity:</span>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-yellow-500" />
            {t('crossChain.alerts.title')}
            <span className="ml-2 rounded-full bg-yellow-500/20 px-2 py-0.5 text-sm font-medium text-yellow-600">
              {alertsList.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alertsLoading ? (
            <div className="text-center text-muted-foreground">Loading...</div>
          ) : alertsList.length === 0 ? (
            <div className="text-center text-muted-foreground">No alerts found</div>
          ) : (
            <div className="space-y-2">
              {alertsList.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    'rounded-lg border p-4',
                    alert.severity === 'critical' && 'border-red-500/30 bg-red-500/10',
                    alert.severity === 'warning' && 'border-yellow-500/30 bg-yellow-500/10',
                    alert.severity === 'info' && 'border-blue-500/30 bg-blue-500/10',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="font-medium">
                          {alert.chainA} → {alert.chainB}
                        </span>
                        <span className="ml-2 text-muted-foreground">{alert.symbol}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={cn(
                          'font-mono font-medium',
                          alert.severity === 'critical' && 'text-red-600',
                          alert.severity === 'warning' && 'text-yellow-600',
                          alert.severity === 'info' && 'text-blue-600',
                        )}
                      >
                        {alert.deviationPercent.toFixed(2)}%
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(alert.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {alert.reason && (
                    <p className="mt-2 text-sm text-muted-foreground">{alert.reason}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
