'use client';

import { ExportButton, type ExportConfig } from '@/components/common';

import { pythExportConfig, type PythExportData } from '../../exportConfig';

interface PythExportButtonProps {
  data: PythExportData | null;
  disabled?: boolean;
}

export function PythExportButton({ data, disabled }: PythExportButtonProps) {
  return (
    <ExportButton
      data={data}
      config={pythExportConfig as ExportConfig<PythExportData>}
      disabled={disabled}
    />
  );
}
