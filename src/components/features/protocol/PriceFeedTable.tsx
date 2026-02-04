'use client';

import { useState } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PriceFeed, OracleProtocol } from '@/lib/types';
import { PROTOCOL_DISPLAY_NAMES } from '@/lib/types';

interface PriceFeedTableProps {
  feeds: PriceFeed[];
  isLoading?: boolean;
  showProtocol?: boolean;
  showChain?: boolean;
  onRefresh?: () => void;
  className?: string;
  title?: string;
}

type SortField = 'symbol' | 'price' | 'timestamp' | 'protocol' | 'chain';
type SortDirection = 'asc' | 'desc';

export function PriceFeedTable({
  feeds,
  isLoading = false,
  showProtocol = true,
  showChain = true,
  onRefresh,
  className,
  title = 'Price Feeds',
}: PriceFeedTableProps) {
  const [sortField, setSortField] = useState<SortField>('symbol');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedFeeds = [...feeds].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'symbol':
        comparison = a.symbol.localeCompare(b.symbol);
        break;
      case 'price':
        comparison = a.price - b.price;
        break;
      case 'timestamp':
        comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        break;
      case 'protocol':
        comparison = a.protocol.localeCompare(b.protocol);
        break;
      case 'chain':
        comparison = a.chain.localeCompare(b.chain);
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="text-muted-foreground h-4 w-4" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    );
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-9 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">{title}</CardTitle>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('symbol')}
                    className="-ml-3 h-8"
                  >
                    Symbol
                    <SortIcon field="symbol" />
                  </Button>
                </TableHead>
                {showProtocol && (
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('protocol')}
                      className="-ml-3 h-8"
                    >
                      Protocol
                      <SortIcon field="protocol" />
                    </Button>
                  </TableHead>
                )}
                {showChain && (
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('chain')}
                      className="-ml-3 h-8"
                    >
                      Chain
                      <SortIcon field="chain" />
                    </Button>
                  </TableHead>
                )}
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('price')}
                    className="-mr-3 ml-auto h-8"
                  >
                    Price
                    <SortIcon field="price" />
                  </Button>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('timestamp')}
                    className="-ml-3 h-8"
                  >
                    Last Update
                    <SortIcon field="timestamp" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedFeeds.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3 + (showProtocol ? 1 : 0) + (showChain ? 1 : 0)}
                    className="text-muted-foreground py-8 text-center"
                  >
                    No price feeds available
                  </TableCell>
                </TableRow>
              ) : (
                sortedFeeds.map((feed) => (
                  <PriceFeedRow
                    key={feed.id}
                    feed={feed}
                    showProtocol={showProtocol}
                    showChain={showChain}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

interface PriceFeedRowProps {
  feed: PriceFeed;
  showProtocol: boolean;
  showChain: boolean;
}

function PriceFeedRow({ feed, showProtocol, showChain }: PriceFeedRowProps) {
  const stalenessMinutes = feed.stalenessSeconds ? Math.floor(feed.stalenessSeconds / 60) : 0;

  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <span className="text-sm">{feed.symbol}</span>
          {feed.confidence && (
            <Badge variant="outline" className="text-xs">
              {(feed.confidence * 100).toFixed(0)}%
            </Badge>
          )}
        </div>
      </TableCell>

      {showProtocol && (
        <TableCell>
          <ProtocolBadge protocol={feed.protocol} />
        </TableCell>
      )}

      {showChain && (
        <TableCell>
          <Badge variant="outline" className="text-xs capitalize">
            {feed.chain}
          </Badge>
        </TableCell>
      )}

      <TableCell className="text-right">
        <div className="flex flex-col items-end">
          <span className="font-mono font-medium">{formatPrice(feed.price, feed.decimals)}</span>
          <span className="text-muted-foreground text-xs">
            Raw: {truncatePriceRaw(feed.priceRaw)}
          </span>
        </div>
      </TableCell>

      <TableCell>
        <StatusBadge isStale={feed.isStale} stalenessMinutes={stalenessMinutes} />
      </TableCell>

      <TableCell>
        <div className="text-muted-foreground flex items-center gap-1 text-sm">
          <Clock className="h-3 w-3" />
          {formatTimeAgo(feed.timestamp)}
        </div>
      </TableCell>
    </TableRow>
  );
}

function ProtocolBadge({ protocol }: { protocol: OracleProtocol }) {
  const colors: Record<OracleProtocol, string> = {
    uma: 'bg-red-500/10 text-red-500 border-red-500/20',
    chainlink: 'bg-blue-600/10 text-blue-600 border-blue-600/20',
    pyth: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    band: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    api3: 'bg-green-500/10 text-green-500 border-green-500/20',
    redstone: 'bg-red-600/10 text-red-600 border-red-600/20',
    switchboard: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    flux: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    dia: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  };

  return (
    <Badge variant="outline" className={cn('text-xs', colors[protocol])}>
      {PROTOCOL_DISPLAY_NAMES[protocol]}
    </Badge>
  );
}

function StatusBadge({
  isStale,
  stalenessMinutes,
}: {
  isStale: boolean;
  stalenessMinutes: number;
}) {
  if (!isStale) {
    return (
      <div className="flex items-center gap-1 text-green-500">
        <CheckCircle2 className="h-4 w-4" />
        <span className="text-xs">Live</span>
      </div>
    );
  }

  if (stalenessMinutes < 60) {
    return (
      <div className="flex items-center gap-1 text-yellow-500">
        <AlertCircle className="h-4 w-4" />
        <span className="text-xs">{stalenessMinutes}m ago</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-red-500">
      <AlertCircle className="h-4 w-4" />
      <span className="text-xs">Stale</span>
    </div>
  );
}

function formatPrice(price: number, _decimals: number): string {
  if (price >= 1000) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (price >= 1) {
    return `$${price.toFixed(4)}`;
  }
  return `$${price.toFixed(6)}`;
}

function truncatePriceRaw(priceRaw: string): string {
  if (priceRaw.length <= 12) return priceRaw;
  return `${priceRaw.slice(0, 6)}...${priceRaw.slice(-4)}`;
}

function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
