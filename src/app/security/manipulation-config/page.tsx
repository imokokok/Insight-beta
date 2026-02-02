'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings,
  Bell,
  Shield,
  Activity,
  Save,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DetectionConfig {
  // Statistical anomaly
  zScoreThreshold: number;
  minConfidenceScore: number;
  timeWindowMs: number;
  minDataPoints: number;
  maxPriceDeviationPercent: number;
  
  // Flash loan
  flashLoanMinAmountUsd: number;
  
  // Sandwich attack
  sandwichProfitThresholdUsd: number;
  
  // Liquidity
  liquidityChangeThreshold: number;
  
  // Correlation
  correlationThreshold: number;
  
  // Enabled rules
  enabledRules: string[];
  
  // Alert settings
  alertChannels: {
    email: boolean;
    webhook: boolean;
    slack: boolean;
    telegram: boolean;
  };
  autoBlockSuspiciousFeeds: boolean;
  notificationCooldownMs: number;
}

const defaultConfig: DetectionConfig = {
  zScoreThreshold: 3,
  minConfidenceScore: 0.7,
  timeWindowMs: 300000,
  minDataPoints: 10,
  maxPriceDeviationPercent: 5,
  flashLoanMinAmountUsd: 100000,
  sandwichProfitThresholdUsd: 1000,
  liquidityChangeThreshold: 0.3,
  correlationThreshold: 0.8,
  enabledRules: [
    'statistical_anomaly',
    'flash_loan_attack',
    'sandwich_attack',
    'liquidity_manipulation',
  ],
  alertChannels: {
    email: true,
    webhook: true,
    slack: false,
    telegram: false,
  },
  autoBlockSuspiciousFeeds: false,
  notificationCooldownMs: 300000,
};

const detectionRules = [
  { id: 'statistical_anomaly', name: '统计异常检测', description: '基于Z-score的统计异常检测', icon: Activity },
  { id: 'flash_loan_attack', name: '闪电贷攻击检测', description: '检测闪电贷攻击模式', icon: AlertTriangle },
  { id: 'sandwich_attack', name: '三明治攻击检测', description: '检测三明治攻击模式', icon: Shield },
  { id: 'liquidity_manipulation', name: '流动性操纵检测', description: '检测流动性异常变化', icon: Activity },
  { id: 'oracle_manipulation', name: '预言机操纵检测', description: '检测预言机价格操纵', icon: AlertTriangle },
  { id: 'front_running', name: '抢先交易检测', description: '检测MEV抢先交易', icon: Shield },
  { id: 'back_running', name: '尾随交易检测', description: '检测MEV尾随交易', icon: Shield },
];

