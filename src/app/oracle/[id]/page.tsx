'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Route } from 'next';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import {
  ArrowLeft,
  ExternalLink,
  DollarSign,
  AlertTriangle,
  ShieldAlert,
  Clock,
  CheckCircle2,
  HelpCircle,
  Activity,
  X,
  Copy,
  Share2,
  Star,
} from 'lucide-react';
import {
  cn,
  fetchApiData,
  formatUsd,
  getErrorCode,
  getExplorerUrl,
  getAssertionStatusColor,
} from '@/lib/utils';
import { useI18n } from '@/i18n/LanguageProvider';
import { getUiErrorMessage, langToLocale } from '@/i18n/translations';
import { useToast } from '@/components/ui/toast';
import { useWatchlist } from '@/hooks/user/useWatchlist';
import { useOracleTransaction } from '@/hooks/oracle/useOracleTransaction';
import { useWallet } from '@/contexts/WalletContext';
import { ConnectWallet } from '@/components/features/wallet/ConnectWallet';
import type { Assertion, Dispute, OracleConfig, Alert, RiskItem } from '@/lib/types/oracleTypes';

import { AssertionTimeline } from '@/components/features/assertion/AssertionTimeline';
import { AssertionDetailSkeleton } from '@/components/features/assertion/AssertionDetailSkeleton';
import { PayoutSimulator } from '@/components/features/oracle/PayoutSimulator';
import { CountdownTimer } from '@/components/features/common/CountdownTimer';
import { AddressAvatar } from '@/components/features/wallet/AddressAvatar';
import { CopyButton } from '@/components/features/common/CopyButton';
import { InfoTooltip } from '@/components/features/common/InfoTooltip';
import { LivenessProgressBar } from '@/components/features/oracle/LivenessProgressBar';

const DisputeModal = dynamic(
  () => import('@/components/features/dispute/DisputeModal').then((mod) => mod.DisputeModal),
  { ssr: false },
);
const SettleModal = dynamic(
  () => import('@/components/features/common/SettleModal').then((mod) => mod.SettleModal),
  { ssr: false },
);

function getStatusIcon(status: string) {
  switch (status) {
    case 'Pending':
      return <Clock className="h-4 w-4" />;
    case 'Disputed':
      return <ShieldAlert className="h-4 w-4" />;
    case 'Resolved':
      return <CheckCircle2 className="h-4 w-4" />;
    default:
      return <AlertTriangle className="h-4 w-4" />;
  }
}

function withInstanceId(href: string, instanceId: string | null) {
  if (!instanceId) return href;
  const hasQuery = href.includes('?');
  return `${href}${hasQuery ? '&' : '?'}instanceId=${encodeURIComponent(instanceId)}`;
}

