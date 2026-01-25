"use client";

import { useRef, useState } from "react";
import { X, Loader2, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useOracleTransaction } from "@/hooks/oracle/useOracleTransaction";
import { useModalBehavior } from "@/hooks/ui/useModalBehavior";
import { useI18n } from "@/i18n/LanguageProvider";
import { useToast } from "@/components/ui/toast";
import type { OracleChain } from "@/lib/types/oracleTypes";

interface SettleModalProps {
  assertionId: string;
  isOpen: boolean;
  onClose: () => void;
  contractAddress?: string;
  chain?: OracleChain;
  instanceId?: string;
}

export function SettleModal({
  assertionId,
  isOpen,
  onClose,
  contractAddress,
  chain,
  instanceId,
}: SettleModalProps) {
  const { address } = useWallet();
  const { execute, isSubmitting, isConfirming, error, resetError } =
    useOracleTransaction(instanceId);
  const { t } = useI18n();
  const { toast } = useToast();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [outcome, setOutcome] = useState<boolean | null>(null);
  useModalBehavior(isOpen, onClose, dialogRef);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (outcome === null) return;

    if (!contractAddress) {
      toast({
        title: t("oracle.detail.txFailed"),
        message: t("errors.missingConfig"),
        type: "error",
        duration: 5000,
      });
      return;
    }

    if (!chain) {
      toast({
        title: t("oracle.detail.txFailed"),
        message: t("errors.invalidChain"),
        type: "error",
        duration: 5000,
      });
      return;
    }

    const assertionIdTrimmed = assertionId.trim();
    if (
      !assertionIdTrimmed ||
      !assertionIdTrimmed.startsWith("0x") ||
      assertionIdTrimmed.length !== 66
    ) {
      toast({
        title: t("oracle.detail.txFailed"),
        message: t("errors.missingConfig"),
        type: "error",
        duration: 5000,
      });
      return;
    }

    await execute({
      functionName: "resolveAssertion",
      args: [assertionIdTrimmed as `0x${string}`, outcome],
      contractAddress,
      chain,
      successTitle: t("oracle.tx.settlementSubmittedTitle"),
      successMessage: t("oracle.tx.settlementSubmittedMsg"),
      onConfirmed: () => onClose(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settle-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl ring-1 ring-gray-200 animate-in zoom-in duration-300"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2
            id="settle-modal-title"
            className="text-xl font-bold text-gray-900"
          >
            {t("oracle.detail.settleAssertion")}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-gray-100 transition-all duration-200"
            aria-label={t("common.close")}
            disabled={isSubmitting || isConfirming}
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100 animate-in slide-in-from-top-4 duration-300">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium">{t("oracle.detail.txFailed")}</div>
              <div className="mt-0.5">{error}</div>
            </div>
            <button
              onClick={resetError}
              className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
              aria-label={t("common.close")}
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="space-y-6">
          {/* 可结算状态卡片 */}
          <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 p-4 text-blue-900 border border-blue-100">
            <h3 className="flex items-center gap-2 font-semibold">
              <CheckCircle2 size={18} className="text-blue-600" />
              {t("oracle.settleModal.readyTitle")}
            </h3>
            <p className="mt-1 text-sm text-blue-700 leading-relaxed">
              {t("oracle.settleModal.readyDesc")}
            </p>
          </div>

          {/* 断言ID信息 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Info size={14} className="text-gray-400" />
              {t("oracle.settleModal.assertionId")}
            </h3>
            <div className="rounded-xl bg-gray-50 p-3 font-mono text-sm text-gray-800 border border-gray-100">
              <code className="text-xs break-all">{assertionId}</code>
            </div>
          </div>

          {/* 结算结果选择 */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-700">
              {t("oracle.settleModal.selectOutcome")}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOutcome(true)}
                className={`rounded-xl border p-4 text-center transition-all duration-200 transform hover:-translate-y-0.5 ${
                  outcome === true
                    ? "border-green-500 bg-green-50 text-green-700 shadow-md shadow-green-500/10 ring-2 ring-green-500/20 scale-102"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                }`}
                disabled={isSubmitting || isConfirming}
              >
                <div className="text-lg font-bold mb-1">
                  {t("oracle.settleModal.outcomeTrue")}
                </div>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                  {t("oracle.settleModal.outcomeTrueDesc")}
                </p>
              </button>
              <button
                type="button"
                onClick={() => setOutcome(false)}
                className={`rounded-xl border p-4 text-center transition-all duration-200 transform hover:-translate-y-0.5 ${
                  outcome === false
                    ? "border-red-500 bg-red-50 text-red-700 shadow-md shadow-red-500/10 ring-2 ring-red-500/20 scale-102"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                }`}
                disabled={isSubmitting || isConfirming}
              >
                <div className="text-lg font-bold mb-1">
                  {t("oracle.settleModal.outcomeFalse")}
                </div>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                  {t("oracle.settleModal.outcomeFalseDesc")}
                </p>
              </button>
            </div>
            {outcome === null && (
              <div className="mt-2 text-xs text-amber-600 flex items-center gap-2 animate-pulse">
                <AlertCircle size={12} />
                {t("oracle.settleModal.selectOutcomeRequired")}
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-200 transform hover:-translate-y-0.5"
              disabled={isSubmitting || isConfirming}
            >
              {t("oracle.detail.cancel")}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                isSubmitting || isConfirming || !address || outcome === null
              }
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting || isConfirming ? (
                <Loader2 className="animate-spin" size={20} />
              ) : null}
              {isSubmitting
                ? t("oracle.detail.submitting")
                : isConfirming
                  ? t("oracle.detail.confirming")
                  : t("oracle.detail.settleAssertion")}
            </button>
          </div>

          {/* 交易提示 */}
          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <Info size={12} className="text-gray-400" />
              <span className="font-medium">
                {t("oracle.settleModal.transactionNoteTitle")}
              </span>
            </div>
            <p className="leading-relaxed">
              {t("oracle.settleModal.transactionNoteBody")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
