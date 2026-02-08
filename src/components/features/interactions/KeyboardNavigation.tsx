'use client';

import type { ReactNode } from 'react';
import { useEffect, useCallback, useState, useRef } from 'react';

import { cn } from '@/lib/utils';

// Hook for keyboard navigation
interface UseKeyboardNavigationOptions {
  itemCount: number;
  onSelect?: (index: number) => void;
  onEscape?: () => void;
  loop?: boolean;
}

export function useKeyboardNavigation({
  itemCount,
  onSelect,
  onEscape,
  loop = true,
}: UseKeyboardNavigationOptions) {
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          event.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev + 1;
            if (next >= itemCount) {
              return loop ? 0 : prev;
            }
            return next;
          });
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          event.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev - 1;
            if (next < 0) {
              return loop ? itemCount - 1 : prev;
            }
            return next;
          });
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < itemCount) {
            onSelect?.(focusedIndex);
          }
          break;
        case 'Escape':
          event.preventDefault();
          onEscape?.();
          setFocusedIndex(-1);
          break;
        case 'Home':
          event.preventDefault();
          setFocusedIndex(0);
          break;
        case 'End':
          event.preventDefault();
          setFocusedIndex(itemCount - 1);
          break;
      }
    },
    [itemCount, focusedIndex, onSelect, onEscape, loop],
  );

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
  };
}

// Keyboard navigable list
interface KeyboardNavigableListProps<T> {
  items: T[];
  renderItem: (item: T, index: number, isFocused: boolean) => ReactNode;
  onSelect?: (item: T, index: number) => void;
  className?: string;
  itemClassName?: string;
}

export function KeyboardNavigableList<T>({
  items,
  renderItem,
  onSelect,
  className,
  itemClassName,
}: KeyboardNavigableListProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const { focusedIndex, setFocusedIndex, handleKeyDown } = useKeyboardNavigation({
    itemCount: items.length,
    onSelect: (index) => {
      const item = items[index];
      if (item !== undefined) {
        onSelect?.(item, index);
      }
    },
  });

  useEffect(() => {
    const element = listRef.current;
    if (!element) return;
    element.addEventListener('keydown', handleKeyDown);
    return () => element.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const focusedElement = listRef.current.children[focusedIndex] as HTMLElement;
      if (focusedElement) {
        focusedElement.focus();
        focusedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex]);

  return (
    <div
      ref={listRef}
      className={cn('outline-none', className)}
      tabIndex={0}
      role="listbox"
      aria-activedescendant={focusedIndex >= 0 ? `item-${focusedIndex}` : undefined}
    >
      {items.map((item, index) => (
        <div
          key={index}
          id={`item-${index}`}
          role="option"
          aria-selected={focusedIndex === index}
          tabIndex={-1}
          className={cn(
            'cursor-pointer outline-none transition-colors',
            focusedIndex === index && 'bg-primary/10 ring-primary/50 ring-2',
            itemClassName,
          )}
          onClick={() => {
            setFocusedIndex(index);
            onSelect?.(item, index);
          }}
          onMouseEnter={() => setFocusedIndex(index)}
        >
          {renderItem(item, index, focusedIndex === index)}
        </div>
      ))}
    </div>
  );
}

// Shortcut key handler
interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  handler: () => void;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: ShortcutConfig[];
  enabled?: boolean;
}

export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      shortcuts.forEach((shortcut) => {
        const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const matchesCtrl = !!shortcut.ctrl === event.ctrlKey;
        const matchesAlt = !!shortcut.alt === event.altKey;
        const matchesShift = !!shortcut.shift === event.shiftKey;
        const matchesMeta = !!shortcut.meta === event.metaKey;

        if (matchesKey && matchesCtrl && matchesAlt && matchesShift && matchesMeta) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.handler();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}

// Focus trap for modals
interface FocusTrapProps {
  children: ReactNode;
  isActive: boolean;
  className?: string;
}

export function FocusTrap({ children, isActive, className }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Focus first element when activated
    firstElement?.focus();

    container.addEventListener('keydown', handleTabKey);
    return () => container.removeEventListener('keydown', handleTabKey);
  }, [isActive]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

// Skip to main content link
interface SkipLinkProps {
  mainContentId: string;
  className?: string;
}

export function SkipLink({ mainContentId, className }: SkipLinkProps) {
  const handleClick = () => {
    const mainContent = document.getElementById(mainContentId);
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView();
    }
  };

  return (
    <a
      href={`#${mainContentId}`}
      onClick={handleClick}
      className={cn(
        'sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4',
        'bg-primary text-primary-foreground z-50 rounded-lg px-4 py-2',
        'focus:ring-primary focus:outline-none focus:ring-2 focus:ring-offset-2',
        className,
      )}
    >
      Skip to main content
    </a>
  );
}

// Keyboard shortcut display
interface KeyboardShortcutDisplayProps {
  shortcut: string;
  className?: string;
}

export function KeyboardShortcutDisplay({ shortcut, className }: KeyboardShortcutDisplayProps) {
  const keys = shortcut.split('+');

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {keys.map((key, index) => (
        <span key={index} className="flex items-center gap-1">
          <kbd className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">{key.trim()}</kbd>
          {index < keys.length - 1 && <span className="text-muted-foreground">+</span>}
        </span>
      ))}
    </span>
  );
}

// Accessible button with keyboard support
interface AccessibleButtonProps {
  children: ReactNode;
  onClick?: () => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  ariaPressed?: boolean;
  ariaExpanded?: boolean;
  ariaControls?: string;
}

export function AccessibleButton({
  children,
  onClick,
  onKeyDown,
  disabled,
  className,
  ariaLabel,
  ariaPressed,
  ariaExpanded,
  ariaControls,
}: AccessibleButtonProps) {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick?.();
    }
    onKeyDown?.(event);
  };

  return (
    <button
      onClick={onClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={cn(
        'focus:ring-primary focus:outline-none focus:ring-2 focus:ring-offset-2',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
    >
      {children}
    </button>
  );
}
