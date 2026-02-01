'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Filter, Settings, RefreshCw, Download, Clock, Eye, EyeOff, X } from 'lucide-react';
import type {
  ComparisonFilter,
  ComparisonConfig,
  ComparisonView,
  OracleProtocol,
} from '@/lib/types/oracle';
import { PROTOCOL_DISPLAY_NAMES, ORACLE_PROTOCOLS } from '@/lib/types/oracle';
import { cn } from '@/lib/utils';

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
  { value: '1h', label: '1小时' },
  { value: '24h', label: '24小时' },
  { value: '7d', label: '7天' },
  { value: '30d', label: '30天' },
];

const refreshIntervalOptions = [
  { value: 5000, label: '5秒' },
  { value: 10000, label: '10秒' },
  { value: 30000, label: '30秒' },
  { value: 60000, label: '1分钟' },
  { value: 300000, label: '5分钟' },
];

const viewOptions: { value: ComparisonView; label: string; icon: React.ReactNode }[] = [
  { value: 'heatmap', label: '价格热力图', icon: <Filter className="h-4 w-4" /> },
  { value: 'latency', label: '延迟分析', icon: <Clock className="h-4 w-4" /> },
  { value: 'cost', label: '成本效益', icon: <Settings className="h-4 w-4" /> },
  { value: 'realtime', label: '实时对比', icon: <RefreshCw className="h-4 w-4" /> },
  { value: 'table', label: '数据表格', icon: <Eye className="h-4 w-4" /> },
];

export function ComparisonControls({
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
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          {/* View Selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
            {viewOptions.map((option) => (
              <Button
                key={option.value}
                variant={currentView === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => onViewChange(option.value)}
                className="flex items-center gap-1.5 whitespace-nowrap"
              >
                {option.icon}
                {option.label}
              </Button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Filter Popover */}
            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="relative">
                  <Filter className="mr-1 h-4 w-4" />
                  筛选
                  {activeFilterCount > 0 && (
                    <Badge
                      variant="default"
                      className="ml-1 flex h-5 w-5 items-center justify-center p-0 text-xs"
                    >
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">筛选条件</h4>
                    {activeFilterCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        <X className="mr-1 h-3 w-3" />
                        清除
                      </Button>
                    )}
                  </div>

                  {/* Protocol Filter */}
                  <div className="space-y-2">
                    <Label className="text-xs">协议</Label>
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
                      <Label className="text-xs">资产对</Label>
                      <Input
                        placeholder="搜索资产对..."
                        value={symbolSearch}
                        onChange={(e) => setSymbolSearch(e.target.value)}
                        className="h-8 text-sm"
                      />
                      <div className="max-h-32 space-y-1 overflow-y-auto">
                        {filteredSymbols.slice(0, 10).map((symbol) => (
                          <div
                            key={symbol}
                            className={cn(
                              'flex cursor-pointer items-center justify-between rounded p-2 text-sm',
                              filter.symbols?.includes(symbol) ? 'bg-primary/10' : 'hover:bg-muted',
                            )}
                            onClick={() => handleSymbolToggle(symbol)}
                          >
                            <span>{symbol}</span>
                            {filter.symbols?.includes(symbol) && (
                              <Eye className="text-primary h-3 w-3" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Deviation Filter */}
                  <div className="space-y-2">
                    <Label className="text-xs">最小偏离度 (%)</Label>
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
                    <Label className="text-xs">显示陈旧数据</Label>
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
                <Button variant="outline" size="sm">
                  <Settings className="mr-1 h-4 w-4" />
                  设置
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-4">
                  <h4 className="font-medium">显示设置</h4>

                  {/* Time Range */}
                  <div className="space-y-2">
                    <Label className="text-xs">时间范围</Label>
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
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Refresh Interval */}
                  <div className="space-y-2">
                    <Label className="text-xs">刷新间隔</Label>
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
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Reference Price Method */}
                  <div className="space-y-2">
                    <Label className="text-xs">参考价格计算方式</Label>
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
                        <SelectItem value="median">中位数</SelectItem>
                        <SelectItem value="mean">平均值</SelectItem>
                        <SelectItem value="weighted">加权平均</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Deviation Thresholds */}
                  <div className="space-y-2">
                    <Label className="text-xs">偏离阈值设置</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground text-xs">轻微</span>
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
                        <span className="text-muted-foreground text-xs">严重</span>
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

            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
              <RefreshCw className={cn('mr-1 h-4 w-4', isLoading && 'animate-spin')} />
              刷新
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="outline" size="sm">
                  <Download className="mr-1 h-4 w-4" />
                  导出
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onExport('json')}>导出为 JSON</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('csv')}>导出为 CSV</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Active Filters Display */}
        {activeFilterCount > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
            <span className="text-muted-foreground text-xs">已启用筛选:</span>
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
                偏离 &gt; {filter.minDeviation}%
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
