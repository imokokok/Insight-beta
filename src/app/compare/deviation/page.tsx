'use client';

import { DeviationContent } from '@/features/oracle/analytics/deviation/components/DeviationContent';
import { useI18n } from '@/i18n';

import { ComparePageLayout } from '../components/ComparePageLayout';

export default function DeviationComparePage() {
  const { t } = useI18n();

  return (
    <ComparePageLayout activeTab="deviation">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">{t('compare.deviation.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('compare.deviation.description')}</p>
        <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
          🎯 {t('compare.deviation.scenario')}
        </p>
      </div>
      <DeviationContent />
    </ComparePageLayout>
  );
}
