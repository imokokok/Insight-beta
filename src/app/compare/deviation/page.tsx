'use client';

import { DeviationContent } from '@/features/oracle/analytics/deviation/components/DeviationContent';

import { ComparePageLayout } from '../components/ComparePageLayout';

export default function DeviationComparePage() {
  return (
    <ComparePageLayout activeTab="deviation">
      <DeviationContent />
    </ComparePageLayout>
  );
}
