'use client';

import { ExportButton, type ExportConfig } from './ExportButton';

export interface CreateExportButtonOptions<T> {
  config: ExportConfig<T>;
  displayName: string;
}

export function createExportButton<T>(options: CreateExportButtonOptions<T>) {
  const { config, displayName } = options;

  const ExportButtonComponent = ({ data, disabled }: { data: T | null; disabled?: boolean }) => (
    <ExportButton data={data} config={config as ExportConfig<T>} disabled={disabled} />
  );

  ExportButtonComponent.displayName = displayName;
  return ExportButtonComponent;
}
