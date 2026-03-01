'use client';

import { Breadcrumb } from '@/components/common';
import { DeviationContent } from '@/features/oracle/analytics/deviation/components/DeviationContent';
import { useI18n } from '@/i18n';

import { ComparePageLayout } from '../components/ComparePageLayout';

export default function DeviationComparePage() {
  const { t } = useI18n();

  const breadcrumbItems = [
    { label: t('nav.compare'), href: '/compare' },
    { label: t('compare.tabs.deviation') },
  ];

  return (
    <ComparePageLayout activeTab="deviation">
      <Breadcrumb items={breadcrumbItems} />
      <DeviationContent />
    </ComparePageLayout>
  );
}
