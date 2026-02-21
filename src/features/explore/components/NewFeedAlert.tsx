'use client';

import { Sparkles, Clock, ChevronRight, Activity, Layers } from 'lucide-react';

import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn, formatTime } from '@/shared/utils';

import type { NewFeedItem } from '../hooks/useDataDiscovery';

interface NewFeedAlertProps {
  feeds: NewFeedItem[];
  isLoading?: boolean;
  onItemClick?: (item: NewFeedItem) => void;
}

const protocolColors: Record<string, string> = {
  chainlink: 'text-blue-500 bg-blue-500/10',
  pyth: 'text-purple-500 bg-purple-500/10',
  redstone: 'text-orange-500 bg-orange-500/10',
  api3: 'text-green-500 bg-green-500/10',
};

export function NewFeedAlert({ feeds, isLoading, onItemClick }: NewFeedAlertProps) {
  const { lang } = useI18n();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            {lang === 'zh' ? '新Feed提醒' : 'New Feed Alerts'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!feeds || feeds.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            {lang === 'zh' ? '新Feed提醒' : 'New Feed Alerts'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Activity className="h-10 w-10 opacity-50" />
            <p className="mt-2">{lang === 'zh' ? '暂无新Feed' : 'No new feeds'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          {lang === 'zh' ? '新Feed提醒' : 'New Feed Alerts'}
          <Badge variant="secondary" className="ml-auto">
            {feeds.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {feeds.map((feed) => {
          const protocolStyle =
            protocolColors[feed.protocol.toLowerCase()] || 'text-gray-500 bg-gray-500/10';

          return (
            <button
              type="button"
              key={feed.id}
              onClick={() => onItemClick?.(feed)}
              className={cn(
                'group w-full cursor-pointer rounded-lg border border-purple-500/20 bg-purple-500/5 p-4 text-left transition-all',
                'hover:border-purple-500/40 hover:shadow-md',
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    <Badge className="bg-purple-500/20 text-purple-600">
                      {lang === 'zh' ? '新上线' : 'NEW'}
                    </Badge>
                    <Badge variant="outline" className={cn('text-xs', protocolStyle)}>
                      {feed.protocol}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{feed.symbol}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">{feed.chain}</span>
                  </div>

                  <p className="line-clamp-1 text-sm text-muted-foreground">{feed.description}</p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(feed.timestamp)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Layers className="h-3 w-3" />
                      {feed.category}
                    </div>
                  </div>
                </div>

                <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
