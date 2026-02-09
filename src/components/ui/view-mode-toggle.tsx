/**
 * View Mode Toggle 组件
 *
 * 普通/专业模式切换组件
 * 用于表格和列表的显示模式切换
 */

'use client';

import { LayoutList, Rows3 } from 'lucide-react';

import { cn } from '@/lib/utils';

export type ViewMode = 'normal' | 'dense';

interface ViewModeToggleProps {
  /** 当前模式 */
  mode: ViewMode;
  /** 模式变化回调 */
  onChange: (mode: ViewMode) => void;
  /** 自定义类名 */
  className?: string;
  /** 是否显示标签 */
  showLabel?: boolean;
}

/**
 * 视图模式切换组件
 *
 * @example
 * // 基础用法
 * <ViewModeToggle mode={mode} onChange={setMode} />
 *
 * // 不带标签
 * <ViewModeToggle mode={mode} onChange={setMode} showLabel={false} />
 */
export function ViewModeToggle({
  mode,
  onChange,
  className,
  showLabel = true,
}: ViewModeToggleProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border bg-white p-1 shadow-sm',
        className,
      )}
      role="group"
      aria-label="视图模式切换"
    >
      <button
        type="button"
        onClick={() => onChange('normal')}
        className={cn(
          'flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-all',
          mode === 'normal'
            ? 'bg-purple-100 text-purple-700 shadow-sm'
            : 'text-gray-600 hover:bg-gray-100',
        )}
        aria-pressed={mode === 'normal'}
        title="普通模式 - 适合查看详细信息"
      >
        <LayoutList className="h-3.5 w-3.5" aria-hidden="true" />
        {showLabel && <span>普通</span>}
      </button>
      <button
        type="button"
        onClick={() => onChange('dense')}
        className={cn(
          'flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-all',
          mode === 'dense'
            ? 'bg-purple-100 text-purple-700 shadow-sm'
            : 'text-gray-600 hover:bg-gray-100',
        )}
        aria-pressed={mode === 'dense'}
        title="专业模式 - 高密度信息展示"
      >
        <Rows3 className="h-3.5 w-3.5" aria-hidden="true" />
        {showLabel && <span>专业</span>}
      </button>
    </div>
  );
}

/**
 * 带标签的视图模式切换
 * 显示当前模式说明
 */
interface ViewModeToggleWithLabelProps extends ViewModeToggleProps {
  /** 普通模式标签 */
  normalLabel?: string;
  /** 专业模式标签 */
  denseLabel?: string;
}

export function ViewModeToggleWithLabel({
  mode,
  onChange,
  className,
  normalLabel = '普通模式',
  denseLabel = '专业模式',
}: ViewModeToggleWithLabelProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <ViewModeToggle mode={mode} onChange={onChange} showLabel={false} />
      <span className="text-xs text-gray-500">{mode === 'normal' ? normalLabel : denseLabel}</span>
    </div>
  );
}
