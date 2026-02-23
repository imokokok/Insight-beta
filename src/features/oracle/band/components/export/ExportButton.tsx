'use client';

import { createExportButton } from '@/components/common';

import { bandExportConfig, type BandExportData } from '../../exportConfig';

export const BandExportButton = createExportButton<BandExportData>({
  config: bandExportConfig,
  displayName: 'BandExportButton',
});
