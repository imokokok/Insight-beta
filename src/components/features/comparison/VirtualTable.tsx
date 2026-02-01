'use client';

import React, { useMemo, useCallback, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import type { RealtimeComparisonItem, OracleProtocol } from '@/lib/types/oracle';
import { PROTOCOL_DISPLAY_NAMES } from '@/lib/types/oracle';
import { exportRealtimeToCSV } from '@/lib/utils/export';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowUpDown,
  Search,
  Download,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
} from 'lucide-react';

interface VirtualTableProps {
  data?: RealtimeComparisonItem[];
  isLoading?: boolean;
  onExport?: (format: 'json' | 'csv') => void;
  rowHeight?: number;
  containerHeight?: number;
}

type SortField = 'symbol' | 'price' | 'deviation' | 'spread' | 'latency' | 'updated';
type SortDirection = 'asc' | 'desc';

interface TableRowData {
  id: string;
  symbol: string;
  protocol: OracleProtocol;
  price: number;
  deviation: number;
  deviationPercent: number;
  spread: number;
  spreadPercent: number;
  latency: number;
  confidence: number;
  status: 'active' | 'stale' | 'error';
  lastUpdated: string;
}

const HEADER_HEIGHT = 48;
const DEFAULT_ROW_HEIGHT = 52;
const DEFAULT_CONTAINER_HEIGHT = 600;
const OVERSCAN = 5;

