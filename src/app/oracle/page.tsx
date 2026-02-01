'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OraclePage() {
  const router = useRouter();

  useEffect(() => {
    // 重定向到 dashboard
    router.replace('/oracle/dashboard');
  }, [router]);

  // 显示加载状态
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
        <p className="text-gray-500">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}
