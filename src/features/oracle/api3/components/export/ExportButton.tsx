'use client';

import { createExportButton } from '@/components/common';

import { api3ExportConfig, type Api3ExportData } from '../../exportConfig';

export const Api3ExportButton = createExportButton<Api3ExportData>({
  config: api3ExportConfig,
  displayName: 'Api3ExportButton',
});
