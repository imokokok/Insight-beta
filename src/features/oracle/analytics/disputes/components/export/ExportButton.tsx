'use client';

import { createExportButton } from '@/components/common';

import { disputeExportConfig, type DisputeReport } from '../../exportConfig';

export const DisputeExportButton = createExportButton<DisputeReport>({
  config: disputeExportConfig,
  displayName: 'DisputeExportButton',
});
