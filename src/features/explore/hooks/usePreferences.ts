'use client';

import { useState, useCallback, useEffect } from 'react';

import type { UserPreferences, TrendingSortBy } from '../types';

const STORAGE_KEY = 'explore_preferences';

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultTab: 'trending',
  defaultSortBy: 'volume',
  theme: 'system',
};

interface UsePreferencesReturn {
  preferences: UserPreferences;
  setDefaultTab: (tab: string) => void;
  setDefaultSortBy: (sortBy: TrendingSortBy) => void;
  setPreferences: (prefs: Partial<UserPreferences>) => void;
  resetPreferences: () => void;
}

export function usePreferences(): UsePreferencesReturn {
  const [preferences, setPreferencesState] = useState<UserPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferencesState({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  }, []);

  const savePreferences = useCallback((prefs: UserPreferences) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
      setPreferencesState(prefs);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }, []);

  const setDefaultTab = useCallback((tab: string) => {
    setPreferencesState((prev) => {
      const updated = { ...prev, defaultTab: tab };
      savePreferences(updated);
      return updated;
    });
  }, [savePreferences]);

  const setDefaultSortBy = useCallback((sortBy: TrendingSortBy) => {
    setPreferencesState((prev) => {
      const updated = { ...prev, defaultSortBy: sortBy };
      savePreferences(updated);
      return updated;
    });
  }, [savePreferences]);

  const setPreferences = useCallback((prefs: Partial<UserPreferences>) => {
    setPreferencesState((prev) => {
      const updated = { ...prev, ...prefs };
      savePreferences(updated);
      return updated;
    });
  }, [savePreferences]);

  const resetPreferences = useCallback(() => {
    savePreferences(DEFAULT_PREFERENCES);
  }, [savePreferences]);

  return {
    preferences,
    setDefaultTab,
    setDefaultSortBy,
    setPreferences,
    resetPreferences,
  };
}
