'use client';

import { ExportButton, type ExportConfig } from '@/components/common';

import { bandExportConfig, type BandExportData } from '../../exportConfig';

interface BandExportButtonProps {
  data: BandExportData | null;
  disabled?: boolean;
}

export function BandExportButton({ data, disabled }: BandExportButtonProps) {
  return (
    <ExportButton
      data={data}
      config={bandExportConfig as ExportConfig<BandExportData>}
      disabled={disabled}
    />
  );
}
