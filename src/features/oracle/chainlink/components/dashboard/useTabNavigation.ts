'use client';

import { useCallback, useEffect, useState } from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string;
}

export interface UseTabNavigationOptions {
  defaultTab?: string;
  tabs: TabItem[];
  onTabChange?: (tabId: string) => void;
  syncUrl?: boolean;
  urlParamName?: string;
}

export interface UseTabNavigationReturn {
  activeTab: string;
  setActiveTab: (tabId: string) => void;
  goToNextTab: () => void;
  goToPrevTab: () => void;
  tabs: TabItem[];
  currentIndex: number;
}

function getTabFromUrl(paramName: string): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get(paramName);
}

function setTabToUrl(tabId: string, paramName: string): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set(paramName, tabId);
  window.history.pushState({}, '', url.toString());
}

export function useTabNavigation({
  defaultTab,
  tabs,
  onTabChange,
  syncUrl = true,
  urlParamName = 'tab',
}: UseTabNavigationOptions): UseTabNavigationReturn {
  const getInitialTab = useCallback(() => {
    if (syncUrl) {
      const urlTab = getTabFromUrl(urlParamName);
      if (urlTab && tabs.some((tab) => tab.id === urlTab)) {
        return urlTab;
      }
    }
    return defaultTab || tabs[0]?.id || '';
  }, [defaultTab, tabs, syncUrl, urlParamName]);

  const [activeTab, setActiveTabState] = useState<string>(getInitialTab);

  const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);

  const setActiveTab = useCallback(
    (tabId: string) => {
      if (!tabs.some((tab) => tab.id === tabId)) return;

      setActiveTabState(tabId);
      if (syncUrl) {
        setTabToUrl(tabId, urlParamName);
      }
      onTabChange?.(tabId);
    },
    [tabs, syncUrl, urlParamName, onTabChange],
  );

  const goToNextTab = useCallback(() => {
    const nextIndex = (currentIndex + 1) % tabs.length;
    const nextTab = tabs[nextIndex];
    if (nextTab) setActiveTab(nextTab.id);
  }, [currentIndex, tabs, setActiveTab]);

  const goToPrevTab = useCallback(() => {
    const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    const prevTab = tabs[prevIndex];
    if (prevTab) setActiveTab(prevTab.id);
  }, [currentIndex, tabs, setActiveTab]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToNextTab();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToPrevTab();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextTab, goToPrevTab]);

  useEffect(() => {
    if (!syncUrl) return;

    const handlePopState = () => {
      const urlTab = getTabFromUrl(urlParamName);
      if (urlTab && tabs.some((tab) => tab.id === urlTab)) {
        setActiveTabState(urlTab);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [tabs, syncUrl, urlParamName]);

  return {
    activeTab,
    setActiveTab,
    goToNextTab,
    goToPrevTab,
    tabs,
    currentIndex,
  };
}

export default useTabNavigation;
