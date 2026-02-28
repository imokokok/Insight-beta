'use client';

import * as React from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, Coins, X } from 'lucide-react';

import {
  Badge,
  Button,
  Checkbox,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
} from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

export interface SymbolOption {
  symbol: string;
  name: string;
  price?: number;
  change24h?: number;
  category?: string;
}

export interface SymbolSelectorProps {
  options: SymbolOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxVisible?: number;
  showPrice?: boolean;
  groupByCategory?: boolean;
}

const SymbolSelector = React.memo(function SymbolSelector({
  options,
  selected,
  onChange,
  placeholder,
  className,
  disabled = false,
  maxVisible = 3,
  showPrice = false,
  groupByCategory = false,
}: SymbolSelectorProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(
      (opt) => opt.symbol.toLowerCase().includes(query) || opt.name.toLowerCase().includes(query),
    );
  }, [options, searchQuery]);

  const groupedOptions = React.useMemo(() => {
    if (!groupByCategory) return { all: filteredOptions };
    return filteredOptions.reduce(
      (acc, opt) => {
        const category = opt.category || 'other';
        if (!acc[category]) acc[category] = [];
        acc[category].push(opt);
        return acc;
      },
      {} as Record<string, SymbolOption[]>,
    );
  }, [filteredOptions, groupByCategory]);

  const handleToggle = (symbol: string) => {
    if (selected.includes(symbol)) {
      onChange(selected.filter((s) => s !== symbol));
    } else {
      onChange([...selected, symbol]);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const displayPlaceholder = placeholder || t('oracle.selector.selectSymbol');

  const displayText = React.useMemo(() => {
    if (selected.length === 0) {
      return displayPlaceholder;
    }
    if (selected.length <= maxVisible) {
      return selected.join(', ');
    }
    return t('oracle.selector.selectedCount', { count: selected.length });
  }, [selected, maxVisible, displayPlaceholder, t]);

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    return `$${price.toFixed(6)}`;
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-10 min-w-[200px] justify-between font-normal',
            selected.length > 0 ? 'text-foreground' : 'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate">{displayText}</span>
          <div className="ml-2 flex items-center gap-2">
            {selected.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {selected.length}
              </Badge>
            )}
            {selected.length > 0 ? (
              <X
                className="h-4 w-4 text-muted-foreground hover:text-foreground"
                onClick={handleClear}
              />
            ) : (
              <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="border-b p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('common.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9"
            />
          </div>
          {selected.length > 0 && (
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {t('oracle.selector.selectedCount', { count: selected.length })}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange([])}
                className="h-6 px-2 text-xs"
              >
                {t('common.clear')}
              </Button>
            </div>
          )}
        </div>

        <ScrollArea className="h-[300px]">
          {filteredOptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Coins className="mb-2 h-8 w-8" />
              <p className="text-sm">{t('common.noResults')}</p>
            </div>
          ) : (
            <div className="p-2">
              {Object.entries(groupedOptions).map(([category, opts]) => (
                <div key={category}>
                  {groupByCategory && category !== 'all' && (
                    <div className="px-2 py-1.5 text-xs font-medium uppercase text-muted-foreground">
                      {category}
                    </div>
                  )}
                  <AnimatePresence>
                    {opts.map((option) => {
                      const isSelected = selected.includes(option.symbol);
                      return (
                        <motion.div
                          key={option.symbol}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className={cn(
                            'flex cursor-pointer items-center gap-3 rounded-lg p-2.5 transition-colors',
                            'hover:bg-muted/50',
                            isSelected && 'bg-primary/5',
                          )}
                          onClick={() => handleToggle(option.symbol)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggle(option.symbol)}
                          />
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-xs font-bold text-primary">
                            {option.symbol.slice(0, 2)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground">{option.symbol}</p>
                            <p className="truncate text-xs text-muted-foreground">{option.name}</p>
                          </div>
                          {showPrice && option.price !== undefined && (
                            <div className="text-right">
                              <p className="text-sm font-medium text-foreground">
                                {formatPrice(option.price)}
                              </p>
                              {option.change24h !== undefined && (
                                <p
                                  className={cn(
                                    'text-xs',
                                    option.change24h >= 0 ? 'text-success' : 'text-error',
                                  )}
                                >
                                  {formatChange(option.change24h)}
                                </p>
                              )}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
});

SymbolSelector.displayName = 'SymbolSelector';

export { SymbolSelector };
