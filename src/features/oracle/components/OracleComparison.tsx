'use client';

import ComparisonPage from '@/app/oracle/comparison/page';

interface OracleComparisonProps {
  className?: string;
}

export function OracleComparison({ className }: OracleComparisonProps) {
  return (
    <div className={className}>
      <ComparisonPage />
    </div>
  );
}
