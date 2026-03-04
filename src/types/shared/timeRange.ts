export type TimeRangePreset = '1h' | '6h' | '24h' | '7d' | '30d' | 'ALL' | 'custom';

export interface TimeRange {
  preset: TimeRangePreset;
  startTime?: Date;
  endTime?: Date;
}

export interface TimeRangeOption {
  value: TimeRangePreset;
  labelKey: string;
  hours: number;
}
