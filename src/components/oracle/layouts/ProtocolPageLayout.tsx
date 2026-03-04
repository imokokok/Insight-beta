'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

import { AnimatePresence, motion } from 'framer-motion';

import { Breadcrumb, AutoRefreshControl } from '@/components/common';
import { KpiGrid } from '@/components/common';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { ErrorBanner } from '@/components/ui';
import { TopStatusBar } from '@/features/oracle/components/shared';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';
import type { NetworkHealthStatus } from '@/types/common';
import type { BreadcrumbItem } from '@/types/common/breadcrumb';
import type { KpiCardData } from '@/types/shared/kpi';

export type { NetworkHealthStatus } from '@/types/common';
export type { BreadcrumbItem } from '@/types/common/breadcrumb';
export type { KpiCardData } from '@/types/shared/kpi';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string;
  lazy?: boolean;
}

interface TabPanelProps {
  id: string;
  children: React.ReactNode;
  isActive: boolean;
  className?: string;
}

function TabPanel({ id, children, isActive, className }: TabPanelProps) {
  const [shouldRender, setShouldRender] = useState(isActive);
  const prevIsActive = useRef(isActive);

  useEffect(() => {
    if (isActive && !prevIsActive.current) {
      setShouldRender(true);
    }
    prevIsActive.current = isActive;
  }, [isActive]);

  useEffect(() => {
    if (!isActive && shouldRender) {
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 150);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isActive, shouldRender]);

  if (!shouldRender) return null;

  return (
    <motion.div
      id={`tabpanel-${id}`}
      role="tabpanel"
      aria-labelledby={`tab-${id}`}
      hidden={!isActive}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : -8 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface TabNavigationProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

const MIN_SWIPE_DISTANCE = 50;

function TabNavigation({ tabs, activeTab, onTabChange, className }: TabNavigationProps) {
  const tabsRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);

  const goToNextTab = useCallback(() => {
    const nextIndex = (currentIndex + 1) % tabs.length;
    const nextTab = tabs[nextIndex];
    if (nextTab) onTabChange(nextTab.id);
  }, [currentIndex, tabs, onTabChange]);

  const goToPrevTab = useCallback(() => {
    const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    const prevTab = tabs[prevIndex];
    if (prevTab) onTabChange(prevTab.id);
  }, [currentIndex, tabs, onTabChange]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    if (e.targetTouches[0]) {
      setTouchStart(e.targetTouches[0].clientX);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.targetTouches[0]) {
      setTouchEnd(e.targetTouches[0].clientX);
    }
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > MIN_SWIPE_DISTANCE;
    const isRightSwipe = distance < -MIN_SWIPE_DISTANCE;

    if (isLeftSwipe) goToNextTab();
    if (isRightSwipe) goToPrevTab();
  };

  useEffect(() => {
    if (activeTabRef.current && tabsRef.current) {
      const container = tabsRef.current;
      const activeButton = activeTabRef.current;

      const containerRect = container.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();

      const isOutsideLeft = buttonRect.left < containerRect.left;
      const isOutsideRight = buttonRect.right > containerRect.right;

      if (isOutsideLeft) {
        container.scrollLeft -= containerRect.left - buttonRect.left + 20;
      } else if (isOutsideRight) {
        container.scrollLeft += buttonRect.right - containerRect.right + 20;
      }
    }
  }, [activeTab]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const tab = tabs[index];
      if (tab) onTabChange(tab.id);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      const nextIndex = (index + 1) % tabs.length;
      const nextTab = tabs[nextIndex];
      if (nextTab) {
        const el = document.getElementById(`tab-${nextTab.id}`);
        el?.focus();
      }
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      const prevIndex = (index - 1 + tabs.length) % tabs.length;
      const prevTab = tabs[prevIndex];
      if (prevTab) {
        const el = document.getElementById(`tab-${prevTab.id}`);
        el?.focus();
      }
    } else if (event.key === 'Home') {
      event.preventDefault();
      const firstTab = tabs[0];
      if (firstTab) {
        const el = document.getElementById(`tab-${firstTab.id}`);
        el?.focus();
      }
    } else if (event.key === 'End') {
      event.preventDefault();
      const lastTab = tabs[tabs.length - 1];
      if (lastTab) {
        const el = document.getElementById(`tab-${lastTab.id}`);
        el?.focus();
      }
    }
  };

  return (
    <>
      <div className={cn('relative border-b border-border/20', 'hidden md:block', className)}>
        <div
          ref={tabsRef}
          role="tablist"
          aria-label="Tab navigation"
          className={cn(
            'scrollbar-hide flex h-10 items-center gap-1 overflow-x-auto px-4',
            'md:gap-2 md:px-6',
          )}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.id;
            const showBadge = tab.badge !== undefined;

            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                ref={isActive ? activeTabRef : null}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onTabChange(tab.id)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className={cn(
                  'group relative flex h-10 shrink-0 items-center gap-2 px-4',
                  'text-sm font-medium transition-colors duration-200',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1C]',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.icon && (
                  <span
                    className={cn(
                      'transition-colors duration-200',
                      isActive
                        ? 'text-primary'
                        : 'text-muted-foreground group-hover:text-foreground',
                    )}
                  >
                    {tab.icon}
                  </span>
                )}

                <span className="whitespace-nowrap">{tab.label}</span>

                {showBadge && (
                  <span
                    className={cn(
                      'ml-1 inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5',
                      'text-[10px] font-semibold transition-colors duration-200',
                      typeof tab.badge === 'number' && tab.badge > 0
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted/30 text-muted-foreground',
                    )}
                  >
                    {typeof tab.badge === 'number' && tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}

                <span
                  className={cn(
                    'absolute bottom-0 left-0 right-0 h-0.5 bg-primary',
                    'transition-transform duration-300 ease-out',
                    isActive ? 'scale-x-100' : 'scale-x-0',
                  )}
                  style={{ transformOrigin: 'left center' }}
                />
              </button>
            );
          })}
        </div>

        <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-transparent to-transparent md:hidden" />
      </div>

      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50',
          'border-t border-border/30 backdrop-blur-lg',
          'md:hidden',
          'safe-area-inset-bottom',
        )}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          role="tablist"
          aria-label="Mobile tab navigation"
          className="flex h-14 items-center justify-around px-2"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-1 py-2',
                  'transition-colors duration-200',
                  'focus:outline-none',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {tab.icon && (
                  <span
                    className={cn('transition-transform duration-200', isActive && 'scale-110')}
                  >
                    {tab.icon}
                  </span>
                )}
                <span className="text-[10px] font-medium">{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={cn(
                      'absolute right-1/2 top-1 translate-x-4',
                      'flex h-4 min-w-4 items-center justify-center rounded-full px-1',
                      'text-[9px] font-semibold',
                      typeof tab.badge === 'number' && tab.badge > 0
                        ? 'text-primary-foreground bg-primary'
                        : 'bg-muted/50 text-muted-foreground',
                    )}
                  >
                    {typeof tab.badge === 'number' && tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

function useTabNavigation({
  defaultTab,
  tabs,
  onTabChange,
  syncUrl = true,
  urlParamName = 'tab',
}: {
  defaultTab?: string;
  tabs: TabItem[];
  onTabChange?: (tabId: string) => void;
  syncUrl?: boolean;
  urlParamName?: string;
}) {
  const getTabFromUrl = useCallback((paramName: string): string | null => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get(paramName);
  }, []);

  const setTabToUrl = useCallback((tabId: string, paramName: string): void => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set(paramName, tabId);
    window.history.pushState({}, '', url.toString());
  }, []);

  const getInitialTab = useCallback(() => {
    if (syncUrl) {
      const urlTab = getTabFromUrl(urlParamName);
      if (urlTab && tabs.some((tab) => tab.id === urlTab)) {
        return urlTab;
      }
    }
    return defaultTab || tabs[0]?.id || '';
  }, [defaultTab, tabs, syncUrl, urlParamName, getTabFromUrl]);

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
    [tabs, syncUrl, urlParamName, onTabChange, setTabToUrl],
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
  }, [tabs, syncUrl, urlParamName, getTabFromUrl]);

  return {
    activeTab,
    setActiveTab,
    goToNextTab,
    goToPrevTab,
    tabs,
    currentIndex,
  };
}

