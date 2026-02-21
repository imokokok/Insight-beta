'use client';

import { TrendingUp, Zap, Clock, Heart } from 'lucide-react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

import type { TrendingSortBy } from '../types';

interface SortSelectorProps {
  value: TrendingSortBy;
  onChange: (value: TrendingSortBy) => void;
}

const sortOptions: Array<{
  value: TrendingSortBy;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    value: 'volume',
    label: '交易量',
    icon: <TrendingUp className="h-4 w-4" />,
  },
  {
    value: 'volatility',
    label: '波动性',
    icon: <Zap className="h-4 w-4" />,
  },
  {
    value: 'updateFrequency',
    label: '更新频率',
    icon: <Clock className="h-4 w-4" />,
  },
  {
    value: 'popularity',
    label: '关注度',
    icon: <Heart className="h-4 w-4" />,
  },
];

export function SortSelector({ value, onChange }: SortSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="选择排序方式" />
      </SelectTrigger>
      <SelectContent>
        {sortOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div className="flex items-center gap-2">
              {option.icon}
              <span>{option.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
