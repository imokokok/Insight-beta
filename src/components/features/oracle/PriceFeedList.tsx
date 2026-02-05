'use client';

import { useEffect, useState, useMemo } from 'react';
import { cn, fetchApiData } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus, AlertCircle, Clock } from 'lucide-react';
import type { PriceFeed, PriceUpdate } from '@/lib/types/oracle/price';
import type { OracleProtocol } from '@/lib/types/oracle/protocol';
import { PROTOCOL_DISPLAY_NAMES } from '@/lib/types/oracle/protocol';

interface PriceFeedListProps {
  protocols?: OracleProtocol[];
  symbols?: string[];
  limit?: number;
  showStale?: boolean;
  className?: string;
}

interface FeedWithUpdate extends PriceFeed {
  priceChangePercent?: number;
  previousPrice?: number;
}

export function PriceFeedList({
  protocols,
  symbols,
  limit = 20,
  showStale = false,
  className,
}: PriceFeedListProps) {
  const [feeds, setFeeds] = useState<FeedWithUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [, setError] = useState<string | null>(null);

  // 初始数据获取
  useEffect(() => {
    const fetchFeeds = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (protocols?.length) params.set('protocols', protocols.join(','));
        if (symbols?.length) params.set('symbols', symbols.join(','));
        params.set('limit', limit.toString());
        if (showStale) params.set('showStale', 'true');

        const data = await fetchApiData<PriceFeed[]>(`/api/oracle/feeds?${params.toString()}`);
        setFeeds(data);
        setError(null);
      } catch {
        // 使用模拟数据作为 fallback
        setFeeds(generateMockFeeds());
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    fetchFeeds();
  }, [protocols, symbols, limit, showStale]);

  // WebSocket 实时更新
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setWsConnected(true);
      ws.send(
        JSON.stringify({
          type: 'subscribe_feeds',
          protocols,
          symbols,
        }),
      );
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'price_update') {
          const update: PriceUpdate = message.data;
          setFeeds((prev) =>
            prev.map((feed) =>
              feed.id === update.feedId
                ? {
                    ...feed,
                    price: update.currentPrice,
                    previousPrice: update.previousPrice,
                    priceChangePercent: update.priceChangePercent,
                    timestamp: update.timestamp,
                  }
                : feed,
            ),
          );
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    return () => {
      ws.close();
    };
  }, [protocols, symbols]);

  // 按协议分组
  const groupedFeeds = useMemo(() => {
    const groups: Record<string, FeedWithUpdate[]> = {};
    feeds.forEach((feed) => {
      const protocol = feed.protocol;
      if (!groups[protocol]) {
        groups[protocol] = [];
      }
      groups[protocol].push(feed);
    });
    return groups;
  }, [feeds]);

  if (loading) {
    return <PriceFeedListSkeleton className={className} />;
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between px-3 pb-2 sm:px-6">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold sm:text-lg">Live Price Feeds</CardTitle>
          <Badge variant={wsConnected ? 'default' : 'secondary'} className="text-xs">
            {wsConnected ? 'Live' : 'Static'}
          </Badge>
        </div>
        <span className="text-muted-foreground text-xs">{feeds.length} feeds</span>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] sm:h-[400px]">
          <div className="divide-y">
            {Object.entries(groupedFeeds).map(([protocol, protocolFeeds]) => (
              <div key={protocol} className="p-2 sm:p-4">
                <h4 className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide sm:mb-3">
                  {PROTOCOL_DISPLAY_NAMES[protocol as OracleProtocol]}
                </h4>
                <div className="space-y-1 sm:space-y-2">
                  {protocolFeeds.map((feed) => (
                    <PriceFeedItem key={feed.id} feed={feed} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function PriceFeedItem({ feed }: { feed: FeedWithUpdate }) {
  const priceChange = feed.priceChangePercent ?? 0;
  const isPositive = priceChange > 0;
  const isNegative = priceChange < 0;

  const formatPrice = (price: number, decimals: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(price);
  };

  const formatTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg p-2 transition-colors sm:p-3',
        'hover:bg-muted/50',
        feed.isStale && 'bg-yellow-50/50',
      )}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="bg-primary/10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold sm:h-8 sm:w-8">
          {feed.symbol.split('/')[0]?.slice(0, 2)}
        </div>
        <div>
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-sm font-medium sm:text-base">{feed.symbol}</span>
            {feed.isStale && <AlertCircle className="h-3 w-3 text-yellow-500 sm:h-3.5 sm:w-3.5" />}
          </div>
          <div className="text-muted-foreground flex items-center gap-1 text-xs sm:gap-2">
            <Clock className="h-3 w-3" />
            {formatTimeAgo(feed.timestamp)}
          </div>
        </div>
      </div>

      <div className="text-right">
        <div className="font-mono text-sm font-medium sm:text-base">
          {formatPrice(feed.price, feed.decimals)}
        </div>
        <div
          className={cn(
            'flex items-center justify-end gap-1 text-xs',
            isPositive && 'text-green-600',
            isNegative && 'text-red-600',
            !isPositive && !isNegative && 'text-muted-foreground',
          )}
        >
          {isPositive && <TrendingUp className="h-3 w-3" />}
          {isNegative && <TrendingDown className="h-3 w-3" />}
          {!isPositive && !isNegative && <Minus className="h-3 w-3" />}
          {Math.abs(priceChange).toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

function PriceFeedListSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[400px] space-y-4 p-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <div className="space-y-2">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="flex items-center justify-between rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <div className="space-y-1 text-right">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// 模拟数据生成器
function generateMockFeeds(): FeedWithUpdate[] {
  const protocols: OracleProtocol[] = ['chainlink', 'pyth', 'band', 'api3', 'redstone'];
  const symbols = ['ETH/USD', 'BTC/USD', 'LINK/USD', 'MATIC/USD', 'AVAX/USD', 'SOL/USD'];

  const feeds: FeedWithUpdate[] = [];

  protocols.forEach((protocol) => {
    symbols.forEach((symbol) => {
      const basePrice = symbol.includes('BTC') ? 45000 : symbol.includes('ETH') ? 3000 : 20;
      const variation = (Math.random() - 0.5) * 0.02;
      const price = basePrice * (1 + variation);
      const previousPrice = price * (1 + (Math.random() - 0.5) * 0.01);
      const priceChangePercent = ((price - previousPrice) / previousPrice) * 100;

      feeds.push({
        id: `${protocol}-${symbol}`,
        instanceId: 'default',
        protocol,
        chain: 'ethereum',
        symbol,
        baseAsset: symbol.split('/')[0] || '',
        quoteAsset: symbol.split('/')[1] || '',
        price,
        priceRaw: Math.floor(price * 1e8).toString(),
        decimals: symbol.includes('BTC') ? 2 : symbol.includes('ETH') ? 2 : 4,
        timestamp: new Date(Date.now() - Math.random() * 300000).toISOString(),
        isStale: Math.random() < 0.1,
        stalenessSeconds: Math.random() < 0.1 ? Math.floor(Math.random() * 600) : undefined,
        previousPrice,
        priceChangePercent,
        confidence: 0.95 + Math.random() * 0.05,
      });
    });
  });

  return feeds;
}
