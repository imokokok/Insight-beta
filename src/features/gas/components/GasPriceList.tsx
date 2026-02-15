'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

import type { GasPriceData } from '../hooks/useGasPrice';

interface GasPriceListProps {
  gasPrices: { ok: boolean; data: GasPriceData[] } | undefined;
  pricesLoading: boolean;
  handleShowTrend: (chain: string) => void;
}

export function GasPriceList({ gasPrices, pricesLoading, handleShowTrend }: GasPriceListProps) {
  return (
    <div className="mb-8">
      <Card>
        <CardHeader>
          <CardTitle>Gas Prices by Chain</CardTitle>
          <CardDescription>Current gas prices for selected chains</CardDescription>
        </CardHeader>
        <CardContent>
          {pricesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded bg-muted/30" />
              ))}
            </div>
          ) : gasPrices?.data && gasPrices.data.length > 0 ? (
            <div className="space-y-3">
              {gasPrices.data.map((price) => (
                <div
                  key={price.chain}
                  className="flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                  onClick={() => handleShowTrend(price.chain)}
                >
                  <div className="flex items-center gap-3">
                    <div className="font-semibold capitalize">{price.chain}</div>
                    <Badge variant="outline">{price.provider}</Badge>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Slow</p>
                      <p className="font-mono font-semibold">${(price.slow / 1e9).toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Average</p>
                      <p className="font-mono font-semibold">${(price.average / 1e9).toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Fast</p>
                      <p className="font-mono font-semibold">${(price.fast / 1e9).toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Fastest</p>
                      <p className="font-mono font-semibold">${(price.fastest / 1e9).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              No gas price data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
