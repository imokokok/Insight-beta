/**
 * Swagger UI 页面
 *
 * 提供交互式 API 文档浏览界面
 * 使用动态导入减少初始加载时间
 */

/* eslint-disable no-restricted-syntax */

'use client';

import { useEffect, useState } from 'react';
import { DynamicSwaggerUI } from '@/lib/dynamic-imports';

export default function SwaggerPage() {
  const [spec, setSpec] = useState<object | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 动态加载 CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/swagger-ui-dist@5.10.0/swagger-ui.css';
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  useEffect(() => {
    fetch('/api/docs')
      .then((res) => res.json())
      .then((data) => {
        setSpec(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
          <p className="text-gray-600">Loading API Documentation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to load API documentation</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-bold text-gray-900">API Documentation</h1>
          <p className="mt-1 text-gray-600">
            Interactive API documentation for the OracleMonitor platform
          </p>
        </div>
      </div>
      <div className="swagger-container">
        {spec && <DynamicSwaggerUI spec={spec} docExpansion="list" />}
      </div>
    </div>
  );
}
