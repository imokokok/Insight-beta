'use client';

import { useEffect, useState } from 'react';

import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';

import { LayoutGrid, List as ListIcon } from 'lucide-react';

import { CopyButton } from '@/components/common/CopyButton';
import { AssertionList } from '@/features/oracle/components/AssertionList';
import { AddressAvatar } from '@/features/wallet/components/AddressAvatar';
import { UserStatsCard } from '@/features/wallet/components/UserStatsCard';
import { useOracleData, useUserStats } from '@/hooks';
import { useI18n } from '@/i18n/LanguageProvider';
import { getUiErrorMessage } from '@/i18n/translations';
import { cn, getExplorerUrl } from '@/shared/utils';

import type { Route } from 'next';

export default function AddressProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const address = params.address as string;
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const currentSearch = searchParams?.toString() ?? '';
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    try {
      if (typeof window === 'undefined') return 'grid';
      const raw = window.localStorage.getItem('oracleFilters');
      if (!raw) return 'grid';
      const parsed = JSON.parse(raw) as { viewMode?: unknown } | null;
      const value = parsed && typeof parsed === 'object' ? parsed.viewMode : null;
      if (value === 'grid' || value === 'list') return value;
    } catch {
      return 'grid';
    }
    return 'grid';
  });
  const instanceIdFromUrl = searchParams?.get('instanceId')?.trim() || '';
  const [instanceId, setInstanceId] = useState<string>(() => {
    try {
      if (typeof window === 'undefined') return 'default';
      const saved = window.localStorage.getItem('oracleFilters');
      if (!saved) return 'default';
      const parsed = JSON.parse(saved) as { instanceId?: unknown } | null;
      const value = parsed && typeof parsed === 'object' ? parsed.instanceId : null;
      if (typeof value === 'string' && value.trim()) return value.trim();
    } catch {
      return 'default';
    }
    return 'default';
  });

  useEffect(() => {
    if (!instanceIdFromUrl) return;
    if (instanceIdFromUrl === instanceId) return;
    setInstanceId(instanceIdFromUrl);
  }, [instanceIdFromUrl, instanceId]);

  useEffect(() => {
    const normalized = instanceId.trim();
    const params = new URLSearchParams(currentSearch);
    if (normalized) params.set('instanceId', normalized);
    else params.delete('instanceId');
    const nextSearch = params.toString();
    const nextUrl = nextSearch ? `${pathname}?${nextSearch}` : pathname;
    const currentUrl = currentSearch ? `${pathname}?${currentSearch}` : pathname;
    if (nextUrl !== currentUrl) router.replace(nextUrl as Route, { scroll: false });
  }, [currentSearch, instanceId, pathname, router]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('oracleFilters');
      const parsed = raw && raw.trim() ? (JSON.parse(raw) as Record<string, unknown> | null) : null;
      const next = {
        ...(parsed && typeof parsed === 'object' ? parsed : {}),
        instanceId,
        viewMode,
      };
      window.localStorage.setItem('oracleFilters', JSON.stringify(next));
    } catch {
      void 0;
    }
  }, [instanceId, viewMode]);

  const { stats, loading: statsLoading } = useUserStats(address, instanceId);

  const {
    items: assertions,
    loading: assertionsLoading,
    loadingMore: assertionsLoadingMore,
    error: assertionsError,
    hasMore: assertionsHasMore,
    loadMore: loadMoreAssertions,
  } = useOracleData('All', 'All', '', address, instanceId);

  return (
    <div className="container mx-auto max-w-7xl space-y-8 px-4 py-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <div className="mb-3 flex items-center gap-4">
            <div className="ring-primary50 rounded-full bg-white p-1 shadow-sm ring-4">
              <AddressAvatar address={address} size={48} />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900">
              {t('oracle.profile.title')}
            </h1>
          </div>
          <div className="ml-1 flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-gray-200/60 bg-gray-100 px-3 py-1.5 shadow-sm">
              <code className="font-mono text-sm font-semibold text-gray-600">{address}</code>
              <div className="mx-1 h-4 w-px bg-gray-300" />
              <CopyButton
                text={address}
                label="Address"
                className="h-6 w-6 p-1 hover:bg-white"
                iconSize={14}
              />
            </div>
            {(() => {
              const explorerUrl = getExplorerUrl('Mainnet', address, 'address');
              return explorerUrl ? (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-transparent p-2 text-gray-400 transition-colors hover:border-primary/10 hover:bg-primary/5 hover:text-primary"
                  title={t('common.viewOnExplorer')}
                >
                  <span className="sr-only">View on Explorer</span>
                </a>
              ) : null;
            })()}
          </div>
        </div>
      </div>

      <UserStatsCard stats={stats ?? null} loading={statsLoading} />

      <div className="space-y-6">
        <div className="flex items-center justify-end border-b border-gray-200/60 pb-1">
          <div className="flex rounded-lg border border-gray-200/50 bg-gray-100/50 p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'rounded-md p-1.5 transition-all',
                viewMode === 'grid'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-400 hover:text-gray-600',
              )}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'rounded-md p-1.5 transition-all',
                viewMode === 'list'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-400 hover:text-gray-600',
              )}
            >
              <ListIcon size={16} />
            </button>
          </div>
        </div>

        <div className="min-h-[400px]">
          {assertionsError ? (
            <div className="mb-4 rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-sm text-rose-700 shadow-sm">
              {getUiErrorMessage(assertionsError, t)}
            </div>
          ) : null}
          <AssertionList
            items={assertions}
            loading={assertionsLoading}
            viewMode={viewMode}
            hasMore={assertionsHasMore}
            loadMore={loadMoreAssertions}
            loadingMore={assertionsLoadingMore}
            instanceId={instanceId}
          />
        </div>
      </div>
    </div>
  );
}
