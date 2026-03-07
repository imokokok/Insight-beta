'use client';

import { Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { Breadcrumb } from '@/components/common';
import { ChartSkeleton } from '@/components/ui';
import { ComparisonContent } from '@/features/comparison/components/ComparisonContent';
import { CostDataSource } from '@/features/comparison/components/CostDataSource';
import { useI18n } from '@/i18n';

import { ComparePageLayout } from '../components/ComparePageLayout';

export default function CostComparePage() {
  const { t } = useI18n();

  return (
  const breadcrumbItems = [
    { label: t('nav.compare'), href: '/compare' },
    { label: t('compare.tabs.cost') },
  ];

    <ComparePageLayout activeTab="cost">
      <div className="mb-4">
      <Breadcrumb items={breadcrumbItems} />
      <div className="mb-4">
        <h1 className="text-xl font-semibold">{t('compare.cost.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('compare.cost.description')}</p>
        <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
          🎯 {t('compare.cost.scenario')}
          </Suspense>
        </TabsContent>

        <TabsContent value="sources">
          <Suspense fallback={<ChartSkeleton className="h-96" />}>
            <CostDataSource />
          </Suspense>
        </TabsContent>
      </Tabs>
    </ComparePageLayout>
  );
}
