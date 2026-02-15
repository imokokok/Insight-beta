'use client';

import { Badge } from '@/components/ui/badge';

interface DeviationSeverityBadgeProps {
  deviation: number;
}

export function DeviationSeverityBadge({ deviation }: DeviationSeverityBadgeProps) {
  let color = 'bg-green-500';
  let label = 'Low';

  if (deviation > 0.05) {
    color = 'bg-red-500';
    label = 'Critical';
  } else if (deviation > 0.02) {
    color = 'bg-orange-500';
    label = 'High';
  } else if (deviation > 0.01) {
    color = 'bg-yellow-500 text-black';
    label = 'Medium';
  }

  return <Badge className={color}>{label}</Badge>;
}
