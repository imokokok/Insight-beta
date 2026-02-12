'use client';

import { useEffect, useState, Suspense, lazy } from 'react';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { LayoutGrid, List, Search, Wallet, FileText, ChevronDown } from 'lucide-react';

import { PageHeader } from '@/components/common/PageHeader';
import { CardSkeleton } from '@/components/ui/skeleton';
import { useWallet } from '@/contexts/WalletContext';
import { useOracleData, useUserStats } from '@/hooks';
import { usePageOptimizations } from '@/hooks/usePageOptimizations';
import { useI18n } from '@/i18n/LanguageProvider';
import { getUiErrorMessage, type TranslationKey } from '@/i18n/translations';
import type { OracleConfig, OracleStatus, OracleInstance } from '@/lib/types/oracleTypes';
import { cn, fetchApiData } from '@/lib/utils';
import {
  StaggerContainer,
  StaggerItem,
  FadeIn,
} from '@/components/common/AnimatedContainer';
import {
  Container,
  Stack,
  Row,
} from '@/components/common/Layout';
import {
  ResponsiveGrid,
  ResponsivePadding,
  MobileOnly,
  DesktopOnly,
} from '@/components/common/Responsive';

import type { Route } from 'next';

// Dynamic imports for heavy components
const ConnectWallet = lazy(() =>
  import('@/components/features/wallet/ConnectWallet').then((mod) => ({
    default: mod.ConnectWallet,
  })),
);

const AssertionList = lazy(() =>
  import('@/components/features/assertion/AssertionList').then((mod) => ({
    default: mod.AssertionList,
  })),
);

const UserStatsCard = lazy(() =>
  import('@/components/features/wallet/UserStatsCard').then((mod) => ({
    default: mod.UserStatsCard,
  })),
);

type Translate = (key: TranslationKey) => string;
type ViewMode = 'grid' | 'list';

type NoWalletStateProps = {
  t: Translate;
};

function NoWalletState({ t }: NoWalletStateProps) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 pb-20 duration-700">
      <PageHeader title={t('nav.myAssertions')} description={t('oracle.myAssertions.description')}>
        <Suspense fallback={<div className="h-9 w-32 animate-pulse rounded-lg bg-gray-200" />}>
          <ConnectWallet />
        </Suspense>
      </PageHeader>

      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-6 rounded-full bg-purple-50 p-6 text-purple-600">
          <Wallet size={48} />
        </div>
        <h2 className="mb-2 text-xl font-bold text-gray-900">
          {t('oracle.myAssertions.connectWalletTitle')}
        </h2>
        <p className="mx-auto mb-8 max-w-md text-gray-500">
          {t('oracle.myAssertions.connectWalletDesc')}
        </p>
        <Suspense fallback={<div className="h-10 w-32 animate-pulse rounded-lg bg-gray-200" />}>
          <ConnectWallet />
        </Suspense>
      </div>
    </div>
  );
}

type StatusFiltersProps = {
  filterStatus: OracleStatus | 'All';
  setFilterStatus: (status: OracleStatus | 'All') => void;
  t: Translate;
};

