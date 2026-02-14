'use client';

import { useState } from 'react';

import { Check, ChevronDown, Filter } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/shared/utils';

const PROTOCOLS = [
  { id: 'all', name: 'All Protocols', icon: '🔍' },
  { id: 'chainlink', name: 'Chainlink', icon: '🔗' },
  { id: 'pyth', name: 'Pyth Network', icon: '🐍' },
  { id: 'redstone', name: 'RedStone', icon: '💎' },
  { id: 'uma', name: 'UMA', icon: '⚖️' },
];

interface ProtocolFilterProps {
  selectedProtocols: string[];
  onChange: (protocols: string[]) => void;
  className?: string;
}

export function ProtocolFilter({ selectedProtocols, onChange, className }: ProtocolFilterProps) {
  const [open, setOpen] = useState(false);

  const handleToggle = (protocolId: string) => {
    if (protocolId === 'all') {
      onChange(['all']);
      return;
    }

    let newSelection = selectedProtocols.filter((id) => id !== 'all');

    if (selectedProtocols.includes(protocolId)) {
      newSelection = newSelection.filter((id) => id !== protocolId);
      if (newSelection.length === 0) {
        newSelection = ['all'];
      }
    } else {
      newSelection.push(protocolId);
    }

    onChange(newSelection);
  };

  const selectedCount = selectedProtocols.includes('all')
    ? PROTOCOLS.length - 1
    : selectedProtocols.length;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'gap-2 border-dashed',
            selectedCount > 0 && selectedCount < PROTOCOLS.length - 1 && 'border-primary',
            className,
          )}
        >
          <Filter className="h-4 w-4" />
          <span>Protocols</span>
          {selectedCount > 0 && selectedCount < PROTOCOLS.length - 1 && (
            <span className="text-primary-dark ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs">
              {selectedCount}
            </span>
          )}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {PROTOCOLS.map((protocol) => (
          <DropdownMenuItem
            key={protocol.id}
            onClick={() => handleToggle(protocol.id)}
            className="flex cursor-pointer items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span>{protocol.icon}</span>
              <span>{protocol.name}</span>
            </div>
            {selectedProtocols.includes(protocol.id) && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
