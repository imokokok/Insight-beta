'use client';

import { useState, useCallback, useMemo } from 'react';

import { DollarSign, Clock, Gauge, TrendingUp, Shield, Filter, X } from 'lucide-react';

import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Card, CardContent } from '@/components/ui';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui';
import { Label } from '@/components/ui';
import { Input } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';
import { ORACLE_PROTOCOLS, PROTOCOL_DISPLAY_NAMES } from '@/types/oracle';
import type { OracleProtocol } from '@/types/oracle';

import { useCompareParams } from '../hooks/useCompareParams';

const AVAILABLE_SYMBOLS = [
  'ETH/USD',
  'BTC/USD',
  'LINK/USD',
  'MATIC/USD',
  'AVAX/USD',
  'SOL/USD',
  'ARB/USD',
  'OP/USD',
];

export type CompareTab = 'price' | 'latency' | 'cost' | 'deviation' | 'reliability' | 'crossChain';

interface ComparePageLayoutProps {
  children: React.ReactNode;
  activeTab: CompareTab;
}

const TAB_ICONS: Record<CompareTab, React.ElementType> = {
  price: DollarSign,
  latency: Clock,
  cost: Gauge,
  deviation: TrendingUp,
  reliability: Shield,
  crossChain: TrendingUp,
};

export function ComparePageLayout({ children, activeTab }: ComparePageLayoutProps) {
  const { t } = useI18n();
  const { selectedProtocols, selectedSymbols, setSelectedProtocols, setSelectedSymbols } =
    useCompareParams();

  const [symbolSearch, setSymbolSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const ActiveTabIcon = TAB_ICONS[activeTab] || DollarSign;

  const handleProtocolToggle = useCallback(
    (protocol: OracleProtocol) => {
      setSelectedProtocols((prev) =>
        prev.includes(protocol) ? prev.filter((p) => p !== protocol) : [...prev, protocol],
      );
    },
    [setSelectedProtocols],
  );

  const handleSymbolToggle = useCallback(
    (symbol: string) => {
      setSelectedSymbols((prev) =>
        prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol],
      );
    },
    [setSelectedSymbols],
  );

  const handleSelectAllProtocols = useCallback(() => {
    setSelectedProtocols([...ORACLE_PROTOCOLS]);
  }, [setSelectedProtocols]);

  const handleClearAllProtocols = useCallback(() => {
    setSelectedProtocols([]);
  }, [setSelectedProtocols]);

  const filteredSymbols = useMemo(() => {
    return AVAILABLE_SYMBOLS.filter((s) => s.toLowerCase().includes(symbolSearch.toLowerCase()));
  }, [symbolSearch]);

  const activeFilterCount =
    (selectedProtocols.length > 0 && selectedProtocols.length < ORACLE_PROTOCOLS.length ? 1 : 0) +
    (selectedSymbols.length > 0 ? 1 : 0);

  return (
    <div className="space-y-3 p-3 sm:space-y-4 sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl lg:text-3xl">
            {t('compare.pageTitle') || '比较中心'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('compare.pageDescription') || '整合所有 Oracle 比较分析功能，一站式对比分析'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <Filter className="mr-2 h-4 w-4" />
                {t('compare.filters') || '筛选'}
                {activeFilterCount > 0 && (
                  <Badge
                    variant="default"
                    className="ml-2 flex h-5 w-5 items-center justify-center p-0 text-xs"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{t('compare.filterConditions') || '筛选条件'}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      handleSelectAllProtocols();
                      setSelectedSymbols([]);
                    }}
                  >
                    <X className="mr-1 h-3 w-3" />
                    {t('compare.reset') || '重置'}
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">{t('compare.protocols') || '协议'}</Label>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={handleSelectAllProtocols}
                      >
                        {t('compare.selectAll') || '全选'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={handleClearAllProtocols}
                      >
                        {t('compare.clearAll') || '清空'}
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {ORACLE_PROTOCOLS.map((protocol) => (
                      <Badge
                        key={protocol}
                        variant={selectedProtocols.includes(protocol) ? 'default' : 'outline'}
                        className="cursor-pointer text-xs capitalize"
                        onClick={() => handleProtocolToggle(protocol)}
                      >
                        {PROTOCOL_DISPLAY_NAMES[protocol]}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">{t('compare.tradingPairs') || '交易对'}</Label>
                  <Input
                    placeholder={t('compare.searchPairs') || '搜索交易对...'}
                    value={symbolSearch}
                    onChange={(e) => setSymbolSearch(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <div className="max-h-32 space-y-1 overflow-y-auto">
                    {filteredSymbols.map((symbol) => (
                      <button
                        type="button"
                        key={symbol}
                        className={cn(
                          'flex w-full cursor-pointer items-center justify-between rounded p-2 text-left text-sm',
                          selectedSymbols.includes(symbol) ? 'bg-primary/10' : 'hover:bg-muted',
                        )}
                        onClick={() => handleSymbolToggle(symbol)}
                      >
                        <span>{symbol}</span>
                        {selectedSymbols.includes(symbol) && <X className="h-3 w-3 text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {activeFilterCount > 0 && (
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {t('compare.activeFilters') || '已选筛选:'}
              </span>
              {selectedProtocols.length > 0 &&
                selectedProtocols.length < ORACLE_PROTOCOLS.length && (
                  <Badge variant="secondary" className="text-xs">
                    {t('compare.protocols') || '协议'}: {selectedProtocols.length}
                    <X className="ml-1 h-3 w-3 cursor-pointer" onClick={handleSelectAllProtocols} />
                  </Badge>
                )}
              {selectedSymbols.map((symbol) => (
                <Badge key={symbol} variant="secondary" className="text-xs">
                  {symbol}
                  <X
                    className="ml-1 h-3 w-3 cursor-pointer"
                    onClick={() => handleSymbolToggle(symbol)}
                  />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ActiveTabIcon className="h-4 w-4" />
        <span>{t(`compare.tabs.${activeTab}`) || activeTab}</span>
      </div>

      {children}
    </div>
  );
}
