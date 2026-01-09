"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  ExternalLink, 
  DollarSign, 
  AlertTriangle, 
  ShieldAlert,
  Vote
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn, fetchApiData, formatUsd } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageProvider";
import { langToLocale } from "@/i18n/translations";
import type { Assertion, Dispute, OracleConfig } from "@/lib/oracleTypes";
import { createWalletClient, custom, encodeFunctionData } from "viem";
import { ORACLE_ABI } from "@/lib/abi";

import { AssertionTimeline } from "@/components/AssertionTimeline";

function getStatusColor(status: string) {
  switch (status) {
    case "Pending":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "Disputed":
      return "bg-rose-100 text-rose-700 border-rose-200";
    case "Resolved":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

import { useToast } from "@/components/ui/toast";

export default function OracleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params?.id as string;
  const { lang, t } = useI18n();
  const locale = langToLocale[lang];

  const [data, setData] = useState<{ assertion: Assertion; dispute: Dispute | null; config: OracleConfig } | null>(null);
  const [loading, setLoading] = useState(true);
  const [txPending, setTxPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetchApiData<{ assertion: Assertion; dispute: Dispute | null; config: OracleConfig }>(
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

  const txUrl = (chain: OracleConfig["chain"], hash: string) => {
    if (!hash) return null;
    if (chain === "Polygon") return `https://polygonscan.com/tx/${hash}`;
    if (chain === "Arbitrum") return `https://arbiscan.io/tx/${hash}`;
    if (chain === "Optimism") return `https://optimistic.etherscan.io/tx/${hash}`;
    return null;
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-purple-600">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-current border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="mb-4 h-12 w-12 text-rose-500" />
        <h3 className="text-lg font-semibold text-gray-900">{t("oracle.detail.errorTitle")}</h3>
        <p className="mt-2 text-gray-600">{error ? error : t("oracle.detail.errorNotFound")}</p>
        <button
          onClick={() => router.back()}
          className="mt-6 flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
        >
          <ArrowLeft size={16} />
          {t("oracle.detail.goBack")}
        </button>
      </div>
    );
  }

  const { assertion, dispute, config } = data;

  const handleDispute = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      toast({
        type: "error",
        title: t("oracle.detail.walletNotFound"),
        message: t("oracle.detail.installWallet")
      });
      return;
    }
    
    setTxPending(true);
    try {
      const client = createWalletClient({
        transport: custom(window.ethereum)
      });
      
      const [address] = await client.requestAddresses();
      
      const calldata = encodeFunctionData({
        abi: ORACLE_ABI,
        functionName: "disputeAssertion",
        args: [assertion.id as `0x${string}`]
      });

      const hash = await client.sendTransaction({
        account: address,
        chain: null,
        to: config.contractAddress as `0x${string}`,
        data: calldata
      });
      
      toast({
        type: "success",
        title: t("oracle.detail.txSent"),
        message: `${t("oracle.detail.hash")}: ${hash}`
      });
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast({
        type: "error",
        title: t("oracle.detail.txFailed"),
        message: msg
      });
    } finally {
      setTxPending(false);
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-800"
      >
        <ArrowLeft size={16} />
        {t("oracle.detail.back")}
      </button>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-purple-950">{t("oracle.detail.title")}</h1>
          <div className="flex items-center gap-2 text-sm text-purple-700/60">
            <span className="font-mono">ID: {assertion.id}</span>
            <span>•</span>
            <span>{assertion.protocol}</span>
          </div>
        </div>
        <div className={cn("px-4 py-1.5 rounded-full text-sm font-medium border", getStatusColor(assertion.status))}>
          {assertion.status}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Assertion Info */}
        <Card className="border-purple-100/60 bg-white/60 shadow-sm lg:col-span-2">
          <CardHeader>
            <h2 className="text-lg font-semibold text-purple-950">{t("oracle.detail.marketQuestion")}</h2>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-xl bg-white/50 p-4 shadow-sm ring-1 ring-purple-100/50">
              <p className="text-lg font-medium leading-relaxed text-gray-900">
                {assertion.market}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-purple-900/60">{t("oracle.detail.assertedOutcome")}</h3>
              <div className="rounded-lg bg-purple-50/50 p-3 font-medium text-purple-900">
                {assertion.assertion}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-purple-100 bg-white p-4">
                <div className="mb-1 text-xs text-purple-500">{t("oracle.detail.asserter")}</div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-purple-900">
                    {assertion.asserter.slice(0, 6)}...{assertion.asserter.slice(-4)}
                  </span>
                  <ExternalLink size={14} className="text-purple-400" />
                </div>
              </div>
              <div className="rounded-xl border border-purple-100 bg-white p-4">
                <div className="mb-1 text-xs text-purple-500">{t("oracle.detail.transaction")}</div>
                <a 
                  href={txUrl(assertion.chain as OracleConfig["chain"], assertion.txHash) || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between hover:text-purple-700"
                >
                  <span className="font-mono text-sm text-purple-900">
                    {assertion.txHash.slice(0, 6)}...{assertion.txHash.slice(-4)}
                  </span>
                  <ExternalLink size={14} className="text-purple-400" />
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card className="border-purple-100/60 bg-white/60 shadow-sm">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-purple-100/50 pb-4">
                  <div className="flex items-center gap-2 text-purple-600">
                    <DollarSign size={18} />
                    <span className="text-sm font-medium">{t("oracle.detail.bondAmount")}</span>
                  </div>
                  <span className="text-lg font-bold text-purple-900">{formatUsd(assertion.bondUsd, locale)}</span>
                </div>
                
                <div className="pt-2">
                  <AssertionTimeline assertion={assertion} dispute={dispute} />
                </div>
              </div>

              {assertion.status === "Pending" && (
                <div className="mt-6">
                  <button 
                    onClick={handleDispute}
                    disabled={txPending}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 hover:bg-rose-700 transition-colors",
                      txPending && "opacity-70 cursor-wait"
                    )}
                  >
                    <ShieldAlert size={18} />
                    {txPending ? t("oracle.detail.confirming") : t("oracle.detail.disputeAssertion")}
                  </button>
                  <p className="mt-2 text-center text-xs text-purple-500">
                    {t("oracle.detail.disputeRequiresBond")} {formatUsd(assertion.bondUsd, locale)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {dispute && (
            <Card className="border-rose-100 bg-rose-50/50 shadow-sm">
              <CardHeader>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-rose-900">
                  <AlertTriangle size={20} />
                  {t("oracle.detail.disputeActive")}
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-white/60 p-3 text-sm text-rose-800">
                  <span className="font-semibold">{t("oracle.detail.reason")}:</span> {dispute.disputeReason}
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-rose-700">{t("oracle.detail.support")}</span>
                    <span className="font-medium text-rose-900">
                      {dispute.currentVotesFor} {t("oracle.detail.votes")}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-rose-200">
                    <div 
                      className="h-full bg-emerald-500 transition-all"
                      style={{ width: `${dispute.totalVotes > 0 ? (dispute.currentVotesFor / dispute.totalVotes) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-rose-700">{t("oracle.detail.against")}</span>
                    <span className="font-medium text-rose-900">
                      {dispute.currentVotesAgainst} {t("oracle.detail.votes")}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700">
                    <Vote size={16} />
                    {t("oracle.detail.voteOnDispute")}
                  </button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
