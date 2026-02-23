'use client';

import { ExportButton, type ExportConfig } from '@/components/common';

import { disputeExportConfig, type DisputeReport } from '../../exportConfig';

interface DisputeExportButtonProps {
  report: DisputeReport | null;
  disabled?: boolean;
}

export function DisputeExportButton({ report, disabled }: DisputeExportButtonProps) {
  return (
    <ExportButton
      data={report}
      config={disputeExportConfig as ExportConfig<DisputeReport>}
      disabled={disabled}
    />
  );
}
