'use client';

import { useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

interface UpdateDataPoint {
  timestamp: string;
  dapiName: string;
  delay: number;
  severity: 'normal' | 'warning' | 'critical';
}

interface PriceUpdateHeatmapProps {
  data: UpdateDataPoint[];
  isLoading?: boolean;
}

interface HeatmapCell {
  hour: number;
  day: number;
  count: number;
  avgDelay: number;
  severity: 'normal' | 'warning' | 'critical';
}

export function PriceUpdateHeatmap({ data, isLoading }: PriceUpdateHeatmapProps) {
  const { t } = useI18n();

  const heatmapData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // 按小时和天聚合数据
    const cellMap = new Map<string, HeatmapCell>();
    const daysOfWeek = ['一', '二', '三', '四', '五', '六', '日'];

    data.forEach((point) => {
      const date = new Date(point.timestamp);
      const day = date.getDay(); // 0-6 (周日是 0)
      const dayIndex = day === 0 ? 6 : day - 1; // 转换为周一是 0
      const hour = date.getHours();

      const key = `${dayIndex}-${hour}`;
      const existing = cellMap.get(key);

      if (existing) {
        existing.count += 1;
        existing.avgDelay = (existing.avgDelay * (existing.count - 1) + point.delay) / existing.count;
        // 更新严重程度
        if (point.severity === 'critical') {
          existing.severity = 'critical';
        } else if (point.severity === 'warning' && existing.severity !== 'critical') {
          existing.severity = 'warning';
        }
      } else {
        cellMap.set(key, {
          hour,
          day: dayIndex,
          count: 1,
          avgDelay: point.delay,
          severity: point.severity,
        });
      }
    });

    return Array.from(cellMap.values());
  }, [data]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500 hover:bg-red-600';
      case 'warning':
        return 'bg-yellow-500 hover:bg-yellow-600';
      default:
        return 'bg-green-500 hover:bg-green-600';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '严重延迟';
      case 'warning':
        return '警告';
      default:
        return '正常';
    }
  };

  const maxCount = Math.max(...heatmapData.map((c) => c.count), 1);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>价格更新热力图</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            加载中...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (heatmapData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>价格更新热力图</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            暂无数据
          </div>
        </CardContent>
      </Card>
    );
  }

  const daysOfWeek = ['一', '二', '三', '四', '五', '六', '日'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>价格更新热力图</CardTitle>
        <p className="text-sm text-muted-foreground">
          显示 24 小时内价格更新的频率和延迟情况
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-[600px]">
            {/* 小时标签 */}
            <div className="ml-12 grid grid-cols-24 gap-px">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="text-center text-xs text-muted-foreground">
                  {i}
                </div>
              ))}
            </div>

            {/* 热力图 */}
            <div className="mt-2 space-y-1">
              {daysOfWeek.map((day, dayIndex) => (
                <div key={day} className="flex items-center gap-1">
                  <div className="w-10 text-xs text-muted-foreground">周{day}</div>
                  <div className="grid flex-1 grid-cols-24 gap-px">
                    {Array.from({ length: 24 }).map((_, hourIndex) => {
                      const cell = heatmapData.find(
                        (c) => c.day === dayIndex && c.hour === hourIndex,
                      );
                      return (
                        <div
                          key={hourIndex}
                          className={cn(
                            'aspect-square rounded-sm transition-colors',
                            cell
                              ? getSeverityColor(cell.severity)
                              : 'bg-muted/30',
                            cell && 'cursor-pointer',
                          )}
                          title={
                            cell
                              ? `周${day} ${hourIndex}:00\n更新次数：${cell.count}\n平均延迟：${cell.avgDelay.toFixed(0)}ms\n${getSeverityLabel(cell.severity)}`
                              : `周${day} ${hourIndex}:00\n无数据`
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* 图例 */}
            <div className="mt-4 flex items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-sm bg-green-500" />
                <span>正常</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-sm bg-yellow-500" />
                <span>警告</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-sm bg-red-500" />
                <span>严重延迟</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-sm bg-muted/30" />
                <span>无数据</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