export interface ProtocolPageLayoutProps {
  protocol: 'chainlink' | 'pyth' | 'api3' | 'band' | 'uma';
  title: string;
  icon: React.ReactNode;
  description: string;
  healthStatus: NetworkHealthStatus;
  kpiCards: KpiCardData[];
  tabs: TabItem[];
  children: React.ReactNode;
  breadcrumbItems?: BreadcrumbItem[];
  loading?: boolean;
  error?: string | null;
  lastUpdated?: Date | null;
  autoRefreshEnabled?: boolean;
  onToggleAutoRefresh?: () => void;
  refreshInterval?: number;
  onRefreshIntervalChange?: (interval: number) => void;
  timeUntilRefresh?: number;
  onRefresh?: () => void;
  onExport?: () => void;
  exportData?: Record<string, unknown> | null;
  exportFilename?: string;
  className?: string;
}

const PROTOCOL_COLORS: Record<string, { primary: string; bg: string }> = {
  chainlink: { primary: 'text-blue-600', bg: 'bg-blue-500/10' },
  pyth: { primary: 'text-purple-600', bg: 'bg-purple-500/10' },
  api3: { primary: 'text-green-600', bg: 'bg-green-500/10' },
  band: { primary: 'text-orange-600', bg: 'bg-orange-500/10' },
  uma: { primary: 'text-pink-600', bg: 'bg-pink-500/10' },
};

