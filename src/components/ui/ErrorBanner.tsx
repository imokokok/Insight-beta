/**
 * Error Banner 组件
 *
 * 统一的全页级错误展示组件
 * 遵循 UI_GUIDELINES.md 中的规范
 */

import { AlertCircle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/shared/utils';

interface ErrorBannerProps {
  /** 错误对象 */
  error: Error | null;
  /** 重试回调 */
  onRetry?: () => void;
  /** 标题 */
  title?: string;
  /** 自定义类名 */
  className?: string;
  /** 是否正在重试 */
  isRetrying?: boolean;
}

/**
 * 统一错误横幅组件
 *
 * @example
 * // 基础用法
 * <ErrorBanner error={error} onRetry={refetch} />
 *
 * // 自定义标题
 * <ErrorBanner
 *   error={error}
 *   onRetry={refetch}
 *   title="加载仪表板数据失败"
 * />
 *
 * // 带重试状态
 * <ErrorBanner
 *   error={error}
 *   onRetry={refetch}
 *   isRetrying={isFetching}
 * />
 */
export function ErrorBanner({
  error,
  onRetry,
  title = '加载失败',
  className,
  isRetrying = false,
}: ErrorBannerProps) {
  return (
    <div
      className={cn('rounded-lg border border-red-200 bg-red-50 p-4', className)}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-red-900">{title}</h3>
          <p className="mt-1 break-words text-sm text-red-700">
            {error?.message || '请检查网络连接后重试'}
          </p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              disabled={isRetrying}
              className="mt-3 bg-white hover:bg-red-100"
            >
              {isRetrying ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {isRetrying ? '重试中...' : '重试'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
