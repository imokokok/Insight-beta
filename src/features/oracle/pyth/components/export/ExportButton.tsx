'use client';

import { createExportButton } from '@/components/common';

import { pythExportConfig, type PythExportData } from '../../exportConfig';

export const PythExportButton = createExportButton<PythExportData>({
  config: pythExportConfig,
  displayName: 'PythExportButton',
});
