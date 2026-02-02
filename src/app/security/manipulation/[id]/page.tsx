'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Shield,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  Hash,
  DollarSign,
  TrendingUp,
  User,
  FileText,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ManipulationDetection } from '@/lib/types/security/detection';

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

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: '待审核', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: '已确认', color: 'bg-red-100 text-red-800' },
  false_positive: { label: '误报', color: 'bg-green-100 text-green-800' },
  under_investigation: { label: '调查中', color: 'bg-blue-100 text-blue-800' },
};

export default function ManipulationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [detection, setDetection] = useState<ManipulationDetection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string>('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  useEffect(() => {
    fetchDetection();
  }, [params.id]);

  const fetchDetection = async () => {
    try {
      const response = await fetch(`/api/security/detections/${params.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch detection');
      }
      const data = await response.json();
      setDetection(data.detection);
      setReviewStatus(data.detection.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/security/detections/${params.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: reviewStatus, notes: reviewNotes }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit review');
      }

      await fetchDetection();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, hash: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !detection) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error || 'Detection not found'}</AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回
        </Button>
      </div>
    );
  }

  const severity = severityConfig[detection.severity];
  const SeverityIcon = severity.icon;
  const status = statusLabels[detection.status];

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6" />
              检测详情
            </h1>
            <p className="text-muted-foreground text-sm">
              ID: {detection.id}
            </p>
          </div>
        </div>
        <Badge className={status?.color ?? 'bg-gray-100 text-gray-800'}>{status?.label ?? '未知'}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className={cn('border-l-4', severity.borderColor.replace('border-', 'border-l-'))}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={cn('p-2 rounded-lg', severity.bgColor)}>
                    <SeverityIcon className={cn('h-6 w-6', severity.textColor)} />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{typeLabels[detection.type]}</CardTitle>
                    <CardDescription className="mt-1">
                      {detection.protocol} · {detection.symbol} · {detection.chain}
                    </CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <Badge
                    variant="outline"
                    className={cn('text-lg px-3 py-1', severity.textColor)}
                  >
                    {(detection.confidenceScore * 100).toFixed(0)}% 置信度
                  </Badge>
                  <div className="text-sm text-muted-foreground mt-2">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {new Date(detection.detectedAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1">严重程度</div>
                  <div className={cn('font-semibold', severity.textColor)}>
                    {severity.label}
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1">价格影响</div>
                  <div className={cn('font-semibold', detection.priceImpact && detection.priceImpact > 0 ? 'text-green-600' : 'text-red-600')}>
                    {detection.priceImpact
                      ? `${detection.priceImpact > 0 ? '+' : ''}${detection.priceImpact.toFixed(2)}%`
                      : 'N/A'}
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1">资金影响</div>
                  <div className="font-semibold">
                    {detection.financialImpactUsd
                      ? `$${detection.financialImpactUsd.toLocaleString()}`
                      : 'N/A'}
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1">可疑交易</div>
                  <div className="font-semibold">
                    {detection.suspiciousTransactions.length} 笔
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="evidence" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="evidence">证据链</TabsTrigger>
              <TabsTrigger value="transactions">可疑交易</TabsTrigger>
              <TabsTrigger value="blocks">相关区块</TabsTrigger>
            </TabsList>

            <TabsContent value="evidence" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    检测证据
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {detection.evidence.map((item, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg border bg-muted/50"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{item.type}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {item.description}
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {(item.confidence * 100).toFixed(0)}% 置信度
                        </Badge>
                      </div>
                      {item.data && (
                        <div className="mt-2 text-xs">
                          <pre className="bg-muted p-2 rounded overflow-x-auto">
                            {JSON.stringify(item.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transactions" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hash className="h-5 w-5" />
                    可疑交易列表
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {detection.suspiciousTransactions.map((tx, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg border flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded">
                          <Hash className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-mono text-sm flex items-center gap-2">
                            {tx.hash.slice(0, 20)}...{tx.hash.slice(-8)}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(tx.hash, tx.hash)}
                            >
                              {copiedHash === tx.hash ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {typeLabels[tx.type] || tx.type}
                            {tx.valueUsd && ` · $${tx.valueUsd.toLocaleString()}`}
                          </div>
                        </div>
                      </div>
                      <a
                        href={`https://etherscan.io/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        查看
                      </a>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="blocks" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    相关区块
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {detection.relatedBlocks?.map((block) => (
                      <Badge key={block} variant="secondary" className="text-sm">
                        #{block.toLocaleString()}
                      </Badge>
                    )) || <div className="text-muted-foreground">无相关区块数据</div>}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                审核处理
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>审核状态</Label>
                <Select value={reviewStatus} onValueChange={setReviewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">待审核</SelectItem>
                    <SelectItem value="confirmed">已确认</SelectItem>
                    <SelectItem value="false_positive">误报</SelectItem>
                    <SelectItem value="under_investigation">调查中</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>审核备注</Label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="输入审核备注..."
                  rows={4}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleReview}
                disabled={submitting || reviewStatus === detection.status}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    提交中...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    提交审核
                  </>
                )}
              </Button>

              {detection.reviewedBy && (
                <div className="pt-4 border-t text-sm text-muted-foreground">
                  <div>审核人: {detection.reviewedBy}</div>
                  <div>
                    审核时间:{' '}
                    {detection.reviewedAt
                      ? new Date(detection.reviewedAt).toLocaleString()
                      : 'N/A'}
                  </div>
                  {detection.notes && (
                    <div className="mt-2 p-2 bg-muted rounded">
                      备注: {detection.notes}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                影响分析
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">受影响地址</span>
                <span>{detection.affectedAddresses?.length || 0} 个</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">价格变动</span>
                <span
                  className={cn(
                    detection.priceImpact && detection.priceImpact > 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  )}
                >
                  {detection.priceImpact
                    ? `${detection.priceImpact > 0 ? '+' : ''}${detection.priceImpact.toFixed(2)}%`
                    : 'N/A'}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">预估损失</span>
                <span className="font-semibold">
                  {detection.financialImpactUsd
                    ? `$${detection.financialImpactUsd.toLocaleString()}`
                    : 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
