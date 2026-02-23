'use client';

import { ExportButton, type ExportConfig } from '@/components/common';

import { api3ExportConfig, type Api3ExportData } from '../../exportConfig';

interface Api3ExportButtonProps {
  data: Api3ExportData | null;
  disabled?: boolean;
}

export function Api3ExportButton({ data, disabled }: Api3ExportButtonProps) {
  return (
    <ExportButton
      data={data}
      config={api3ExportConfig as ExportConfig<Api3ExportData>}
      disabled={disabled}
    />
  );
}
