'use client';

import { useCallback } from 'react';

import { List } from 'lucide-react';

import { Button } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui';
import { ScrollArea } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

import type { FilterField } from './types';

interface FieldSelectorProps {
  fields: FilterField[];
  selectedFields: string[];
  onChange: (fields: string[]) => void;
  className?: string;
}

export function FieldSelector({ fields, selectedFields, onChange, className }: FieldSelectorProps) {
  const { t } = useI18n();

  const handleToggleField = useCallback(
    (fieldKey: string) => {
      if (selectedFields.includes(fieldKey)) {
        onChange(selectedFields.filter((key) => key !== fieldKey));
      } else {
        onChange([...selectedFields, fieldKey]);
      }
    },
    [selectedFields, onChange],
  );

  const handleSelectAll = useCallback(() => {
    onChange(fields.map((field) => field.key));
  }, [fields, onChange]);

  const handleClearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const selectedCount = selectedFields.length;
  const totalCount = fields.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-9 gap-1.5 px-3 text-sm font-medium transition-all duration-200',
            'border-border/50 bg-card/50 backdrop-blur-sm',
            'hover:border-primary/30 hover:bg-primary/5',
            selectedCount > 0 && 'border-primary/40 bg-primary/5 text-primary',
            className,
          )}
        >
          <List className="h-4 w-4" />
          <span className="truncate">
            {selectedCount === totalCount
              ? 'All fields'
              : selectedCount === 0
                ? 'Select fields'
                : `${selectedCount}/${totalCount}`}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 border-border/50 bg-card/95 shadow-lg shadow-primary/5 backdrop-blur-xl"
        align="start"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Select Fields</span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleSelectAll}
              >
                {t('common.selectAll')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleClearAll}
              >
                {t('common.clearAll')}
              </Button>
            </div>
          </div>

          <ScrollArea className="h-64 rounded-md border">
            <div className="space-y-1 p-2">
              {fields.map((field) => {
                const isSelected = selectedFields.includes(field.key);
                return (
                  <div
                    key={field.key}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors',
                      isSelected ? 'bg-primary/10' : 'hover:bg-muted/50',
                    )}
                    onClick={() => handleToggleField(field.key)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleField(field.key)}
                      className="h-4 w-4"
                    />
                    <span className="flex-1 truncate text-sm">{field.label}</span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
