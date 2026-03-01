'use client';

import { Suspense } from 'react';

import { Breadcrumb } from '@/components/common';
import { ChartSkeleton } from '@/components/ui';
import { ComparisonContent } from '@/features/comparison/components/ComparisonContent';
import { useI18n } from '@/i18n';

import { ComparePageLayout } from '../components/ComparePageLayout';

export default function LatencyComparePage() {
  const { t } = useI18n();

  const breadcrumbItems = [
    { label: t('nav.compare'), href: '/compare' },
    { label: t('compare.tabs.latency') },
  ];

  return (
    <ComparePageLayout activeTab="latency">
      <Breadcrumb items={breadcrumbItems} />
      <Suspense fallback={<ChartSkeleton className="h-96" />}>
        <ComparisonContent />
      </Suspense>
    </ComparePageLayout>
  );
}