export function ProtocolPageLayout({
  protocol,
  title,
  icon,
  description,
  healthStatus,
  kpiCards,
  tabs,
  children,
  breadcrumbItems,
  loading = false,
  error = null,
  lastUpdated,
  autoRefreshEnabled = false,
  onToggleAutoRefresh,
  refreshInterval = 30000,
  onRefreshIntervalChange,
  timeUntilRefresh = 0,
  onRefresh,
  onExport,
  exportData,
  exportFilename,
  className,
}: ProtocolPageLayoutProps) {
  const { t } = useI18n();
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set([tabs[0]?.id || 'overview']));

  const protocolColors = PROTOCOL_COLORS[protocol] || PROTOCOL_COLORS.chainlink;

  const handleTabChange = useCallback((tabId: string) => {
    setLoadedTabs((prev) => {
      if (!prev.has(tabId)) {
        return new Set([...prev, tabId]);
      }
      return prev;
    });
  }, []);

  const { activeTab, setActiveTab } = useTabNavigation({
    defaultTab: tabs[0]?.id || 'overview',
    tabs,
    onTabChange: handleTabChange,
    syncUrl: true,
    urlParamName: 'tab',
  });

  const defaultBreadcrumbItems: BreadcrumbItem[] = useMemo(
    () => [{ label: t('nav.oracle'), href: '/oracle' }, { label: title }],
    [t, title],
  );

  const healthConfig: Record<
    NetworkHealthStatus,
    { label: string; color: string; bgColor: string }
  > = {
    healthy: {
      label: t('common.status.healthy'),
      color: 'text-success',
      bgColor: 'bg-success/20',
    },
    warning: {
      label: t('common.status.warning'),
      color: 'text-warning',
      bgColor: 'bg-warning/20',
    },
    critical: {
      label: t('common.status.critical'),
      color: 'text-error',
      bgColor: 'bg-error/20',
    },
  };

  const healthInfo = healthConfig[healthStatus];

  const handleDefaultExport = useCallback(() => {
    if (!exportData) return;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename =
      exportFilename || `${protocol}-dashboard-${new Date().toISOString().split('T')[0]}.json`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportData, protocol, exportFilename]);

  const childArray = React.Children.toArray(children);

  if (error && !loading) {
    return (
      <div className="container mx-auto space-y-6 p-4 sm:p-6">
        <Breadcrumb items={breadcrumbItems || defaultBreadcrumbItems} />
        <ErrorBanner
          error={new Error(error)}
          onRetry={onRefresh || (() => {})}
          title={t('common.errorLoadFailed')}
          isRetrying={loading}
        />
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen pb-16 md:pb-0', className)}>
      <TopStatusBar
        healthStatus={healthStatus}
        isConnected={true}
        lastUpdateTime={lastUpdated ?? undefined}
        onRefresh={onRefresh || (() => {})}
        isAutoRefreshEnabled={autoRefreshEnabled}
        onToggleAutoRefresh={onToggleAutoRefresh || (() => {})}
        onExport={onExport || handleDefaultExport}
      />

      <div className="container mx-auto space-y-3 p-4 sm:p-6">
        <Breadcrumb items={breadcrumbItems || defaultBreadcrumbItems} />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold sm:text-xl lg:text-2xl">
              <span className={cn('rounded-lg p-1.5', protocolColors?.bg)}>{icon}</span>
              <span>{title}</span>
              <Badge
                variant="outline"
                className={cn('border-0', healthInfo.bgColor, healthInfo.color)}
              >
                {healthInfo.label}
              </Badge>
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
                <svg
                  className={cn('mr-2 h-4 w-4', loading && 'animate-spin')}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {t('common.refresh')}
              </Button>
            )}
            {onToggleAutoRefresh && (
              <AutoRefreshControl
                isEnabled={autoRefreshEnabled}
                onToggle={onToggleAutoRefresh}
                interval={refreshInterval}
                onIntervalChange={onRefreshIntervalChange ?? (() => {})}
                timeUntilRefresh={timeUntilRefresh}
              />
            )}
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport} disabled={loading}>
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                {t('common.export')}
              </Button>
            )}
          </div>
        </div>

        {loading && kpiCards.every((k) => k.value === '-' || k.value === undefined) ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <KpiGrid kpis={kpiCards} loading={loading} />
        )}

        <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="relative">
          <AnimatePresence mode="wait">
            {childArray.map((child, index) => {
              if (React.isValidElement(child)) {
                const props = child.props as Record<string, unknown>;
                if (props && 'tabId' in props) {
                  const tabId = props.tabId as string;
                  const tab = tabs.find((t) => t.id === tabId);
                  const shouldLazyLoad = tab?.lazy && !loadedTabs.has(tabId);

                  return (
                    <TabPanel key={tabId} id={tabId} isActive={activeTab === tabId}>
                      {shouldLazyLoad ? (
                        <div className="space-y-4">
                          <Skeleton className="h-64 w-full" />
                        </div>
                      ) : (
                        child
                      )}
                    </TabPanel>
                  );
                }
              }
              return (
                <TabPanel key={index} id={activeTab} isActive={true}>
                  {child}
                </TabPanel>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export interface TabPanelWrapperProps {
  tabId: string;
  children: React.ReactNode;
  className?: string;
}

export function TabPanelWrapper({ children, className }: TabPanelWrapperProps) {
  return <div className={className}>{children}</div>;
}

export default ProtocolPageLayout;
