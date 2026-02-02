'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Shield,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ManipulationDetection } from '@/lib/types/security/detection';

interface DetectionMetrics {
  totalDetections: number;
  detectionsByType: Record<string, number>;
  detectionsBySeverity: Record<string, number>;
  falsePositives: number;
  averageConfidence: number;
  lastDetectionTime?: number;
}

interface ManipulationDetectionPanelProps {
  protocol?: string;
  symbol?: string;
  chain?: string;
  className?: string;
}

const severityConfig = {
  critical: {
    color: 'bg-red-500',
    textColor: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: AlertTriangle,
    label: '严重',
  },
  high: {
    color: 'bg-orange-500',
    textColor: 'text-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: AlertCircle,
    label: '高危',
  },
  medium: {
    color: 'bg-yellow-500',
    textColor: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: AlertCircle,
    label: '中危',
  },
  low: {
    color: 'bg-blue-500',
    textColor: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: CheckCircle,
    label: '低危',
  },
};

const typeLabels: Record<string, string> = {
  flash_loan_attack: '闪电贷攻击',
  price_manipulation: '价格操纵',
  oracle_manipulation: '预言机操纵',
  sandwich_attack: '三明治攻击',
  front_running: '抢先交易',
  back_running: '尾随交易',
  liquidity_manipulation: '流动性操纵',
  statistical_anomaly: '统计异常',
};

