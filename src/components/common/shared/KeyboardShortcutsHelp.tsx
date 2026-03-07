/**
 * Keyboard Shortcuts Help Modal
 *
 * 快捷键帮助弹窗
 */

'use client';

import { useState, useEffect } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X, Command } from 'lucide-react';

import { Button } from '@/components/ui';
import { useI18n } from '@/i18n';

interface ShortcutItem {
  keys: string[];
  descriptionKey: string;
  category: string;
}

const shortcuts: ShortcutItem[] = [
  {
    keys: ['⌘', 'K'],
    descriptionKey: 'keyboard.search',
    category: 'navigation',
  },
  {
    keys: ['R'],
    descriptionKey: 'keyboard.refresh',
    category: 'navigation',
  },
  {
    keys: ['Esc'],
    descriptionKey: 'keyboard.close',
    category: 'navigation',
  },
  {
    keys: ['⌘', 'Shift', '?'],
    descriptionKey: 'keyboard.help',
    category: 'help',
  },
];

interface KeyboardShortcutsHelpProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function KeyboardShortcutsHelp({ open = false, onOpenChange }: KeyboardShortcutsHelpProps) {
  const { t } = useI18n();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === '/' || e.key === '?')) {
        e.preventDefault();
        onOpenChange?.(!open);
      }
      if (e.key === 'Escape' && open) {
        onOpenChange?.(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  if (!isMounted) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange?.(false)}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border/50 bg-card p-6 shadow-2xl"
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Keyboard className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">
                  {t('keyboard.title')}
                </h2>
              </div>
              <button
                onClick={() => onOpenChange?.(false)}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Shortcuts List */}
            <div className="space-y-3">
              {shortcuts.map((shortcut, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-xl border border-border/30 bg-card/50 p-3 transition-colors hover:border-primary/30"
                >
                  <span className="text-sm text-foreground">{t(shortcut.descriptionKey)}</span>
                  <div className="flex items-center gap-1.5">
                    {shortcut.keys.map((key, keyIndex) => (
                      <kbd
                        key={keyIndex}
                        className="flex min-h-7 min-w-7 items-center justify-center rounded-lg border border-border bg-muted px-2 py-1.5 text-xs font-semibold text-foreground shadow-sm"
                      >
                        {key === '⌘' ? <Command className="h-3.5 w-3.5" /> : <span>{key}</span>}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-4 flex items-center justify-between border-t border-border/30 pt-4">
              <p className="text-xs text-muted-foreground">{t('keyboard.inputHint')}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange?.(false)}
                className="h-8 text-xs"
              >
                {t('common.close')}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
