'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { useI18n } from '@/i18n';

export default function CompareRedirectPage() {
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    router.replace('/compare/price');
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center">
      <div className="text-muted-foreground">{t('compare.redirecting')}</div>
    </div>
  );
}
