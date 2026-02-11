/**
 * Error Handler Component
 *
 * 增强错误处理组件 - 提供优雅的错误恢复体验
 */

'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  RefreshCw,
  Home,
  ArrowLeft,
  WifiOff,
  ServerOff,
  Clock,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Bug,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

// ==================== 错误类型定义 ====================

export type ErrorType =
  | 'network'
  | 'server'
  | 'timeout'
  | 'not_found'
  | 'forbidden'
  | 'unknown'
  | 'validation';

export interface ErrorDetails {
  type: ErrorType;
  message: string;
  code?: string | number;
  timestamp: Date;
  stack?: string;
  requestId?: string;
  suggestions?: string[];
}

// ==================== 错误类型配置 ====================

const errorConfig: Record<
  ErrorType,
  {
    icon: typeof AlertCircle;
    title: string;
    color: string;
    bgColor: string;
    borderColor: string;
    defaultMessage: string;
    suggestions: string[];
  }
> = {
  network: {
    icon: WifiOff,
    title: '网络连接失败',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    defaultMessage: '无法连接到服务器，请检查您的网络连接',
    suggestions: [
      '检查您的网络连接是否正常',
      '尝试刷新页面',
      '检查防火墙或代理设置',
    ],
  },
  server: {
    icon: ServerOff,
    title: '服务器错误',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    defaultMessage: '服务器暂时不可用，请稍后重试',
    suggestions: [
      '等待几分钟后重试',
      '检查系统状态页面',
      '联系技术支持',
    ],
  },
  timeout: {
    icon: Clock,
    title: '请求超时',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    defaultMessage: '请求处理时间过长，请稍后重试',
    suggestions: [
      '检查网络连接速度',
      '减少请求的数据量',
      '稍后重试',
    ],
  },
  not_found: {
    icon: AlertCircle,
    title: '页面未找到',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    defaultMessage: '您访问的页面不存在或已被移除',
    suggestions: [
      '检查URL是否正确',
      '返回上一页',
      '前往首页',
    ],
  },
  forbidden: {
    icon: AlertCircle,
    title: '访问被拒绝',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    defaultMessage: '您没有权限访问此页面',
    suggestions: [
      '检查是否已登录',
      '确认您有访问权限',
      '联系管理员',
    ],
  },
  validation: {
    icon: AlertCircle,
    title: '数据验证失败',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    defaultMessage: '提交的数据有误，请检查并重试',
    suggestions: [
      '检查输入的数据格式',
      '确保所有必填项已填写',
      '查看具体的错误提示',
    ],
  },
  unknown: {
    icon: Bug,
    title: '发生错误',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    defaultMessage: '发生未知错误，请稍后重试',
    suggestions: [
      '刷新页面重试',
      '清除浏览器缓存',
      '联系技术支持',
    ],
  },
};

// ==================== 错误边界组件 ====================

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: unknown[];
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class EnhancedErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKeys !== this.props.resetKeys) {
      const hasKeyChanged = prevProps.resetKeys?.some(
        (key, index) => key !== this.props.resetKeys?.[index]
      );
      if (hasKeyChanged) {
        this.reset();
      }
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={{
            type: 'unknown',
            message: this.state.error?.message || '发生错误',
            timestamp: new Date(),
            stack: this.state.error?.stack,
          }}
          onRetry={this.reset}
        />
      );
    }

    return this.props.children;
  }
}

// ==================== 错误回退组件 ====================

interface ErrorFallbackProps {
  error: ErrorDetails;
  onRetry?: () => void;
  onBack?: () => void;
  onHome?: () => void;
  showDetails?: boolean;
  className?: string;
}

