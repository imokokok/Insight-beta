'use client';

import { useState, useEffect, useCallback } from 'react';

import { FileCode, TrendingUp, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Skeleton, Badge } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn, formatTime } from '@/shared/utils';

import type { OracleScript } from '../types/band';

interface OracleScriptAnalyticsProps {
  loading?: boolean;
  className?: string;
}

export function OracleScriptAnalytics({ loading: externalLoading, className }: OracleScriptAnalyticsProps) {
  const { t } = useI18n();
  const [scripts, setScripts] = useState<OracleScript[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/oracle/band/scripts');
      if (!response.ok) {
        throw new Error('Failed to fetch oracle scripts');
      }

      const result = await response.json();
      if (result.success && result.data?.scripts) {
        setScripts(result.data.scripts);
      } else {
        // Use mock data as fallback
        setScripts([
          {
            scriptId: 'price_feed',
            name: 'Price Feed',
            description: t('band.oracleScriptTypes.priceFeed.description'),
            owner: 'band1abc123def456',
            codeHash: '0x1234abcd5678efgh',
            schema: '{symbol:string,price:uint64}',
            status: 'active',
            totalRequests: 125000,
            lastRequestAt: new Date(Date.now() - 300000).toISOString(),
            avgResponseTimeMs: 450,
            successRate: 99.2,
          },
          {
            scriptId: 'weather_data',
            name: 'Weather Data',
            description: t('band.oracleScriptTypes.weather.description'),
            owner: 'band1def456ghi789',
            codeHash: '0x5678efgh90abijkl',
            schema: '{location:string,temp:uint64}',
            status: 'active',
            totalRequests: 34500,
            lastRequestAt: new Date(Date.now() - 600000).toISOString(),
            avgResponseTimeMs: 820,
            successRate: 97.8,
          },
          {
            scriptId: 'sports_results',
            name: 'Sports Results',
            description: t('band.oracleScriptTypes.sports.description'),
            owner: 'band1ghi789jkl012',
            codeHash: '0x90abijklcdefmnop',
            schema: '{gameId:string,score:string}',
            status: 'inactive',
            totalRequests: 12300,
            lastRequestAt: new Date(Date.now() - 86400000).toISOString(),
            avgResponseTimeMs: 580,
            successRate: 96.5,
          },
          {
            scriptId: 'stock_prices',
            name: 'Stock Prices',
            description: t('band.oracleScriptTypes.stocks.description'),
            owner: 'band1jkl012mno345',
            codeHash: '0xcdefmnopqrstuvwx',
            schema: '{ticker:string,price:uint64}',
            status: 'deprecated',
            totalRequests: 89200,
            lastRequestAt: new Date(Date.now() - 259200000).toISOString(),
            avgResponseTimeMs: 380,
            successRate: 99.5,
          },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Use mock data as fallback
      setScripts([
        {
          scriptId: 'price_feed',
          name: 'Price Feed',
          description: t('band.oracleScriptTypes.priceFeed.description'),
          owner: 'band1abc123def456',
          codeHash: '0x1234abcd5678efgh',
          schema: '{symbol:string,price:uint64}',
          status: 'active',
          totalRequests: 125000,
          lastRequestAt: new Date(Date.now() - 300000).toISOString(),
          avgResponseTimeMs: 450,
          successRate: 99.2,
        },
        {
          scriptId: 'weather_data',
          name: 'Weather Data',
          description: t('band.oracleScriptTypes.weather.description'),
          owner: 'band1def456ghi789',
          codeHash: '0x5678efgh90abijkl',
          schema: '{location:string,temp:uint64}',
          status: 'active',
          totalRequests: 34500,
          lastRequestAt: new Date(Date.now() - 600000).toISOString(),
          avgResponseTimeMs: 820,
          successRate: 97.8,
        },
        {
          scriptId: 'sports_results',
          name: 'Sports Results',
          description: t('band.oracleScriptTypes.sports.description'),
          owner: 'band1ghi789jkl012',
          codeHash: '0x90abijklcdefmnop',
          schema: '{gameId:string,score:string}',
          status: 'inactive',
          totalRequests: 12300,
          lastRequestAt: new Date(Date.now() - 86400000).toISOString(),
          avgResponseTimeMs: 580,
          successRate: 96.5,
        },
        {
          scriptId: 'stock_prices',
          name: 'Stock Prices',
          description: t('band.oracleScriptTypes.stocks.description'),
          owner: 'band1jkl012mno345',
          codeHash: '0xcdefmnopqrstuvwx',
          schema: '{ticker:string,price:uint64}',
          status: 'deprecated',
          totalRequests: 89200,
          lastRequestAt: new Date(Date.now() - 259200000).toISOString(),
          avgResponseTimeMs: 380,
          successRate: 99.5,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStatusConfig = (status: OracleScript['status']) => {
    switch (status) {
      case 'active':
        return { color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: t('common.status.active') };
      case 'inactive':
        return { color: 'text-amber-500', bg: 'bg-amber-500/10', label: t('common.status.inactive') };
      case 'deprecated':
        return { color: 'text-red-500', bg: 'bg-red-500/10', label: t('common.status.deprecated') };
      default:
        return { color: 'text-muted-foreground', bg: 'bg-muted', label: status };
    }
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 99) return 'text-emerald-500';
    if (rate >= 95) return 'text-amber-500';
    return 'text-red-500';
  };

  const loading = externalLoading || isLoading;

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            {t('band.scripts.analyticsTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || scripts.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            {t('band.scripts.analyticsTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-amber-500">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm">{error || t('common.noData')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalRequests = scripts.reduce((sum, s) => sum + s.totalRequests, 0);
  const avgSuccessRate = scripts.reduce((sum, s) => sum + s.successRate, 0) / scripts.length;
  const activeScripts = scripts.filter((s) => s.status === 'active').length;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileCode className="h-5 w-5 text-primary" />
          {t('band.scripts.analyticsTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileCode className="h-3.5 w-3.5" />
              {t('band.scripts.total')}
            </div>
            <p className="mt-1 font-mono text-lg font-semibold">{scripts.length}</p>
          </div>

          <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              {t('band.scripts.active')}
            </div>
            <p className="mt-1 font-mono text-lg font-semibold text-emerald-500">{activeScripts}</p>
          </div>

          <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              {t('band.scripts.avgSuccessRate')}
            </div>
            <p className={cn('mt-1 font-mono text-lg font-semibold', getSuccessRateColor(avgSuccessRate))}>
              {avgSuccessRate.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Scripts List */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/30 text-xs text-muted-foreground">
                <th className="pb-2 text-left font-medium">{t('band.scripts.name')}</th>
                <th className="pb-2 text-right font-medium">{t('band.scripts.requests')}</th>
                <th className="pb-2 text-right font-medium">{t('band.scripts.responseTime')}</th>
                <th className="pb-2 text-center font-medium">{t('common.status.status')}</th>
              </tr>
            </thead>
            <tbody>
              {scripts.map((script) => {
                const statusConfig = getStatusConfig(script.status);
                
                return (
                  <tr
                    key={script.scriptId}
                    className="border-b border-border/20 transition-colors hover:bg-muted/30"
                  >
                    <td className="py-2 pr-4">
                      <div>
                        <p className="font-medium text-sm">{script.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {script.scriptId}
                        </p>
                      </div>
                    </td>
                    <td className="py-2 text-right font-mono text-sm">
                      {script.totalRequests.toLocaleString()}
                    </td>
                    <td className="py-2 text-right font-mono text-sm">
                      {script.avgResponseTimeMs}ms
                    </td>
                    <td className="py-2 text-center">
                      <Badge
                        variant={script.status === 'active' ? 'success' : script.status === 'deprecated' ? 'destructive' : 'warning'}
                        size="sm"
                      >
                        {statusConfig.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
