'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

import { Search, X, Loader2 } from 'lucide-react';

import { Input } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

import { SearchResults } from './SearchResults';
import { useGlobalSearch } from '../hooks/useGlobalSearch';

import type { SearchResult } from '../types';

interface GlobalSearchProps {
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

export function GlobalSearch({ className, placeholder, autoFocus = false }: GlobalSearchProps) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { query, setQuery, results, total, isLoading, error, clearSearch } = useGlobalSearch();

  const handleResultSelect = useCallback(
    (result: SearchResult) => {
      window.location.href = result.url;
      setIsOpen(false);
      clearSearch();
    },
    [clearSearch],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const totalResults = results.length;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % totalResults);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + totalResults) % totalResults);
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleResultSelect(results[selectedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          inputRef.current?.blur();
          break;
      }
    },
    [results, selectedIndex, handleResultSelect],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);
      setIsOpen(value.trim().length >= 2);
      setSelectedIndex(0);
    },
    [setQuery],
  );

  const handleClear = useCallback(() => {
    clearSearch();
    setIsOpen(false);
    inputRef.current?.focus();
  }, [clearSearch]);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const showResults = isOpen && (results.length > 0 || isLoading || error);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim().length >= 2) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder || t('explore.search.placeholder')}
          autoFocus={autoFocus}
          className="pl-10 pr-10"
          aria-label={t('explore.search.ariaLabel')}
          aria-expanded={showResults}
          aria-haspopup="listbox"
          role="combobox"
        />

        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}

          {query && !isLoading && (
            <button
              onClick={handleClear}
              className="rounded-sm p-1 transition-colors hover:bg-muted"
              aria-label={t('explore.search.clearAriaLabel')}
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {showResults && (
        <div
          className="bg-popover absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-border shadow-lg"
          role="listbox"
        >
          {isLoading && results.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              <span>{t('explore.search.searching')}</span>
            </div>
          ) : error ? (
            <div className="text-destructive px-4 py-8 text-center">
              <p>{t('explore.search.searchFailed')}</p>
            </div>
          ) : (
            <>
              <SearchResults
                results={results}
                query={query}
                selectedIndex={selectedIndex}
                onSelect={handleResultSelect}
                onHover={setSelectedIndex}
              />

              {total > results.length && (
                <div className="border-t border-border px-4 py-3 text-center text-sm text-muted-foreground">
                  {t('explore.search.showingResults', { count: results.length, total })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
