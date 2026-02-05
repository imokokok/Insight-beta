import dynamic, { type DynamicOptions, type Loader } from 'next/dynamic';
import type { ComponentType } from 'react';
import { createLoadingComponent, type LoadingType } from '@/components/common/DynamicLoading';

// ============================================================================
// 动态导入配置类型定义
// ============================================================================

/**
 * 动态导入配置选项
 */
interface DynamicImportOptions<T = unknown> {
  /** 加载器函数 */
  loader: Loader<T>;
  /** 加载状态类型 */
  loadingType?: LoadingType;
  /** 加载状态文本 */
  loadingText?: string;
  /** 自定义加载组件 */
  loadingComponent?: ComponentType;
  /** 是否禁用 SSR */
  ssr?: boolean;
  /** 高度（用于 skeleton 类型） */
  height?: string | number;
  /** 额外的动态导入选项 */
  dynamicOptions?: Omit<DynamicOptions<T>, 'loading' | 'ssr'>;
}

/**
 * 预加载配置
 */
interface PreloadConfig {
  /** 延迟预加载时间（ms） */
  delay?: number;
  /** 是否在空闲时预加载 */
  idle?: boolean;
}

// ============================================================================
// 基础工厂函数
// ============================================================================

/**
 * 创建动态导入组件的统一工厂函数
 *
 * @example
 * const DynamicChart = createDynamicComponent({
 *   loader: () => import('recharts').then(mod => ({ default: mod.LineChart })),
 *   loadingType: 'chart',
 *   ssr: false,
 * });
 */
export function createDynamicComponent<T = unknown>({
  loader,
  loadingType = 'default',
  loadingText,
  loadingComponent: CustomLoading,
  ssr = false,
  height,
  dynamicOptions = {},
}: DynamicImportOptions<T>): ComponentType<T> {
  const LoadingComponent =
    CustomLoading || createLoadingComponent(loadingType, { text: loadingText, height });

  return dynamic(loader, {
    loading: LoadingComponent as DynamicOptions<T>['loading'],
    ssr,
    ...dynamicOptions,
  }) as ComponentType<T>;
}

// ============================================================================
// 预加载管理器
// ============================================================================

/**
 * 动态导入预加载管理器
 */
class PreloadManager {
  private preloadedModules = new Set<string>();

  /**
   * 预加载模块
   */
  preload(key: string, loader: () => Promise<unknown>, config: PreloadConfig = {}): void {
    if (this.preloadedModules.has(key)) return;

    const { delay = 0, idle = true } = config;

    const doPreload = () => {
      loader()
        .then(() => {
          this.preloadedModules.add(key);
          console.log(`[PreloadManager] Preloaded: ${key}`);
        })
        .catch((err) => {
          console.warn(`[PreloadManager] Failed to preload ${key}:`, err);
        });
    };

    if (delay > 0) {
      setTimeout(doPreload, delay);
    } else if (idle && typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(doPreload, { timeout: 2000 });
    } else {
      doPreload();
    }
  }

  /**
   * 批量预加载
   */
  preloadBatch(
    items: Array<{ key: string; loader: () => Promise<unknown>; config?: PreloadConfig }>,
  ): void {
    items.forEach((item, index) => {
      this.preload(item.key, item.loader, { delay: index * 100, ...item.config });
    });
  }

  /**
   * 检查模块是否已预加载
   */
  isPreloaded(key: string): boolean {
    return this.preloadedModules.has(key);
  }

  /**
   * 清空预加载记录
   */
  clear(): void {
    this.preloadedModules.clear();
  }
}

// 全局预加载管理器实例
export const preloadManager = new PreloadManager();

// ============================================================================
// 预定义的动态导入组件
// ============================================================================

/**
 * 动态图表组件（recharts）
 */
export const DynamicChart = createDynamicComponent({
  loader: () => import('recharts').then((mod) => ({ default: mod.LineChart })),
  loadingType: 'chart',
  ssr: false,
  height: 256,
});

/**
 * 动态面积图组件
 */
export const DynamicAreaChart = createDynamicComponent({
  loader: () => import('recharts').then((mod) => ({ default: mod.AreaChart })),
  loadingType: 'chart',
  ssr: false,
  height: 256,
});

/**
 * 动态柱状图组件
 */
export const DynamicBarChart = createDynamicComponent({
  loader: () => import('recharts').then((mod) => ({ default: mod.BarChart })),
  loadingType: 'chart',
  ssr: false,
  height: 256,
});

/**
 * 动态饼图组件
 */
