/**
 * Keyboard Shortcuts Hook
 *
 * 全局键盘快捷键管理
 * - Cmd/Ctrl + K: 打开全局搜索
 * - R: 刷新当前页面
 * - Esc: 关闭弹窗/搜索框
 * - Cmd/Ctrl + ?: 显示快捷键帮助
 */

'use client';

import { useEffect, useCallback } from 'react';

interface KeyboardShortcutOptions {
  onSearch?: () => void;
  onRefresh?: () => void;
  onClose?: () => void;
  onHelp?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onSearch,
  onRefresh,
  onClose,
  onHelp,
  enabled = true,
}: KeyboardShortcutOptions) {
  const isInputElement = useCallback((target: EventTarget | null): boolean => {
    if (!target) return false;
    const element = target as HTMLElement;
    return (
      element.tagName === 'INPUT' ||
      element.tagName === 'TEXTAREA' ||
      element.isContentEditable ||
      element.getAttribute('role') === 'textbox'
    );
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const { key, ctrlKey, metaKey, shiftKey } = event;
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? metaKey : ctrlKey;

      // Cmd/Ctrl + K: 打开搜索
      if (cmdOrCtrl && key === 'k') {
        event.preventDefault();
        onSearch?.();
        return;
      }

      // Cmd/Ctrl + Shift + ?: 显示帮助 (实际是 Cmd/Ctrl + /)
      if (cmdOrCtrl && shiftKey && (key === '/' || key === '?')) {
        event.preventDefault();
        onHelp?.();
        return;
      }

      // 在输入框中时，只响应 Cmd+K，其他快捷键不响应
      if (isInputElement(document.activeElement)) {
        // Esc: 关闭弹窗/搜索框（即使在输入框中也响应）
        if (key === 'Escape') {
          event.preventDefault();
          onClose?.();
        }
        return;
      }

      // R: 刷新页面
      if (key === 'r' && !cmdOrCtrl) {
        event.preventDefault();
        onRefresh?.();
        return;
      }

      // Esc: 关闭弹窗
      if (key === 'Escape') {
        event.preventDefault();
        onClose?.();
        return;
      }

      // ?: 显示帮助（单独按 ? 键）
      if (key === '?' && !cmdOrCtrl && shiftKey) {
        event.preventDefault();
        onHelp?.();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSearch, onRefresh, onClose, onHelp, enabled, isInputElement]);
}
