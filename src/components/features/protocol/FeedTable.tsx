'use client';

import { StatusBadge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatTimeAgo, formatPrice, truncateAddress } from '@/shared/utils/format';

export interface FeedColumn {
  key: string;
  header: string;
  width?: string;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

export interface FeedTableProps {
  feeds: Record<string, unknown>[];
  columns: FeedColumn[];
  title?: string;
  className?: string;
  emptyMessage?: string;
}

export function FeedTable({
  feeds,
  columns,
  title = 'Price Feeds',
  className,
  emptyMessage = 'No feeds available',
}: FeedTableProps) {
  if (feeds.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex h-32 items-center justify-center">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full" role="table" aria-label={title}>
            <thead>
              <tr className="border-b text-left text-sm text-gray-500">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="pb-3 font-medium"
                    scope="col"
                    role="columnheader"
                    style={{ width: col.width }}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {feeds.map((feed, index) => (
                <tr key={String(feed.id) || index} className="border-b last:border-0">
                  {columns.map((col) => (
                    <td key={col.key} className="py-4">
                      {col.render ? col.render(feed[col.key], feed) : String(feed[col.key] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// 预定义的列渲染器
export const feedColumnRenderers = {
  price: (value: unknown) => <span className="font-mono">${formatPrice(Number(value))}</span>,

  status: (value: unknown) => (
    <StatusBadge status={String(value) as 'active' | 'stale' | 'error'} />
  ),

  timeAgo: (value: unknown) => (
    <span className="text-sm text-gray-500">{formatTimeAgo(String(value))}</span>
  ),

  address: (value: unknown) => (
    <a
      href={`https://etherscan.io/address/${String(value)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-sm text-blue-600 hover:underline"
    >
      {truncateAddress(String(value))}
    </a>
  ),

  percent: (value: unknown) => <span>{Number(value).toFixed(1)}%</span>,
};

// 常用的列配置
export const commonFeedColumns = {
  symbol: { key: 'symbol', header: 'Symbol' },
  name: { key: 'name', header: 'Pair' },
  price: { key: 'price', header: 'Price', render: feedColumnRenderers.price },
  chain: { key: 'chain', header: 'Chain' },
  status: { key: 'status', header: 'Status', render: feedColumnRenderers.status },
  updatedAt: { key: 'updatedAt', header: 'Last Update', render: feedColumnRenderers.timeAgo },
  contractAddress: {
    key: 'contractAddress',
    header: 'Contract',
    render: feedColumnRenderers.address,
  },
};
