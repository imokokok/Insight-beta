import { LayoutGrid, List, Search, ChevronDown } from 'lucide-react';

import type { TranslationKey } from '@/i18n/translations';
import { cn } from '@/shared/utils';
import type { OracleConfig, OracleInstance, DisputeStatus } from '@/types/oracleTypes';

type Translate = (key: TranslationKey) => string;
type ViewMode = 'grid' | 'list';

type StatusFiltersProps = {
  filterStatus: DisputeStatus | 'All';
  setFilterStatus: (status: DisputeStatus | 'All') => void;
  t: Translate;
};

function StatusFilters({ filterStatus, setFilterStatus, t }: StatusFiltersProps) {
  return (
    <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto p-1 sm:p-0">
      {(['All', 'Voting', 'Pending Execution', 'Executed'] as const).map((status) => (
        <button
          key={status}
          onClick={() => setFilterStatus(status as DisputeStatus | 'All')}
          className={cn(
            'flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition-all',
            filterStatus === status
              ? 'scale-105 bg-white shadow-md shadow-primary-500/10 ring-1 ring-black/5'
              : 'text-gray-500 hover:bg-white/40 hover:text-gray-900',
            filterStatus === status && status === 'Voting' && 'text-blue-600 ring-blue-100',
            filterStatus === status &&
              status === 'Pending Execution' &&
              'text-amber-600 ring-amber-100',
            filterStatus === status && status === 'Executed' && 'text-emerald-600 ring-emerald-100',
            filterStatus === status && status === 'All' && 'text-primary-dark ring-primary100',
          )}
        >
          {status === 'Voting' && (
            <div
              className={cn(
                'h-2 w-2 rounded-full bg-blue-500',
                filterStatus !== status && 'opacity-50',
              )}
            />
          )}
          {status === 'Pending Execution' && (
            <div
              className={cn(
                'h-2 w-2 rounded-full bg-amber-500',
                filterStatus !== status && 'opacity-50',
              )}
            />
          )}
          {status === 'Executed' && (
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
                'h-2 w-2 rounded-full bg-primary/50',
                filterStatus !== status && 'opacity-50',
              )}
            />
          )}
          {status === 'All' && t('common.all')}
          {status === 'Voting' && t('status.voting')}
          {status === 'Pending Execution' && t('status.pendingExecution')}
          {status === 'Executed' && t('status.executed')}
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
            ? 'bg-white text-primary shadow'
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
            ? 'bg-white text-primary shadow'
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
    ? 'glass-input h-9 w-full rounded-xl border-none pl-3 pr-8 text-sm font-medium text-gray-600 hover:bg-white/80 focus:ring-2 focus:ring-primary500/20 cursor-pointer appearance-none'
    : 'glass-input h-9 rounded-xl border-none pl-3 pr-8 text-sm font-medium text-gray-600 hover:bg-white/80 focus:ring-2 focus:ring-primary500/20 cursor-pointer appearance-none';
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
    ? 'glass-input h-9 w-full rounded-xl border-none pl-3 pr-8 text-sm font-medium text-gray-600 hover:bg-white/80 focus:ring-2 focus:ring-primary500/20 cursor-pointer appearance-none'
    : 'glass-input h-9 rounded-xl border-none pl-3 pr-8 text-sm font-medium text-gray-600 hover:bg-white/80 focus:ring-2 focus:ring-primary500/20 cursor-pointer appearance-none';
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
        placeholder={t('oracle.myDisputes.searchPlaceholder')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="glass-input focus:ring-primary500/20 h-9 w-full rounded-xl pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 md:w-64"
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
      className="text-primary-dark ring-primary100 h-9 rounded-xl bg-white px-3 text-sm font-semibold shadow-sm ring-1 hover:bg-primary/5"
    >
      {t('audit.clear')}
    </button>
  );
}

type MyDisputesToolbarProps = {
  filterStatus: DisputeStatus | 'All';
  setFilterStatus: (status: DisputeStatus | 'All') => void;
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

export function MyDisputesToolbar({
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
}: MyDisputesToolbarProps) {
  const hasFilters = filterStatus !== 'All' || filterChain !== 'All' || !!query.trim();
  return (
    <div className="glass-panel animate-in fade-in slide-in-from-bottom-4 sticky top-4 z-20 flex flex-col gap-4 rounded-2xl border-white/60 p-3 shadow-xl shadow-primary-900/5 backdrop-blur-xl delay-200 duration-700 sm:flex-row sm:items-center sm:justify-between">
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
