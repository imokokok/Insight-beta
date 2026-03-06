'use client';

import { useState, useEffect, useCallback } from 'react';

import type { FilterConfig, FilterField, TimeRange } from './types';

const STORAGE_PREFIX = 'filter-config:';

function serializeDate(date: Date): string {
  return date.toISOString();
}

function deserializeDate(isoString: string): Date {
  return new Date(isoString);
}

function serializeConfig(config: FilterConfig): string {
  const serialized = {
    ...config,
    timeRange: {
      ...config.timeRange,
      start: config.timeRange.start ? serializeDate(config.timeRange.start) : undefined,
      end: config.timeRange.end ? serializeDate(config.timeRange.end) : undefined,
    },
  };
  return JSON.stringify(serialized);
}

function deserializeConfig(serialized: string): FilterConfig {
  const parsed = JSON.parse(serialized);
  return {
    ...parsed,
    timeRange: {
      ...parsed.timeRange,
      start: parsed.timeRange.start ? deserializeDate(parsed.timeRange.start) : undefined,
      end: parsed.timeRange.end ? deserializeDate(parsed.timeRange.end) : undefined,
    },
  };
}

function createDefaultConfig(fields: FilterField[], id: string = 'default'): FilterConfig {
  return {
    id,
    name: 'Default Filter',
    timeRange: { preset: '24h' },
    selectedFields: fields.map((f) => f.key),
    conditions: [],
  };
}

interface UseFilterConfigOptions {
  fields: FilterField[];
  storageKey?: string;
  initialConfig?: FilterConfig;
}

export function useFilterConfig({ fields, storageKey, initialConfig }: UseFilterConfigOptions) {
  const [config, setConfigState] = useState<FilterConfig>(() => {
    if (initialConfig) {
      return initialConfig;
    }

    if (storageKey) {
      try {
        const stored = localStorage.getItem(STORAGE_PREFIX + storageKey);
        if (stored) {
          return deserializeConfig(stored);
        }
      } catch (e) {
        console.warn('Failed to load filter config from localStorage:', e);
      }
    }

    return createDefaultConfig(fields, storageKey || 'default');
  });

  useEffect(() => {
    if (storageKey) {
      try {
        localStorage.setItem(STORAGE_PREFIX + storageKey, serializeConfig(config));
      } catch (e) {
        console.warn('Failed to save filter config to localStorage:', e);
      }
    }
  }, [config, storageKey]);

  const setConfig = useCallback(
    (newConfig: FilterConfig | ((prev: FilterConfig) => FilterConfig)) => {
      setConfigState((prev) => {
        const next = typeof newConfig === 'function' ? newConfig(prev) : newConfig;
        return next;
      });
    },
    [],
  );

  const updateTimeRange = useCallback(
    (timeRange: TimeRange) => {
      setConfig((prev) => ({ ...prev, timeRange }));
    },
    [setConfig],
  );

  const updateSelectedFields = useCallback(
    (selectedFields: string[]) => {
      setConfig((prev) => ({ ...prev, selectedFields }));
    },
    [setConfig],
  );

  const updateConditions = useCallback(
    (conditions: FilterConfig['conditions']) => {
      setConfig((prev) => ({ ...prev, conditions }));
    },
    [setConfig],
  );

  const reset = useCallback(() => {
    setConfig(createDefaultConfig(fields, storageKey || 'default'));
  }, [fields, storageKey, setConfig]);

  const saveConfig = useCallback(
    (name: string) => {
      const newConfig = { ...config, name, id: Date.now().toString() };
      setConfig(newConfig);
      return newConfig;
    },
    [config, setConfig],
  );

  return {
    config,
    setConfig,
    updateTimeRange,
    updateSelectedFields,
    updateConditions,
    reset,
    saveConfig,
  };
}
