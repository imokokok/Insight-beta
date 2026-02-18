'use client';

import { useState, useCallback, memo } from 'react';

import { Check, ChevronDown, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';
import { PROTOCOL_DISPLAY_NAMES, type OracleProtocol } from '@/types/oracle';

interface ProtocolSelectorProps {
  availableProtocols: OracleProtocol[];
  selectedProtocols: OracleProtocol[];
  onSelectionChange: (protocols: OracleProtocol[]) => void;
  maxSelections?: number;
  className?: string;
  disabled?: boolean;
}

export const ProtocolSelector = memo(function ProtocolSelector({
  availableProtocols,
  selectedProtocols,
  onSelectionChange,
  maxSelections = 4,
  className,
  disabled = false,
}: ProtocolSelectorProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredProtocols = availableProtocols.filter(
    (protocol) =>
      protocol.toLowerCase().includes(search.toLowerCase()) ||
      PROTOCOL_DISPLAY_NAMES[protocol].toLowerCase().includes(search.toLowerCase()),
  );

  const handleToggle = useCallback(
    (protocol: OracleProtocol) => {
      const isSelected = selectedProtocols.includes(protocol);
      if (isSelected) {
        onSelectionChange(selectedProtocols.filter((p) => p !== protocol));
      } else if (selectedProtocols.length < maxSelections) {
        onSelectionChange([...selectedProtocols, protocol]);
      }
    },
    [selectedProtocols, onSelectionChange, maxSelections],
  );

  const handleRemove = useCallback(
    (protocol: OracleProtocol) => {
      onSelectionChange(selectedProtocols.filter((p) => p !== protocol));
    },
    [selectedProtocols, onSelectionChange],
  );

  const handleClear = useCallback(() => {
    onSelectionChange([]);
  }, [onSelectionChange]);

  const canSelectMore = selectedProtocols.length < maxSelections;

  return (
    <div className={cn('space-y-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between"
          >
            <span className="truncate">
              {selectedProtocols.length === 0
                ? t('comparison.protocolCompare.selectProtocols')
                : t('comparison.protocolCompare.selectedCount', {
                    count: selectedProtocols.length,
                    max: maxSelections,
                  })}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-2">
            <Input
              placeholder={t('comparison.protocolCompare.searchProtocol')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredProtocols.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {t('comparison.protocolCompare.noProtocolFound')}
              </div>
            ) : (
              filteredProtocols.map((protocol) => {
                const isSelected = selectedProtocols.includes(protocol);
                const isDisabled = !isSelected && !canSelectMore;

                return (
                  <button
                    key={protocol}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => handleToggle(protocol)}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
                      'hover:text-accent-foreground hover:bg-accent',
                      isDisabled && 'cursor-not-allowed opacity-50',
                      isSelected && 'bg-accent/50',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                        isSelected ? 'text-primary-foreground bg-primary' : 'opacity-50',
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <span className="capitalize">{PROTOCOL_DISPLAY_NAMES[protocol]}</span>
                    {isSelected && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {t('comparison.protocolCompare.selected')}
                      </Badge>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {selectedProtocols.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {selectedProtocols.map((protocol) => (
            <Badge
              key={protocol}
              variant="secondary"
              className="flex items-center gap-1 pr-1 capitalize"
            >
              {PROTOCOL_DISPLAY_NAMES[protocol]}
              <button
                type="button"
                onClick={() => handleRemove(protocol)}
                className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selectedProtocols.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={disabled}
              className="h-6 px-2 text-xs"
            >
              {t('comparison.controls.clear')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
});
