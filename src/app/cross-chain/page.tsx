'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

import Link from 'next/link';

import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  Globe,
  BarChart3,
  RefreshCw,
  Link2,
  Activity,
  TrendingUp,
  Zap,
  Lightbulb,
  X,
} from 'lucide-react';

import { KPIOverviewBar, AutoRefreshControl, type KPIItem } from '@/components/common';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { Button } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { Alert, AlertDescription } from '@/components/ui';
import {
  CrossChainOverview,
  CrossChainComparison,
  CrossChainHistory,
} from '@/features/cross-chain';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

interface CrossChainKPIData {
  totalBridges: number;
  activeChains: number;
  totalVolume: string;
  transactions24h: number;
}

export default function CrossChainAnalysisPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState<CrossChainKPIData | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30000);
  const [timeUntilRefresh, setTimeUntilRefresh] = useState(0);
  const [showCompareHint, setShowCompareHint] = useState(true);

  const fetchKPIData = useCallback(async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setKpiData({
      totalBridges: 12,
      activeChains: 8,
      totalVolume: '$2.4B',
      transactions24h: 156420,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchKPIData();
  }, [fetchKPIData]);

  useEffect(() => {
    if (!autoRefreshEnabled) {
      setTimeUntilRefresh(0);
      return;
    }

    setTimeUntilRefresh(refreshInterval);
    const interval = setInterval(() => {
      setTimeUntilRefresh((prev) => {
        if (prev <= 1000) {
          fetchKPIData();
          return refreshInterval;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, refreshInterval, fetchKPIData]);

  const kpiItems: KPIItem[] = useMemo(
    () =>
      kpiData
        ? [
            {
              id: 'bridges',
              label: t('crossChain.kpi.bridges') || '跨链桥数量',
              value: kpiData.totalBridges,
              icon: <Link2 className="h-5 w-5" />,
              trend: { value: 0, isPositive: true },
              color: 'blue',
            },
            {
              id: 'activeChains',
              label: t('crossChain.kpi.activeChains') || '活跃链数',
              value: kpiData.activeChains,
              icon: <Globe className="h-5 w-5" />,
              trend: { value: 2, isPositive: true },
              color: 'green',
            },
            {
              id: 'totalVolume',
              label: t('crossChain.kpi.totalVolume') || '总交易量',
              value: kpiData.totalVolume,
              icon: <TrendingUp className="h-5 w-5" />,
              trend: { value: 8.5, isPositive: true },
              color: 'purple',
            },
            {
              id: 'transactions24h',
              label: t('crossChain.kpi.transactions24h') || '24h 跨链交易数',
              value: kpiData.transactions24h.toLocaleString(),
              icon: <Zap className="h-5 w-5" />,
              trend: { value: 12.3, isPositive: true },
              color: 'amber',
            },
          ]
        : [],
    [kpiData, t],
  );

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-xl font-bold sm:text-2xl lg:text-3xl">
            <Activity className="h-6 w-6 text-primary" />
            {t('crossChain.pageTitle') || '跨链分析'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            {t('crossChain.pageDescription') || '跨链桥状态监控与交易分析'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchKPIData} disabled={loading}>
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
            {t('common.refresh')}
          </Button>
          <AutoRefreshControl
            isEnabled={autoRefreshEnabled}
            onToggle={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
            interval={refreshInterval}
            onIntervalChange={setRefreshInterval}
            timeUntilRefresh={timeUntilRefresh}
          />
        </div>
      </div>

      {showCompareHint && (
        <Alert className="border-primary/20 bg-primary/5">
          <Lightbulb className="h-4 w-4 text-primary" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              💡 {t('crossChain.compareHint')}{' '}
              <Link
                href="/compare/price"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {t('crossChain.goToCompare')}
              </Link>
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setShowCompareHint(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {loading && !kpiData ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <KPIOverviewBar items={kpiItems} />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="h-auto bg-muted p-1">
          <TabsTrigger value="overview" className="flex h-auto items-center gap-2 px-4 py-2">
            <LayoutDashboard className="h-4 w-4" />
            {t('nav.crossChainOverview')}
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex h-auto items-center gap-2 px-4 py-2">
            <Globe className="h-4 w-4" />
            {t('nav.crossChainComparison')}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex h-auto items-center gap-2 px-4 py-2">
            <BarChart3 className="h-4 w-4" />
            {t('nav.crossChainHistory')}
          </TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <TabsContent value="overview" className="mt-0">
              <CrossChainOverview />
            </TabsContent>

            <TabsContent value="comparison" className="mt-0">
              <CrossChainComparison />
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <CrossChainHistory />
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </div>
  );
}
