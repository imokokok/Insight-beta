'use client';

import { useCallback } from 'react';

import { Filter, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { cn } from '@/shared/utils';

import type { FilterCondition, FilterField, FilterOperator } from './types';

interface ConditionFilterProps {
  fields: FilterField[];
  conditions: FilterCondition[];
  onChange: (conditions: FilterCondition[]) => void;
  className?: string;
}

const OPERATOR_LABELS: Record<FilterOperator, string> = {
  equals: '=',
  notEquals: '≠',
  greaterThan: '>',
  greaterThanOrEqual: '≥',
  lessThan: '<',
  lessThanOrEqual: '≤',
  contains: 'Contains',
  notContains: 'Not contains',
  startsWith: 'Starts with',
  endsWith: 'Ends with',
  in: 'In',
  notIn: 'Not in',
  between: 'Between',
  notBetween: 'Not between',
};

function getOperatorsForFieldType(fieldType: string): FilterOperator[] {
  switch (fieldType) {
    case 'string':
      return [
        'equals',
        'notEquals',
        'contains',
        'notContains',
        'startsWith',
        'endsWith',
        'in',
        'notIn',
      ];
    case 'number':
      return [
        'equals',
        'notEquals',
        'greaterThan',
        'greaterThanOrEqual',
        'lessThan',
        'lessThanOrEqual',
        'between',
        'notBetween',
        'in',
        'notIn',
      ];
    case 'boolean':
      return ['equals', 'notEquals'];
    case 'date':
      return [
        'equals',
        'notEquals',
        'greaterThan',
        'greaterThanOrEqual',
        'lessThan',
        'lessThanOrEqual',
        'between',
        'notBetween',
      ];
    case 'array':
      return ['in', 'notIn', 'contains', 'notContains'];
    default:
      return ['equals', 'notEquals'];
  }
}

export function ConditionFilter({ fields, conditions, onChange, className }: ConditionFilterProps) {
  const addCondition = useCallback(() => {
    const firstField = fields[0];
    if (!firstField) return;

    const newCondition: FilterCondition = {
      id: Date.now().toString(),
      field: firstField.key,
      operator: 'equals',
      value: '',
    };

    onChange([...conditions, newCondition]);
  }, [fields, conditions, onChange]);

  const removeCondition = useCallback(
    (id: string) => {
      onChange(conditions.filter((c) => c.id !== id));
    },
    [conditions, onChange],
  );

  const updateCondition = useCallback(
    (id: string, updates: Partial<FilterCondition>) => {
      onChange(conditions.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    },
    [conditions, onChange],
  );

  const getFieldByKey = (key: string): FilterField | undefined => {
    return fields.find((f) => f.key === key);
  };

  const renderValueInput = (condition: FilterCondition) => {
    const field = getFieldByKey(condition.field);
    if (!field) return null;

    if (field.options && ['equals', 'notEquals', 'in', 'notIn'].includes(condition.operator)) {
      return (
        <Select
          value={String(condition.value || '')}
          onValueChange={(value) => updateCondition(condition.id, { value })}
        >
          <SelectTrigger className="h-8 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (['between', 'notBetween'].includes(condition.operator)) {
      const [min, max] = Array.isArray(condition.value) ? condition.value : ['', ''];
      return (
        <div className="flex items-center gap-2">
          <Input
            type={field.type === 'number' ? 'number' : 'text'}
            value={String(min)}
            onChange={(e) => {
              const newMin = e.target.value;
              const currentMax = Array.isArray(condition.value) ? condition.value[1] : '';
              updateCondition(condition.id, { value: [newMin, currentMax] });
            }}
            placeholder="Min"
            className="h-8 w-24"
          />
          <span className="text-sm text-muted-foreground">and</span>
          <Input
            type={field.type === 'number' ? 'number' : 'text'}
            value={String(max)}
            onChange={(e) => {
              const newMax = e.target.value;
              const currentMin = Array.isArray(condition.value) ? condition.value[0] : '';
              updateCondition(condition.id, { value: [currentMin, newMax] });
            }}
            placeholder="Max"
            className="h-8 w-24"
          />
        </div>
      );
    }

    return (
      <Input
        type={
          field.type === 'number' ? 'number' : field.type === 'date' ? 'datetime-local' : 'text'
        }
        value={String(condition.value || '')}
        onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
        placeholder={field.placeholder || 'Value'}
        className="h-8 w-32"
      />
    );
  };

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
            conditions.length > 0 && 'border-primary/40 bg-primary/5 text-primary',
            className,
          )}
        >
          <Filter className="h-4 w-4" />
          <span className="truncate">
            {conditions.length === 0
              ? 'Add filters'
              : `${conditions.length} filter${conditions.length > 1 ? 's' : ''}`}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 border-border/50 bg-card/95 shadow-lg shadow-primary/5 backdrop-blur-xl"
        align="start"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Filter Conditions</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={addCondition}
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>

          <div className="max-h-80 space-y-2 overflow-y-auto">
            {conditions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <Filter className="mb-2 h-8 w-8 opacity-50" />
                <p className="text-sm">No filters added</p>
                <p className="mt-1 text-xs">Click "Add" to create a filter</p>
              </div>
            ) : (
              conditions.map((condition) => {
                const field = getFieldByKey(condition.field);
                const operators = field ? getOperatorsForFieldType(field.type) : ['equals'];

                return (
                  <div
                    key={condition.id}
                    className="flex items-center gap-2 rounded-lg bg-muted/30 p-2"
                  >
                    <Select
                      value={condition.field}
                      onValueChange={(value) =>
                        updateCondition(condition.id, {
                          field: value,
                          operator: 'equals',
                          value: '',
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fields.map((f) => (
                          <SelectItem key={f.key} value={f.key}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={condition.operator}
                      onValueChange={(value) =>
                        updateCondition(condition.id, { operator: value as FilterOperator })
                      }
                    >
                      <SelectTrigger className="h-8 w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map((op) => (
                          <SelectItem key={op} value={op}>
                            {OPERATOR_LABELS[op as FilterOperator]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {renderValueInput(condition)}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-error"
                      onClick={() => removeCondition(condition.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
