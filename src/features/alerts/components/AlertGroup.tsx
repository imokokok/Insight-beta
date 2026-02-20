'use client';

import { useState, useCallback } from 'react';

import { ChevronDown, ChevronRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

import { AlertCard } from './AlertCard';

import type { UnifiedAlert } from '../types';
import type { AlertGroup as AlertGroupType } from '../utils/alertScoring';

interface AlertGroupProps {
  group: AlertGroupType;
  selectedAlertId?: string;
  onAlertClick: (alert: UnifiedAlert) => void;
  isSelected: (alertId: string) => boolean;
  toggleSelection: (alertId: string) => void;
  defaultExpanded?: boolean;
}

export function AlertGroup({
  group,
  selectedAlertId,
  onAlertClick,
  isSelected,
  toggleSelection,
  defaultExpanded = true,
}: AlertGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const criticalCount = group.alerts.filter((a) => a.severity === 'critical').length;
  const highCount = group.alerts.filter((a) => a.severity === 'high').length;
  const activeCount = group.alerts.filter((a) => a.status === 'active').length;

  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        onClick={toggleExpanded}
        className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium">{group.label}</span>
          <Badge variant="secondary" className="ml-1">
            {group.count}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <Badge className="bg-red-500 text-xs">{criticalCount} Critical</Badge>
          )}
          {highCount > 0 && criticalCount === 0 && (
            <Badge className="bg-orange-500 text-xs">{highCount} High</Badge>
          )}
          {activeCount > 0 && (
            <Badge variant="outline" className="text-xs">
              {activeCount} Active
            </Badge>
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t px-3 py-2">
          <div className="space-y-3">
            {group.alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onClick={() => onAlertClick(alert)}
                isSelected={selectedAlertId === alert.id}
                showCheckbox
                isChecked={isSelected(alert.id)}
                onCheckChange={() => toggleSelection(alert.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface AlertGroupListProps {
  groups: AlertGroupType[];
  selectedAlertId?: string;
  onAlertClick: (alert: UnifiedAlert) => void;
  isSelected: (alertId: string) => boolean;
  toggleSelection: (alertId: string) => void;
  defaultExpandedGroups?: boolean;
}

export function AlertGroupList({
  groups,
  selectedAlertId,
  onAlertClick,
  isSelected,
  toggleSelection,
  defaultExpandedGroups = true,
}: AlertGroupListProps) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <AlertGroup
          key={group.key}
          group={group}
          selectedAlertId={selectedAlertId}
          onAlertClick={onAlertClick}
          isSelected={isSelected}
          toggleSelection={toggleSelection}
          defaultExpanded={defaultExpandedGroups}
        />
      ))}
    </div>
  );
}
