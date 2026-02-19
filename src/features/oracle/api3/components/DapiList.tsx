'use client';

import { useState, useEffect, useMemo } from 'react';

import { Database, RefreshCw, Search } from 'lucide-react';

import { EmptyDeviationState } from '@/components/common/EmptyState';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SkeletonList } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useI18n } from '@/i18n';
import { cn, formatTime } from '@/shared/utils';

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
  },
];

export function DapiList({ chain, symbol, className }: DapiListProps) {
  const { t } = useI18n();
  const [dapis, setDapis] = useState<Dapi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
                <TableHead>{t('api3.dapi.price')}</TableHead>
                <TableHead>{t('api3.dapi.status')}</TableHead>
                <TableHead>{t('api3.dapi.lastUpdate')}</TableHead>
                <TableHead>{t('api3.dapi.dataFeedId')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDapis.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <p className="text-muted-foreground">{t('common.noResults')}</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDapis.map((dapi) => (
                  <TableRow
                    key={dapi.dataFeedId}
                    className="group cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
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
                      <span className="font-mono font-medium">{formatPrice(dapi.lastPrice)}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={dapi.status === 'active' ? 'active' : 'inactive'}
                        text={dapi.status === 'active' ? t('common.active') : t('common.inactive')}
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
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
