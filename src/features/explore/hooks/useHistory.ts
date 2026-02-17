'use client';

import { useState, useCallback, useEffect } from 'react';

import type { HistoryItem } from '../types';

const STORAGE_KEY = 'explore_history';
const MAX_HISTORY_ITEMS = 50;

interface UseHistoryReturn {
  history: HistoryItem[];
  addHistory: (item: Omit<HistoryItem, 'visitedAt'>) => void;
  clearHistory: () => void;
  removeHistoryItem: (id: string) => void;
}

export function useHistory(): UseHistoryReturn {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  }, []);

  const saveHistory = useCallback((items: HistoryItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      setHistory(items);
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  }, []);

  const addHistory = useCallback((item: Omit<HistoryItem, 'visitedAt'>) => {
    setHistory((prev) => {
      const filtered = prev.filter((h) => h.id !== item.id);
      const newItem: HistoryItem = {
        ...item,
        visitedAt: new Date().toISOString(),
      };
      const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      saveHistory(updated);
      return updated;
    });
  }, [saveHistory]);

  const clearHistory = useCallback(() => {
    saveHistory([]);
  }, [saveHistory]);

  const removeHistoryItem = useCallback((id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((h) => h.id !== id);
      saveHistory(updated);
      return updated;
    });
  }, [saveHistory]);

  return {
    history,
    addHistory,
    clearHistory,
    removeHistoryItem,
  };
}
