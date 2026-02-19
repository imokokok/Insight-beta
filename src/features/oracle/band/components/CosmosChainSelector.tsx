'use client';

import { Globe, Users, Clock } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

interface CosmosChain {
  chainId: string;
  name: string;
  symbol: string;
  logo?: string;
  type: 'mainnet' | 'testnet';
  status: 'active' | 'inactive';
  blockTime: number;
  validators: number;
  features: string[];
}

interface CosmosChainSelectorProps {
  selectedChain: string;
  onChainChange: (chainId: string) => void;
  chains?: CosmosChain[];
  showDetails?: boolean;
  filterType?: 'mainnet' | 'testnet' | 'all';
  className?: string;
}

const DEFAULT_CHAINS: CosmosChain[] = [
  {
    chainId: 'cosmoshub-4',
    name: 'Cosmos Hub',
    symbol: 'ATOM',
    type: 'mainnet',
    status: 'active',
    blockTime: 6.5,
    validators: 175,
    features: ['IBC', 'Governance', 'Staking'],
  },
  {
    chainId: 'osmosis-1',
    name: 'Osmosis',
    symbol: 'OSMO',
    type: 'mainnet',
    status: 'active',
    blockTime: 6.0,
    validators: 150,
    features: ['IBC', 'AMM', 'Superfluid'],
  },
  {
    chainId: 'juno-1',
    name: 'Juno',
    symbol: 'JUNO',
    type: 'mainnet',
    status: 'active',
    blockTime: 6.5,
    validators: 125,
    features: ['IBC', 'Smart Contracts', 'CW20'],
  },
  {
    chainId: 'stargaze-1',
    name: 'Stargaze',
    symbol: 'STARS',
    type: 'mainnet',
    status: 'active',
    blockTime: 6.0,
    validators: 100,
    features: ['IBC', 'NFT', 'Governance'],
  },
  {
    chainId: 'axelar-dojo-1',
    name: 'Axelar',
    symbol: 'AXL',
    type: 'mainnet',
    status: 'active',
    blockTime: 6.0,
    validators: 50,
    features: ['IBC', 'GMP', 'Bridge'],
  },
  {
    chainId: 'injective-1',
    name: 'Injective',
    symbol: 'INJ',
    type: 'mainnet',
    status: 'active',
    blockTime: 1.0,
    validators: 60,
    features: ['IBC', 'DEX', 'Derivatives'],
  },
  {
    chainId: 'evmos_9001-2',
    name: 'Evmos',
    symbol: 'EVMOS',
    type: 'mainnet',
    status: 'active',
    blockTime: 2.0,
    validators: 150,
    features: ['IBC', 'EVM', 'DeFi'],
  },
  {
    chainId: 'kaiyo-1',
    name: 'Kujira',
    symbol: 'KUJI',
    type: 'mainnet',
    status: 'active',
    blockTime: 2.5,
    validators: 100,
    features: ['IBC', 'DeFi', 'Liquidation'],
  },
];

const getChainLogo = (chainId: string): string => {
  const logos: Record<string, string> = {
    'cosmoshub-4': '🌌',
    'osmosis-1': '🌊',
    'juno-1': '🚀',
    'stargaze-1': '⭐',
    'axelar-dojo-1': '🔗',
    'injective-1': '💉',
    'evmos_9001-2': '🔷',
    'kaiyo-1': '🐋',
  };
  return logos[chainId] ?? '🌐';
};

export function CosmosChainSelector({
  selectedChain,
  onChainChange,
  chains = DEFAULT_CHAINS,
  showDetails = true,
  filterType = 'mainnet',
  className,
}: CosmosChainSelectorProps) {
  const { t } = useI18n();

  const filteredChains = chains.filter((chain) => {
    if (filterType === 'all') return true;
    return chain.type === filterType;
  });

  const selectedChainData = chains.find((c) => c.chainId === selectedChain);

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{t('band.chainSelector.label')}</span>
      </div>

      <Select value={selectedChain} onValueChange={onChainChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t('band.chainSelector.placeholder')}>
            {selectedChainData && (
              <div className="flex items-center gap-2">
                <span>{getChainLogo(selectedChainData.chainId)}</span>
                <span>{selectedChainData.name}</span>
                <Badge variant="secondary" size="sm">
                  {selectedChainData.symbol}
                </Badge>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {filteredChains.map((chain) => (
            <SelectItem key={chain.chainId} value={chain.chainId}>
              <div className="flex items-center gap-2">
                <span>{getChainLogo(chain.chainId)}</span>
                <span>{chain.name}</span>
                <Badge variant="outline" size="sm">
                  {chain.symbol}
                </Badge>
                {chain.status === 'active' && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-emerald-500" />
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showDetails && selectedChainData && (
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg">{getChainLogo(selectedChainData.chainId)}</span>
            <span className="font-semibold">{selectedChainData.name}</span>
            <Badge
              variant={selectedChainData.status === 'active' ? 'success' : 'secondary'}
              size="sm"
            >
              {selectedChainData.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {selectedChainData.blockTime}s {t('band.chainSelector.blockTime')}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>
                {selectedChainData.validators} {t('band.chainSelector.validators')}
              </span>
            </div>
            <div className="col-span-2 flex flex-wrap gap-1 sm:col-span-1">
              {selectedChainData.features.slice(0, 3).map((feature) => (
                <Badge key={feature} variant="secondary" size="sm">
                  {feature}
                </Badge>
              ))}
              {selectedChainData.features.length > 3 && (
                <Badge variant="secondary" size="sm">
                  +{selectedChainData.features.length - 3}
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
