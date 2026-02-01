'use client';

import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { OracleProtocol } from '@/lib/types';
import { ORACLE_PROTOCOLS, PROTOCOL_DISPLAY_NAMES, PROTOCOL_INFO } from '@/lib/types';

interface ProtocolSelectorProps {
  value: OracleProtocol | 'all';
  onChange: (protocol: OracleProtocol | 'all') => void;
  showAll?: boolean;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
}

const PROTOCOL_ICONS: Record<OracleProtocol, string> = {
  insight: '🔮',
  uma: '⚖️',
  chainlink: '🔗',
  pyth: '🐍',
  band: '🎸',
  api3: '📡',
  redstone: '💎',
  switchboard: '🎛️',
  flux: '⚡',
  dia: '📊',
};

export function ProtocolSelector({
  value,
  onChange,
  showAll = true,
  disabled = false,
  className,
  size = 'default',
  variant = 'outline',
}: ProtocolSelectorProps) {
  const [open, setOpen] = useState(false);

  const protocols = showAll ? (['all', ...ORACLE_PROTOCOLS] as const) : ORACLE_PROTOCOLS;

  const getDisplayValue = (protocol: OracleProtocol | 'all') => {
    if (protocol === 'all') return 'All Protocols';
    return PROTOCOL_DISPLAY_NAMES[protocol];
  };

  const getIcon = (protocol: OracleProtocol | 'all') => {
    if (protocol === 'all') return '🌐';
    return PROTOCOL_ICONS[protocol];
  };

  const getDescription = (protocol: OracleProtocol | 'all') => {
    if (protocol === 'all') return 'View all oracle protocols';
    return PROTOCOL_INFO[protocol].description;
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger>
        <Button
          variant={variant}
          size={size}
          disabled={disabled}
          className={cn(
            'w-full justify-between gap-2',
            size === 'sm' && 'h-8 text-xs',
            size === 'lg' && 'h-12 text-base',
            className,
          )}
        >
          <span className="flex items-center gap-2">
            <span className="text-lg">{getIcon(value)}</span>
            <span className="truncate">{getDisplayValue(value)}</span>
          </span>
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {protocols.map((protocol) => (
          <DropdownMenuItem
            key={protocol}
            onClick={() => {
              onChange(protocol);
              setOpen(false);
            }}
            className={cn(
              'flex cursor-pointer items-start gap-3 py-3',
              value === protocol && 'bg-accent',
            )}
          >
            <span className="shrink-0 text-xl">{getIcon(protocol)}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">{getDisplayValue(protocol)}</span>
                {value === protocol && <Check className="text-primary h-4 w-4" />}
              </div>
              <p className="text-muted-foreground truncate text-xs">{getDescription(protocol)}</p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Multi-select version
interface ProtocolMultiSelectorProps {
  value: OracleProtocol[];
  onChange: (protocols: OracleProtocol[]) => void;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  placeholder?: string;
}

export function ProtocolMultiSelector({
  value,
  onChange,
  disabled = false,
  className,
  size = 'default',
  variant = 'outline',
  placeholder = 'Select protocols...',
}: ProtocolMultiSelectorProps) {
  const [open, setOpen] = useState(false);

  const toggleProtocol = (protocol: OracleProtocol) => {
    if (value.includes(protocol)) {
      onChange(value.filter((p) => p !== protocol));
    } else {
      onChange([...value, protocol]);
    }
  };

  const selectAll = () => {
    onChange([...ORACLE_PROTOCOLS]);
  };

  const clearAll = () => {
    onChange([]);
  };

  const getDisplayText = () => {
    if (value.length === 0) return placeholder;
    if (value.length === 1) {
      const firstProtocol = value[0];
      return firstProtocol ? PROTOCOL_DISPLAY_NAMES[firstProtocol] : placeholder;
    }
    if (value.length === ORACLE_PROTOCOLS.length) return 'All Protocols';
    return `${value.length} protocols selected`;
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger>
        <Button
          variant={variant}
          size={size}
          disabled={disabled}
          className={cn(
            'w-full justify-between gap-2',
            size === 'sm' && 'h-8 text-xs',
            size === 'lg' && 'h-12 text-base',
            className,
          )}
        >
          <span className="truncate">{getDisplayText()}</span>
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <div className="flex items-center justify-between border-b px-2 py-1.5">
          <button
            onClick={(e) => {
              e.preventDefault();
              selectAll();
            }}
            className="text-primary text-xs hover:underline"
          >
            Select All
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              clearAll();
            }}
            className="text-muted-foreground text-xs hover:underline"
          >
            Clear
          </button>
        </div>
        {ORACLE_PROTOCOLS.map((protocol) => (
          <DropdownMenuItem
            key={protocol}
            onClick={(e) => {
              e.preventDefault();
              toggleProtocol(protocol);
            }}
            className="flex cursor-pointer items-center gap-3 py-2"
          >
            <div
              className={cn(
                'flex h-4 w-4 items-center justify-center rounded border',
                value.includes(protocol) ? 'bg-primary border-primary' : 'border-muted-foreground',
              )}
            >
              {value.includes(protocol) && <Check className="text-primary-foreground h-3 w-3" />}
            </div>
            <span className="text-lg">{PROTOCOL_ICONS[protocol]}</span>
            <span className="flex-1">{PROTOCOL_DISPLAY_NAMES[protocol]}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
