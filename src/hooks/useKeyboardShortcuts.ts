/**
 * Keyboard Shortcuts Hook
 *
 * 键盘快捷键 Hook - 支持全局和局部快捷键
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';

// ==================== 快捷键类型定义 ====================

export interface KeyboardShortcut {
  key: string;
  modifier?: 'ctrl' | 'alt' | 'shift' | 'meta' | ('ctrl' | 'alt' | 'shift' | 'meta')[];
  handler: (e: KeyboardEvent) => void;
  description?: string;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  scope?: 'global' | 'local';
}

export interface ShortcutGroup {
  name: string;
  shortcuts: KeyboardShortcut[];
}

// ==================== 全局快捷键 Hook ====================

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled: boolean = true) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      for (const shortcut of shortcutsRef.current) {
        if (shortcut.scope === 'local') continue;

        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        let modifierMatch = true;
        if (shortcut.modifier) {
          const modifiers = Array.isArray(shortcut.modifier)
            ? shortcut.modifier
            : [shortcut.modifier];

          modifierMatch = modifiers.every((mod) => {
            switch (mod) {
              case 'ctrl':
                return e.ctrlKey;
              case 'alt':
                return e.altKey;
              case 'shift':
                return e.shiftKey;
              case 'meta':
                return e.metaKey;
              default:
                return false;
            }
          });
        }

        if (keyMatch && modifierMatch) {
          if (shortcut.preventDefault !== false) {
            e.preventDefault();
          }
          if (shortcut.stopPropagation) {
            e.stopPropagation();
          }
          shortcut.handler(e);
          break;
        }
      }
    },
    [enabled],
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}

// ==================== 通用快捷键 Hook ====================

export function useCommonShortcuts({
  onSearch,
  onRefresh,
  onClose,
  onSave,
  onNew,
  onDelete,
  onUndo,
  onRedo,
}: {
  onSearch?: () => void;
  onRefresh?: () => void;
  onClose?: () => void;
  onSave?: () => void;
  onNew?: () => void;
  onDelete?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}) {
  const shortcuts: KeyboardShortcut[] = [];

  if (onSearch) {
    shortcuts.push({
      key: '/',
      handler: onSearch,
      description: '搜索',
      scope: 'global',
    });
  }

  if (onRefresh) {
    shortcuts.push({
      key: 'r',
      modifier: 'ctrl',
      handler: onRefresh,
      description: '刷新',
      scope: 'global',
    });
  }

  if (onClose) {
    shortcuts.push({
      key: 'Escape',
      handler: onClose,
      description: '关闭/返回',
      scope: 'global',
    });
  }

  if (onSave) {
    shortcuts.push({
      key: 's',
      modifier: 'ctrl',
      handler: onSave,
      description: '保存',
      scope: 'global',
    });
  }

  if (onNew) {
    shortcuts.push({
      key: 'n',
      modifier: 'ctrl',
      handler: onNew,
      description: '新建',
      scope: 'global',
    });
  }

  if (onDelete) {
    shortcuts.push({
      key: 'Delete',
      handler: onDelete,
      description: '删除',
      scope: 'global',
    });
  }

  if (onUndo) {
    shortcuts.push({
      key: 'z',
      modifier: 'ctrl',
      handler: onUndo,
      description: '撤销',
      scope: 'global',
    });
  }

  if (onRedo) {
    shortcuts.push({
      key: 'y',
      modifier: 'ctrl',
      handler: onRedo,
      description: '重做',
      scope: 'global',
    });
  }

  useKeyboardShortcuts(shortcuts);

  return shortcuts;
}

// 重新导出 ShortcutHelpPanel 组件，保持向后兼容
export { ShortcutHelpPanel } from '@/components/common/ShortcutHelpPanel';

export default useKeyboardShortcuts;
