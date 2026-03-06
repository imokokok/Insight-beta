/**
 * PublisherSourceTypeLegend Component
 * 
 * 显示数据源类型的图例说明
 */

'use client';

import { Building2, Landmark, TrendingUp, Wallet } from 'lucide-react';

import { Badge } from '@/components/ui';
import { cn } from '@/shared/utils/ui';

import type { PublisherSourceType } from '../types/publisher';
import { PUBLISHER_SOURCE_TYPE_COLORS, PUBLISHER_SOURCE_TYPE_LABELS } from '../types/publisher';

interface SourceTypeItem {
  type: PublisherSourceType;
  icon: React.ReactNode;
  description: string;
}

const SOURCE_TYPES: SourceTypeItem[] = [
  {
    type: 'exchange',
    icon: <Building2 className="h-3 w-3" />,
    description: '中心化交易所（CEX）',
  },
  {
    type: 'market_maker',
    icon: <TrendingUp className="h-3 w-3" />,
    description: '做市商/交易公司',
  },
  {
    type: 'financial_institution',
    icon: <Landmark className="h-3 w-3" />,
    description: '传统金融机构',
  },
  {
    type: 'defi_protocol',
    icon: <Wallet className="h-3 w-3" />,
    description: 'DeFi 协议',
  },
];

interface PublisherSourceTypeLegendProps {
  className?: string;
}

export function PublisherSourceTypeLegend({ className }: PublisherSourceTypeLegendProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {SOURCE_TYPES.map((item) => (
        <Badge
          key={item.type}
          variant="outline"
          size="sm"
          className={cn('flex items-center gap-1.5', PUBLISHER_SOURCE_TYPE_COLORS[item.type])}
        >
          {item.icon}
          <span className="hidden sm:inline">{PUBLISHER_SOURCE_TYPE_LABELS[item.type]}</span>
          <span className="sm:hidden">{item.description}</span>
        </Badge>
      ))}
    </div>
  );
}
