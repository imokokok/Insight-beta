'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/features/common/PageHeader';
import { cn, fetchApiData, formatTime } from '@/lib/utils';
import { useI18n } from '@/i18n/LanguageProvider';
import { logger } from '@/lib/logger';

interface UMAAssertion {
  id: string;
  chain: string;
  identifier: string;
  proposer: string;
  status: 'Proposed' | 'Disputed' | 'Settled';
  bond: string;
  proposedAt: string;
  settledAt: string | null;
  version: 'v2' | 'v3';
}

interface AssertionsResponse {
  assertions: UMAAssertion[];
  total: number;
  page: number;
  pageSize: number;
}

export default function UMAAssertionsPage() {
  const { t, lang } = useI18n();
  const [assertions, setAssertions] = useState<UMAAssertion[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [versionFilter, setVersionFilter] = useState<string>('all');

  useEffect(() => {
    fetchAssertions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, versionFilter]);

  async function fetchAssertions() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (versionFilter !== 'all') {
        params.append('version', versionFilter);
      }

      const data = await fetchApiData<AssertionsResponse>(`/api/oracle/uma/assertions?${params}`);
      setAssertions(data.assertions);
      setTotal(data.total);
    } catch (error) {
      logger.error('Failed to fetch assertions', { error });
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <div className="container mx-auto px-4 py-8">
        <Link
          href="/oracle/optimistic"
          className="mb-6 inline-flex items-center gap-2 text-gray-400 hover:text-white"
        >
          ← {t('oracle.detail.back')}
        </Link>

        <PageHeader
          title={t('uma.assertionsPage.title')}
          description={`${t('uma.disputesPage.description').replace('{{total}}', total.toLocaleString())}`}
        />

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm"
          >
            <option value="all">{t('uma.assertionsPage.allStatus')}</option>
            <option value="Proposed">{t('uma.assertionsPage.proposed')}</option>
            <option value="Disputed">{t('disputes.title')}</option>
            <option value="Settled">{t('uma.assertionsPage.settled')}</option>
          </select>

          <select
            value={versionFilter}
            onChange={(e) => {
              setVersionFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm"
          >
            <option value="all">{t('uma.assertionsPage.allVersions')}</option>
            <option value="v2">OOv2</option>
            <option value="v3">OOv3</option>
          </select>

          <button
            onClick={fetchAssertions}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm transition-colors hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            {t('common.refresh')}
          </button>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl bg-white/5">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-left text-sm text-gray-400">
                <th className="px-6 py-4 font-medium">{t('uma.assertionsPage.id')}</th>
                <th className="px-6 py-4 font-medium">{t('uma.assertionsPage.identifier')}</th>
                <th className="px-6 py-4 font-medium">{t('uma.assertionsPage.version')}</th>
                <th className="px-6 py-4 font-medium">{t('uma.assertionsPage.proposer')}</th>
                <th className="px-6 py-4 font-medium">{t('oracle.card.bond')}</th>
                <th className="px-6 py-4 font-medium">{t('uma.disputesPage.status')}</th>
                <th className="px-6 py-4 font-medium">{t('uma.assertionsPage.proposedAt')}</th>
                <th className="px-6 py-4 font-medium">{t('uma.disputesPage.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(10)
                  .fill(0)
                  .map((_, i) => (
                    <tr key={i} className="animate-pulse border-b border-white/5">
                      <td className="px-6 py-4">
                        <div className="h-4 w-24 rounded bg-white/10" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-32 rounded bg-white/10" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-8 rounded bg-white/10" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-32 rounded bg-white/10" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-16 rounded bg-white/10" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-6 w-16 rounded-full bg-white/10" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-24 rounded bg-white/10" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-8 w-8 rounded bg-white/10" />
                      </td>
                    </tr>
                  ))
              ) : assertions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    {t('common.noData')}
                  </td>
                </tr>
              ) : (
                assertions.map((assertion) => (
                  <tr
                    key={assertion.id}
                    className="border-b border-white/5 transition-colors hover:bg-white/5"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm">
                        {assertion.id.slice(0, 8)}...{assertion.id.slice(-6)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm">{assertion.identifier}</td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'rounded px-2 py-1 text-xs',
                          assertion.version === 'v3'
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-blue-500/20 text-blue-400',
                        )}
                      >
                        {assertion.version.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm">
                        {assertion.proposer.slice(0, 6)}...{assertion.proposer.slice(-4)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {Number(assertion.bond).toLocaleString()} UMA
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'rounded-full px-2 py-1 text-xs font-medium',
                          assertion.status === 'Proposed' && 'bg-yellow-500/20 text-yellow-400',
                          assertion.status === 'Disputed' && 'bg-orange-500/20 text-orange-400',
                          assertion.status === 'Settled' && 'bg-green-500/20 text-green-400',
                        )}
                      >
                        {assertion.status === 'Proposed' && t('uma.assertionsPage.proposed')}
                        {assertion.status === 'Disputed' && t('disputes.title')}
                        {assertion.status === 'Settled' && t('uma.assertionsPage.settled')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {formatTime(assertion.proposedAt, lang)}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/oracle/optimistic/assertions/${assertion.id}` as Route}
                        className="inline-flex rounded-lg p-2 transition-colors hover:bg-white/10"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && assertions.length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {t('common.page')} {page} {t('common.of')} {totalPages} ({total.toLocaleString()}{' '}
              {t('common.total')})
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg bg-white/5 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
              >
                {t('common.previous')}
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg bg-white/5 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
              >
                {t('common.next')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
