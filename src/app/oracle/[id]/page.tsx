"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { 
  ArrowLeft, 
  ExternalLink, 
  DollarSign, 
  AlertTriangle, 
  ShieldAlert,
  Vote,
  Clock,
  CheckCircle2,
  HelpCircle,
  Activity,
  X
} from "lucide-react";
import { cn, fetchApiData, formatUsd, getExplorerUrl, getAssertionStatusColor } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageProvider";
import { langToLocale } from "@/i18n/translations";
import type { Assertion, Dispute, OracleConfig } from "@/lib/oracleTypes";

import { AssertionTimeline } from "@/components/AssertionTimeline";

const DisputeModal = dynamic(() => import("@/components/DisputeModal").then(mod => mod.DisputeModal), { ssr: false });
const VoteModal = dynamic(() => import("@/components/VoteModal").then(mod => mod.VoteModal), { ssr: false });
const SettleModal = dynamic(() => import("@/components/SettleModal").then(mod => mod.SettleModal), { ssr: false });

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
  const id = params?.id as string;
  const { lang, t } = useI18n();
  const locale = langToLocale[lang];

  const [data, setData] = useState<{ assertion: Assertion; dispute: Dispute | null; config: OracleConfig; bondWei: string | null; bondEth: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [isVoteModalOpen, setIsVoteModalOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetchApiData<{ assertion: Assertion; dispute: Dispute | null; config: OracleConfig; bondWei: string | null; bondEth: string | null }>(
          `/api/oracle/assertions/${id}`
        );
        setData(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : "unknown_error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-pulse rounded-full bg-purple-100"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="glass-panel mb-6 rounded-full p-6 text-rose-500 shadow-xl shadow-rose-500/10">
          <AlertTriangle className="h-12 w-12" />
        </div>
        <h3 className="text-2xl font-bold text-gray-800">{t("oracle.detail.errorTitle")}</h3>
        <p className="mt-2 max-w-md text-gray-600">{error ? error : t("oracle.detail.errorNotFound")}</p>
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
  const now = Date.now();
  const isLivenessExpired = new Date(assertion.livenessEndsAt).getTime() <= now;
  const canSettle = 
    (assertion.status === "Pending" && isLivenessExpired) ||
    (dispute?.status === "Pending Execution");

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <button
          onClick={() => router.back()}
          className="self-start group flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-all hover:bg-white/50 hover:text-purple-700 hover:shadow-sm"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          {t("oracle.detail.back")}
        </button>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between glass-panel p-6 rounded-3xl">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 drop-shadow-sm">{t("oracle.detail.title")}</h1>
              <div className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold shadow-sm", getAssertionStatusColor(assertion.status))}>
                {getStatusIcon(assertion.status)}
                {assertion.status}
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
              <span className="font-mono bg-white/60 px-2 py-1 rounded-md border border-gray-200/50 shadow-sm">ID: {assertion.id}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-gray-300"></span>
              <span className="flex items-center gap-1">
                <Activity size={14} className="text-purple-500" />
                {assertion.protocol}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             <div className="flex flex-col items-end">
                <span className="text-sm text-gray-500 font-medium">{t("oracle.detail.bondAmount")}</span>
                <span className="text-2xl font-bold text-gray-900 drop-shadow-sm">{formatUsd(assertion.bondUsd, locale)}</span>
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

            <h2 className="mb-6 text-xl font-bold text-gray-800 flex items-center gap-2">
                <HelpCircle className="text-purple-500" size={24} />
                {t("oracle.detail.marketQuestion")}
            </h2>
            
            <div className="mb-8 rounded-2xl bg-gradient-to-br from-white/80 to-purple-50/50 p-6 shadow-sm ring-1 ring-purple-100/50 backdrop-blur-sm relative z-10">
              <p className="text-xl font-medium leading-relaxed text-gray-800">
                {assertion.market}
              </p>
            </div>

            <div className="space-y-3 relative z-10">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                 <CheckCircle2 size={16} />
                 {t("oracle.detail.assertedOutcome")}
              </h3>
              <div className="rounded-xl bg-purple-50/80 p-5 font-bold text-purple-900 border border-purple-100/50 shadow-sm">
                {assertion.assertion}
              </div>
            </div>

            {assertion.status === "Resolved" && assertion.settlementResolution !== undefined && (
              <div className="mt-6 space-y-3 relative z-10">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  {t("oracle.detail.settlementResult")}
                </h3>
                <div className={cn(
                  "rounded-xl p-5 font-bold border shadow-sm flex items-center gap-3",
                  assertion.settlementResolution
                    ? "bg-emerald-50 text-emerald-900 border-emerald-100"
                    : "bg-rose-50 text-rose-900 border-rose-100"
                )}>
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
              <div className="glass-panel rounded-2xl p-4 transition-all hover:bg-white/80 hover:shadow-md hover:-translate-y-0.5 group">
                <div className="mb-2 text-xs font-bold text-gray-500 uppercase tracking-wide">{t("oracle.detail.asserter")}</div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-gray-700 font-bold group-hover:text-purple-700 transition-colors">
                    {assertion.asserter.slice(0, 6)}...{assertion.asserter.slice(-4)}
                  </span>
                  <ExternalLink size={14} className="text-gray-400 group-hover:text-purple-500 transition-colors" />
                </div>
              </div>
              <a 
                href={getExplorerUrl(assertion.chain, assertion.txHash) || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-panel rounded-2xl p-4 transition-all hover:bg-white/80 hover:shadow-md hover:-translate-y-0.5 group hover:ring-2 hover:ring-purple-200"
              >
                <div className="mb-2 text-xs font-bold text-gray-500 uppercase tracking-wide">{t("oracle.detail.transaction")}</div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-gray-700 font-bold group-hover:text-purple-700 transition-colors">
                    {assertion.txHash.slice(0, 6)}...{assertion.txHash.slice(-4)}
                  </span>
                  <ExternalLink size={14} className="text-gray-400 group-hover:text-purple-500 transition-colors" />
                </div>
              </a>
            </div>
          </div>
          
          <div className="glass-card rounded-3xl p-8">
             <h2 className="mb-6 text-xl font-bold text-gray-800 flex items-center gap-2">
                <Activity className="text-indigo-500" size={24} />
                {t("oracle.detail.timeline")}
             </h2>
             <AssertionTimeline assertion={assertion} dispute={dispute} />
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="glass-card rounded-3xl p-6 sticky top-24">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <ShieldAlert className="text-rose-500" size={20} />
                {t("oracle.detail.actions")}
            </h3>

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
                  {t("oracle.detail.disputeRequiresBond")} <span className="font-bold text-gray-900">{formatUsd(assertion.bondUsd, locale)}</span>
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
                    <span className="block text-xs font-bold text-rose-500 mb-1 uppercase tracking-wide">{t("oracle.detail.reason")}</span>
                    <p className="leading-relaxed">{dispute.disputeReason}</p>
                  </div>
                  
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-rose-700">{t("oracle.detail.support")}</span>
                      <span className="font-bold text-rose-900">
                        {dispute.currentVotesFor} {t("oracle.detail.votes")}
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-rose-200/30 ring-1 ring-rose-200/50">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all shadow-sm"
                        style={{ width: `${dispute.totalVotes > 0 ? (dispute.currentVotesFor / dispute.totalVotes) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-rose-700">{t("oracle.detail.against")}</span>
                      <span className="font-bold text-rose-900">
                        {dispute.currentVotesAgainst} {t("oracle.detail.votes")}
                      </span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setIsVoteModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-purple-500/20 hover:from-purple-700 hover:to-indigo-700 hover:shadow-xl hover:shadow-purple-500/30 transition-all active:scale-[0.98]"
                  >
                    <Vote size={18} />
                    {t("oracle.detail.voteOnDispute")}
                  </button>
                </div>
              </div>
            )}
            
            {assertion.status === "Resolved" && (
                <div className="rounded-2xl bg-emerald-50/80 p-5 ring-1 ring-emerald-100/50 shadow-sm flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                        <CheckCircle2 size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-emerald-900">{t("oracle.detail.resolved")}</h4>
                        <p className="text-xs text-emerald-700 mt-0.5">{t("oracle.detail.resolvedDesc")}</p>
                    </div>
                </div>
            )}
          </div>
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
          />
          
          <VoteModal
            assertionId={data.assertion.id}
            isOpen={isVoteModalOpen}
            onClose={() => setIsVoteModalOpen(false)}
            contractAddress={data.config.contractAddress}
            chain={data.config.chain}
          />

          <SettleModal
            assertionId={data.assertion.id}
            isOpen={isSettleModalOpen}
            onClose={() => setIsSettleModalOpen(false)}
            contractAddress={data.config.contractAddress}
            chain={data.config.chain}
          />
        </>
      )}
    </div>
  );
}
