'use client';

import { useState, useCallback, Suspense, useMemo } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Clock, Gauge, TrendingUp, Shield, RefreshCw, Filter, X } from 'lucide-react';

import { Breadcrumb, ToastContainer, useToast } from '@/components/common';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Card, CardContent } from '@/components/ui';
import { ChartSkeleton } from '@/components/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui';
import { Label } from '@/components/ui';
import { Input } from '@/components/ui';
import { ComparisonContent } from '@/features/comparison/components/ComparisonContent';
import { DeviationContent } from '@/features/oracle/analytics/deviation/components/DeviationContent';
import {
  ReliabilityScoreCard,
  ReliabilityComparisonTable,
  ReliabilityTrendChart,
} from '@/features/oracle/reliability/components';
import { useReliabilityScores, useReliabilityTrend } from '@/features/oracle/reliability/hooks';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';
import { ORACLE_PROTOCOLS, PROTOCOL_DISPLAY_NAMES } from '@/types/oracle';
import type { OracleProtocol, TimePeriod, ProtocolRanking, TrendDataPoint } from '@/types/oracle';

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

const tabContentVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

type CompareTab = 'price' | 'latency' | 'cost' | 'deviation' | 'reliability';

const periods: { value: TimePeriod; labelKey: string }[] = [
  { value: '7d', labelKey: 'oracle.reliability.7d' },
  { value: '30d', labelKey: 'oracle.reliability.30d' },
  { value: '90d', labelKey: 'oracle.reliability.90d' },
];

