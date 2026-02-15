'use client';

import { RefreshCw, Calendar } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/shared/utils';

import { TIME_RANGE_OPTIONS } from '../hooks/useGasMonitor';

interface GasPageHeaderProps {
  timeRange: string;
  setTimeRange: (value: string) => void;
  customDateRange: { from: Date | undefined; to: Date | undefined };
  setCustomDateRange: (
    range:
      | { from: Date | undefined; to: Date | undefined }
      | ((prev: { from: Date | undefined; to: Date | undefined }) => {
          from: Date | undefined;
          to: Date | undefined;
        }),
  ) => void;
  handleRefresh: () => void;
  pricesLoading: boolean;
  healthLoading: boolean;
}

export function GasPageHeader({
  timeRange,
  setTimeRange,
  customDateRange,
  setCustomDateRange,
  handleRefresh,
  pricesLoading,
  healthLoading,
}: GasPageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gas Price Analytics</h1>
          <p className="mt-1 text-muted-foreground">
            Real-time gas price analysis across multiple chains
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Calendar className="mr-2 h-4 w-4" />
                {timeRange === 'custom'
                  ? customDateRange.from && customDateRange.to
                    ? `${customDateRange.from.toLocaleDateString()} - ${customDateRange.to.toLocaleDateString()}`
                    : 'Custom Range'
                  : TIME_RANGE_OPTIONS.find((o) => o.value === timeRange)?.label || '24H'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="end">
              <div className="space-y-4">
                <div className="flex gap-2">
                  {TIME_RANGE_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      variant={timeRange === option.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setTimeRange(option.value);
                        setCustomDateRange({ from: undefined, to: undefined });
                      }}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
                {timeRange === 'custom' && (
                  <div className="flex gap-2">
                    <Input
                      type="datetime-local"
                      value={customDateRange.from?.toISOString().slice(0, 16) || ''}
                      onChange={(e) =>
                        setCustomDateRange(
                          (prev: { from: Date | undefined; to: Date | undefined }) => ({
                            ...prev,
                            from: new Date(e.target.value),
                          }),
                        )
                      }
                      className="text-sm"
                      placeholder="Start"
                    />
                    <Input
                      type="datetime-local"
                      value={customDateRange.to?.toISOString().slice(0, 16) || ''}
                      onChange={(e) =>
                        setCustomDateRange(
                          (prev: { from: Date | undefined; to: Date | undefined }) => ({
                            ...prev,
                            to: new Date(e.target.value),
                          }),
                        )
                      }
                      className="text-sm"
                      placeholder="End"
                    />
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={pricesLoading || healthLoading}
          >
            <RefreshCw
              className={cn('mr-2 h-4 w-4', pricesLoading || (healthLoading && 'animate-spin'))}
            />
            Refresh
          </Button>
        </div>
      </div>
    </div>
  );
}
