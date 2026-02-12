'use client';

import React, { useState, useCallback, memo } from 'react';

import { Filter, Settings, RefreshCw, Download, Clock, Eye, EyeOff, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n } from '@/i18n';
import type {
  ComparisonFilter,
  ComparisonConfig,
  ComparisonView,
  OracleProtocol,
} from '@/types/oracle';
import { PROTOCOL_DISPLAY_NAMES, ORACLE_PROTOCOLS } from '@/types/oracle';
import { cn } from '@/shared/utils';

interface ComparisonControlsProps {
  filter: ComparisonFilter;
  config: ComparisonConfig;
  currentView: ComparisonView;
  onFilterChange: (filter: ComparisonFilter) => void;
  onConfigChange: (config: ComparisonConfig) => void;
  onViewChange: (view: ComparisonView) => void;
  onRefresh: () => void;
  onExport: (format?: 'json' | 'csv') => void;
  isLoading?: boolean;
  availableSymbols?: string[];
}

const timeRangeOptions = [
  { value: '1h', labelKey: 'comparison.timeRange.1h' },
  { value: '24h', labelKey: 'comparison.timeRange.24h' },
  { value: '7d', labelKey: 'comparison.timeRange.7d' },
  { value: '30d', labelKey: 'comparison.timeRange.30d' },
];

const refreshIntervalOptions = [
  { value: 5000, labelKey: 'comparison.timeRange.5s' },
  { value: 10000, labelKey: 'comparison.timeRange.10s' },
  { value: 30000, labelKey: 'comparison.timeRange.30s' },
  { value: 60000, labelKey: 'comparison.timeRange.1m' },
  { value: 300000, labelKey: 'comparison.timeRange.5m' },
];

const viewOptions: { value: ComparisonView; labelKey: string; icon: React.ReactNode }[] = [
  { value: 'heatmap', labelKey: 'comparison.views.heatmap', icon: <Filter className="h-4 w-4" /> },
  { value: 'latency', labelKey: 'comparison.views.latency', icon: <Clock className="h-4 w-4" /> },
  { value: 'cost', labelKey: 'comparison.views.cost', icon: <Settings className="h-4 w-4" /> },
  {
    value: 'realtime',
    labelKey: 'comparison.views.realtime',
    icon: <RefreshCw className="h-4 w-4" />,
  },
  { value: 'table', labelKey: 'comparison.views.table', icon: <Eye className="h-4 w-4" /> },
];