export default function ComparePage() {
  const { t } = useI18n();
  const { toasts, removeToast } = useToast();

  const [activeTab, setActiveTab] = useState<CompareTab>('price');
  const [selectedProtocols, setSelectedProtocols] = useState<OracleProtocol[]>([
    ...ORACLE_PROTOCOLS,
  ]);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(['ETH/USD', 'BTC/USD']);
  const [symbolSearch, setSymbolSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [period, setPeriod] = useState<TimePeriod>('30d');
  const [selectedProtocol, setSelectedProtocol] = useState<string>('chainlink');

  const {
    rankings,
    lastUpdated: _lastUpdated,
    periodStart,
    periodEnd,
    isLoading: reliabilityLoading,
    isError: reliabilityError,
    refresh: refreshReliability,
  } = useReliabilityScores(period);
  const { trendData, isLoading: trendLoading } = useReliabilityTrend(selectedProtocol, 30);

  const handleProtocolToggle = useCallback((protocol: OracleProtocol) => {
    setSelectedProtocols((prev) =>
      prev.includes(protocol) ? prev.filter((p) => p !== protocol) : [...prev, protocol],
    );
  }, []);

  const handleSymbolToggle = useCallback((symbol: string) => {
    setSelectedSymbols((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol],
    );
  }, []);

  const handleSelectAllProtocols = useCallback(() => {
    setSelectedProtocols([...ORACLE_PROTOCOLS]);
  }, []);

  const handleClearAllProtocols = useCallback(() => {
    setSelectedProtocols([]);
  }, []);

  const filteredSymbols = useMemo(() => {
    return AVAILABLE_SYMBOLS.filter((s) => s.toLowerCase().includes(symbolSearch.toLowerCase()));
  }, [symbolSearch]);

  const activeFilterCount =
    (selectedProtocols.length > 0 && selectedProtocols.length < ORACLE_PROTOCOLS.length ? 1 : 0) +
    (selectedSymbols.length > 0 ? 1 : 0);

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  const breadcrumbItems = [{ label: t('nav.compare') }];

  return (
    <div className="space-y-4 sm:space-y-6">
      <Breadcrumb items={breadcrumbItems} />
      <ToastContainer toasts={toasts} onRemove={removeToast} />

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

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as CompareTab)}
        className="space-y-4 sm:space-y-6"
      >
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-xl border border-border/30 bg-muted/50 p-1.5 backdrop-blur-sm"
        >
          <TabsList className="grid w-full grid-cols-5 gap-1 bg-transparent">
            <TabsTrigger
              value="price"
              className="h-11 text-xs transition-all duration-200 hover:bg-background/80 data-[state=active]:border-border/50 data-[state=active]:bg-background data-[state=active]:shadow-sm sm:h-10 sm:text-sm"
            >
              <DollarSign className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('compare.tabs.price') || '价格比较'}</span>
              <span className="sm:hidden">{t('compare.tabs.priceShort') || '价格'}</span>
            </TabsTrigger>
            <TabsTrigger
              value="latency"
              className="h-11 text-xs transition-all duration-200 hover:bg-background/80 data-[state=active]:border-border/50 data-[state=active]:bg-background data-[state=active]:shadow-sm sm:h-10 sm:text-sm"
            >
              <Clock className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('compare.tabs.latency') || '延迟分析'}</span>
              <span className="sm:hidden">{t('compare.tabs.latencyShort') || '延迟'}</span>
            </TabsTrigger>
            <TabsTrigger
              value="cost"
              className="h-11 text-xs transition-all duration-200 hover:bg-background/80 data-[state=active]:border-border/50 data-[state=active]:bg-background data-[state=active]:shadow-sm sm:h-10 sm:text-sm"
            >
              <Gauge className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('compare.tabs.cost') || '成本效率'}</span>
              <span className="sm:hidden">{t('compare.tabs.costShort') || '成本'}</span>
            </TabsTrigger>
            <TabsTrigger
              value="deviation"
              className="h-11 text-xs transition-all duration-200 hover:bg-background/80 data-[state=active]:border-border/50 data-[state=active]:bg-background data-[state=active]:shadow-sm sm:h-10 sm:text-sm"
            >
              <TrendingUp className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('compare.tabs.deviation') || '偏差分析'}</span>
              <span className="sm:hidden">{t('compare.tabs.deviationShort') || '偏差'}</span>
            </TabsTrigger>
            <TabsTrigger
              value="reliability"
              className="h-11 text-xs transition-all duration-200 hover:bg-background/80 data-[state=active]:border-border/50 data-[state=active]:bg-background data-[state=active]:shadow-sm sm:h-10 sm:text-sm"
            >
              <Shield className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('compare.tabs.reliability') || '可靠性'}</span>
              <span className="sm:hidden">{t('compare.tabs.reliabilityShort') || '可靠'}</span>
            </TabsTrigger>
          </TabsList>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={tabContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'price' && (
              <TabsContent value="price" className="mt-0">
                <PriceComparisonTab
                  selectedProtocols={selectedProtocols}
                  selectedSymbols={selectedSymbols}
                />
              </TabsContent>
            )}

            {activeTab === 'latency' && (
              <TabsContent value="latency" className="mt-0">
                <LatencyAnalysisTab
                  selectedProtocols={selectedProtocols}
                  selectedSymbols={selectedSymbols}
                />
              </TabsContent>
            )}

            {activeTab === 'cost' && (
              <TabsContent value="cost" className="mt-0">
                <CostEfficiencyTab
                  selectedProtocols={selectedProtocols}
                  selectedSymbols={selectedSymbols}
                />
              </TabsContent>
            )}

            {activeTab === 'deviation' && (
              <TabsContent value="deviation" className="mt-0">
                <DeviationContent />
              </TabsContent>
            )}

            {activeTab === 'reliability' && (
              <TabsContent value="reliability" className="mt-0">
                <ReliabilityTab
                  rankings={rankings}
                  trendData={trendData}
                  selectedProtocol={selectedProtocol}
                  setSelectedProtocol={setSelectedProtocol}
                  period={period}
                  setPeriod={setPeriod}
                  periodStart={periodStart}
                  periodEnd={periodEnd}
                  isLoading={reliabilityLoading}
                  trendLoading={trendLoading}
                  isError={reliabilityError}
                  onRefresh={refreshReliability}
                  formatDate={formatDate}
                  t={t}
                />
              </TabsContent>
            )}
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </div>
  );
}

interface TabProps {
  selectedProtocols: OracleProtocol[];
  selectedSymbols: string[];
}

function PriceComparisonTab({ selectedProtocols, selectedSymbols }: TabProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium sm:text-lg">
                {t('compare.price.title') || '价格比较分析'}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('compare.price.description') || '实时价格对比、价格热力图、价格走势对比'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Suspense fallback={<ChartSkeleton className="h-96" />}>
        <ComparisonContentWrapper
          defaultView="heatmap"
          selectedProtocols={selectedProtocols}
          selectedSymbols={selectedSymbols}
        />
      </Suspense>
    </div>
  );
}

