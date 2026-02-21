'use client';

import { useState, useEffect } from 'react';

import { Globe, Users, Clock, Link2, Radio } from 'lucide-react';

import { Badge } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { useI18n } from '@/i18n';
import { fetchApiData, cn } from '@/shared/utils';

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

interface IBCStatusData {
  chainId: string;
  network: 'mainnet' | 'testnet';
  connections: {
    total: number;
    open: number;
    init: number;
    tryopen: number;
  };
  channels: {
    total: number;
    open: number;
    closed: number;
  };
  summary: {
    totalConnections: number;
    activeConnections: number;
    totalChannels: number;
    activeChannels: number;
    estimatedTransfers: number;
  };
  lastUpdated: number;
}

interface IBCResponse {
  data: IBCStatusData;
}

interface CosmosChainSelectorProps {
  selectedChain: string;
  onChainChange: (chainId: string) => void;
  chains?: CosmosChain[];
  showDetails?: boolean;
  filterType?: 'mainnet' | 'testnet' | 'all';
  showIBCStatus?: boolean;
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
  showIBCStatus = false,
  className,
}: CosmosChainSelectorProps) {
  const { t } = useI18n();
  const [ibcData, setIbcData] = useState<IBCStatusData | null>(null);
  const [ibcLoading, setIbcLoading] = useState(false);
  const [ibcError, setIbcError] = useState<string | null>(null);

  useEffect(() => {
    if (!showIBCStatus) return;

    const fetchIBCStatus = async () => {
      try {
        setIbcLoading(true);
        setIbcError(null);
        const response = await fetchApiData<IBCResponse>('/api/oracle/band/ibc');
        setIbcData(response.data);
      } catch (err) {
        setIbcError(err instanceof Error ? err.message : 'Failed to fetch IBC status');
      } finally {
        setIbcLoading(false);
      }
    };

    fetchIBCStatus();
  }, [showIBCStatus]);

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

      {showIBCStatus && (
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Link2 className="h-4 w-4 text-blue-500" />
            <span className="font-medium">IBC 连接状态</span>
            {ibcData && (
              <Badge variant="success" size="sm">
                实时
              </Badge>
            )}
          </div>

          {ibcLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : ibcError ? (
            <div className="text-sm text-red-500">{ibcError}</div>
          ) : ibcData ? (
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Link2 className="h-3.5 w-3.5" />
                <span>连接数: {ibcData.connections.total}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Radio className="h-3.5 w-3.5 text-green-500" />
                <span>活跃: {ibcData.connections.open}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Link2 className="h-3.5 w-3.5" />
                <span>通道数: {ibcData.channels.total}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Radio className="h-3.5 w-3.5 text-green-500" />
                <span>活跃通道: {ibcData.channels.open}</span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">暂无 IBC 数据</div>
          )}
        </div>
      )}
    </div>
  );
}
