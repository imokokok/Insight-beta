'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/i18n/LanguageProvider';

type ShortcutAction =
  | 'navigate_home'
  | 'navigate_oracle'
  | 'navigate_disputes'
  | 'navigate_alerts'
  | 'navigate_audit'
  | 'navigate_watchlist'
  | 'navigate_my_assertions'
  | 'navigate_my_disputes'
  | 'toggle_search'
  | 'toggle_theme'
  | 'refresh_data'
  | 'go_back'
  | 'go_forward'
  | 'scroll_top'
  | 'scroll_bottom'
  | 'show_shortcuts';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: ShortcutAction;
  description: string;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  onAction?: (action: ShortcutAction) => void;
}

const defaultShortcuts: KeyboardShortcut[] = [
  { key: 'g', shift: true, action: 'navigate_home', description: 'Go to Home' },
  {
    key: 'o',
    shift: true,
    action: 'navigate_oracle',
    description: 'Go to Oracle',
  },
  {
    key: 'd',
    shift: true,
    action: 'navigate_disputes',
    description: 'Go to Disputes',
  },
  {
    key: 'a',
    shift: true,
    action: 'navigate_alerts',
    description: 'Go to Alerts',
  },
  {
    key: 'u',
    shift: true,
    action: 'navigate_audit',
    description: 'Go to Audit Log',
  },
  {
    key: 'w',
    shift: true,
    action: 'navigate_watchlist',
    description: 'Go to Watchlist',
  },
  {
    key: 'm',
    shift: true,
    action: 'navigate_my_assertions',
    description: 'Go to My Assertions',
  },
  {
    key: 's',
    shift: true,
    action: 'navigate_my_disputes',
    description: 'Go to My Disputes',
  },
  {
    key: 'k',
    ctrl: true,
    action: 'toggle_search',
    description: 'Toggle Search',
  },
  { key: 'l', ctrl: true, action: 'toggle_theme', description: 'Toggle Theme' },
  { key: 'r', ctrl: true, action: 'refresh_data', description: 'Refresh Data' },
  { key: 'ArrowLeft', alt: true, action: 'go_back', description: 'Go Back' },
  {
    key: 'ArrowRight',
    alt: true,
    action: 'go_forward',
    description: 'Go Forward',
  },
  {
    key: 'Home',
    ctrl: true,
    action: 'scroll_top',
    description: 'Scroll to Top',
  },
  {
    key: 'End',
    ctrl: true,
    action: 'scroll_bottom',
    description: 'Scroll to Bottom',
  },
  {
    key: '?',
    shift: true,
    action: 'show_shortcuts',
    description: 'Show Shortcuts',
  },
];

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { enabled = true, onAction } = options;
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);

  const handleAction = useCallback(
    (action: ShortcutAction) => {
      if (onAction) {
        onAction(action);
        return;
      }

      switch (action) {
        case 'navigate_home':
          router.push('/');
          break;
        case 'navigate_oracle':
          router.push('/oracle');
          break;
        case 'navigate_disputes':
          router.push('/disputes');
          break;
        case 'navigate_alerts':
          router.push('/alerts');
          break;
        case 'navigate_audit':
          router.push('/audit');
          break;
        case 'navigate_watchlist':
          router.push('/watchlist');
          break;
        case 'navigate_my_assertions':
          router.push('/my-assertions');
          break;
        case 'navigate_my_disputes':
          router.push('/my-disputes');
          break;
        case 'toggle_search': {
          const searchInput = document.querySelector('[data-testid="search-input"]');
          if (searchInput instanceof HTMLInputElement) {
            searchInput.focus();
          }
          break;
        }
        case 'toggle_theme': {
          const themeToggle = document.querySelector('[data-testid="theme-toggle"]');
          if (themeToggle instanceof HTMLButtonElement) {
            themeToggle.click();
          }
          break;
        }
        case 'refresh_data':
          router.refresh();
          break;
        case 'go_back':
          window.history.back();
          break;
        case 'go_forward':
          window.history.forward();
          break;
        case 'scroll_top':
          window.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        case 'scroll_bottom':
          window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth',
          });
          break;
        case 'show_shortcuts':
          setShowHelp((prev) => !prev);
          break;
      }
    },
    [router, onAction],
  );

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const matchingShortcut = defaultShortcuts.find((shortcut) => {
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        return ctrlMatch && shiftMatch && altMatch && keyMatch;
      });

      if (matchingShortcut) {
        e.preventDefault();
        handleAction(matchingShortcut.action);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleAction]);

  return { showHelp, setShowHelp, shortcuts: defaultShortcuts };
}

interface KeyboardShortcutsHelpProps {
  show: boolean;
  onClose: () => void;
  shortcuts?: KeyboardShortcut[];
}

export function KeyboardShortcutsHelp({
  show,
  onClose,
  shortcuts = defaultShortcuts,
}: KeyboardShortcutsHelpProps) {
  const { t } = useI18n();

  const groupedShortcuts = shortcuts.reduce(
    (acc, shortcut) => {
      const category = getShortcutCategory(shortcut.action);
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(shortcut);
      return acc;
    },
    {} as Record<string, KeyboardShortcut[]>,
  );

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="dark:bg-dark-800 mx-4 max-h-[80vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dark:border-dark-700 flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold">{t('keyboardShortcuts.title')}</h2>
          <button
            onClick={onClose}
            className="dark:hover:bg-dark-700 rounded-lg p-2 transition-colors hover:bg-gray-100"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category} className="mb-6">
              <h3 className="dark:text-dark-400 mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between py-2">
                    <span className="dark:text-dark-200 text-sm text-gray-700">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.ctrl && (
                        <kbd className="dark:bg-dark-700 dark:border-dark-600 rounded border border-gray-200 bg-gray-100 px-2 py-1 text-xs font-medium">
                          Ctrl
                        </kbd>
                      )}
                      {shortcut.alt && (
                        <kbd className="dark:bg-dark-700 dark:border-dark-600 rounded border border-gray-200 bg-gray-100 px-2 py-1 text-xs font-medium">
                          Alt
                        </kbd>
                      )}
                      {shortcut.shift && (
                        <kbd className="dark:bg-dark-700 dark:border-dark-600 rounded border border-gray-200 bg-gray-100 px-2 py-1 text-xs font-medium">
                          Shift
                        </kbd>
                      )}
                      <kbd className="dark:bg-dark-700 dark:border-dark-600 rounded border border-gray-200 bg-gray-100 px-2 py-1 text-xs font-medium">
                        {shortcut.key.toUpperCase()}
                      </kbd>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="dark:border-dark-700 dark:bg-dark-900 border-t border-gray-200 bg-gray-50 p-4">
          <p className="dark:text-dark-400 text-center text-xs text-gray-500">
            {t('keyboardShortcuts.pressAny')}
          </p>
        </div>
      </div>
    </div>
  );
}

function getShortcutCategory(action: ShortcutAction): string {
  switch (action) {
    case 'navigate_home':
    case 'navigate_oracle':
    case 'navigate_disputes':
    case 'navigate_alerts':
    case 'navigate_audit':
    case 'navigate_watchlist':
    case 'navigate_my_assertions':
    case 'navigate_my_disputes':
      return 'Navigation';
    case 'toggle_search':
    case 'toggle_theme':
      return 'Actions';
    case 'refresh_data':
    case 'go_back':
    case 'go_forward':
    case 'scroll_top':
    case 'scroll_bottom':
      return 'General';
    case 'show_shortcuts':
      return 'Help';
    default:
      return 'Other';
  }
}
