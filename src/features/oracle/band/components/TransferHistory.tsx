'use client';

import { useState, useEffect, useCallback } from 'react';

import {
  ArrowRight,
  Clock,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  History,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';

import { Button } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { SkeletonList } from '@/components/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { formatLatency, getLatencyColor } from '@/features/cross-chain/utils/format';
import { useI18n } from '@/i18n';
import { cn, formatTime } from '@/shared/utils';

import type { Transfer } from '../types';

interface TransferHistoryProps {
  bridgeId?: string;
  chain?: string;
  limit?: number;
  className?: string;
}

const CHAIN_DISPLAY_NAMES: Record<string, string> = {
  ethereum: 'Ethereum',
  cosmos: 'Cosmos Hub',
  osmosis: 'Osmosis',
  juno: 'Juno',
  stargaze: 'Stargaze',
  axelar: 'Axelar',
  injective: 'Injective',
  evmos: 'Evmos',
  crescent: 'Crescent',
  kujira: 'Kujira',
};

const getStatusConfig = (status: Transfer['status']) => {
  const configs = {
    pending: { status: 'warning' as const, label: 'Pending', icon: Loader2 },
    completed: { status: 'active' as const, label: 'Completed', icon: CheckCircle },
    failed: { status: 'offline' as const, label: 'Failed', icon: XCircle },
  };
  return configs[status] ?? configs.pending;
};

const truncateHash = (hash: string): string => {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
};

const getExplorerUrl = (chain: string, txHash: string): string => {
  const explorers: Record<string, string> = {
    ethereum: `https://etherscan.io/tx/${txHash}`,
    cosmos: `https://www.mintscan.io/cosmos/txs/${txHash}`,
    osmosis: `https://www.mintscan.io/osmosis/txs/${txHash}`,
    juno: `https://www.mintscan.io/juno/txs/${txHash}`,
    stargaze: `https://www.mintscan.io/stargaze/txs/${txHash}`,
    axelar: `https://www.mintscan.io/axelar/txs/${txHash}`,
    injective: `https://www.mintscan.io/injective/txs/${txHash}`,
    evmos: `https://www.mintscan.io/evmos/txs/${txHash}`,
  };
  return explorers[chain] ?? `#`;
};

export function TransferHistory({ bridgeId, chain, limit = 20, className }: TransferHistoryProps) {
  const { t } = useI18n();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransfers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (bridgeId) params.append('bridgeId', bridgeId);
      if (chain) params.append('chain', chain);
      params.append('limit', String(limit));

      const response = await fetch(`/api/band/transfers?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transfers');
      }
      const data = await response.json();
      setTransfers(data.transfers ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setTransfers([]);
    } finally {
      setIsLoading(false);
    }
  }, [bridgeId, chain, limit]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const formatAmount = (amount: number, symbol: string): string => {
    if (amount >= 1_000_000) {
      return `${(amount / 1_000_000).toLocaleString('en-US', { notation: 'compact' })}M ${symbol}`;
    }
    if (amount >= 1_000) {
      return `${(amount / 1_000).toLocaleString('en-US', { notation: 'compact' })}K ${symbol}`;
    }
    return `${amount.toLocaleString('en-US', { notation: 'compact' })} ${symbol}`;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t('band.transferHistory.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SkeletonList count={5} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t('band.transferHistory.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
            <div>
              <p className="font-medium text-foreground">{t('common.error')}</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchTransfers}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('common.retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (transfers.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t('band.transferHistory.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <History className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{t('band.transferHistory.noData')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {t('band.transferHistory.title')}
            </CardTitle>
            <CardDescription>
              {t('band.transferHistory.description', { count: transfers.length })}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchTransfers}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('band.transferHistory.route')}</TableHead>
                <TableHead>{t('band.transferHistory.amount')}</TableHead>
                <TableHead>{t('band.transferHistory.status')}</TableHead>
                <TableHead className="text-center">{t('band.transferHistory.latency')}</TableHead>
                <TableHead>{t('band.transferHistory.sourceTx')}</TableHead>
                <TableHead>{t('band.transferHistory.destTx')}</TableHead>
                <TableHead>{t('band.transferHistory.time')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((transfer) => {
                const statusConfig = getStatusConfig(transfer.status);
                const StatusIcon = statusConfig.icon;

                return (
                  <TableRow key={transfer.transferId} className="group">
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">
                          {CHAIN_DISPLAY_NAMES[transfer.sourceChain] ?? transfer.sourceChain}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">
                          {CHAIN_DISPLAY_NAMES[transfer.destinationChain] ??
                            transfer.destinationChain}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {formatAmount(transfer.amount, transfer.symbol)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <StatusIcon
                          className={cn(
                            'h-3.5 w-3.5',
                            transfer.status === 'pending' && 'animate-spin',
                            statusConfig.status === 'active' && 'text-emerald-500',
                            statusConfig.status === 'warning' && 'text-amber-500',
                            statusConfig.status === 'offline' && 'text-red-500',
                          )}
                        />
                        <span className="text-sm">{statusConfig.label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          'font-mono text-sm',
                          transfer.status === 'completed' && getLatencyColor(transfer.latencyMs),
                          transfer.status !== 'completed' && 'text-muted-foreground',
                        )}
                      >
                        {transfer.status === 'completed' ? formatLatency(transfer.latencyMs) : '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <a
                        href={getExplorerUrl(transfer.sourceChain, transfer.sourceTxHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        {truncateHash(transfer.sourceTxHash)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                    <TableCell>
                      {transfer.destinationTxHash ? (
                        <a
                          href={getExplorerUrl(
                            transfer.destinationChain,
                            transfer.destinationTxHash,
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          {truncateHash(transfer.destinationTxHash)}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatTime(transfer.timestamp)}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
