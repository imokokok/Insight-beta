'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

import { useRouter } from 'next/navigation';

import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command, ArrowRight } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

import { defaultNavConfig } from './EnhancedSidebar';

interface QuickSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchItem {
  id: string;
  label: string;
  href: string;
  description?: string;
}

export function QuickSearch({ isOpen, onClose }: QuickSearchProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const searchItems: SearchItem[] = useMemo(() => {
    const items: SearchItem[] = [];
    defaultNavConfig.groups.forEach((group) => {
      group.items.forEach((item) => {
        if (item.href) {
          items.push({
            id: item.id,
            label: t(item.label),
            href: item.href,
            description: item.description ? t(item.description) : undefined,
          });
        }
      });
    });
    return items;
  }, [t]);

  const filteredItems = useMemo(() => {
    if (!query) return searchItems;
    const lowerQuery = query.toLowerCase();
    return searchItems.filter(
      (item) =>
        item.label.toLowerCase().includes(lowerQuery) ||
        item.description?.toLowerCase().includes(lowerQuery),
    );
  }, [query, searchItems]);

  const handleSelect = useCallback(
    (item: SearchItem) => {
      router.push(item.href as any);
      onClose();
      setQuery('');
    },
    [router, onClose],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
        e.preventDefault();
        handleSelect(filteredItems[selectedIndex]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [isOpen, filteredItems, selectedIndex, handleSelect, onClose],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2"
          >
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
              <div className="flex items-center gap-3 border-b border-border px-4">
                <Search className="h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t('nav.labels.search')}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-12 border-0 bg-transparent px-0 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                  autoFocus
                />
                <kbd className="hidden h-6 items-center gap-1 rounded border border-border bg-muted px-2 text-xs font-medium text-muted-foreground sm:inline-flex">
                  ESC
                </kbd>
              </div>

              <div className="max-h-80 overflow-y-auto p-2">
                {filteredItems.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <p>未找到匹配的页面</p>
                  </div>
                ) : (
                  filteredItems.map((item, index) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                        index === selectedIndex ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
                      )}
                    >
                      <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{item.label}</div>
                        {item.description && (
                          <div className="truncate text-sm text-muted-foreground">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="h-5 rounded border border-border bg-muted px-1.5 text-[10px]">
                      ↑
                    </kbd>
                    <kbd className="h-5 rounded border border-border bg-muted px-1.5 text-[10px]">
                      ↓
                    </kbd>
                    <span>导航</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="h-5 rounded border border-border bg-muted px-1.5 text-[10px]">
                      ↵
                    </kbd>
                    <span>选择</span>
                  </span>
                </div>
                <span className="flex items-center gap-1">
                  <Command className="h-3 w-3" />
                  <kbd className="h-5 rounded border border-border bg-muted px-1.5 text-[10px]">
                    K
                  </kbd>
                  <span>关闭</span>
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function useQuickSearch() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return { isOpen, open, close, toggle };
}
