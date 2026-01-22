"use client";

import { useEffect, useRef, useState } from "react";
import { X, Loader2, AlertCircle, Info } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useOracleTransaction } from "@/hooks/useOracleTransaction";
import { useModalBehavior } from "@/hooks/useModalBehavior";
import { useI18n } from "@/i18n/LanguageProvider";
import { InfoTooltip } from "@/components/InfoTooltip";
import { ConnectWallet } from "@/components/ConnectWallet";
import { publicEnv } from "@/lib/publicEnv";
import type { OracleChain } from "@/lib/oracleTypes";

interface DisputeModalProps {
  assertionId: string;
  isOpen: boolean;
  onClose: () => void;
  contractAddress?: string;
  chain?: OracleChain;
  defaultBondEth?: string;
  onSuccess?: () => void;
  instanceId?: string;
}

export function DisputeModal({
  assertionId,
  isOpen,
  onClose,
  contractAddress,
  chain,
  defaultBondEth,
  onSuccess,
  instanceId,
}: DisputeModalProps) {
  const { address } = useWallet();
  const { execute, isSubmitting, isConfirming, error, resetError } =
    useOracleTransaction(instanceId);
  const { t } = useI18n();
  const [bond, setBond] = useState(defaultBondEth ?? "0.1");
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useModalBehavior(isOpen, onClose, dialogRef);
  const reasonLimit = 500;
  const trimmedReason = reason.trim();
  const bondValue = Number.parseFloat(bond);
  const minBondValue = Number.parseFloat(defaultBondEth ?? "0.001");
  const isBondValid =
    Number.isFinite(bondValue) &&
    Number.isFinite(minBondValue) &&
    bondValue >= minBondValue;
  const minBondText = defaultBondEth ?? "0.001";
  const isActionLocked = isSubmitting || isConfirming;
  const hasContractAddress = (contractAddress ?? "").trim().length > 0;
  const hasInstanceId = (instanceId ?? "").trim().length > 0;
  const hasPublicAddress =
    (publicEnv.INSIGHT_ORACLE_ADDRESS ?? "").trim().length > 0;
  const shouldWarnMissingConfig =
    !hasContractAddress && !hasInstanceId && !hasPublicAddress;
  const isFormValid = Boolean(trimmedReason) && isBondValid;

  useEffect(() => {
    if (!isOpen) return;
    resetError();
    if (defaultBondEth) setBond(defaultBondEth);
    setReason("");
    setValidationError(null);
  }, [defaultBondEth, isOpen, resetError]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (!trimmedReason) {
      setValidationError(t("oracle.detail.reasonRequired"));
      return;
    }
    if (!isBondValid) {
      setValidationError(t("oracle.createAssertionModal.bondInvalid"));
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
        if (isActionLocked) return;
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
            className="rounded-full p-1 hover:bg-gray-100 disabled:opacity-50"
            aria-label={t("common.close")}
            disabled={isActionLocked}
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium">{t("oracle.detail.txFailed")}</div>
              <div className="mt-0.5">{error}</div>
            </div>
            <button
              onClick={resetError}
              className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
              aria-label={t("common.close")}
              disabled={isActionLocked}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {!address && (
          <div className="mb-4 flex justify-center">
            <ConnectWallet />
          </div>
        )}

        {validationError && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1">{validationError}</div>
            <button
              onClick={() => setValidationError(null)}
              className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
              aria-label={t("common.close")}
              disabled={isActionLocked}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {shouldWarnMissingConfig && (
          <div className="mb-4 rounded-xl bg-amber-50 p-4 text-amber-900 border border-amber-100">
            <h3 className="flex items-center gap-2 font-semibold">
              <AlertCircle size={18} className="text-amber-600" />
              {t("oracle.detail.validationError")}
            </h3>
            <p className="mt-1 text-sm text-amber-700 leading-relaxed">
              {t("errors.missingConfig")}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl bg-gradient-to-r from-rose-50 to-amber-50 p-4 text-rose-900 border border-rose-100">
            <h3 className="flex items-center gap-2 font-semibold">
              <AlertCircle size={18} className="text-rose-600" />
              {t("oracle.detail.disputeAssertion")}
            </h3>
            <p className="mt-1 text-sm text-rose-700 leading-relaxed">
              {t("oracle.disputeModal.desc")}
            </p>
          </div>

          <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-700 border border-yellow-200">
            {t("oracle.disputeModal.warning")}
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
              {t("oracle.detail.reasonForDispute")}
            </label>
            <p className="mb-2 text-xs text-gray-500">
              {t("oracle.disputeModal.reasonHint")}
            </p>
            <textarea
              required
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (validationError) setValidationError(null);
              }}
              rows={3}
              maxLength={reasonLimit}
              placeholder={t("oracle.detail.reasonPlaceholder")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              disabled={isActionLocked || !address}
            />
            <div className="mt-1 flex flex-col gap-1 text-xs text-gray-400">
              <span className="text-gray-500">
                {t("common.example")}: {t("oracle.disputeModal.reasonExample")}
              </span>
              <span className="text-right">
                {reason.length}/{reasonLimit}
              </span>
            </div>
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
              min={defaultBondEth ?? "0.001"}
              value={bond}
              onChange={(e) => {
                setBond(e.target.value);
                if (validationError) setValidationError(null);
              }}
              disabled={Boolean(defaultBondEth) || isActionLocked || !address}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              {t("common.min")}: {minBondText} ETH
            </p>
          </div>

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
              disabled={isActionLocked || !address || !isFormValid}
              className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {isActionLocked && <Loader2 size={16} className="animate-spin" />}
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