export default function ManipulationConfigPage() {
  const [config, setConfig] = useState<DetectionConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/security/config');
      if (response.ok) {
        const data = await response.json();
        setConfig({ ...defaultConfig, ...data.config });
      }
    } catch (err) {
      console.error('Failed to fetch config:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/security/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const resetConfig = () => {
    setConfig(defaultConfig);
  };

  const toggleRule = (ruleId: string) => {
    setConfig((prev) => ({
      ...prev,
      enabledRules: prev.enabledRules.includes(ruleId)
        ? prev.enabledRules.filter((r) => r !== ruleId)
        : [...prev.enabledRules, ruleId],
    }));
  };

  const updateAlertChannel = (channel: keyof DetectionConfig['alertChannels'], value: boolean) => {
    setConfig((prev) => ({
      ...prev,
      alertChannels: { ...prev.alertChannels, [channel]: value },
    }));
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            价格操纵检测配置
          </h1>
          <p className="text-muted-foreground mt-1">
            配置检测规则、阈值和告警设置
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetConfig} disabled={saving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            重置
          </Button>
          <Button onClick={saveConfig} disabled={saving}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                保存中...
              </>
            ) : saved ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                已保存
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                保存配置
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="rules" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
          <TabsTrigger value="rules">检测规则</TabsTrigger>
          <TabsTrigger value="thresholds">阈值设置</TabsTrigger>
          <TabsTrigger value="alerts">告警配置</TabsTrigger>
          <TabsTrigger value="advanced">高级选项</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                启用的检测规则
              </CardTitle>
              <CardDescription>
                选择要启用的价格操纵检测规则
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {detectionRules.map((rule) => {
                const isEnabled = config.enabledRules.includes(rule.id);
                const Icon = rule.icon;

                return (
                  <div
                    key={rule.id}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-lg border transition-all',
                      isEnabled
                        ? 'bg-primary/5 border-primary/20'
                        : 'bg-muted/50 border-muted'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'p-2 rounded-lg',
                          isEnabled ? 'bg-primary/10' : 'bg-muted'
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-5 w-5',
                            isEnabled ? 'text-primary' : 'text-muted-foreground'
                          )}
                        />
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {rule.name}
                          {isEnabled && (
                            <Badge variant="secondary" className="text-xs">
                              已启用
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {rule.description}
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => toggleRule(rule.id)}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="thresholds" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                统计异常检测阈值
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Z-Score 阈值</Label>
                  <span className="text-sm font-medium">{config.zScoreThreshold}</span>
                </div>
                <Slider
                  value={[config.zScoreThreshold]}
                  onValueChange={([value]) =>
                    setConfig((prev) => ({ ...prev, zScoreThreshold: value }))
                  }
                  min={1}
                  max={5}
                  step={0.1}
                />
                <p className="text-xs text-muted-foreground">
                  标准差倍数，超过此值视为异常（推荐: 3）
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>最小置信度</Label>
                  <span className="text-sm font-medium">
                    {(config.minConfidenceScore * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  value={[config.minConfidenceScore * 100]}
                  onValueChange={([value]) =>
                    setConfig((prev) => ({ ...prev, minConfidenceScore: value / 100 }))
                  }
                  min={50}
                  max={95}
                  step={5}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>最大价格偏离 (%)</Label>
                  <span className="text-sm font-medium">
                    {config.maxPriceDeviationPercent}%
                  </span>
                </div>
                <Slider
                  value={[config.maxPriceDeviationPercent]}
                  onValueChange={([value]) =>
                    setConfig((prev) => ({ ...prev, maxPriceDeviationPercent: value }))
                  }
                  min={1}
                  max={20}
                  step={0.5}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>最小数据点数</Label>
                <Input
                  type="number"
                  value={config.minDataPoints}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      minDataPoints: parseInt(e.target.value) || 10,
                    }))
                  }
                  min={5}
                  max={50}
                />
                <p className="text-xs text-muted-foreground">
                  进行统计检测所需的最小历史数据点数量
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                攻击检测阈值
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>闪电贷最小金额 (USD)</Label>
                <Input
                  type="number"
                  value={config.flashLoanMinAmountUsd}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      flashLoanMinAmountUsd: parseInt(e.target.value) || 100000,
                    }))
                  }
                  min={10000}
                  step={10000}
                />
              </div>

              <div className="space-y-2">
                <Label>三明治攻击利润阈值 (USD)</Label>
                <Input
                  type="number"
                  value={config.sandwichProfitThresholdUsd}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      sandwichProfitThresholdUsd: parseInt(e.target.value) || 1000,
                    }))
                  }
                  min={100}
                  step={100}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>流动性变化阈值</Label>
                  <span className="text-sm font-medium">
                    {(config.liquidityChangeThreshold * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  value={[config.liquidityChangeThreshold * 100]}
                  onValueChange={([value]) =>
                    setConfig((prev) => ({
                      ...prev,
                      liquidityChangeThreshold: value / 100,
                    }))
                  }
                  min={10}
                  max={80}
                  step={5}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                告警渠道
              </CardTitle>
              <CardDescription>
                配置检测告警的通知方式
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'email', name: '邮件告警', description: '发送邮件到配置的管理员邮箱' },
                { key: 'webhook', name: 'Webhook', description: '调用配置的Webhook URL' },
                { key: 'slack', name: 'Slack', description: '发送到Slack频道' },
                { key: 'telegram', name: 'Telegram', description: '发送Telegram消息' },
              ].map((channel) => (
                <div
                  key={channel.key}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <div className="font-medium">{channel.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {channel.description}
                    </div>
                  </div>
                  <Switch
                    checked={config.alertChannels[channel.key as keyof typeof config.alertChannels]}
                    onCheckedChange={(checked) =>
                      updateAlertChannel(channel.key as keyof typeof config.alertChannels, checked)
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>告警设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>通知冷却时间 (分钟)</Label>
                  <span className="text-sm font-medium">
                    {Math.round(config.notificationCooldownMs / 60000)} 分钟
                  </span>
                </div>
                <Slider
                  value={[config.notificationCooldownMs / 60000]}
                  onValueChange={([value]) =>
                    setConfig((prev) => ({
                      ...prev,
                      notificationCooldownMs: value * 60000,
                    }))
                  }
                  min={1}
                  max={60}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  同一数据源的告警间隔时间，避免重复通知
                </p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-yellow-50">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <div className="font-medium">自动阻断可疑数据源</div>
                    <div className="text-sm text-muted-foreground">
                      检测到严重操纵时自动阻断该数据源
                    </div>
                  </div>
                </div>
                <Switch
                  checked={config.autoBlockSuspiciousFeeds}
                  onCheckedChange={(checked) =>
                    setConfig((prev) => ({
                      ...prev,
                      autoBlockSuspiciousFeeds: checked,
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>高级配置</CardTitle>
              <CardDescription>
                高级检测参数，修改前请了解其含义
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>时间窗口 (分钟)</Label>
                  <span className="text-sm font-medium">
                    {Math.round(config.timeWindowMs / 60000)} 分钟
                  </span>
                </div>
                <Slider
                  value={[config.timeWindowMs / 60000]}
                  onValueChange={([value]) =>
                    setConfig((prev) => ({ ...prev, timeWindowMs: value * 60000 }))
                  }
                  min={1}
                  max={30}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  检测分析的时间窗口范围
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>相关性阈值</Label>
                  <span className="text-sm font-medium">
                    {(config.correlationThreshold * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  value={[config.correlationThreshold * 100]}
                  onValueChange={([value]) =>
                    setConfig((prev) => ({
                      ...prev,
                      correlationThreshold: value / 100,
                    }))
                  }
                  min={50}
                  max={95}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  多源价格相关性验证阈值
                </p>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              修改高级配置可能影响检测准确性，建议在测试环境验证后再应用到生产环境。
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}
