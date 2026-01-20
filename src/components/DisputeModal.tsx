"use client";

import { useEffect, useRef, useState } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useOracleTransaction } from "@/hooks/useOracleTransaction";
import { useModalBehavior } from "@/hooks/useModalBehavior";
import { useI18n } from "@/i18n/LanguageProvider";
import { InfoTooltip } from "@/components/InfoTooltip";
import type { OracleChain } from "@/lib/oracleTypes";

interface DisputeModalProps {
  assertionId: string;
  isOpen: boolean;
  onClose: () => void;
  contractAddress?: string;
  chain?: OracleChain;
  defaultBondEth?: string;
  onSuccess?: () => void;
}

export function DisputeModal({
  assertionId,
  isOpen,
  onClose,
  contractAddress,
  chain,
  defaultBondEth,
  onSuccess,
}: DisputeModalProps) {
  const { address } = useWallet();
  const { execute, isSubmitting, isConfirming, error } = useOracleTransaction();
  const { t } = useI18n();
  const [bond, setBond] = useState(defaultBondEth ?? "0.1");
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useModalBehavior(isOpen, onClose, dialogRef);

  useEffect(() => {
    if (!isOpen) return;
    if (defaultBondEth) setBond(defaultBondEth);
    setReason("");
    setValidationError(null);
  }, [defaultBondEth, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setValidationError(t("oracle.detail.reasonRequired"));
      return;
    }
    await execute({
      functionName: "disputeAssertion",
      args: [assertionId as `0x${string}`, trimmedReason],
      value: bond,
      contractAddress,
      chain,
      successTitle: t("oracle.tx.disputeSubmittedTitle"),
      successMessage: t("oracle.tx.disputeSubmittedMsg"),
      onConfirmed: () => {
        onSuccess?.();
        onClose();
      },
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dispute-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl ring-1 ring-gray-200"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2
            id="dispute-modal-title"
            className="text-xl font-bold text-gray-900"
          >
            {t("oracle.detail.disputeAssertion")}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-gray-100"
            aria-label={t("common.close")}
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {validationError && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            <AlertCircle size={16} />
            {validationError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-600">
            {t("oracle.disputeModal.desc")}
          </p>

          <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-700 border border-yellow-200">
            {t("oracle.disputeModal.warning")}
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
              {t("oracle.detail.reasonForDispute")}
            </label>
            <textarea
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder={t("oracle.detail.reasonPlaceholder")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
              {t("oracle.disputeModal.bondLabel")}
              <InfoTooltip content={t("tooltips.bond")} />
            </label>
            <input
              type="number"
              step="0.001"
              required
              value={bond}
              onChange={(e) => setBond(e.target.value)}
              disabled={Boolean(defaultBondEth)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              {t("oracle.detail.cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isConfirming || !address}
              className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {(isSubmitting || isConfirming) && (
                <Loader2 size={16} className="animate-spin" />
              )}
              {!address
                ? t("wallet.connect")
                : isSubmitting
                  ? t("oracle.detail.submitting")
                  : isConfirming
                    ? t("oracle.detail.confirming")
                    : t("oracle.disputeModal.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
