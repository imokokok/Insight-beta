/**
 * ============================================================================
 * Shortcuts Help Dialog
 * ============================================================================
 *
 * 键盘快捷键帮助对话框组件
 * 显示所有可用的键盘快捷键
 */

import React, { useState, useCallback } from 'react';

import { Keyboard, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAppShortcuts } from '@/hooks/useAppShortcuts';
import { useFocusTrap } from '@/hooks/useKeyboardNavigation';
import { cn } from '@/lib/utils';

export interface ShortcutsHelpProps {
  /** 是否打开 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
}

export function ShortcutsHelp({ isOpen, onClose }: ShortcutsHelpProps) {
  const { shortcutsByScope } = useAppShortcuts();
  const [activeTab, setActiveTab] = useState<string>('navigation');
  const containerRef = React.useRef<HTMLDivElement>(null);

  useFocusTrap({
    isActive: isOpen,
    containerRef: containerRef as React.RefObject<HTMLElement | null>,
    initialFocusSelector: '[data-shortcuts-close]',
  });

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  if (!isOpen) return null;

  const scopeLabels: Record<string, string> = {
    navigation: 'Navigation',
    function: 'Functions',
    help: 'Help',
    general: 'General',
  };

  const scopes = Object.keys(shortcutsByScope);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div
        ref={containerRef}
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-purple-50 to-blue-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-purple-100 p-2">
              <Keyboard className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 id="shortcuts-title" className="text-lg font-semibold text-gray-900">
                Keyboard Shortcuts
              </h2>
              <p className="text-sm text-gray-500">Press ? anytime to show this dialog</p>
            </div>
          </div>
          <button
            data-shortcuts-close
            data-modal-close
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-100">
          <div className="flex gap-1 px-6 pt-4">
            {scopes.map((scope) => (
              <button
                key={scope}
                onClick={() => setActiveTab(scope)}
                className={cn(
                  'rounded-t-lg px-4 py-2 text-sm font-medium transition-colors',
                  activeTab === scope
                    ? 'border-b-2 border-purple-500 text-purple-600'
                    : 'text-gray-500 hover:text-gray-700',
                )}
              >
                {scopeLabels[scope] || scope}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          <div className="space-y-3">
            {shortcutsByScope[activeTab]?.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3"
              >
                <span className="text-sm text-gray-700">{shortcut.description}</span>
                <kbd className="rounded-lg border border-gray-200 bg-white px-3 py-1 font-mono text-xs font-semibold text-gray-700 shadow-sm">
                  {shortcut.shortcut}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Tip: Use Tab to navigate between elements</span>
            <Button variant="outline" size="sm" onClick={onClose}>
              Got it
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShortcutsHelp;
