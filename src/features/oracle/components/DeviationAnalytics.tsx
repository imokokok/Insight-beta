'use client';

import DeviationAnalyticsPage from '@/app/oracle/analytics/deviation/page';

interface DeviationAnalyticsProps {
  className?: string;
}

export function DeviationAnalytics({ className }: DeviationAnalyticsProps) {
  return (
    <div className={className}>
      <DeviationAnalyticsPage />
    </div>
  );
}
