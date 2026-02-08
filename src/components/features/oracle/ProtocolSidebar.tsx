'use client';

import { Check, Filter } from 'lucide-react';

import { cn } from '@/lib/utils';

const PROTOCOLS = [
  { id: 'all', name: 'All Protocols', icon: '🔍', count: 156 },
  { id: 'chainlink', name: 'Chainlink', icon: '🔗', count: 45 },
  { id: 'pyth', name: 'Pyth Network', icon: '🐍', count: 32 },
  { id: 'band', name: 'Band Protocol', icon: '🎸', count: 28 },
  { id: 'api3', name: 'API3', icon: '📡', count: 15 },
  { id: 'redstone', name: 'RedStone', icon: '💎', count: 12 },
  { id: 'flux', name: 'Flux', icon: '⚡', count: 10 },
  { id: 'switchboard', name: 'Switchboard', icon: '🎛️', count: 8 },
  { id: 'uma', name: 'UMA', icon: '⚖️', count: 6 },
];

interface ProtocolSidebarProps {
  selectedProtocols: string[];
  onChange: (protocols: string[]) => void;
  className?: string;
}

export function ProtocolSidebar({ selectedProtocols, onChange, className }: ProtocolSidebarProps) {
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

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <Filter className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Protocols</span>
      </div>

      {/* Protocol List */}
      <div className="flex-1 overflow-y-auto py-2">
        {PROTOCOLS.map((protocol) => {
          const isSelected = selectedProtocols.includes(protocol.id);
          const isAll = protocol.id === 'all';

          return (
            <button
              key={protocol.id}
              onClick={() => handleToggle(protocol.id)}
              className={cn(
                'group flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors',
                isSelected ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{protocol.icon}</span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{protocol.name}</span>
                  {!isAll && <span className="text-xs text-gray-400">{protocol.count} feeds</span>}
                </div>
              </div>

              {isSelected && <Check className="h-4 w-4 text-purple-600" />}
            </button>
          );
        })}
      </div>

      {/* Footer - Selection Summary */}
      <div className="border-t border-gray-100 px-4 py-3">
        <p className="text-xs text-gray-500">
          {selectedProtocols.includes('all')
            ? 'Showing all protocols'
            : `${selectedProtocols.length} protocol${selectedProtocols.length > 1 ? 's' : ''} selected`}
        </p>
      </div>
    </div>
  );
}
