'use client';

import { useState, useMemo } from 'react';

import { RefreshCw, Filter, DollarSign, TrendingUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

const AVAILABLE_SYMBOLS = ['BTC', 'ETH', 'SOL', 'LINK', 'AVAX', 'MATIC', 'UNI', 'AAVE'];

interface ArbitrageOpportunity {
  id: string;
  symbol: string;
  chainA: string;
  chainB: string;
  priceA: number;
  priceB: number;
  deviationPercent: number;
  profitEstimate: number;
  status: 'detected' | 'analyzing' | 'expired' | 'executed';
  isActionable: boolean;
  timestamp: string;
}

const mockArbitrageData: ArbitrageOpportunity[] = [
  {
    id: '1',
    symbol: 'BTC',
    chainA: 'binance',
    chainB: 'ethereum',
    priceA: 67500,
    priceB: 67800,
    deviationPercent: 0.44,
    profitEstimate: 150,
    status: 'detected',
    isActionable: true,
    timestamp: new Date().toISOString(),
  },
  {
    id: '2',
    symbol: 'ETH',
    chainA: 'polygon',
    chainB: 'arbitrum',
    priceA: 3450,
    priceB: 3472,
    deviationPercent: 0.64,
    profitEstimate: 85,
    status: 'detected',
    isActionable: true,
    timestamp: new Date().toISOString(),
  },
  {
    id: '3',
    symbol: 'SOL',
    chainA: 'solana',
    chainB: 'ethereum',
    priceA: 142,
    priceB: 143.5,
    deviationPercent: 1.05,
    profitEstimate: 220,
    status: 'analyzing',
    isActionable: true,
    timestamp: new Date().toISOString(),
  },
];

export default function CrossChainArbitragePage() {
  const { t } = useI18n();

  const [selectedSymbol, setSelectedSymbol] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const filteredOpportunities = useMemo(() => {
    let opportunities = mockArbitrageData;
    if (selectedSymbol !== 'all') {
      opportunities = opportunities.filter((o) => o.symbol === selectedSymbol);
    }
    if (filterStatus !== 'all') {
      opportunities = opportunities.filter((o) => o.status === filterStatus);
    }
    return opportunities;
  }, [selectedSymbol, filterStatus]);

  const stats = useMemo(() => {
    const detected = mockArbitrageData.filter((o) => o.status === 'detected').length;
    const actionable = mockArbitrageData.filter((o) => o.isActionable).length;
    const totalProfit = mockArbitrageData.reduce((sum, o) => sum + o.profitEstimate, 0);
    return { detected, actionable, totalProfit };
  }, []);

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('nav.crossChainArbitrage')}</h1>
          <p className="mt-1 text-muted-foreground">{t('nav.descriptions.crossChainArbitrage')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
          {t('crossChain.controls.refresh')}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Detected</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.detected}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actionable</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.actionable}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Total Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">${stats.totalProfit}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('crossChain.controls.symbol')}:</span>
              <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {AVAILABLE_SYMBOLS.map((symbol) => (
                    <SelectItem key={symbol} value={symbol}>
                      {symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="detected">Detected</SelectItem>
                  <SelectItem value="analyzing">Analyzing</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="executed">Executed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Arbitrage Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredOpportunities.length === 0 ? (
            <div className="text-center text-muted-foreground">No opportunities found</div>
          ) : (
            <div className="space-y-3">
              {filteredOpportunities.map((opp) => (
                <div
                  key={opp.id}
                  className={cn(
                    'rounded-lg border p-4',
                    opp.isActionable && 'border-green-500/30 bg-green-500/5',
                    !opp.isActionable && 'border-gray-200',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{opp.symbol}</span>
                          <Badge variant={opp.isActionable ? 'default' : 'secondary'}>
                            {opp.isActionable ? 'Actionable' : 'Low Priority'}
                          </Badge>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {opp.chainA} → {opp.chainB}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Deviation</div>
                        <div className="font-medium">{opp.deviationPercent.toFixed(2)}%</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Est. Profit</div>
                        <div className="font-medium text-green-600">${opp.profitEstimate}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Status</div>
                        <Badge
                          variant={
                            opp.status === 'detected'
                              ? 'destructive'
                              : opp.status === 'executed'
                                ? 'default'
                                : 'secondary'
                          }
                        >
                          {opp.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      ${opp.priceA.toLocaleString()} → ${opp.priceB.toLocaleString()}
                    </span>
                    <span>{new Date(opp.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
