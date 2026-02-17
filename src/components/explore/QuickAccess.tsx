'use client';

import { Star, Clock, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useI18n } from '@/i18n';

interface QuickAccessProps {
  maxItems?: number;
}

export function QuickAccess({ maxItems = 5 }: QuickAccessProps) {
  const { t } = useI18n();
  const isMobile = useIsMobile();

  const favoriteFeeds: { id: string; name: string; type: string }[] = [];
  const recentVisits: { id: string; name: string; type: string; timestamp: string }[] = [];

  const displayFavorites = favoriteFeeds.slice(0, maxItems);
  const displayRecentVisits = recentVisits.slice(0, maxItems);

  return (
    <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2 md:pb-3">
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <Star className="h-4 w-4 text-yellow-500" />
            {t('explore.quickAccess.favorites')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {displayFavorites.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('explore.quickAccess.noFavorites')}</p>
          ) : (
            <div className="space-y-1 md:space-y-2">
              {displayFavorites.map((feed) => (
                <Button
                  key={feed.id}
                  variant="ghost"
                  className="w-full justify-between min-h-[44px]"
                  size={isMobile ? 'default' : 'sm'}
                >
                  <span className="truncate">{feed.name}</span>
                  <ChevronRight className="h-4 w-4 flex-shrink-0" />
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 md:pb-3">
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <Clock className="h-4 w-4 text-blue-500" />
            {t('explore.quickAccess.recent')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {displayRecentVisits.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('explore.quickAccess.noRecent')}</p>
          ) : (
            <div className="space-y-1 md:space-y-2">
              {displayRecentVisits.map((visit) => (
                <Button
                  key={visit.id}
                  variant="ghost"
                  className="w-full justify-between min-h-[44px]"
                  size={isMobile ? 'default' : 'sm'}
                >
                  <span className="truncate">{visit.name}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{visit.timestamp}</span>
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
