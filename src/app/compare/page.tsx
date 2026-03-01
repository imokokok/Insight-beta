'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

export default function CompareRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/compare/price');
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center">
      <div className="text-muted-foreground">正在跳转到价格比较...</div>
    </div>
  );
}
