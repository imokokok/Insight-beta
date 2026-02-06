'use client';

/* eslint-disable no-restricted-syntax */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/features/common/PageHeader';
import { cn, fetchApiData, formatTime } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { useI18n } from '@/i18n/LanguageProvider';

interface UMADispute {
  id: string;
  chain: string;
  assertionId: string;
  disputer: string;
  status: 'Voting' | 'Resolved';
  disputeBond: string;
  createdAt: string;
  resolvedAt: string | null;
  votesFor: string;
  votesAgainst: string;
  totalVoters: number;
}

interface DisputesResponse {
  disputes: UMADispute[];
  total: number;
  page: number;
  pageSize: number;
}

export default function UMADisputesPage() {
  const { t, lang } = useI18n();
  const [disputes, setDisputes] = useState<UMADispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchDisputes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  async function fetchDisputes() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const data = await fetchApiData<DisputesResponse>(`/api/oracle/uma/disputes?${params}`);
      setDisputes(data.disputes);
      setTotal(data.total);
    } catch (error) {
      logger.error('Failed to fetch disputes', { error });
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
          title={t('uma.disputesPage.title')}
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
            <option value="all">{t('uma.disputesPage.allStatus')}</option>
            <option value="Voting">{t('uma.disputesPage.voting')}</option>
            <option value="Resolved">{t('uma.disputesPage.resolved')}</option>
          </select>

          <button
            onClick={fetchDisputes}
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
                <th className="px-6 py-4 font-medium">{t('uma.disputesPage.id')}</th>
                <th className="px-6 py-4 font-medium">{t('uma.disputesPage.assertion')}</th>
                <th className="px-6 py-4 font-medium">{t('uma.disputesPage.disputer')}</th>
                <th className="px-6 py-4 font-medium">{t('uma.disputesPage.bond')}</th>
                <th className="px-6 py-4 font-medium">{t('disputes.card.votes')}</th>
                <th className="px-6 py-4 font-medium">{t('uma.disputesPage.status')}</th>
                <th className="px-6 py-4 font-medium">{t('uma.disputesPage.created')}</th>
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
                        <div className="h-4 w-32 rounded bg-white/10" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-16 rounded bg-white/10" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-24 rounded bg-white/10" />
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
              ) : disputes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    {t('common.noData')}
                  </td>
                </tr>
              ) : (
                disputes.map((dispute) => (
                  <tr
                    key={dispute.id}
                    className="border-b border-white/5 transition-colors hover:bg-white/5"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm">
                        {dispute.id.slice(0, 8)}...{dispute.id.slice(-6)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm">
                        {dispute.assertionId.slice(0, 8)}...
                        {dispute.assertionId.slice(-6)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm">
                        {dispute.disputer.slice(0, 6)}...{dispute.disputer.slice(-4)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {Number(dispute.disputeBond).toLocaleString()} UMA
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-green-400">{Number(dispute.votesFor)}</span>
                        <span className="text-gray-500">/</span>
                        <span className="text-orange-400">{Number(dispute.votesAgainst)}</span>
                        <span className="text-xs text-gray-500">
                          ({dispute.totalVoters} {t('disputes.totalVotesCast')})
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'rounded-full px-2 py-1 text-xs font-medium',
                          dispute.status === 'Voting'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-green-500/20 text-green-400',
                        )}
                      >
                        {dispute.status === 'Voting'
                          ? t('uma.disputesPage.voting')
                          : t('uma.disputesPage.resolved')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {formatTime(dispute.createdAt, lang)}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/oracle/optimistic/disputes/${dispute.id}` as Route}
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
        {!loading && disputes.length > 0 && (
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
