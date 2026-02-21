'use client';

import React, { useMemo } from 'react';

import Link from 'next/link';

import { motion, AnimatePresence } from 'framer-motion';
import { Star, Trash2, CircleDot, FileCode, Wallet } from 'lucide-react';

import { Button } from '@/components/ui';
import { ScrollArea } from '@/components/ui';
import { useI18n } from '@/i18n';
import { useFavoritesContext, type FavoriteItem } from '@/shared/contexts/FavoritesContext';
import { cn } from '@/shared/utils';

interface FavoritesPanelProps {
  className?: string;
  onItemClick?: (item: FavoriteItem) => void;
}

const typeConfig = {
  symbol: {
    icon: CircleDot,
    label: 'favorites.types.symbol',
    getHref: (id: string) => `/oracle/${id}`,
  },
  protocol: {
    icon: FileCode,
    label: 'favorites.types.protocol',
    getHref: (id: string) => `/oracle/protocols/${id}`,
  },
  address: {
    icon: Wallet,
    label: 'favorites.types.address',
    getHref: (id: string) => `/oracle/address/${id}`,
  },
};

function groupByType(favorites: FavoriteItem[]): Record<string, FavoriteItem[]> {
  return favorites.reduce(
    (acc, item) => {
      const type = item.type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(item);
      return acc;
    },
    {} as Record<string, FavoriteItem[]>,
  );
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return 'now';
}

export function FavoritesPanel({ className, onItemClick }: FavoritesPanelProps) {
  const { favorites, removeFavorite } = useFavoritesContext();
  const { t } = useI18n();

  const groupedFavorites = useMemo(() => groupByType(favorites), [favorites]);

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    removeFavorite(id);
  };

  if (favorites.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <div className="mb-4 rounded-full bg-muted p-4">
          <Star className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-center text-sm text-muted-foreground">{t('favorites.noFavorites')}</p>
        <p className="mt-1 text-center text-xs text-muted-foreground/60">
          {t('favorites.noFavoritesHint')}
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn('h-full', className)}>
      <div className="space-y-4 p-2">
        <AnimatePresence mode="popLayout">
          {Object.entries(groupedFavorites).map(([type, items]) => {
            const config = typeConfig[type as keyof typeof typeConfig];
            if (!config) return null;

            const Icon = config.icon;

            return (
              <motion.div
                key={type}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-2 px-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t(config.label)} ({items.length})
                  </span>
                </div>

                <div className="space-y-1">
                  {items.map((item) => {
                    const href = { pathname: config.getHref(item.id) };
                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="group"
                      >
                        <Link
                          href={href}
                          onClick={() => onItemClick?.(item)}
                          className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-muted"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {item.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatRelativeTime(item.addedAt)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={(e) => handleRemove(e, item.id)}
                          >
                            <Trash2 className="hover:text-destructive h-4 w-4 text-muted-foreground" />
                          </Button>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ScrollArea>
  );
}
