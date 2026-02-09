/**
 * ============================================================================
 * Interactive Icons Demo Page
 * ============================================================================
 *
 * 图标交互和键盘导航功能演示页面
 */

'use client';

import { useState, useRef } from 'react';

import {
  Home,
  Settings,
  Bell,
  Search,
  RefreshCw,
  Heart,
  Star,
  Trash2,
  Edit,
  Check,
  X,
  Menu,
  ChevronRight,
  ChevronLeft,
  ArrowUp,
  ArrowDown,
  Plus,
  Minus,
  Maximize2,
  Minimize2,
} from 'lucide-react';

import { InteractiveIcon } from '@/components/common/InteractiveIcon';
import { ShortcutsHelp } from '@/components/common/ShortcutsHelp';
import { useIconInteraction, useKeyboardNavigation, useAppShortcuts } from '@/hooks';
import { cn } from '@/lib/utils';

// ============================================================================
// Demo Components
// ============================================================================

function IconGrid() {
  const icons = [
    Home,
    Settings,
    Bell,
    Search,
    RefreshCw,
    Heart,
    Star,
    Trash2,
    Edit,
    Check,
    X,
    Menu,
    ChevronRight,
    ChevronLeft,
    ArrowUp,
    ArrowDown,
    Plus,
    Minus,
    Maximize2,
    Minimize2,
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-4 sm:grid-cols-10">
        {icons.map((Icon, index) => (
          <div
            key={index}
            className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <InteractiveIcon icon={Icon} size={24} hoverScale={1.2} customAnimation="bounce" />
            <span className="text-xs text-gray-400">{Icon.displayName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function IconStates() {
  const loadingInteraction = useIconInteraction({
    customAnimation: 'spin',
  });

  const successInteraction = useIconInteraction({
    customAnimation: 'bounce',
  });

  const errorInteraction = useIconInteraction({
    customAnimation: 'shake',
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => {
            loadingInteraction.setLoading(true);
            setTimeout(() => {
              loadingInteraction.setLoading(false);
              successInteraction.setSuccess();
            }, 2000);
          }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Simulate Loading → Success
        </button>
        <button
          onClick={() => {
            loadingInteraction.setLoading(true);
            setTimeout(() => {
              loadingInteraction.setLoading(false);
              errorInteraction.setError();
            }, 2000);
          }}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Simulate Loading → Error
        </button>
      </div>

      <div className="flex gap-8">
        <div className="flex flex-col items-center gap-2">
          <InteractiveIcon icon={RefreshCw} size={32} {...loadingInteraction.handlers} />
          <span className="text-sm text-gray-600">Loading</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <InteractiveIcon icon={Check} size={32} {...successInteraction.handlers} />
          <span className="text-sm text-gray-600">Success</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <InteractiveIcon icon={X} size={32} {...errorInteraction.handlers} />
          <span className="text-sm text-gray-600">Error</span>
        </div>
      </div>
    </div>
  );
}

function KeyboardNavigationDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { focusedIndex, handlers } = useKeyboardNavigation({
    containerRef: containerRef as React.RefObject<HTMLElement | null>,
    orientation: 'both',
    loop: true,
  });

  const items = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Use arrow keys to navigate, Enter to activate. Current focus: {focusedIndex}
      </p>

      <div ref={containerRef} className="grid grid-cols-4 gap-4" {...handlers}>
        {items.map((item, index) => (
          <button
            key={item}
            data-nav-item
            tabIndex={0}
            className={cn(
              'flex h-20 items-center justify-center rounded-xl border-2 text-2xl font-bold transition-all',
              focusedIndex === index
                ? 'border-purple-500 bg-purple-50 text-purple-700'
                : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300',
            )}
          >
            {item + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

function GlobalShortcutsDemo() {
  const [showHelp, setShowHelp] = useState(false);
  const [lastAction, setLastAction] = useState<string>('');

  useAppShortcuts({
    goHome: () => setLastAction('Navigated to Home'),
    goToDashboard: () => setLastAction('Navigated to Dashboard'),
    goToProtocols: () => setLastAction('Navigated to Protocols'),
    openSearch: () => setLastAction('Opened Search'),
    refreshData: () => setLastAction('Refreshed Data'),
    toggleSidebar: () => setLastAction('Toggled Sidebar'),
    openHelp: () => setLastAction('Opened Help'),
    openShortcutsHelp: () => setShowHelp(true),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-gray-50 p-4">
        <p className="text-sm text-gray-600">Last action:</p>
        <p className="text-lg font-medium text-purple-700">{lastAction || 'None'}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 p-3">
          <kbd className="rounded bg-gray-100 px-2 py-1 text-sm">Ctrl+H</kbd>
          <p className="mt-1 text-xs text-gray-600">Go Home</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-3">
          <kbd className="rounded bg-gray-100 px-2 py-1 text-sm">Ctrl+D</kbd>
          <p className="mt-1 text-xs text-gray-600">Dashboard</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-3">
          <kbd className="rounded bg-gray-100 px-2 py-1 text-sm">Ctrl+P</kbd>
          <p className="mt-1 text-xs text-gray-600">Protocols</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-3">
          <kbd className="rounded bg-gray-100 px-2 py-1 text-sm">Ctrl+K</kbd>
          <p className="mt-1 text-xs text-gray-600">Search</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-3">
          <kbd className="rounded bg-gray-100 px-2 py-1 text-sm">Ctrl+R</kbd>
          <p className="mt-1 text-xs text-gray-600">Refresh</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-3">
          <kbd className="rounded bg-gray-100 px-2 py-1 text-sm">?</kbd>
          <p className="mt-1 text-xs text-gray-600">Shortcuts Help</p>
        </div>
      </div>

      <button
        onClick={() => setShowHelp(true)}
        className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
      >
        Show All Shortcuts
      </button>

      <ShortcutsHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function InteractiveIconsDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl space-y-12">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">
            Interactive Icons & Keyboard Navigation
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Demonstrating icon interactions and keyboard accessibility features
          </p>
        </div>

        {/* Icon Grid Demo */}
        <section className="rounded-2xl bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">Icon Grid with Batch Animation</h2>
          <IconGrid />
        </section>

        {/* Icon States Demo */}
        <section className="rounded-2xl bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">
            Icon States (Loading, Success, Error)
          </h2>
          <IconStates />
        </section>

        {/* Keyboard Navigation Demo */}
        <section className="rounded-2xl bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">Keyboard Navigation</h2>
          <KeyboardNavigationDemo />
        </section>

        {/* Global Shortcuts Demo */}
        <section className="rounded-2xl bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">Global Keyboard Shortcuts</h2>
          <GlobalShortcutsDemo />
        </section>

        {/* Instructions */}
        <section className="rounded-2xl bg-gradient-to-r from-purple-50 to-blue-50 p-8">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">How to Use</h2>
          <ul className="list-inside list-disc space-y-2 text-gray-700">
            <li>Hover over icons to see scale animation</li>
            <li>Click icons to see ripple effect</li>
            <li>Use arrow keys in the Keyboard Navigation section</li>
            <li>Try global shortcuts: Ctrl+H, Ctrl+D, Ctrl+P, etc.</li>
            <li>Press ? to open the shortcuts help dialog</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
