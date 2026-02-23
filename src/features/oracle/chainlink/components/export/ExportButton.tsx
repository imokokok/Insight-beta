'use client';

import { createExportButton } from '@/components/common';

import { chainlinkExportConfig, type ChainlinkExportData } from '../../exportConfig';

export const ChainlinkExportButton = createExportButton<ChainlinkExportData>({
  config: chainlinkExportConfig,
  displayName: 'ChainlinkExportButton',
});
