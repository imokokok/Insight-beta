/**
 * Dashboard Layout Component
 *
 * 仪表板布局组件
 * - 统一的头部布局
 * - 自动刷新控制
 * - Toast 通知
 * - 键盘快捷键
 */

'use client';

import type { ReactNode } from 'react';

import { RefreshCw, Download, Keyboard } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDashboardShortcuts, useAutoRefresh, useDataCache } from '@/hooks/useDashboardShortcuts';
import { cn } from '@/lib/utils';

import { AutoRefreshControl } from './AutoRefreshControl';
import { ToastContainer, useToast } from './DashboardToast';
import { RefreshIndicator } from './RefreshIndicator';

interface DashboardLayoutProps {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
  onRefresh: () => void;
  onExport?: () => void;
  loading?: boolean;
  lastUpdated?: Date | null;
  metrics?: unknown;
  autoRefreshInterval?: number;
  cacheKey?: string;
  shortcuts?: {
    refresh?: boolean;
    export?: boolean;
    search?: boolean;
    tabs?: string[];
  };
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function DashboardLayout({
  title,
  description,
  icon,
  children,
  onRefresh,
  onExport,
  loading = false,
  lastUpdated,
  metrics,
  autoRefreshInterval = 30000,
  shortcuts = {},
  searchInputRef,
  onTabChange,
}: DashboardLayoutProps) {
  const { toasts, removeToast, success } = useToast();

  // Auto refresh
  const {
    isEnabled: autoRefreshEnabled,
    setIsEnabled: setAutoRefreshEnabled,
    refreshInterval,
    setRefreshInterval,
    timeUntilRefresh,
    refresh,
  } = useAutoRefresh({
    onRefresh: () => {
      onRefresh();
      success('Data refreshed', 'Dashboard data has been updated');
    },
    interval: autoRefreshInterval,
    enabled: true,
    pauseWhenHidden: true,
  });

  // Keyboard shortcuts
  useDashboardShortcuts({
    onRefresh: shortcuts.refresh !== false ? () => refresh() : undefined,
    onExport:
      shortcuts.export !== false && onExport
        ? () => {
            onExport();
            success('Export complete', 'Report has been downloaded');
          }
        : undefined,
    onSearchFocus:
      shortcuts.search !== false && searchInputRef
        ? () => {
            searchInputRef.current?.focus();
          }
        : undefined,
    onTabChange: shortcuts.tabs && onTabChange ? (tab) => onTabChange(tab) : undefined,
    tabs: shortcuts.tabs,
    enabled: true,
  });

  return (
    <TooltipProvider>
      <div className="container mx-auto space-y-6 p-4 sm:p-6">
        {/* Toast Notifications */}
        <ToastContainer toasts={toasts} onRemove={removeToast} />

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-xl font-bold sm:text-2xl lg:text-3xl">
              {icon}
              {title}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">{description}</p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => refresh()} disabled={loading}>
                    <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
                    Refresh
                    <kbd className="bg-muted ml-2 hidden h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium sm:inline-flex">
                      ⌘R
                    </kbd>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh data (Ctrl/Cmd + R)</p>
                </TooltipContent>
              </Tooltip>

              {onExport && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={onExport} disabled={!metrics}>
                      <Download className="mr-2 h-4 w-4" />
                      Export
                      <kbd className="bg-muted ml-2 hidden h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium sm:inline-flex">
                        ⌘E
                      </kbd>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Export data (Ctrl/Cmd + E)</p>
                  </TooltipContent>
                </Tooltip>
              )}

              <AutoRefreshControl
                isEnabled={autoRefreshEnabled}
                onToggle={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                interval={refreshInterval}
                onIntervalChange={setRefreshInterval}
                timeUntilRefresh={timeUntilRefresh}
              />

              {/* Shortcuts Help */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Keyboard className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="w-64">
                  <div className="space-y-2">
                    <p className="font-semibold">Keyboard Shortcuts</p>
                    <div className="space-y-1 text-xs">
                      {shortcuts.refresh !== false && (
                        <div className="flex justify-between">
                          <span>Refresh</span>
                          <kbd className="bg-muted rounded px-1">⌘R</kbd>
                        </div>
                      )}
                      {shortcuts.export !== false && onExport && (
                        <div className="flex justify-between">
                          <span>Export</span>
                          <kbd className="bg-muted rounded px-1">⌘E</kbd>
                        </div>
                      )}
                      {shortcuts.search !== false && searchInputRef && (
                        <div className="flex justify-between">
                          <span>Search</span>
                          <kbd className="bg-muted rounded px-1">⌘F</kbd>
                        </div>
                      )}
                      {shortcuts.tabs && (
                        <div className="flex justify-between">
                          <span>Switch tabs</span>
                          <kbd className="bg-muted rounded px-1">1-9</kbd>
                        </div>
                      )}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>

            <RefreshIndicator
              lastUpdated={lastUpdated || null}
              nextRefreshIn={Math.ceil(timeUntilRefresh / 1000)}
              isLoading={loading}
            />
          </div>
        </div>

        {/* Main Content */}
        <div>{children}</div>
      </div>
    </TooltipProvider>
  );
}

// Re-export hooks for convenience
export { useToast, useDashboardShortcuts, useAutoRefresh, useDataCache };
