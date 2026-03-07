/**
 * PythStreamStatus Component
 * 
 * 显示 Pyth SSE 连接状态和统计信息
 */

'use client';

import { Activity, CheckCircle, Wifi, WifiOff } from 'lucide-react';

import { Badge } from '@/components/ui';
import { cn } from '@/shared/utils/ui';

interface PythStreamStatusProps {
  isConnected: boolean;
  isConnecting: boolean;
  lastUpdate: Date | null;
  updateCount: number;
  reconnectCount: number;
  className?: string;
}

export function PythStreamStatus({
  isConnected,
  isConnecting,
  lastUpdate,
  updateCount,
  reconnectCount,
  className,
}: PythStreamStatusProps) {
  const formatLastUpdate = (date: Date | null) => {
    if (!date) return '从未更新';
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 5) return '刚刚';
    if (diff < 60) return `${diff}秒前`;
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    return `${Math.floor(diff / 3600)}小时前`;
  };

  return (
    <div className={cn('flex items-center gap-2 text-xs', className)}>
      {/* 连接状态图标 */}
      <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1.5">
        {isConnecting && (
            <Wifi className="h-3.5 w-3.5 text-yellow-500 animate-pulse" />
            <span className="text-yellow-500">连接中...</span>
            <span className="text-yellow-500">连接中...</span>
          </>
        )}
        
        {isConnected && (
            <Wifi className="h-3.5 w-3.5 text-green-500" />
            <span className="text-green-500">实时</span>
        
        {!isConnected && !isConnecting && (
          <>
            <WifiOff className="h-3.5 w-3.5 text-red-500" />
            <span className="text-red-500">离线</span>
            <WifiOff className="h-3.5 w-3.5 text-red-500" />
            <span className="text-red-500">离线</span>
      </div>

      {/* 更新统计 */}
      {isConnected && lastUpdate && (
      {/* 更新统计 */}
        <>
        <>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Activity className="h-3 w-3" />
            <span>{formatLastUpdate(lastUpdate)}</span>
          </div>
          
          <Badge variant="outline" size="sm" className="tabular-nums">
            {updateCount} 次更新
          </Badge>
        </>
            {updateCount} 次更新
          </Badge>
      {/* 重连次数（如果有） */}
        </>
        <Badge variant="secondary" size="sm">
          重连 {reconnectCount} 次
      {/* 重连次数（如果有） */}
      {reconnectCount > 0 && (
        <Badge variant="secondary" size="sm">
          重连 {reconnectCount} 次
        </Badge>
      )}
    </div>
  );
}