export const ComparisonControls = memo(function ComparisonControls({
  filter,
  config,
  currentView,
  onFilterChange,
  onConfigChange,
  onViewChange,
  onRefresh,
  onExport,
  isLoading,
  availableSymbols = [],
}: ComparisonControlsProps) {
  const { t } = useI18n();
  const [showFilters, setShowFilters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [symbolSearch, setSymbolSearch] = useState('');

  const handleProtocolToggle = useCallback(
    (protocol: OracleProtocol) => {
      const currentProtocols = filter.protocols || [];
      const newProtocols = currentProtocols.includes(protocol)
        ? currentProtocols.filter((p) => p !== protocol)
        : [...currentProtocols, protocol];

      onFilterChange({ ...filter, protocols: newProtocols });
    },
    [filter, onFilterChange],
  );

  const handleSymbolToggle = useCallback(
    (symbol: string) => {
      const currentSymbols = filter.symbols || [];
      const newSymbols = currentSymbols.includes(symbol)
        ? currentSymbols.filter((s) => s !== symbol)
        : [...currentSymbols, symbol];

      onFilterChange({ ...filter, symbols: newSymbols });
    },
    [filter, onFilterChange],
  );

  const clearFilters = useCallback(() => {
    onFilterChange({});
  }, [onFilterChange]);

  const activeFilterCount =
    (filter.protocols?.length || 0) +
    (filter.symbols?.length || 0) +
    (filter.chains?.length || 0) +
    (filter.minDeviation ? 1 : 0) +
    (filter.maxLatency ? 1 : 0);

  const filteredSymbols = availableSymbols.filter((s) =>
    s.toLowerCase().includes(symbolSearch.toLowerCase()),
  );

  return (
    <Card className="w-full">
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center">
          {/* View Selector */}
          <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1 sm:gap-2 sm:pb-2 lg:pb-0">
            {viewOptions.map((option) => (
              <Button
                key={option.value}
                variant={currentView === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => onViewChange(option.value)}
                className="flex items-center gap-1 whitespace-nowrap px-2 text-xs sm:gap-1.5 sm:px-3 sm:text-sm"
              >
                {option.icon}
                <span className="hidden sm:inline">{t(option.labelKey)}</span>
                <span className="sm:hidden">
                  {option.value === 'heatmap'
                    ? 'Heat'
                    : option.value === 'latency'
                      ? 'Lat'
                      : option.value === 'cost'
                        ? 'Cost'
                        : option.value === 'realtime'
                          ? 'Live'
                          : 'Table'}
                </span>
              </Button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Filter Popover */}
            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="relative px-2 text-xs sm:px-3 sm:text-sm"
                >
                  <Filter className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{t('comparison.controls.filter')}</span>
                  <span className="sm:hidden">Filter</span>
                  {activeFilterCount > 0 && (
                    <Badge
                      variant="default"
                      className="ml-1 flex h-4 w-4 items-center justify-center p-0 text-xs sm:h-5 sm:w-5"
                    >
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 sm:w-80" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{t('comparison.controls.filterConditions')}</h4>
                    {activeFilterCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        <X className="mr-1 h-3 w-3" />
                        {t('comparison.controls.clear')}
                      </Button>
                    )}
                  </div>

                  {/* Protocol Filter */}
                  <div className="space-y-2">
                    <Label className="text-xs">{t('comparison.controls.protocol')}</Label>
                    <div className="flex flex-wrap gap-1">
                      {ORACLE_PROTOCOLS.map((protocol) => (
                        <Badge
                          key={protocol}
                          variant={filter.protocols?.includes(protocol) ? 'default' : 'outline'}
                          className="cursor-pointer text-xs capitalize"
                          onClick={() => handleProtocolToggle(protocol)}
                        >
                          {PROTOCOL_DISPLAY_NAMES[protocol]}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Symbol Filter */}
                  {availableSymbols.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs">{t('comparison.controls.assetPair')}</Label>
                      <Input
                        placeholder={t('comparison.controls.searchAssetPair')}
                        value={symbolSearch}
                        onChange={(e) => setSymbolSearch(e.target.value)}
                        className="h-8 text-sm"
                      />
                      <div className="max-h-32 space-y-1 overflow-y-auto">
                        {filteredSymbols.slice(0, 10).map((symbol) => (
                          <button
                            type="button"
                            key={symbol}
                            className={cn(
                              'flex w-full cursor-pointer items-center justify-between rounded p-2 text-left text-sm',
                              filter.symbols?.includes(symbol) ? 'bg-primary/10' : 'hover:bg-muted',
                            )}
                            onClick={() => handleSymbolToggle(symbol)}
                          >
                            <span>{symbol}</span>
                            {filter.symbols?.includes(symbol) && (
                              <Eye className="text-primary h-3 w-3" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Deviation Filter */}
                  <div className="space-y-2">
                    <Label className="text-xs">{t('comparison.controls.minDeviation')}</Label>
                    <Input
                      type="number"
                      placeholder="0.1"
                      value={filter.minDeviation || ''}
                      onChange={(e) =>
                        onFilterChange({
                          ...filter,
                          minDeviation: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* Stale Filter */}
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">{t('comparison.controls.showStaleData')}</Label>
                    <Button
                      variant={filter.showStale ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onFilterChange({ ...filter, showStale: !filter.showStale })}
                      className="h-7"
                    >
                      {filter.showStale ? (
                        <Eye className="h-3 w-3" />
                      ) : (
                        <EyeOff className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Settings Popover */}
            <Popover open={showSettings} onOpenChange={setShowSettings}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="px-2 text-xs sm:px-3 sm:text-sm">
                  <Settings className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{t('comparison.controls.settings')}</span>
                  <span className="sm:hidden">Settings</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-4">
                  <h4 className="font-medium">{t('comparison.controls.displaySettings')}</h4>

                  {/* Time Range */}
                  <div className="space-y-2">
                    <Label className="text-xs">{t('comparison.controls.timeRange')}</Label>
                    <Select
                      value={config.timeRange}
                      onValueChange={(value: string) =>
                        onConfigChange({
                          ...config,
                          timeRange: value as ComparisonConfig['timeRange'],
                        })
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeRangeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {t(option.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Refresh Interval */}
                  <div className="space-y-2">
                    <Label className="text-xs">{t('comparison.controls.refreshInterval')}</Label>
                    <Select
                      value={config.refreshInterval.toString()}
                      onValueChange={(value: string) =>
                        onConfigChange({
                          ...config,
                          refreshInterval: parseInt(value),
                        })
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {refreshIntervalOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            {t(option.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Reference Price Method */}
                  <div className="space-y-2">
                    <Label className="text-xs">
                      {t('comparison.controls.referencePriceMethod')}
                    </Label>
                    <Select
                      value={config.referencePriceMethod}
                      onValueChange={(value: string) =>
                        onConfigChange({
                          ...config,
                          referencePriceMethod: value as ComparisonConfig['referencePriceMethod'],
                        })
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="median">{t('comparison.controls.median')}</SelectItem>
                        <SelectItem value="mean">{t('comparison.controls.mean')}</SelectItem>
                        <SelectItem value="weighted">
                          {t('comparison.controls.weightedAverage')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Deviation Thresholds */}
                  <div className="space-y-2">
                    <Label className="text-xs">{t('comparison.controls.deviationThreshold')}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground text-xs">
                          {t('comparison.controls.slight')}
                        </span>
                        <Input
                          type="number"
                          value={config.deviationThresholds.low}
                          onChange={(e) =>
                            onConfigChange({
                              ...config,
                              deviationThresholds: {
                                ...config.deviationThresholds,
                                low: parseFloat(e.target.value),
                              },
                            })
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">
                          {t('comparison.controls.severe')}
                        </span>
                        <Input
                          type="number"
                          value={config.deviationThresholds.critical}
                          onChange={(e) =>
                            onConfigChange({
                              ...config,
                              deviationThresholds: {
                                ...config.deviationThresholds,
                                critical: parseFloat(e.target.value),
                              },
                            })
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="px-2 text-xs sm:px-3 sm:text-sm"
            >
              <RefreshCw
                className={cn('mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4', isLoading && 'animate-spin')}
              />
              <span className="hidden sm:inline">{t('comparison.controls.refresh')}</span>
              <span className="sm:hidden">Refresh</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="outline" size="sm" className="px-2 text-xs sm:px-3 sm:text-sm">
                  <Download className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{t('comparison.controls.export')}</span>
                  <span className="sm:hidden">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onExport('json')}>
                  {t('comparison.controls.exportJSON')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('csv')}>
                  {t('comparison.controls.exportCSV')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Active Filters Display */}
        {activeFilterCount > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
            <span className="text-muted-foreground text-xs">
              {t('comparison.controls.filterActive')}
            </span>
            {filter.protocols?.map((protocol) => (
              <Badge key={protocol} variant="secondary" className="text-xs capitalize">
                {PROTOCOL_DISPLAY_NAMES[protocol]}
                <X
                  className="ml-1 h-3 w-3 cursor-pointer"
                  onClick={() => handleProtocolToggle(protocol)}
                />
              </Badge>
            ))}
            {filter.symbols?.map((symbol) => (
              <Badge key={symbol} variant="secondary" className="text-xs">
                {symbol}
                <X
                  className="ml-1 h-3 w-3 cursor-pointer"
                  onClick={() => handleSymbolToggle(symbol)}
                />
              </Badge>
            ))}
            {filter.minDeviation && (
              <Badge variant="secondary" className="text-xs">
                {t('comparison.table.deviation')} &gt; {filter.minDeviation}%
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
