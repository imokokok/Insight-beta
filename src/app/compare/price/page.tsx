'use client';

import { Suspense, useState } from 'react';

import Link from 'next/link';

import { Breadcrumb } from '@/components/common';
import { Alert, AlertDescription, ChartSkeleton } from '@/components/ui';
import { ComparisonContent } from '@/features/comparison/components/ComparisonContent';
import { useI18n } from '@/i18n';

import { ComparePageLayout } from '../components/ComparePageLayout';

export default function PriceComparePage() {
  const { t } = useI18n();
  const [showHint, setShowHint] = useState(true);

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
      <Suspense fallback={<ChartSkeleton className="h-96" />}>
        <ComparisonContent />
      </Suspense>
    </ComparePageLayout>
  );
}
