'use client';

import { useEffect, useState } from 'react';

import { AuditLogViewer } from '@/components/features/common/AuditLogViewer';
import { PageHeader } from '@/components/features/common/PageHeader';
import { useI18n } from '@/i18n/LanguageProvider';

export default function AuditPage() {
  const { t } = useI18n();
  const [adminToken, setAdminToken] = useState('');

  useEffect(() => {
    const saved = window.sessionStorage.getItem('oracle-monitor_admin_token');
    if (saved) setAdminToken(saved);
  }, []);

  useEffect(() => {
    const trimmed = adminToken.trim();
    if (trimmed) window.sessionStorage.setItem('oracle-monitor_admin_token', trimmed);
    else window.sessionStorage.removeItem('oracle-monitor_admin_token');
  }, [adminToken]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 pb-20 duration-700">
      <PageHeader title={t('audit.title')} description={t('audit.description')} />
      <div className="max-w-3xl">
        <AuditLogViewer adminToken={adminToken} setAdminToken={setAdminToken} />
      </div>
    </div>
  );
}
