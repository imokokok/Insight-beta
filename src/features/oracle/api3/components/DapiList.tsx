'use client';

import { useState, useEffect, useMemo } from 'react';

import {
  Building2,
  ChevronDown,
  ChevronRight,
  Database,
  Fuel,
  Radio,
  RefreshCw,
  Search,
} from 'lucide-react';

import { EmptyDeviationState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui';
import { Badge, StatusBadge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Input } from '@/components/ui';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui';
import { SkeletonList } from '@/components/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn, formatTime } from '@/shared/utils';

import { BeaconSetComposition } from './BeaconSetComposition';
import { DataProviderInfo } from './DataProviderInfo';

import type { Dapi } from '../types/api3';

interface DapiListProps {
  chain?: string;
  symbol?: string;
  className?: string;
}

const mockDapis: Dapi[] = [
  {
    dapiName: 'ETH/USD',
    dataFeedId: '0x1234567890abcdef1234567890abcdef12345678',
    airnodeAddress: '0xabcd1234abcd1234abcd1234abcd1234abcd1234',
    chain: 'ethereum',
    symbol: 'ETH',
    decimals: 8,
    status: 'active',
    lastPrice: 2456.78,
    lastUpdatedAt: new Date().toISOString(),
    providerName: 'Coinbase',
    providerDescription: 'Leading cryptocurrency exchange providing real-time market data',
    providerWebsite: 'https://www.coinbase.com',
    sourceType: 'beacon',
  },
  {
    dapiName: 'BTC/USD',
    dataFeedId: '0x2345678901abcdef2345678901abcdef23456789',
    airnodeAddress: '0xbcde2345bcde2345bcde2345bcde2345bcde2345',
    chain: 'ethereum',
    symbol: 'BTC',
    decimals: 8,
    status: 'active',
    lastPrice: 43250.5,
    lastUpdatedAt: new Date().toISOString(),
    providerName: 'Binance',
    providerDescription: "World's largest cryptocurrency exchange by trading volume",
    providerWebsite: 'https://www.binance.com',
    sourceType: 'beacon_set',
    beaconSetComponents: [
      { beaconId: '0xbtc1', beaconName: 'BTC/USD (Coinbase)', weight: 0.35, lastPrice: 43255.0 },
      { beaconId: '0xbtc2', beaconName: 'BTC/USD (Binance)', weight: 0.3, lastPrice: 43248.5 },
      { beaconId: '0xbtc3', beaconName: 'BTC/USD (Kraken)', weight: 0.2, lastPrice: 43252.0 },
      { beaconId: '0xbtc4', beaconName: 'BTC/USD (Bitstamp)', weight: 0.15, lastPrice: 43246.0 },
    ],
  },
  {
    dapiName: 'LINK/USD',
    dataFeedId: '0x3456789012abcdef3456789012abcdef34567890',
    airnodeAddress: '0xcdef3456cdef3456cdef3456cdef3456cdef3456',
    chain: 'polygon',
    symbol: 'LINK',
    decimals: 8,
    status: 'active',
    lastPrice: 14.25,
    lastUpdatedAt: new Date(Date.now() - 60000).toISOString(),
    providerName: 'Chainlink Labs',
    providerDescription: 'Decentralized oracle network providing tamper-proof data',
    providerWebsite: 'https://chain.link',
    sourceType: 'beacon',
  },
  {
    dapiName: 'USDC/USD',
    dataFeedId: '0x4567890123abcdef4567890123abcdef45678901',
    airnodeAddress: '0xdef04567def04567def04567def04567def04567',
    chain: 'arbitrum',
    symbol: 'USDC',
    decimals: 6,
    status: 'inactive',
    lastPrice: 0.9998,
    lastUpdatedAt: new Date(Date.now() - 3600000).toISOString(),
    providerName: 'Circle',
    providerDescription: 'Financial technology company and issuer of USDC stablecoin',
    providerWebsite: 'https://www.circle.com',
    sourceType: 'beacon_set',
    beaconSetComponents: [
      { beaconId: '0xusdc1', beaconName: 'USDC/USD (Coinbase)', weight: 0.5, lastPrice: 0.9999 },
      { beaconId: '0xusdc2', beaconName: 'USDC/USD (Kraken)', weight: 0.5, lastPrice: 0.9997 },
    ],
  },
];

const gasCostByDapi: Record<string, { costUsd: number; gasUsed: number }> = {
  'ETH/USD': { costUsd: 45.2, gasUsed: 8500000 },
  'BTC/USD': { costUsd: 32.8, gasUsed: 6200000 },
  'LINK/USD': { costUsd: 12.5, gasUsed: 2800000 },
  'USDC/USD': { costUsd: 8.9, gasUsed: 1500000 },
};

export function DapiList({ chain, symbol, className }: DapiListProps) {
  const { t } = useI18n();
  const [dapis, setDapis] = useState<Dapi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedProvider, setSelectedProvider] = useState<Dapi | null>(null);

  useEffect(() => {
    const fetchDapis = async () => {
      setIsLoading(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        let filtered = [...mockDapis];
        if (chain) {
          filtered = filtered.filter((d) => d.chain.toLowerCase() === chain.toLowerCase());
        }
        if (symbol) {
          filtered = filtered.filter((d) => d.symbol.toLowerCase() === symbol.toLowerCase());
        }
        setDapis(filtered);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDapis();
  }, [chain, symbol]);

  const filteredDapis = useMemo(() => {
    if (!searchQuery) return dapis;
    const query = searchQuery.toLowerCase();
    return dapis.filter(
      (d) =>
        d.dapiName.toLowerCase().includes(query) ||
        d.symbol.toLowerCase().includes(query) ||
        d.chain.toLowerCase().includes(query),
    );
  }, [dapis, searchQuery]);

  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    if (price >= 1) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setDapis([...mockDapis]);
      setIsLoading(false);
    }, 500);
  };

  const toggleRow = (dataFeedId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(dataFeedId)) {
        next.delete(dataFeedId);
      } else {
        next.add(dataFeedId);
      }
      return next;
    });
  };

  const isBeaconSet = (dapi: Dapi) =>
    dapi.sourceType === 'beacon_set' &&
    dapi.beaconSetComponents &&
    dapi.beaconSetComponents.length > 0;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            {t('api3.dapi.listTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SkeletonList count={5} />
        </CardContent>
      </Card>
    );
  }

  if (filteredDapis.length === 0 && !searchQuery) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <EmptyDeviationState onRefresh={handleRefresh} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            {t('api3.dapi.listTitle')}
            <Badge variant="secondary" className="ml-2">
              {filteredDapis.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 sm:w-64"
              />
            </div>
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('api3.dapi.name')}</TableHead>
                <TableHead>{t('api3.dapi.chain')}</TableHead>
                <TableHead>{t('api3.dapi.sourceType')}</TableHead>
                <TableHead>{t('api3.dapi.provider')}</TableHead>
                <TableHead>{t('api3.dapi.price')}</TableHead>
                <TableHead>Gas 成本</TableHead>
                <TableHead>{t('api3.dapi.status')}</TableHead>
                <TableHead>{t('api3.dapi.lastUpdate')}</TableHead>
                <TableHead>{t('api3.dapi.dataFeedId')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDapis.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    <p className="text-muted-foreground">{t('common.noResults')}</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDapis.map((dapi) => {
                  const isExpanded = expandedRows.has(dapi.dataFeedId);
                  const canExpand = isBeaconSet(dapi);
                  const gasInfo = gasCostByDapi[dapi.dapiName];

                  return (
                    <>
                      <TableRow
                        key={dapi.dataFeedId}
                        className={cn(
                          'group cursor-pointer hover:bg-muted/50',
                          canExpand && 'hover:bg-muted/70',
                        )}
                        onClick={() => canExpand && toggleRow(dapi.dataFeedId)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {canExpand && (
                              <button
                                type="button"
                                className="flex h-5 w-5 items-center justify-center rounded hover:bg-muted"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleRow(dapi.dataFeedId);
                                }}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            )}
                            {!canExpand && <div className="w-5" />}
                            <span className="font-semibold">{dapi.dapiName}</span>
                            <Badge variant="outline" className="text-xs">
                              {dapi.symbol}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {dapi.chain}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {dapi.sourceType ? (
                            <Badge
                              variant={dapi.sourceType === 'beacon' ? 'default' : 'secondary'}
                              className="gap-1"
                            >
                              <Radio className="h-3 w-3" />
                              {dapi.sourceType === 'beacon'
                                ? t('api3.provider.beacon')
                                : t('api3.provider.beaconSet')}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {dapi.providerName ? (
                            <Popover
                              open={
                                !!selectedProvider &&
                                selectedProvider.dataFeedId === dapi.dataFeedId
                              }
                              onOpenChange={(open) => {
                                if (!open) {
                                  setSelectedProvider(null);
                                }
                              }}
                            >
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="flex cursor-pointer items-center gap-1.5 transition-colors hover:text-primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedProvider(dapi);
                                  }}
                                >
                                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-sm underline-offset-2 hover:underline">
                                    {dapi.providerName}
                                  </span>
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80" align="start">
                                <DataProviderInfo
                                  providerName={dapi.providerName}
                                  providerDescription={dapi.providerDescription}
                                  providerWebsite={dapi.providerWebsite}
                                  sourceType={dapi.sourceType}
                                />
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono font-medium">
                            {formatPrice(dapi.lastPrice)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {gasInfo ? (
                            <Badge
                              variant="outline"
                              className="flex items-center gap-1 border-amber-200 bg-amber-50 text-xs text-amber-700"
                            >
                              <Fuel className="h-3 w-3" />${gasInfo.costUsd.toFixed(2)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={dapi.status === 'active' ? 'active' : 'inactive'}
                            text={
                              dapi.status === 'active' ? t('common.active') : t('common.inactive')
                            }
                            size="sm"
                          />
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatTime(dapi.lastUpdatedAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-muted-foreground">
                            {formatAddress(dapi.dataFeedId)}
                          </span>
                        </TableCell>
                      </TableRow>
                      {isExpanded && canExpand && dapi.beaconSetComponents && (
                        <TableRow key={`${dapi.dataFeedId}-expanded`} className="bg-muted/30">
                          <TableCell colSpan={9} className="p-4">
                            <BeaconSetComposition components={dapi.beaconSetComponents} />
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
