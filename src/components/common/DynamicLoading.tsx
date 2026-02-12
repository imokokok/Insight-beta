import { Loader2 } from 'lucide-react';

import { CardSkeleton, ChartSkeleton, PageSkeleton } from '@/components/ui/skeleton';
import { cn } from '@/shared/utils';

/**
 * 动态导入加载状态类型
 */
export type LoadingType = 'default' | 'card' | 'chart' | 'page' | 'inline' | 'spinner';

/**
 * 动态导入加载组件 Props
 */
interface DynamicLoadingProps {
  type?: LoadingType;
  className?: string;
  text?: string;
  height?: string | number;
}

/**
 * 统一的动态导入加载组件
 *
 * 提供多种加载状态样式，用于动态导入组件的 loading 状态
 */
export function DynamicLoading({
  type = 'default',
  className,
  text = 'Loading...',
  height,
}: DynamicLoadingProps) {
  const style = height
    ? { height: typeof height === 'number' ? `${height}px` : height }
    : undefined;

  switch (type) {
    case 'spinner':
      return (
        <div className={cn('flex items-center justify-center p-8', className)} style={style}>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          {text && <span className="ml-2 text-gray-600">{text}</span>}
        </div>
      );

    case 'inline':
      return (
        <div className={cn('flex items-center gap-2', className)} style={style}>
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-gray-600">{text}</span>
        </div>
      );

    case 'card':
      return <CardSkeleton className={className} />;

    case 'chart':
      return <ChartSkeleton className={className} />;

    case 'page':
      return <PageSkeleton />;

    case 'default':
    default:
      return (
        <div
          className={cn(
            'flex min-h-[200px] flex-col items-center justify-center rounded-lg bg-gray-50',
            className,
          )}
          style={style}
        >
          <Loader2 className="mb-2 h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-gray-600">{text}</p>
        </div>
      );
  }
}

/**
 * 创建动态导入 loading 组件的工厂函数
 */
export function createLoadingComponent(
  type: LoadingType = 'default',
  options?: Omit<DynamicLoadingProps, 'type'>,
) {
  return function LoadingComponent() {
    return <DynamicLoading type={type} {...options} />;
  };
}
