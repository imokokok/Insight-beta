'use client';

import { Badge } from '@/components/ui';
import { useI18n } from '@/i18n';

interface DeviationSeverityBadgeProps {
  deviation: number;
}

export function DeviationSeverityBadge({ deviation }: DeviationSeverityBadgeProps) {
  const { t } = useI18n();
  let color = 'bg-green-500';
  let label = t('common.low');

  if (deviation > 0.05) {
    color = 'bg-red-500';
    label = t('common.critical');
  } else if (deviation > 0.02) {
    color = 'bg-orange-500';
    label = t('common.high');
  } else if (deviation > 0.01) {
    color = 'bg-yellow-500 text-black';
    label = t('common.medium');
  }

  return <Badge className={color}>{label}</Badge>;
}
