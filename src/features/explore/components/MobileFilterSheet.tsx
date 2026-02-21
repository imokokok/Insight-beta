'use client';

import { useRef, useCallback, useEffect } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, Check } from 'lucide-react';

import { Button } from '@/components/ui';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { cn } from '@/shared/utils';

import type { TrendingSortBy } from '../types';
import type { PanInfo } from 'framer-motion';

interface FilterOption {
  value: string;
  label: string;
}

interface MobileFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  sortValue?: TrendingSortBy;
  onSortChange?: (value: TrendingSortBy) => void;
  sortOptions?: FilterOption[];
  onApply?: () => void;
  onReset?: () => void;
  children?: React.ReactNode;
}

const defaultSortOptions: FilterOption[] = [
  { value: 'volume', label: '交易量' },
  { value: 'volatility', label: '波动性' },
  { value: 'updateFrequency', label: '更新频率' },
  { value: 'popularity', label: '关注度' },
];

export function MobileFilterSheet({
  isOpen,
  onClose,
  title = '筛选',
  sortValue,
  onSortChange,
  sortOptions = defaultSortOptions,
  onApply,
  onReset,
  children,
}: MobileFilterSheetProps) {
  const isMobile = useIsMobile();
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.y > 100 || info.velocity.y > 500) {
        onClose();
      }
    },
    [onClose],
  );

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  const handleApply = useCallback(() => {
    onApply?.();
    onClose();
  }, [onApply, onClose]);

  const handleReset = useCallback(() => {
    onReset?.();
  }, [onReset]);

  if (!isMobile) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleBackdropClick}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            ref={sheetRef}
            className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-hidden rounded-t-2xl bg-background shadow-xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
          >
            <div className="sticky top-0 z-10 bg-background">
              <div className="flex justify-center pb-2 pt-3">
                <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
              </div>

              <div className="flex items-center justify-between border-b border-border px-4 pb-3">
                <h3 className="text-lg font-semibold">{title}</h3>
                <button
                  onClick={onClose}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2 transition-colors hover:bg-muted"
                  aria-label="关闭"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="max-h-[calc(85vh-180px)] overflow-y-auto overscroll-contain px-4 py-4">
              {sortOptions.length > 0 && onSortChange && (
                <div className="mb-6">
                  <h4 className="mb-3 text-sm font-medium text-muted-foreground">排序方式</h4>
                  <div className="space-y-2">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => onSortChange(option.value as TrendingSortBy)}
                        className={cn(
                          'flex min-h-[44px] w-full items-center justify-between rounded-lg p-3 transition-colors',
                          sortValue === option.value
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted/50 hover:bg-muted',
                        )}
                      >
                        <span className="font-medium">{option.label}</span>
                        {sortValue === option.value && <Check className="h-5 w-5 text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {children}
            </div>

            <div className="sticky bottom-0 flex gap-3 border-t border-border bg-background p-4">
              <Button variant="outline" onClick={handleReset} className="min-h-[44px] flex-1">
                <RotateCcw className="mr-2 h-4 w-4" />
                重置
              </Button>
              <Button onClick={handleApply} className="min-h-[44px] flex-1">
                <Check className="mr-2 h-4 w-4" />
                应用
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
