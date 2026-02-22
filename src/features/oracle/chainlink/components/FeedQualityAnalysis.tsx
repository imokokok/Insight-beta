'use client';

import { useState, useEffect, useCallback } from 'react';

import { TrendingUp, AlertTriangle, BarChart3, Activity, Shield, RefreshCw } from 'lucide-react';

import { ContentSection, ContentGrid } from '@/components/common';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Progress } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { fetchApiData } from '@/shared/utils/api';

interface VolatilityMetrics {
  hourly: number;
  daily: number;
  weekly: number;
  maxDrawdown: number;
}

interface DeviationComparison {
  protocol: string;
  price: number;
  deviationFromChainlink: number;
  deviationPercentage: number;
}

interface Anomaly {
  timestamp: string;
  type: 'spike' | 'drop';
  magnitude: number;
  description: string;
}

interface FeedQualityData {
  symbol: string;
  volatility: VolatilityMetrics;
  multiProtocolComparison: DeviationComparison[];
  recentAnomalies: Anomaly[];
  qualityScore: number;
  lastUpdated: string;
}

const FEED_SYMBOLS = ['ETH/USD', 'BTC/USD', 'LINK/USD', 'USDC/USD', 'USDT/USD', 'DAI/USD'];

function getQualityScoreColor(score: number) {
  if (score >= 90) return 'text-green-600';
  if (score >= 70) return 'text-yellow-600';
  if (score >= 50) return 'text-orange-600';
  return 'text-red-600';
}

function getQualityScoreVariant(score: number) {
  if (score >= 90) return 'success';
  if (score >= 70) return 'secondary';
  if (score >= 50) return 'warning';
  return 'destructive';
}

interface FeedQualityAnalysisProps {
  collapsible?: boolean;
  className?: string;
}

