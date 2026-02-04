'use client';

import { memo, useState } from 'react';

import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Settings,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { OracleProtocol, OracleStats } from '@/lib/types';
import { PROTOCOL_DISPLAY_NAMES, PROTOCOL_INFO } from '@/lib/types';
import { getProtocolCapabilities } from '@/lib/blockchain/protocolFactory';

interface ProtocolCardProps {
  protocol: OracleProtocol;
  stats?: OracleStats;
  isLoading?: boolean;
  isActive?: boolean;
  onClick?: () => void;
  showActions?: boolean;
  className?: string;
}

const PROTOCOL_ICONS: Record<OracleProtocol, string> = {
  uma: '⚖️',
  chainlink: '🔗',
  pyth: '🐍',
  band: '🎸',
  api3: '📡',
  redstone: '💎',
  switchboard: '🎛️',
  flux: '⚡',
  dia: '📊',
};

const PROTOCOL_COLORS: Record<OracleProtocol, string> = {
  uma: 'from-red-500 to-orange-500',
  chainlink: 'from-blue-600 to-blue-400',
  pyth: 'from-purple-500 to-pink-500',
  band: 'from-indigo-500 to-purple-500',
  api3: 'from-green-500 to-teal-500',
  redstone: 'from-red-600 to-red-400',
  switchboard: 'from-yellow-500 to-orange-500',
  flux: 'from-cyan-500 to-blue-500',
  dia: 'from-emerald-500 to-green-500',
};

function ProtocolCardComponent({
  protocol,
  stats,
  isLoading = false,
  isActive = false,
  onClick,
  showActions = true,
  className,
}: ProtocolCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const info = PROTOCOL_INFO[protocol];
  const capabilities = getProtocolCapabilities(protocol);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      window.location.href = `/oracle/protocols/${protocol}`;
    }
  };

  const handleConfigure = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `/oracle/protocols/${protocol}/config`;
  };

  if (isLoading) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const priceChange = stats?.priceChange24h ?? 0;
  const TrendIcon = priceChange > 0 ? TrendingUp : priceChange < 0 ? TrendingDown : Minus;
  const trendColor =
    priceChange > 0 ? 'text-green-500' : priceChange < 0 ? 'text-red-500' : 'text-muted-foreground';

  return (
    <Card
      className={cn(
        'group cursor-pointer overflow-hidden transition-all duration-200',
        'hover:border-primary/50 hover:shadow-lg',
        isActive && 'ring-primary border-primary ring-2',
        className,
      )}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with gradient background */}
      <div className={cn('h-2 bg-gradient-to-r', PROTOCOL_COLORS[protocol])} />

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-lg text-2xl',
                'bg-gradient-to-br',
                PROTOCOL_COLORS[protocol],
                'shadow-md',
              )}
            >
              {PROTOCOL_ICONS[protocol]}
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                {PROTOCOL_DISPLAY_NAMES[protocol]}
                {isActive && (
                  <Badge variant="default" className="text-xs">
                    Active
                  </Badge>
                )}
              </CardTitle>
              <p className="text-muted-foreground line-clamp-1 text-sm">{info.description}</p>
            </div>
          </div>

          {showActions && (
            <div
              className={cn(
                'flex items-center gap-1 transition-opacity',
                isHovered ? 'opacity-100' : 'opacity-0',
              )}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleConfigure}
                title="Configure"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="View Details">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Feature badges */}
        <div className="mt-2 flex flex-wrap gap-1">
          {capabilities.priceFeeds && (
            <Badge variant="secondary" className="text-xs">
              Price Feeds
            </Badge>
          )}
          {capabilities.assertions && (
            <Badge variant="secondary" className="text-xs">
              Assertions
            </Badge>
          )}
          {capabilities.disputes && (
            <Badge variant="secondary" className="text-xs">
              Disputes
            </Badge>
          )}
          {capabilities.vrf && (
            <Badge variant="secondary" className="text-xs">
              VRF
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Stats grid */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          {/* Price */}
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Current Price</p>
            <div className="flex items-center gap-1">
              <span className="text-lg font-semibold">
                {stats?.currentPrice ? `$${stats.currentPrice.toLocaleString()}` : '—'}
              </span>
              {stats?.currentPrice && <TrendIcon className={cn('h-4 w-4', trendColor)} />}
            </div>
            {stats?.priceChange24h !== undefined && (
              <p className={cn('text-xs', trendColor)}>
                {priceChange > 0 ? '+' : ''}
                {priceChange.toFixed(2)}% (24h)
              </p>
            )}
          </div>

          {/* Updates */}
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Updates (24h)</p>
            <div className="flex items-center gap-2">
              <Activity className="text-muted-foreground h-4 w-4" />
              <span className="text-lg font-semibold">
                {stats?.updates24h?.toLocaleString() ?? '—'}
              </span>
            </div>
            {stats?.lastUpdateAt && (
              <p className="text-muted-foreground flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3" />
                {formatTimeAgo(stats.lastUpdateAt)}
              </p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Status</p>
            <div className="flex items-center gap-2">
              {stats?.uptime !== undefined ? (
                <>
                  {stats.uptime >= 99 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : stats.uptime >= 95 ? (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-lg font-semibold">{stats.uptime.toFixed(1)}%</span>
                </>
              ) : (
                <span className="text-lg font-semibold">—</span>
              )}
            </div>
            <p className="text-muted-foreground text-xs">Uptime</p>
          </div>
        </div>

        {/* Supported chains */}
        <div className="mt-4 border-t pt-4">
          <p className="text-muted-foreground mb-2 text-xs">Supported Chains</p>
          <div className="flex flex-wrap gap-1">
            {info.supportedChains.slice(0, 6).map((chain) => (
              <Badge key={chain} variant="outline" className="text-xs capitalize">
                {chain}
              </Badge>
            ))}
            {info.supportedChains.length > 6 && (
              <Badge variant="outline" className="text-xs">
                +{info.supportedChains.length - 6}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const ProtocolCard = memo(ProtocolCardComponent);

// Compact version for lists
interface ProtocolCardCompactProps {
  protocol: OracleProtocol;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

function ProtocolCardCompactComponent({
  protocol,
  isActive = false,
  onClick,
  className,
}: ProtocolCardCompactProps) {
  const info = PROTOCOL_INFO[protocol];

  return (
    <div
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors',
        'hover:bg-accent',
        isActive && 'bg-accent ring-primary ring-1',
        className,
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl',
          'bg-gradient-to-br',
          PROTOCOL_COLORS[protocol],
        )}
      >
        {PROTOCOL_ICONS[protocol]}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{PROTOCOL_DISPLAY_NAMES[protocol]}</p>
        <p className="text-muted-foreground truncate text-xs">{info.description}</p>
      </div>
      {isActive && <div className="bg-primary h-2 w-2 rounded-full" />}
    </div>
  );
}

export const ProtocolCardCompact = memo(ProtocolCardCompactComponent);

// Helper function
function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
