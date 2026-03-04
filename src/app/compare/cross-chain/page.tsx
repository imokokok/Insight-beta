'use client';

import { Suspense, useState } from 'react';

import { Breadcrumb } from '@/components/common';
import { ChartSkeleton } from '@/components/ui';
import { CrossChainPriceComparison } from '@/features/comparison/components/CrossChainPriceComparison';
import { useI18n } from '@/i18n';

import { ComparePageLayout } from '../components/ComparePageLayout';

export default function CrossChainPage() {
  const { t } = useI18n();
  const [selectedChains, setSelectedChains] = useState<string[]>([
    'ethereum',
    'polygon',
    'arbitrum',
    'optimism',
  ]);

  const breadcrumbItems = [
    { label: t('nav.compare'), href: '/compare' },
    { label: t('compare.crossChain.title') },
  ];

  const availableChains = [
    { value: 'ethereum', label: 'Ethereum' },
    { value: 'polygon', label: 'Polygon' },
    { value: 'arbitrum', label: 'Arbitrum' },
    { value: 'optimism', label: 'Optimism' },
    { value: 'avalanche', label: 'Avalanche' },
    { value: 'bsc', label: 'BNB Chain' },
  ];

  const toggleChain = (chain: string) => {
    if (selectedChains.includes(chain)) {
      if (selectedChains.length > 2) {
        setSelectedChains(selectedChains.filter((c) => c !== chain));
      }
    } else {
      setSelectedChains([...selectedChains, chain]);
    }
  };

  return (
    <ComparePageLayout activeTab="crossChain">
      <Breadcrumb items={breadcrumbItems} />
      <div className="mb-4">
        <h1 className="text-xl font-semibold">{t('compare.crossChain.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('compare.crossChain.description')}</p>
      </div>

      <div className="mb-4 rounded-lg border border-border/50 bg-muted/20 p-4">
        <div className="mb-2 text-sm font-medium">{t('compare.crossChain.selectChains')}</div>
        <div className="flex flex-wrap gap-2">
          {availableChains.map((chain) => (
            <button
              key={chain.value}
              onClick={() => toggleChain(chain.value)}
              className={`rounded-full px-3 py-1 text-sm transition-all ${
                selectedChains.includes(chain.value)
                  ? 'text-primary-foreground bg-primary'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {chain.label}
            </button>
          ))}
        </div>
      </div>

      <Suspense fallback={<ChartSkeleton className="h-96" />}>
        <CrossChainPriceComparison chains={selectedChains} />
      </Suspense>
    </ComparePageLayout>
  );
}
