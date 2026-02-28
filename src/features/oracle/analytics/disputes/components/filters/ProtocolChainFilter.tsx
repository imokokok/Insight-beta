'use client';

import { Check, Layers, Network, X } from 'lucide-react';

import { FilterBar, FilterPopover } from '@/components/common/controls';
import { Badge } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

interface ProtocolChainFilterProps {
  protocols: string[];
  chains: string[];
  selectedProtocols: string[];
  selectedChains: string[];
  onProtocolChange: (protocols: string[]) => void;
  onChainChange: (chains: string[]) => void;
  className?: string;
}

export function ProtocolChainFilter({
  protocols,
  chains,
  selectedProtocols,
  selectedChains,
  onProtocolChange,
  onChainChange,
  className,
}: ProtocolChainFilterProps) {
  const { t } = useI18n();

  const handleProtocolToggle = (protocol: string) => {
    if (selectedProtocols.includes(protocol)) {
      onProtocolChange(selectedProtocols.filter((p) => p !== protocol));
    } else {
      onProtocolChange([...selectedProtocols, protocol]);
    }
  };

  const handleChainToggle = (chain: string) => {
    if (selectedChains.includes(chain)) {
      onChainChange(selectedChains.filter((c) => c !== chain));
    } else {
      onChainChange([...selectedChains, chain]);
    }
  };

  const handleRemoveProtocol = (protocol: string) => {
    onProtocolChange(selectedProtocols.filter((p) => p !== protocol));
  };

  const handleRemoveChain = (chain: string) => {
    onChainChange(selectedChains.filter((c) => c !== chain));
  };

  const hasFilters = selectedProtocols.length > 0 || selectedChains.length > 0;

  return (
    <FilterBar className={className}>
      <FilterPopover
        icon={<Layers className="h-4 w-4" />}
        label={t('analytics.disputes.filters.protocol')}
        count={selectedProtocols.length}
      >
        <div className="space-y-1">
          {protocols.map((protocol) => {
            const isSelected = selectedProtocols.includes(protocol);
            return (
              <button
                key={protocol}
                type="button"
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-2 py-2 text-sm transition-colors',
                  isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
                )}
                onClick={() => handleProtocolToggle(protocol)}
              >
                <span>{protocol.toUpperCase()}</span>
                {isSelected && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      </FilterPopover>

      <FilterPopover
        icon={<Network className="h-4 w-4" />}
        label={t('analytics.disputes.filters.chain')}
        count={selectedChains.length}
      >
        <div className="space-y-1">
          {chains.map((chain) => {
            const isSelected = selectedChains.includes(chain);
            return (
              <button
                key={chain}
                type="button"
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-2 py-2 text-sm transition-colors',
                  isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
                )}
                onClick={() => handleChainToggle(chain)}
              >
                <span>{chain.charAt(0).toUpperCase() + chain.slice(1)}</span>
                {isSelected && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      </FilterPopover>

      {hasFilters && (
        <div className="flex flex-wrap items-center gap-1">
          {selectedProtocols.map((protocol) => (
            <Badge key={protocol} variant="secondary" className="gap-1">
              {protocol.toUpperCase()}
              <button
                onClick={() => handleRemoveProtocol(protocol)}
                className="hover:text-destructive ml-1"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selectedChains.map((chain) => (
            <Badge key={chain} variant="secondary" className="gap-1">
              {chain.charAt(0).toUpperCase() + chain.slice(1)}
              <button
                onClick={() => handleRemoveChain(chain)}
                className="hover:text-destructive ml-1"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </FilterBar>
  );
}
