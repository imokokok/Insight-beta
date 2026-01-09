"use client";

import { useRef, useState } from "react";
import { X, Loader2, AlertCircle, ThumbsUp, ThumbsDown } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useOracleTransaction } from "@/hooks/useOracleTransaction";
import { useModalBehavior } from "@/hooks/useModalBehavior";
import { useI18n } from "@/i18n/LanguageProvider";
import type { OracleChain } from "@/lib/oracleTypes";

interface VoteModalProps {
  assertionId: string;
  isOpen: boolean;
  onClose: () => void;
  contractAddress?: string;
  chain?: OracleChain;
}

export function VoteModal({ assertionId, isOpen, onClose, contractAddress, chain }: VoteModalProps) {
  const { address } = useWallet();
  const { execute, isSubmitting, isConfirming, error } = useOracleTransaction();
  const { t } = useI18n();
  const [support, setSupport] = useState<boolean | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useModalBehavior(isOpen, onClose, dialogRef);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (support === null) return;
    
    await execute({
      functionName: "vote",
      args: [assertionId as `0x${string}`, support],
      contractAddress,
      chain,
      successTitle: t("oracle.tx.voteCastTitle"),
      successMessage: support ? t("oracle.tx.voteCastSupportMsg") : t("oracle.tx.voteCastAgainstMsg"),
      onConfirmed: () => onClose()
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vote-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={dialogRef} tabIndex={-1} className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl ring-1 ring-gray-200">
        <div className="mb-6 flex items-center justify-between">
          <h2 id="vote-modal-title" className="text-xl font-bold text-gray-900">{t("oracle.detail.voteOnDispute")}</h2>
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setSupport(true)}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-6 transition-all ${
                support === true
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-gray-200 hover:border-emerald-200 hover:bg-emerald-50/50"
              }`}
            >
              <ThumbsUp size={32} />
              <span className="font-semibold">{t("oracle.detail.support")}</span>
            </button>

            <button
              type="button"
              onClick={() => setSupport(false)}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-6 transition-all ${
                support === false
                  ? "border-rose-500 bg-rose-50 text-rose-700"
                  : "border-gray-200 hover:border-rose-200 hover:bg-rose-50/50"
              }`}
            >
              <ThumbsDown size={32} />
              <span className="font-semibold">{t("oracle.detail.against")}</span>
            </button>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              {t("oracle.detail.cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isConfirming || !address || support === null}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {(isSubmitting || isConfirming) && <Loader2 size={16} className="animate-spin" />}
              {!address
                ? t("wallet.connect")
                : isSubmitting
                  ? t("oracle.detail.submitting")
                  : isConfirming
                    ? t("oracle.detail.confirming")
                    : t("oracle.detail.voteOnDispute")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
