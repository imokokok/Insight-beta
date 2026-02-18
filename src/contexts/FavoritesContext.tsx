'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';

import { logger } from '@/shared/logger';

const STORAGE_KEY = 'foresight_favorites';

export interface FavoriteItem {
  id: string;
  type: 'symbol' | 'protocol' | 'address';
  name: string;
  addedAt: number;
}

interface FavoritesContextType {
  favorites: FavoriteItem[];
  addFavorite: (item: Omit<FavoriteItem, 'addedAt'>) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  clearFavorites: () => void;
}

const FavoritesContext = createContext<FavoritesContextType | null>(null);

export function useFavoritesContext() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavoritesContext must be used within FavoritesProvider');
  }
  return context;
}

interface FavoritesProviderProps {
  children: ReactNode;
}

export function FavoritesProvider({ children }: FavoritesProviderProps) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (error) {
      logger.error('Failed to load favorites from localStorage', { error });
    }
    setIsInitialized(true);
  }, []);

  const saveFavorites = useCallback((items: FavoriteItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      setFavorites(items);
    } catch (error) {
      logger.error('Failed to save favorites to localStorage', { error });
    }
  }, []);

  const addFavorite = useCallback(
    (item: Omit<FavoriteItem, 'addedAt'>) => {
      setFavorites((prev) => {
        if (prev.some((f) => f.id === item.id)) {
          return prev;
        }
        const newItem: FavoriteItem = {
          ...item,
          addedAt: Date.now(),
        };
        const updated = [...prev, newItem];
        saveFavorites(updated);
        return updated;
      });
    },
    [saveFavorites],
  );

  const removeFavorite = useCallback(
    (id: string) => {
      setFavorites((prev) => {
        const updated = prev.filter((f) => f.id !== id);
        saveFavorites(updated);
        return updated;
      });
    },
    [saveFavorites],
  );

  const isFavorite = useCallback(
    (id: string) => {
      return favorites.some((f) => f.id === id);
    },
    [favorites],
  );

  const clearFavorites = useCallback(() => {
    saveFavorites([]);
  }, [saveFavorites]);

  if (!isInitialized) {
    return null;
  }

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        addFavorite,
        removeFavorite,
        isFavorite,
        clearFavorites,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}
