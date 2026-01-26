'use client';

import { useEffect, useState } from 'react';
import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/features/common/PageHeader';
import { ConnectWallet } from '@/components/features/wallet/ConnectWallet';
import { DisputeList } from '@/components/features/dispute/DisputeList';
import { UserStatsCard } from '@/components/features/wallet/UserStatsCard';
import { NoWalletState } from '@/components/features/dispute/my-disputes/NoWalletState';
import { MyDisputesToolbar } from '@/components/features/dispute/my-disputes/MyDisputesToolbar';
import { DisputesEmptyState } from '@/components/features/dispute/my-disputes/DisputesEmptyState';
import { useDisputes } from '@/hooks/dispute/useDisputes';
import { useUserStats } from '@/hooks/user/useUserStats';
import { useWallet } from '@/contexts/WalletContext';
import { useI18n } from '@/i18n/LanguageProvider';
import { getUiErrorMessage } from '@/i18n/translations';
import { fetchApiData } from '@/lib/utils';
import type { OracleConfig, OracleInstance, DisputeStatus } from '@/lib/types/oracleTypes';

type ViewMode = 'grid' | 'list';

export default function MyDisputesPage() {
  const { address } = useWallet();
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams?.toString() ?? '';
  const instanceIdFromUrl = searchParams?.get('instanceId')?.trim() || '';
  const queryFromUrl = searchParams?.get('q')?.trim() || '';
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
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
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<DisputeStatus | 'All'>(() => {
    try {
      if (typeof window === 'undefined') return 'All';
      const saved = window.localStorage.getItem('oracleFilters');
      if (!saved) return 'All';
      const parsed = JSON.parse(saved) as { disputeStatus?: unknown } | null;
      const status = parsed && typeof parsed === 'object' ? parsed.disputeStatus : null;
      if (
        status === 'Voting' ||
        status === 'Pending Execution' ||
        status === 'Executed' ||
        status === 'All'
      )
        return status;
    } catch {
      return 'All';
    }
    return 'All';
  });
  const [filterChain, setFilterChain] = useState<OracleConfig['chain'] | 'All'>(() => {
    try {
      if (typeof window === 'undefined') return 'All';
      const saved = window.localStorage.getItem('oracleFilters');
      if (!saved) return 'All';
      const parsed = JSON.parse(saved) as { chain?: unknown } | null;
      const chain = parsed && typeof parsed === 'object' ? parsed.chain : null;
      if (
        chain === 'Polygon' ||
        chain === 'PolygonAmoy' ||
        chain === 'Arbitrum' ||
        chain === 'Optimism' ||
        chain === 'Local' ||
        chain === 'All'
      )
        return chain;
    } catch {
      return 'All';
    }
    return 'All';
  });
  const [instances, setInstances] = useState<OracleInstance[] | null>(null);
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
    if (queryFromUrl === query) return;
    setQuery(queryFromUrl);
    setDebouncedQuery(queryFromUrl);
  }, [queryFromUrl, query]);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => {
    const normalized = instanceId.trim();
    const normalizedQuery = debouncedQuery.trim();
    const params = new URLSearchParams(currentSearch);
    if (normalized) params.set('instanceId', normalized);
    else params.delete('instanceId');
    if (normalizedQuery) params.set('q', normalizedQuery);
    else params.delete('q');
    const nextSearch = params.toString();
    const nextUrl = nextSearch ? `${pathname}?${nextSearch}` : pathname;
    const currentUrl = currentSearch ? `${pathname}?${currentSearch}` : pathname;
    if (nextUrl !== currentUrl) router.replace(nextUrl as Route, { scroll: false });
  }, [instanceId, pathname, router, currentSearch, debouncedQuery]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('oracleFilters');
      const parsed = raw && raw.trim() ? (JSON.parse(raw) as Record<string, unknown> | null) : null;
      const next = {
        ...(parsed && typeof parsed === 'object' ? parsed : {}),
        instanceId,
        chain: filterChain,
        viewMode,
        disputeStatus: filterStatus,
      };
      window.localStorage.setItem('oracleFilters', JSON.stringify(next));
    } catch {
      void 0;
    }
  }, [instanceId, filterChain, viewMode, filterStatus]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    fetchApiData<{ instances: OracleInstance[] }>('/api/oracle/instances', {
      signal: controller.signal,
    })
      .then((r) => {
        if (!cancelled) setInstances(r.instances);
      })
      .catch(() => {
        if (!cancelled) setInstances(null);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const { items, loading, loadingMore, hasMore, loadMore, error } = useDisputes(
    filterStatus,
    filterChain,
    debouncedQuery,
    address,
    instanceId,
  );
  const { stats, loading: statsLoading } = useUserStats(address, instanceId);

  if (!address) return <NoWalletState t={t} />;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 pb-20 duration-700">
      <PageHeader title={t('nav.myDisputes')} description={t('oracle.myDisputes.description')}>
        <ConnectWallet />
      </PageHeader>

      <div className="animate-in fade-in slide-in-from-bottom-8 delay-100 duration-700">
        <UserStatsCard stats={stats} loading={statsLoading} />
      </div>

      <MyDisputesToolbar
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        viewMode={viewMode}
        setViewMode={setViewMode}
        instances={instances}
        instanceId={instanceId}
        setInstanceId={setInstanceId}
        filterChain={filterChain}
        setFilterChain={setFilterChain}
        query={query}
        setQuery={setQuery}
        t={t}
      />

      <div className="animate-in fade-in slide-in-from-bottom-4 delay-300 duration-700">
        {error ? (
          <div className="mb-4 rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-sm text-rose-700 shadow-sm">
            {getUiErrorMessage(error, t)}
          </div>
        ) : null}
        {!loading && !error && items.length === 0 ? (
          <DisputesEmptyState instanceId={instanceId} t={t} />
        ) : (
          <DisputeList
            items={items}
            loading={loading}
            viewMode={viewMode}
            hasMore={hasMore}
            loadMore={loadMore}
            loadingMore={loadingMore}
            instanceId={instanceId}
          />
        )}
      </div>
    </div>
  );
}