function StatusFilters({ filterStatus, setFilterStatus, t }: StatusFiltersProps) {
  return (
    <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto p-1 sm:p-0">
      {['All', 'Pending', 'Disputed', 'Resolved'].map((status) => (
        <button
          key={status}
          onClick={() => setFilterStatus(status as OracleStatus | 'All')}
          className={cn(
            'flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition-all',
            filterStatus === status
              ? 'scale-105 bg-white shadow-md shadow-purple-500/10 ring-1 ring-black/5'
              : 'text-gray-500 hover:bg-white/40 hover:text-gray-900',
            filterStatus === status && status === 'Pending' && 'text-blue-600 ring-blue-100',
            filterStatus === status && status === 'Disputed' && 'text-rose-600 ring-rose-100',
            filterStatus === status && status === 'Resolved' && 'text-emerald-600 ring-emerald-100',
            filterStatus === status && status === 'All' && 'text-purple-700 ring-purple-100',
          )}
        >
          {status === 'Pending' && (
            <div
              className={cn(
                'h-2 w-2 rounded-full bg-blue-500',
                filterStatus !== status && 'opacity-50',
              )}
            />
          )}
          {status === 'Disputed' && (
            <div
              className={cn(
                'h-2 w-2 rounded-full bg-rose-500',
                filterStatus !== status && 'opacity-50',
              )}
            />
          )}
          {status === 'Resolved' && (
            <div
              className={cn(
                'h-2 w-2 rounded-full bg-emerald-500',
                filterStatus !== status && 'opacity-50',
              )}
            />
          )}
          {status === 'All' && (
            <div
              className={cn(
                'h-2 w-2 rounded-full bg-purple-500',
                filterStatus !== status && 'opacity-50',
              )}
            />
          )}
          {status === 'Pending' && t('common.pending')}
          {status === 'Disputed' && t('common.disputed')}
          {status === 'Resolved' && t('common.resolved')}
          {status === 'All' && t('common.all')}
        </button>
      ))}
    </div>
  );
}

type ViewModeToggleProps = {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  t: Translate;
};

function ViewModeToggle({ viewMode, setViewMode, t }: ViewModeToggleProps) {
  return (
    <div className="flex rounded-xl bg-gray-100/50 p-1">
      <button
        onClick={() => setViewMode('grid')}
        className={cn(
          'rounded-md p-1.5 transition-all',
          viewMode === 'grid'
            ? 'bg-white text-purple-600 shadow'
            : 'text-gray-400 hover:text-gray-600',
        )}
        title={t('oracle.card.gridView')}
      >
        <LayoutGrid size={16} />
      </button>
      <button
        onClick={() => setViewMode('list')}
        className={cn(
          'rounded-md p-1.5 transition-all',
          viewMode === 'list'
            ? 'bg-white text-purple-600 shadow'
            : 'text-gray-400 hover:text-gray-600',
        )}
        title={t('oracle.card.listView')}
      >
        <List size={16} />
      </button>
    </div>
  );
}

type InstanceSelectorProps = {
  instances: OracleInstance[];
  instanceId: string;
  setInstanceId: (value: string) => void;
  isMobile: boolean;
};

