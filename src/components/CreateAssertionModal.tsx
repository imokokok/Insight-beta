"use client";

import { useRef, useState } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useI18n } from "@/i18n/LanguageProvider";
import { useOracleTransaction } from "@/hooks/useOracleTransaction";
import { useModalBehavior } from "@/hooks/useModalBehavior";
import type { OracleChain } from "@/lib/oracleTypes";

interface CreateAssertionModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractAddress?: string;
  chain?: OracleChain;
}

export function CreateAssertionModal({ isOpen, onClose, contractAddress, chain }: CreateAssertionModalProps) {
  const { address } = useWallet();
  const { t } = useI18n();
  const { execute, isSubmitting, isConfirming, error } = useOracleTransaction();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useModalBehavior(isOpen, onClose, dialogRef);
  
  const [protocol, setProtocol] = useState("");
  const [market, setMarket] = useState("");
  const [assertion, setAssertion] = useState("");
  const [bond, setBond] = useState("0.01"); // Default bond
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const bondValue = parseFloat(bond);
    if (isNaN(bondValue) || bondValue <= 0) {
      setValidationError("Bond amount must be greater than 0");
      return;
    }
    
    await execute({
      functionName: "assertTruth",
      args: [protocol, market, assertion],
      value: bond,
      contractAddress,
      chain,
      successTitle: t("oracle.tx.assertionCreatedTitle"),
      successMessage: t("oracle.tx.assertionCreatedMsg"),
      onConfirmed: () => onClose()
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-assertion-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={dialogRef} tabIndex={-1} className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl ring-1 ring-gray-200">
        <div className="mb-6 flex items-center justify-between">
          <h2 id="create-assertion-modal-title" className="text-xl font-bold text-gray-900">{t("oracle.newAssertion")}</h2>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("oracle.createAssertionModal.protocolLabel")}</label>
            <input
              type="text"
              required
              value={protocol}
              onChange={(e) => setProtocol(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              placeholder={t("oracle.createAssertionModal.protocolPlaceholder")}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("oracle.createAssertionModal.marketLabel")}</label>
            <input
              type="text"
              required
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              placeholder={t("oracle.createAssertionModal.marketPlaceholder")}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("oracle.createAssertionModal.assertionLabel")}</label>
            <textarea
              required
              value={assertion}
              onChange={(e) => setAssertion(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              placeholder={t("oracle.createAssertionModal.assertionPlaceholder")}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("oracle.createAssertionModal.bondLabel")}</label>
            <input
              type="number"
              step="0.001"
              required
              value={bond}
              onChange={(e) => setBond(e.target.value)}
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
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {(isSubmitting || isConfirming) && <Loader2 size={16} className="animate-spin" />}
              {!address
                ? t("wallet.connect")
                : isSubmitting
                  ? t("oracle.detail.submitting")
                  : isConfirming
                    ? t("oracle.detail.confirming")
                    : t("oracle.createAssertionModal.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
