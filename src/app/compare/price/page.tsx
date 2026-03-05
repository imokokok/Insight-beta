'use client';

import { Suspense, useState } from 'react';

import Link from 'next/link';

import { Breadcrumb } from '@/components/common';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { Alert, AlertDescription, ChartSkeleton } from '@/components/ui';
import { ComparisonContent } from '@/features/comparison/components/ComparisonContent';
import { PriceDeviationHistoryChart } from '@/features/comparison/components/PriceDeviationHistoryChart';
import { PriceDeviationTimeline } from '@/features/comparison/components/PriceDeviationTimeline';
import { useI18n } from '@/i18n';

import { ComparePageLayout } from '../components/ComparePageLayout';

export default function PriceComparePage() {
  const { t } = useI18n();
  const [showHint, setShowHint] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('ETH/USD');
  const [selectedProtocol, setSelectedProtocol] = useState<string>('chainlink');

  const breadcrumbItems = [
    { label: t('nav.compare'), href: '/compare' },
    { label: t('compare.tabs.price') },
  ];

  return (
    <ComparePageLayout activeTab="price">
      <Breadcrumb items={breadcrumbItems} />
      <div className="mb-4">
        <h1 className="text-xl font-semibold">{t('compare.price.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('compare.price.description')}</p>
        <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
          🎯 {t('compare.price.scenario')}
        </p>
      </div>
      {showHint && (
        <Alert className="mb-4 border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30">
          <AlertDescription className="flex items-center justify-between">
            <span>
              💡 {t('compare.crossChainHint')}{' '}
              <Link
                href="/cross-chain"
                className="font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                {t('compare.goToCrossChain')}
              </Link>
            </span>
            <button
              onClick={() => setShowHint(false)}
              className="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Close"
            >
              ✕
            </button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="realtime" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="realtime">{t('compare.price.realtimeView')}</TabsTrigger>
          <TabsTrigger value="history">{t('compare.price.historyView')}</TabsTrigger>
          <TabsTrigger value="events">{t('compare.price.eventsView')}</TabsTrigger>
        </TabsList>

        <TabsContent value="realtime">
          <Suspense fallback={<ChartSkeleton className="h-96" />}>
            <ComparisonContent />
          </Suspense>
        </TabsContent>

        <TabsContent value="history">
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
                    className="rounded-md border border-border bg-card px-3 py-2 text-sm"
                  >
                    <option value="ETH/USD">ETH/USD</option>
                    <option value="BTC/USD">BTC/USD</option>
                    <option value="LINK/USD">LINK/USD</option>
                    <option value="MATIC/USD">MATIC/USD</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    {t('compare.price.selectProtocol')}
                  </label>
                  <select
                    value={selectedProtocol}
                    onChange={(e) => setSelectedProtocol(e.target.value)}
                    className="rounded-md border border-border bg-card px-3 py-2 text-sm capitalize"
                  >
                    <option value="chainlink">Chainlink</option>
                    <option value="pyth">Pyth</option>
                    <option value="api3">API3</option>
                    <option value="band">Band</option>
                  </select>
                </div>
              </div>
            </div>

            <Suspense fallback={<ChartSkeleton className="h-96" />}>
              <PriceDeviationHistoryChart symbol={selectedSymbol} protocol={selectedProtocol} />
            </Suspense>
          </div>
        </TabsContent>

        <TabsContent value="events">
          <Suspense fallback={<ChartSkeleton className="h-96" />}>
            <PriceDeviationTimeline symbol={selectedSymbol} protocol={selectedProtocol} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </ComparePageLayout>
  );
}
