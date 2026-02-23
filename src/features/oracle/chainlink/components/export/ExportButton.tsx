'use client';

import { ExportButton, type ExportConfig } from '@/components/common';

import { chainlinkExportConfig, type ChainlinkExportData } from '../../exportConfig';

interface ChainlinkExportButtonProps {
  data: ChainlinkExportData | null;
  disabled?: boolean;
}

export function ChainlinkExportButton({ data, disabled }: ChainlinkExportButtonProps) {
  return (
    <ExportButton
      data={data}
      config={chainlinkExportConfig as ExportConfig<ChainlinkExportData>}
      disabled={disabled}
    />
  );
}
