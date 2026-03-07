'use client';

import { motion } from 'framer-motion';
import {
  Activity,
  RefreshCw,
  TrendingUp,
  Globe,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';

import { Button } from '@/components/ui';
import { formatNumber, formatTimeAgo } from '@/shared/utils';
import { cn } from '@/shared/utils';

interface HeroSectionProps {
  totalTVL: string;
  activeProtocols: number;
  updates24h: number;
  healthScore: number;
  lastUpdated: Date | null;
  isSyncing: boolean;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  autoRefreshEnabled: boolean;
  onRefresh: () => void;
  onToggleAutoRefresh: () => void;
}

export function HeroSection({
  totalTVL,
  activeProtocols,
  updates24h,
  healthScore,
  lastUpdated,
  isSyncing,
  syncStatus,
  autoRefreshEnabled,
  onRefresh,
  onToggleAutoRefresh,
}: HeroSectionProps) {
  const getStatusConfig = () => {
    switch (syncStatus) {
      case 'syncing':
        return {
          icon: <RefreshCw className="h-4 w-4 animate-spin" />,
          text: 'Syncing...',
          color: 'text-warning',
          bgColor: 'bg-warning/10',
          pulse: true,
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          text: 'Sync Failed',
          color: 'text-error',
          bgColor: 'bg-error/10',
          pulse: false,
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="h-4 w-4" />,
          text: 'Live',
          color: 'text-success',
          bgColor: 'bg-success/10',
          pulse: true,
        };
      default:
        return {
          icon: <Clock className="h-4 w-4" />,
          text: 'Waiting...',
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/10',
          pulse: false,
        };
    }
  };

  const status = getStatusConfig();

  const stats = [
    {
      label: 'Total TVL',
      value: totalTVL,
      icon: TrendingUp,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Active Protocols',
      value: activeProtocols.toString(),
      icon: Globe,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: '24h Updates',
      value: formatNumber(updates24h, 0),
      icon: Activity,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Health Score',
      value: `${healthScore}%`,
      icon: Zap,
      color:
        healthScore >= 90
          ? 'text-emerald-400'
          : healthScore >= 70
            ? 'text-yellow-400'
            : 'text-red-400',
      bgColor:
        healthScore >= 90
          ? 'bg-emerald-500/10'
          : healthScore >= 70
            ? 'bg-yellow-500/10'
            : 'bg-red-500/10',
    },
  ];

  return (
    <section className="relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      <div className="absolute right-0 top-0 h-[600px] w-[600px] -translate-y-1/2 translate-x-1/4 rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute bottom-0 left-0 h-[400px] w-[400px] -translate-x-1/4 translate-y-1/2 rounded-full bg-accent/10 blur-[100px]" />

      <div className="relative px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-10 text-center"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/50 px-4 py-2 backdrop-blur-sm">
              <span
                className={cn(
                  'relative flex h-2.5 w-2.5',
                  status.pulse && 'animate-realtime-pulse',
                )}
              >
                <span
                  className={cn(
                    'relative inline-flex h-2.5 w-2.5 rounded-full',
                    status.color.replace('text-', 'bg-'),
                  )}
                />
              </span>
              <span className={cn('text-sm font-medium', status.color)}>{status.text}</span>
              {lastUpdated && (
                <span className="border-l border-border/50 pl-2 text-xs text-muted-foreground">
                  Updated {formatTimeAgo(lastUpdated.toISOString(), 'en')}
                </span>
              )}
            </div>

            <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
                Oracle Network
              </span>
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Intelligence
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Real-time multi-protocol oracle data analytics. Monitor, compare, and analyze price
              feeds across Chainlink, Pyth, API3, Band, and UMA.
            </p>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                className="group relative"
              >
                <div className="relative overflow-hidden rounded-2xl border border-border/30 bg-background/50 p-5 backdrop-blur-sm transition-all duration-300 hover:border-border/60 hover:bg-background/70">
                  <div className="mb-3 flex items-start justify-between">
                    <div className={cn('rounded-xl p-2.5', stat.bgColor)}>
                      <stat.icon className={cn('h-5 w-5', stat.color)} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold tracking-tight sm:text-3xl">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                  {/* Hover glow effect */}
                  <div
                    className={cn(
                      'absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100',
                      stat.bgColor,
                    )}
                  />
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isSyncing}
              className="gap-2"
            >
              <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
              Refresh
            </Button>
            <Button
              variant={autoRefreshEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={onToggleAutoRefresh}
              className="gap-2"
            >
              <span
                className={cn(
                  'relative flex h-2 w-2',
                  autoRefreshEnabled && 'animate-realtime-pulse',
                )}
              >
                <span
                  className={cn(
                    'relative inline-flex h-2 w-2 rounded-full',
                    autoRefreshEnabled ? 'bg-primary-foreground' : 'bg-muted-foreground',
                  )}
                />
              </span>
              Auto Refresh
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
