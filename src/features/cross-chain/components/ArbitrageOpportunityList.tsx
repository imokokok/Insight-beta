'use client';

import { memo, useState } from 'react';

import {
  ChevronDown,
  ChevronUp,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  ArrowRight,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatPrice } from '@/shared/utils';

import type { ArbitrageOpportunity, ArbitrageSummary } from '../types';

interface ArbitrageOpportunityListProps {
  opportunities?: ArbitrageOpportunity[];
  summary?: ArbitrageSummary;
  isLoading?: boolean;
  maxVisible?: number;
}

const RISK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  low: { bg: 'bg-green-500/10', text: 'text-green-600', border: 'border-green-500/30' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-600', border: 'border-yellow-500/30' },
  high: { bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500/30' },
};

export const ArbitrageOpportunityList = memo(function ArbitrageOpportunityList({
  opportunities,
  summary,
  isLoading,
  maxVisible = 5,
}: ArbitrageOpportunityListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-1 h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!opportunities || opportunities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            套利机会
          </CardTitle>
          <CardDescription>暂无套利机会</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            <CheckCircle className="mx-auto h-8 w-8 opacity-50" />
            <p className="mt-2">当前没有发现套利机会</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const visibleOpportunities = isExpanded ? opportunities : opportunities.slice(0, maxVisible);
  const hasMore = opportunities.length > maxVisible;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              套利机会
            </CardTitle>
            <CardDescription>
              发现 {summary?.total ?? opportunities.length} 个潜在套利机会
            </CardDescription>
          </div>
          {summary && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="gap-1">
                <DollarSign className="h-3 w-3" />
                预估总收益: ${summary.totalEstimatedProfit.toFixed(2)}
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {visibleOpportunities.map((opportunity) => (
            <div
              key={opportunity.id}
              className={cn(
                'rounded-lg border p-3 transition-colors hover:bg-muted/50',
                RISK_COLORS[opportunity.riskLevel]?.border ?? '',
                RISK_COLORS[opportunity.riskLevel]?.bg ?? '',
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="font-mono">
                    {opportunity.symbol}
                  </Badge>
                  <div className="flex items-center gap-1 text-sm">
                    <span className="font-medium capitalize">{opportunity.buyChain}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium capitalize">{opportunity.sellChain}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-mono font-semibold text-green-600">
                      +{opportunity.priceDiffPercent.toFixed(2)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      净收益: ${opportunity.netProfit.toFixed(2)}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn('capitalize', RISK_COLORS[opportunity.riskLevel]?.text ?? '')}
                  >
                    {opportunity.riskLevel === 'low' && '低风险'}
                    {opportunity.riskLevel === 'medium' && '中风险'}
                    {opportunity.riskLevel === 'high' && '高风险'}
                  </Badge>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span>买入价:</span>
                  <span className="font-mono">{formatPrice(opportunity.buyPrice)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>卖出价:</span>
                  <span className="font-mono">{formatPrice(opportunity.sellPrice)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>Gas 费:</span>
                  <span className="font-mono">${opportunity.gasCostEstimate.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(opportunity.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
              {opportunity.warnings.length > 0 && (
                <div className="mt-2 flex items-center gap-1 text-xs text-yellow-600">
                  <AlertTriangle className="h-3 w-3" />
                  {opportunity.warnings.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 w-full"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="mr-1 h-4 w-4" />
                收起
              </>
            ) : (
              <>
                <ChevronDown className="mr-1 h-4 w-4" />
                查看更多 ({opportunities.length - maxVisible})
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
});
