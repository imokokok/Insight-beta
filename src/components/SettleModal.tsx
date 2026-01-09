"use client";

import { useRef } from "react";
import { X, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useOracleTransaction } from "@/hooks/useOracleTransaction";
import { useModalBehavior } from "@/hooks/useModalBehavior";
import { useI18n } from "@/i18n/LanguageProvider";
import type { OracleChain } from "@/lib/oracleTypes";

interface SettleModalProps {
  assertionId: string;
  isOpen: boolean;
  onClose: () => void;
  contractAddress?: string;
  chain?: OracleChain;
}

export function SettleModal({ assertionId, isOpen, onClose, contractAddress, chain }: SettleModalProps) {
  const { address } = useWallet();
  const { execute, isSubmitting, isConfirming, error } = useOracleTransaction();
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useModalBehavior(isOpen, onClose, dialogRef);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    await execute({
      functionName: "settleAssertion",
      args: [assertionId as `0x${string}`],
      contractAddress,
      chain,
      successTitle: t("oracle.tx.settlementSubmittedTitle"),
      successMessage: t("oracle.tx.settlementSubmittedMsg"),
      onConfirmed: () => onClose()
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
      <div ref={dialogRef} tabIndex={-1} className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl ring-1 ring-gray-200">
        <div className="mb-6 flex items-center justify-between">
          <h2 id="settle-modal-title" className="text-xl font-bold text-gray-900">{t("oracle.detail.settleAssertion")}</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100" aria-label={t("common.close")}>
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div className="rounded-xl bg-blue-50 p-4 text-blue-900">
            <h3 className="flex items-center gap-2 font-semibold">
              <CheckCircle2 size={18} />
              {t("oracle.settleModal.readyTitle")}
            </h3>
            <p className="mt-1 text-sm text-blue-700">
              {t("oracle.settleModal.readyDesc")}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {t("oracle.detail.cancel")}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || isConfirming || !address}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting || isConfirming ? <Loader2 className="animate-spin" size={20} /> : null}
              {isSubmitting ? t("oracle.detail.submitting") : isConfirming ? t("oracle.detail.confirming") : t("oracle.detail.settleAssertion")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
