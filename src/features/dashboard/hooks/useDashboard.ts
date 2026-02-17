'use client';

import { useEffect, useCallback } from 'react';

import { logger } from '@/shared/logger';

// ============================================================================
// useDashboardShortcuts - 仪表板键盘快捷键 Hook
// ============================================================================

interface UseDashboardShortcutsOptions {
  onRefresh?: () => void;
  onExport?: () => void;
  onSearchFocus?: () => void;
  onTabChange?: (tab: string) => void;
  tabs?: string[];
  enabled?: boolean;
}

export function useDashboardShortcuts({
  onRefresh,
  onExport,
  onSearchFocus,
  onTabChange,
  tabs = [],
  enabled = true,
}: UseDashboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        if (event.key !== 'Escape') {
          return;
        }
      }

      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'r':
            event.preventDefault();
            onRefresh?.();
            logger.debug('Dashboard shortcut: Refresh triggered');
            break;
          case 'e':
            event.preventDefault();
            onExport?.();
            logger.debug('Dashboard shortcut: Export triggered');
            break;
          case 'f':
            event.preventDefault();
            onSearchFocus?.();
            logger.debug('Dashboard shortcut: Search focus triggered');
            break;
        }
        return;
      }

      if (event.key >= '1' && event.key <= '9') {
        const tabIndex = parseInt(event.key, 10) - 1;
        const targetTab = tabs[tabIndex];
        if (targetTab) {
          event.preventDefault();
          onTabChange?.(targetTab);
          logger.debug('Dashboard shortcut: Tab change triggered', { tab: targetTab });
        }
      }

      if (event.key === 'Escape') {
        onSearchFocus?.();
        logger.debug('Dashboard shortcut: Clear search triggered');
      }
    },
    [onRefresh, onExport, onSearchFocus, onTabChange, tabs],
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}

// useAutoRefreshWithCountdown 已迁移到 src/hooks/useAutoRefresh.ts
// 请从 '@/hooks' 导入 useAutoRefreshWithCountdown


