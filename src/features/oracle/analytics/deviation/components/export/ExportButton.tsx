'use client';

import { createExportButton } from '@/components/common';

import { deviationExportConfig, type DeviationReport } from '../../exportConfig';

export const DeviationExportButton = createExportButton<DeviationReport>({
  config: deviationExportConfig,
  displayName: 'DeviationExportButton',
});
