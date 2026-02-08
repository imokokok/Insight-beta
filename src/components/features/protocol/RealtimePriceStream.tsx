'use client';

import { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown, Activity, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

export interface PriceUpdate {
  id: string;
  symbol: string;
  protocol: string;
  price: number;
  previousPrice: number;
  timestamp: Date;
  changePercent: number;
}

interface RealtimePriceStreamProps {
  updates: PriceUpdate[];
  loading?: boolean;
  className?: string;
  maxItems?: number;
}

export function RealtimePriceStream({ 
  updates, 
  loading, 
  className,
  maxItems = 50 
}: RealtimePriceStreamProps) {
  const { t } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);

  // Auto-scroll to bottom when new updates arrive
  useEffect(() => {
    if (isAutoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [updates, isAutoScroll]);

  const displayUpdates = updates.slice(-maxItems);

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-emerald-600';
    if (change < 0) return 'text-rose-600';
    return 'text-muted-foreground';
  };

  const getChangeBg = (change: number) => {
    if (change > 0) return 'bg-emerald-50 border-emerald-200';
    if (change < 0) return 'bg-rose-50 border-rose-200';
    return 'bg-muted';
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            {t('protocol:priceStream.title')}
            <Badge variant="outline" className="ml-2">
              <Zap className="mr-1 h-3 w-3" />
              LIVE
            </Badge>
          </CardTitle>
          <div className="text-muted-foreground text-sm">
            {displayUpdates.length} {t('protocol:priceStream.updates')}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea 
          ref={scrollRef}
          className="h-[400px]"
          onScroll={() => setIsAutoScroll(false)}
        >
          <div className="space-y-1 p-4">
            {displayUpdates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Activity className="text-muted-foreground mb-4 h-12 w-12" />
                <p className="text-muted-foreground">{t('protocol:priceStream.noUpdates')}</p>
              </div>
            ) : (
              displayUpdates.map((update, index) => {
                const isNew = index === displayUpdates.length - 1;
                const TrendIcon = update.changePercent > 0 ? TrendingUp : TrendingDown;

                return (
                  <div
                    key={update.id}
                    className={cn(
                      'flex items-center justify-between rounded-lg border p-3 transition-all',
                      getChangeBg(update.changePercent),
                      isNew && 'animate-pulse ring-2 ring-primary/20'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {/* Symbol Badge */}
                      <div className="bg-background flex h-10 w-10 items-center justify-center rounded-lg font-bold text-sm">
                        {update.symbol.split('/')[0]}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{update.symbol}</span>
                          <Badge variant="secondary" className="text-xs">
                            {update.protocol}
                          </Badge>
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {update.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-lg font-semibold">
                        ${update.price.toLocaleString(undefined, { 
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 6 
                        })}
                      </div>
                      <div className={cn('flex items-center justify-end gap-1 text-sm', getChangeColor(update.changePercent))}>
                        <TrendIcon className="h-3 w-3" />
                        {update.changePercent > 0 ? '+' : ''}
                        {update.changePercent.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 border-t p-4">
          <div className="text-center">
            <div className="text-muted-foreground text-xs">{t('protocol:priceStream.avgChange')}</div>
            <div className={cn('font-semibold', getChangeColor(
              displayUpdates.reduce((sum, u) => sum + u.changePercent, 0) / displayUpdates.length
            ))}>
              {(displayUpdates.reduce((sum, u) => sum + u.changePercent, 0) / displayUpdates.length).toFixed(2)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground text-xs">{t('protocol:priceStream.up')}</div>
            <div className="font-semibold text-emerald-600">
              {displayUpdates.filter(u => u.changePercent > 0).length}
            </div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground text-xs">{t('protocol:priceStream.down')}</div>
            <div className="font-semibold text-rose-600">
              {displayUpdates.filter(u => u.changePercent < 0).length}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