function InstanceSelector({
  instances,
  instanceId,
  setInstanceId,
  isMobile,
}: InstanceSelectorProps) {
  const className = isMobile
    ? 'glass-input h-9 w-full rounded-xl border-none pl-3 pr-8 text-sm font-medium text-gray-600 hover:bg-white/80 focus:ring-2 focus:ring-purple-500/20 cursor-pointer appearance-none'
    : 'glass-input h-9 rounded-xl border-none pl-3 pr-8 text-sm font-medium text-gray-600 hover:bg-white/80 focus:ring-2 focus:ring-purple-500/20 cursor-pointer appearance-none';
  return (
    <div className={cn('relative', isMobile ? 'w-full md:hidden' : 'hidden md:block')}>
      <select
        value={instanceId}
        onChange={(e) => setInstanceId(e.target.value)}
        className={className}
      >
        {instances.map((inst) => (
          <option key={inst.id} value={inst.id}>
            {inst.name}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
        size={14}
      />
    </div>
  );
}

type ChainSelectorProps = {
  filterChain: OracleConfig['chain'] | 'All';
  setFilterChain: (value: OracleConfig['chain'] | 'All') => void;
  t: Translate;
  isMobile: boolean;
};

function ChainSelector({ filterChain, setFilterChain, t, isMobile }: ChainSelectorProps) {
  const className = isMobile
    ? 'glass-input h-9 w-full rounded-xl border-none pl-3 pr-8 text-sm font-medium text-gray-600 hover:bg-white/80 focus:ring-2 focus:ring-purple-500/20 cursor-pointer appearance-none'
    : 'glass-input h-9 rounded-xl border-none pl-3 pr-8 text-sm font-medium text-gray-600 hover:bg-white/80 focus:ring-2 focus:ring-purple-500/20 cursor-pointer appearance-none';
  return (
    <div className={cn('relative', isMobile ? 'w-full md:hidden' : 'hidden md:block')}>
      <select
        value={filterChain}
        onChange={(e) => setFilterChain(e.target.value as OracleConfig['chain'] | 'All')}
        className={className}
      >
        <option value="All">{t('common.all')}</option>
        <option value="Local">{t('chain.local')}</option>
        <option value="Polygon">{t('chain.polygon')}</option>
        <option value="PolygonAmoy">{t('chain.polygon')} (Amoy)</option>
        <option value="Arbitrum">{t('chain.arbitrum')}</option>
        <option value="Optimism">{t('chain.optimism')}</option>
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
        size={14}
      />
    </div>
  );
}

type SearchInputProps = {
  query: string;
  setQuery: (value: string) => void;
  t: Translate;
};

function SearchInput({ query, setQuery, t }: SearchInputProps) {
  return (
    <div className="relative w-full md:flex-1">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        placeholder={t('oracle.myAssertions.searchPlaceholder')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="glass-input h-9 w-full rounded-xl pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500/20 md:w-64"
      />
    </div>
  );
}

type ClearFiltersButtonProps = {
  hasFilters: boolean;
  onClear: () => void;
  t: Translate;
};

function ClearFiltersButton({ hasFilters, onClear, t }: ClearFiltersButtonProps) {
  if (!hasFilters) return null;
  return (
    <button
      type="button"
      onClick={onClear}
      className="h-9 rounded-xl bg-white px-3 text-sm font-semibold text-purple-700 shadow-sm ring-1 ring-purple-100 hover:bg-purple-50"
    >
      {t('audit.clear')}
    </button>
  );
}

type MyAssertionsToolbarProps = {
  filterStatus: OracleStatus | 'All';
  setFilterStatus: (status: OracleStatus | 'All') => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  instances: OracleInstance[] | null;
  instanceId: string;
  setInstanceId: (value: string) => void;
  filterChain: OracleConfig['chain'] | 'All';
  setFilterChain: (value: OracleConfig['chain'] | 'All') => void;
  query: string;
  setQuery: (value: string) => void;
  t: Translate;
};

function MyAssertionsToolbar({
  filterStatus,
  setFilterStatus,
  viewMode,
  setViewMode,
  instances,
  instanceId,
  setInstanceId,
  filterChain,
  setFilterChain,
  query,
  setQuery,
  t,
}: MyAssertionsToolbarProps) {
  const hasFilters = filterStatus !== 'All' || filterChain !== 'All' || !!query.trim();
  return (
    <div className="glass-panel animate-in fade-in slide-in-from-bottom-4 sticky top-4 z-20 flex flex-col gap-4 rounded-2xl border-white/60 p-3 shadow-xl shadow-purple-900/5 backdrop-blur-xl delay-200 duration-700 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <StatusFilters filterStatus={filterStatus} setFilterStatus={setFilterStatus} t={t} />
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} t={t} />

          {instances && instances.length > 0 ? (
            <InstanceSelector
              instances={instances}
              instanceId={instanceId}
              setInstanceId={setInstanceId}
              isMobile
            />
          ) : null}

          <ChainSelector filterChain={filterChain} setFilterChain={setFilterChain} t={t} isMobile />

          {instances && instances.length > 0 ? (
            <>
              <InstanceSelector
                instances={instances}
                instanceId={instanceId}
                setInstanceId={setInstanceId}
                isMobile={false}
              />
              <div className="hidden h-4 w-px bg-gray-200 md:block"></div>
            </>
          ) : null}

          <ChainSelector
            filterChain={filterChain}
            setFilterChain={setFilterChain}
            t={t}
            isMobile={false}
          />

          <SearchInput query={query} setQuery={setQuery} t={t} />

          <ClearFiltersButton
            hasFilters={hasFilters}
            onClear={() => {
              setFilterStatus('All');
              setFilterChain('All');
              setQuery('');
              if (typeof window !== 'undefined') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            t={t}
          />
        </div>
      </div>
    </div>
  );
}

type AssertionsEmptyStateProps = {
  instanceId: string;
  t: Translate;
};

function AssertionsEmptyState({ instanceId, t }: AssertionsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-6 rounded-full bg-purple-50 p-6 text-purple-600">
        <FileText size={48} />
      </div>
      <h2 className="mb-2 text-xl font-bold text-gray-900">
        {t('oracle.myAssertions.noAssertions')}
      </h2>
      <p className="mx-auto max-w-md text-gray-500">{t('oracle.myAssertions.createFirst')}</p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href={instanceId ? `/oracle?instanceId=${encodeURIComponent(instanceId)}` : '/oracle'}
          className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-purple-500/20 transition-all hover:from-purple-700 hover:to-indigo-700 hover:shadow-xl hover:shadow-purple-500/30"
        >
          {t('oracle.newAssertion')}
        </Link>
        <Link
          href={instanceId ? `/disputes?instanceId=${encodeURIComponent(instanceId)}` : '/disputes'}
          className="rounded-xl border border-purple-200 bg-white px-6 py-3 font-medium text-purple-700 transition-colors hover:bg-purple-50"
        >
          {t('nav.disputes')}
        </Link>
      </div>
    </div>
  );
}

export default function MyAssertionsPage() {
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
  const [filterStatus, setFilterStatus] = useState<OracleStatus | 'All'>(() => {
    try {
      if (typeof window === 'undefined') return 'All';
      const saved = window.localStorage.getItem('oracleFilters');
      if (!saved) return 'All';
      const parsed = JSON.parse(saved) as { status?: unknown } | null;
      const status = parsed && typeof parsed === 'object' ? parsed.status : null;
      if (
        status === 'Pending' ||
        status === 'Disputed' ||
        status === 'Resolved' ||
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
        status: filterStatus,
        chain: filterChain,
        viewMode,
      };
      window.localStorage.setItem('oracleFilters', JSON.stringify(next));
    } catch {
      void 0;
    }
  }, [instanceId, filterStatus, filterChain, viewMode]);

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

  const { items, loading, loadingMore, hasMore, loadMore, error, mutate } = useOracleData(
    filterStatus,
    filterChain,
    debouncedQuery,
    address,
    instanceId,
  );
  const { stats, loading: statsLoading, mutate: mutateStats } = useUserStats(address, instanceId);

  // 页面优化：键盘快捷键
  usePageOptimizations({
    pageName: '我的断言',
    onRefresh: async () => {
      await mutate();
      await mutateStats();
    },
    enableSearch: true,
    searchSelector: 'input[type="text"][placeholder*="搜索"]',
    showRefreshToast: true,
  });

  if (!address) return <NoWalletState t={t} />;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 pb-20 duration-700">
      <PageHeader title={t('nav.myAssertions')} description={t('oracle.myAssertions.description')}>
        <Suspense fallback={<div className="h-9 w-32 animate-pulse rounded-lg bg-gray-200" />}>
          <ConnectWallet />
        </Suspense>
      </PageHeader>

      <div className="animate-in fade-in slide-in-from-bottom-8 delay-100 duration-700">
        <Suspense fallback={<CardSkeleton className="h-32" />}>
          <UserStatsCard stats={stats} loading={statsLoading} />
        </Suspense>
      </div>

      <MyAssertionsToolbar
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
          <AssertionsEmptyState instanceId={instanceId} t={t} />
        ) : (
          <Suspense fallback={<CardSkeleton className="h-96" />}>
            <AssertionList
              items={items}
              loading={loading}
              viewMode={viewMode}
              hasMore={hasMore}
              loadMore={loadMore}
              loadingMore={loadingMore}
              instanceId={instanceId}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
