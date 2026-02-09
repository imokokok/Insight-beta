/**
 * Create SLO Page
 *
 * 创建 SLO 定义页面
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Target, Clock, Shield, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { logger } from '@/lib/logger';

interface SloFormData {
  name: string;
  description: string;
  protocol: string;
  chain: string;
  metricType: 'latency' | 'availability' | 'accuracy' | 'custom';
  targetValue: number;
  thresholdValue: number;
  evaluationWindow: '30d' | '7d' | '24h' | '1h';
  errorBudgetPolicy: 'monthly' | 'weekly' | 'daily';
}

export default function CreateSloPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<SloFormData>({
    name: '',
    description: '',
    protocol: '',
    chain: '',
    metricType: 'availability',
    targetValue: 99.9,
    thresholdValue: 95,
    evaluationWindow: '30d',
    errorBudgetPolicy: 'monthly',
  });

  const updateField = <K extends keyof SloFormData>(field: K, value: SloFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('SLO 名称不能为空');
      return false;
    }
    if (!formData.protocol) {
      setError('请选择协议');
      return false;
    }
    if (!formData.chain) {
      setError('请选择链');
      return false;
    }
    return true;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await fetch('/api/slo/definitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '创建失败');
      }

      const result = await response.json();
      logger.info('SLO created', { sloId: result.data.id });

      router.push('/oracle/slo-v2' as any);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
      logger.error('Failed to create SLO', { error: err });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">创建 SLO</h1>
          <p className="text-muted-foreground text-sm">定义新的服务等级目标</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={onSubmit} className="space-y-6">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              基本信息
            </CardTitle>
            <CardDescription>SLO 的名称和描述</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                SLO 名称 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="例如：Chainlink ETH/USD 可用性 SLO"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                placeholder="描述这个 SLO 的用途和监控目标..."
                rows={3}
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* 监控范围 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              监控范围
            </CardTitle>
            <CardDescription>选择要监控的协议和链</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>
                协议 <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.protocol}
                onValueChange={(value) => updateField('protocol', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择协议" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chainlink">Chainlink</SelectItem>
                  <SelectItem value="pyth">Pyth</SelectItem>
                  <SelectItem value="uma">UMA</SelectItem>
                  <SelectItem value="band">Band</SelectItem>
                  <SelectItem value="api3">API3</SelectItem>
                  <SelectItem value="redstone">RedStone</SelectItem>
                  <SelectItem value="switchboard">Switchboard</SelectItem>
                  <SelectItem value="flux">Flux</SelectItem>
                  <SelectItem value="dia">DIA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                链 <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.chain}
                onValueChange={(value) => updateField('chain', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择链" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ethereum">Ethereum</SelectItem>
                  <SelectItem value="polygon">Polygon</SelectItem>
                  <SelectItem value="arbitrum">Arbitrum</SelectItem>
                  <SelectItem value="optimism">Optimism</SelectItem>
                  <SelectItem value="base">Base</SelectItem>
                  <SelectItem value="avalanche">Avalanche</SelectItem>
                  <SelectItem value="bsc">BSC</SelectItem>
                  <SelectItem value="solana">Solana</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 指标配置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              指标配置
            </CardTitle>
            <CardDescription>定义监控指标和目标值</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>指标类型</Label>
              <Select
                value={formData.metricType}
                onValueChange={(value: SloFormData['metricType']) => updateField('metricType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latency">延迟（Latency）</SelectItem>
                  <SelectItem value="availability">可用性（Availability）</SelectItem>
                  <SelectItem value="accuracy">准确性（Accuracy）</SelectItem>
                  <SelectItem value="custom">自定义（Custom）</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>目标值（SLO）</Label>
                <Badge variant="outline">{formData.targetValue}%</Badge>
              </div>
              <Slider
                value={[formData.targetValue]}
                onValueChange={([value]) => updateField('targetValue', value)}
                min={90}
                max={99.99}
                step={0.01}
              />
              <p className="text-muted-foreground text-xs">
                目标服务水平，例如 99.9% 表示允许 0.1% 的误差
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>阈值（Threshold）</Label>
                <Badge variant="outline">{formData.thresholdValue}%</Badge>
              </div>
              <Slider
                value={[formData.thresholdValue]}
                onValueChange={([value]) => updateField('thresholdValue', value)}
                min={80}
                max={99}
                step={0.1}
              />
              <p className="text-muted-foreground text-xs">
                低于此值视为违约，触发告警
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>评估窗口</Label>
                <Select
                  value={formData.evaluationWindow}
                  onValueChange={(value: SloFormData['evaluationWindow']) => updateField('evaluationWindow', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30d">30 天</SelectItem>
                    <SelectItem value="7d">7 天</SelectItem>
                    <SelectItem value="24h">24 小时</SelectItem>
                    <SelectItem value="1h">1 小时</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Error Budget 周期</Label>
                <Select
                  value={formData.errorBudgetPolicy}
                  onValueChange={(value: SloFormData['errorBudgetPolicy']) => updateField('errorBudgetPolicy', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">每月</SelectItem>
                    <SelectItem value="weekly">每周</SelectItem>
                    <SelectItem value="daily">每日</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 预览 */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm">SLO 预览</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Error Budget:</span>
              <span>{(100 - formData.targetValue).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">评估频率:</span>
              <span>每 5 分钟</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">告警条件:</span>
              <span>合规率 &lt; {formData.thresholdValue}% 或 Error Budget &lt; 20%</span>
            </div>
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            取消
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                创建中...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                创建 SLO
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
