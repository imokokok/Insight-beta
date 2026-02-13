'use client';

import { useState } from 'react';

import { Wallet, Smartphone, X, ChevronRight, AlertCircle } from 'lucide-react';

import { useToast } from '@/components/ui/toast';
import { useWallet, type WalletConnectionType } from '@/contexts/WalletContext';
import { MobileWalletConnect } from '@/features/wallet/components/MobileWalletConnect';
import { UserMenu } from '@/features/wallet/components/UserMenu';
import { useI18n } from '@/i18n/LanguageProvider';
import {
  isMobile as isMobileDevice,
  isWalletBrowser,
  getWalletName,
  WALLET_CONNECT_PROJECT_ID,
} from '@/lib/blockchain/walletConnect';
import { normalizeWalletError } from '@/lib/errors';
import { isMobile as isMobileEnhanced } from '@/lib/mobile';
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
  const mobile = isMobileDevice();
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
      icon: <Smartphone size={24} className="text-blue-600" />,
      recommended: recommendedType === 'walletconnect' || !hasBrowserWallet,
      disabled: !WALLET_CONNECT_PROJECT_ID,
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t('wallet.selectWallet')}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mobile Hint */}
        {mobile && (
          <div className="border-b border-slate-200 bg-blue-50 px-6 py-3 dark:border-slate-800 dark:bg-blue-900/20">
            <p className="flex items-start gap-2 text-sm text-blue-700 dark:text-blue-300">
              <Smartphone size={16} className="mt-0.5 shrink-0" />
              <span>{t('wallet.mobileHint')}</span>
            </p>
          </div>
        )}

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
                    ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-50 dark:border-slate-800 dark:bg-slate-800/50'
                    : option.recommended
                      ? 'dark:bg-primary-darker/20 border-primary bg-primary/5 hover:bg-primary/10 dark:border-primary/50 dark:hover:bg-primary-900/30'
                      : 'hover:border-primary300 dark:hover:border-primary500/30 border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                }`}
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                    option.recommended
                      ? 'dark:bg-primary-darker/30 bg-primary/10'
                      : 'bg-slate-100 dark:bg-slate-800'
                  }`}
                >
                  {option.icon}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {option.name}
                    </span>
                    {option.recommended && (
                      <span className="text-primary-dark dark:bg-primary-darker/30 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium dark:text-primary/30">
                        {t('wallet.recommended')}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
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
                    option.disabled
                      ? 'text-slate-300 dark:text-slate-600'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Setup Hint */}
          {!WALLET_CONNECT_PROJECT_ID && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{t('wallet.setupRequired')}</p>
                <p className="mt-1 text-xs opacity-80">{t('wallet.walletConnectSetupGuide')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/50">
          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            {t('wallet.newToWallets')}{' '}
            <a
              href="https://ethereum.org/en/wallets/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline dark:text-primary/40"
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
    // 如果只有一种连接方式可用，直接连接
    if (!WALLET_CONNECT_PROJECT_ID && hasBrowserWallet) {
      handleConnect('browser');
    } else if (WALLET_CONNECT_PROJECT_ID && !hasBrowserWallet) {
      handleConnect('walletconnect');
    } else {
      // 显示选择模态框
      setShowModal(true);
    }
  };

  if (address) {
    return <UserMenu />;
  }

  // 在移动端使用优化的钱包连接组件
  if (isMobileEnhanced()) {
    return (
      <div className="wallet-connect-btn">
        <MobileWalletConnect />
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleButtonClick}
        disabled={isConnecting}
        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
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
