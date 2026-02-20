'use client';

import { memo, useMemo } from 'react';

import { Shield, AlertTriangle, CheckCircle, Info } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/shared/utils';

interface RiskFactor {
  name: string;
  score: number;
  weight: number;
  description: string;
}

interface RiskScoreProps {
  overallScore?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  factors?: RiskFactor[];
  isLoading?: boolean;
  compact?: boolean;
}

function getRiskConfig(score: number): {
  level: 'low' | 'medium' | 'high';
  color: string;
  bgColor: string;
  label: string;
  icon: typeof CheckCircle;
} {
  if (score >= 70) {
    return {
      level: 'low',
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
      label: '低风险',
      icon: CheckCircle,
    };
  }
  if (score >= 40) {
    return {
      level: 'medium',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-500/10',
      label: '中风险',
      icon: AlertTriangle,
    };
  }
  return {
    level: 'high',
    color: 'text-red-600',
    bgColor: 'bg-red-500/10',
    label: '高风险',
    icon: AlertTriangle,
  };
}

export const RiskScore = memo(function RiskScore({
  overallScore = 75,
  riskLevel,
  factors,
  isLoading,
  compact = false,
}: RiskScoreProps) {
  const config = useMemo(() => getRiskConfig(overallScore), [overallScore]);
  const RiskIcon = config.icon;

  const defaultFactors: RiskFactor[] = useMemo(
    () => [
      { name: '价格偏差', score: 80, weight: 0.3, description: '各链价格差异程度' },
      { name: '流动性深度', score: 70, weight: 0.25, description: '链上流动性充足程度' },
      { name: '桥状态', score: 85, weight: 0.2, description: '跨链桥健康状态' },
      { name: '历史稳定性', score: 65, weight: 0.15, description: '历史价格稳定程度' },
      { name: '网络活跃度', score: 75, weight: 0.1, description: '网络交易活跃程度' },
    ],
    [],
  );

  const displayFactors = factors ?? defaultFactors;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="h-6 w-32 animate-pulse rounded bg-muted" />
              <div className="mt-1 h-4 w-48 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2 rounded-lg px-3 py-2', config.bgColor)}>
        <RiskIcon className={cn('h-4 w-4', config.color)} />
        <span className="text-sm font-medium">{overallScore}</span>
        <Badge variant="outline" className={cn('text-xs', config.color)}>
          {(riskLevel ?? config.level === 'low') ? '低' : config.level === 'medium' ? '中' : '高'}
        </Badge>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              跨链风险评分
            </CardTitle>
            <CardDescription>综合评估跨链操作风险</CardDescription>
          </div>
          <div className={cn('flex flex-col items-center rounded-full p-3', config.bgColor)}>
            <span className={cn('text-2xl font-bold', config.color)}>{overallScore}</span>
            <Badge variant="outline" className={cn('mt-1 text-xs', config.color)}>
              {config.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>综合评分</span>
              <span className={cn('font-medium', config.color)}>{overallScore}/100</span>
            </div>
            <Progress
              value={overallScore}
              className={cn(
                'h-2',
                overallScore >= 70
                  ? '[&>div]:bg-green-500'
                  : overallScore >= 40
                    ? '[&>div]:bg-yellow-500'
                    : '[&>div]:bg-red-500',
              )}
            />
          </div>

          <div className="space-y-3">
            <h4 className="flex items-center gap-1 text-sm font-medium">
              <Info className="h-3 w-3" />
              风险因素分析
            </h4>
            {displayFactors.map((factor, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{factor.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      权重: {(factor.weight * 100).toFixed(0)}%
                    </span>
                    <span
                      className={cn(
                        'font-medium',
                        factor.score >= 70
                          ? 'text-green-600'
                          : factor.score >= 40
                            ? 'text-yellow-600'
                            : 'text-red-600',
                      )}
                    >
                      {factor.score}
                    </span>
                  </div>
                </div>
                <Progress value={factor.score} className="h-1.5" />
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
              <p>
                风险评分基于价格偏差、流动性、桥状态等多个因素综合计算。
                评分越高表示风险越低，建议优先选择高评分的跨链路径。
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
