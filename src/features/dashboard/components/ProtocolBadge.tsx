'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/shared/utils';
import type { OracleProtocol } from '@/types';

interface ProtocolBadgeProps {
  protocol: OracleProtocol;
  className?: string;
}

const protocolStyles: Record<OracleProtocol, string> = {
  chainlink: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  pyth: 'bg-primary/10 text-primary border-primary/20',
  redstone: 'bg-red-500/10 text-red-600 border-red-500/20',
  uma: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
};

export function ProtocolBadge({ protocol, className }: ProtocolBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium capitalize transition-colors',
        protocolStyles[protocol],
        className,
      )}
    >
      {protocol}
    </Badge>
  );
}
