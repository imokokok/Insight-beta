'use client';

import { Suspense } from 'react';

import { Breadcrumb } from '@/components/common';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { ChartSkeleton } from '@/components/ui';
import { ComparisonContent } from '@/features/comparison/components/ComparisonContent';
import { CostDataSource } from '@/features/comparison/components/CostDataSource';
import { useI18n } from '@/i18n';

import { ComparePageLayout } from '../components/ComparePageLayout';

export default function CostComparePage() {
  const { t } = useI18n();

  const breadcrumbItems = [
    { label: t('nav.compare'), href: '/compare' },
    { label: t('compare.tabs.cost') },
  ];

  return (
    <ComparePageLayout activeTab="cost">
      <Breadcrumb items={breadcrumbItems} />
      <div className="mb-4">
        <h1 className="text-xl font-semibold">{t('compare.cost.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('compare.cost.description')}</p>
        <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
          🎯 {t('compare.cost.scenario')}
        </p>
      </div>

      <Tabs defaultValue="comparison" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="comparison">{t('compare.cost.radarTitle')}</TabsTrigger>
          <TabsTrigger value="sources">{t('compare.cost.dataSourceTitle')}</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison">
          <Suspense fallback={<ChartSkeleton className="h-96" />}>
            <ComparisonContent />
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
