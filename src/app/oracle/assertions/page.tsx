'use client';

import { useState, useEffect } from 'react';

import { LayoutGrid, List as ListIcon, Filter, Search } from 'lucide-react';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { PageSkeleton } from '@/components/ui';
import { AssertionList } from '@/features/assertion/components/AssertionList';
import { useOracleData, useOracleFilters } from '@/hooks';
import { useI18n } from '@/i18n/LanguageProvider';
import { getUiErrorMessage } from '@/i18n/translations';
import { cn } from '@/shared/utils';

export default function AssertionsPage() {
  const { t } = useI18n();
  const { instanceId } = useOracleFilters();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Disputed' | 'Resolved'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    items: assertions,
    loading: assertionsLoading,
    loadingMore: assertionsLoadingMore,
    error: assertionsError,
    hasMore: assertionsHasMore,
    loadMore: loadMoreAssertions,
  } = useOracleData(filterStatus, 'All', searchQuery, null, instanceId);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('oracleFilters');
      const parsed = raw && raw.trim() ? (JSON.parse(raw) as Record<string, unknown> | null) : null;
      const value = parsed && typeof parsed === 'object' ? parsed.viewMode : null;
      if (value === 'grid' || value === 'list') {
        setViewMode(value);
      }
    } catch {
      void 0;
    }
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('oracleFilters');
      const parsed = raw && raw.trim() ? (JSON.parse(raw) as Record<string, unknown> | null) : null;
      const next = {
        ...(parsed && typeof parsed === 'object' ? parsed : {}),
        viewMode,
      };
      window.localStorage.setItem('oracleFilters', JSON.stringify(next));
    } catch {
      void 0;
    }
  }, [viewMode]);

  return (
    <ErrorBoundary>
      <div className="container mx-auto max-w-7xl space-y-8 px-4 py-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900">
              {t('oracle.assertions.title')}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {t('oracle.assertions.description')}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as 'All' | 'Pending' | 'Disputed' | 'Resolved')
              }
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="All">{t('oracle.filters.allStatus')}</option>
              <option value="Pending">{t('oracle.filters.pending')}</option>
              <option value="Disputed">{t('oracle.filters.disputed')}</option>
              <option value="Resolved">{t('oracle.filters.resolved')}</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('oracle.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

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
        </div>

        <div className="min-h-[400px]">
          {assertionsError ? (
            <div className="mb-4 rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-sm text-rose-700 shadow-sm">
              {getUiErrorMessage(assertionsError, t)}
            </div>
          ) : null}

          {assertionsLoading && assertions.length === 0 ? (
            <PageSkeleton />
          ) : (
            <AssertionList
              items={assertions}
              loading={assertionsLoading}
              viewMode={viewMode}
              hasMore={assertionsHasMore}
              loadMore={loadMoreAssertions}
              loadingMore={assertionsLoadingMore}
              instanceId={instanceId}
            />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
