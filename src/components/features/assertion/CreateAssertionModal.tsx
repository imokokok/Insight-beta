'use client';

import { useRef, useState } from 'react';
import { parseEther } from 'viem';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { useI18n } from '@/i18n/LanguageProvider';
import { useOracleTransaction } from '@/hooks/oracle/useOracleTransaction';
import { useModalBehavior } from '@/hooks/ui/useModalBehavior';
import type { OracleChain } from '@/lib/types/oracleTypes';

import { InfoTooltip } from '@/components/features/common/InfoTooltip';

interface CreateAssertionModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractAddress?: string;
  chain?: OracleChain;
  onSuccess?: () => void;
  instanceId?: string;
}

export function CreateAssertionModal({
  isOpen,
  onClose,
  contractAddress,
  chain,
  onSuccess,
  instanceId,
}: CreateAssertionModalProps) {
  const { address } = useWallet();
  const { t } = useI18n();
  const { execute, isSubmitting, isConfirming, error } = useOracleTransaction(instanceId);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const marketInputRef = useRef<HTMLInputElement>(null);
  useModalBehavior(isOpen, onClose, dialogRef);

  const [protocol, setProtocol] = useState('');
  const [market, setMarket] = useState('');
  const [assertion, setAssertion] = useState('');
  const [bond, setBond] = useState('0.01'); // Default bond
  const [validationError, setValidationError] = useState<string | null>(null);

  const POPULAR_PROTOCOLS = ['Polymarket', 'Aave', 'Uniswap', 'Lido', 'EigenLayer'];

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedProtocol = protocol.trim();
    const trimmedMarket = market.trim();
    const trimmedAssertion = assertion.trim();
    const bondValue = parseFloat(bond);

    if (isNaN(bondValue) || bondValue <= 0) {
      setValidationError(t('oracle.createAssertionModal.bondInvalid'));
      return;
    }

    if (bondValue > 10000) {
      setValidationError(t('oracle.createAssertionModal.bondInvalid'));
      return;
    }

    if (trimmedProtocol.length === 0 || trimmedProtocol.length > 100) {
      setValidationError(t('oracle.createAssertionModal.bondInvalid'));
      return;
    }

    if (trimmedMarket.length === 0 || trimmedMarket.length > 200) {
      setValidationError(t('oracle.createAssertionModal.bondInvalid'));
      return;
    }

    if (trimmedAssertion.length === 0 || trimmedAssertion.length > 1000) {
      setValidationError(t('oracle.createAssertionModal.bondInvalid'));
      return;
    }

    await execute({
      functionName: 'createAssertion',
      args: [trimmedProtocol, trimmedMarket, trimmedAssertion, parseEther(bond), 7200n],
      contractAddress,
      chain,
      successTitle: t('oracle.tx.assertionCreatedTitle'),
      successMessage: t('oracle.tx.assertionCreatedMsg'),
      onConfirmed: () => {
        onSuccess?.();
        onClose();
      },
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-assertion-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl ring-1 ring-gray-200"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 id="create-assertion-modal-title" className="text-xl font-bold text-gray-900">
            {t('oracle.newAssertion')}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-gray-100"
            aria-label={t('common.close')}
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
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
              {t('oracle.createAssertionModal.protocolLabel')}
              <InfoTooltip content={t('tooltips.protocol')} />
            </label>
            <input
              type="text"
              required
              value={protocol}
              onChange={(e) => setProtocol(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              placeholder={t('oracle.createAssertionModal.protocolPlaceholder')}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="self-center text-xs text-gray-500">{t('common.popular')}:</span>
              {POPULAR_PROTOCOLS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProtocol(p)}
                  className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 transition-colors hover:bg-purple-100 hover:text-purple-700"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
              {t('oracle.createAssertionModal.marketLabel')}
              <InfoTooltip content={t('tooltips.market')} />
            </label>
            <input
              ref={marketInputRef}
              type="text"
              required
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              placeholder={t('oracle.createAssertionModal.marketPlaceholder')}
            />
            <p className="mt-1 text-xs text-gray-500">
              {t('common.example')}: ETH-USD, Election-2024, BTC-Price
            </p>
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
              {t('oracle.createAssertionModal.assertionLabel')}
              <InfoTooltip content={t('tooltips.assertion')} />
            </label>
            <textarea
              required
              value={assertion}
              onChange={(e) => setAssertion(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              placeholder={t('oracle.createAssertionModal.assertionPlaceholder')}
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
              {t('oracle.createAssertionModal.bondLabel')}
              <InfoTooltip content={t('tooltips.bond')} />
            </label>
            <input
              type="number"
              step="0.001"
              required
              min="0.01"
              value={bond}
              onChange={(e) => setBond(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <p className="mt-1 text-xs text-gray-500">{t('common.min')}: 0.01 ETH</p>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              {t('oracle.detail.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isConfirming || !address}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {(isSubmitting || isConfirming) && <Loader2 size={16} className="animate-spin" />}
              {!address
                ? t('wallet.connect')
                : isSubmitting
                  ? t('oracle.detail.submitting')
                  : isConfirming
                    ? t('oracle.detail.confirming')
                    : t('oracle.createAssertionModal.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