export const VirtualTable = React.memo(function VirtualTable({
  data,
  isLoading,
  onExport,
  rowHeight = DEFAULT_ROW_HEIGHT,
  containerHeight = DEFAULT_CONTAINER_HEIGHT,
}: VirtualTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('symbol');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 转换数据为表格格式 - 使用 useMemo 缓存
  const tableData = useMemo<TableRowData[]>(() => {
    if (!data) return [];

    const rows: TableRowData[] = [];
    data.forEach((item) => {
      item.protocols.forEach((protocol) => {
        rows.push({
          id: `${item.symbol}-${protocol.protocol}`,
          symbol: item.symbol,
          protocol: protocol.protocol,
          price: protocol.price,
          deviation: protocol.deviationFromConsensus,
          deviationPercent: protocol.deviationFromConsensus,
          spread: item.spread.absolute,
          spreadPercent: item.spread.percent,
          latency: protocol.latency,
          confidence: protocol.confidence,
          status: protocol.status,
          lastUpdated: protocol.timestamp,
        });
      });
    });
    return rows;
  }, [data]);

  // 筛选数据
  const filteredData = useMemo(() => {
    if (!searchTerm) return tableData;

    const term = searchTerm.toLowerCase();
    return tableData.filter(
      (row) => row.symbol.toLowerCase().includes(term) || row.protocol.toLowerCase().includes(term),
    );
  }, [tableData, searchTerm]);

  // 排序数据
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'symbol':
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'deviation':
          comparison = Math.abs(a.deviation) - Math.abs(b.deviation);
          break;
        case 'spread':
          comparison = a.spreadPercent - b.spreadPercent;
          break;
        case 'latency':
          comparison = a.latency - b.latency;
          break;
        case 'updated':
          comparison = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortField, sortDirection]);

  // 虚拟滚动计算
  const { virtualItems, totalHeight, startIndex, endIndex } = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
    const visibleCount = Math.ceil(containerHeight / rowHeight);
    const endIndex = Math.min(sortedData.length - 1, startIndex + visibleCount + OVERSCAN * 2);

    const virtualItems = [];
    for (let i = startIndex; i <= endIndex; i++) {
      virtualItems.push({
        index: i,
        data: sortedData[i],
        style: {
          position: 'absolute' as const,
          top: i * rowHeight,
          height: rowHeight,
          left: 0,
          right: 0,
        },
      });
    }

    return {
      virtualItems,
      totalHeight: sortedData.length * rowHeight,
      startIndex,
      endIndex,
    };
  }, [scrollTop, sortedData, rowHeight, containerHeight]);

  // 防抖的滚动处理
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const handleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDirection('asc');
      return field;
    });
  }, []);

  // 格式化函数
  const formatters = useMemo(
    () => ({
      price: (price: number) => {
        if (price >= 1000) return `$${price.toLocaleString()}`;
        if (price >= 1) return `$${price.toFixed(2)}`;
        return `$${price.toFixed(4)}`;
      },
      deviation: (value: number) => {
        const absValue = Math.abs(value);
        if (absValue < 0.01) return '<0.01%';
        return `${absValue.toFixed(2)}%`;
      },
      latency: (ms: number) => {
        if (ms < 1000) return `${ms.toFixed(0)}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
      },
    }),
    [],
  );

  // 样式计算函数
  const getDeviationColor = useCallback((deviation: number) => {
    const abs = Math.abs(deviation);
    if (abs > 2) return 'text-red-600 bg-red-50';
    if (abs > 1) return 'text-orange-600 bg-orange-50';
    if (abs > 0.5) return 'text-yellow-600 bg-yellow-50';
    return 'text-emerald-600 bg-emerald-50';
  }, []);

  const getStatusBadge = useCallback((status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="default" className="bg-emerald-500 text-xs">
            活跃
          </Badge>
        );
      case 'stale':
        return (
          <Badge variant="secondary" className="text-xs">
            陈旧
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="text-xs">
            错误
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            未知
          </Badge>
        );
    }
  }, []);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">详细数据表格</CardTitle>
            <CardDescription className="text-muted-foreground mt-1 text-sm">
              所有资产对和协议的完整对比数据 (虚拟滚动优化)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
              <Input
                placeholder="搜索资产对或协议..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 pl-9"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="outline" size="sm">
                  <Download className="mr-1 h-4 w-4" />
                  导出
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => data && exportRealtimeToCSV(data)}>
                  导出为 CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport?.('json')}>导出为 JSON</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 统计信息 */}
        <div className="text-muted-foreground mb-4 flex items-center gap-4 text-sm">
          <span>
            总计: <strong className="text-foreground">{sortedData.length}</strong> 条记录
          </span>
          <span>
            显示:{' '}
            <strong className="text-foreground">
              {startIndex + 1} - {Math.min(endIndex + 1, sortedData.length)}
            </strong>
          </span>
          {searchTerm && (
            <span>
              搜索: <strong className="text-foreground">&quot;{searchTerm}&quot;</strong>
            </span>
          )}
        </div>

        {/* 虚拟滚动表格 */}
        <div
          ref={containerRef}
          className="overflow-auto rounded-lg border"
          style={{ height: containerHeight }}
          onScroll={handleScroll}
        >
          {/* 表头 */}
          <div
            className="bg-muted/95 supports-[backdrop-filter]:bg-muted/60 sticky top-0 z-10 border-b backdrop-blur"
            style={{ height: HEADER_HEIGHT }}
          >
            <div className="flex h-full items-center px-4 text-sm font-medium">
              <div className="w-[100px]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('symbol')}
                  className="h-8 font-medium"
                >
                  资产对
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </div>
              <div className="flex-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('price')}
                  className="h-8 font-medium"
                >
                  协议
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </div>
              <div className="w-[120px] text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('price')}
                  className="h-8 font-medium"
                >
                  价格
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </div>
              <div className="w-[120px] text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('deviation')}
                  className="h-8 font-medium"
                >
                  偏离度
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </div>
              <div className="w-[100px] text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('spread')}
                  className="h-8 font-medium"
                >
                  价差
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </div>
              <div className="w-[100px] text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('latency')}
                  className="h-8 font-medium"
                >
                  延迟
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </div>
              <div className="w-[80px] text-center">状态</div>
              <div className="w-[80px] text-right">置信度</div>
              <div className="w-[50px]"></div>
            </div>
          </div>

          {/* 虚拟列表容器 */}
          <div style={{ height: totalHeight, position: 'relative' }}>
            {virtualItems.map(({ data: row, style }) => {
              if (!row) return null;
              return (
                <div
                  key={row.id}
                  className="hover:bg-muted/30 flex items-center border-b px-4 transition-colors"
                  style={style}
                >
                  <div className="w-[100px] truncate font-medium">{row.symbol}</div>
                  <div className="flex-1 capitalize">{PROTOCOL_DISPLAY_NAMES[row.protocol]}</div>
                  <div className="w-[120px] text-right font-mono">
                    {formatters.price(row.price)}
                  </div>
                  <div className="w-[120px] text-right">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium',
                        getDeviationColor(row.deviation),
                      )}
                    >
                      {row.deviation > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : row.deviation < 0 ? (
                        <TrendingDown className="h-3 w-3" />
                      ) : (
                        <Minus className="h-3 w-3" />
                      )}
                      {formatters.deviation(row.deviation)}
                    </span>
                  </div>
                  <div className="w-[100px] text-right">
                    <Badge
                      variant={
                        row.spreadPercent > 1
                          ? 'destructive'
                          : row.spreadPercent > 0.5
                            ? 'secondary'
                            : 'default'
                      }
                      className="text-xs"
                    >
                      ±{row.spreadPercent.toFixed(2)}%
                    </Badge>
                  </div>
                  <div className="w-[100px] text-right">
                    <span
                      className={cn(
                        'text-xs',
                        row.latency > 5000
                          ? 'text-red-600'
                          : row.latency > 1000
                            ? 'text-yellow-600'
                            : 'text-emerald-600',
                      )}
                    >
                      <Clock className="mr-1 inline h-3 w-3" />
                      {formatters.latency(row.latency)}
                    </span>
                  </div>
                  <div className="w-[80px] text-center">{getStatusBadge(row.status)}</div>
                  <div className="w-[80px] text-right">
                    <span className="text-muted-foreground text-xs">
                      {(row.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-[50px]">
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>查看详情</DropdownMenuItem>
                        <DropdownMenuItem>添加到观察列表</DropdownMenuItem>
                        <DropdownMenuItem>设置告警</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default VirtualTable;
