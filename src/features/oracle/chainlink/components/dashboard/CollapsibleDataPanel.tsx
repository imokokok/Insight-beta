import React, { useState, useCallback } from 'react';

import { motion, AnimatePresence } from 'framer-motion';

import { Badge } from '@/components/ui';
import { cn } from '@/shared/utils';

interface CollapsibleDataPanelProps {
  title: string;
  icon?: React.ReactNode;
  badge?: string | number;
  badgeVariant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  defaultExpanded?: boolean;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  onExpandChange?: (expanded: boolean) => void;
  storageKey?: string;
}

export function CollapsibleDataPanel({
  title,
  icon,
  badge,
  badgeVariant = 'default',
  defaultExpanded = true,
  children,
  className,
  headerClassName,
  contentClassName,
  onExpandChange,
  storageKey,
}: CollapsibleDataPanelProps) {
  const getStoredState = useCallback(() => {
    if (storageKey && typeof window !== 'undefined') {
      const stored = localStorage.getItem(`panel-${storageKey}`);
      if (stored !== null) {
        return stored === 'true';
      }
    }
    return defaultExpanded;
  }, [defaultExpanded, storageKey]);

  const [isExpanded, setIsExpanded] = useState(getStoredState);

  const handleToggle = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);

    if (storageKey && typeof window !== 'undefined') {
      localStorage.setItem(`panel-${storageKey}`, String(newState));
    }

    onExpandChange?.(newState);
  };

  const badgeVariantMap: Record<string, string> = {
    default: 'bg-primary/20 text-primary',
    success: 'bg-success/20 text-success',
    warning: 'bg-warning/20 text-warning',
    error: 'bg-error/20 text-error',
    info: 'bg-info/20 text-info',
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded border border-border/20 bg-[rgba(15,23,42,0.8)]',
        'backdrop-blur-sm transition-all duration-200',
        className,
      )}
    >
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          'flex w-full items-center justify-between px-4 py-3',
          'text-left transition-colors duration-200',
          'hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          headerClassName,
        )}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          {icon && (
            <span className="flex h-5 w-5 items-center justify-center text-primary">{icon}</span>
          )}
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {badge !== undefined && (
            <Badge
              variant="outline"
              className={cn('ml-1 border-0 text-[10px] font-medium', badgeVariantMap[badgeVariant])}
            >
              {badge}
            </Badge>
          )}
        </div>

        <motion.span
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="flex h-5 w-5 items-center justify-center text-muted-foreground"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className={cn('border-t border-border/10 px-4 py-3', contentClassName)}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CollapsibleDataPanel;
