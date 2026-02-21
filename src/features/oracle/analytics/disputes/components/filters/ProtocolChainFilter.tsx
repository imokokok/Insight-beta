'use client';

import { Layers, Network, X } from 'lucide-react';

import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
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

  const handleProtocolSelect = (value: string) => {
    if (value === 'all') {
      onProtocolChange([]);
    } else if (selectedProtocols.includes(value)) {
      onProtocolChange(selectedProtocols.filter((p) => p !== value));
    } else {
      onProtocolChange([...selectedProtocols, value]);
    }
  };

  const handleChainSelect = (value: string) => {
    if (value === 'all') {
      onChainChange([]);
    } else if (selectedChains.includes(value)) {
      onChainChange(selectedChains.filter((c) => c !== value));
    } else {
      onChainChange([...selectedChains, value]);
    }
  };

  const handleRemoveProtocol = (protocol: string) => {
    onProtocolChange(selectedProtocols.filter((p) => p !== protocol));
  };

  const handleRemoveChain = (chain: string) => {
    onChainChange(selectedChains.filter((c) => c !== chain));
  };

  const handleClearAll = () => {
    onProtocolChange([]);
    onChainChange([]);
  };

  const hasFilters = selectedProtocols.length > 0 || selectedChains.length > 0;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{t('analytics.disputes.filters.protocol')}:</span>
        <Select value={selectedProtocols[0] || 'all'} onValueChange={handleProtocolSelect}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder={t('analytics.disputes.filters.allProtocols')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('analytics.disputes.filters.allProtocols')}</SelectItem>
            {protocols.map((protocol) => (
              <SelectItem key={protocol} value={protocol}>
                {protocol.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Network className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{t('analytics.disputes.filters.chain')}:</span>
        <Select value={selectedChains[0] || 'all'} onValueChange={handleChainSelect}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder={t('analytics.disputes.filters.allChains')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('analytics.disputes.filters.allChains')}</SelectItem>
            {chains.map((chain) => (
              <SelectItem key={chain} value={chain}>
                {chain.charAt(0).toUpperCase() + chain.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
          <Button variant="ghost" size="sm" onClick={handleClearAll} className="h-6 px-2 text-xs">
            {t('common.clearAll')}
          </Button>
        </div>
      )}
    </div>
  );
}
