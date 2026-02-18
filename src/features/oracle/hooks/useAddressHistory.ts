'use client';

import { useCallback, useEffect, useState } from 'react';

import { logger } from '@/shared/logger';

export interface AddressHistoryItem {
  address: string;
  timestamp: number;
  type?: 'contract' | 'eoa' | 'unknown';
  label?: string;
}

const STORAGE_KEY = 'address_history';
const MAX_HISTORY_SIZE = 10;

function loadHistory(): AddressHistoryItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed.slice(0, MAX_HISTORY_SIZE);
  } catch {
    return [];
  }
}

function saveHistory(history: AddressHistoryItem[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    logger.error('Failed to save address history', { error });
  }
}

export function useAddressHistory() {
  const [history, setHistory] = useState<AddressHistoryItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loaded = loadHistory();
    setHistory(loaded);
    setIsLoaded(true);
  }, []);

  const addToHistory = useCallback(
    (address: string, type?: 'contract' | 'eoa' | 'unknown', label?: string) => {
      if (!address) return;

      const normalizedAddress = address.toLowerCase();

      setHistory((prev) => {
        const filtered = prev.filter((item) => item.address.toLowerCase() !== normalizedAddress);

        const newItem: AddressHistoryItem = {
          address,
          timestamp: Date.now(),
          type,
          label,
        };

        const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_SIZE);
        saveHistory(updated);
        return updated;
      });
    },
    [],
  );

  const removeFromHistory = useCallback((address: string) => {
    const normalizedAddress = address.toLowerCase();

    setHistory((prev) => {
      const updated = prev.filter((item) => item.address.toLowerCase() !== normalizedAddress);
      saveHistory(updated);
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    saveHistory([]);
  }, []);

  const updateAddressType = useCallback((address: string, type: 'contract' | 'eoa' | 'unknown') => {
    const normalizedAddress = address.toLowerCase();

    setHistory((prev) => {
      const updated = prev.map((item) =>
        item.address.toLowerCase() === normalizedAddress ? { ...item, type } : item,
      );
      saveHistory(updated);
      return updated;
    });
  }, []);

  return {
    history,
    isLoaded,
    addToHistory,
    removeFromHistory,
    clearHistory,
    updateAddressType,
  };
}
