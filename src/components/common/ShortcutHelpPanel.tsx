/**
 * Shortcut Help Panel Component
 *
 * 快捷键帮助面板组件
 */

'use client';

import type { ShortcutGroup } from '@/hooks/useKeyboardShortcuts';

interface ShortcutHelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
  groups: ShortcutGroup[];
}

export function ShortcutHelpPanel({ isOpen, onClose, groups }: ShortcutHelpPanelProps) {
  if (!isOpen) return null;

  const formatKey = (key: string) => {
    const keyMap: Record<string, string> = {
      'ctrl': 'Ctrl',
      'alt': 'Alt',
      'shift': 'Shift',
      'meta': '⌘',
      'Escape': 'Esc',
      'Delete': 'Del',
      'ArrowUp': '↑',
      'ArrowDown': '↓',
      'ArrowLeft': '←',
      'ArrowRight': '→',
    };
    return keyMap[key] || key;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">键盘快捷键</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <span className="sr-only">关闭</span>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.name}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                {group.name}
              </h3>
              <div className="grid gap-2">
                {group.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3"
                  >
                    <span className="text-sm text-gray-700">
                      {shortcut.description || shortcut.key}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.modifier && (
                        <>
                          {(Array.isArray(shortcut.modifier)
                            ? shortcut.modifier
                            : [shortcut.modifier]
                          ).map((mod) => (
                            <kbd
                              key={mod}
                              className="rounded bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700"
                            >
                              {formatKey(mod)}
                            </kbd>
                          ))}
                          <span className="mx-1 text-gray-400">+</span>
                        </>
                      )}
                      <kbd className="rounded bg-gray-800 px-2 py-1 text-xs font-medium text-white">
                        {formatKey(shortcut.key)}
                      </kbd>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          按 <kbd className="rounded bg-gray-200 px-1.5 py-0.5">Shift</kbd> +{' '}
          <kbd className="rounded bg-gray-200 px-1.5 py-0.5">?</kbd> 随时打开此面板
        </div>
      </div>
    </div>
  );
}