export default function OracleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const instanceId = searchParams?.get('instanceId')?.trim() || null;
  const { lang, t } = useI18n();
  const locale = langToLocale[lang];
  const { toast } = useToast();
  const { isWatched, toggleWatchlist, mounted } = useWatchlist();
  const { address } = useWallet();
  const {
    execute: executeTx,
    isSubmitting: isVoteSubmitting,
    isConfirming: isVoteConfirming,
    error: voteTxError,
  } = useOracleTransaction(instanceId ?? undefined);

  useEffect(() => {
    if (!instanceId) return;
    try {
      const raw = window.localStorage.getItem('oracleFilters');
      const parsed = raw && raw.trim() ? (JSON.parse(raw) as Record<string, unknown> | null) : null;
      const next = {
        ...(parsed && typeof parsed === 'object' ? parsed : {}),
        instanceId,
      };
      window.localStorage.setItem('oracleFilters', JSON.stringify(next));
    } catch {
      void 0;
    }
  }, [instanceId]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: t('common.copied'),
        message: `${label} ${t('common.copied')}`,
        type: 'success',
        duration: 2000,
      });
    } catch {
      toast({
        title: 'Failed to copy',
        type: 'error',
      });
    }
  };

  const { data, error, isLoading, mutate } = useSWR<{
    assertion: Assertion;
    dispute: Dispute | null;
    config: OracleConfig;
    bondWei: string | null;
    bondEth: string | null;
    voteTrackingEnabled: boolean;
  }>(
    id
      ? instanceId
        ? `/api/oracle/assertions/${id}?instanceId=${encodeURIComponent(instanceId)}`
        : `/api/oracle/assertions/${id}`
      : null,
    fetchApiData,
    {
      refreshInterval: 30_000, // 延长刷新间隔到30秒
      dedupingInterval: 15_000, // 延长去重间隔到15秒
      revalidateOnFocus: false, // 关闭焦点重验证
      revalidateOnReconnect: true, // 连接恢复时重新验证
      errorRetryCount: 3, // 错误重试3次
      errorRetryInterval: 1000, // 初始重试间隔
      shouldRetryOnError: true,
    },
  );

  const { data: timelineData } = useSWR<{
    assertion: Assertion;
    dispute: Dispute | null;
    alerts: Alert[];
    timeline: { type: string; at: string }[];
  }>(
    id
      ? instanceId
        ? `/api/oracle/assertions/${id}/timeline?instanceId=${encodeURIComponent(instanceId)}`
        : `/api/oracle/assertions/${id}/timeline`
      : null,
    fetchApiData,
    {
      refreshInterval: 60_000, // 延长时间线刷新间隔到60秒
      dedupingInterval: 30_000, // 延长时间线去重间隔到30秒
      revalidateOnFocus: false, // 关闭焦点重验证
      revalidateOnReconnect: true, // 连接恢复时重新验证
      errorRetryCount: 3, // 错误重试3次
      errorRetryInterval: 1000, // 初始重试间隔
      shouldRetryOnError: true,
    },
  );

  const {
    data: risksData,
    error: risksError,
    isLoading: risksLoading,
  } = useSWR<{ items: RiskItem[] }>(
    id
      ? instanceId
        ? `/api/oracle/risks?limit=20&instanceId=${encodeURIComponent(instanceId)}`
        : '/api/oracle/risks?limit=20'
      : null,
    fetchApiData,
    {
      refreshInterval: 60_000,
      dedupingInterval: 30_000,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      errorRetryCount: 2,
      errorRetryInterval: 1000,
      shouldRetryOnError: true,
    },
  );

  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [exportingEvidence, setExportingEvidence] = useState<null | 'fast' | 'logs'>(null);

  const riskItems = useMemo(() => {
    if (!risksData?.items || !data) return [];
    const assertionId = data.assertion.id;
    const disputeId = data.dispute?.id ?? null;
    const market = data.assertion.market?.trim();
    return risksData.items.filter((risk) => {
      if (risk.assertionId?.trim() === assertionId) return true;
      if (risk.entityType === 'assertion' && risk.entityId === assertionId) return true;
      if (disputeId && risk.disputeId?.trim() === disputeId) return true;
      if (market && risk.market?.trim() === market) return true;
      if (risk.entityType === 'market' && risk.market === 'global')
        return risk.chain === data.assertion.chain;
      return false;
    });
  }, [data, risksData]);

  const riskSeverityBadge = (severity: RiskItem['severity']) => {
    if (severity === 'critical') return 'border-rose-100 bg-rose-50/70 text-rose-800';
    if (severity === 'warning') return 'border-amber-100 bg-amber-50/70 text-amber-800';
    return 'border-slate-100 bg-slate-50/70 text-slate-600';
  };

  if (isLoading) {
    return <AssertionDetailSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="glass-panel mb-6 rounded-full p-6 text-rose-500 shadow-xl shadow-rose-500/10">
          <AlertTriangle className="h-12 w-12" />
        </div>
        <h3 className="text-2xl font-bold text-gray-800">{t('oracle.detail.errorTitle')}</h3>
        <p className="mt-2 max-w-md text-gray-600">
          {error ? getUiErrorMessage(getErrorCode(error), t) : t('oracle.detail.errorNotFound')}
        </p>
        <button
          onClick={() => router.back()}
          className="mt-8 flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-gray-700 shadow-lg shadow-gray-200/50 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-200/60"
        >
          <ArrowLeft size={18} />
          {t('oracle.detail.goBack')}
        </button>
      </div>
    );
  }

  const { assertion, dispute } = data;
  const voteTrackingEnabled = data.voteTrackingEnabled ?? true;
  const now = Date.now();
  const isLivenessExpired = new Date(assertion.livenessEndsAt).getTime() <= now;
  const canSettle =
    (assertion.status === 'Pending' && isLivenessExpired) ||
    dispute?.status === 'Pending Execution';

  const canVote = Boolean(dispute && dispute.status === 'Voting');
  const submitVote = async (support: boolean) => {
    await executeTx({
      functionName: 'castVote',
      args: [assertion.id as `0x${string}`, support],
      contractAddress: data.config.contractAddress,
      chain: data.config.chain,
      successTitle: t('oracle.tx.voteCastTitle'),
      successMessage: support
        ? t('oracle.tx.voteCastSupportMsg')
        : t('oracle.tx.voteCastAgainstMsg'),
      onConfirmed: () => {
        void mutate();
      },
    });
  };

  const exportEvidence = async (mode: 'fast' | 'logs') => {
    setExportingEvidence(mode);
    try {
      const qs = new URLSearchParams();
      if (mode === 'logs') qs.set('includeLogs', '1');
      if (instanceId) qs.set('instanceId', instanceId);
      const payload = await fetchApiData<unknown>(
        `/api/oracle/assertions/${assertion.id}/evidence${qs.toString() ? `?${qs.toString()}` : ''}`,
      );
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evidence_${assertion.chain}_${assertion.id}_${mode}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } finally {
      setExportingEvidence(null);
    }
  };

  return (
    <div className="animate-in fade-in space-y-8 pb-12 duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <button
          onClick={() => router.back()}
          className="group flex items-center gap-2 self-start rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-all hover:bg-white/50 hover:text-purple-700 hover:shadow-sm"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          {t('oracle.detail.back')}
        </button>

        <div className="glass-panel flex flex-col gap-6 rounded-3xl p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 drop-shadow-sm">
                {t('oracle.detail.title')}
              </h1>
              <div
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold shadow-sm',
                  getAssertionStatusColor(assertion.status),
                )}
              >
                {getStatusIcon(assertion.status)}
                {assertion.status}
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm font-medium text-gray-500">
              <button
                onClick={() => copyToClipboard(assertion.id, 'ID')}
                className="group flex items-center gap-2 rounded-md border border-gray-200/50 bg-white/60 px-2 py-1 font-mono shadow-sm transition-all hover:border-purple-200 hover:bg-white hover:text-purple-700"
                title="Click to copy ID"
              >
                <span>ID: {assertion.id}</span>
                <Copy size={12} className="opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
              <span className="h-1.5 w-1.5 rounded-full bg-gray-300"></span>
              <span className="flex items-center gap-1">
                <Activity size={14} className="text-purple-500" />
                {assertion.protocol}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleWatchlist(assertion.id)}
              className={cn(
                'rounded-full p-2 shadow-sm ring-1 ring-gray-200/50 transition-all',
                mounted && isWatched(assertion.id)
                  ? 'bg-amber-100 text-amber-500 hover:bg-amber-200'
                  : 'bg-white/50 text-gray-500 hover:bg-white hover:text-gray-600',
              )}
              title={
                mounted && isWatched(assertion.id)
                  ? t('common.removeFromWatchlist')
                  : t('common.addToWatchlist')
              }
            >
              <Star
                size={18}
                className={cn(
                  'transition-all',
                  mounted && isWatched(assertion.id) && 'fill-current',
                )}
              />
            </button>
            <button
              onClick={() => {
                const url = window.location.href;
                copyToClipboard(url, 'Link');
              }}
              className="rounded-full bg-white/50 p-2 text-gray-500 shadow-sm ring-1 ring-gray-200/50 transition-all hover:bg-white hover:text-purple-600"
              title="Share Page"
            >
              <Share2 size={18} />
            </button>
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-gray-500">
                {t('oracle.detail.bondAmount')}
              </span>
              <span className="text-2xl font-bold text-gray-900 drop-shadow-sm">
                {formatUsd(assertion.bondUsd, locale)}
              </span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600 shadow-inner">
              <DollarSign size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Assertion Info */}
        <div className="space-y-6 lg:col-span-2">
          <div className="glass-card relative overflow-hidden rounded-3xl p-8">
            {/* Background Decoration */}
            <div className="pointer-events-none absolute right-0 top-0 p-12 opacity-[0.03]">
              <HelpCircle size={200} />
            </div>

            <div className="mb-6 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800">
                <HelpCircle className="text-purple-500" size={24} />
                {t('oracle.detail.marketQuestion')}
                <InfoTooltip content={t('tooltips.market')} />
              </h2>
              <CopyButton text={assertion.market} label={t('oracle.detail.marketQuestion')} />
            </div>

            <div className="relative z-10 mb-8 rounded-2xl bg-gradient-to-br from-white/80 to-purple-50/50 p-6 shadow-sm ring-1 ring-purple-100/50 backdrop-blur-sm">
              <p className="text-xl font-medium leading-relaxed text-gray-800">
                {assertion.market}
              </p>
            </div>

            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500">
                  <CheckCircle2 size={16} />
                  {t('oracle.detail.assertedOutcome')}
                </h3>
                <CopyButton text={assertion.assertion} label={t('oracle.detail.assertedOutcome')} />
              </div>
              <div className="rounded-xl border border-purple-100/50 bg-purple-50/80 p-5 font-bold text-purple-900 shadow-sm">
                {assertion.assertion}
              </div>
            </div>

            {assertion.status === 'Resolved' && assertion.settlementResolution !== undefined && (
              <div className="relative z-10 mt-6 space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500">
                  <CheckCircle2 size={16} />
                  {t('oracle.detail.settlementResult')}
                </h3>
                <div
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-5 font-bold shadow-sm',
                    assertion.settlementResolution
                      ? 'border-emerald-100 bg-emerald-50 text-emerald-900'
                      : 'border-rose-100 bg-rose-50 text-rose-900',
                  )}
                >
                  {assertion.settlementResolution ? (
                    <>
                      <CheckCircle2 size={24} className="text-emerald-600" />
                      <span>{t('oracle.detail.settlementTrue')}</span>
                    </>
                  ) : (
                    <>
                      <X size={24} className="text-rose-600" />
                      <span>{t('oracle.detail.settlementFalse')}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="relative z-10 mt-8 grid gap-4 sm:grid-cols-2">
              <div className="glass-panel group relative rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:bg-white/80 hover:shadow-md">
                <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-gray-500">
                  {t('oracle.detail.asserter')}
                  <CopyButton
                    text={assertion.asserter}
                    label={t('oracle.detail.asserter')}
                    className="opacity-0 group-hover:opacity-100"
                  />
                </div>
                <Link
                  href={
                    instanceId
                      ? `/oracle/address/${assertion.asserter}?instanceId=${encodeURIComponent(instanceId)}`
                      : `/oracle/address/${assertion.asserter}`
                  }
                  className="flex items-center gap-2"
                >
                  <AddressAvatar address={assertion.asserter} size={20} />
                  <span className="font-mono text-sm font-bold text-gray-700 transition-colors group-hover:text-purple-700">
                    {assertion.asserter.slice(0, 6)}...
                    {assertion.asserter.slice(-4)}
                  </span>
                  <ExternalLink
                    size={14}
                    className="ml-auto text-gray-400 transition-colors group-hover:text-purple-500"
                  />
                </Link>
              </div>
              <a
                href={getExplorerUrl(assertion.chain, assertion.txHash) || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-panel group relative rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:bg-white/80 hover:shadow-md hover:ring-2 hover:ring-purple-200"
              >
                <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-gray-500">
                  {t('oracle.detail.transaction')}
                  <CopyButton
                    text={assertion.txHash}
                    label="Tx Hash"
                    className="opacity-0 group-hover:opacity-100"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-gray-700 transition-colors group-hover:text-purple-700">
                    {assertion.txHash.slice(0, 6)}...
                    {assertion.txHash.slice(-4)}
                  </span>
                  <ExternalLink
                    size={14}
                    className="text-gray-400 transition-colors group-hover:text-purple-500"
                  />
                </div>
              </a>

              {/* Assertion Time */}
              <div className="glass-panel group rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:bg-white/80 hover:shadow-md hover:ring-2 hover:ring-purple-200">
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                  {t('oracle.timeline.asserted')}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CountdownTimer
                    targetDate={assertion.assertedAt}
                    label={t('oracle.timeline.active')}
                    className="font-semibold"
                  />
                  <span className="text-gray-400">·</span>
                  <span className="text-xs text-gray-500">
                    {new Date(assertion.assertedAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Expiration */}
              <div className="glass-panel group rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:bg-white/80 hover:shadow-md hover:ring-2 hover:ring-purple-200">
                <LivenessProgressBar
                  startDate={assertion.assertedAt}
                  endDate={assertion.livenessEndsAt}
                  status={assertion.status}
                  label={t('oracle.timeline.livenessEnds')}
                  tooltip={t('tooltips.liveness')}
                />
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>{new Date(assertion.assertedAt).toLocaleDateString()}</span>
                  <span>{new Date(assertion.livenessEndsAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-8">
            <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-gray-800">
              <Activity className="text-indigo-500" size={24} />
              {t('oracle.detail.timeline')}
            </h2>
            <AssertionTimeline
              assertion={assertion}
              dispute={dispute}
              alerts={timelineData?.alerts ?? []}
            />
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="glass-card sticky top-24 rounded-3xl p-6">
            <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-gray-800">
              <ShieldAlert className="text-rose-500" size={20} />
              {t('oracle.detail.actions')}
            </h3>

            <div className="mb-6 space-y-3">
              <button
                type="button"
                onClick={() => exportEvidence('fast')}
                disabled={exportingEvidence !== null}
                className="w-full rounded-xl bg-white py-3 text-sm font-bold text-purple-700 shadow-sm ring-1 ring-purple-100 transition-colors hover:bg-purple-50 disabled:opacity-60"
              >
                {exportingEvidence === 'fast' ? '导出中…' : '导出证据包'}
              </button>
              <button
                type="button"
                onClick={() => exportEvidence('logs')}
                disabled={exportingEvidence !== null}
                className="w-full rounded-xl bg-white py-3 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-gray-100 transition-colors hover:bg-gray-50 disabled:opacity-60"
              >
                {exportingEvidence === 'logs' ? '导出中…' : '导出证据包（含链上日志）'}
              </button>
            </div>

            {canSettle && (
              <div className="space-y-4">
                <button
                  onClick={() => setIsSettleModalOpen(true)}
                  className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-600 hover:to-blue-700 hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98]"
                >
                  <div className="relative z-10 flex items-center justify-center gap-2">
                    <CheckCircle2 size={18} />
                    {t('oracle.detail.settleAssertion')}
                  </div>
                </button>
                <p className="rounded-xl border border-gray-100 bg-gray-50/50 py-3 text-center text-xs text-gray-500">
                  {t('oracle.detail.settleDesc')}
                </p>
              </div>
            )}

            {assertion.status === 'Pending' && !isLivenessExpired && (
              <div className="space-y-4">
                <button
                  onClick={() => setIsDisputeModalOpen(true)}
                  className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-500/25 transition-all hover:from-rose-600 hover:to-rose-700 hover:shadow-xl hover:shadow-rose-500/30 active:scale-[0.98]"
                >
                  <div className="relative z-10 flex items-center justify-center gap-2">
                    <ShieldAlert size={18} />
                    {t('oracle.detail.disputeAssertion')}
                  </div>
                </button>

                <p className="rounded-xl border border-gray-100 bg-gray-50/50 py-3 text-center text-xs text-gray-500">
                  {t('oracle.detail.disputeRequiresBond')}{' '}
                  <span className="font-bold text-gray-900">
                    {formatUsd(assertion.bondUsd, locale)}
                  </span>
                </p>
              </div>
            )}

            {dispute && (
              <div className="mt-6 rounded-2xl bg-rose-50/80 p-5 shadow-sm ring-1 ring-rose-100/50">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-rose-900">
                  <AlertTriangle size={20} className="text-rose-600" />
                  {t('oracle.detail.disputeActive')}
                </h2>

                <div className="space-y-4">
                  <div className="rounded-xl bg-white p-4 text-sm text-rose-900 shadow-sm ring-1 ring-rose-100/50">
                    <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-rose-500">
                      {t('oracle.detail.reason')}
                    </span>
                    <p className="leading-relaxed">{dispute.disputeReason}</p>
                  </div>

                  {voteTrackingEnabled ? (
                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-rose-700">
                          {t('oracle.detail.support')}
                        </span>
                        <span className="font-bold text-rose-900">
                          {dispute.currentVotesFor} {t('oracle.detail.votes')}
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-rose-200/30 ring-1 ring-rose-200/50">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-sm transition-all"
                          style={{
                            width: `${
                              dispute.totalVotes > 0
                                ? (dispute.currentVotesFor / dispute.totalVotes) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-rose-700">
                          {t('oracle.detail.against')}
                        </span>
                        <span className="font-bold text-rose-900">
                          {dispute.currentVotesAgainst} {t('oracle.detail.votes')}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {voteTrackingEnabled ? (
                    <div className="space-y-3 pt-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-bold text-rose-900">
                          {t('oracle.detail.voteOnDispute')}
                        </div>
                        <ConnectWallet />
                      </div>

                      {voteTxError ? (
                        <div className="rounded-xl bg-white p-3 text-sm text-rose-700 shadow-sm ring-1 ring-rose-100/50">
                          {voteTxError}
                        </div>
                      ) : null}

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => void submitVote(true)}
                          disabled={!address || !canVote || isVoteSubmitting || isVoteConfirming}
                          className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-700 hover:to-emerald-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {t('oracle.detail.support')}
                        </button>
                        <button
                          type="button"
                          onClick={() => void submitVote(false)}
                          disabled={!address || !canVote || isVoteSubmitting || isVoteConfirming}
                          className="w-full rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 py-3 text-sm font-bold text-white shadow-lg shadow-rose-500/20 transition-all hover:from-rose-700 hover:to-rose-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {t('oracle.detail.against')}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <a
                    href="https://vote.umaproject.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-purple-500/20 transition-all hover:from-purple-700 hover:to-indigo-700 hover:shadow-xl hover:shadow-purple-500/30 active:scale-[0.98]"
                  >
                    <ExternalLink size={18} />
                    {t('disputes.viewOnUma')}
                  </a>
                </div>
              </div>
            )}

            {assertion.status === 'Resolved' && (
              <div className="flex items-center gap-3 rounded-2xl bg-emerald-50/80 p-5 shadow-sm ring-1 ring-emerald-100/50">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-900">{t('oracle.detail.resolved')}</h4>
                  <p className="mt-0.5 text-xs text-emerald-700">
                    {t('oracle.detail.resolvedDesc')}
                  </p>
                </div>
              </div>
            )}

            <div className="glass-card rounded-3xl p-6">
              <div className="text-lg font-bold text-gray-800">
                {t('oracle.detail.riskImpactTitle')}
              </div>
              <div className="mt-1 text-xs text-gray-500">{t('oracle.detail.riskImpactDesc')}</div>
              {risksError ? (
                <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50/60 p-3 text-xs text-rose-700">
                  {getUiErrorMessage(getErrorCode(risksError), t)}
                </div>
              ) : null}
              {risksLoading ? (
                <div className="mt-3 text-xs text-gray-500">{t('common.loading')}</div>
              ) : riskItems.length === 0 ? (
                <div className="mt-3 text-xs text-gray-500">{t('oracle.detail.riskNone')}</div>
              ) : (
                <div className="mt-4 space-y-3">
                  {riskItems.map((risk, idx) => (
                    <div
                      key={`${risk.entityType}:${risk.entityId}:${idx}`}
                      className="rounded-2xl border border-purple-100/60 bg-white/60 p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                            riskSeverityBadge(risk.severity),
                          )}
                        >
                          {t(
                            risk.severity === 'critical'
                              ? 'oracle.alerts.severities.critical'
                              : risk.severity === 'warning'
                                ? 'oracle.alerts.severities.warning'
                                : 'oracle.alerts.severities.info',
                          )}
                        </span>
                        <span className="rounded-full border bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                          {Math.round(risk.score)}
                        </span>
                        <span className="rounded-full border bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                          {risk.chain}
                        </span>
                        <span className="truncate text-sm font-semibold text-purple-950">
                          {risk.market}
                        </span>
                      </div>
                      {risk.reasons?.length ? (
                        <div className="mt-2 space-y-1 text-xs text-purple-800/80">
                          {risk.reasons.filter(Boolean).map((reason, reasonIdx) => (
                            <div key={`${idx}:${reasonIdx}`} className="leading-snug">
                              {reason}
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {(risk.assertionId || risk.disputeId) && (
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500">
                          {risk.assertionId ? (
                            <Link
                              href={
                                withInstanceId(`/oracle/${risk.assertionId}`, instanceId) as Route
                              }
                              className="rounded-md border border-gray-100 bg-gray-50 px-2 py-1 font-mono transition-colors hover:border-purple-200 hover:bg-white hover:text-purple-700"
                            >
                              {t('oracle.detail.relatedAssertion')}: {risk.assertionId.slice(0, 10)}
                              …
                            </Link>
                          ) : null}
                          {risk.disputeId ? (
                            <Link
                              href={
                                withInstanceId(
                                  `/disputes?q=${encodeURIComponent(risk.disputeId)}`,
                                  instanceId,
                                ) as Route
                              }
                              className="rounded-md border border-gray-100 bg-gray-50 px-2 py-1 font-mono transition-colors hover:border-purple-200 hover:bg-white hover:text-purple-700"
                            >
                              {t('oracle.detail.relatedDispute')}: {risk.disputeId.slice(0, 10)}…
                            </Link>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {data && (
            <PayoutSimulator initialBond={parseFloat(data.bondEth || '0')} currencySymbol="ETH" />
          )}
        </div>
      </div>

      {data && (
        <>
          <DisputeModal
            assertionId={data.assertion.id}
            isOpen={isDisputeModalOpen}
            onClose={() => setIsDisputeModalOpen(false)}
            contractAddress={data.config.contractAddress}
            chain={data.config.chain}
            defaultBondEth={data.bondEth ?? undefined}
            instanceId={instanceId ?? undefined}
            onSuccess={() => mutate()}
          />

          <SettleModal
            assertionId={data.assertion.id}
            isOpen={isSettleModalOpen}
            onClose={() => setIsSettleModalOpen(false)}
            contractAddress={data.config.contractAddress}
            chain={data.config.chain}
            instanceId={instanceId ?? undefined}
          />
        </>
      )}
    </div>
  );
}