export function FeedQualityAnalysis({ collapsible = false, className }: FeedQualityAnalysisProps) {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('ETH/USD');
  const [qualityData, setQualityData] = useState<FeedQualityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQualityData = useCallback(async (symbol: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchApiData<{ qualityData: FeedQualityData }>(
        `/api/oracle/chainlink/quality?symbol=${encodeURIComponent(symbol)}`,
      );
      setQualityData(data.qualityData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch quality data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQualityData(selectedSymbol);
  }, [selectedSymbol, fetchQualityData]);

  if (isLoading) {
    return (
      <div className={className}>
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (error || !qualityData) {
    return (
      <div className={className}>
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <AlertTriangle className="h-12 w-12 text-amber-500" />
          <div className="text-center">
            <p className="font-medium text-foreground">加载数据失败</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchQualityData(selectedSymbol)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            重试
          </Button>
        </div>
      </div>
    );
  }

  const content = (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="选择交易对" />
          </SelectTrigger>
          <SelectContent>
            {FEED_SYMBOLS.map((symbol) => (
              <SelectItem key={symbol} value={symbol}>
                {symbol}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => fetchQualityData(selectedSymbol)}>
          <RefreshCw className="mr-2 h-4 w-4" />
          刷新
        </Button>
      </div>

      <ContentGrid columns={3}>
        <div className="rounded-lg border border-border/30 bg-muted/20 p-4 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <span className="font-medium">综合质量评分</span>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">基于波动性、异常检测等多维度综合评估</p>
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">质量评分</span>
                <span
                  className={`text-2xl font-bold ${getQualityScoreColor(qualityData.qualityScore)}`}
                >
                  {qualityData.qualityScore}/100
                </span>
              </div>
              <Progress value={qualityData.qualityScore} className="h-3" />
            </div>
            <Badge variant={getQualityScoreVariant(qualityData.qualityScore)}>
              {qualityData.qualityScore >= 90
                ? '优秀'
                : qualityData.qualityScore >= 70
                  ? '良好'
                  : qualityData.qualityScore >= 50
                    ? '一般'
                    : '较差'}
            </Badge>
          </div>
        </div>

        <div className="rounded-lg border border-border/30 bg-muted/20 p-4">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-600" />
            <span className="font-medium">波动性指标</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">小时波动率</span>
              <span className="font-mono text-sm">{qualityData.volatility.hourly}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">日波动率</span>
              <span className="font-mono text-sm">{qualityData.volatility.daily}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">周波动率</span>
              <span className="font-mono text-sm">{qualityData.volatility.weekly}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">最大回撤</span>
              <span className="font-mono text-sm text-red-600">
                -{qualityData.volatility.maxDrawdown}%
              </span>
            </div>
          </div>
        </div>
      </ContentGrid>

      <ContentGrid columns={2}>
        <div className="rounded-lg border border-border/30 bg-muted/20 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-600" />
            <span className="font-medium">多协议价格对比</span>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Chainlink 与其他预言机协议的价格偏差对比
          </p>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>协议</TableHead>
                  <TableHead>价格</TableHead>
                  <TableHead>与 Chainlink 偏差</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {qualityData.multiProtocolComparison.map((item) => (
                  <TableRow key={item.protocol}>
                    <TableCell className="font-medium">{item.protocol}</TableCell>
                    <TableCell className="font-mono">${item.price.toLocaleString()}</TableCell>
                    <TableCell>
                      {item.protocol === 'Chainlink' ? (
                        <Badge variant="secondary">基准</Badge>
                      ) : (
                        <span
                          className={
                            item.deviationPercentage > 0 ? 'text-red-600' : 'text-blue-600'
                          }
                        >
                          {item.deviationPercentage > 0 ? '+' : ''}
                          {item.deviationPercentage.toFixed(4)}%
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="rounded-lg border border-border/30 bg-muted/20 p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <span className="font-medium">近期异常事件</span>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">检测到的价格大幅波动</p>
          {qualityData.recentAnomalies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <TrendingUp className="mb-2 h-8 w-8 text-green-500" />
              <p className="text-sm text-muted-foreground">近期未检测到异常事件</p>
            </div>
          ) : (
            <div className="space-y-3">
              {qualityData.recentAnomalies.map((anomaly, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    anomaly.type === 'spike'
                      ? 'bg-green-50 dark:bg-green-950/20'
                      : 'bg-red-50 dark:bg-red-950/20'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium">
                      {anomaly.type === 'spike' ? (
                        <span className="text-green-700 dark:text-green-400">⬆️ 价格大幅上涨</span>
                      ) : (
                        <span className="text-red-700 dark:text-red-400">⬇️ 价格大幅下跌</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(anomaly.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={anomaly.type === 'spike' ? 'default' : 'destructive'}>
                    {anomaly.magnitude}%
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </ContentGrid>
    </div>
  );

  if (collapsible) {
    return <div className={className}>{content}</div>;
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      <ContentSection
        title="喂价数据质量分析"
        description="多维度评估 Chainlink 喂价的数据质量"
        action={
          <div className="flex items-center gap-2">
            <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="选择交易对" />
              </SelectTrigger>
              <SelectContent>
                {FEED_SYMBOLS.map((symbol) => (
                  <SelectItem key={symbol} value={symbol}>
                    {symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => fetchQualityData(selectedSymbol)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              刷新
            </Button>
          </div>
        }
      >
        <ContentGrid columns={3}>
          <div className="rounded-lg border border-border/30 bg-muted/20 p-4 lg:col-span-2">
            <div className="mb-3 flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <span className="font-medium">综合质量评分</span>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              基于波动性、异常检测等多维度综合评估
            </p>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">质量评分</span>
                  <span
                    className={`text-2xl font-bold ${getQualityScoreColor(qualityData.qualityScore)}`}
                  >
                    {qualityData.qualityScore}/100
                  </span>
                </div>
                <Progress value={qualityData.qualityScore} className="h-3" />
              </div>
              <Badge variant={getQualityScoreVariant(qualityData.qualityScore)}>
                {qualityData.qualityScore >= 90
                  ? '优秀'
                  : qualityData.qualityScore >= 70
                    ? '良好'
                    : qualityData.qualityScore >= 50
                      ? '一般'
                      : '较差'}
              </Badge>
            </div>
          </div>

          <div className="rounded-lg border border-border/30 bg-muted/20 p-4">
            <div className="mb-3 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <span className="font-medium">波动性指标</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">小时波动率</span>
                <span className="font-mono text-sm">{qualityData.volatility.hourly}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">日波动率</span>
                <span className="font-mono text-sm">{qualityData.volatility.daily}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">周波动率</span>
                <span className="font-mono text-sm">{qualityData.volatility.weekly}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">最大回撤</span>
                <span className="font-mono text-sm text-red-600">
                  -{qualityData.volatility.maxDrawdown}%
                </span>
              </div>
            </div>
          </div>
        </ContentGrid>
      </ContentSection>

      <ContentGrid columns={2}>
        <ContentSection
          title={
            <span className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              多协议价格对比
            </span>
          }
          description="Chainlink 与其他预言机协议的价格偏差对比"
        >
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>协议</TableHead>
                  <TableHead>价格</TableHead>
                  <TableHead>与 Chainlink 偏差</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {qualityData.multiProtocolComparison.map((item) => (
                  <TableRow key={item.protocol}>
                    <TableCell className="font-medium">{item.protocol}</TableCell>
                    <TableCell className="font-mono">${item.price.toLocaleString()}</TableCell>
                    <TableCell>
                      {item.protocol === 'Chainlink' ? (
                        <Badge variant="secondary">基准</Badge>
                      ) : (
                        <span
                          className={
                            item.deviationPercentage > 0 ? 'text-red-600' : 'text-blue-600'
                          }
                        >
                          {item.deviationPercentage > 0 ? '+' : ''}
                          {item.deviationPercentage.toFixed(4)}%
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ContentSection>

        <ContentSection
          title={
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              近期异常事件
            </span>
          }
          description="检测到的价格大幅波动"
        >
          {qualityData.recentAnomalies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <TrendingUp className="mb-2 h-8 w-8 text-green-500" />
              <p className="text-sm text-muted-foreground">近期未检测到异常事件</p>
            </div>
          ) : (
            <div className="space-y-3">
              {qualityData.recentAnomalies.map((anomaly, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    anomaly.type === 'spike'
                      ? 'bg-green-50 dark:bg-green-950/20'
                      : 'bg-red-50 dark:bg-red-950/20'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium">
                      {anomaly.type === 'spike' ? (
                        <span className="text-green-700 dark:text-green-400">⬆️ 价格大幅上涨</span>
                      ) : (
                        <span className="text-red-700 dark:text-red-400">⬇️ 价格大幅下跌</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(anomaly.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={anomaly.type === 'spike' ? 'default' : 'destructive'}>
                    {anomaly.magnitude}%
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </ContentSection>
      </ContentGrid>
    </div>
  );
}
