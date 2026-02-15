'use client';

import { Activity, TrendingUp, Zap, AlertTriangle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GasStatsCardsProps {
  avgGasPrice: number;
  slowGasPrice: number;
  fastGasPrice: number;
  selectedChains: string[];
}

export function GasStatsCards({
  avgGasPrice,
  slowGasPrice,
  fastGasPrice,
  selectedChains,
}: GasStatsCardsProps) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-blue-500" />
            Average Gas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-blue-600">
            {avgGasPrice ? `$${(avgGasPrice / 1e9).toFixed(2)}` : 'Loading...'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Across {selectedChains.length} chains
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Slow Gas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-emerald-600">
            {slowGasPrice ? `$${(slowGasPrice / 1e9).toFixed(2)}` : 'Loading...'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Best for cost-sensitive transactions
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-yellow-500" />
            Fast Gas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-yellow-600">
            {fastGasPrice ? `$${(fastGasPrice / 1e9).toFixed(2)}` : 'Loading...'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Best for time-sensitive transactions
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Price Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-red-600">
            {slowGasPrice && fastGasPrice
              ? `$${((fastGasPrice - slowGasPrice) / 1e9).toFixed(2)}`
              : 'Loading...'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Difference between slow and fast</p>
        </CardContent>
      </Card>
    </div>
  );
}
