'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { Activity } from 'lucide-react';
import type { LatencyAnalysis } from '@/types/oracle/comparison';

interface LatencyAnalysisViewProps {
  data?: LatencyAnalysis;
  isLoading?: boolean;
}

export function LatencyAnalysisView({ data, isLoading }: LatencyAnalysisViewProps) {
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>延迟分析</CardTitle>
          <CardDescription>暂无数据</CardDescription>
        </CardHeader>
        <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
          <Activity className="mr-2 h-5 w-5" />
          暂无延迟分析数据
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>延迟分析</CardTitle>
        <CardDescription>各协议延迟指标对比</CardDescription>
      </CardHeader>
      <CardContent>
        <p>延迟分析视图 - 待实现完整功能</p>
      </CardContent>
    </Card>
  );
}
