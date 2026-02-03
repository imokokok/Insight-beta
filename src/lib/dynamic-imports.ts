import dynamic from 'next/dynamic';
import React from 'react';

export const DynamicChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.LineChart })),
  {
    ssr: false,
    loading: () =>
      React.createElement('div', {
        className: 'h-64 animate-pulse rounded bg-gray-100',
      }),
  },
);

export const DynamicSwaggerUI = dynamic(() => import('swagger-ui-react'), {
  ssr: false,
  loading: () =>
    React.createElement('div', {
      className: 'h-screen animate-pulse rounded bg-gray-100',
    }),
});

export const DynamicVirtualList = dynamic(
  () => import('react-virtuoso').then((mod) => ({ default: mod.Virtuoso })),
  { ssr: false },
);
