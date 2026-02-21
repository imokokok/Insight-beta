'use client';

import { useState } from 'react';

import { Wallet, X, ChevronRight, AlertCircle } from 'lucide-react';

import { useToast } from '@/components/ui';
import { UserMenu } from '@/features/wallet/components/UserMenu';
import { useWallet, type WalletConnectionType } from '@/features/wallet/contexts/WalletContext';
import { useI18n } from '@/i18n/LanguageProvider';
import {
  isWalletBrowser,
  getWalletName,
  WALLET_CONNECT_PROJECT_ID,
} from '@/lib/blockchain/walletConnect';
import { normalizeWalletError } from '@/lib/errors';
import { logger } from '@/shared/logger';

interface WalletOption {
  id: WalletConnectionType;
  name: string;
  description: string;
  icon: React.ReactNode;
  recommended?: boolean;
  disabled?: boolean;
}

function WalletSelectModal({
  isOpen,
  onClose,
  onSelect,
  isConnecting,
  hasBrowserWallet,
  recommendedType,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: WalletConnectionType) => void;
  isConnecting: boolean;
  hasBrowserWallet: boolean;
  recommendedType: WalletConnectionType;
}) {
  const { t } = useI18n();
  const walletBrowser = isWalletBrowser();
  const walletName = getWalletName();

  const walletOptions: WalletOption[] = [
    {
      id: 'browser',
      name: walletBrowser ? walletName : t('wallet.browserWallet'),
      description: walletBrowser ? t('wallet.useCurrentWallet') : t('wallet.useMetaMask'),
      icon: <Wallet size={24} className="text-primary" />,
      recommended: recommendedType === 'browser' && hasBrowserWallet,
      disabled: !hasBrowserWallet,
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect',
      description: t('wallet.useWalletConnect'),
      icon: <Wallet size={24} className="text-blue-500" />,
      recommended: recommendedType === 'walletconnect' || !hasBrowserWallet,
      disabled: !WALLET_CONNECT_PROJECT_ID,
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">{t('wallet.selectWallet')}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        {/* Wallet Options */}
        <div className="p-4">
          <div className="space-y-3">
            {walletOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => !option.disabled && onSelect(option.id)}
                disabled={option.disabled || isConnecting}
                className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 transition-all ${
                  option.disabled
                    ? 'cursor-not-allowed border-border bg-muted opacity-50'
                    : option.recommended
                      ? 'border-primary bg-primary/5 hover:bg-primary/10'
                      : 'border-border hover:border-primary/30 hover:bg-muted'
                }`}
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                    option.recommended ? 'bg-primary/10' : 'bg-muted'
                  }`}
                >
                  {option.icon}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{option.name}</span>
                    {option.recommended && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {t('wallet.recommended')}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {option.disabled
                      ? option.id === 'browser'
                        ? t('wallet.noBrowserWallet')
                        : t('wallet.walletConnectNotConfigured')
                      : option.description}
                  </p>
                </div>
                <ChevronRight
                  size={20}
                  className={`shrink-0 ${
                    option.disabled ? 'text-muted-foreground' : 'text-muted-foreground'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Setup Hint */}
          {!WALLET_CONNECT_PROJECT_ID && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-400">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{t('wallet.setupRequired')}</p>
                <p className="mt-1 text-xs opacity-80">{t('wallet.walletConnectSetupGuide')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-muted/50 px-6 py-4">
          <p className="text-center text-xs text-muted-foreground">
            {t('wallet.newToWallets')}{' '}
            <a
              href="https://ethereum.org/en/wallets/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {t('wallet.learnMore')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export function ConnectWallet() {
  const { address, connect, isConnecting, hasBrowserWallet, recommendedConnectionType } =
    useWallet();
  const { toast } = useToast();
  const { t } = useI18n();
  const [showModal, setShowModal] = useState(false);

  const handleConnect = async (type?: WalletConnectionType) => {
    try {
      await connect(type);
      setShowModal(false);
      toast({
        type: 'success',
        title: t('wallet.connected'),
        message: t('wallet.connectedMsg'),
      });
    } catch (error: unknown) {
      logger.error('Failed to connect wallet:', { error });
      const normalized = normalizeWalletError(error);
      if (normalized.kind === 'WALLET_NOT_FOUND') {
        toast({
          type: 'error',
          title: t('wallet.notFound'),
          message: t('wallet.install'),
        });
        return;
      }
      const msg =
        normalized.kind === 'USER_REJECTED'
          ? t('errors.userRejected')
          : normalized.kind === 'REQUEST_PENDING'
            ? t('errors.requestPending')
            : normalized.kind === 'CHAIN_NOT_ADDED'
              ? t('errors.chainNotAdded')
              : normalized.kind === 'WRONG_NETWORK'
                ? t('errors.wrongNetwork')
                : normalized.kind === 'INSUFFICIENT_FUNDS'
                  ? t('errors.insufficientFunds')
                  : t('errors.unknownError');
      toast({
        type: 'error',
        title: t('wallet.failed'),
        message: msg,
      });
    }
  };

  const handleButtonClick = () => {
    if (!WALLET_CONNECT_PROJECT_ID && hasBrowserWallet) {
      handleConnect('browser');
    } else if (WALLET_CONNECT_PROJECT_ID && !hasBrowserWallet) {
      handleConnect('walletconnect');
    } else {
      setShowModal(true);
    }
  };

  if (address) {
    return <UserMenu />;
  }

  return (
    <>
      <button
        onClick={handleButtonClick}
        disabled={isConnecting}
        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Wallet size={16} />
        {isConnecting ? t('wallet.connecting') : t('wallet.connect')}
      </button>

      <WalletSelectModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSelect={handleConnect}
        isConnecting={isConnecting}
        hasBrowserWallet={hasBrowserWallet}
        recommendedType={recommendedConnectionType}
      />
    </>
  );
}
