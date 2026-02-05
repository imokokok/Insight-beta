/**
 * 动态导入优化使用示例
 *
 * 展示如何使用新的动态导入系统
 */

import {
  // 预定义的动态组件
  DynamicChart,
  DynamicAreaChart,
  DynamicBarChart,
  DynamicPieChart,
  DynamicSwaggerUI,
  DynamicVirtualList,
  DynamicTableVirtuoso,

  // 预加载功能
  preloadCharts,
  preloadSwaggerUI,
  preloadVirtualList,
  preloadCommonLibraries,
} from './dynamic-imports';

import { usePreload, useRoutePreload, useComponentPreload } from '@/hooks/usePreload';
import { PreloadLink } from '@/components/common/PreloadLink';

// ============================================================================
// 示例 1: 使用预定义的动态组件
// ============================================================================

function Example1_PredefinedComponents() {
  return (
    <div>
      {/* 图表组件 - 自动显示 chart skeleton */}
      <DynamicChart data={[]} />
      <DynamicAreaChart data={[]} />
      <DynamicBarChart data={[]} />
      <DynamicPieChart data={[]} />

      {/* 虚拟列表 - 自动显示 card skeleton */}
      <DynamicVirtualList data={[]} itemContent={(index) => <div>{index}</div>} />
      <DynamicTableVirtuoso
        data={[]}
        fixedHeaderContent={() => <div>Header</div>}
        itemContent={(index) => <div>{index}</div>}
        components={{
          EmptyPlaceholder: () => <div>No data</div>,
        }}
      />
    </div>
  );
}

// ============================================================================
// 示例 2: 使用工厂函数创建动态组件
// ============================================================================

// 创建一个动态地图组件（示例 - 需要安装 react-leaflet）
// const DynamicMap = createDynamicComponent({
//   loader: () => import('react-leaflet').then((mod) => ({ default: mod.MapContainer })),
//   loadingType: 'spinner',
//   loadingText: 'Loading map...',
//   ssr: false,
//   height: 400,
// });

// 创建一个带预加载功能的组件（示例）
// const { Component: DynamicHeavyChart, preload: preloadHeavyChart } = createPreloadableComponent({
//   key: 'heavy-chart',
//   loader: () => import('./some-heavy-chart-library'),
//   loadingType: 'chart',
//   ssr: false,
// });

function Example2_FactoryFunctions() {
  // 在需要时预加载
  // const handleMouseEnter = () => {
  //   preloadHeavyChart({ delay: 100 });
  // };

  return (
    <div>
      {/* <DynamicMap center={[51.505, -0.09]} zoom={13} /> */}
      {/* <div onMouseEnter={handleMouseEnter}><DynamicHeavyChart /></div> */}
      <p>Factory functions example - see comments for usage</p>
    </div>
  );
}

// ============================================================================
// 示例 3: 使用预加载 Hook
// ============================================================================

function Example3_PreloadHook() {
  const { preload, preloadBatch, isPreloaded } = usePreload({
    autoPreload: true, // 组件挂载时自动预加载常用库
    onPreloaded: (key: string) => console.log(`Preloaded: ${key}`),
    onError: (key: string, error: Error) => console.error(`Failed to preload ${key}:`, error),
  });

  // 手动预加载单个模块
  const handlePreloadCharts = () => {
    preload('recharts', () => import('recharts'), { delay: 0 });
  };

  // 批量预加载
  const handlePreloadBatch = () => {
    preloadBatch([
      { key: 'charts', loader: () => import('recharts'), strategy: 'delay', delay: 1000 },
      { key: 'swagger', loader: () => import('swagger-ui-react'), strategy: 'idle' },
      // 示例：视口预加载
      // {
      //   key: 'viewport-component',
      //   loader: () => import('./some-component'),
      //   strategy: 'viewport',
      //   viewportSelector: '#target-element',
      // },
      // 示例：交互预加载
      // {
      //   key: 'interaction-component',
      //   loader: () => import('./another-component'),
      //   strategy: 'interaction',
      //   interactionSelector: '#hover-me',
      //   interactionEvent: 'mouseenter',
      // },
    ]);
  };

  return (
    <div>
      <button onClick={handlePreloadCharts}>Preload Charts</button>
      <button onClick={handlePreloadBatch}>Preload Batch</button>
      <p>Charts preloaded: {isPreloaded('recharts') ? 'Yes' : 'No'}</p>
      <DynamicSwaggerUI url="/api/docs" />
    </div>
  );
}

// ============================================================================
// 示例 4: 路由预加载
// ============================================================================

function Example4_RoutePreload() {
  const { preloadRoute } = useRoutePreload();

  return (
    <nav>
      <a href="/oracle/dashboard" onMouseEnter={() => preloadRoute('/oracle/dashboard')}>
        Dashboard
      </a>
      <a href="/oracle/comparison" onMouseEnter={() => preloadRoute('/oracle/comparison')}>
        Comparison
      </a>
    </nav>
  );
}

// ============================================================================
// 示例 5: 组件预加载（悬停预加载）
// ============================================================================

function Example5_ComponentPreload() {
  const { preloadProps, isPreloaded } = useComponentPreload(
    'heavy-dashboard',
    () => import('@/app/oracle/dashboard/page'),
    {
      delay: 100,
      onPreload: () => console.log('Preloading dashboard...'),
    },
  );

  return (
    <div>
      <a {...preloadProps} href="/oracle/dashboard">
        Dashboard {isPreloaded() && '(preloaded)'}
      </a>
    </div>
  );
}

// ============================================================================
// 示例 6: 使用 PreloadLink 组件
// ============================================================================

function Example6_PreloadLink() {
  return (
    <nav>
      <PreloadLink href="/oracle/dashboard" preloadDelay={100}>
        Dashboard
      </PreloadLink>
      <PreloadLink
        href="/oracle/comparison"
        preloadDelay={200}
        onPreload={() => console.log('Preloading comparison page')}
      >
        Comparison
      </PreloadLink>
    </nav>
  );
}

// ============================================================================
// 示例 7: 全局预加载
// ============================================================================

// 在应用入口处调用
function initGlobalPreload() {
  // 预加载所有常用库
  preloadCommonLibraries();

  // 或者单独预加载
  preloadCharts();
  preloadVirtualList();

  // 延迟预加载 Swagger UI（可能用户不会访问）
  setTimeout(() => {
    preloadSwaggerUI();
  }, 5000);
}

// ============================================================================
// 示例 8: 条件预加载
// ============================================================================

function Example8_ConditionalPreload() {
  // const { preload } = usePreload();

  // 根据用户角色预加载不同组件（示例）
  const preloadBasedOnRole = (role: string) => {
    if (role === 'admin') {
      // preload('admin-panel', () => import('@/components/admin/AdminPanel'), { idle: true });
      console.log('Preloading admin panel...');
    } else if (role === 'analyst') {
      // preload('analytics-dashboard', () => import('@/components/analytics/AnalyticsDashboard'), { idle: true });
      console.log('Preloading analytics dashboard...');
    }
  };

  return <button onClick={() => preloadBasedOnRole('admin')}>Preload Admin Panel</button>;
}

export {
  Example1_PredefinedComponents,
  Example2_FactoryFunctions,
  Example3_PreloadHook,
  Example4_RoutePreload,
  Example5_ComponentPreload,
  Example6_PreloadLink,
  initGlobalPreload,
  Example8_ConditionalPreload,
};
