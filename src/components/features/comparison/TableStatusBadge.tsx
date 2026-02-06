'use client';

import React from 'react';

import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n';

interface StatusBadgeProps {
  status: 'active' | 'stale' | 'error' | string;
}

export const StatusBadge = React.memo(function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useI18n();

  switch (status) {
    case 'active':
      return (
        <Badge variant="default" className="bg-emerald-500 text-xs">
          {t('comparison.status.active')}
        </Badge>
      );
    case 'stale':
      return (
        <Badge variant="secondary" className="text-xs">
          {t('comparison.status.stale')}
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="destructive" className="text-xs">
          {t('comparison.status.error')}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-xs">
          {t('comparison.status.unknown')}
        </Badge>
      );
  }
});
