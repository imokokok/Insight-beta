"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import useSWR from "swr";
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
} from "lucide-react";
import {
  cn,
  fetchApiData,
  formatUsd,
  getErrorCode,
  getExplorerUrl,
  getAssertionStatusColor,
} from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageProvider";
import { getUiErrorMessage, langToLocale } from "@/i18n/translations";
import { useToast } from "@/components/ui/toast";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useOracleTransaction } from "@/hooks/useOracleTransaction";
import { useWallet } from "@/contexts/WalletContext";
import { ConnectWallet } from "@/components/ConnectWallet";
import type {
  Assertion,
  Dispute,
  OracleConfig,
  Alert,
} from "@/lib/oracleTypes";

import { AssertionTimeline } from "@/components/AssertionTimeline";
import { AssertionDetailSkeleton } from "@/components/AssertionDetailSkeleton";
import { PayoutSimulator } from "@/components/PayoutSimulator";
import { CountdownTimer } from "@/components/CountdownTimer";
import { AddressAvatar } from "@/components/AddressAvatar";
import { CopyButton } from "@/components/CopyButton";
import { InfoTooltip } from "@/components/InfoTooltip";
import { LivenessProgressBar } from "@/components/LivenessProgressBar";

const DisputeModal = dynamic(
  () => import("@/components/DisputeModal").then((mod) => mod.DisputeModal),
  { ssr: false },
);
const SettleModal = dynamic(
  () => import("@/components/SettleModal").then((mod) => mod.SettleModal),
  { ssr: false },
);

function getStatusIcon(status: string) {
  switch (status) {
    case "Pending":
      return <Clock className="h-4 w-4" />;
    case "Disputed":
      return <ShieldAlert className="h-4 w-4" />;
    case "Resolved":
      return <CheckCircle2 className="h-4 w-4" />;
    default:
      return <AlertTriangle className="h-4 w-4" />;
  }
}

