'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Filter,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
} from 'lucide-react';
import type { RealtimeComparisonItem, OracleProtocol } from '@/lib/types/oracle';
import { PROTOCOL_DISPLAY_NAMES } from '@/lib/types/oracle';
import { cn } from '@/lib/utils';
import { exportRealtimeToCSV } from '@/lib/utils/export';

interface ComparisonTableProps {
  data?: RealtimeComparisonItem[];
  isLoading?: boolean;
  onExport?: (format: 'json' | 'csv') => void;
}

type SortField = 'symbol' | 'price' | 'deviation' | 'spread' | 'latency' | 'updated';
type SortDirection = 'asc' | 'desc';

interface TableRowData {
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

export function ComparisonTable({ data, isLoading, onExport }: ComparisonTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('symbol');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProtocols] = useState<OracleProtocol[]>([]);
  const itemsPerPage = 10;

  // 转换数据为表格格式
  const tableData = useMemo<TableRowData[]>(() => {
    if (!data) return [];

    const rows: TableRowData[] = [];
    data.forEach((item) => {
      item.protocols.forEach((protocol) => {
        rows.push({
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
    let filtered = tableData;

    // 搜索筛选
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (row) =>
          row.symbol.toLowerCase().includes(term) || row.protocol.toLowerCase().includes(term),
      );
    }

    // 协议筛选
    if (selectedProtocols.length > 0) {
      filtered = filtered.filter((row) => selectedProtocols.includes(row.protocol));
    }

    return filtered;
  }, [tableData, searchTerm, selectedProtocols]);

  // 排序数据
  const sortedData = useMemo(() => {
    const sorted = [...filteredData].sort((a, b) => {
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
    return sorted;
  }, [filteredData, sortField, sortDirection]);

  // 分页数据
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${price.toLocaleString()}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    return `$${price.toFixed(4)}`;
  };

  const formatDeviation = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue < 0.01) return '<0.01%';
    return `${absValue.toFixed(2)}%`;
  };

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getDeviationColor = (deviation: number) => {
    const abs = Math.abs(deviation);
    if (abs > 2) return 'text-red-600 bg-red-50';
    if (abs > 1) return 'text-orange-600 bg-orange-50';
    if (abs > 0.5) return 'text-yellow-600 bg-yellow-50';
    return 'text-emerald-600 bg-emerald-50';
  };

  const getStatusBadge = (status: string) => {
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
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
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
              所有资产对和协议的完整对比数据
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
            总计: <strong className="text-foreground">{filteredData.length}</strong> 条记录
          </span>
          {selectedProtocols.length > 0 && (
            <span>
              已筛选: <strong className="text-foreground">{selectedProtocols.length}</strong> 个协议
            </span>
          )}
          {searchTerm && (
            <span>
              搜索: <strong className="text-foreground">&quot;{searchTerm}&quot;</strong>
            </span>
          )}
        </div>

        {/* 表格 */}
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[100px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('symbol')}
                    className="h-8 font-medium"
                  >
                    资产对
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('price')}
                    className="h-8 font-medium"
                  >
                    协议
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('price')}
                    className="h-8 font-medium"
                  >
                    价格
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('deviation')}
                    className="h-8 font-medium"
                  >
                    偏离度
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('spread')}
                    className="h-8 font-medium"
                  >
                    价差
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('latency')}
                    className="h-8 font-medium"
                  >
                    延迟
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-center">状态</TableHead>
                <TableHead className="text-right">置信度</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-muted-foreground py-8 text-center">
                    <Filter className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    没有找到匹配的数据
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, index) => (
                  <TableRow
                    key={`${row.symbol}-${row.protocol}-${index}`}
                    className="hover:bg-muted/30"
                  >
                    <TableCell className="font-medium">{row.symbol}</TableCell>
                    <TableCell className="capitalize">
                      {PROTOCOL_DISPLAY_NAMES[row.protocol]}
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatPrice(row.price)}</TableCell>
                    <TableCell className="text-right">
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
                        {formatDeviation(row.deviation)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
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
                    </TableCell>
                    <TableCell className="text-right">
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
                        {formatLatency(row.latency)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{getStatusBadge(row.status)}</TableCell>
                    <TableCell className="text-right">
                      <span className="text-muted-foreground text-xs">
                        {(row.confidence * 100).toFixed(0)}%
                      </span>
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-muted-foreground text-sm">
              显示 {(currentPage - 1) * itemsPerPage + 1} -{' '}
              {Math.min(currentPage * itemsPerPage, sortedData.length)} 条， 共 {sortedData.length}{' '}
              条
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                第 {currentPage} / {totalPages} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
