/**
 * Auto Refresh Control Component
 *
 * 自动刷新控制组件
 * - 开启/关闭自动刷新
 * - 调整刷新间隔
 * - 显示倒计时
 */

'use client';

import { useState } from 'react';

import { Play, Pause, Clock, Settings2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/shared/utils';

interface AutoRefreshControlProps {
  isEnabled: boolean;
  onToggle: () => void;
  interval: number;
  onIntervalChange: (interval: number) => void;
  timeUntilRefresh: number;
  className?: string;
}

const intervals = [
  { value: 10000, label: '10s' },
  { value: 30000, label: '30s' },
  { value: 60000, label: '1m' },
  { value: 300000, label: '5m' },
];

export function AutoRefreshControl({
  isEnabled,
  onToggle,
  interval,
  onIntervalChange,
  timeUntilRefresh,
  className,
}: AutoRefreshControlProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  const progress = isEnabled ? ((interval - timeUntilRefresh) / interval) * 100 : 0;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* 刷新按钮 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className={cn('relative h-8 w-8 p-0', isEnabled && 'text-green-600 hover:text-green-700')}
        title={isEnabled ? 'Pause auto refresh' : 'Start auto refresh'}
      >
        {isEnabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}

        {/* 进度环 */}
        {isEnabled && (
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 32 32">
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-gray-200"
            />
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={88}
              strokeDashoffset={88 - (88 * progress) / 100}
              className="text-green-500 transition-all duration-100"
            />
          </svg>
        )}
      </Button>

      {/* 倒计时显示 */}
      {isEnabled && (
        <span className="w-8 text-xs text-muted-foreground">{formatTime(timeUntilRefresh)}</span>
      )}

      {/* 间隔设置 */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Refresh interval">
            <Settings2 className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Refresh Interval
          </div>
          {intervals.map((item) => (
            <DropdownMenuItem
              key={item.value}
              onClick={() => onIntervalChange(item.value)}
              className={cn(
                'flex items-center justify-between',
                interval === item.value && 'bg-accent',
              )}
            >
              <span className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                {item.label}
              </span>
              {interval === item.value && <div className="h-2 w-2 rounded-full bg-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
