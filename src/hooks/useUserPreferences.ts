'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'user-preferences';

export interface UserPreferences {
  autoRefreshEnabled: boolean;
  refreshInterval: number;
  timeRange: string;
  sidebarCollapsed: boolean;
  compareSelectedProtocols: string[];
  compareSelectedSymbols: string[];
}

const DEFAULT_PREFERENCES: UserPreferences = {
  autoRefreshEnabled: false,
  refreshInterval: 30000,
  timeRange: '24H',
  sidebarCollapsed: false,
  compareSelectedProtocols: ['chainlink', 'pyth', 'api3', 'band'],
  compareSelectedSymbols: ['ETH/USD', 'BTC/USD'],
};

function loadPreferences(): UserPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFERENCES;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_PREFERENCES, ...parsed };
    }
  } catch {
    // ignore
  }

  return DEFAULT_PREFERENCES;
}

function savePreferences(preferences: UserPreferences): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // ignore
  }
}

export function useUserPreferences() {
  const [preferences, setPreferencesState] = useState<UserPreferences>(loadPreferences);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
    const stored = loadPreferences();
    setPreferencesState(stored);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      savePreferences(preferences);
    }
  }, [preferences, isLoaded]);

  const setPreferences = useCallback((updates: Partial<UserPreferences>) => {
    setPreferencesState((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferencesState(DEFAULT_PREFERENCES);
  }, []);

  const setAutoRefreshEnabled = useCallback(
    (enabled: boolean) => setPreferences({ autoRefreshEnabled: enabled }),
    [setPreferences],
  );

  const setRefreshInterval = useCallback(
    (interval: number) => setPreferences({ refreshInterval: interval }),
    [setPreferences],
  );

  const setTimeRange = useCallback(
    (range: string) => setPreferences({ timeRange: range }),
    [setPreferences],
  );

  const setSidebarCollapsed = useCallback(
    (collapsed: boolean) => setPreferences({ sidebarCollapsed: collapsed }),
    [setPreferences],
  );

  const setCompareSelectedProtocols = useCallback(
    (protocols: string[]) => setPreferences({ compareSelectedProtocols: protocols }),
    [setPreferences],
  );

  const setCompareSelectedSymbols = useCallback(
    (symbols: string[]) => setPreferences({ compareSelectedSymbols: symbols }),
    [setPreferences],
  );

  return {
    preferences,
    isLoaded,
    setPreferences,
    resetPreferences,
    setAutoRefreshEnabled,
    setRefreshInterval,
    setTimeRange,
    setSidebarCollapsed,
    setCompareSelectedProtocols,
    setCompareSelectedSymbols,
  };
}
