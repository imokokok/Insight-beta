'use client';

import { useState } from 'react';

import type { TimeRange, GroupBy } from './useAlertHistory';
import type { UnifiedAlert } from '../types';

export interface UseAlertsStateReturn {
  selectedAlert: UnifiedAlert | null;
  setSelectedAlert: (alert: UnifiedAlert | null) => void;
  historyTimeRange: TimeRange;
  setHistoryTimeRange: (range: TimeRange) => void;
  historyGroupBy: GroupBy;
  setHistoryGroupBy: (groupBy: GroupBy) => void;
}

export function useAlertsState(): UseAlertsStateReturn {
  const [selectedAlert, setSelectedAlert] = useState<UnifiedAlert | null>(null);
  const [historyTimeRange, setHistoryTimeRange] = useState<TimeRange>('24h');
  const [historyGroupBy, setHistoryGroupBy] = useState<GroupBy>('none');

  return {
    selectedAlert,
    setSelectedAlert,
    historyTimeRange,
    setHistoryTimeRange,
    historyGroupBy,
    setHistoryGroupBy,
  };
}
