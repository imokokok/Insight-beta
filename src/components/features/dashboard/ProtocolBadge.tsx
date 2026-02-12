'use client';

import { Badge } from '@/components/ui/badge';
import type { OracleProtocol } from '@/types';
import { cn } from '@/shared/utils';

interface ProtocolBadgeProps {
  protocol: OracleProtocol;
  className?: string;
}

const protocolStyles: Record<OracleProtocol, string> = {
  chainlink: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  pyth: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  band: 'bg-green-500/10 text-green-600 border-green-500/20',
  api3: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  redstone: 'bg-red-500/10 text-red-600 border-red-500/20',
  switchboard: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  flux: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  dia: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
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
