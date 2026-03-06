'use client';

import { useCallback } from 'react';

import { RefreshCw, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui';

import { FilterBar } from '../FilterBar';
import { ConditionFilter } from './ConditionFilter';
import { FieldSelector } from './FieldSelector';
import { TimeRangeFilter } from './TimeRangeFilter';
import { useFilterConfig } from './useFilterConfig';

import type { DataFilterProps as DataFilterPropsType } from './types';

export interface DataFilterProps extends DataFilterPropsType {
  onApply?: (config: ReturnType<typeof useFilterConfig>['config']) => void;
}

export function DataFilter({
  fields,
  config: externalConfig,
  onConfigChange,
  storageKey = 'data-filter',
  onApply,
}: DataFilterProps) {
  const filterState = useFilterConfig({
    fields,
    storageKey,
    initialConfig: externalConfig,
  });

  const { config, updateTimeRange, updateSelectedFields, updateConditions, reset } = filterState;

  const handleConfigChange = useCallback(() => {
    onConfigChange?.(config);
  }, [config, onConfigChange]);

  const handleApply = useCallback(() => {
    onApply?.(config);
  }, [config, onApply]);

  const hasActiveFilters =
    config.conditions.length > 0 ||
    config.selectedFields.length !== fields.length ||
    config.timeRange.preset !== '24h';

  return (
    <div className="space-y-4">
      <FilterBar className="flex-wrap gap-2">
        <TimeRangeFilter
          value={config.timeRange}
          onChange={(range) => {
            updateTimeRange(range);
            handleConfigChange();
          }}
        />

        <FieldSelector
          fields={fields}
          selectedFields={config.selectedFields}
          onChange={(selected) => {
            updateSelectedFields(selected);
            handleConfigChange();
          }}
        />

        <ConditionFilter
          fields={fields}
          conditions={config.conditions}
          onChange={(conditions) => {
            updateConditions(conditions);
            handleConfigChange();
          }}
        />

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 px-3 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              reset();
              handleConfigChange();
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        )}

        {onApply && (
          <Button
            variant="default"
            size="sm"
            className="h-9 gap-1.5 px-3 text-xs"
            onClick={handleApply}
          >
            <RefreshCw className="h-4 w-4" />
            Apply
          </Button>
        )}
      </FilterBar>
    </div>
  );
}