export function ErrorFallback({
  error,
  onRetry,
  onBack,
  onHome,
  showDetails: initialShowDetails = false,
  className,
}: ErrorFallbackProps) {
  const [showDetails, setShowDetails] = useState(initialShowDetails);
  const [copied, setCopied] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const { toast } = useToast();

  const config = errorConfig[error.type] || errorConfig.unknown;
  const Icon = config.icon;

  const suggestions = error.suggestions || config.suggestions;

  const handleRetry = async () => {
    if (!onRetry) return;

    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);

    // 模拟重试延迟
    await new Promise((resolve) => setTimeout(resolve, 1000));

    onRetry();
    setIsRetrying(false);

    toast({
      title: '正在重试',
      message: `第 ${retryCount + 1} 次尝试...`,
      type: 'info',
      duration: 2000,
    });
  };

  const handleCopyError = () => {
    const errorText = `
错误类型: ${error.type}
错误信息: ${error.message}
错误代码: ${error.code || 'N/A'}
时间: ${error.timestamp.toISOString()}
请求ID: ${error.requestId || 'N/A'}
${error.stack ? `\n堆栈:\n${error.stack}` : ''}
    `.trim();

    navigator.clipboard.writeText(errorText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    toast({
      title: '已复制',
      message: '错误信息已复制到剪贴板',
      type: 'success',
      duration: 2000,
    });
  };

  // 自动重试逻辑
  useEffect(() => {
    if (retryCount > 0 && retryCount < 3 && error.type === 'network') {
      const timer = setTimeout(() => {
        handleRetry();
      }, 3000 * retryCount);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [retryCount, error.type]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex min-h-[400px] flex-col items-center justify-center p-8',
        className
      )}
    >
      <div
        className={cn(
          'w-full max-w-lg rounded-2xl border-2 p-8',
          config.bgColor,
          config.borderColor
        )}
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className={cn(
            'mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full',
            'bg-white shadow-lg'
          )}
        >
          <Icon className={cn('h-10 w-10', config.color)} />
        </motion.div>

        {/* Title */}
        <h2
          className={cn(
            'mb-2 text-center text-2xl font-bold',
            config.color
          )}
        >
          {config.title}
        </h2>

        {/* Message */}
        <p className="mb-6 text-center text-gray-600">
          {error.message || config.defaultMessage}
        </p>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="mb-6 rounded-xl bg-white/60 p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">
              建议操作：
            </h3>
            <ul className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-2 text-sm text-gray-600"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />
                  {suggestion}
                </motion.li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {onRetry && (
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              className={cn(
                'gap-2',
                error.type === 'network' &&
                  retryCount > 0 &&
                  retryCount < 3 &&
                  'animate-pulse'
              )}
            >
              <RefreshCw
                className={cn('h-4 w-4', isRetrying && 'animate-spin')}
              />
              {isRetrying ? '重试中...' : '重试'}
              {retryCount > 0 && ` (${retryCount})`}
            </Button>
          )}

          {onBack && (
            <Button variant="outline" onClick={onBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              返回
            </Button>
          )}

          {onHome && (
            <Button variant="outline" onClick={onHome} className="gap-2">
              <Home className="h-4 w-4" />
              首页
            </Button>
          )}
        </div>

        {/* Error Details Toggle */}
        <div className="mt-6 border-t border-gray-200 pt-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex w-full items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            {showDetails ? (
              <>
                <ChevronUp className="h-4 w-4" />
                隐藏详细信息
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                显示详细信息
              </>
            )}
          </button>

          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 rounded-lg bg-gray-900 p-4 text-left">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-gray-400">错误详情</span>
                    <button
                      onClick={handleCopyError}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-white"
                    >
                      {copied ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      {copied ? '已复制' : '复制'}
                    </button>
                  </div>
                  <pre className="max-h-48 overflow-auto text-xs text-gray-300">
                    <code>
                      {`Error Type: ${error.type}
Message: ${error.message}
Code: ${error.code || 'N/A'}
Time: ${error.timestamp.toISOString()}
Request ID: ${error.requestId || 'N/A'}
${error.stack ? `\nStack:\n${error.stack}` : ''}`}
                    </code>
                  </pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ==================== 轻量级错误提示 ====================

interface ErrorToastProps {
  error: ErrorDetails;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorToast({
  error,
  onRetry,
  onDismiss,
  className,
}: ErrorToastProps) {
  const config = errorConfig[error.type] || errorConfig.unknown;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={cn(
        'flex items-start gap-3 rounded-lg border p-4 shadow-lg',
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      <Icon className={cn('mt-0.5 h-5 w-5 flex-shrink-0', config.color)} />

      <div className="flex-1 min-w-0">
        <h4 className={cn('font-semibold', config.color)}>{config.title}</h4>
        <p className="mt-1 text-sm text-gray-600">{error.message}</p>

        {(onRetry || onDismiss) && (
          <div className="mt-3 flex items-center gap-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                重试
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                忽略
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ==================== 错误恢复 Hook ====================

interface UseErrorRecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  onMaxRetriesReached?: () => void;
}

export function useErrorRecovery(options: UseErrorRecoveryOptions = {}) {
  const { maxRetries = 3, retryDelay = 2000, onMaxRetriesReached } = options;
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<ErrorDetails | null>(null);

  const executeWithRecovery = async <T,>(
    fn: () => Promise<T>,
    errorHandler?: (error: unknown) => ErrorDetails
  ): Promise<T | null> => {
    try {
      const result = await fn();
      setRetryCount(0);
      setLastError(null);
      return result;
    } catch (error) {
      const errorDetails = errorHandler
        ? errorHandler(error)
        : {
            type: 'unknown' as ErrorType,
            message:
              error instanceof Error ? error.message : '发生未知错误',
            timestamp: new Date(),
          };

      setLastError(errorDetails);

      if (retryCount < maxRetries) {
        setRetryCount((prev) => prev + 1);
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelay * (retryCount + 1))
        );
        return executeWithRecovery(fn, errorHandler);
      } else {
        onMaxRetriesReached?.();
        return null;
      }
    }
  };

  const reset = () => {
    setRetryCount(0);
    setLastError(null);
  };

  return {
    executeWithRecovery,
    retryCount,
    lastError,
    reset,
    hasReachedMaxRetries: retryCount >= maxRetries,
  };
}

export default EnhancedErrorBoundary;
