'use client';

import { Suspense, useState } from 'react';

import { Breadcrumb } from '@/components/common';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { ChartSkeleton } from '@/components/ui';
import { ComparisonContent } from '@/features/comparison/components/ComparisonContent';
import { LatencyAnomalyEvents } from '@/features/comparison/components/LatencyAnomalyEvents';
import { LatencyBlockCorrelationChart } from '@/features/comparison/components/LatencyBlockCorrelationChart';
import { useI18n } from '@/i18n';

import { ComparePageLayout } from '../components/ComparePageLayout';

export default function LatencyComparePage() {
  const { t } = useI18n();
  const [selectedSymbol, setSelectedSymbol] = useState<string>('ETH/USD');
  const [selectedChain, setSelectedChain] = useState<string>('ethereum');

  const breadcrumbItems = [
    { label: t('nav.compare'), href: '/compare' },
    { label: t('compare.tabs.latency') },
  ];

  return (
    <ComparePageLayout activeTab="latency">
      <Breadcrumb items={breadcrumbItems} />
      <div className="mb-4">
        <h1 className="text-xl font-semibold">{t('compare.latency.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('compare.latency.description')}</p>
        <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
          🎯 {t('compare.latency.scenario')}
        </p>
      </div>

      <Tabs defaultValue="analysis" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analysis">{t('compare.latency.tabs.distribution')}</TabsTrigger>
          <TabsTrigger value="anomalies">{t('compare.latency.anomalyTitle')}</TabsTrigger>
          <TabsTrigger value="correlation">
            {t('compare.latency.blockCorrelationTitle')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analysis">
          <Suspense fallback={<ChartSkeleton className="h-96" />}>
            <ComparisonContent />
          </Suspense>
        </TabsContent>

        <TabsContent value="anomalies">
          <div className="space-y-4">
            <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    {t('compare.price.selectSymbol')}
                  </label>
                  <select
                    value={selectedSymbol}
                    onChange={(e) => setSelectedSymbol(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="ETH/USD">ETH/USD</option>
                    <option value="BTC/USD">BTC/USD</option>
                    <option value="LINK/USD">LINK/USD</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    {t('compare.latency.chain')}
                  </label>
                  <select
                    value={selectedChain}
                    onChange={(e) => setSelectedChain(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="ethereum">Ethereum</option>
                    <option value="polygon">Polygon</option>
                    <option value="arbitrum">Arbitrum</option>
                  </select>
                </div>
              </div>
            </div>

            <Suspense fallback={<ChartSkeleton className="h-96" />}>
              <LatencyAnomalyEvents symbol={selectedSymbol} chain={selectedChain} />
            </Suspense>
          </div>
        </TabsContent>

        <TabsContent value="correlation">
          <Suspense fallback={<ChartSkeleton className="h-96" />}>
            <LatencyBlockCorrelationChart symbol={selectedSymbol} chain={selectedChain} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </ComparePageLayout>
  );
}
