'use client';

import { Layers, ArrowUpDown, Clock, Sparkles, AlertTriangle } from 'lucide-react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { useI18n } from '@/i18n';

import type { GroupMode, SortMode } from '../utils/alertScoring';

interface AlertGroupSelectorProps {
  groupMode: GroupMode;
  onGroupModeChange: (mode: GroupMode) => void;
  sortMode: SortMode;
  onSortModeChange: (mode: SortMode) => void;
}

export function AlertGroupSelector({
  groupMode,
  onGroupModeChange,
  sortMode,
  onSortModeChange,
}: AlertGroupSelectorProps) {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        <Layers className="h-4 w-4 text-muted-foreground" />
        <Select value={groupMode} onValueChange={(v) => onGroupModeChange(v as GroupMode)}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t('alerts.grouping.none')}</SelectItem>
            <SelectItem value="rule">{t('alerts.grouping.byRule')}</SelectItem>
            <SelectItem value="symbol">{t('alerts.grouping.bySymbol')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1.5">
        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
        <Select value={sortMode} onValueChange={(v) => onSortModeChange(v as SortMode)}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="time">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>{t('alerts.sorting.time')}</span>
              </div>
            </SelectItem>
            <SelectItem value="smart">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{t('alerts.sorting.smart')}</span>
              </div>
            </SelectItem>
            <SelectItem value="severity">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{t('alerts.sorting.severity')}</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
