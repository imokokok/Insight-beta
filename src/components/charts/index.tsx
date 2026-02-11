'use client';

import dynamic from 'next/dynamic';

// Dynamic imports for all recharts components
export const LineChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.LineChart })),
  { ssr: false },
);

export const Line = dynamic(() => import('recharts').then((mod) => ({ default: mod.Line })), {
  ssr: false,
});

export const XAxis = dynamic(() => import('recharts').then((mod) => ({ default: mod.XAxis })), {
  ssr: false,
});

export const YAxis = dynamic(() => import('recharts').then((mod) => ({ default: mod.YAxis })), {
  ssr: false,
});

export const CartesianGrid = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.CartesianGrid })),
  { ssr: false },
);

export const Tooltip = dynamic(() => import('recharts').then((mod) => ({ default: mod.Tooltip })), {
  ssr: false,
});

export const Legend = dynamic(() => import('recharts').then((mod) => ({ default: mod.Legend })), {
  ssr: false,
});

export const ResponsiveContainer = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.ResponsiveContainer })),
  { ssr: false },
);

// 移动端图表组件
export {
  MobileChartWrapper,
  MobileChartToolbar,
  MobileChartCard,
  MobileLegend,
} from './MobileChartWrapper';