export default function OracleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const instanceId = searchParams?.get("instanceId")?.trim() || null;
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
      const raw = window.localStorage.getItem("oracleFilters");
      const parsed =
        raw && raw.trim()
          ? (JSON.parse(raw) as Record<string, unknown> | null)
          : null;
      const next = {
        ...(parsed && typeof parsed === "object" ? parsed : {}),
        instanceId,
      };
      window.localStorage.setItem("oracleFilters", JSON.stringify(next));
    } catch {
      void 0;
    }
  }, [instanceId]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: t("common.copied"),
        message: `${label} ${t("common.copied")}`,
        type: "success",
        duration: 2000,
      });
    } catch {
      toast({
        title: "Failed to copy",
        type: "error",
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

  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [exportingEvidence, setExportingEvidence] = useState<
    null | "fast" | "logs"
  >(null);

  if (isLoading) {
    return <AssertionDetailSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="glass-panel mb-6 rounded-full p-6 text-rose-500 shadow-xl shadow-rose-500/10">
          <AlertTriangle className="h-12 w-12" />
        </div>
        <h3 className="text-2xl font-bold text-gray-800">
          {t("oracle.detail.errorTitle")}
        </h3>
        <p className="mt-2 max-w-md text-gray-600">
          {error
            ? getUiErrorMessage(getErrorCode(error), t)
            : t("oracle.detail.errorNotFound")}
        </p>
        <button
          onClick={() => router.back()}
          className="mt-8 flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-gray-700 shadow-lg shadow-gray-200/50 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-200/60"
        >
          <ArrowLeft size={18} />
          {t("oracle.detail.goBack")}
        </button>
      </div>
    );
  }

  const { assertion, dispute } = data;
  const voteTrackingEnabled = data.voteTrackingEnabled ?? true;
  const now = Date.now();
  const isLivenessExpired = new Date(assertion.livenessEndsAt).getTime() <= now;
  const canSettle =
    (assertion.status === "Pending" && isLivenessExpired) ||
    dispute?.status === "Pending Execution";

  const canVote = Boolean(dispute && dispute.status === "Voting");
  const submitVote = async (support: boolean) => {
    await executeTx({
      functionName: "castVote",
      args: [assertion.id as `0x${string}`, support],
      contractAddress: data.config.contractAddress,
      chain: data.config.chain,
      successTitle: t("oracle.tx.voteCastTitle"),
      successMessage: support
        ? t("oracle.tx.voteCastSupportMsg")
        : t("oracle.tx.voteCastAgainstMsg"),
      onConfirmed: () => {
        void mutate();
      },
    });
  };

  const exportEvidence = async (mode: "fast" | "logs") => {
    setExportingEvidence(mode);
    try {
      const qs = new URLSearchParams();
      if (mode === "logs") qs.set("includeLogs", "1");
      if (instanceId) qs.set("instanceId", instanceId);
      const payload = await fetchApiData<unknown>(
        `/api/oracle/assertions/${assertion.id}/evidence${qs.toString() ? `?${qs.toString()}` : ""}`,
      );
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
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
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <button
          onClick={() => router.back()}
          className="self-start group flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-all hover:bg-white/50 hover:text-purple-700 hover:shadow-sm"
        >
          <ArrowLeft
            size={16}
            className="transition-transform group-hover:-translate-x-1"
          />
          {t("oracle.detail.back")}
        </button>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between glass-panel p-6 rounded-3xl">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 drop-shadow-sm">
                {t("oracle.detail.title")}
              </h1>
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold shadow-sm",
                  getAssertionStatusColor(assertion.status),
                )}
              >
                {getStatusIcon(assertion.status)}
                {assertion.status}
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
              <button
                onClick={() => copyToClipboard(assertion.id, "ID")}
                className="group flex items-center gap-2 font-mono bg-white/60 px-2 py-1 rounded-md border border-gray-200/50 shadow-sm hover:bg-white hover:border-purple-200 hover:text-purple-700 transition-all"
                title="Click to copy ID"
              >
                <span>ID: {assertion.id}</span>
                <Copy
                  size={12}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                />
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
                "p-2 rounded-full transition-all shadow-sm ring-1 ring-gray-200/50",
                mounted && isWatched(assertion.id)
                  ? "bg-amber-100 text-amber-500 hover:bg-amber-200"
                  : "bg-white/50 hover:bg-white text-gray-500 hover:text-gray-600",
              )}
              title={
                mounted && isWatched(assertion.id)
                  ? t("common.removeFromWatchlist")
                  : t("common.addToWatchlist")
              }
            >
              <Star
                size={18}
                className={cn(
                  "transition-all",
                  mounted && isWatched(assertion.id) && "fill-current",
                )}
              />
            </button>
            <button
              onClick={() => {
                const url = window.location.href;
                copyToClipboard(url, "Link");
              }}
              className="p-2 rounded-full bg-white/50 hover:bg-white text-gray-500 hover:text-purple-600 transition-all shadow-sm ring-1 ring-gray-200/50"
              title="Share Page"
            >
              <Share2 size={18} />
            </button>
            <div className="flex flex-col items-end">
              <span className="text-sm text-gray-500 font-medium">
                {t("oracle.detail.bondAmount")}
              </span>
              <span className="text-2xl font-bold text-gray-900 drop-shadow-sm">
                {formatUsd(assertion.bondUsd, locale)}
              </span>
            </div>
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 shadow-inner">
              <DollarSign size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Assertion Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-3xl p-8 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
              <HelpCircle size={200} />
            </div>

            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <HelpCircle className="text-purple-500" size={24} />
                {t("oracle.detail.marketQuestion")}
                <InfoTooltip content={t("tooltips.market")} />
              </h2>
              <CopyButton
                text={assertion.market}
                label={t("oracle.detail.marketQuestion")}
              />
            </div>

            <div className="mb-8 rounded-2xl bg-gradient-to-br from-white/80 to-purple-50/50 p-6 shadow-sm ring-1 ring-purple-100/50 backdrop-blur-sm relative z-10">
              <p className="text-xl font-medium leading-relaxed text-gray-800">
                {assertion.market}
              </p>
            </div>

            <div className="space-y-3 relative z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  {t("oracle.detail.assertedOutcome")}
                </h3>
                <CopyButton
                  text={assertion.assertion}
                  label={t("oracle.detail.assertedOutcome")}
                />
              </div>
              <div className="rounded-xl bg-purple-50/80 p-5 font-bold text-purple-900 border border-purple-100/50 shadow-sm">
                {assertion.assertion}
              </div>
            </div>

            {assertion.status === "Resolved" &&
              assertion.settlementResolution !== undefined && (
                <div className="mt-6 space-y-3 relative z-10">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    {t("oracle.detail.settlementResult")}
                  </h3>
                  <div
                    className={cn(
                      "rounded-xl p-5 font-bold border shadow-sm flex items-center gap-3",
                      assertion.settlementResolution
                        ? "bg-emerald-50 text-emerald-900 border-emerald-100"
                        : "bg-rose-50 text-rose-900 border-rose-100",
                    )}
                  >
                    {assertion.settlementResolution ? (
                      <>
                        <CheckCircle2 size={24} className="text-emerald-600" />
                        <span>{t("oracle.detail.settlementTrue")}</span>
                      </>
                    ) : (
                      <>
                        <X size={24} className="text-rose-600" />
                        <span>{t("oracle.detail.settlementFalse")}</span>
                      </>
                    )}
                  </div>
                </div>
              )}

            <div className="mt-8 grid gap-4 sm:grid-cols-2 relative z-10">
              <div className="glass-panel rounded-2xl p-4 transition-all hover:bg-white/80 hover:shadow-md hover:-translate-y-0.5 group relative">
                <div className="mb-2 text-xs font-bold text-gray-500 uppercase tracking-wide flex justify-between items-center">
                  {t("oracle.detail.asserter")}
                  <CopyButton
                    text={assertion.asserter}
                    label={t("oracle.detail.asserter")}
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
                  <span className="font-mono text-sm text-gray-700 font-bold group-hover:text-purple-700 transition-colors">
                    {assertion.asserter.slice(0, 6)}...
                    {assertion.asserter.slice(-4)}
                  </span>
                  <ExternalLink
                    size={14}
                    className="text-gray-400 group-hover:text-purple-500 transition-colors ml-auto"
                  />
                </Link>
              </div>
              <a
                href={getExplorerUrl(assertion.chain, assertion.txHash) || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-panel rounded-2xl p-4 transition-all hover:bg-white/80 hover:shadow-md hover:-translate-y-0.5 group hover:ring-2 hover:ring-purple-200 relative"
              >
                <div className="mb-2 text-xs font-bold text-gray-500 uppercase tracking-wide flex justify-between items-center">
                  {t("oracle.detail.transaction")}
                  <CopyButton
                    text={assertion.txHash}
                    label="Tx Hash"
                    className="opacity-0 group-hover:opacity-100"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-gray-700 font-bold group-hover:text-purple-700 transition-colors">
                    {assertion.txHash.slice(0, 6)}...
                    {assertion.txHash.slice(-4)}
                  </span>
                  <ExternalLink
                    size={14}
                    className="text-gray-400 group-hover:text-purple-500 transition-colors"
                  />
                </div>
              </a>

              {/* Assertion Time */}
              <div className="glass-panel rounded-2xl p-4 transition-all hover:bg-white/80 hover:shadow-md hover:-translate-y-0.5 group hover:ring-2 hover:ring-purple-200">
                <div className="mb-2 text-xs font-bold text-gray-500 uppercase tracking-wide">
                  {t("oracle.timeline.asserted")}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CountdownTimer
                    targetDate={assertion.assertedAt}
                    label={t("oracle.timeline.active")}
                    className="font-semibold"
                  />
                  <span className="text-gray-400">·</span>
                  <span className="text-xs text-gray-500">
                    {new Date(assertion.assertedAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Expiration */}
              <div className="glass-panel rounded-2xl p-4 transition-all hover:bg-white/80 hover:shadow-md hover:-translate-y-0.5 group hover:ring-2 hover:ring-purple-200">
                <LivenessProgressBar
                  startDate={assertion.assertedAt}
                  endDate={assertion.livenessEndsAt}
                  status={assertion.status}
                  label={t("oracle.timeline.livenessEnds")}
                  tooltip={t("tooltips.liveness")}
                />
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {new Date(assertion.assertedAt).toLocaleDateString()}
                  </span>
                  <span>
                    {new Date(assertion.livenessEndsAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-8">
            <h2 className="mb-6 text-xl font-bold text-gray-800 flex items-center gap-2">
              <Activity className="text-indigo-500" size={24} />
              {t("oracle.detail.timeline")}
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
          <div className="glass-card rounded-3xl p-6 sticky top-24">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <ShieldAlert className="text-rose-500" size={20} />
              {t("oracle.detail.actions")}
            </h3>

            <div className="mb-6 space-y-3">
              <button
                type="button"
                onClick={() => exportEvidence("fast")}
                disabled={exportingEvidence !== null}
                className="w-full rounded-xl bg-white py-3 text-sm font-bold text-purple-700 shadow-sm ring-1 ring-purple-100 transition-colors hover:bg-purple-50 disabled:opacity-60"
              >
                {exportingEvidence === "fast" ? "导出中…" : "导出证据包"}
              </button>
              <button
                type="button"
                onClick={() => exportEvidence("logs")}
                disabled={exportingEvidence !== null}
                className="w-full rounded-xl bg-white py-3 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-gray-100 transition-colors hover:bg-gray-50 disabled:opacity-60"
              >
                {exportingEvidence === "logs"
                  ? "导出中…"
                  : "导出证据包（含链上日志）"}
              </button>
            </div>

            {canSettle && (
              <div className="space-y-4">
                <button
                  onClick={() => setIsSettleModalOpen(true)}
                  className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-600 hover:to-blue-700 hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98]"
                >
                  <div className="flex items-center justify-center gap-2 relative z-10">
                    <CheckCircle2 size={18} />
                    {t("oracle.detail.settleAssertion")}
                  </div>
                </button>
                <p className="text-center text-xs text-gray-500 bg-gray-50/50 py-3 rounded-xl border border-gray-100">
                  {t("oracle.detail.settleDesc")}
                </p>
              </div>
            )}

            {assertion.status === "Pending" && !isLivenessExpired && (
              <div className="space-y-4">
                <button
                  onClick={() => setIsDisputeModalOpen(true)}
                  className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-500/25 transition-all hover:from-rose-600 hover:to-rose-700 hover:shadow-xl hover:shadow-rose-500/30 active:scale-[0.98]"
                >
                  <div className="flex items-center justify-center gap-2 relative z-10">
                    <ShieldAlert size={18} />
                    {t("oracle.detail.disputeAssertion")}
                  </div>
                </button>

                <p className="text-center text-xs text-gray-500 bg-gray-50/50 py-3 rounded-xl border border-gray-100">
                  {t("oracle.detail.disputeRequiresBond")}{" "}
                  <span className="font-bold text-gray-900">
                    {formatUsd(assertion.bondUsd, locale)}
                  </span>
                </p>
              </div>
            )}

            {dispute && (
              <div className="mt-6 rounded-2xl bg-rose-50/80 p-5 ring-1 ring-rose-100/50 shadow-sm">
                <h2 className="flex items-center gap-2 text-lg font-bold text-rose-900 mb-4">
                  <AlertTriangle size={20} className="text-rose-600" />
                  {t("oracle.detail.disputeActive")}
                </h2>

                <div className="space-y-4">
                  <div className="rounded-xl bg-white p-4 text-sm text-rose-900 shadow-sm ring-1 ring-rose-100/50">
                    <span className="block text-xs font-bold text-rose-500 mb-1 uppercase tracking-wide">
                      {t("oracle.detail.reason")}
                    </span>
                    <p className="leading-relaxed">{dispute.disputeReason}</p>
                  </div>

                  {voteTrackingEnabled ? (
                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-rose-700">
                          {t("oracle.detail.support")}
                        </span>
                        <span className="font-bold text-rose-900">
                          {dispute.currentVotesFor} {t("oracle.detail.votes")}
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-rose-200/30 ring-1 ring-rose-200/50">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all shadow-sm"
                          style={{
                            width: `${
                              dispute.totalVotes > 0
                                ? (dispute.currentVotesFor /
                                    dispute.totalVotes) *
                                  100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-rose-700">
                          {t("oracle.detail.against")}
                        </span>
                        <span className="font-bold text-rose-900">
                          {dispute.currentVotesAgainst}{" "}
                          {t("oracle.detail.votes")}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {voteTrackingEnabled ? (
                    <div className="pt-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-bold text-rose-900">
                          {t("oracle.detail.voteOnDispute")}
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
                          disabled={
                            !address ||
                            !canVote ||
                            isVoteSubmitting ||
                            isVoteConfirming
                          }
                          className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-700 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                        >
                          {t("oracle.detail.support")}
                        </button>
                        <button
                          type="button"
                          onClick={() => void submitVote(false)}
                          disabled={
                            !address ||
                            !canVote ||
                            isVoteSubmitting ||
                            isVoteConfirming
                          }
                          className="w-full rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 py-3 text-sm font-bold text-white shadow-lg shadow-rose-500/20 hover:from-rose-700 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                        >
                          {t("oracle.detail.against")}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <a
                    href="https://vote.umaproject.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-purple-500/20 hover:from-purple-700 hover:to-indigo-700 hover:shadow-xl hover:shadow-purple-500/30 transition-all active:scale-[0.98]"
                  >
                    <ExternalLink size={18} />
                    {t("disputes.viewOnUma")}
                  </a>
                </div>
              </div>
            )}

            {assertion.status === "Resolved" && (
              <div className="rounded-2xl bg-emerald-50/80 p-5 ring-1 ring-emerald-100/50 shadow-sm flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-900">
                    {t("oracle.detail.resolved")}
                  </h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    {t("oracle.detail.resolvedDesc")}
                  </p>
                </div>
              </div>
            )}
          </div>

          {data && (
            <PayoutSimulator
              initialBond={parseFloat(data.bondEth || "0")}
              currencySymbol="ETH"
            />
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