export const DynamicPieChart = createDynamicComponent({
  loader: () => import('recharts').then((mod) => ({ default: mod.PieChart })),
  loadingType: 'chart',
  ssr: false,
  height: 256,
});

/**
 * 动态组合图表组件 - 包含完整的图表组件集合
 * 用于需要多个 recharts 组件的场景
 */
export const DynamicRecharts = createDynamicComponent({
  loader: () =>
    import('recharts').then((mod) => ({
      default: mod.LineChart,
      LineChart: mod.LineChart,
      Line: mod.Line,
      AreaChart: mod.AreaChart,
      Area: mod.Area,
      BarChart: mod.BarChart,
      Bar: mod.Bar,
      PieChart: mod.PieChart,
      Pie: mod.Pie,
      XAxis: mod.XAxis,
      YAxis: mod.YAxis,
      CartesianGrid: mod.CartesianGrid,
      Tooltip: mod.Tooltip,
      Legend: mod.Legend,
      ResponsiveContainer: mod.ResponsiveContainer,
    })),
  loadingType: 'chart',
  ssr: false,
  height: 256,
});

/**
 * 动态 Swagger UI 组件
 */
export const DynamicSwaggerUI = createDynamicComponent<{
  url?: string;
  spec?: object;
  docExpansion?: 'none' | 'list' | 'full';
}>({
  loader: () => import('swagger-ui-react').then((mod) => ({ default: mod.default })),
  loadingType: 'spinner',
  loadingText: 'Loading Swagger UI...',
  ssr: false,
  height: '100vh',
});

/**
 * 动态虚拟列表组件（react-virtuoso）
 */
export const DynamicVirtualList = createDynamicComponent({
  loader: () => import('react-virtuoso').then((mod) => ({ default: mod.Virtuoso })),
  loadingType: 'card',
  ssr: false,
  height: 400,
});

/**
 * 动态表格虚拟列表组件
 */
export const DynamicTableVirtuoso = createDynamicComponent({
  loader: () => import('react-virtuoso').then((mod) => ({ default: mod.TableVirtuoso })),
  loadingType: 'card',
  ssr: false,
  height: 400,
});

// ============================================================================
// 预加载辅助函数
// ============================================================================

/**
 * 预加载图表库
 */
export function preloadCharts(): void {
  preloadManager.preload('recharts', () => import('recharts'), { delay: 1000 });
}

/**
 * 预加载 Swagger UI
 */
export function preloadSwaggerUI(): void {
  preloadManager.preload('swagger-ui-react', () => import('swagger-ui-react'), { idle: true });
}

/**
 * 预加载虚拟列表库
 */
export function preloadVirtualList(): void {
  preloadManager.preload('react-virtuoso', () => import('react-virtuoso'), { delay: 500 });
}

/**
 * 预加载所有常用库（在首页加载完成后调用）
 */
export function preloadCommonLibraries(): void {
  // 延迟预加载，避免影响首屏
  setTimeout(() => {
    preloadCharts();
    preloadVirtualList();
  }, 2000);
}

// ============================================================================
// React Hook for dynamic imports
// ============================================================================

/**
 * 使用动态导入的 Hook
 *
 * @example
 * const MyComponent = useDynamicImport(() => import('./MyComponent'), {
 *   loadingType: 'spinner',
 * });
 */
export function useDynamicImport<T = unknown>(
  loader: Loader<T>,
  options?: Omit<DynamicImportOptions<T>, 'loader'>,
): ComponentType<T> {
  return createDynamicComponent({ loader, ...options });
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 创建带预加载功能的动态组件
 *
 * @example
 * const { Component, preload } = createPreloadableComponent({
 *   key: 'my-component',
 *   loader: () => import('./MyComponent'),
 *   loadingType: 'card',
 * });
 *
 * // 在需要时预加载
 * preload();
 */
export function createPreloadableComponent<T = unknown>({
  key,
  loader,
  ...options
}: DynamicImportOptions<T> & { key: string }): {
  Component: ComponentType<T>;
  preload: (config?: PreloadConfig) => void;
  isPreloaded: () => boolean;
} {
  const Component = createDynamicComponent({ loader, ...options });

  return {
    Component,
    preload: (config?: PreloadConfig) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const loadFn = () => (loader as any)().then(() => undefined);
      preloadManager.preload(key, loadFn, config);
    },
    isPreloaded: () => preloadManager.isPreloaded(key),
  };
}

// ============================================================================
// 导出类型
// ============================================================================

export type { DynamicImportOptions, PreloadConfig };
