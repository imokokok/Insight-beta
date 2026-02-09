/**
 * Component Types - 组件通用类型
 *
 * 基础 Props 类型和组件工具类型
 */

import type { ComponentPropsWithoutRef, ReactNode } from 'react';

// ============================================================================
// 基础组件 Props
// ============================================================================

export interface BaseComponentProps {
  /** 自定义类名 */
  className?: string;
  /** 子元素 */
  children?: ReactNode;
  /** 测试 ID */
  'data-testid'?: string;
}

export interface WithLoadingProps {
  /** 是否加载中 */
  isLoading?: boolean;
  /** 加载提示文本 */
  loadingText?: string;
  /** 加载骨架屏 */
  skeleton?: ReactNode;
}

export interface WithErrorProps {
  /** 错误对象 */
  error?: Error | null;
  /** 错误消息 */
  errorMessage?: string;
  /** 重试回调 */
  onRetry?: () => void;
}

export interface WithDisabledProps {
  /** 是否禁用 */
  disabled?: boolean;
}

export interface WithVisibleProps {
  /** 是否可见 */
  visible?: boolean;
  /** 动画持续时间（毫秒） */
  transitionDuration?: number;
}

// ============================================================================
// 交互组件 Props
// ============================================================================

export interface ClickableProps {
  /** 点击回调 */
  onClick?: () => void;
  /** 双击回调 */
  onDoubleClick?: () => void;
}

export interface HoverableProps {
  /** 鼠标进入回调 */
  onMouseEnter?: () => void;
  /** 鼠标离开回调 */
  onMouseLeave?: () => void;
}

export interface FocusableProps {
  /** 焦点进入回调 */
  onFocus?: () => void;
  /** 焦点离开回调 */
  onBlur?: () => void;
  /** 自动聚焦 */
  autoFocus?: boolean;
}

// ============================================================================
// 数据组件 Props
// ============================================================================

export interface WithDataProps<T> {
  /** 数据 */
  data: T;
  /** 数据键 */
  dataKey?: string;
}

export interface WithListProps<T> {
  /** 列表数据 */
  items: T[];
  /** 空状态渲染 */
  emptyRender?: ReactNode;
  /** 项键提取函数 */
  keyExtractor?: (item: T, index: number) => string;
  /** 项渲染函数 */
  renderItem: (item: T, index: number) => ReactNode;
}

// ============================================================================
// 表单组件 Props
// ============================================================================

export interface FormFieldProps<T = string> {
  /** 字段值 */
  value: T;
  /** 值变化回调 */
  onChange: (value: T) => void;
  /** 字段名称 */
  name?: string;
  /** 占位符 */
  placeholder?: string;
  /** 是否必填 */
  required?: boolean;
  /** 验证错误 */
  validationError?: string;
}

// ============================================================================
// 组合类型
// ============================================================================

export type InteractiveProps = ClickableProps & HoverableProps & FocusableProps;

export type AsyncComponentProps = WithLoadingProps & WithErrorProps;

export interface StandardComponentProps
  extends BaseComponentProps,
    InteractiveProps,
    WithDisabledProps {}

// ============================================================================
// HTML 元素扩展 Props
// ============================================================================

export type DivProps = ComponentPropsWithoutRef<'div'>;
export type ButtonProps = ComponentPropsWithoutRef<'button'>;
export type InputProps = ComponentPropsWithoutRef<'input'>;
export type AnchorProps = ComponentPropsWithoutRef<'a'>;
export type SpanProps = ComponentPropsWithoutRef<'span'>;
export type HeadingProps = ComponentPropsWithoutRef<'h1'>;

// ============================================================================
// 样式变体类型
// ============================================================================

export type SizeVariant = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ColorVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
export type Variant = 'solid' | 'outline' | 'ghost' | 'link';

export interface VariantProps {
  /** 尺寸变体 */
  size?: SizeVariant;
  /** 颜色变体 */
  color?: ColorVariant;
  /** 样式变体 */
  variant?: Variant;
}

// ============================================================================
// 布局组件 Props
// ============================================================================

export interface StackProps extends BaseComponentProps {
  /** 间距 */
  gap?: number | string;
  /** 水平对齐 */
  align?: 'start' | 'center' | 'end' | 'stretch';
  /** 垂直对齐 */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  /** 是否换行 */
  wrap?: boolean;
}

export interface GridProps extends BaseComponentProps {
  /** 列数 */
  columns?: number;
  /** 间距 */
  gap?: number | string;
  /** 最小列宽 */
  minColumnWidth?: string;
}

// ============================================================================
// 工具类型
// ============================================================================

/** 提取组件 Props 类型 */
export type ComponentProps<T> = T extends React.ComponentType<infer P> ? P : never;

/** 可选属性 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** 必填属性 */
export type RequiredProps<T, K extends keyof T> = T & Required<Pick<T, K>>;

/** 只读属性 */
export type ReadonlyProps<T> = { readonly [P in keyof T]: T[P] };

// ============================================================================
// 事件处理类型
// ============================================================================

export type ChangeHandler<T> = (value: T) => void;
export type AsyncHandler<T = void> = (value: T) => Promise<void>;
export type VoidHandler = () => void;
