'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { DollarSign } from 'lucide-react';
import type { CostComparison } from '@/types/oracle/comparison';

interface CostEfficiencyViewProps {
  data?: CostComparison;
  isLoading?: boolean;
}

export function CostEfficiencyView({ data, isLoading }: CostEfficiencyViewProps) {
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
          <CardTitle>成本效益分析</CardTitle>
          <CardDescription>暂无数据</CardDescription>
        </CardHeader>
        <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
          <DollarSign className="mr-2 h-5 w-5" />
          暂无成本分析数据
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>成本效益分析</CardTitle>
        <CardDescription>各协议成本对比</CardDescription>
      </CardHeader>
      <CardContent>
        <p>成本效益视图 - 待实现完整功能</p>
      </CardContent>
    </Card>
  );
}
