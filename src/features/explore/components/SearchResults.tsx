'use client';

import { useMemo } from 'react';

import { Database, Link2, Wallet, Layers, ArrowRight, type LucideIcon } from 'lucide-react';

import { cn } from '@/shared/utils';

import type { SearchResult } from '../types';

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  selectedIndex: number;
  onSelect: (result: SearchResult) => void;
  onHover: (index: number) => void;
}

type ResultType = SearchResult['type'];

interface TypeConfig {
  icon: LucideIcon;
  label: string;
  color: string;
  bgColor: string;
}

const typeConfig: Record<ResultType, TypeConfig> = {
  feed: {
    icon: Database,
    label: '交易对',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  protocol: {
    icon: Link2,
    label: '协议',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  address: {
    icon: Wallet,
    label: '地址',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  chain: {
    icon: Layers,
    label: '链',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
};

function highlightText(text: string, query: string) {
  if (!query.trim()) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let index = lowerText.indexOf(lowerQuery);

  while (index !== -1) {
    if (index > lastIndex) {
      parts.push(text.substring(lastIndex, index));
    }
    parts.push(
      <mark key={index} className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-800/50">
        {text.substring(index, index + query.length)}
      </mark>,
    );
    lastIndex = index + query.length;
    index = lowerText.indexOf(lowerQuery, lastIndex);
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

function groupResultsByType(results: SearchResult[]): Map<ResultType, SearchResult[]> {
  const grouped = new Map<ResultType, SearchResult[]>();

  results.forEach((result) => {
    const existing = grouped.get(result.type) || [];
    grouped.set(result.type, [...existing, result]);
  });

  return grouped;
}

export function SearchResults({
  results,
  query,
  selectedIndex,
  onSelect,
  onHover,
}: SearchResultsProps) {
  const groupedResults = useMemo(() => groupResultsByType(results), [results]);

  const typeOrder: ResultType[] = ['feed', 'protocol', 'address', 'chain'];

  if (results.length === 0) {
    return null;
  }

  let globalIndex = 0;

  return (
    <div className="max-h-[400px] overflow-y-auto py-2">
      {typeOrder.map((type) => {
        const typeResults = groupedResults.get(type);
        if (!typeResults || typeResults.length === 0) return null;

        const config = typeConfig[type];
        const Icon = config.icon;

        return (
          <div key={type} className="mb-2">
            <div className="flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Icon className={cn('h-3.5 w-3.5', config.color)} />
              <span>{config.label}</span>
              <span className="ml-auto rounded-full bg-muted px-2 py-0.5">
                {typeResults.length}
              </span>
            </div>

            {typeResults.map((result) => {
              const currentIndex = globalIndex++;
              const isSelected = currentIndex === selectedIndex;

              return (
                <div
                  key={result.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors',
                    isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50',
                  )}
                  onClick={() => onSelect(result)}
                  onMouseEnter={() => onHover(currentIndex)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg',
                      config.bgColor,
                    )}
                  >
                    <Icon className={cn('h-4 w-4', config.color)} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-foreground">
                      {highlightText(result.title, query)}
                    </div>
                    <div className="truncate text-sm text-muted-foreground">
                      {highlightText(result.subtitle, query)}
                    </div>
                  </div>

                  <ArrowRight
                    className={cn(
                      'h-4 w-4 flex-shrink-0 transition-opacity',
                      isSelected ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
