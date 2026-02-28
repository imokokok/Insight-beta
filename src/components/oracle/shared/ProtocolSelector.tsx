'use client';

import * as React from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Layers } from 'lucide-react';

import {
  Badge,
  Button,
  Checkbox,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
} from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';
import type { OracleProtocol } from '@/types/oracle/protocol';

export interface ProtocolOption {
  id: OracleProtocol;
  name: string;
  icon?: React.ReactNode;
  description?: string;
  feedCount?: number;
}

export interface ProtocolSelectorProps {
  options: ProtocolOption[];
  selected: OracleProtocol[];
  onChange: (selected: OracleProtocol[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxVisible?: number;
  showFeedCount?: boolean;
}

const ProtocolSelector = React.memo(function ProtocolSelector({
  options,
  selected,
  onChange,
  placeholder,
  className,
  disabled = false,
  maxVisible = 3,
  showFeedCount = false,
}: ProtocolSelectorProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = React.useState(false);

  const isAllSelected = selected.length === options.length;

  const handleToggle = (protocolId: OracleProtocol) => {
    if (selected.includes(protocolId)) {
      onChange(selected.filter((id) => id !== protocolId));
    } else {
      onChange([...selected, protocolId]);
    }
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange(options.map((opt) => opt.id));
    }
  };

  const displayPlaceholder = placeholder || t('oracle.selector.selectProtocol');

  const displayText = React.useMemo(() => {
    if (selected.length === 0) {
      return displayPlaceholder;
    }
    if (selected.length <= maxVisible) {
      const names = selected.map((id) => {
        const opt = options.find((o) => o.id === id);
        return opt?.name || id;
      });
      return names.join(', ');
    }
    return t('oracle.selector.selectedCount', { count: selected.length });
  }, [selected, options, maxVisible, displayPlaceholder, t]);

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
            <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="border-b p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t('oracle.selector.protocolList')}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="h-7 px-2 text-xs"
            >
              {isAllSelected ? t('common.unselectAll') : t('common.selectAll')}
            </Button>
          </div>
          {selected.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t('oracle.selector.selectedCount', { count: selected.length })}
            </p>
          )}
        </div>

        <ScrollArea className="h-[300px]">
          <div className="p-2">
            <AnimatePresence>
              {options.map((option) => {
                const isSelected = selected.includes(option.id);
                return (
                  <motion.div
                    key={option.id}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg p-2.5 transition-colors',
                      'hover:bg-muted/50',
                      isSelected && 'bg-primary/5',
                    )}
                    onClick={() => handleToggle(option.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggle(option.id)}
                    />
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {option.icon || <Layers className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{option.name}</p>
                      {option.description && (
                        <p className="truncate text-xs text-muted-foreground">
                          {option.description}
                        </p>
                      )}
                    </div>
                    {showFeedCount && option.feedCount !== undefined && (
                      <Badge variant="outline" className="text-xs">
                        {option.feedCount} {t('oracle.feeds')}
                      </Badge>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
});

ProtocolSelector.displayName = 'ProtocolSelector';

export { ProtocolSelector };