function LatencyAnalysisTab({ selectedProtocols, selectedSymbols }: TabProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium sm:text-lg">
                {t('compare.latency.title') || '延迟分析'}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('compare.latency.description') || '延迟对比图、延迟分布图'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Suspense fallback={<ChartSkeleton className="h-96" />}>
        <ComparisonContentWrapper
          defaultView="latency"
          selectedProtocols={selectedProtocols}
          selectedSymbols={selectedSymbols}
        />
      </Suspense>
    </div>
  );
}

function CostEfficiencyTab({ selectedProtocols, selectedSymbols }: TabProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium sm:text-lg">
                {t('compare.cost.title') || '成本效率分析'}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('compare.cost.description') || 'Gas 成本对比、成本趋势图'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Suspense fallback={<ChartSkeleton className="h-96" />}>
        <ComparisonContentWrapper
          defaultView="cost"
          selectedProtocols={selectedProtocols}
          selectedSymbols={selectedSymbols}
        />
      </Suspense>
    </div>
  );
}

interface ReliabilityTabProps {
  rankings: ProtocolRanking[];
  trendData: TrendDataPoint[];
  selectedProtocol: string;
  setSelectedProtocol: (protocol: string) => void;
  period: TimePeriod;
  setPeriod: (period: TimePeriod) => void;
  periodStart: string | undefined;
  periodEnd: string | undefined;
  isLoading: boolean;
  trendLoading: boolean;
  isError: boolean;
  onRefresh: () => void;
  formatDate: (dateStr: string | undefined) => string;
  t: (key: string) => string;
}

function ReliabilityTab({
  rankings,
  trendData,
  selectedProtocol,
  setSelectedProtocol,
  period,
  setPeriod,
  periodStart,
  periodEnd,
  isLoading,
  trendLoading,
  isError,
  onRefresh,
  formatDate,
  t,
}: ReliabilityTabProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-medium sm:text-lg">
                {t('compare.reliability.title') || '可靠性分析'}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('compare.reliability.description') || '可靠性评分排名、可靠性趋势图'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
                <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
                {t('common.refresh')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-xl border border-border/30 bg-card/30 p-4">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
          <TabsList className="grid w-full grid-cols-3">
            {periods.map((p) => (
              <TabsTrigger key={p.value} value={p.value}>
                {t(p.labelKey)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {periodStart && periodEnd && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <span>{`${formatDate(periodStart)} - ${formatDate(periodEnd)}`}</span>
          </div>
        )}
      </div>

      {isError && (
        <div className="border-destructive/50 bg-destructive/10 rounded-xl border p-4">
          <p className="text-destructive text-sm">{t('oracle.reliability.loadError')}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {rankings.map((ranking) => (
          <ReliabilityScoreCard
            key={ranking.protocol}
            protocol={ranking.protocol}
            score={ranking.score}
            rank={ranking.rank}
            accuracyScore={ranking.metrics.accuracyScore}
            latencyScore={ranking.metrics.latencyScore}
            availabilityScore={ranking.metrics.availabilityScore}
            deviationAvg={ranking.metrics.deviationAvg}
            sampleCount={ranking.metrics.sampleCount}
          />
        ))}
      </div>

      <ReliabilityComparisonTable rankings={rankings} isLoading={isLoading} />

      <Card className="border-border/50">
        <CardContent className="p-4">
          <h4 className="mb-4 text-base font-medium">{t('oracle.reliability.trendAnalysis')}</h4>
          <Tabs value={selectedProtocol} onValueChange={setSelectedProtocol}>
            <TabsList className="mb-4">
              {rankings.map((r) => (
                <TabsTrigger key={r.protocol} value={r.protocol} className="capitalize">
                  {r.protocol}
                </TabsTrigger>
              ))}
            </TabsList>
            {rankings.map((r) => (
              <TabsContent key={r.protocol} value={r.protocol}>
                <ReliabilityTrendChart
                  data={trendData}
                  protocol={r.protocol}
                  isLoading={trendLoading}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

interface ComparisonContentWrapperProps {
  defaultView: 'heatmap' | 'latency' | 'cost' | 'realtime' | 'table' | 'compare';
  selectedProtocols: OracleProtocol[];
  selectedSymbols: string[];
}

function ComparisonContentWrapper({
  defaultView: _defaultView,
  selectedProtocols: _selectedProtocols,
  selectedSymbols: _selectedSymbols,
}: ComparisonContentWrapperProps) {
  return (
    <div className="relative">
      <ComparisonContent />
    </div>
  );
}
