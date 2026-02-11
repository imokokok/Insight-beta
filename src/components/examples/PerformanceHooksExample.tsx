'use client';

import { useState, useCallback } from 'react';

import { motion } from 'framer-motion';

// 导入性能 Hooks

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useDebounce,
  useThrottle,
  useIntersectionObserver,
  useNetworkStatus,
  useMemoryStatus,
  useLongTaskMonitor,
} from '@/hooks/usePerformance';

/**
 * 性能 Hooks 使用示例组件
 * 展示如何在实际项目中使用性能优化 Hooks
 */
export function PerformanceHooksExample() {
  // ==================== useNetworkStatus ====================
  const { isOnline, connectionType, effectiveType, isSlowConnection } = useNetworkStatus();

  // ==================== useMemoryStatus ====================
  const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = useMemoryStatus();

  // ==================== useLongTaskMonitor ====================
  const [longTasks, setLongTasks] = useState<number[]>([]);
  useLongTaskMonitor((duration) => {
    setLongTasks((prev) => [...prev.slice(-4), duration]);
  });

  // ==================== useDebounce ====================
  const [searchValue, setSearchValue] = useState('');
  const [searchCount, setSearchCount] = useState(0);
  const debouncedSearch = useDebounce(searchValue, 500);

  // 当防抖值变化时执行搜索
  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
    // 实际搜索逻辑会在 debouncedSearch 变化后执行
  }, []);

  // 模拟搜索执行
  useState(() => {
    if (debouncedSearch) {
      setSearchCount((c) => c + 1);
    }
  });

  // ==================== useThrottle ====================
  const [clickCount, setClickCount] = useState(0);
  const [throttledCount, setThrottledCount] = useState(0);

  const throttledClick = useThrottle(() => {
    setThrottledCount((c) => c + 1);
  }, 1000);

  const handleClick = () => {
    setClickCount((c) => c + 1);
    throttledClick();
  };

  // ==================== useIntersectionObserver ====================
  const { ref: lazyLoadRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.5,
    triggerOnce: true,
  });

  return (
    <div className="space-y-6">
      {/* 网络状态监控 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            网络状态
            <Badge variant={isOnline ? 'success' : 'destructive'}>
              {isOnline ? '在线' : '离线'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500">连接类型</p>
              <p className="text-lg font-semibold">{connectionType}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500">有效类型</p>
              <p className="text-lg font-semibold">{effectiveType}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500">慢速连接</p>
              <p className="text-lg font-semibold">{isSlowConnection ? '是' : '否'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 内存使用监控 */}
      <Card>
        <CardHeader>
          <CardTitle>内存使用</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500">已使用堆内存</p>
              <p className="text-lg font-semibold">
                {usedJSHeapSize ? formatBytes(usedJSHeapSize) : 'N/A'}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500">总堆内存</p>
              <p className="text-lg font-semibold">
                {totalJSHeapSize ? formatBytes(totalJSHeapSize) : 'N/A'}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500">堆内存限制</p>
              <p className="text-lg font-semibold">
                {jsHeapSizeLimit ? formatBytes(jsHeapSizeLimit) : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 长任务监控 */}
      <Card>
        <CardHeader>
          <CardTitle>长任务监控</CardTitle>
        </CardHeader>
        <CardContent>
          {longTasks.length === 0 ? (
            <p className="text-gray-500">暂无长任务记录</p>
          ) : (
            <div className="space-y-2">
              {longTasks.map((duration, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg bg-red-50 p-3"
                >
                  <span className="text-sm text-red-700">
                    长任务 #{index + 1}
                  </span>
                  <Badge variant="destructive">{duration.toFixed(2)}ms</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* useDebounce 示例 */}
      <Card>
        <CardHeader>
          <CardTitle>useDebounce 示例</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="输入搜索关键词..."
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">当前值</p>
                <p className="text-lg font-semibold">{searchValue || '(空)'}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">防抖后值 (500ms)</p>
                <p className="text-lg font-semibold">{debouncedSearch || '(空)'}</p>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              搜索执行次数: {searchCount}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* useThrottle 示例 */}
      <Card>
        <CardHeader>
          <CardTitle>useThrottle 示例</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={handleClick} className="w-full">
              点击我 (每秒最多执行1次)
            </Button>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">总点击次数</p>
                <p className="text-lg font-semibold">{clickCount}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">节流后执行次数</p>
                <p className="text-lg font-semibold">{throttledCount}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* useIntersectionObserver 示例 */}
      <Card>
        <CardHeader>
          <CardTitle>useIntersectionObserver 示例</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              向下滚动查看懒加载内容
            </p>
            <div className="h-64 overflow-y-auto rounded-lg border p-4">
              <div className="h-96 flex items-center justify-center text-gray-400">
                向下滚动 ↓
              </div>
              <div
                ref={lazyLoadRef as React.RefObject<HTMLDivElement>}
                className="h-64"
              >
                {isIntersecting ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex h-full items-center justify-center rounded-lg bg-purple-100"
                  >
                    <p className="text-lg font-semibold text-purple-700">
                      🎉 内容已懒加载！
                    </p>
                  </motion.div>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-lg bg-gray-100">
                    <p className="text-gray-400">等待进入视口...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 格式化字节数
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
