'use client';

import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
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
      <DropdownMenuTrigger
        className={cn(
          'border-input bg-background ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          size === 'sm' && 'h-8 px-2 text-xs',
          size === 'lg' && 'h-12 px-4 text-base',
          variant === 'outline' &&
            'border-input bg-background hover:bg-accent hover:text-accent-foreground',
          variant === 'ghost' &&
            'hover:bg-accent hover:text-accent-foreground border-transparent bg-transparent',
          variant === 'default' && 'bg-primary text-primary-foreground hover:bg-primary/90',
          disabled && 'pointer-events-none opacity-50',
          className,
        )}
      >
        <span className="flex items-center gap-2">
          <span className="text-lg">{getIcon(value)}</span>
          <span className="truncate">{getDisplayValue(value)}</span>
        </span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
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
      <DropdownMenuTrigger
        className={cn(
          'border-input bg-background ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          size === 'sm' && 'h-8 px-2 text-xs',
          size === 'lg' && 'h-12 px-4 text-base',
          variant === 'outline' &&
            'border-input bg-background hover:bg-accent hover:text-accent-foreground',
          variant === 'ghost' &&
            'hover:bg-accent hover:text-accent-foreground border-transparent bg-transparent',
          variant === 'default' && 'bg-primary text-primary-foreground hover:bg-primary/90',
          disabled && 'pointer-events-none opacity-50',
          className,
        )}
      >
        <span className="truncate">{getDisplayText()}</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
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