export function ManipulationDetectionPanel({
  protocol,
  symbol,
  chain,
  className,
}: ManipulationDetectionPanelProps) {
  const [detections, setDetections] = useState<ManipulationDetection[]>([]);
  const [metrics, setMetrics] = useState<DetectionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDetection, setSelectedDetection] = useState<ManipulationDetection | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [expandedEvidence, setExpandedEvidence] = useState<Set<string>>(new Set());

  const fetchDetections = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (protocol) params.append('protocol', protocol);
      if (symbol) params.append('symbol', symbol);
      if (chain) params.append('chain', chain);
      if (filterSeverity !== 'all') params.append('severity', filterSeverity);

      const response = await fetch(`/api/security/detections?${params}`);
      const data = await response.json();
      setDetections(data.detections || []);
    } catch (error) {
      console.error('Failed to fetch detections:', error);
    }
  }, [protocol, symbol, chain, filterSeverity]);

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/security/metrics');
      const data = await response.json();
      setMetrics(data.metrics);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchDetections(), fetchMetrics()]);
      setLoading(false);
    };

    loadData();

    const interval = setInterval(() => {
      fetchDetections();
      fetchMetrics();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchDetections, fetchMetrics]);

  const toggleEvidence = (detectionId: string) => {
    setExpandedEvidence((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(detectionId)) {
        newSet.delete(detectionId);
      } else {
        newSet.add(detectionId);
      }
      return newSet;
    });
  };

  const handleReviewDetection = async (detectionId: string, status: 'confirmed' | 'false_positive') => {
    try {
      await fetch(`/api/security/detections/${detectionId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      await fetchDetections();
    } catch (error) {
      console.error('Failed to review detection:', error);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const criticalCount = metrics?.detectionsBySeverity.critical || 0;
  const highCount = metrics?.detectionsBySeverity.high || 0;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">价格操纵检测</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {(criticalCount > 0 || highCount > 0) && (
              <Badge variant="destructive" className="animate-pulse">
                {criticalCount + highCount} 个高危警告
              </Badge>
            )}
            <Button variant="ghost" size="icon" onClick={fetchDetections}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <Tabs defaultValue="detections" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mx-4 mb-4">
          <TabsTrigger value="detections">检测记录</TabsTrigger>
          <TabsTrigger value="metrics">统计指标</TabsTrigger>
        </TabsList>

        <TabsContent value="detections" className="m-0">
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="text-sm border rounded px-2 py-1 bg-background"
              >
                <option value="all">全部级别</option>
                <option value="critical">严重</option>
                <option value="high">高危</option>
                <option value="medium">中危</option>
                <option value="low">低危</option>
              </select>
            </div>
          </div>

          <ScrollArea className="h-[400px]">
            <div className="px-4 pb-4 space-y-3">
              {detections.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>未检测到价格操纵行为</p>
                </div>
              ) : (
                detections.map((detection) => {
                  const severity = severityConfig[detection.severity];
                  const SeverityIcon = severity.icon;
                  const isExpanded = expandedEvidence.has(detection.id);

                  return (
                    <div
                      key={detection.id}
                      className={cn(
                        'border rounded-lg p-3 transition-all cursor-pointer',
                        severity.borderColor,
                        severity.bgColor,
                        selectedDetection?.id === detection.id && 'ring-2 ring-primary'
                      )}
                      onClick={() => setSelectedDetection(detection)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2">
                          <SeverityIcon className={cn('h-5 w-5 mt-0.5', severity.textColor)} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{typeLabels[detection.type]}</span>
                              <Badge variant="outline" className={cn('text-xs', severity.textColor)}>
                                {severity.label}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {detection.protocol} · {detection.symbol} · {detection.chain}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-xs',
                              detection.confidenceScore > 0.9 && 'bg-red-100 text-red-700'
                            )}
                          >
                            {(detection.confidenceScore * 100).toFixed(0)}% 置信度
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(detection.detectedAt).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {detection.priceImpact && (
                        <div className="mt-2 flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            价格影响: <span className={detection.priceImpact > 0 ? 'text-green-600' : 'text-red-600'}>
                              {detection.priceImpact > 0 ? '+' : ''}{detection.priceImpact.toFixed(2)}%
                            </span>
                          </span>
                          {detection.financialImpactUsd && (
                            <span className="text-muted-foreground">
                              资金影响: ${detection.financialImpactUsd.toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleEvidence(detection.id);
                          }}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-3 w-3 mr-1" />
                              收起证据
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3 mr-1" />
                              查看证据 ({detection.evidence.length})
                            </>
                          )}
                        </Button>
                      </div>

                      {isExpanded && (
                        <div className="mt-2 space-y-2">
                          <Separator />
                          {detection.evidence.map((evidence, idx) => (
                            <div key={idx} className="text-sm pl-4 border-l-2 border-muted">
                              <div className="font-medium">{evidence.type}</div>
                              <div className="text-muted-foreground">{evidence.description}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                置信度: {(evidence.confidence * 100).toFixed(0)}%
                              </div>
                            </div>
                          ))}

                          {detection.suspiciousTransactions.length > 0 && (
                            <>
                              <Separator />
                              <div className="text-sm font-medium">可疑交易</div>
                              {detection.suspiciousTransactions.map((tx, idx) => (
                                <div key={idx} className="text-sm pl-4 flex items-center gap-2">
                                  <ExternalLink className="h-3 w-3" />
                                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                    {tx.hash.slice(0, 16)}...
                                  </code>
                                  <span className="text-muted-foreground">{typeLabels[tx.type] || tx.type}</span>
                                  {tx.valueUsd && (
                                    <span className="text-muted-foreground">${tx.valueUsd.toLocaleString()}</span>
                                  )}
                                </div>
                              ))}
                            </>
                          )}

                          {detection.status === 'pending' && (
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReviewDetection(detection.id, 'confirmed');
                                }}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                确认有效
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReviewDetection(detection.id, 'false_positive');
                                }}
                              >
                                <AlertCircle className="h-3 w-3 mr-1" />
                                误报
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="metrics" className="m-0 px-4 pb-4">
          {metrics && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{metrics.totalDetections}</div>
                    <div className="text-sm text-muted-foreground">总检测数</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">
                      {(metrics.averageConfidence * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">平均置信度</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">按严重程度分布</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(metrics.detectionsBySeverity).map(([severity, count]) => {
                      const config = severityConfig[severity as keyof typeof severityConfig];
                      if (!config) return null;
                      const percentage = (count / metrics.totalDetections) * 100;

                      return (
                        <div key={severity} className="flex items-center gap-2">
                          <div className="w-16 text-xs">{config.label}</div>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full', config.color)}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="w-8 text-xs text-right">{count}</div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">按类型分布</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(metrics.detectionsByType).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between text-sm">
                        <span>{typeLabels[type] || type}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {metrics.lastDetectionTime && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  上次检测: {new Date(metrics.lastDetectionTime).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
