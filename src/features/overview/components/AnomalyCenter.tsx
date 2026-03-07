'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, AlertOctagon, Info, Clock, ChevronRight, TrendingUp } from 'lucide-react';

import { cn, formatTimeAgo, formatNumber } from '@/shared/utils';

type Severity = 'critical' | 'high' | 'medium' | 'low';

interface AnomalyData {
  id: string;
  symbol: string;
  timestamp: string;
  severity: Severity;
  deviationPercent: number;
  avgPrice: number;
  outlierProtocols: string[];
  prices: Record<string, number>;
}

interface AnomalyCenterProps {
  anomalies: AnomalyData[];
  isLoading?: boolean;
}

const severityConfig: Record<
  Severity,
  { icon: React.ReactNode; color: string; bg: string; label: string }
> = {
  critical: {
    icon: <AlertOctagon className="h-4 w-4" />,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    label: 'Critical',
  },
  high: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    label: 'High',
  },
  medium: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    label: 'Medium',
  },
  low: {
    icon: <Info className="h-4 w-4" />,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    label: 'Low',
  },
};

export function AnomalyCenter({ anomalies, isLoading }: AnomalyCenterProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/30" />
        ))}
      </div>
    );
  }

  if (anomalies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-3 rounded-full bg-emerald-500/10 p-3">
          <TrendingUp className="h-6 w-6 text-emerald-400" />
        </div>
        <p className="text-sm font-medium text-foreground">No Anomalies Detected</p>
        <p className="mt-1 text-xs text-muted-foreground">
          All price feeds are within normal ranges
        </p>
      </div>
    );
  }

  // Show only top 5 anomalies
  const displayAnomalies = anomalies.slice(0, 5);

  return (
    <div className="space-y-2">
      {displayAnomalies.map((anomaly, index) => (
        <AnomalyItem key={anomaly.id} anomaly={anomaly} index={index} />
      ))}
      {anomalies.length > 5 && (
        <a
          href="/compare/deviation"
          className="flex items-center justify-center gap-1 py-2 text-xs text-muted-foreground transition-colors hover:text-primary"
        >
          View all {anomalies.length} anomalies
          <ChevronRight className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

function AnomalyItem({ anomaly, index }: { anomaly: AnomalyData; index: number }) {
  const severity = severityConfig[anomaly.severity];
  const prices = Object.values(anomaly.prices);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  return (
    <motion.a
      href={`/compare/price?symbol=${encodeURIComponent(anomaly.symbol)}`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group block"
    >
      <div className="flex items-center gap-3 rounded-xl border border-border/30 bg-background/30 p-3 backdrop-blur-sm transition-all duration-300 hover:border-border/60 hover:bg-background/50">
        {/* Severity Icon */}
        <div className={cn('flex-shrink-0 rounded-lg p-2', severity.bg, severity.color)}>
          {severity.icon}
        </div>

        {/* Main Info */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="font-semibold text-foreground">{anomaly.symbol}</span>
            <span className={cn('rounded-full px-1.5 py-0.5 text-xs', severity.bg, severity.color)}>
              {severity.label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Deviation: {anomaly.deviationPercent.toFixed(3)}%
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTimeAgo(anomaly.timestamp, 'en')}
            </span>
          </div>
        </div>

        {/* Price Range */}
        <div className="hidden flex-col items-end text-xs sm:flex">
          <span className="text-muted-foreground">Range</span>
          <span className="font-medium tabular-nums">
            ${formatNumber(minPrice, 2)} - ${formatNumber(maxPrice, 2)}
          </span>
        </div>

        {/* Outlier Protocols */}
        <div className="hidden items-center gap-1 md:flex">
          {anomaly.outlierProtocols.slice(0, 2).map((protocol) => (
            <span
              key={protocol}
              className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              {protocol}
            </span>
          ))}
          {anomaly.outlierProtocols.length > 2 && (
            <span className="text-[10px] text-muted-foreground">
              +{anomaly.outlierProtocols.length - 2}
            </span>
          )}
        </div>

        {/* Arrow */}
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </motion.a>
  );
}
