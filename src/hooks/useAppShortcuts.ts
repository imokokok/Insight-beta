/**
 * ============================================================================
 * Application Shortcuts Hook
 * ============================================================================
 *
 * 应用级别的全局快捷键配置
 * 为 OracleMonitor 平台提供完整的键盘快捷键支持
 */

import { useMemo } from 'react';

import { useRouter } from 'next/navigation';

import { logger } from '@/lib/logger';

import { useGlobalShortcuts, type KeyBinding } from './useKeyboardNavigation';

export interface AppShortcutsConfig {
  /** 导航到首页 */
  goHome: () => void;
  /** 导航到仪表板 */
  goToDashboard: () => void;
  /** 导航到协议页面 */
  goToProtocols: () => void;
  /** 打开搜索 */
  openSearch: () => void;
  /** 刷新数据 */
  refreshData: () => void;
  /** 打开帮助 */
  openHelp: () => void;
  /** 切换侧边栏 */
  toggleSidebar: () => void;
  /** 打开快捷键帮助 */
  openShortcutsHelp: () => void;
}

export function useAppShortcuts(config: Partial<AppShortcutsConfig> = {}) {
  const router = useRouter();

  const {
    goHome = () => router.push('/oracle'),
    goToDashboard = () => router.push('/oracle/dashboard'),
    goToProtocols = () => router.push('/oracle/protocols'),
    openSearch = () => logger.info('Search opened'),
    refreshData = () => window.location.reload(),
    openHelp = () => logger.info('Help opened'),
    toggleSidebar = () => logger.info('Sidebar toggled'),
    openShortcutsHelp = () => logger.info('Shortcuts help opened'),
  } = config;

  const bindings: KeyBinding[] = useMemo(
    () => [
      // 导航快捷键
      {
        key: 'h',
        ctrl: true,
        description: 'Go to Home',
        scope: 'navigation',
        handler: goHome,
      },
      {
        key: 'd',
        ctrl: true,
        description: 'Go to Dashboard',
        scope: 'navigation',
        handler: goToDashboard,
      },
      {
        key: 'p',
        ctrl: true,
        description: 'Go to Protocols',
        scope: 'navigation',
        handler: goToProtocols,
      },
      // 功能快捷键
      {
        key: 'k',
        ctrl: true,
        description: 'Open Search',
        scope: 'function',
        handler: openSearch,
      },
      {
        key: 'r',
        ctrl: true,
        description: 'Refresh Data',
        scope: 'function',
        handler: refreshData,
      },
      {
        key: 'b',
        ctrl: true,
        description: 'Toggle Sidebar',
        scope: 'function',
        handler: toggleSidebar,
      },
      // 帮助快捷键
      {
        key: '?',
        description: 'Show Keyboard Shortcuts',
        scope: 'help',
        handler: openShortcutsHelp,
      },
      {
        key: 'F1',
        description: 'Open Help',
        scope: 'help',
        handler: openHelp,
      },
      // Escape 快捷键
      {
        key: 'Escape',
        description: 'Close Modal/Go Back',
        scope: 'general',
        handler: () => {
          // 关闭所有打开的模态框
          const closeButtons = document.querySelectorAll('[data-modal-close]');
          if (closeButtons.length > 0) {
            (closeButtons[0] as HTMLElement).click();
          }
        },
      },
    ],
    [
      goHome,
      goToDashboard,
      goToProtocols,
      openSearch,
      refreshData,
      openHelp,
      toggleSidebar,
      openShortcutsHelp,
    ],
  );

  const { getShortcutsHelp } = useGlobalShortcuts({
    bindings,
    enabled: true,
    preventDefaultKeys: ['k', 'r', 'b', 'p', 'd', 'h'],
  });

  // 按作用域分组快捷键
  const shortcutsByScope = useMemo(() => {
    const grouped: Record<string, typeof getShortcutsHelp> = {};
    getShortcutsHelp.forEach((shortcut) => {
      const scope = shortcut.scope || 'general';
      if (!grouped[scope]) {
        grouped[scope] = [];
      }
      grouped[scope].push(shortcut);
    });
    return grouped;
  }, [getShortcutsHelp]);

  return {
    bindings,
    getShortcutsHelp,
    shortcutsByScope,
  };
}
