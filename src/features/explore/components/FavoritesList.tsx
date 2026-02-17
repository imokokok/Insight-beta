'use client';

import { useRouter } from 'next/navigation';


import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ExternalLink, Trash2, Database, Wallet } from 'lucide-react';

import { CardEnhanced } from '@/components/ui/card';
import { cn } from '@/shared/utils';

import { useFavorites } from '../hooks/useFavorites';

import type { FavoriteItem } from '../types';
import type { Route } from 'next';

interface FavoritesListProps {
  className?: string;
}

const typeConfig = {
  feed: {
    icon: Database,
    label: 'Feed',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  address: {
    icon: Wallet,
    label: '地址',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
};

export function FavoritesList({ className }: FavoritesListProps) {
  const router = useRouter();
  const { favorites, removeFavorite } = useFavorites();

  const handleItemClick = (item: FavoriteItem) => {
    if (item.type === 'feed' && item.symbol) {
      router.push(`/explore/feed/${item.id}` as Route);
    } else if (item.type === 'address' && item.address) {
      router.push(`/explore/address/${item.address}` as Route);
    }
  };

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeFavorite(id);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (favorites.length === 0) {
    return (
      <CardEnhanced className={cn('p-6', className)}>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Heart className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">暂无收藏</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            点击数据卡片上的心形图标添加收藏
          </p>
        </div>
      </CardEnhanced>
    );
  }

  return (
    <CardEnhanced className={cn('p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Heart className="h-5 w-5 text-rose-500" />
          我的收藏
        </h3>
        <span className="text-sm text-muted-foreground">
          {favorites.length} 项
        </span>
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {favorites.map((item) => {
            const config = typeConfig[item.type];
            const Icon = config.icon;

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="group flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary cursor-pointer transition-colors"
                onClick={() => handleItemClick(item)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg', config.bgColor)}>
                    <Icon className={cn('h-4 w-4', config.color)} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {item.symbol || item.address?.slice(0, 8) + '...'}
                      </span>
                      <span className={cn(
                        'text-xs px-1.5 py-0.5 rounded',
                        config.bgColor,
                        config.color
                      )}>
                        {config.label}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      添加于 {formatDate(item.addedAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => handleRemove(e, item.id)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </motion.button>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </CardEnhanced>
  );
}
