'use client';

export type FilterOperator =
  | 'equals'
  | 'notEquals'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'in'
  | 'notIn'
  | 'between'
  | 'notBetween';

export type FilterValueType = 'string' | 'number' | 'boolean' | 'date' | 'array';

export interface FilterField {
  key: string;
  label: string;
  type: FilterValueType;
  options?: { value: string | number | boolean; label: string }[];
  placeholder?: string;
  min?: number;
  max?: number;
}

export interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: unknown;
}

export type TimeRangePreset = '24h' | '7d' | '30d' | 'custom';

export interface TimeRange {
  preset: TimeRangePreset;
  start?: Date;
  end?: Date;
}

export interface FilterConfig {
  id: string;
  name: string;
  timeRange: TimeRange;
  selectedFields: string[];
  conditions: FilterCondition[];
}

export interface DataFilterProps {
  fields: FilterField[];
  config?: FilterConfig;
  onConfigChange?: (config: FilterConfig) => void;
  storageKey?: string;
}
