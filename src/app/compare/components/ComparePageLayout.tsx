'use client';

import { useState, useCallback, useMemo } from 'react';

import { motion } from 'framer-motion';
import { DollarSign, Clock, Gauge, TrendingUp, Shield, Filter, X } from 'lucide-react';

import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Card, CardContent } from '@/components/ui';
import { TabsList, TabsTrigger } from '@/components/ui';
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

export type CompareTab = 'price' | 'latency' | 'cost' | 'deviation' | 'reliability';

interface ComparePageLayoutProps {
  children: React.ReactNode;
  activeTab: CompareTab;
}

const tabRoutes: Record<CompareTab, string> = {
  price: '/compare/price',
  latency: '/compare/latency',
  cost: '/compare/cost',
  deviation: '/compare/deviation',
  reliability: '/compare/reliability',
};

export function ComparePageLayout({ children, activeTab }: ComparePageLayoutProps) {
  const { t } = useI18n();
  const { selectedProtocols, selectedSymbols, setSelectedProtocols, setSelectedSymbols } =
    useCompareParams();

  const [symbolSearch, setSymbolSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

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
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-xl border border-border/30 bg-muted/50 p-1.5 backdrop-blur-sm"
      >
        <TabsList className="flex w-full gap-1 overflow-x-auto bg-transparent">
          <a href={tabRoutes.price}>
            <TabsTrigger
              value="price"
              className={cn(
                'h-11 w-full text-xs transition-all duration-200 hover:bg-background/80 data-[state=active]:border-border/50 data-[state=active]:bg-background data-[state=active]:shadow-sm sm:h-10 sm:text-sm',
                activeTab === 'price' && 'border-border/50 bg-background shadow-sm',
              )}
            >
              <DollarSign className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('compare.tabs.price') || '价格比较'}</span>
              <span className="sm:hidden">{t('compare.tabs.priceShort') || '价格'}</span>
            </TabsTrigger>
          </a>
          <a href={tabRoutes.latency}>
            <TabsTrigger
              value="latency"
              className={cn(
                'h-11 w-full text-xs transition-all duration-200 hover:bg-background/80 data-[state=active]:border-border/50 data-[state=active]:bg-background data-[state=active]:shadow-sm sm:h-10 sm:text-sm',
                activeTab === 'latency' && 'border-border/50 bg-background shadow-sm',
              )}
            >
              <Clock className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('compare.tabs.latency') || '延迟分析'}</span>
              <span className="sm:hidden">{t('compare.tabs.latencyShort') || '延迟'}</span>
            </TabsTrigger>
          </a>
          <a href={tabRoutes.cost}>
            <TabsTrigger
              value="cost"
              className={cn(
                'h-11 w-full text-xs transition-all duration-200 hover:bg-background/80 data-[state=active]:border-border/50 data-[state=active]:bg-background data-[state=active]:shadow-sm sm:h-10 sm:text-sm',
                activeTab === 'cost' && 'border-border/50 bg-background shadow-sm',
              )}
            >
              <Gauge className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('compare.tabs.cost') || '成本效率'}</span>
              <span className="sm:hidden">{t('compare.tabs.costShort') || '成本'}</span>
            </TabsTrigger>
          </a>
          <a href={tabRoutes.deviation}>
            <TabsTrigger
              value="deviation"
              className={cn(
                'h-11 w-full text-xs transition-all duration-200 hover:bg-background/80 data-[state=active]:border-border/50 data-[state=active]:bg-background data-[state=active]:shadow-sm sm:h-10 sm:text-sm',
                activeTab === 'deviation' && 'border-border/50 bg-background shadow-sm',
              )}
            >
              <TrendingUp className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('compare.tabs.deviation') || '偏差分析'}</span>
              <span className="sm:hidden">{t('compare.tabs.deviationShort') || '偏差'}</span>
            </TabsTrigger>
          </a>
          <a href={tabRoutes.reliability}>
            <TabsTrigger
              value="reliability"
              className={cn(
                'h-11 w-full text-xs transition-all duration-200 hover:bg-background/80 data-[state=active]:border-border/50 data-[state=active]:bg-background data-[state=active]:shadow-sm sm:h-10 sm:text-sm',
                activeTab === 'reliability' && 'border-border/50 bg-background shadow-sm',
              )}
            >
              <Shield className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('compare.tabs.reliability') || '可靠性'}</span>
              <span className="sm:hidden">{t('compare.tabs.reliabilityShort') || '可靠'}</span>
            </TabsTrigger>
          </a>
        </TabsList>
      </motion.div>

      {children}
    </div>
  );
}
