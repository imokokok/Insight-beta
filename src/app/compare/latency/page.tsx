'use client';

import { Suspense, useState } from 'react';
import { ChartSkeleton } from '@/components/ui';
import { Breadcrumb } from '@/components/common';
import { ComparisonContent } from '@/features/comparison/components/ComparisonContent';
import { LatencyAnomalyEvents } from '@/features/comparison/components/LatencyAnomalyEvents';
import { ComparisonContent } from '@/features/comparison/components/ComparisonContent';
import { useI18n } from '@/i18n';


  const [selectedChain, setSelectedChain] = useState<string>('ethereum');

  return (
    <ComparePageLayout activeTab="latency">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">{t('compare.latency.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('compare.latency.description')}</p>

  const breadcrumbItems = [
    { label: t('nav.compare'), href: '/compare' },
    { label: t('compare.tabs.latency') },
  ];
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
