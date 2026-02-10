'use client';

import { useEffect, useState, useCallback } from 'react';

import { Wifi, WifiOff, RefreshCw, CloudOff } from 'lucide-react';

import { getSyncManager, type SyncStatus } from '@/lib/offline/syncManager';
import { cn } from '@/lib/utils';

/**
 * 离线状态指示器组件
 *
 * 显示当前网络连接状态和同步状态
 */
export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showIndicator, setShowIndicator] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  useEffect(() => {
    // 初始状态
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowIndicator(true);
      // 延迟隐藏，让用户看到恢复提示
      setTimeout(() => {
        setShowIndicator(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowIndicator(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 如果初始就是离线状态，显示指示器
    if (!navigator.onLine) {
      setShowIndicator(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 监听同步状态
  useEffect(() => {
    const syncManager = getSyncManager();

    // 初始状态
    setSyncStatus(syncManager.getStatus());
    setHasPendingChanges(syncManager.getQueueLength() > 0);

    // 订阅同步事件
    const unsubscribeOnline = syncManager.on('online', (status) => {
      setSyncStatus(status);
      setHasPendingChanges(status.queueLength > 0);
    });

    const unsubscribeOffline = syncManager.on('offline', (status) => {
      setSyncStatus(status);
    });

    const unsubscribeSyncStart = syncManager.on('syncStart', (status) => {
      setSyncStatus(status);
    });

    const unsubscribeSyncComplete = syncManager.on('syncComplete', (status) => {
      setSyncStatus(status);
      setHasPendingChanges(status.queueLength > 0);
    });

    // 定期检查队列状态
    const interval = setInterval(() => {
      const status = syncManager.getStatus();
      setHasPendingChanges(status.queueLength > 0);
    }, 5000);

    return () => {
      unsubscribeOnline();
      unsubscribeOffline();
      unsubscribeSyncStart();
      unsubscribeSyncComplete();
      clearInterval(interval);
    };
  }, []);

  // 手动触发同步
  const handleManualSync = useCallback(async () => {
    const syncManager = getSyncManager();
    await syncManager.sync();
  }, []);

  if (!showIndicator && !hasPendingChanges) return null;

  // 显示同步状态指示器
  if (hasPendingChanges && isOnline) {
    return (
      <button
        className={cn(
          'fixed bottom-4 left-1/2 z-50 -translate-x-1/2 transform',
          'flex items-center gap-2 rounded-full px-4 py-2 shadow-lg',
          'animate-in slide-in-from-bottom-4 transition-all duration-300',
          'cursor-pointer bg-blue-500 text-white hover:bg-blue-600',
        )}
        onClick={handleManualSync}
        title="点击立即同步"
        type="button"
      >
        {syncStatus?.isSyncing ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span className="text-sm font-medium">Syncing...</span>
          </>
        ) : (
          <>
            <CloudOff className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm font-medium">{syncStatus?.queueLength} pending</span>
          </>
        )}
      </button>
    );
  }

  // 显示网络状态指示器
  if (!showIndicator) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 left-1/2 z-50 -translate-x-1/2 transform',
        'flex items-center gap-2 rounded-full px-4 py-2 shadow-lg',
        'animate-in slide-in-from-bottom-4 transition-all duration-300',
        isOnline ? 'bg-green-500 text-white' : 'bg-amber-500 text-white',
      )}
      role="status"
      aria-live="polite"
    >
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm font-medium">Back online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm font-medium">You are offline</span>
        </>
      )}
    </div>
  );
}

export default OfflineIndicator;
