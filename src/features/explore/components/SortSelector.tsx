'use client';

import { TrendingUp, Zap, Clock, Heart } from 'lucide-react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import type { TrendingSortBy } from '../types';

interface SortSelectorProps {
  value: TrendingSortBy;
  onChange: (value: TrendingSortBy) => void;
}

const sortOptions: Array<{
const sortOptions: Array<{
  label: string;
  icon: React.ReactNode;
}> = [
}> = [
    value: 'volume',
    label: '交易量',
    label: '交易量',
  },
  {
    value: 'volatility',
    label: '波动性',
    label: '波动性',
  },
  {
    value: 'updateFrequency',
    label: '更新频率',
    label: '更新频率',
  },
  {
    value: 'popularity',
    label: '关注度',
    label: '关注度',
  },
];

export function SortSelector({ value, onChange }: SortSelectorProps) {
  return (
      </SelectTrigger>
      <SelectContent>
        {sortOptions.map((option) => (
        <SelectValue placeholder="选择排序方式" />
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
