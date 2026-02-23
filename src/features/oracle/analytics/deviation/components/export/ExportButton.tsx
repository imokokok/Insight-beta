'use client';

import { ExportButton, type ExportConfig } from '@/components/common';

import { deviationExportConfig, type DeviationReport } from '../../exportConfig';

interface DeviationExportButtonProps {
  report: DeviationReport | null;
  disabled?: boolean;
}

export function DeviationExportButton({ report, disabled }: DeviationExportButtonProps) {
  return (
    <ExportButton
      data={report}
      config={deviationExportConfig as ExportConfig<DeviationReport>}
      disabled={disabled}
    />
  );
}
