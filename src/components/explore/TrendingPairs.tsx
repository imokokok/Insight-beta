'use client';

import { ArrowUpRight, ArrowDownRight, BarChart3 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useI18n } from '@/i18n';

export function TrendingPairs() {
  const { t } = useI18n();

  const trendingPairs = [
    { pair: 'ETH/USDC', volume: '$2.4B', priceChange: 5.2, transactions: '125K' },
    { pair: 'BTC/ETH', volume: '$1.8B', priceChange: -2.1, transactions: '89K' },
    { pair: 'SOL/USDC', volume: '$980M', priceChange: 8.7, transactions: '156K' },
    { pair: 'ARB/USDC', volume: '$450M', priceChange: 12.3, transactions: '78K' },
    { pair: 'OP/ETH', volume: '$320M', priceChange: -4.5, transactions: '45K' },
    { pair: 'MATIC/USDC', volume: '$280M', priceChange: 3.1, transactions: '67K' },
    { pair: 'AVAX/ETH', volume: '$210M', priceChange: -1.8, transactions: '34K' },
    { pair: 'LINK/USDC', volume: '$180M', priceChange: 6.9, transactions: '52K' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-500" />
          {t('explore.trending.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>交易对</TableHead>
              <TableHead className="text-right">{t('explore.trending.volume')}</TableHead>
              <TableHead className="text-right">{t('explore.trending.priceChange')}</TableHead>
              <TableHead className="text-right">{t('explore.trending.transactions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trendingPairs.map((item) => (
              <TableRow key={item.pair}>
                <TableCell className="font-medium">{item.pair}</TableCell>
                <TableCell className="text-right">{item.volume}</TableCell>
                <TableCell className="text-right">
                  <span
                    className={`inline-flex items-center gap-1 ${
                      item.priceChange >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {item.priceChange >= 0 ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                    {item.priceChange >= 0 ? '+' : ''}
                    {item.priceChange}%
                  </span>
                </TableCell>
                <TableCell className="text-right">{item.transactions}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
