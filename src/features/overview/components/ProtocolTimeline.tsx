'use client';

import { motion } from 'framer-motion';
import {
  Link2,
  Zap,
  Activity,
  Globe,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';

import { MiniTrend } from '@/components/common/data/MiniTrend';
import { cn, formatTimeAgo } from '@/shared/utils';

type ProtocolStatus = 'healthy' | 'warning' | 'critical';

interface ProtocolData {
  name: string;
  status: ProtocolStatus;
  feeds: number;
  activeFeeds: number;
  avgLatency: number;
  lastUpdate: string;
  healthScore: number;
  latencyTrend: number[];
  tvl: string;
  href: string;
}

interface ProtocolTimelineProps {
  protocols: ProtocolData[];
  isLoading?: boolean;
}

const protocolIcons: Record<string, React.ReactNode> = {
  Chainlink: <Link2 className="h-5 w-5" />,
  Pyth: <Zap className="h-5 w-5" />,
  API3: <Activity className="h-5 w-5" />,
  Band: <Globe className="h-5 w-5" />,
};

const protocolColors: Record<string, string> = {
  Chainlink: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Pyth: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  API3: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  Band: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

export function ProtocolTimeline({ protocols, isLoading }: ProtocolTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/30" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {protocols.map((protocol, index) => (
        <ProtocolItem key={protocol.name} protocol={protocol} index={index} />
      ))}
    </div>
  );
}

function ProtocolItem({ protocol, index }: { protocol: ProtocolData; index: number }) {
  const StatusIcon = {
    healthy: CheckCircle2,
    warning: AlertTriangle,
    critical: XCircle,
  }[protocol.status];

  const statusConfig = {
    healthy: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Healthy' },
    warning: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Warning' },
    critical: { color: 'text-red-400', bg: 'bg-red-500/10', label: 'Critical' },
  }[protocol.status];

  const iconColor =
    protocolColors[protocol.name] || 'text-muted-foreground bg-muted/10 border-muted/20';

  return (
    <motion.a
      href={protocol.href}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="group block"
    >
      <div className="relative flex items-center gap-4 rounded-xl border border-border/30 bg-background/30 p-4 backdrop-blur-sm transition-all duration-300 hover:border-border/60 hover:bg-background/50">
        {/* Protocol Icon */}
        <div className={cn('flex-shrink-0 rounded-xl border p-3', iconColor)}>
          {protocolIcons[protocol.name] || <Activity className="h-5 w-5" />}
        </div>

        {/* Main Info */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-3">
            <h3 className="font-semibold text-foreground">{protocol.name}</h3>
            <div
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
                statusConfig.bg,
                statusConfig.color,
              )}
            >
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="font-medium text-foreground">{protocol.activeFeeds}</span>
              <span>/</span>
              <span>{protocol.feeds}</span>
              <span className="text-xs">feeds</span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {protocol.avgLatency}ms
            </span>
            <span className="flex items-center gap-1">
              <span className="text-xs">TVL</span>
              <span className="font-medium text-foreground">{protocol.tvl}</span>
            </span>
          </div>
        </div>

        {/* Health Score */}
        <div className="hidden flex-col items-center gap-1 border-l border-border/30 px-4 sm:flex">
          <div
            className={cn(
              'text-2xl font-bold',
              protocol.healthScore >= 90
                ? 'text-emerald-400'
                : protocol.healthScore >= 70
                  ? 'text-yellow-400'
                  : 'text-red-400',
            )}
          >
            {protocol.healthScore}
          </div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Health</span>
        </div>

        {/* Mini Trend */}
        <div className="hidden flex-col items-end gap-1 md:flex">
          <MiniTrend
            data={protocol.latencyTrend}
            width={80}
            height={28}
            color={
              protocol.status === 'healthy'
                ? 'success'
                : protocol.status === 'warning'
                  ? 'neutral'
                  : 'error'
            }
          />
          <span className="text-[10px] text-muted-foreground">
            {formatTimeAgo(protocol.lastUpdate, 'en')}
          </span>
        </div>

        {/* Arrow */}
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </motion.a>
  );
}
