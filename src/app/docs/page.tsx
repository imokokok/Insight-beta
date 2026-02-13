'use client';

import { useEffect } from 'react';

import dynamic from 'next/dynamic';

const DynamicSwaggerUI = dynamic(
  () => import('swagger-ui-react').then((mod) => mod.default || mod),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    ),
  },
);

export default function ApiDocsPage() {
  // 动态加载 Swagger UI CSS，避免打包到主 bundle
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/swagger-ui-dist@5.17.0/swagger-ui.css';
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto py-8">
        <h1 className="mb-8 text-center text-3xl font-bold">OracleMonitor API 文档</h1>
        <DynamicSwaggerUI url="/api/docs" />
      </div>
    </div>
  );
}
